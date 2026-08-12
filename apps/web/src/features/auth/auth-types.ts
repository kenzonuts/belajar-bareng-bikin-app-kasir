export type AuthStatus = 'AUTH_LOADING' | 'AUTHENTICATED' | 'UNAUTHENTICATED';

export type AuthProfile = {
  id: string;
  name: string;
  email: string;
};

export function mapAuthError(error: { message?: string; code?: string } | null | undefined): string {
  if (!error?.message) {
    return 'Terjadi kesalahan autentikasi. Coba lagi.';
  }

  const message = error.message.toLowerCase();
  const code = error.code?.toLowerCase() ?? '';

  if (message.includes('invalid login credentials') || code.includes('invalid_credentials')) {
    return 'Email atau password salah.';
  }

  if (
    message.includes('user already registered') ||
    message.includes('already been registered') ||
    code.includes('user_already_exists')
  ) {
    return 'Email sudah terdaftar. Silakan masuk.';
  }

  if (message.includes('password should be') || message.includes('weak')) {
    return 'Password terlalu lemah. Gunakan minimal 6 karakter.';
  }

  if (message.includes('invalid email') || message.includes('unable to validate email')) {
    return 'Format email tidak valid.';
  }

  if (message.includes('network') || message.includes('fetch')) {
    return 'Gagal terhubung ke server. Periksa koneksi internet Anda.';
  }

  if (message.includes('session') && message.includes('expired')) {
    return 'Sesi berakhir. Silakan masuk kembali.';
  }

  return 'Terjadi kesalahan autentikasi. Coba lagi.';
}
