"use client";

interface AuthButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  variant?: "primary" | "secondary" | "ghost";
  children: React.ReactNode;
}

export function AuthButton({
  loading,
  variant = "primary",
  children,
  className,
  disabled,
  ...props
}: AuthButtonProps) {
  const baseStyles = `
    w-full px-4 py-3 rounded-xl font-semibold
    transition-all duration-200
    disabled:opacity-50 disabled:cursor-not-allowed
    flex items-center justify-center gap-2
  `;

  const variants = {
    primary: `
      bg-gradient-to-r from-blue-600 to-blue-500
      hover:from-blue-500 hover:to-blue-400
      text-white shadow-lg shadow-blue-500/25
      hover:shadow-blue-500/40
    `,
    secondary: `
      bg-zinc-800 hover:bg-zinc-700
      text-zinc-100 border border-zinc-700
    `,
    ghost: `
      bg-transparent hover:bg-zinc-800/50
      text-zinc-400 hover:text-zinc-100
    `,
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${className || ""}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <>
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>Please wait...</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}

