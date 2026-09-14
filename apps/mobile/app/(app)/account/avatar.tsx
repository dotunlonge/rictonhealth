import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { PatientHeader } from '@/components/PatientHeader';
import { PrimaryButton, Screen, StateNotice } from '@/components/ui';
import { accountService } from '@/features/account/account-service';
import { colors, radii, spacing, typography } from '@/theme/tokens';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export default function AvatarScreen() {
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pick = async () => {
    setError(null);
    setBlocked(false);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setBlocked(true);
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    const mimeType = asset.mimeType ?? 'image/jpeg';
    if (!ALLOWED_TYPES.includes(mimeType)) {
      setError('Choose a JPEG, PNG or WebP photo.');
      return;
    }
    setUploading(true);
    try {
      const { uploadUrl, publicUrl } = await accountService.requestAvatarUpload(mimeType);
      const binary = await (await fetch(asset.uri)).blob();
      const uploaded = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': mimeType },
        body: binary,
      });
      if (!uploaded.ok) throw new Error('Photo upload failed. Try again.');
      await accountService.updateProfile({ avatarUrl: publicUrl });
      setPreview(asset.uri);
      setDone(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Photo could not be uploaded.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Screen testID="account.avatar.screen" style={styles.content}>
      <PatientHeader
        eyebrow="PHOTO"
        title="Profile photo"
        subtitle="Square crop, stored securely."
      />
      {preview ? (
        <Image source={{ uri: preview }} style={styles.preview} testID="account.avatar-preview" />
      ) : null}
      {blocked ? (
        <View testID="account.avatar-blocked">
          <StateNotice
            title="Photo access needed"
            message="Allow photo access in system settings to choose a picture."
          />
        </View>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <PrimaryButton
        label="Choose photo"
        loading={uploading}
        onPress={() => void pick()}
        testID="account.avatar-pick"
      />
      {done ? (
        <View testID="account.avatar-done">
          <StateNotice title="Photo updated" message="Your new profile photo is live." />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing[5] },
  preview: { width: 120, height: 120, borderRadius: 60, alignSelf: 'center' },
  error: { ...typography.caption, color: colors.rose700 },
});
