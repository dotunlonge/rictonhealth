import { GATEWAY_PATHS } from '@ricton/api-contract';
import { apiClient, ApiClient } from '@/lib/api/client';

function rel(c: string): string {
  return c.replace(/^\/api/, '');
}

export class AccountService {
  constructor(private readonly api: ApiClient = apiClient) {}
  updateProfile(patch: Record<string, unknown>): Promise<unknown> {
    return this.api.put(rel(GATEWAY_PATHS.usersMe), patch);
  }
  createAddress(input: Record<string, unknown>): Promise<unknown> {
    return this.api.post(rel(GATEWAY_PATHS.addresses), input);
  }
  listAddresses(): Promise<unknown> {
    return this.api.get(rel(GATEWAY_PATHS.addresses));
  }
  deleteAddress(id: string): Promise<unknown> {
    return this.api.delete(`${rel(GATEWAY_PATHS.addresses)}/${id}`);
  }
  setDefaultAddress(id: string): Promise<unknown> {
    return this.api.patch(`${rel(GATEWAY_PATHS.addresses)}/${id}/set-default`, {});
  }
  updateMedicalHistory(medicalHistory: unknown[]): Promise<unknown> {
    return this.api.put(`${rel(GATEWAY_PATHS.usersMe)}/medical-history`, { medicalHistory });
  }
  /** Presigned-upload flow: URL from backend → binary PUT to storage → save public URL. */
  async requestAvatarUpload(fileType: string): Promise<{ uploadUrl: string; publicUrl: string }> {
    const result = (await this.api.put(`${rel(GATEWAY_PATHS.usersMe)}/avatar`, { fileType })) as {
      uploadUrl: string;
      publicUrl: string;
    };
    if (!result.uploadUrl || !result.publicUrl) {
      throw new Error('Avatar upload is unavailable. Try again later.');
    }
    return result;
  }
  twoFactorStatus(): Promise<{ twoFactorEnabled: boolean }> {
    return this.api.get(rel(GATEWAY_PATHS.auth2faStatus));
  }
  twoFactorSetup(): Promise<{ secret?: string; qrCodeUrl?: string }> {
    return this.api.post(rel(GATEWAY_PATHS.auth2faEnable), {});
  }
  twoFactorVerify(code: string): Promise<unknown> {
    return this.api.post(rel(GATEWAY_PATHS.auth2faVerify), { code });
  }
  twoFactorDisable(code: string): Promise<unknown> {
    return this.api.post(rel(GATEWAY_PATHS.auth2faDisable), { code });
  }
  changePassword(input: { currentPassword: string; newPassword: string }): Promise<unknown> {
    return this.api.post(rel(GATEWAY_PATHS.authPasswordChange), input);
  }
}
export const accountService = new AccountService();
