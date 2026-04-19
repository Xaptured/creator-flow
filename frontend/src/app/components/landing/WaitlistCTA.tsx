'use client';

import { useState } from 'react';

export default function WaitlistCTA() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    setError('');
    setLoading(true);

    // Simulate async submission — wire to real API endpoint later
    await new Promise((res) => setTimeout(res, 1200));
    setLoading(false);
    setSubmitted(true);
  };

  return (
    <section
      id="waitlist"
      style={{
        background: 'var(--th-bg-primary)',
        padding: 'clamp(60px, 8vw, 120px) 20px',
      }}
    >
      <div
        style={{
          maxWidth: '640px',
          margin: '0 auto',
          textAlign: 'center',
        }}
      >
        {/* Eyebrow */}
        <p
          style={{
            fontFamily: 'var(--cf-font-text)',
            fontSize: '14px',
            fontWeight: 600,
            color: '#0071e3',
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
            marginBottom: '16px',
          }}
        >
          Early Access
        </p>

        {/* Headline */}
        <h2
          className="text-section-heading"
          style={{ color: 'var(--th-text-primary)', marginBottom: '16px' }}
        >
          Be first. Grow faster.
        </h2>

        {/* Body */}
        <p
          style={{
            fontFamily: 'var(--cf-font-text)',
            fontSize: '1.06rem',
            color: 'var(--th-text-secondary)',
            lineHeight: 1.47,
            letterSpacing: '-0.374px',
            marginBottom: '40px',
            maxWidth: '480px',
            margin: '0 auto 40px',
          }}
        >
          CreatorFlow is launching soon. Join the waitlist and get early access,
          exclusive founder pricing, and a free AI content audit of your channel.
        </p>

        {/* Form or success */}
        {submitted ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
              padding: '40px 32px',
              background: 'var(--th-feature-card-bg)',
              borderRadius: '12px',
              boxShadow: 'rgba(0,0,0,0.08) 0 2px 20px',
            }}
          >
            <div style={{ fontSize: '48px' }}>🎉</div>
            <h3
              style={{
                fontFamily: 'var(--cf-font-display)',
                fontSize: '1.5rem',
                fontWeight: 600,
                color: 'var(--th-text-primary)',
                letterSpacing: '-0.28px',
              }}
            >
              You&apos;re on the list!
            </h3>
            <p
              style={{
                fontFamily: 'var(--cf-font-text)',
                fontSize: '15px',
                color: 'var(--th-text-secondary)',
                lineHeight: 1.47,
                maxWidth: '360px',
              }}
            >
              We&apos;ll email you at <strong style={{ color: 'var(--th-text-primary)' }}>{email}</strong> when CreatorFlow is ready for you. Expect something special.
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              maxWidth: '460px',
              margin: '0 auto',
            }}
          >
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError('');
                }}
                placeholder="your@email.com"
                required
                style={{
                  flex: 1,
                  minWidth: '220px',
                  padding: '12px 18px',
                  borderRadius: '980px',
                  border: error ? '1.5px solid #ff3b30' : '1.5px solid rgba(0,0,0,0.12)',
                  background: 'var(--th-feature-card-bg)',
                  fontFamily: 'var(--cf-font-text)',
                  fontSize: '16px',
                  color: 'var(--th-text-primary)',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => {
                  if (!error) e.currentTarget.style.borderColor = '#0071e3';
                }}
                onBlur={(e) => {
                  if (!error) e.currentTarget.style.borderColor = 'rgba(0,0,0,0.12)';
                }}
              />
              <button
                type="submit"
                disabled={loading}
                className="btn-pill btn-primary"
                style={{
                  whiteSpace: 'nowrap',
                  opacity: loading ? 0.7 : 1,
                  cursor: loading ? 'wait' : 'pointer',
                  border: 'none',
                }}
              >
                {loading ? 'Joining…' : 'Get Early Access'}
              </button>
            </div>

            {error && (
              <p
                style={{
                  fontFamily: 'var(--cf-font-text)',
                  fontSize: '13px',
                  color: '#ff3b30',
                  textAlign: 'center',
                  letterSpacing: '-0.12px',
                }}
              >
                {error}
              </p>
            )}

            <p
              style={{
                fontFamily: 'var(--cf-font-text)',
                fontSize: '12px',
                color: 'var(--th-text-tertiary)',
                textAlign: 'center',
                letterSpacing: '-0.12px',
              }}
            >
              No spam. No credit card required. Unsubscribe anytime.
            </p>
          </form>
        )}

        {/* Feature bullets */}
        <div
          style={{
            display: 'flex',
            gap: '24px',
            justifyContent: 'center',
            flexWrap: 'wrap',
            marginTop: '48px',
          }}
        >
          {[
            '✓ Early access priority',
            '✓ Founder pricing',
            '✓ Free AI content audit',
          ].map((item) => (
            <span
              key={item}
              style={{
                fontFamily: 'var(--cf-font-text)',
                fontSize: '14px',
                color: 'var(--th-text-tertiary)',
                letterSpacing: '-0.224px',
              }}
            >
              {item}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
