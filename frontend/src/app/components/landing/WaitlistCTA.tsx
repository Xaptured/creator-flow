'use client';

import { useState } from 'react';

// TODO: include pricing details after launch
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

    // TODO: Simulate async submission — wire to real API endpoint later
    await new Promise((res) => setTimeout(res, 1200));
    setLoading(false);
    setSubmitted(true);
  };

  return (
    <section
      id="waitlist"
      className="bg-th-bg-primary py-[clamp(60px,8vw,120px)] px-5"
    >
      <div className="max-w-[640px] mx-auto text-center">
        {/* Eyebrow */}
        <p className="font-text text-[14px] font-semibold text-th-accent-blue tracking-[0.5px] uppercase mb-4">
          Early Access
        </p>

        {/* Headline */}
        <h2 className="text-section-heading text-th-text-primary mb-4">
          Be first. Grow faster.
        </h2>

        {/* Body */}
        <p className="font-text text-[1.06rem] text-th-text-secondary leading-[1.47] tracking-[-0.374px] max-w-[480px] mx-auto mb-10">
          CreatorFlow is launching soon. Join the waitlist and get early access,
          exclusive founder pricing, and a free AI content audit of your channel.
        </p>

        {/* Form or success */}
        {submitted ? (
          <div className="flex flex-col items-center gap-3 py-10 px-8 bg-th-feature-card-bg rounded-xl shadow-waitlist-success">
            <div className="text-[48px]">🎉</div>
            <h3 className="font-display text-[1.5rem] font-semibold text-th-text-primary tracking-[-0.28px]">
              You&apos;re on the list!
            </h3>
            <p className="font-text text-[15px] text-th-text-secondary leading-[1.47] max-w-[360px]">
              We&apos;ll email you at <strong className="text-th-text-primary">{email}</strong> when CreatorFlow is ready for you. Expect something special.
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-3 max-w-[460px] mx-auto"
          >
            <div className="flex gap-[10px] flex-wrap">
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError('');
                }}
                placeholder="your@email.com"
                required
                className={`flex-1 min-w-[220px] py-3 px-[18px] rounded-[980px] border-[1.5px] bg-th-feature-card-bg font-text text-[16px] text-th-text-primary outline-none transition-colors ${
                  error ? 'border-th-error' : 'border-black/12 focus:border-th-accent-blue'
                }`}
              />
              <button
                type="submit"
                disabled={loading}
                className="btn-pill btn-primary"
                className={`btn-pill btn-primary whitespace-nowrap border-none ${loading ? 'opacity-70 cursor-wait' : 'opacity-100 cursor-pointer'}`}
              >
                {loading ? 'Joining…' : 'Get Early Access'}
              </button>
            </div>

            {error && (
              <p className="font-text text-[13px] text-th-error text-center tracking-[-0.12px]">
                {error}
              </p>
            )}

            <p className="font-text text-[12px] text-th-text-tertiary text-center tracking-[-0.12px]">
              No spam. No credit card required. Unsubscribe anytime.
            </p>
          </form>
        )}

        {/* Feature bullets */}
        <div className="flex gap-6 justify-center flex-wrap mt-12">
          {[
            '✓ Early access priority',
            '✓ Founder pricing',
            '✓ Free AI content audit',
          ].map((item) => (
            <span
              key={item}
              className="font-text text-[14px] text-th-text-tertiary tracking-[-0.224px]"
            >
              {item}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
