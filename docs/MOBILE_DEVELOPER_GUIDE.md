# Mobile Developer Guide

> This guide is for iOS (Swift/SwiftUI) and Android (Kotlin/Jetpack Compose) developers building against the Ricton API.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Authentication & Token Storage](#authentication--token-storage)
3. [Networking Layer](#networking-layer)
4. [Error Handling](#error-handling)
5. [Offline-First Strategy](#offline-first-strategy)
6. [Push Notifications](#push-notifications)
7. [Real-time Messaging](#real-time-messaging)
8. [Biometric Authentication](#biometric-authentication)
9. [Deep Linking](#deep-linking)
10. [File Uploads](#file-uploads)
11. [Platform-Specific Notes](#platform-specific-notes)

---

## Quick Start

### Base URL Configuration

```swift
// iOS - Configuration.swift
enum API {
    static let baseURL: String = {
        #if DEBUG
        return "http://localhost:8000"
        #elseif STAGING
        return "https://api-staging.ricton.health"
        #else
        return "https://api.ricton.health"
        #endif
    }()

    static let headers: [String: String] = [
        "Content-Type": "application/json",
        "Accept": "application/json"
    ]
}
```

```kotlin
// Android - BuildConfig
object ApiConfig {
    const val BASE_URL = BuildConfig.API_BASE_URL // set per build flavor
}
```

---

## Authentication & Token Storage

### Token Storage (Secure)

**iOS (Keychain):**

```swift
import Security

class TokenManager {
    static let shared = TokenManager()
    private let key = "com.ricton.tokens"

    func saveTokens(access: String, refresh: String) {
        let tokens = ["access": access, "refresh": refresh]
        let data = try! JSONSerialization.data(withJSONObject: tokens)

        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecValueData as String: data
        ]
        SecItemDelete(query as CFDictionary)
        SecItemAdd(query as CFDictionary, nil)
    }

    func getAccessToken() -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true
        ]

        var result: AnyObject?
        SecItemCopyMatching(query as CFDictionary, &result)

        guard let data = result as? Data,
              let tokens = try? JSONSerialization.jsonObject(with: data) as? [String: String] else {
            return nil
        }
        return tokens["access"]
    }
}
```

**Android (EncryptedSharedPreferences):**

```kotlin
class TokenManager(context: Context) {
    private val masterKey = MasterKey.Builder(context)
        .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
        .build()

    private val prefs = EncryptedSharedPreferences.create(
        context,
        "ricton_tokens",
        masterKey,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
    )

    fun saveTokens(access: String, refresh: String) {
        prefs.edit()
            .putString("access_token", access)
            .putString("refresh_token", refresh)
            .apply()
    }

    fun getAccessToken(): String? = prefs.getString("access_token", null)
    fun getRefreshToken(): String? = prefs.getString("refresh_token", null)

    fun clearTokens() {
        prefs.edit().clear().apply()
    }
}
```

### Biometric Auth

```swift
import LocalAuthentication

class BiometricAuth {
    static func canEvaluate() -> Bool {
        let context = LAContext()
        return context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: nil)
    }

    static func authenticate(reason: String = "Authenticate to continue") async -> Bool {
        let context = LAContext()
        return await withCheckedContinuation { continuation in
            context.evaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, localizedReason: reason) { success, error in
                continuation.resume(returning: success)
            }
        }
    }
}
```

---

## Networking Layer

### iOS (Async/Await)

```swift
enum APIError: Error, LocalizedError {
    case validation(details: [String: String])
    case unauthorized
    case forbidden
    case notFound
    case conflict(message: String)
    case rateLimited
    case serverError
    case unknown(String)

    var errorDescription: String? {
        switch self {
        case .validation(let details): return details.values.first ?? "Validation failed"
        case .unauthorized: return "Session expired"
        case .forbidden: return "Access denied"
        case .notFound: return "Not found"
        case .conflict(let message): return message
        case .rateLimited: return "Too many requests"
        case .serverError: return "Server error"
        case .unknown(let message): return message
        }
    }
}

actor APIClient {
    static let shared = APIClient()
    private let session: URLSession
    private let tokenManager = TokenManager.shared

    init() {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30
        config.timeoutIntervalForResource = 60
        session = URLSession(configuration: config)
    }

    func request<T: Decodable>(
        _ endpoint: String,
        method: String = "GET",
        body: Data? = nil
    ) async throws -> T {
        guard let url = URL(string: "\(API.baseURL)\(endpoint)") else {
            throw APIError.unknown("Invalid URL")
        }

        var request = URLRequest(url: url)
        request.httpMethod = method
        request.allHTTPHeaderFields = API.headers

        if let token = tokenManager.getAccessToken() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        request.httpBody = body

        let (data, response) = try await session.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.unknown("Invalid response")
        }

        switch httpResponse.statusCode {
        case 200, 201:
            return try JSONDecoder().decode(SuccessResponse<T>.self, from: data).data!
        case 400:
            let error = try JSONDecoder().decode(ErrorResponse.self, from: data)
            throw APIError.validation(details: error.error.details ?? [:])
        case 401:
            throw APIError.unauthorized
        case 403:
            throw APIError.forbidden
        case 404:
            throw APIError.notFound
        case 409:
            let error = try JSONDecoder().decode(ErrorResponse.self, from: data)
            throw APIError.conflict(message: error.error.message)
        case 429:
            throw APIError.rateLimited
        case 500...599:
            throw APIError.serverError
        default:
            throw APIError.unknown("HTTP \(httpResponse.statusCode)")
        }
    }
}
```

### Android (Retrofit + Kotlin Coroutines)

```kotlin
interface RictonApi {
    @GET("api/users/me")
    suspend fun getProfile(): Response<ApiResponse<UserProfile>>

    @POST("api/auth/login")
    suspend fun login(@Body request: LoginRequest): Response<AuthResponse>

    @Multipart
    @PUT("api/users/me/avatar")
    suspend fun uploadAvatar(
        @Header("Authorization") token: String,
        @Part file: MultipartBody.Part
    ): Response<AvatarUploadResponse>
}

class ApiClient(private val tokenManager: TokenManager) {
    private val retrofit = Retrofit.Builder()
        .baseUrl(ApiConfig.BASE_URL)
        .addConverterFactory(GsonConverterFactory.create())
        .build()

    private val api = retrofit.create(RictonApi::class.java)

    suspend fun <T> safeCall(block: suspend () -> Response<ApiResponse<T>>): Result<T> {
        return try {
            val response = block()
            if (response.isSuccessful) {
                val body = response.body()
                if (body?.success == true && body.data != null) {
                    Result.success(body.data)
                } else {
                    Result.failure(ApiException.ServerError(body?.error?.message ?: "Unknown error"))
                }
            } else {
                val errorBody = response.errorBody()?.string()
                val error = parseError(errorBody, response.code())
                Result.failure(error)
            }
        } catch (e: Exception) {
            Result.failure(ApiException.NetworkError(e.message ?: "Network error"))
        }
    }
}
```

---

## Error Handling

### Centralized Error Mapper

```swift
extension APIClient {
    func handleError(_ data: Data, statusCode: Int) -> APIError {
        guard let errorResponse = try? JSONDecoder().decode(ErrorResponse.self, from: data) else {
            return APIError.unknown("HTTP \(statusCode)")
        }

        let code = errorResponse.error.code
        let message = errorResponse.error.message
        let details = errorResponse.error.details ?? [:]

        switch code {
        case "VALIDATION_ERROR": return .validation(details: details)
        case "UNAUTHORIZED": return .unauthorized
        case "FORBIDDEN": return .forbidden
        case "NOT_FOUND": return .notFound
        case "CONFLICT_ERROR": return .conflict(message: message)
        case "RATE_LIMITED": return .rateLimited
        default: return .unknown(message)
        }
    }
}
```

### Error Handling in Views

```swift
// SwiftUI
struct ContentView: View {
    @State private var error: APIError?

    var body: some View {
        NavigationStack {
            ProfileView()
                .task {
                    do {
                        _ = try await APIClient.shared.request("/api/users/me")
                    } catch let apiError as APIError {
                        error = apiError
                    }
                }
        }
        .alert("Error", error: $error) { _ in
            Button("OK") { error = nil }
        } message: { error in
            Text(error.errorDescription)
        }
    }
}
```

```kotlin
// Jetpack Compose
@Composable
fun ProfileScreen(viewModel: ProfileViewModel = viewModel()) {
    val state by viewModel.uiState.collectAsState()

    when (state) {
        is UiState.Error -> ErrorSnackbar(
            message = (state as UiState.Error).message,
            onRetry = { viewModel.loadProfile() }
        )
        is UiState.SessionExpired -> {
            LaunchedEffect(Unit) {
                navController.navigate("login") { popUpTo(0) }
            }
        }
    }
}

sealed class UiState {
    object Loading : UiState()
    data class Success<T>(val data: T) : UiState()
    data class Error(val message: String, val code: String? = null) : UiState()
    object SessionExpired : UiState()
}
```

---

## Offline-First Strategy

### Data Sync Pattern

```swift
class OfflineFirstRepository {
    private let localDB: LocalDatabase
    private let api: APIClient

    func getAppointments() async throws -> [Appointment] {
        // 1. Return cached data immediately
        let cached = try localDB.appointments.fetchAll()

        // 2. Try to refresh in background
        Task {
            do {
                let fresh: [Appointment] = try await api.request("/api/appointments")
                try localDB.appointments.save(fresh)
            } catch {
                // Log sync failure, continue with cached data
                Logger.shared.log("Sync failed: \(error)")
            }
        }

        return cached
    }

    func createAppointment(_ appointment: CreateAppointmentInput) async throws {
        // 1. Optimistically save to local DB
        let local = try localDB.appointments.create(appointment)

        // 2. Sync with server
        do {
            let created: Appointment = try await api.request(
                "/api/appointments",
                method: "POST",
                body: try JSONEncoder().encode(appointment)
            )
            // 3. Update local with server ID
            try localDB.appointments.update(id: local.id, serverId: created.id)
        } catch {
            // 4. Mark as pending sync
            try localDB.appointments.markPendingSync(local.id)
            throw error
        }
    }
}
```

### Conflict Resolution

```kotlin
class SyncManager(private val db: AppDatabase) {
    suspend fun syncPendingChanges() {
        val pending = db.appointmentDao().getPendingSync()

        for (local in pending) {
            try {
                val server = api.createAppointment(local.toRequest())
                db.appointmentDao().update(local.copy(
                    id = server.id,
                    isPendingSync = false
                ))
            } catch (e: ApiException.ConflictError) {
                // Server has conflicting data - prompt user or use last-write-wins
                when (e.conflictType) {
                    "slot_conflict" -> handleSlotConflict(local, e)
                    else -> throw e
                }
            }
        }
    }
}
```

---

## Push Notifications

### iOS (APNs)

```swift
import UserNotifications

class NotificationManager: NSObject, UNUserNotificationCenterDelegate {
    static let shared = NotificationManager()

    func requestPermission() async -> Bool {
        let center = UNUserNotificationCenter.current()
        center.delegate = self

        return await withCheckedContinuation { continuation in
            center.requestAuthorization(options: [.alert, .sound, .badge]) { granted, error in
                continuation.resume(returning: granted && error == nil)
            }
        }
    }

    func handleIncomingNotification(_ notification: [AnyHashable: Any]) {
        guard let data = notification["data"] as? [String: Any],
              let type = data["type"] as? String else { return }

        switch type {
        case "appointment_reminder":
            navigateToAppointmentDetails(data["appointmentId"] as? String)
        case "prescription_ready":
            navigateToPrescription(data["prescriptionId"] as? String)
        case "payment_success":
            showPaymentConfirmation(data)
        default:
            break
        }
    }
}
```

### Android (FCM)

```kotlin
class RictonMessagingService : FirebaseMessagingService() {
    override fun onMessageReceived(message: RemoteMessage) {
        val data = message.data
        val type = data["type"] ?: return

        val intent = when (type) {
            "appointment_reminder" -> Intent(this, AppointmentActivity::class.java).apply {
                putExtra("appointmentId", data["appointmentId"])
            }
            "prescription_ready" -> Intent(this, PrescriptionActivity::class.java).apply {
                putExtra("prescriptionId", data["prescriptionId"])
            }
            else -> null
        }

        intent?.let {
            val pendingIntent = PendingIntent.getActivity(
                this, 0, it,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            val notification = NotificationCompat.Builder(this, "ricton_channel")
                .setSmallIcon(R.drawable.ic_notification)
                .setContentTitle(message.notification?.title)
                .setContentText(message.notification?.body)
                .setContentIntent(pendingIntent)
                .setAutoCancel(true)
                .build()

            NotificationManagerCompat.from(this).notify(type.hashCode(), notification)
        }
    }
}
```

---

## Real-time Messaging

### Socket.IO Client

```swift
class ChatManager: NSObject, ObservableObject {
    static let shared = ChatManager()
    private var socket: SocketIOClient!
    @Published var messages: [Message] = []
    @Published var conversations: [Conversation] = []

    func connect(token: String) {
        let manager = SocketManager(
            socketURL: URL(string: "\(API.baseURL)")!,
            config: [.extraHeaders(["Authorization": "Bearer \(token)"])]
        )
        socket = manager.defaultSocket

        socket.on("conversations:list") { data, _ in
            guard let json = data[0] as? [[String: Any]] else { return }
            self.conversations = json.compactMap { Conversation(json: $0) }
        }

        socket.on("message:new") { data, _ in
            guard let json = data[0] as? [String: Any],
                  let message = Message(json: json) else { return }
            self.messages.append(message)
        }

        socket.on("message:read") { data, _ in
            guard let json = data[0] as? [String: Any],
                  let messageIds = json["messageIds"] as? [String] else { return }

            self.messages = self.messages.map { msg in
                messageIds.contains(msg.id) ? Message(id: msg.id, isRead: true) : msg
            }
        }

        socket.connect()
    }

    func sendMessage(conversationId: String, body: String) {
        socket.emit("message:send", [
            "conversationId": conversationId,
            "body": body
        ])
    }
}
```

```kotlin
class ChatViewModel : ViewModel() {
    private val socket = SocketHandler.getSocket()
    @StateFlow private val _messages = MutableStateFlow<List<Message>>(emptyList())
    val messages: StateFlow<List<Message>> = _messages.asStateFlow()

    init {
        setupSocketListeners()
    }

    private fun setupSocketListeners() {
        socket.on("message:new") { args ->
            val message = gson.fromJson(args[0].toString(), Message::class.java)
            _messages.update { it + message }
        }

        socket.on("message:read") { args ->
            val data = JSONObject(args[0].toString())
            val messageIds = data.getJSONArray("messageIds")

            _messages.update { messages ->
                messages.map { msg ->
                    if (messageIds.toList().contains(msg.id)) msg.copy(isRead = true)
                    else msg
                }
            }
        }
    }

    fun sendMessage(conversationId: String, body: String) {
        socket.emit("message:send", JSONObject().apply {
            put("conversationId", conversationId)
            put("body", body)
        })
    }
}
```

---

## Biometric Authentication

### iOS (Face ID / Touch ID)

```swift
struct BiometricLoginView: View {
    @State private var isAuthenticating = false

    var body: some View {
        Button("Login with Face ID") {
            Task {
                isAuthenticating = true
                let success = await BiometricAuth.authenticate()
                if success {
                    completeLogin()
                }
                isAuthenticating = false
            }
        }
        .disabled(isAuthenticating)
    }
}
```

### Android (BiometricPrompt)

```kotlin
@Composable
fun BiometricLoginButton(
    onSuccess: () -> Unit,
    onError: (String) -> Unit
) {
    val context = LocalContext.current
    val executor = ContextCompat.getMainExecutor(context)
    val biometricPrompt = BiometricPrompt(
        context as FragmentActivity,
        executor,
        object : BiometricPrompt.AuthenticationCallback() {
            override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                onSuccess()
            }

            override fun onAuthenticationFailed() {
                onError("Biometric authentication failed")
            }
        }
    )

    val promptInfo = BiometricPrompt.PromptInfo.Builder()
        .setTitle("Login to Ricton")
        .setSubtitle("Use Face ID or fingerprint")
        .setNegativeButtonText("Use password")
        .build()

    Button(onClick = {
        biometricPrompt.authenticate(promptInfo)
    }) {
        Text("Login with Face ID")
    }
}
```

---

## Deep Linking

### Universal Links (iOS)

```swift
// AppDelegate.swift
func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
    guard let url = userActivity.webpageURL else { return false }

    handleDeepLink(url)
    return true
}

func handleDeepLink(_ url: URL) {
    let path = url.path

    switch path {
    case "/appointment/confirm":
        if let appointmentId = url.queryParameters["id"] {
            navigateToAppointmentConfirmation(appointmentId)
        }
    case "/prescription/view":
        if let prescriptionId = url.queryParameters["id"] {
            navigateToPrescription(prescriptionId)
        }
    case "/telemedicine/join":
        if let roomId = url.queryParameters["roomId"] {
            joinTelemedicineRoom(roomId)
        }
    default:
        break
    }
}
```

### App Links (Android)

```kotlin
class DeepLinkHandler : IntentActivity {
    override fun onIntentAction(intent: Intent): Boolean {
        return when (intent.data?.path) {
            "/appointment/confirm" -> {
                val appointmentId = intent.data?.getQueryParameter("id")
                navigateToAppointmentConfirmation(appointmentId)
                true
            }
            "/prescription/view" -> {
                val prescriptionId = intent.data?.getQueryParameter("id")
                navigateToPrescription(prescriptionId)
                true
            }
            else -> false
        }
    }
}
```

---

## File Uploads

### Camera / Gallery Selection

```swift
func uploadAvatar(from image: UIImage) async throws -> String {
    guard let data = image.jpegData(compressionQuality: 0.8) else {
        throw APIError.unknown("Failed to compress image")
    }

    // 1. Get presigned URL
    let uploadResponse: AvatarUploadResponse = try await api.request(
        "/api/users/me/avatar",
        method: "PUT",
        body: try JSONEncoder().encode(["fileType": "image/jpeg"])
    )

    // 2. Upload to S3
    var request = URLRequest(url: URL(string: uploadResponse.uploadUrl)!)
    request.httpMethod = "PUT"
    request.setValue("image/jpeg", forHTTPHeaderField: "Content-Type")
    request.httpBody = data

    let (_, response) = try await URLSession.shared.data(for: request)

    guard let httpResponse = response as? HTTPURLResponse,
          httpResponse.statusCode == 200 else {
        throw APIError.serverError
    }

    return uploadResponse.fileUrl
}
```

```kotlin
suspend fun uploadPrescriptionImage(
    context: Context,
    prescriptionId: String,
    uri: Uri
): Result<String> = withContext(Dispatchers.IO) {
    try {
        val inputStream = context.contentResolver.openInputStream(uri) ?: return@withContext Result.failure(Exception("Failed to open file"))
        val bytes = inputStream.readBytes()

        val response = api.uploadPrescriptionDocument(
            prescriptionId = prescriptionId,
            file = bytes,
            contentType = "image/jpeg"
        )

        Result.success(response.fileUrl)
    } catch (e: Exception) {
        Result.failure(e)
    }
}
```

---

## Flutter Implementation

> This section covers Flutter (Dart) implementation for iOS and Android using a single codebase.

### Quick Start

```yaml
# pubspec.yaml
dependencies:
  flutter:
    sdk: flutter
  http: ^1.2.0
  flutter_secure_storage: ^9.0.0
  socket_io_client: ^2.0.3+1
  connectivity_plus: ^5.0.0
  local_auth: ^2.3.0
  uniurl_launcher: ^6.0.0
  image_picker: ^1.0.0
  flutter_bloc: ^8.1.0
  equatable: ^2.0.0
```

### Base URL Configuration

```dart
// lib/config/api_config.dart
enum Environment { dev, staging, prod }

class ApiConfig {
  static const String baseUrlDev = 'http://localhost:8000';
  static const String baseUrlStaging = 'https://api-staging.ricton.health';
  static const String baseUrlProd = 'https://api.ricton.health';

  static String getBaseUrl(Environment env) {
    switch (env) {
      case Environment.dev:
        return baseUrlDev;
      case Environment.staging:
        return baseUrlStaging;
      case Environment.prod:
        return baseUrlProd;
    }
  }

  static Map<String, String> getHeaders({String? token}) {
    return {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }
}
```

### Authentication & Token Storage

```dart
// lib/data/repositories/auth_repository.dart
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class AuthRepository {
  static const _accessTokenKey = 'access_token';
  static const _refreshTokenKey = 'refresh_token';
  static const _storage = FlutterSecureStorage(
    aOptions: AndroidOptions(
      encryptedSharedPreferences: true,
    ),
  );

  Future<void> saveTokens(String access, String refresh) async {
    await _storage.write(key: _accessTokenKey, value: access);
    await _storage.write(key: _refreshTokenKey, value: refresh);
  }

  Future<String?> getAccessToken() => _storage.read(key: _accessTokenKey);
  Future<String?> getRefreshToken() => _storage.read(key: _refreshTokenKey);

  Future<void> clearTokens() async {
    await _storage.delete(key: _accessTokenKey);
    await _storage.delete(key: _refreshTokenKey);
  }
}
```

### Networking Layer (Dio + Bloc)

```dart
// lib/data/dio_client.dart
import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class DioClient {
  static final DioClient _instance = DioClient._internal();
  factory DioClient() => _instance;

  late final Dio dio;
  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  DioClient._internal() {
    dio = Dio(BaseOptions(
      baseUrl: ApiConfig.getBaseUrl(Environment.dev),
      connectTimeout: const Duration(seconds: 30),
      receiveTimeout: const Duration(seconds: 30),
    ));

    dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await _storage.read(key: 'access_token');
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        return handler.next(options);
      },
      onError: (error, handler) async {
        if (error.response?.statusCode == 401) {
          final refreshToken = await _storage.read(key: 'refresh_token');
          if (refreshToken != null) {
            try {
              final newTokens = await _refreshToken(refreshToken);
              await _storage.write(key: 'access_token', value: newTokens['access']);
              await _storage.write(key: 'refresh_token', value: newTokens['refresh']);

              final requestOptions = error.requestOptions;
              requestOptions.headers['Authorization'] = 'Bearer ${newTokens['access']}';

              final response = await dio.fetch(requestOptions);
              return handler.resolve(response);
            } catch (e) {
              await _storage.deleteAll();
            }
          }
        }
        return handler.next(error);
      },
    ));
  }

  Future<Map<String, String>> _refreshToken(String refreshToken) async {
    final response = await dio.post('/api/auth/refresh', data: {
      'refreshToken': refreshToken,
    });
    return Map<String, String>.from(response.data['data']);
  }
}
```

### Bloc State Management

```dart
// lib/presentation/bloc/auth/auth_bloc.dart
import 'package:bloc/bloc.dart';
import 'package:equatable/equatable.dart';

part 'auth_event.dart';
part 'auth_state.dart';

class AuthBloc extends Bloc<AuthEvent, AuthState> {
  final AuthRepository _authRepository;

  AuthBloc(this._authRepository) : super(AuthInitial()) {
    on<LoginRequested>(_onLoginRequested);
    on<LogoutRequested>(_onLogoutRequested);
  }

  Future<void> _onLoginRequested(
    LoginRequested event,
    Emitter<AuthState> emit,
  ) async {
    emit(AuthLoading());
    try {
      final response = await DioClient().dio.post('/api/auth/login', data: {
        'email': event.email,
        'password': event.password,
      });

      final data = response.data['data'];
      await _authRepository.saveTokens(
        data['token'],
        data['refreshToken'],
      );

      emit(AuthAuthenticated(User.fromJson(data['user'])));
    } on DioException catch (e) {
      emit(AuthError(_mapError(e)));
    } catch (e) {
      emit(const AuthError('An unexpected error occurred'));
    }
  }

  String _mapError(DioException e) {
    if (e.response?.data['error'] != null) {
      return e.response!.data['error']['message'];
    }
    return 'Network error';
  }
}
```

### Error Handling

```dart
// lib/core/errors/api_exception.dart
class ApiException implements Exception {
  final String code;
  final String message;
  final Map<String, dynamic>? details;
  final int statusCode;

  ApiException({
    required this.code,
    required this.message,
    this.details,
    required this.statusCode,
  });

  factory ApiException.fromDioError(DioException error) {
    final statusCode = error.response?.statusCode ?? 0;
    final data = error.response?.data;

    if (data != null && data['error'] != null) {
      return ApiException(
        code: data['error']['code'] ?? 'UNKNOWN',
        message: data['error']['message'] ?? 'An error occurred',
        details: data['error']['details'],
        statusCode: statusCode,
      );
    }

    return ApiException(
      code: 'NETWORK_ERROR',
      message: 'Unable to connect to server',
      statusCode: statusCode,
    );
  }
}

// Usage in UI
Widget build(BuildContext context) {
  return BlocBuilder<AuthBloc, AuthState>(
    builder: (context, state) {
      if (state is AuthError) {
        return SnackBar(content: Text(state.message));
      }
      // ...
    },
  );
}
```

### Offline-First with Hive

```dart
// lib/data/local/hive_service.dart
import 'package:hive/hive.dart';

class HiveService {
  static const _appointmentsBox = 'appointments';
  static const _pendingSyncBox = 'pending_sync';

  Future<void> init() async {
    await Hive.openBox(_appointmentsBox);
    await Hive.openBox(_pendingSyncBox);
  }

  Future<List<Appointment>> getCachedAppointments() async {
    final box = Hive.box(_appointmentsBox);
    return box.values.map((json) => Appointment.fromJson(json)).toList();
  }

  Future<void> cacheAppointments(List<Appointment> appointments) async {
    final box = Hive.box(_appointmentsBox);
    await box.clear();
    for (final appointment in appointments) {
      await box.put(appointment.id, appointment.toJson());
    }
  }

  Future<void> addPendingSync(String endpoint, Map<String, dynamic> data) async {
    final box = Hive.box(_pendingSyncBox);
    final id = DateTime.now().millisecondsSinceEpoch.toString();
    await box.put(id, {
      'endpoint': endpoint,
      'data': data,
      'timestamp': DateTime.now().toIso8601String(),
    });
  }
}

// Repository pattern
class AppointmentRepository {
  final HiveService _local = HiveService();
  final DioClient _remote = DioClient();

  Future<List<Appointment>> getAppointments() async {
    // Return cached immediately
    final cached = await _local.getCachedAppointments();

    // Refresh in background
    _remote.dio.get('/api/appointments').then((response) {
      final appointments = (response.data['data']['appointments'] as List)
          .map((json) => Appointment.fromJson(json))
          .toList();
      _local.cacheAppointments(appointments);
    }).catchError((e) => debugPrint('Sync failed: $e'));

    return cached;
  }

  Future<Appointment> createAppointment(CreateAppointmentInput input) async {
    try {
      final response = await _remote.dio.post(
        '/api/appointments',
        data: input.toJson(),
      );
      return Appointment.fromJson(response.data['data']);
    } on DioException catch (e) {
      if (e.response?.statusCode == 409) {
        await _local.addPendingSync('/api/appointments', input.toJson());
      }
      rethrow;
    }
  }
}
```

### Push Notifications (Firebase)

```dart
// lib/services/notification_service.dart
import 'package:firebase_messaging/firebase_messaging.dart';

class NotificationService {
  static final FirebaseMessaging _messaging = FirebaseMessaging.instance;

  static Future<void> initialize() async {
    // Request permission
    NotificationSettings settings = await _messaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );

    if (settings.authorizationStatus == AuthorizationStatus.authorized) {
      // Get FCM token
      String? token = await _messaging.getToken();
      debugPrint('FCM Token: $token');

      // Send to backend
      await DioClient().dio.post('/api/devices/register', data: {
        'deviceToken': token,
        'platform': 'flutter',
        'deviceType': Platform.isIOS ? 'ios' : 'android',
      });
    }

    // Handle foreground messages
    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      final data = message.data;
      final type = data['type'];

      switch (type) {
        case 'appointment_reminder':
          // Show local notification
          break;
        case 'prescription_ready':
          // Navigate to prescription
          break;
      }
    });

    // Handle background/terminated messages
    FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);
  }
}

Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  // Handle background messages
}
```

### Real-time Messaging (Socket.IO)

```dart
// lib/services/socket_service.dart
import 'package:socket_io_client/socket_io_client.dart' as IO;

class SocketService {
  static final SocketService _instance = SocketService._internal();
  factory SocketService() => _instance;

  IO.Socket? _socket;
  final AuthRepository _authRepository = AuthRepository();

  SocketService._internal();

  Future<void> connect() async {
    final token = await _authRepository.getAccessToken();

    _socket = IO.io(
      ApiConfig.getBaseUrl(Environment.dev),
      IO.OptionBuilder()
          .setTransports(['websocket'])
          .enableAutoConnect()
          .setAuth({'token': token})
          .build(),
    );

    _socket!.onConnect((_) {
      debugPrint('Connected to socket');
    });

    _socket!.onDisconnect((_) {
      debugPrint('Disconnected from socket');
    });

    _socket!.on('message:new', (data) {
      // Handle new message
      eventBus.fire(NewMessageEvent(Message.fromJson(data)));
    });

    _socket!.on('message:read', (data) {
      // Handle read receipt
      eventBus.fire(MessageReadEvent(List<String>.from(data['messageIds'])));
    });

    _socket!.onError((error) {
      debugPrint('Socket error: $error');
    });
  }

  void sendMessage(String conversationId, String body) {
    _socket?.emit('message:send', {
      'conversationId': conversationId,
      'body': body,
    });
  }

  void markAsRead(String conversationId, List<String> messageIds) {
    _socket?.emit('message:mark:read', {
      'conversationId': conversationId,
      'messageIds': messageIds,
    });
  }

  void disconnect() {
    _socket?.disconnect();
  }
}
```

### Biometric Authentication

```dart
// lib/services/biometric_service.dart
import 'package:local_auth/local_auth.dart';

class BiometricService {
  static final LocalAuthentication _auth = LocalAuthentication();

  static Future<bool> canCheckBiometrics() async {
    return await _auth.canCheckBiometrics;
  }

  static Future<bool> authenticate() async {
    try {
      return await _auth.authenticate(
        localizedReason: 'Authenticate to access Ricton',
        options: const AuthenticationOptions(
          biometricOnly: false,
          stickyAuth: true,
        ),
      );
    } catch (e) {
      debugPrint('Biometric auth failed: $e');
      return false;
    }
  }
}

// Usage in UI
ElevatedButton.icon(
  onPressed: () async {
    final canAuth = await BiometricService.canCheckBiometrics();
    if (canAuth) {
      final success = await BiometricService.authenticate();
      if (success) {
        context.read<AuthBloc>().add(const BiometricLoginRequested());
      }
    }
  },
  icon: const Icon(Icons.fingerprint),
  label: const Text('Login with Biometrics'),
)
```

### Deep Linking

```dart
// lib/core/navigation/deep_link_handler.dart
import 'package:go_router/go_router.dart';

class DeepLinkHandler {
  static void handleDeepLink(Uri uri) {
    final path = uri.path;

    switch (path) {
      case '/appointment/confirm':
        final appointmentId = uri.queryParameters['id'];
        if (appointmentId != null) {
          navigatorKey.currentState?.pushNamed(
            'appointment_confirmation',
            queryParams: {'id': appointmentId},
          );
        }
        break;
      case '/prescription/view':
        final prescriptionId = uri.queryParameters['id'];
        if (prescriptionId != null) {
          navigatorKey.currentState?.pushNamed(
            'prescription_detail',
            queryParams: {'id': prescriptionId},
          );
        }
        break;
      case '/telemedicine/join':
        final roomId = uri.queryParameters['roomId'];
        if (roomId != null) {
          navigatorKey.currentState?.pushNamed(
            'telemedicine_room',
            queryParams: {'roomId': roomId},
          );
        }
        break;
    }
  }
}

// In main.dart
final GoRouter router = GoRouter(
  initialLocation: '/',
  navigatorKey: navigatorKey,
  routes: [
    GoRoute(
      path: '/',
      builder: (context, state) => const HomeScreen(),
    ),
    GoRoute(
      path: '/appointment/confirm',
      builder: (context, state) {
        final id = state.queryParameters['id']!;
        return AppointmentConfirmationScreen(appointmentId: id);
      },
    ),
  ],
);
```

### File Uploads

```dart
// lib/data/repositories/upload_repository.dart
import 'package:image_picker/image_picker.dart';
import 'package:http/http.dart' as http;

class UploadRepository {
  final ImagePicker _picker = ImagePicker();

  Future<String> uploadAvatar() async {
    // 1. Pick image
    final XFile? image = await _picker.pickImage(
      source: ImageSource.gallery,
      maxWidth: 1024,
      maxHeight: 1024,
      imageQuality: 80,
    );

    if (image == null) throw Exception('No image selected');

    // 2. Get presigned URL
    final presignedResponse = await DioClient().dio.put(
      '/api/users/me/avatar',
      data: {'fileType': 'image/jpeg'},
    );

    final uploadUrl = presignedResponse.data['data']['uploadUrl'];
    final fileUrl = presignedResponse.data['data']['fileUrl'];

    // 3. Upload to S3
    final bytes = await image.readAsBytes();
    final uploadResponse = await http.put(
      Uri.parse(uploadUrl),
      headers: {'Content-Type': 'image/jpeg'},
      body: bytes,
    );

    if (uploadResponse.statusCode != 200) {
      throw Exception('Upload failed');
    }

    return fileUrl;
  }
}
```

### Platform-Specific Notes

- Use `flutter_secure_storage` with `encryptedSharedPreferences` on Android and Keychain on iOS
- Use `connectivity_plus` to detect network status
- Use `workmanager` for background sync on Android
- Use `background_fetch` for periodic sync on iOS
- Compress images before upload (max 2MB)
- Use `flutter_image_compress` for efficient compression

---

## React Native / Expo Implementation

> This section covers React Native and Expo (TypeScript) implementation for iOS and Android.

### Quick Start

```bash
# Expo
npx create-expo-app --template blank-typescript ricton-app
cd ricton-app

# Dependencies
npx expo install expo-secure-store expo-image-picker
npm install socket.io-client axios @react-navigation/native
npx expo install react-native-screens react-native-safe-area-context
```

### Base URL Configuration

```typescript
// src/config/api.ts
import { Constants } from 'expo-constants';

export const API_BASE_URL = __DEV__
  ? 'http://localhost:8000'
  : Constants.expoConfig?.extra?.apiUrl || 'https://api.ricton.health';

export const API_HEADERS = {
  'Content-Type': 'application/json',
  Accept: 'application/json',
};
```

### Authentication & Token Storage

```typescript
// src/services/storage.ts
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEYS = {
  ACCESS: 'access_token',
  REFRESH: 'refresh_token',
} as const;

export const tokenStorage = {
  async saveTokens(access: string, refresh: string) {
    await Promise.all([
      SecureStore.setItemAsync(TOKEN_KEYS.ACCESS, access),
      SecureStore.setItemAsync(TOKEN_KEYS.REFRESH, refresh),
    ]);
  },

  async getAccessToken() {
    return SecureStore.getItemAsync(TOKEN_KEYS.ACCESS);
  },

  async getRefreshToken() {
    return SecureStore.getItemAsync(TOKEN_KEYS.REFRESH);
  },

  async clearTokens() {
    await Promise.all([
      SecureStore.deleteItemAsync(TOKEN_KEYS.ACCESS),
      SecureStore.deleteItemAsync(TOKEN_KEYS.REFRESH),
    ]);
  },
};
```

### Networking Layer (Axios + React Query)

```typescript
// src/services/api.ts
import axios, { AxiosError } from 'axios';
import { tokenStorage } from './storage';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: API_HEADERS,
});

api.interceptors.request.use(async (config) => {
  const token = await tokenStorage.getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiResponse>) => {
    const original = error.config;

    if (error.response?.status === 401 && !original?._retry) {
      original!._retry = true;

      try {
        const refreshToken = await tokenStorage.getRefreshToken();
        if (!refreshToken) throw new Error('No refresh token');

        const { data } = await axios.post<ApiResponse<AuthData>>(
          `${API_BASE_URL}/api/auth/refresh`,
          { refreshToken }
        );

        if (data.success && data.data) {
          await tokenStorage.saveTokens(data.data.token, data.data.refreshToken);

          original.headers.Authorization = `Bearer ${data.data.token}`;
          return api(original);
        }
      } catch (refreshError) {
        await tokenStorage.clearTokens();
        // Redirect to login
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
```

### React Query / TanStack Query

```typescript
// src/hooks/useAuth.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export function useProfile() {
  return useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data } = await api.get('/api/users/me');
      return data.data;
    },
    retry: (failureCount, error) => {
      if (error.response?.status === 401) return false;
      return failureCount < 3;
    },
  });
}

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (credentials: LoginInput) =>
      api.post('/api/auth/login', credentials).then((res) => res.data),
    onSuccess: async (data) => {
      if (data.success && data.data) {
        await tokenStorage.saveTokens(data.data.token, data.data.refreshToken);
        queryClient.setQueryData(['profile'], data.data.user);
      }
    },
  });
}
```

### Error Handling

```typescript
// src/components/ErrorBoundary.tsx
'use client';

import { Component, ReactNode } from 'react';
import { Alert } from 'react-native';

interface Props {
  children: ReactNode;
  fallback?: (error: ApiError) => ReactNode;
}

interface State {
  error: ApiError | null;
}

export class ApiErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: ApiError): State {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('API Error:', error, errorInfo);
  }

  render() {
    if (this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error);
      }

      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorMessage}>{this.state.error.message}</Text>
          <Button title="Retry" onPress={() => this.setState({ error: null })} />
        </View>
      );
    }

    return this.props.children;
  }
}

// Custom hook for error handling
export function useApiError() {
  return (error: any) => {
    const apiError = error as ApiError;

    if (apiError.code === 'UNAUTHORIZED') {
      // Navigate to login
      return;
    }

    if (apiError.code === 'VALIDATION_ERROR') {
      // Show field errors
      return apiError.details;
    }

    Alert.alert('Error', apiError.message);
  };
}
```

### Offline-First with MMKV

```typescript
// src/services/storage/mmkv.ts
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV();

export const mmkvStorage = {
  getAppointments: (): Appointment[] => {
    const data = storage.getString('appointments');
    return data ? JSON.parse(data) : [];
  },

  setAppointments: (appointments: Appointment[]) => {
    storage.set('appointments', JSON.stringify(appointments));
  },

  addPendingSync: (endpoint: string, data: any) => {
    const pending = JSON.parse(storage.getString('pending_sync') || '[]');
    pending.push({ endpoint, data, timestamp: Date.now() });
    storage.set('pending_sync', JSON.stringify(pending));
  },
};

// Repository with offline support
export function useAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Load cached data immediately
    const cached = mmkvStorage.getAppointments();
    setAppointments(cached);

    // Subscribe to network state
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(state.isConnected ?? false);

      if (state.isConnected) {
        syncPendingChanges();
      }
    });

    return () => unsubscribe();
  }, []);

  const syncPendingChanges = async () => {
    const pending = JSON.parse(storage.getString('pending_sync') || '[]');

    for (const item of pending) {
      try {
        await api.post(item.endpoint, item.data);
      } catch (e) {
        console.error('Sync failed for', item.endpoint, e);
      }
    }

    storage.delete('pending_sync');
  };

  return { appointments, isOnline, syncPendingChanges };
}
```

### Push Notifications (Expo)

```typescript
// src/services/notifications.ts
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { tokenStorage } from './storage';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotifications() {
  if (!Device.isDevice) {
    console.log('Push notifications only work on physical devices');
    return;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    Alert.alert('Permission required', 'Push notifications need permission');
    return;
  }

  const token = await Notifications.getExpoPushTokenAsync({
    projectId: 'your-project-id',
  });

  // Send to backend
  await api.post('/api/devices/register', {
    deviceToken: token.data,
    platform: Device.osName,
    deviceType: 'expo',
  });

  // Handle notifications
  const subscription = Notifications.addNotificationReceivedListener((notification) => {
    const data = notification.request.content.data;
    const type = data.type;

    switch (type) {
      case 'appointment_reminder':
        // Navigate or show alert
        break;
      case 'prescription_ready':
        // Update UI
        break;
    }
  });

  return subscription;
}

// Handle notification tap
export function useNotificationNavigation() {
  const navigation = useNavigation();

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      const type = data.type;

      if (type === 'appointment_reminder') {
        navigation.navigate('AppointmentDetails', {
          id: data.appointmentId,
        });
      }
    });

    return () => subscription.remove();
  }, [navigation]);
}
```

### Real-time Messaging (Socket.IO)

```typescript
// src/services/socket.ts
import { io, Socket } from 'socket.io-client';
import { tokenStorage } from './storage';
import { EventEmitter } from 'events';

class SocketService extends EventEmitter {
  private socket: Socket | null = null;

  async connect() {
    const token = await tokenStorage.getAccessToken();

    this.socket = io(API_BASE_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('Socket connected');
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    // Message events
    this.socket.on('message:new', (data) => {
      this.emit('message:new', data);
    });

    this.socket.on('message:read', (data) => {
      this.emit('message:read', data);
    });

    this.socket.on('conversations:list', (data) => {
      this.emit('conversations:list', data);
    });
  }

  sendMessage(conversationId: string, body: string) {
    this.socket?.emit('message:send', { conversationId, body });
  }

  markAsRead(conversationId: string, messageIds: string[]) {
    this.socket?.emit('message:mark:read', { conversationId, messageIds });
  }

  disconnect() {
    this.socket?.disconnect();
  }
}

export const socketService = new SocketService();
```

### Biometric Authentication

```typescript
// src/services/biometrics.ts
import * as LocalAuthentication from 'expo-local-authentication';

export async function canUseBiometrics(): Promise<boolean> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  if (!hasHardware) return false;

  const isEnrolled = await LocalAuthentication.isEnrolledAsync();
  return isEnrolled;
}

export async function authenticateBiometric(): Promise<boolean> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Authenticate to access Ricton',
      fallbackLabel: 'Use passcode',
      cancelLabel: 'Cancel',
      disableDeviceFallback: false,
    });

    return result.success;
  } catch (error) {
    console.error('Biometric auth error:', error);
    return false;
  }
}

// Usage in component
function LoginScreen() {
  const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);

  useEffect(() => {
    canUseBiometrics().then(setIsBiometricAvailable);
  }, []);

  const handleBiometricLogin = async () => {
    const success = await authenticateBiometric();
    if (success) {
      // Trigger biometric login
    }
  };

  return (
    <View>
      {/* ... */}
      {isBiometricAvailable && (
        <TouchableOpacity onPress={handleBiometricLogin}>
          <Text>Login with Face ID / Fingerprint</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
```

### Deep Linking

```typescript
// src/navigation/DeepLinkHandler.ts
import { Linking } from 'react-native';
import { CommonActions } from '@react-navigation/native';

export function setupDeepLinks(navigation: any) {
  Linking.addEventListener('url', ({ url }) => {
    const { path, queryParams } = parseDeepLink(url);
    handleDeepLink(path, queryParams, navigation);
  });

  // Handle cold start
  Linking.getInitialURL().then((url) => {
    if (url) {
      const { path, queryParams } = parseDeepLink(url);
      handleDeepLink(path, queryParams, navigation);
    }
  });
}

function parseDeepLink(url: string) {
  const parsed = new URL(url);
  const path = parsed.pathname;
  const queryParams = Object.fromEntries(parsed.searchParams);
  return { path, queryParams };
}

function handleDeepLink(path: string, params: any, navigation: any) {
  switch (path) {
    case '/appointment/confirm':
      navigation.dispatch(
        CommonActions.navigate({
          name: 'AppointmentConfirmation',
          params: { appointmentId: params.id },
        })
      );
      break;
    case '/prescription/view':
      navigation.dispatch(
        CommonActions.navigate({
          name: 'PrescriptionDetail',
          params: { prescriptionId: params.id },
        })
      );
      break;
    case '/telemedicine/join':
      navigation.dispatch(
        CommonActions.navigate({
          name: 'TelemedicineRoom',
          params: { roomId: params.roomId },
        })
      );
      break;
  }
}
```

### File Uploads

```typescript
// src/services/uploads.ts
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

export async function pickAndUploadAvatar(): Promise<string> {
  // 1. Request permission
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Permission to access media library is required');
  }

  // 2. Pick image
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });

  if (result.canceled || !result.assets[0]) {
    throw new Error('No image selected');
  }

  const asset = result.assets[0];

  // 3. Compress image
  const compressedUri = await FileSystem.writeAsStringAsync(
    `${FileSystem.documentDirectory}avatar_${Date.now()}.jpg`,
    await FileSystem.readAsStringAsync(asset.uri, {
      encoding: FileSystem.EncodingType.Base64,
    }),
    { encoding: FileSystem.EncodingType.Base64 }
  );

  // 4. Get presigned URL
  const { data } = await api.put('/api/users/me/avatar', {
    fileType: 'image/jpeg',
  });

  // 5. Upload to S3
  const uploadResponse = await FileSystem.uploadAsync(data.data.uploadUrl, compressedUri, {
    httpMethod: 'PUT',
    headers: {
      'Content-Type': 'image/jpeg',
    },
  });

  if (uploadResponse.status !== 200) {
    throw new Error('Upload failed');
  }

  return data.data.fileUrl;
}
```

### Platform-Specific Notes

- Use `expo-secure-store` for token storage (uses Keychain on iOS, Keystore on Android)
- Use `expo-image-picker` for camera/gallery access
- Use `expo-notifications` for push notifications
- Use `expo-local-authentication` for biometric auth
- Use `react-native-mmkv` for fast local storage
- Use `@react-native-community/netinfo` for network status
- Use `expo-file-system` for file operations
- Always test on physical devices for push notifications and biometrics
- Use `expo-task-manager` and `expo-background-fetch` for background sync

---

## Platform-Specific Notes

### iOS (Native)

- Use `URLCache` for GET request caching (5MB default)
- Background uploads with `URLSessionConfiguration.background`
- Push notifications require APNs key uploaded to Kong dashboard
- Face ID fallback to passcode is automatic with `.deviceOwnerAuthentication`

### Android (Native)

- Use `WorkManager` for background sync
- Camera permissions required at runtime for Android 13+
- FCM token sent to `/api/devices/register` on app launch
- Biometric prompt requires `androidx.biometric` library

### Flutter

- Use `flutter_secure_storage` with `encryptedSharedPreferences` on Android and Keychain on iOS
- Use `connectivity_plus` to detect network status
- Use `workmanager` for background sync on Android
- Use `background_fetch` for periodic sync on iOS
- Compress images before upload (max 2MB)
- Use `flutter_image_compress` for efficient compression

### React Native / Expo

- Use `expo-secure-store` for token storage (uses Keychain on iOS, Keystore on Android)
- Use `expo-image-picker` for camera/gallery access
- Use `expo-notifications` for push notifications
- Use `expo-local-authentication` for biometric auth
- Use `react-native-mmkv` for fast local storage
- Use `@react-native-community/netinfo` for network status
- Use `expo-file-system` for file operations
- Always test on physical devices for push notifications and biometrics
- Use `expo-task-manager` and `expo-background-fetch` for background sync

### All Platforms

- Always validate TLS certificates (pin in production)
- Compress images before upload (max 2MB)
- Use exponential backoff for network retries
- Queue mutations when offline, sync when connectivity returns
- Log errors to Sentry with device context
