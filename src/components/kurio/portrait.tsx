export function NftArt({ src, alt, className = '' }: { src: string; alt: string; className?: string }) {
  return <img src={src} alt={alt} className={`object-cover ${className}`} />
}

export function Portrait({
  hue,
  accent,
  label,
  className = '',
}: {
  hue: string
  accent: string
  label: string
  className?: string
}) {
  return (
    <svg viewBox="0 0 160 160" role="img" aria-label={label} className={className}>
      <rect width="160" height="160" fill={hue} />
      <circle cx="80" cy="78" r="46" fill="#c9a27a" />
      <ellipse cx="80" cy="128" rx="42" ry="28" fill={accent} />
      <circle cx="64" cy="74" r="5" fill="#140d0a" />
      <circle cx="96" cy="74" r="5" fill="#140d0a" />
      <path d="M68 92c8 8 16 8 24 0" fill="none" stroke="#140d0a" strokeWidth="3" strokeLinecap="round" />
      <path d="M48 70c10-16 22-16 32-4" fill="none" stroke="#f5f1eb" strokeWidth="6" strokeLinecap="round" />
      <path d="M80 66c10-12 24-10 32 2" fill="none" stroke="#f5f1eb" strokeWidth="6" strokeLinecap="round" />
    </svg>
  )
}
