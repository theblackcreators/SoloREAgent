import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import { Provider } from "@supabase/supabase-js";

export type AuthError = {
  message: string;
  code?: string;
};

export type AuthResult<T = void> = {
  data?: T;
  error?: AuthError;
};

/**
 * Sign in with email and password
 */
export async function signInWithEmail(
  email: string,
  password: string
): Promise<AuthResult> {
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: { message: error.message, code: error.code } };
  }

  return {};
}

/**
 * Sign up with email and password
 */
export async function signUpWithEmail(
  email: string,
  password: string,
  metadata?: { displayName?: string }
): Promise<AuthResult> {
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata,
      emailRedirectTo: `${getBaseUrl()}/auth/callback`,
    },
  });

  if (error) {
    return { error: { message: error.message, code: error.code } };
  }

  return {};
}

/**
 * Sign in with OAuth provider (Google, GitHub, etc.)
 */
export async function signInWithOAuth(provider: Provider): Promise<AuthResult> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${getBaseUrl()}/auth/callback`,
    },
  });

  if (error) {
    return { error: { message: error.message, code: error.code } };
  }

  return {};
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<AuthResult> {
  const { error } = await supabase.auth.signOut();

  if (error) {
    return { error: { message: error.message, code: error.code } };
  }

  return {};
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  email: string
): Promise<AuthResult> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${getBaseUrl()}/reset-password`,
  });

  if (error) {
    return { error: { message: error.message, code: error.code } };
  }

  return {};
}

/**
 * Update password (after reset)
 */
export async function updatePassword(newPassword: string): Promise<AuthResult> {
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    return { error: { message: error.message, code: error.code } };
  }

  return {};
}

/**
 * Get current user
 * Returns null if Supabase is not configured or if there's an error
 */
export async function getCurrentUser() {
  // Return null early if Supabase is not configured
  if (!isSupabaseConfigured) {
    console.warn("Supabase not configured - returning null user");
    return null;
  }

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      console.warn("Error getting current user:", error.message);
      return null;
    }

    return user;
  } catch (err) {
    console.warn("Exception getting current user:", err);
    return null;
  }
}

/**
 * Get current session
 */
export async function getSession() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
}

/**
 * Get base URL for redirects
 */
function getBaseUrl(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  // Server-side fallback
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

/**
 * Subscribe to auth state changes
 */
export function onAuthStateChange(
  callback: (event: string, session: any) => void
) {
  return supabase.auth.onAuthStateChange(callback);
}

