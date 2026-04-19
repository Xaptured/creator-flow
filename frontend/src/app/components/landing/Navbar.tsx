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



  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 bg-th-nav-bg backdrop-saturate-[1.8] backdrop-blur-[20px] transition-[border-color,background-color] duration-300 border-b ${scrolled ? 'border-th-border' : 'border-transparent'}`}>
      <div className="max-w-[980px] mx-auto px-5 h-12 flex items-center justify-between gap-4">
        {/* Logo */}
        <a href="#" className="flex items-center gap-2 no-underline shrink-0">
          <span className="inline-flex items-center justify-center w-7 h-7 bg-th-accent-blue rounded-lg text-base">
            ⚡
          </span>
          <span className="font-display font-semibold text-lg tracking-[-0.3px] text-th-text-primary transition-colors duration-300">
            CreatorFlow
          </span>
        </a>

        {/* Desktop Nav Links */}
        <div className="hidden md:flex items-center gap-8 flex-1 justify-center">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="font-text text-xs font-normal text-th-text-body no-underline tracking-[-0.12px] transition-colors duration-200 whitespace-nowrap"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Right cluster */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            className={`flex items-center justify-center w-8 h-8 rounded-full border-none cursor-pointer text-[15px] transition-colors duration-200 shrink-0 ${dark ? 'bg-[rgba(255,255,255,0.08)]' : 'bg-[rgba(0,0,0,0.06)]'}`}
          >
            {dark ? '☀️' : '🌙'}
          </button>

          {/* Sign In — desktop only, primary CTA pill */}
          <form action={signInWithKeycloak} className="hidden md:block">
            <button
              type="submit"
              className="py-[6px] px-4 rounded-[980px] bg-th-accent-blue text-white font-text text-[13px] font-normal border-none cursor-pointer whitespace-nowrap transition-colors duration-200 hover:bg-th-accent-blue-hover"
            >
              Sign In
            </button>
          </form>

          {/* Hamburger — mobile ONLY */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
            className="md:hidden bg-transparent border-none cursor-pointer p-1 shrink-0"
          >
            <div className="flex flex-col gap-[5px]">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="block w-5 h-[1.5px] bg-th-text-primary transition-all duration-300"
                  style={{
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
          className={`md:hidden border-t border-th-border p-5 flex flex-col gap-4 ${dark ? 'bg-[rgba(0,0,0,0.97)]' : 'bg-[rgba(245,245,247,0.97)]'}`}
        >
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="font-text text-[17px] text-th-text-primary no-underline py-2 border-b border-th-border"
            >
              {link.label}
            </a>
          ))}

          {/* Mobile: Sign In — primary CTA */}
          <form action={signInWithKeycloak}>
            <button
              type="submit"
              className="w-full flex items-center justify-center py-2.5 px-5 rounded-[980px] bg-th-accent-blue text-white font-text text-[17px] border-none cursor-pointer hover:bg-th-accent-blue-hover transition-colors duration-200"
            >
              Sign In
            </button>
          </form>
        </div>
      )}
    </nav>
  );
}
