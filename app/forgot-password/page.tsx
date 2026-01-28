"use client";

import { useState } from "react";
import Link from "next/link";
import { AuthLayout, AuthInput, AuthButton } from "@/components/auth";
import { sendPasswordResetEmail } from "@/lib/auth";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!email.trim()) {
      setError("Please enter your email address");
      setLoading(false);
      return;
    }

    const result = await sendPasswordResetEmail(email);

    if (result.error) {
      setError(result.error.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
  }

  if (success) {
    return (
      <AuthLayout title="Check your email" subtitle="We've sent you a password reset link">
        <div className="text-center space-y-6">
          <div className="w-16 h-16 mx-auto bg-blue-500/10 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="space-y-2">
            <p className="text-zinc-300">
              If an account exists for:
            </p>
            <p className="text-blue-400 font-medium">{email}</p>
          </div>
          <p className="text-sm text-zinc-500">
            You'll receive an email with a link to reset your password. The link will expire in 1 hour.
          </p>
          <div className="pt-4 space-y-3">
            <button
              onClick={() => {
                setSuccess(false);
                setEmail("");
              }}
              className="text-zinc-400 hover:text-zinc-300 text-sm transition-colors"
            >
              Didn't receive the email? Try again
            </button>
            <div>
              <Link href="/login" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
                ← Back to login
              </Link>
            </div>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Reset your password" subtitle="Enter your email and we'll send you a reset link">
      {/* Error message */}
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
          <p className="text-sm text-red-400 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthInput
          label="Email"
          type="email"
          placeholder="agent@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          autoComplete="email"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          }
        />

        <AuthButton type="submit" loading={loading}>
          Send Reset Link
        </AuthButton>
      </form>

      {/* Back to login */}
      <p className="mt-6 text-center text-sm text-zinc-400">
        Remember your password?{" "}
        <Link href="/login" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}

