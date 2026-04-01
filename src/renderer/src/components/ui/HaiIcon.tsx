/**
 * Hai app icon — stylised lowercase "h" with a pen-stroke flourish.
 * Renders as an SVG so it works at any size (Rail badge, Login hero, etc.).
 */
export function HaiIcon({
  size = 28,
  className,
}: {
  size?: number
  className?: string
}): JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
    >
      {/* Rounded square background */}
      <rect width="32" height="32" rx="8" fill="var(--app-accent)" />

      {/* Stylised "h" with trailing stroke */}
      <path
        d="M11 8.5v15"
        stroke="#fff"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
      <path
        d="M11 16.2c0-3.8 2.2-5 4.2-5 2.2 0 3.6 1.6 3.6 4.4v5.2c0 1 .6 1.6 1.4 1.1"
        stroke="#fff"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Accent dot — like an ink drop */}
      <circle cx="22.5" cy="9" r="1.8" fill="#fff" opacity="0.55" />
    </svg>
  )
}
