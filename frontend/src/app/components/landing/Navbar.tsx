'use client';

import { useState, useEffect } from 'react';
import { useDark } from '../../context/ThemeContext';
import { signInWithKeycloak } from '../../actions/auth';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { dark, toggleTheme } = useDark();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navLinks = [
    { label: 'Features', href: '#features' },
    { label: 'How It Works', href: '#social-proof' },
    { label: 'Pricing', href: '#waitlist' },
  ];

  const textColor = 'var(--th-text-body)';
  const logoColor = 'var(--th-text-primary)';
  const borderColor = scrolled ? 'var(--th-border)' : 'transparent';

  return (
    <nav
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        background: 'var(--th-nav-bg)',
        backdropFilter: 'saturate(180%) blur(20px)',
        WebkitBackdropFilter: 'saturate(180%) blur(20px)',
        borderBottom: `1px solid ${borderColor}`,
        transition: 'border-color 0.3s, background 0.3s',
      }}
    >
      <div
        style={{
          maxWidth: '980px',
          margin: '0 auto',
          padding: '0 20px',
          height: '48px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
        }}
      >
        {/* Logo */}
        <a href="#" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', flexShrink: 0 }}>
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
              fontSize: '18px',
              letterSpacing: '-0.3px',
              color: logoColor,
              transition: 'color 0.3s',
            }}
          >
            CreatorFlow
          </span>
        </a>

        {/* Desktop Nav Links */}
        <div
          className="hidden md:flex"
          style={{
            alignItems: 'center',
            gap: '32px',
            flex: 1,
            justifyContent: 'center',
          }}
        >
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              style={{
                fontFamily: 'var(--cf-font-text)',
                fontSize: '12px',
                fontWeight: 400,
                color: textColor,
                textDecoration: 'none',
                letterSpacing: '-0.12px',
                transition: 'color 0.2s',
                whiteSpace: 'nowrap',
              }}
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Right cluster */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
              border: 'none',
              cursor: 'pointer',
              fontSize: '15px',
              transition: 'background 0.2s',
              flexShrink: 0,
            }}
          >
            {dark ? '☀️' : '🌙'}
          </button>

          {/* Sign In — desktop only, primary CTA pill */}
          <form action={signInWithKeycloak} className="hidden md:block">
            <button
              type="submit"
              style={{
                padding: '6px 16px',
                borderRadius: '980px',
                background: '#0071e3',
                color: '#ffffff',
                fontFamily: 'var(--cf-font-text)',
                fontSize: '13px',
                fontWeight: 400,
                border: 'none',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = '#0077ed')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = '#0071e3')}
            >
              Sign In
            </button>
          </form>

          {/* Hamburger — mobile ONLY */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
            className="md:hidden"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  style={{
                    display: 'block',
                    width: '20px',
                    height: '1.5px',
                    background: 'var(--th-text-primary)',
                    transition: 'transform 0.3s, opacity 0.3s',
                    transform:
                      i === 0 && menuOpen ? 'rotate(45deg) translate(4.5px, 4.5px)'
                      : i === 2 && menuOpen ? 'rotate(-45deg) translate(4.5px, -4.5px)'
                      : 'none',
                    opacity: i === 1 && menuOpen ? 0 : 1,
                  }}
                />
              ))}
            </div>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div
          className="md:hidden"
          style={{
            background: dark ? 'rgba(0,0,0,0.97)' : 'rgba(245,245,247,0.97)',
            borderTop: '1px solid var(--th-border)',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              style={{
                fontFamily: 'var(--cf-font-text)',
                fontSize: '17px',
                color: 'var(--th-text-primary)',
                textDecoration: 'none',
                padding: '8px 0',
                borderBottom: '1px solid var(--th-border)',
              }}
            >
              {link.label}
            </a>
          ))}

          {/* Mobile: Sign In — primary CTA */}
          <form action={signInWithKeycloak}>
            <button
              type="submit"
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '10px 20px',
                borderRadius: '980px',
                background: '#0071e3',
                color: '#ffffff',
                fontFamily: 'var(--cf-font-text)',
                fontSize: '17px',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Sign In
            </button>
          </form>
        </div>
      )}
    </nav>
  );
}
