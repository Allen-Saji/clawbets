export default function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Background circle with gradient */}
      <defs>
        <linearGradient id="logo-grad" x1="0" y1="0" x2="64" y2="64">
          <stop offset="0%" stopColor="#06b6d4" />
          <stop offset="50%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#ec4899" />
        </linearGradient>
        <linearGradient id="claw-grad" x1="16" y1="12" x2="48" y2="52">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#e0e7ff" />
        </linearGradient>
      </defs>
      <rect rx="16" width="64" height="64" fill="url(#logo-grad)" />
      {/* Claw mark - three diagonal slashes */}
      <path
        d="M18 14 C18 14, 22 28, 20 42 C19 48, 22 52, 26 50"
        stroke="url(#claw-grad)"
        strokeWidth="4.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M30 12 C30 12, 33 28, 32 44 C31 50, 34 54, 38 50"
        stroke="url(#claw-grad)"
        strokeWidth="4.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M42 14 C42 14, 44 28, 44 42 C44 48, 46 52, 50 48"
        stroke="url(#claw-grad)"
        strokeWidth="4.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Small diamond/bet symbol */}
      <path
        d="M50 18 L54 24 L50 30 L46 24 Z"
        fill="#fbbf24"
        opacity="0.9"
      />
    </svg>
  );
}
