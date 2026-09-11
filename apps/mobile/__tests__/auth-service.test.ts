import { AuthService, UnsupportedMobileRoleError } from '@/features/auth/auth-service';
import type { ApiClient } from '@/lib/api/client';
import type { TokenStorageContract } from '@/lib/auth/token-storage';

function createDependencies() {
  return {
    api: {
      post: jest.fn(),
      get: jest.fn(),
    } as unknown as ApiClient,
    storage: {
      getTokens: jest.fn(),
      setTokens: jest.fn(),
      clearTokens: jest.fn(),
    } as jest.Mocked<TokenStorageContract>,
  };
}

describe('AuthService', () => {
  it('persists a patient token pair after password login', async () => {
    const dependencies = createDependencies();
    (dependencies.api.post as jest.Mock).mockResolvedValue({
      token: 'access.jwt',
      refreshToken: 'refresh.jwt',
      user: { id: 'patient-1', email: 'patient@example.com', role: 'PATIENT', status: 'ACTIVE' },
    });
    const service = new AuthService(dependencies.api, dependencies.storage);

    await expect(
      service.signIn({ email: 'patient@example.com', password: 'correct-password' })
    ).resolves.toMatchObject({
      kind: 'authenticated',
      user: { id: 'patient-1' },
    });
    expect(dependencies.storage.setTokens).toHaveBeenCalledWith({
      accessToken: 'access.jwt',
      refreshToken: 'refresh.jwt',
    });
  });

  it('returns a two-factor challenge without persisting an incomplete session', async () => {
    const dependencies = createDependencies();
    (dependencies.api.post as jest.Mock).mockResolvedValue({
      requires2FA: true,
      email: 'patient@example.com',
    });
    const service = new AuthService(dependencies.api, dependencies.storage);

    await expect(
      service.signIn({ email: 'patient@example.com', password: 'correct-password' })
    ).resolves.toEqual({
      kind: 'two-factor-required',
      email: 'patient@example.com',
    });
    expect(dependencies.storage.setTokens).not.toHaveBeenCalled();
  });

  it('rejects professional accounts because the first mobile release is patient-only', async () => {
    const dependencies = createDependencies();
    (dependencies.api.post as jest.Mock).mockResolvedValue({
      token: 'access.jwt',
      refreshToken: 'refresh.jwt',
      user: { id: 'doctor-1', email: 'doctor@example.com', role: 'CONSULTANT', status: 'ACTIVE' },
    });
    const service = new AuthService(dependencies.api, dependencies.storage);

    await expect(
      service.signIn({ email: 'doctor@example.com', password: 'correct-password' })
    ).rejects.toBeInstanceOf(UnsupportedMobileRoleError);
    expect(dependencies.storage.clearTokens).toHaveBeenCalledTimes(1);
  });

  it('restores only a server-validated patient session', async () => {
    const dependencies = createDependencies();
    dependencies.storage.getTokens.mockResolvedValue({
      accessToken: 'access.jwt',
      refreshToken: 'refresh.jwt',
    });
    (dependencies.api.get as jest.Mock).mockResolvedValue({
      id: 'patient-1',
      email: 'patient@example.com',
      role: 'PATIENT',
      status: 'ACTIVE',
      firstName: 'Amara',
    });
    const service = new AuthService(dependencies.api, dependencies.storage);

    await expect(service.restoreSession()).resolves.toMatchObject({
      id: 'patient-1',
      firstName: 'Amara',
    });
    expect(dependencies.api.get).toHaveBeenCalledWith('/users/me');
  });
});
