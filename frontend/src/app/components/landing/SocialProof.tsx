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
    <div className="flex items-center gap-2.5">
      <svg width="32" height="22" viewBox="0 0 32 22" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="32" height="22" rx="5" fill="#FF0000"/>
        <polygon points="13,6 24,11 13,16" fill="white"/>
      </svg>
      <span className="font-display text-base font-bold text-th-text-body tracking-[-0.2px]">YouTube</span>
    </div>
  );
}

function InstagramLogo() {
  return (
    <div className="flex items-center gap-2.5">
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
      <span className="font-display text-base font-bold text-th-text-body tracking-[-0.2px]">Instagram</span>
    </div>
  );
}

function TwitterXLogo() {
  return (
    <div className="flex items-center gap-2.5">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.259 5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
      <span className="font-display text-base font-bold text-th-text-body tracking-[-0.2px]">Twitter / X</span>
    </div>
  );
}

export default function SocialProof() {
  return (
    <section
      id="social-proof"
      className="bg-th-bg-primary py-[clamp(60px,8vw,120px)] px-5"
    >
      <div className="max-w-[980px] mx-auto">

        {/* Stats strip */}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-[1px] bg-th-border rounded-xl overflow-hidden mb-20">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="bg-th-stat-bg py-10 px-6 text-center"
            >
              <div className="text-[32px] mb-2">{stat.icon}</div>
              <div className="font-display text-[clamp(2rem,4vw,3rem)] font-semibold text-th-text-primary leading-[1.07] tracking-[-0.28px] mb-2">
                {stat.value}
              </div>
              <div className="font-text text-sm text-th-text-tertiary tracking-[-0.224px]">
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Platform logos */}
        <div className="text-center mb-16">
          <p className="font-text text-xs text-th-section-label tracking-[1px] uppercase mb-7">
            Connects with your favorite platforms
          </p>
          <div className="flex items-center justify-center gap-12 flex-wrap">
            <YouTubeLogo />
            <InstagramLogo />
            <TwitterXLogo />
          </div>
        </div>

        {/* Testimonials heading */}
        <div className="text-center mb-12">
          <h2 className="text-section-heading text-th-text-primary mb-3">
            Creators are already talking.
          </h2>
          <p className="font-text text-[1.06rem] text-th-text-tertiary tracking-[-0.374px]">
            Early access results from our beta community.
          </p>
        </div>

        {/* Testimonial cards */}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-5">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="bg-th-bg-card rounded-xl p-7 border border-th-border-card shadow-social-proof flex flex-col gap-4"
            >
              {/* Quote */}
              <p className="font-text text-[15px] text-th-text-body leading-[1.6] tracking-[-0.224px] flex-1">
                &ldquo;{t.quote}&rdquo;
              </p>

              {/* Author */}
              <div className="flex items-center gap-3 mt-1">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-[rgba(0,113,227,0.3)] border border-[rgba(0,113,227,0.4)] flex items-center justify-center font-display text-[13px] font-semibold text-th-eyebrow shrink-0">
                  {t.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-display text-sm font-semibold text-th-text-primary tracking-[-0.224px]">
                    {t.name}
                  </div>
                  <div className="font-text text-xs text-th-text-tertiary tracking-[-0.12px]">
                    {t.handle} · {t.subs}
                  </div>
                </div>
                {/* Platform badge */}
                <div className="py-[3px] px-2.5 rounded-[980px] bg-[rgba(255,255,255,0.06)] border border-th-border text-[11px] text-th-text-tertiary font-text shrink-0">
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
