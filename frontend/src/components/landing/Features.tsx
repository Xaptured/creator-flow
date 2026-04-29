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
      className="bg-th-bg-secondary py-[clamp(60px,8vw,120px)] px-5"
    >
      <div className="max-w-[980px] mx-auto">
        <div className="text-center mb-16">
          <p className="font-text text-[14px] font-semibold text-th-accent-blue tracking-[0.5px] uppercase mb-3">
            Everything you need
          </p>
          <h2 className="text-section-heading text-th-text-primary mb-4">
            Built for creators who mean business.
          </h2>
          <p className="font-text text-[1.06rem] text-th-text-secondary max-w-[520px] mx-auto leading-[1.47] tracking-[-0.374px]">
            Six AI-powered tools, one dashboard. Stop context-switching and start creating content that actually grows your audience.
          </p>
        </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-5">
          {features.map((feature, i) => (
            <div
              key={feature.name}
              className="bg-th-feature-card-bg rounded-xl py-8 px-7 shadow-feature-card transition-all duration-200 ease-in-out cursor-default hover:-translate-y-1 hover:shadow-feature-card-hover"
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-5"
                style={{ background: `${feature.accent}18` }}
              >
                {feature.icon}
              </div>
              <h3 className="font-display text-[1.19rem] font-bold text-th-text-primary tracking-[0.231px] leading-[1.19] mb-2.5">
                {feature.name}
              </h3>
              <p className="font-text text-[15px] text-th-text-secondary leading-[1.47] tracking-[-0.224px]">
                {feature.description}
              </p>
              <a
                href="#waitlist"
                className="inline-block mt-5 font-text text-sm text-th-link no-underline tracking-[-0.224px] hover:underline"
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
