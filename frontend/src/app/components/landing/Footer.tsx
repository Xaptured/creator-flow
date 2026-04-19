'use client';

function TwitterXIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.259 5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}

const footerLinks = [
  {
    label: 'Twitter/X',
    href: 'https://twitter.com/creatorflow',
    icon: <TwitterXIcon />,
    external: true,
  },
  {
    label: 'GitHub',
    href: 'https://github.com/creatorflow',
    icon: <GitHubIcon />,
    external: true,
  },
];

const legalLinks = [
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Terms of Service', href: '/terms' },
];

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      style={{
        background: 'var(--th-bg-primary)',
        borderTop: '1px solid var(--th-border)',
        padding: '48px 20px 32px',
      }}
    >
      <div style={{ maxWidth: '980px', margin: '0 auto' }}>
        {/* Top row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '24px',
            marginBottom: '40px',
            paddingBottom: '32px',
            borderBottom: '1px solid var(--th-border-card)',
          }}
        >
          {/* Logo */}
          <a
            href="#"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              textDecoration: 'none',
            }}
          >
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '28px',
                height: '28px',
                background: '#0071e3',
                borderRadius: '8px',
                fontSize: '16px',
              }}
            >
              ⚡
            </span>
            <span
              style={{
                fontFamily: 'var(--cf-font-display)',
                fontWeight: 600,
                fontSize: '17px',
                letterSpacing: '-0.3px',
                color: 'var(--th-text-primary)',
              }}
            >
              CreatorFlow
            </span>
          </a>

          {/* Social links */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {footerLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                target={link.external ? '_blank' : undefined}
                rel={link.external ? 'noopener noreferrer' : undefined}
                aria-label={link.label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'var(--th-border)',
                  color: 'var(--th-text-body)',
                  textDecoration: 'none',
                  transition: 'background 0.2s, color 0.2s',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(0,113,227,0.12)';
                  (e.currentTarget as HTMLAnchorElement).style.color = '#0071e3';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.background = 'var(--th-border)';
                  (e.currentTarget as HTMLAnchorElement).style.color = 'var(--th-text-body)';
                }}
              >
                {link.icon}
              </a>
            ))}
          </div>
        </div>

        {/* Bottom row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <p
            style={{
              fontFamily: 'var(--cf-font-text)',
              fontSize: '12px',
              color: 'var(--th-section-label)',
              letterSpacing: '-0.12px',
            }}
          >
            © {currentYear} CreatorFlow. All rights reserved.
          </p>

          <div style={{ display: 'flex', gap: '24px' }}>
            {legalLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                style={{
                  fontFamily: 'var(--cf-font-text)',
                  fontSize: '12px',
                  color: 'var(--th-section-label)',
                  textDecoration: 'none',
                  letterSpacing: '-0.12px',
                  transition: 'color 0.2s',
                }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = 'var(--th-text-primary)')}
                onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = 'var(--th-section-label)')}
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
