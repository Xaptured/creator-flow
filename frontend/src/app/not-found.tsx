import Link from 'next/link';

export default function NotFound() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        padding: '24px',
        background: '#000000',
        color: '#f5f5f7',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        textAlign: 'center',
      }}
    >
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 44,
          height: 44,
          borderRadius: 12,
          background: '#0071e3',
          fontSize: 22,
          marginBottom: 8,
        }}
      >
        ⚡
      </span>
      <h1 style={{ fontSize: 44, margin: 0, letterSpacing: '-1px', fontWeight: 600 }}>404</h1>
      <p style={{ margin: 0, fontSize: 17, color: 'rgba(245,245,247,0.65)', maxWidth: 360 }}>
        This page isn&apos;t available yet. CreatorFlow is still launching.
      </p>
      <Link
        href="/"
        style={{
          marginTop: 12,
          padding: '8px 20px',
          borderRadius: 980,
          background: '#0071e3',
          color: '#ffffff',
          textDecoration: 'none',
          fontSize: 15,
        }}
      >
        Back to CreatorFlow
      </Link>
    </main>
  );
}
