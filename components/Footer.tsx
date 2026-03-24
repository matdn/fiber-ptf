'use client'

const LINKS = [
  {
    label: 'linkedin',
    href: 'https://www.linkedin.com/in/matis-dene/',
  },
  {
    label: 'github',
    href: 'https://github.com/matdn',
  },
  {
    label: 'mail',
    href: 'mailto:matisdene44@gmail.com',
  },
]

export default function Footer({ dark = false }: { dark?: boolean }) {
  const baseClass = dark ? 'text-white/30 hover:text-white/80' : 'text-white/30 hover:text-white/80'
  const sepStyle = { color: dark ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.15)' }
  return (
    <footer
      className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 pointer-events-none flex items-center gap-6"
      style={{ fontFamily: 'Neopixel, sans-serif' }}
    >
      {LINKS.map((link, i) => (
        <a
          key={link.label}
          href={link.href}
          target={link.href.startsWith('mailto') ? undefined : '_blank'}
          rel="noopener noreferrer"
          className={`pointer-events-auto transition-colors duration-300 tracking-[0.2em] uppercase ${baseClass}`}
          style={{ fontSize: '9px', fontWeight: 300 }}
        >
          {link.label}
          {i < LINKS.length - 1 && (
            <span className="ml-6 pointer-events-none select-none" style={sepStyle}>·</span>
          )}
        </a>
      ))}
    </footer>
  )
}
