'use client';

const features = [
  {
    icon: '✨',
    name: 'AI Caption Generator',
    description:
      'Get 5 tone-variant captions for every post instantly. Choose from professional, casual, witty, inspirational, or viral — powered by Claude AI.',
    accent: '#0071e3',
  },
  {
    icon: '📅',
    name: 'Smart Content Scheduler',
    description:
      'Drag-and-drop calendar to schedule posts across all platforms. AI picks the optimal posting time based on your audience data.',
    accent: '#30d158',
  },
  {
    icon: '🚀',
    name: 'Multi-Platform Publishing',
    description:
      'Publish to YouTube, Instagram, and Twitter/X in one click. No more logging into three dashboards. One workflow, every platform.',
    accent: '#ff9f0a',
  },
  {
    icon: '📊',
    name: 'AI Analytics Insights',
    description:
      "Claude-powered analysis tells you exactly what's working and why — with plain-language summaries, not confusing charts.",
    accent: '#bf5af2',
  },
  {
    icon: '🔍',
    name: 'Content Gap Detection',
    description:
      "AI scans trending topics in your niche and surfaces what your audience wants that you haven't covered yet. Never run out of ideas.",
    accent: '#ff6b6b',
  },
  {
    icon: '🖼️',
    name: 'Thumbnail Scorer',
    description:
      'AI rates your thumbnail candidates on click-through potential and picks the highest-performing winner before you hit publish.',
    accent: '#2997ff',
  },
];

export default function Features() {
  return (
    <section
      id="features"
      style={{
        background: 'var(--th-bg-secondary)',
        padding: 'clamp(60px, 8vw, 120px) 20px',
      }}
    >
      <div style={{ maxWidth: '980px', margin: '0 auto' }}>
        {/* Section header */}
        <div style={{ textAlign: 'center', marginBottom: '64px' }}>
          <p
            style={{
              fontFamily: 'var(--cf-font-text)',
              fontSize: '14px',
              fontWeight: 600,
              color: '#0071e3',
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
              marginBottom: '12px',
            }}
          >
            Everything you need
          </p>
          <h2
            className="text-section-heading"
            style={{ color: 'var(--th-text-primary)', marginBottom: '16px' }}
          >
            Built for creators who mean business.
          </h2>
          <p
            style={{
              fontFamily: 'var(--cf-font-text)',
              fontSize: '1.06rem',
              color: 'var(--th-text-secondary)',
              maxWidth: '520px',
              margin: '0 auto',
              lineHeight: 1.47,
              letterSpacing: '-0.374px',
            }}
          >
            Six AI-powered tools, one dashboard. Stop context-switching and start creating content that actually grows your audience.
          </p>
        </div>

        {/* Feature grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '20px',
          }}
        >
          {features.map((feature, i) => (
            <div
              key={feature.name}
              style={{
                background: 'var(--th-feature-card-bg)',
                borderRadius: '12px',
                padding: '32px 28px',
                boxShadow: 'var(--th-feature-card-shadow)',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                cursor: 'default',
                animationDelay: `${i * 0.08}s`,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)';
                (e.currentTarget as HTMLDivElement).style.boxShadow = 'rgba(0,0,0,0.14) 0 8px 32px 0';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                (e.currentTarget as HTMLDivElement).style.boxShadow = 'rgba(0,0,0,0.08) 0 2px 20px 0';
              }}
            >
              {/* Icon */}
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: `${feature.accent}18`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  marginBottom: '20px',
                }}
              >
                {feature.icon}
              </div>

              {/* Title */}
              <h3
                style={{
                  fontFamily: 'var(--cf-font-display)',
                  fontSize: '1.19rem',
                  fontWeight: 700,
                  color: 'var(--th-text-primary)',
                  letterSpacing: '0.231px',
                  lineHeight: 1.19,
                  marginBottom: '10px',
                }}
              >
                {feature.name}
              </h3>

              {/* Description */}
              <p
                style={{
                  fontFamily: 'var(--cf-font-text)',
                  fontSize: '15px',
                  color: 'var(--th-text-secondary)',
                  lineHeight: 1.47,
                  letterSpacing: '-0.224px',
                }}
              >
                {feature.description}
              </p>

              {/* Learn more link */}
              <a
                href="#waitlist"
                style={{
                  display: 'inline-block',
                  marginTop: '20px',
                  fontFamily: 'var(--cf-font-text)',
                  fontSize: '14px',
                  color: 'var(--th-link)',
                  textDecoration: 'none',
                  letterSpacing: '-0.224px',
                }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.textDecoration = 'underline')}
                onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.textDecoration = 'none')}
              >
                Learn more →
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
