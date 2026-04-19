'use client';

const stats = [
  { value: '3', label: 'Platforms Connected', icon: '🔗' },
  { value: '5+', label: 'Hours Saved Per Week', icon: '⏱️' },
  { value: 'AI', label: 'Powered Insights', icon: '✨' },
];

const testimonials = [
  {
    name: 'Maya Chen',
    handle: '@mayacreates',
    avatar: 'MC',
    platform: 'YouTube',
    platformIcon: '▶',
    platformColor: '#ff0000',
    subs: '142K subscribers',
    quote:
      "I used to spend Sunday evenings scheduling content for the whole week. With CreatorFlow, it takes 20 minutes and the AI captions are honestly better than what I was writing myself.",
  },
  {
    name: 'Jordan Rivers',
    handle: '@jordanbuilds',
    avatar: 'JR',
    platform: 'Instagram',
    platformIcon: '◈',
    platformColor: '#e1306c',
    subs: '89K followers',
    quote:
      "The Thumbnail Scorer alone is worth it. I went from 4% CTR to 9% in two weeks just by letting the AI tell me which thumbnail to use. My growth has been insane since.",
  },
  {
    name: 'Alex Mercer',
    handle: '@alexmercertech',
    avatar: 'AM',
    platform: 'Twitter/X',
    platformIcon: '✕',
    platformColor: '#ffffff',
    subs: '67K followers',
    quote:
      "Content Gap Detection found three topic areas my audience was searching for that none of my competitors had covered. Those three videos now drive 40% of my monthly revenue.",
  },
];

function YouTubeLogo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <svg width="32" height="22" viewBox="0 0 32 22" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="32" height="22" rx="5" fill="#FF0000"/>
        <polygon points="13,6 24,11 13,16" fill="white"/>
      </svg>
      <span style={{ fontFamily: 'var(--cf-font-display)', fontSize: '16px', fontWeight: 700, color: 'var(--th-text-body)', letterSpacing: '-0.2px' }}>YouTube</span>
    </div>
  );
}

function InstagramLogo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="igGrad2" x1="0" y1="26" x2="26" y2="0">
            <stop stopColor="#f09433"/>
            <stop offset="0.25" stopColor="#e6683c"/>
            <stop offset="0.5" stopColor="#dc2743"/>
            <stop offset="0.75" stopColor="#cc2366"/>
            <stop offset="1" stopColor="#bc1888"/>
          </linearGradient>
        </defs>
        <rect x="1" y="1" width="24" height="24" rx="7" stroke="url(#igGrad2)" strokeWidth="2.2" fill="none"/>
        <circle cx="13" cy="13" r="5.5" stroke="url(#igGrad2)" strokeWidth="2.2" fill="none"/>
        <circle cx="20" cy="6" r="1.5" fill="url(#igGrad2)"/>
      </svg>
      <span style={{ fontFamily: 'var(--cf-font-display)', fontSize: '16px', fontWeight: 700, color: 'var(--th-text-body)', letterSpacing: '-0.2px' }}>Instagram</span>
    </div>
  );
}

function TwitterXLogo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.259 5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
      <span style={{ fontFamily: 'var(--cf-font-display)', fontSize: '16px', fontWeight: 700, color: 'var(--th-text-body)', letterSpacing: '-0.2px' }}>Twitter / X</span>
    </div>
  );
}

export default function SocialProof() {
  return (
    <section
      id="social-proof"
      style={{
        background: 'var(--th-bg-primary)',
        padding: 'clamp(60px, 8vw, 120px) 20px',
      }}
    >
      <div style={{ maxWidth: '980px', margin: '0 auto' }}>

        {/* Stats strip */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1px',
            background: 'var(--th-border)',
            borderRadius: '12px',
            overflow: 'hidden',
            marginBottom: '80px',
          }}
        >
          {stats.map((stat) => (
            <div
              key={stat.label}
              style={{
                background: 'var(--th-stat-bg)',
                padding: '40px 24px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>{stat.icon}</div>
              <div
                style={{
                  fontFamily: 'var(--cf-font-display)',
                  fontSize: 'clamp(2rem, 4vw, 3rem)',
                  fontWeight: 600,
                  color: 'var(--th-text-primary)',
                  lineHeight: 1.07,
                  letterSpacing: '-0.28px',
                  marginBottom: '8px',
                }}
              >
                {stat.value}
              </div>
              <div
                style={{
                  fontFamily: 'var(--cf-font-text)',
                  fontSize: '14px',
                  color: 'var(--th-text-tertiary)',
                  letterSpacing: '-0.224px',
                }}
              >
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Platform logos */}
        <div style={{ textAlign: 'center', marginBottom: '64px' }}>
          <p
            style={{
              fontFamily: 'var(--cf-font-text)',
              fontSize: '12px',
              color: 'var(--th-section-label)',
              letterSpacing: '1px',
              textTransform: 'uppercase',
              marginBottom: '28px',
            }}
          >
            Connects with your favorite platforms
          </p>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '48px',
              flexWrap: 'wrap',
            }}
          >
            <YouTubeLogo />
            <InstagramLogo />
            <TwitterXLogo />
          </div>
        </div>

        {/* Testimonials heading */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <h2
            className="text-section-heading"
            style={{ color: 'var(--th-text-primary)', marginBottom: '12px' }}
          >
            Creators are already talking.
          </h2>
          <p
            style={{
              fontFamily: 'var(--cf-font-text)',
              fontSize: '1.06rem',
              color: 'var(--th-text-tertiary)',
              letterSpacing: '-0.374px',
            }}
          >
            Early access results from our beta community.
          </p>
        </div>

        {/* Testimonial cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '20px',
          }}
        >
          {testimonials.map((t) => (
            <div
              key={t.name}
              style={{
                background: 'var(--th-bg-card)',
                borderRadius: '12px',
                padding: '28px',
                border: '1px solid var(--th-border-card)',
                boxShadow: 'rgba(0,0,0,0.22) 3px 5px 30px 0px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              }}
            >
              {/* Quote */}
              <p
                style={{
                  fontFamily: 'var(--cf-font-text)',
                  fontSize: '15px',
                  color: 'var(--th-text-body)',
                  lineHeight: 1.6,
                  letterSpacing: '-0.224px',
                  flex: 1,
                }}
              >
                &ldquo;{t.quote}&rdquo;
              </p>

              {/* Author */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
                {/* Avatar */}
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: 'rgba(0,113,227,0.3)',
                    border: '1px solid rgba(0,113,227,0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'var(--cf-font-display)',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: 'var(--th-eyebrow-color)',
                    flexShrink: 0,
                  }}
                >
                  {t.avatar}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: 'var(--cf-font-display)',
                      fontSize: '14px',
                      fontWeight: 600,
                      color: 'var(--th-text-primary)',
                      letterSpacing: '-0.224px',
                    }}
                  >
                    {t.name}
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--cf-font-text)',
                      fontSize: '12px',
                      color: 'var(--th-text-tertiary)',
                      letterSpacing: '-0.12px',
                    }}
                  >
                    {t.handle} · {t.subs}
                  </div>
                </div>
                {/* Platform badge */}
                <div
                  style={{
                    padding: '3px 10px',
                    borderRadius: '980px',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid var(--th-border)',
                    fontSize: '11px',
                    color: 'var(--th-text-tertiary)',
                    fontFamily: 'var(--cf-font-text)',
                    flexShrink: 0,
                  }}
                >
                  {t.platform}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
</section>
  );
}
