export function BarberScissorsMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      {/* Left ring */}
      <circle cx="22" cy="18" r="9" stroke="currentColor" strokeWidth="3" />
      {/* Right ring */}
      <circle cx="58" cy="18" r="9" stroke="currentColor" strokeWidth="3" />
      {/* Crossed blades */}
      <path
        d="M28 24 52 56"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M52 24 28 56"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* Pivot */}
      <circle cx="40" cy="40" r="4" fill="currentColor" />
      {/* Blade tips */}
      <path
        d="M28 56 22 68"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M52 56 58 68"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
