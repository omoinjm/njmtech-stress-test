/** The NJM Tech Security mark. Keep in sync with app/icon.svg (the favicon source). */
export function LogoMark({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="14" fill="#059669" />
      <path d="M32 19 45 32 32 45 19 32Z" fill="#fff" />
    </svg>
  );
}
