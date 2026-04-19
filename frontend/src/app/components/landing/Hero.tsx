'use client';

export default function Hero() {
  return (
    <section
      style={{
        background: 'var(--th-bg-primary)',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '120px 20px 80px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Subtle radial glow behind hero */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: '30%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '600px',
          height: '600px',
          background: 'radial-gradient(circle, rgba(0,113,227,0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <div
        className="max-w-[740px] mx-auto animate-fade-in-up"
        style={{ position: 'relative', zIndex: 1 }}
      >
        {/* Eyebrow tag */}
        <div
          className="animate-fade-in-up"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '5px 14px',
            borderRadius: '980px',
            border: '1px solid rgba(41,151,255,0.4)',
            background: 'rgba(41,151,255,0.08)',
            marginBottom: '28px',
          }}
        >
          <span style={{ fontSize: '12px', color: 'var(--th-eyebrow-color)', letterSpacing: '-0.12px', fontFamily: 'var(--cf-font-text)' }}>
            ⚡ AI-Powered Content Studio
          </span>
        </div>

        {/* Hero Headline */}
        <h1
          className="text-hero animate-fade-in-up delay-100"
          style={{
            color: 'var(--th-text-primary)',
            marginBottom: '20px',
            textWrap: 'balance',
          }}
        >
          Stop switching tabs.<br />
          Start growing your audience.
        </h1>

        {/* Sub-headline */}
        <p
          className="animate-fade-in-up delay-200"
          style={{
            fontFamily: 'var(--cf-font-display)',
            fontSize: 'clamp(1.1rem, 2vw, 1.31rem)',
            fontWeight: 400,
            lineHeight: 1.47,
            color: 'var(--th-text-secondary)',
            marginBottom: '36px',
            maxWidth: '560px',
            margin: '0 auto 36px',
          }}
        >
          Creators waste hours juggling tools to schedule, post, and analyze across YouTube, Instagram, and Twitter/X.
          CreatorFlow does it all in one place — powered by AI.
        </p>

        {/* Tagline */}
        <p
          className="animate-fade-in-up delay-300"
          style={{
            fontFamily: 'var(--cf-font-text)',
            fontSize: '14px',
            fontWeight: 400,
            color: 'var(--th-text-tertiary)',
            marginBottom: '40px',
            letterSpacing: '-0.224px',
          }}
        >
          Schedule smarter. Create faster. Grow bigger.
        </p>

        {/* CTAs */}
        <div
          className="animate-fade-in-up delay-300"
          style={{
            display: 'flex',
            gap: '16px',
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}
        >
          <a href="#waitlist" className="btn-pill btn-primary animate-glow">
            Get Early Access
          </a>
          <a href="#features" className="btn-pill btn-outline-dark">
            See Features →
          </a>
        </div>
      </div>

      {/* Dashboard Mockup */}
      <div
        className="animate-fade-in-up delay-500 animate-float"
        style={{
          marginTop: '72px',
          maxWidth: '880px',
          width: '100%',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div
          style={{
            background: 'var(--th-bg-secondary)',
            borderRadius: '12px',
            border: '1px solid var(--th-border)',
            boxShadow: '0 40px 100px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)',
            overflow: 'hidden',
          }}
        >
          {/* Window chrome */}
          <div
            style={{
              background: 'var(--th-bg-card)',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              borderBottom: '1px solid var(--th-border-card)',
            }}
          >
            <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ff5f57', display: 'inline-block' }} />
            <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ffbd2e', display: 'inline-block' }} />
            <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#28c840', display: 'inline-block' }} />
            <span style={{ flex: 1, textAlign: 'center', fontSize: '12px', color: 'var(--th-section-label)', fontFamily: 'var(--cf-font-text)' }}>
              CreatorFlow Dashboard
            </span>
          </div>

          {/* Dashboard body */}
          <div style={{ display: 'flex', height: '420px' }}>
            {/* Sidebar */}
            <div
              style={{
                width: '200px',
                background: 'var(--th-bg-secondary)',
                borderRight: '1px solid var(--th-border)',
                padding: '20px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                flexShrink: 0,
              }}
            >
              {[
                { icon: '📊', label: 'Dashboard', active: false },
                { icon: '📅', label: 'Calendar', active: true },
                { icon: '✨', label: 'AI Studio', active: false },
                { icon: '📈', label: 'Analytics', active: false },
                { icon: '🔗', label: 'Platforms', active: false },
                { icon: '⚙️', label: 'Settings', active: false },
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: item.active ? 'rgba(0,113,227,0.2)' : 'transparent',
                    color: item.active ? '#2997ff' : 'var(--th-text-tertiary)',
                    fontSize: '13px',
                    fontFamily: 'var(--cf-font-text)',
                    cursor: 'default',
                  }}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>

            {/* Main content */}
            <div style={{ flex: 1, padding: '20px', overflow: 'hidden' }}>
              {/* Header row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ fontFamily: 'var(--cf-font-display)', fontSize: '18px', fontWeight: 600, color: 'var(--th-text-primary)' }}>
                  Content Calendar
                </h2>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {['YouTube', 'Instagram', 'Twitter/X'].map((p) => (
                    <span
                      key={p}
                      style={{
                        padding: '3px 10px',
                        borderRadius: '980px',
                        background: 'var(--th-border)',
                        fontSize: '11px',
                        color: 'var(--th-text-tertiary)',
                        fontFamily: 'var(--cf-font-text)',
                        border: '1px solid var(--th-border)',
                      }}
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </div>

              {/* Calendar grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
                  <div
                    key={d}
                    style={{
                      textAlign: 'center',
                      fontSize: '11px',
                      color: 'var(--th-section-label)',
                      padding: '4px 0',
                      fontFamily: 'var(--cf-font-text)',
                    }}
                  >
                    {d}
                  </div>
                ))}
                {Array.from({ length: 28 }).map((_, i) => {
                  const hasPost = [2, 5, 8, 11, 14, 16, 19, 22].includes(i);
                  const isToday = i === 10;
                  const postColors = ['#ff6b6b', '#0071e3', '#30d158'];
                  return (
                    <div
                      key={i}
                      style={{
                        aspectRatio: '1',
                        borderRadius: '6px',
                        background: isToday ? 'rgba(0,113,227,0.18)' : 'var(--th-border)',
                        border: isToday ? '1px solid rgba(0,113,227,0.5)' : '1px solid var(--th-border)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '3px',
                        padding: '4px',
                        position: 'relative',
                      }}
                    >
                      <span style={{ fontSize: '10px', color: isToday ? '#2997ff' : 'var(--th-text-tertiary)', fontFamily: 'var(--cf-font-text)' }}>
                        {i + 1}
                      </span>
                      {hasPost && (
                        <div style={{ display: 'flex', gap: '2px' }}>
                          <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: postColors[i % 3] }} />
                          {i % 4 === 0 && <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: postColors[(i + 1) % 3] }} />}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* AI insight strip */}
              <div
                style={{
                  marginTop: '16px',
                  padding: '12px 16px',
                  background: 'rgba(0,113,227,0.1)',
                  borderRadius: '8px',
                  border: '1px solid rgba(0,113,227,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <span style={{ fontSize: '18px' }}>✨</span>
                <span style={{ fontSize: '12px', color: 'var(--th-eyebrow-color)', fontFamily: 'var(--cf-font-text)' }}>
                  AI Insight: Your audience engages 3× more on Tuesday mornings. 2 posts scheduled for peak time.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Glow under mockup */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            bottom: '-30px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '60%',
            height: '60px',
            background: 'rgba(0,113,227,0.15)',
            filter: 'blur(30px)',
            borderRadius: '50%',
          }}
        />
      </div>
</section>
  );
}
