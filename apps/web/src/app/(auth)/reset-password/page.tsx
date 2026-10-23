'use client';

/**
 * Direct Reset Password route — re-exports ForgotPasswordPage so that
 * navigation or links to `/reset-password` (e.g. from password recovery emails
 * or bookmarks) work seamlessly with zero 404s.
 */
export { default } from '../forgot-password/page';
