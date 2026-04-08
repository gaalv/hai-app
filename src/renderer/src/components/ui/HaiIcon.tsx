/**
 * Ícone do hai — folha/pena terracota com raque e nervuras.
 * Reproduz o ícone oficial do app em SVG vetorial.
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
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Background */}
      <rect width="100" height="100" rx="22" fill="#100400" />

      {/* Leaf body — right/bright half */}
      <path
        d="M55,9 C74,18 80,42 76,62 C73,76 64,85 50,91 C38,84 30,72 29,55 C27,34 37,14 55,9 Z"
        fill="#B84C0C"
      />

      {/* Leaf body — left/dark half (spine divides) */}
      <path
        d="M55,9 C62,17 66,38 64,58 C62,71 57,82 50,91 C42,82 33,70 31,54 C30,37 39,15 55,9 Z"
        fill="#923A08"
      />

      {/* Right edge highlight */}
      <path
        d="M57,10 C74,20 79,44 74,64 C71,76 63,85 52,90"
        fill="none"
        stroke="#D46820"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.55"
      />

      {/* Central spine / rachis */}
      <line x1="55" y1="9" x2="48" y2="86" stroke="#280800" strokeWidth="1.8" strokeLinecap="round" />

      {/* Veins — right side */}
      <line x1="53" y1="22" x2="66" y2="26" stroke="#7A3008" strokeWidth="1.1" strokeLinecap="round" />
      <line x1="54" y1="32" x2="70" y2="36" stroke="#7A3008" strokeWidth="1.1" strokeLinecap="round" />
      <line x1="54" y1="42" x2="73" y2="46" stroke="#7A3008" strokeWidth="1.1" strokeLinecap="round" />
      <line x1="53" y1="52" x2="71" y2="55" stroke="#7A3008" strokeWidth="1.1" strokeLinecap="round" />
      <line x1="52" y1="62" x2="65" y2="65" stroke="#7A3008" strokeWidth="1.1" strokeLinecap="round" />
      <line x1="51" y1="71" x2="58" y2="73" stroke="#7A3008" strokeWidth="1" strokeLinecap="round" />

      {/* Veins — left side (shorter) */}
      <line x1="52" y1="22" x2="42" y2="26" stroke="#6A2C06" strokeWidth="1" strokeLinecap="round" />
      <line x1="53" y1="32" x2="40" y2="36" stroke="#6A2C06" strokeWidth="1" strokeLinecap="round" />
      <line x1="53" y1="42" x2="38" y2="46" stroke="#6A2C06" strokeWidth="1" strokeLinecap="round" />
      <line x1="52" y1="52" x2="40" y2="55" stroke="#6A2C06" strokeWidth="1" strokeLinecap="round" />
      <line x1="51" y1="62" x2="42" y2="65" stroke="#6A2C06" strokeWidth="1" strokeLinecap="round" />

      {/* Nib — golden square (rotated 45°) */}
      <rect
        x="44.5"
        y="83.5"
        width="7"
        height="7"
        rx="1"
        transform="rotate(45, 48, 87)"
        fill="#C8A020"
      />

      {/* Nib stem */}
      <line x1="48" y1="91" x2="47" y2="95" stroke="#C8A020" strokeWidth="2" strokeLinecap="round" />

      {/* Ink drop */}
      <circle cx="46.5" cy="96.5" r="2.2" fill="#E0C840" />
    </svg>
  )
}
