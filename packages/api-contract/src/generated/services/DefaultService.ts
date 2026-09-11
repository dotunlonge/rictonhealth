/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AuthResponse } from '../models/AuthResponse';
import type { ChangePasswordInput } from '../models/ChangePasswordInput';
import type { CreateAppointment } from '../models/CreateAppointment';
import type { CreateConversationInput } from '../models/CreateConversationInput';
import type { CreateOrderResponse } from '../models/CreateOrderResponse';
import type { CreatePrescriptionInput } from '../models/CreatePrescriptionInput';
import type { CreateTelemedicineRoomInput } from '../models/CreateTelemedicineRoomInput';
import type { GetPrescriptionResponse } from '../models/GetPrescriptionResponse';
import type { GetTokenResponse } from '../models/GetTokenResponse';
import type { GetUserResponse } from '../models/GetUserResponse';
import type { HospitalDashboardResponse } from '../models/HospitalDashboardResponse';
import type { JoinRoomResponse } from '../models/JoinRoomResponse';
import type { ListPrescriptionsResponse } from '../models/ListPrescriptionsResponse';
import type { LoginInput } from '../models/LoginInput';
import type { MarkConversationReadInput } from '../models/MarkConversationReadInput';
import type { OAuthInput } from '../models/OAuthInput';
import type { OrdersListResponse } from '../models/OrdersListResponse';
import type { PasswordResetInput } from '../models/PasswordResetInput';
import type { PharmacyDirectoryResponse } from '../models/PharmacyDirectoryResponse';
import type { ProductDetailResponse } from '../models/ProductDetailResponse';
import type { ProductsListResponse } from '../models/ProductsListResponse';
import type { ProviderDashboardResponse } from '../models/ProviderDashboardResponse';
import type { RefreshTokenInput } from '../models/RefreshTokenInput';
import type { RegisterInput } from '../models/RegisterInput';
import type { SendMessageInput } from '../models/SendMessageInput';
import type { SendOtpInput } from '../models/SendOtpInput';
import type { SendPrescriptionToPharmacyInput } from '../models/SendPrescriptionToPharmacyInput';
import type { SignPrescriptionInput } from '../models/SignPrescriptionInput';
import type { TelemedicineRoom } from '../models/TelemedicineRoom';
import type { TopUpInput } from '../models/TopUpInput';
import type { TopUpResponse } from '../models/TopUpResponse';
import type { UpdateAppointmentStatus } from '../models/UpdateAppointmentStatus';
import type { UpdateProfileInput } from '../models/UpdateProfileInput';
import type { VerifyConfirmInput } from '../models/VerifyConfirmInput';
import type { VerifyEmailInput } from '../models/VerifyEmailInput';
import type { VerifyOtpInput } from '../models/VerifyOtpInput';
import type { VerifyPhoneInput } from '../models/VerifyPhoneInput';
import type { WalletResponse } from '../models/WalletResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class DefaultService {
  /**
   * Platform overview analytics
   * @returns any Platform overview
   * @throws ApiError
   */
  public static getApiAnalyticsOverview(): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/analytics/overview',
      errors: {
        401: `Unauthorized`,
        403: `Forbidden`,
      },
    });
  }
  /**
   * Appointment trends analytics
   * @returns any Appointment trends
   * @throws ApiError
   */
  public static getApiAnalyticsAppointments({
    range,
    from,
    to,
  }: {
    range?: '7d' | '30d' | '90d' | '12m' | 'all';
    from?: string;
    to?: string;
  }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/analytics/appointments',
      query: {
        range: range,
        from: from,
        to: to,
      },
      errors: {
        401: `Unauthorized`,
        403: `Forbidden`,
      },
    });
  }
  /**
   * Revenue analytics
   * @returns any Revenue analytics
   * @throws ApiError
   */
  public static getApiAnalyticsRevenue({
    range,
    from,
    to,
  }: {
    range?: '7d' | '30d' | '90d' | '12m' | 'all';
    from?: string;
    to?: string;
  }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/analytics/revenue',
      query: {
        range: range,
        from: from,
        to: to,
      },
      errors: {
        401: `Unauthorized`,
        403: `Forbidden`,
      },
    });
  }
  /**
   * User growth analytics
   * @returns any User growth stats
   * @throws ApiError
   */
  public static getApiAnalyticsUsers({
    range,
    from,
    to,
  }: {
    range?: '7d' | '30d' | '90d' | '12m' | 'all';
    from?: string;
    to?: string;
  }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/analytics/users',
      query: {
        range: range,
        from: from,
        to: to,
      },
      errors: {
        401: `Unauthorized`,
        403: `Forbidden`,
      },
    });
  }
  /**
   * Provider performance analytics
   * @returns any Provider performance
   * @throws ApiError
   */
  public static getApiAnalyticsProviders({
    range,
    from,
    to,
    limit,
    offset,
  }: {
    range?: '7d' | '30d' | '90d' | '12m' | 'all';
    from?: string;
    to?: string;
    limit?: number;
    offset?: number;
  }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/analytics/providers',
      query: {
        range: range,
        from: from,
        to: to,
        limit: limit,
        offset: offset,
      },
      errors: {
        401: `Unauthorized`,
        403: `Forbidden`,
      },
    });
  }
  /**
   * Pharmacy metrics analytics
   * @returns any Pharmacy metrics
   * @throws ApiError
   */
  public static getApiAnalyticsPharmacies({
    range,
    from,
    to,
  }: {
    range?: '7d' | '30d' | '90d' | '12m' | 'all';
    from?: string;
    to?: string;
  }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/analytics/pharmacies',
      query: {
        range: range,
        from: from,
        to: to,
      },
      errors: {
        401: `Unauthorized`,
        403: `Forbidden`,
      },
    });
  }
  /**
   * Set provider availability
   * @returns any Availability set
   * @throws ApiError
   */
  public static postApiAppointmentsAvailability({
    requestBody,
  }: {
    requestBody?: {
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      slotDurationMinutes: number;
    };
  }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/appointments/availability',
      body: requestBody,
      mediaType: 'application/json',
      errors: {
        401: `Unauthorized`,
        403: `Forbidden`,
      },
    });
  }
  /**
   * Get available slots for provider
   * @returns any Available slots
   * @throws ApiError
   */
  public static getApiAppointmentsSlots({
    providerId,
    date,
  }: {
    providerId: string;
    date: string;
  }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/appointments/slots/{providerId}',
      path: {
        providerId: providerId,
      },
      query: {
        date: date,
      },
      errors: {
        401: `Unauthorized`,
      },
    });
  }
  /**
   * Book appointment
   * @returns any Appointment created
   * @throws ApiError
   */
  public static postApiAppointments({
    requestBody,
  }: {
    requestBody?: CreateAppointment;
  }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/appointments',
      body: requestBody,
      mediaType: 'application/json',
      errors: {
        400: `Validation error`,
        409: `Slot conflict`,
      },
    });
  }
  /**
   * List appointments
   * @returns any Appointments list
   * @throws ApiError
   */
  public static getApiAppointments({
    status,
    type,
    from,
    to,
    limit,
    offset,
  }: {
    status?: string;
    type?: string;
    from?: string;
    to?: string;
    limit?: string;
    offset?: string;
  }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/appointments',
      query: {
        status: status,
        type: type,
        from: from,
        to: to,
        limit: limit,
        offset: offset,
      },
      errors: {
        401: `Unauthorized`,
        403: `Forbidden`,
      },
    });
  }
  /**
   * Get appointment by ID
   * @returns any Appointment details
   * @throws ApiError
   */
  public static getApiAppointments1({ id }: { id: string }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/appointments/{id}',
      path: {
        id: id,
      },
      errors: {
        403: `Forbidden`,
        404: `Not found`,
      },
    });
  }
  /**
   * Update appointment status
   * @returns any Status updated
   * @throws ApiError
   */
  public static patchApiAppointmentsStatus({
    id,
    requestBody,
  }: {
    id: string;
    requestBody?: UpdateAppointmentStatus;
  }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'PATCH',
      url: '/api/appointments/{id}/status',
      path: {
        id: id,
      },
      body: requestBody,
      mediaType: 'application/json',
      errors: {
        403: `Forbidden`,
        404: `Not found`,
      },
    });
  }
  /**
   * Cancel appointment
   * @returns any Appointment cancelled
   * @throws ApiError
   */
  public static patchApiAppointmentsCancel({
    id,
    requestBody,
  }: {
    id: string;
    requestBody?: {
      reason?: string;
    };
  }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'PATCH',
      url: '/api/appointments/{id}/cancel',
      path: {
        id: id,
      },
      body: requestBody,
      mediaType: 'application/json',
      errors: {
        403: `Forbidden`,
        404: `Not found`,
      },
    });
  }
  /**
   * Register a new user
   * @returns any User registered successfully
   * @throws ApiError
   */
  public static postApiAuthRegister({
    requestBody,
  }: {
    requestBody?: RegisterInput;
  }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/auth/register',
      body: requestBody,
      mediaType: 'application/json',
      errors: {
        400: `Validation Error`,
      },
    });
  }
  /**
   * Login a user
   * @returns AuthResponse User logged in successfully
   * @throws ApiError
   */
  public static postApiAuthLogin({
    requestBody,
  }: {
    requestBody?: LoginInput;
  }): CancelablePromise<AuthResponse> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/auth/login',
      body: requestBody,
      mediaType: 'application/json',
      errors: {
        401: `Unauthorized`,
      },
    });
  }
  /**
   * Send OTP to email/phone
   * @returns any OTP Sent
   * @throws ApiError
   */
  public static postApiAuthOtpSend({
    requestBody,
  }: {
    requestBody?: SendOtpInput;
  }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/auth/otp/send',
      body: requestBody,
      mediaType: 'application/json',
    });
  }
  /**
   * Verify OTP and get JWT
   * @returns AuthResponse OTP Verified
   * @throws ApiError
   */
  public static postApiAuthOtpVerify({
    requestBody,
  }: {
    requestBody?: VerifyOtpInput;
  }): CancelablePromise<AuthResponse> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/auth/otp/verify',
      body: requestBody,
      mediaType: 'application/json',
    });
  }
  /**
   * Login/Register via Google
   * @returns AuthResponse Google Login Successful
   * @throws ApiError
   */
  public static postApiAuthOauthGoogle({
    requestBody,
  }: {
    requestBody?: OAuthInput;
  }): CancelablePromise<AuthResponse> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/auth/oauth/google',
      body: requestBody,
      mediaType: 'application/json',
    });
  }
  /**
   * Login/Register via Apple
   * @returns AuthResponse Apple Login Successful
   * @throws ApiError
   */
  public static postApiAuthOauthApple({
    requestBody,
  }: {
    requestBody?: OAuthInput;
  }): CancelablePromise<AuthResponse> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/auth/oauth/apple',
      body: requestBody,
      mediaType: 'application/json',
    });
  }
  /**
   * Refresh access token
   * @returns AuthResponse Token refreshed
   * @throws ApiError
   */
  public static postApiAuthRefresh({
    requestBody,
  }: {
    requestBody?: RefreshTokenInput;
  }): CancelablePromise<AuthResponse> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/auth/refresh',
      body: requestBody,
      mediaType: 'application/json',
    });
  }
  /**
   * Logout and invalidate refresh token
   * @returns any Logged out successfully
   * @throws ApiError
   */
  public static postApiAuthLogout({
    requestBody,
  }: {
    requestBody?: RefreshTokenInput;
  }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/auth/logout',
      body: requestBody,
      mediaType: 'application/json',
    });
  }
  /**
   * Send password reset OTP
   * @returns any OTP Sent
   * @throws ApiError
   */
  public static postApiAuthPasswordForgot({
    requestBody,
  }: {
    requestBody?: SendOtpInput;
  }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/auth/password/forgot',
      body: requestBody,
      mediaType: 'application/json',
    });
  }
  /**
   * Verify OTP and reset password
   * @returns any Password reset successful
   * @throws ApiError
   */
  public static postApiAuthPasswordReset({
    requestBody,
  }: {
    requestBody?: PasswordResetInput;
  }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/auth/password/reset',
      body: requestBody,
      mediaType: 'application/json',
    });
  }
  /**
   * Change the authenticated user password
   * @returns any Password changed successfully
   * @throws ApiError
   */
  public static postApiAuthPasswordChange({
    requestBody,
  }: {
    requestBody?: ChangePasswordInput;
  }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/auth/password/change',
      body: requestBody,
      mediaType: 'application/json',
      errors: {
        400: `Current password is incorrect or the new password is invalid`,
        401: `Unauthorized`,
      },
    });
  }
  /**
   * Send email verification OTP
   * @returns any Verification OTP sent
   * @throws ApiError
   */
  public static postApiAuthVerifyEmail({
    requestBody,
  }: {
    requestBody?: VerifyEmailInput;
  }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/auth/verify-email',
      body: requestBody,
      mediaType: 'application/json',
    });
  }
  /**
   * Send phone verification OTP
   * @returns any Verification OTP sent
   * @throws ApiError
   */
  public static postApiAuthVerifyPhone({
    requestBody,
  }: {
    requestBody?: VerifyPhoneInput;
  }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/auth/verify-phone',
      body: requestBody,
      mediaType: 'application/json',
    });
  }
  /**
   * Verify OTP and mark contact as verified
   * @returns AuthResponse Contact verified successfully and authenticated session created
   * @throws ApiError
   */
  public static postApiAuthVerifyConfirm({
    requestBody,
  }: {
    requestBody?: VerifyConfirmInput;
  }): CancelablePromise<AuthResponse> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/auth/verify/confirm',
      body: requestBody,
      mediaType: 'application/json',
    });
  }
  /**
   * List conversations
   * @returns any Conversations list
   * @throws ApiError
   */
  public static getApiMessagesConversations(): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/messages/conversations',
      errors: {
        401: `Unauthorized`,
      },
    });
  }
  /**
   * Create conversation
   * @returns any Conversation created
   * @throws ApiError
   */
  public static postApiMessagesConversations({
    requestBody,
  }: {
    requestBody?: CreateConversationInput;
  }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/messages/conversations',
      body: requestBody,
      mediaType: 'application/json',
      errors: {
        400: `Validation error`,
        401: `Unauthorized`,
      },
    });
  }
  /**
   * Get conversation messages
   * @returns any Conversation messages
   * @throws ApiError
   */
  public static getApiMessagesConversations1({ id }: { id: string }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/messages/conversations/{id}',
      path: {
        id: id,
      },
      errors: {
        401: `Unauthorized`,
        404: `Conversation not found`,
      },
    });
  }
  /**
   * Send message
   * @returns any Message sent
   * @throws ApiError
   */
  public static postApiMessagesConversationsMessages({
    id,
    requestBody,
  }: {
    id: string;
    requestBody?: SendMessageInput;
  }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/messages/conversations/{id}/messages',
      path: {
        id: id,
      },
      body: requestBody,
      mediaType: 'application/json',
      errors: {
        400: `Validation error`,
        401: `Unauthorized`,
        404: `Conversation not found`,
      },
    });
  }
  /**
   * Mark conversation as read
   * @returns any Conversation marked as read
   * @throws ApiError
   */
  public static patchApiMessagesConversationsRead({
    id,
    requestBody,
  }: {
    id: string;
    requestBody?: MarkConversationReadInput;
  }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'PATCH',
      url: '/api/messages/conversations/{id}/read',
      path: {
        id: id,
      },
      body: requestBody,
      mediaType: 'application/json',
      errors: {
        401: `Unauthorized`,
        404: `Conversation not found`,
      },
    });
  }
  /**
   * List notifications
   * @returns any Notifications list
   * @throws ApiError
   */
  public static getApiNotifications(): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/notifications',
      errors: {
        401: `Unauthorized`,
      },
    });
  }
  /**
   * List payments
   * @returns any Payments list
   * @throws ApiError
   */
  public static getApiPayments(): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/payments',
      errors: {
        401: `Unauthorized`,
      },
    });
  }
  /**
   * Verify payment by provider reference
   * @returns any Payment verification result
   * @throws ApiError
   */
  public static getApiPaymentsVerify({ reference }: { reference: string }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/payments/verify/{reference}',
      path: {
        reference: reference,
      },
      errors: {
        401: `Unauthorized`,
        404: `Payment not found`,
      },
    });
  }
  /**
   * Browse pharmacy products
   * @returns ProductsListResponse Products list
   * @throws ApiError
   */
  public static getApiPharmacyProducts({
    search,
    limit,
    offset,
  }: {
    search?: string;
    limit?: string;
    offset?: string;
  }): CancelablePromise<ProductsListResponse> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/pharmacy/products',
      query: {
        search: search,
        limit: limit,
        offset: offset,
      },
    });
  }
  /**
   * List active pharmacies available for prescription assignment
   * @returns PharmacyDirectoryResponse Active pharmacy directory
   * @throws ApiError
   */
  public static getApiPharmacyPharmacies(): CancelablePromise<PharmacyDirectoryResponse> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/pharmacy/pharmacies',
    });
  }
  /**
   * List the authenticated pharmacist's complete inventory
   * @returns ProductsListResponse Tenant-scoped inventory including inactive products
   * @throws ApiError
   */
  public static getApiPharmacyInventory({
    limit,
    offset,
  }: {
    limit?: number;
    offset?: number;
  }): CancelablePromise<ProductsListResponse> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/pharmacy/inventory',
      query: {
        limit: limit,
        offset: offset,
      },
      errors: {
        401: `Unauthorized`,
        403: `Pharmacist role required`,
      },
    });
  }
  /**
   * Get a product from the authenticated pharmacist's inventory
   * @returns ProductDetailResponse Inventory product
   * @throws ApiError
   */
  public static getApiPharmacyInventory1({
    id,
  }: {
    id: string;
  }): CancelablePromise<ProductDetailResponse> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/pharmacy/inventory/{id}',
      path: {
        id: id,
      },
      errors: {
        401: `Unauthorized`,
        403: `Product belongs to another pharmacy`,
        404: `Product not found`,
      },
    });
  }
  /**
   * List pharmacy orders
   * @returns OrdersListResponse Orders list
   * @throws ApiError
   */
  public static getApiPharmacyOrders(): CancelablePromise<OrdersListResponse> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/pharmacy/orders',
      errors: {
        401: `Unauthorized`,
      },
    });
  }
  /**
   * Create pharmacy order (server-calculated totals)
   * @returns CreateOrderResponse Order created
   * @throws ApiError
   */
  public static postApiPharmacyOrders({
    requestBody,
  }: {
    requestBody?: {
      items: Array<{
        productId: string;
        quantity: number;
      }>;
      prescriptionId?: string;
      deliveryType?: 'DELIVERY' | 'PICKUP';
      deliveryAddress?: any;
      notes?: string;
    };
  }): CancelablePromise<CreateOrderResponse> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/pharmacy/orders',
      body: requestBody,
      mediaType: 'application/json',
      errors: {
        400: `Validation error`,
        401: `Unauthorized`,
        409: `Insufficient stock`,
      },
    });
  }
  /**
   * Create a new prescription in DRAFT status
   * @returns GetPrescriptionResponse Prescription drafted successfully
   * @throws ApiError
   */
  public static postApiPrescriptions({
    requestBody,
  }: {
    requestBody?: CreatePrescriptionInput;
  }): CancelablePromise<GetPrescriptionResponse> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/prescriptions',
      body: requestBody,
      mediaType: 'application/json',
    });
  }
  /**
   * List patient/provider/pharmacist accessible prescriptions
   * @returns ListPrescriptionsResponse List retrieved successfully
   * @throws ApiError
   */
  public static getApiPrescriptions(): CancelablePromise<ListPrescriptionsResponse> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/prescriptions',
    });
  }
  /**
   * Get full prescription details including line items
   * @returns GetPrescriptionResponse Details retrieved successfully
   * @throws ApiError
   */
  public static getApiPrescriptions1({
    id,
  }: {
    id: string;
  }): CancelablePromise<GetPrescriptionResponse> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/prescriptions/{id}',
      path: {
        id: id,
      },
    });
  }
  /**
   * Digitally sign a DRAFT prescription with clinical license check and OTP
   * @returns GetPrescriptionResponse Prescription signed successfully
   * @throws ApiError
   */
  public static postApiPrescriptionsSign({
    id,
    requestBody,
  }: {
    id: string;
    requestBody?: SignPrescriptionInput;
  }): CancelablePromise<GetPrescriptionResponse> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/prescriptions/{id}/sign',
      path: {
        id: id,
      },
      body: requestBody,
      mediaType: 'application/json',
    });
  }
  /**
   * Assign a signed prescription to one active pharmacy
   * @returns GetPrescriptionResponse Prescription assigned
   * @throws ApiError
   */
  public static patchApiPrescriptionsSendToPharmacy({
    id,
    requestBody,
  }: {
    id: string;
    requestBody?: SendPrescriptionToPharmacyInput;
  }): CancelablePromise<GetPrescriptionResponse> {
    return __request(OpenAPI, {
      method: 'PATCH',
      url: '/api/prescriptions/{id}/send-to-pharmacy',
      path: {
        id: id,
      },
      body: requestBody,
      mediaType: 'application/json',
      errors: {
        400: `Prescription is not signed or is already assigned`,
        401: `Unauthorized`,
        403: `Only the owning patient may assign the prescription`,
        404: `Prescription or pharmacy not found`,
      },
    });
  }
  /**
   * Mark a prescription as dispensed by a pharmacist
   * @returns GetPrescriptionResponse Prescription marked as dispensed successfully
   * @throws ApiError
   */
  public static patchApiPrescriptionsDispense({
    id,
  }: {
    id: string;
  }): CancelablePromise<GetPrescriptionResponse> {
    return __request(OpenAPI, {
      method: 'PATCH',
      url: '/api/prescriptions/{id}/dispense',
      path: {
        id: id,
      },
    });
  }
  /**
   * Initialize a telemedicine video room
   * @returns TelemedicineRoom Telemedicine room created successfully
   * @throws ApiError
   */
  public static postApiTelemedicineRooms({
    requestBody,
  }: {
    requestBody?: CreateTelemedicineRoomInput;
  }): CancelablePromise<TelemedicineRoom> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/telemedicine/rooms',
      body: requestBody,
      mediaType: 'application/json',
    });
  }
  /**
   * Retrieve Twilio Video participant join token
   * @returns GetTokenResponse Join token issued successfully
   * @throws ApiError
   */
  public static postApiTelemedicineRoomsToken({
    id,
  }: {
    id: string;
  }): CancelablePromise<GetTokenResponse> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/telemedicine/rooms/{id}/token',
      path: {
        id: id,
      },
    });
  }
  /**
   * Confirm that an authenticated participant connected to the video room
   * @returns JoinRoomResponse Participant and room lifecycle updated
   * @throws ApiError
   */
  public static postApiTelemedicineRoomsJoin({
    id,
  }: {
    id: string;
  }): CancelablePromise<JoinRoomResponse> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/telemedicine/rooms/{id}/join',
      path: {
        id: id,
      },
      errors: {
        401: `Unauthorized`,
        403: `Not a participant, outside the join window, or room ended`,
        404: `Room not found`,
      },
    });
  }
  /**
   * Confirm that an authenticated participant connected to the video meeting
   * @returns JoinRoomResponse Participant and room lifecycle updated
   * @throws ApiError
   */
  public static postApiTelemedicineMeetingsJoin({
    id,
  }: {
    id: string;
  }): CancelablePromise<JoinRoomResponse> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/telemedicine/meetings/{id}/join',
      path: {
        id: id,
      },
      errors: {
        401: `Unauthorized`,
        403: `Not a participant, outside the join window, or room ended`,
        404: `Room not found`,
      },
    });
  }
  /**
   * End telemedicine consultation room sessions
   * @returns TelemedicineRoom Room session ended successfully
   * @throws ApiError
   */
  public static postApiTelemedicineRoomsEnd({
    id,
  }: {
    id: string;
  }): CancelablePromise<TelemedicineRoom> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/telemedicine/rooms/{id}/end',
      path: {
        id: id,
      },
    });
  }
  /**
   * Get current user profile
   * @returns GetUserResponse User profile retrieved successfully
   * @throws ApiError
   */
  public static getApiUsersMe(): CancelablePromise<GetUserResponse> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/users/me',
      errors: {
        401: `Unauthorized`,
      },
    });
  }
  /**
   * Update current user profile
   * @returns GetUserResponse User profile updated successfully
   * @throws ApiError
   */
  public static putApiUsersMe({
    requestBody,
  }: {
    requestBody?: UpdateProfileInput;
  }): CancelablePromise<GetUserResponse> {
    return __request(OpenAPI, {
      method: 'PUT',
      url: '/api/users/me',
      body: requestBody,
      mediaType: 'application/json',
      errors: {
        400: `Validation error`,
        401: `Unauthorized`,
      },
    });
  }
  /**
   * Get dashboard statistics for Hospital Admin portal
   * @returns HospitalDashboardResponse Hospital Admin dashboard analytics
   * @throws ApiError
   */
  public static getApiUsersDashboardHospital(): CancelablePromise<HospitalDashboardResponse> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/users/dashboard/hospital',
      errors: {
        401: `Unauthorized`,
        403: `Forbidden`,
      },
    });
  }
  /**
   * Search providers
   * @returns any Providers list
   * @throws ApiError
   */
  public static getApiUsersProviders({
    specialty,
    name,
    limit,
    offset,
  }: {
    specialty?: string;
    name?: string;
    limit?: string;
    offset?: string;
  }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/users/providers',
      query: {
        specialty: specialty,
        name: name,
        limit: limit,
        offset: offset,
      },
    });
  }
  /**
   * Get provider by ID
   * @returns any Provider details
   * @throws ApiError
   */
  public static getApiUsersProviders1({ id }: { id: string }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/users/providers/{id}',
      path: {
        id: id,
      },
      errors: {
        404: `Provider not found`,
      },
    });
  }
  /**
   * Get dashboard analytics and schedule for Consultant/Doctor portal
   * @returns ProviderDashboardResponse Provider dashboard analytics and schedule queue
   * @throws ApiError
   */
  public static getApiUsersDashboardProvider(): CancelablePromise<ProviderDashboardResponse> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/users/dashboard/provider',
      errors: {
        401: `Unauthorized`,
        403: `Forbidden`,
      },
    });
  }
  /**
   * Get current wallet
   * @returns WalletResponse Wallet retrieved successfully
   * @throws ApiError
   */
  public static getApiWalletsMe(): CancelablePromise<WalletResponse> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/wallets/me',
      errors: {
        401: `Unauthorized`,
      },
    });
  }
  /**
   * Create wallet virtual account
   * @returns any Virtual account created
   * @throws ApiError
   */
  public static postApiWalletsVirtualAccount(): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/wallets/virtual-account',
      errors: {
        401: `Unauthorized`,
      },
    });
  }
  /**
   * Initialize wallet top-up via provider-hosted checkout
   * @returns TopUpResponse Top-up initialized
   * @throws ApiError
   */
  public static postApiWalletsTopup({
    requestBody,
  }: {
    requestBody?: TopUpInput;
  }): CancelablePromise<TopUpResponse> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/wallets/topup',
      body: requestBody,
      mediaType: 'application/json',
      errors: {
        400: `Validation error`,
        401: `Unauthorized`,
      },
    });
  }
  /**
   * List wallet transactions
   * @returns any Wallet transactions
   * @throws ApiError
   */
  public static getApiWalletsTransactions({
    limit,
    offset,
  }: {
    limit?: string;
    offset?: string;
  }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/wallets/transactions',
      query: {
        limit: limit,
        offset: offset,
      },
      errors: {
        401: `Unauthorized`,
      },
    });
  }
}
