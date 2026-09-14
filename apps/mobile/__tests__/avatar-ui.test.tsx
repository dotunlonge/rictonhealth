/** Avatar upload TDD RED: pick → presigned PUT → profile save (mocked picker/fetch). */
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

jest.mock('expo-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn() }),
  useLocalSearchParams: () => ({}),
}));

jest.mock('@/features/account/account-service', () => ({
  accountService: { requestAvatarUpload: jest.fn(), updateProfile: jest.fn() },
}));

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  MediaTypeOptions: { Images: 'Images' },
}));

import * as ImagePicker from 'expo-image-picker';
import { accountService } from '@/features/account/account-service';
import AvatarScreen from '../app/(app)/account/avatar';

const acct = accountService as unknown as Record<string, jest.Mock>;
const mockFetch = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  (global as Record<string, unknown>).fetch = mockFetch;
});

describe('avatar upload', () => {
  it('uploads via presigned URL then saves the public URL', async () => {
    (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({
      granted: true,
    });
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///photo.jpg', mimeType: 'image/jpeg' }],
    });
    acct.requestAvatarUpload.mockResolvedValue({
      uploadUrl: 'https://s3.example/upload',
      publicUrl: 'https://cdn.example/avatar.jpg',
    });
    mockFetch.mockResolvedValue({ ok: true, blob: jest.fn().mockResolvedValue({}) });
    acct.updateProfile.mockResolvedValue({ ok: true });

    await render(<AvatarScreen />);
    await fireEvent.press(screen.getByTestId('account.avatar-pick'));
    await waitFor(() => expect(acct.requestAvatarUpload).toHaveBeenCalledWith('image/jpeg'));
    await waitFor(() =>
      expect(mockFetch).toHaveBeenCalledWith(
        'https://s3.example/upload',
        expect.objectContaining({ method: 'PUT' })
      )
    );
    await waitFor(() =>
      expect(acct.updateProfile).toHaveBeenCalledWith(
        expect.objectContaining({ avatarUrl: 'https://cdn.example/avatar.jpg' })
      )
    );
    expect(await screen.findByTestId('account.avatar-done')).toBeTruthy();
  });

  it('explains denied library permission instead of uploading', async () => {
    (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({
      granted: false,
    });
    await render(<AvatarScreen />);
    await fireEvent.press(screen.getByTestId('account.avatar-pick'));
    expect(await screen.findByTestId('account.avatar-blocked')).toBeTruthy();
    expect(acct.requestAvatarUpload).not.toHaveBeenCalled();
  });
});
