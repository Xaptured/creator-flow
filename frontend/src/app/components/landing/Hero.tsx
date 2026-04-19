'use client';

export default function Hero() {
  return (
    <section className="bg-th-bg-primary min-h-screen flex flex-col items-center justify-center pt-[120px] pb-20 px-5 text-center relative overflow-hidden">
      {/* Subtle radial glow behind hero */}
      <div
        aria-hidden
        className="absolute top-[30%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(0,113,227,0.12) 0%, transparent 70%)' }}
      />

      <div className="max-w-[740px] mx-auto animate-fade-in-up relative z-10">
        {/* Eyebrow tag */}
        <div className="animate-fade-in-up inline-flex items-center gap-[6px] py-[5px] px-[14px] rounded-[980px] border border-[rgba(41,151,255,0.4)] bg-[rgba(41,151,255,0.08)] mb-7">
          <span className="text-xs text-th-eyebrow tracking-[-0.12px] font-text">
            ⚡ AI-Powered Content Studio
          </span>
        </div>

        {/* Hero Headline */}
        <h1 className="text-hero animate-fade-in-up delay-100 text-th-text-primary mb-5 [text-wrap:balance]">
          Stop switching tabs.<br />
          Start growing your audience.
        </h1>

        {/* Sub-headline */}
        <p className="animate-fade-in-up delay-200 font-display text-[clamp(1.1rem,2vw,1.31rem)] font-normal leading-[1.47] text-th-text-secondary max-w-[560px] mx-auto mb-9">
          Creators waste hours juggling tools to schedule, post, and analyze across YouTube, Instagram, and Twitter/X.
          CreatorFlow does it all in one place — powered by AI.
        </p>

        {/* Tagline */}
        <p className="animate-fade-in-up delay-300 font-text text-sm font-normal text-th-text-tertiary mb-10 tracking-[-0.224px]">
          Schedule smarter. Create faster. Grow bigger.
        </p>

        {/* CTAs */}
        <div className="animate-fade-in-up delay-300 flex gap-4 justify-center flex-wrap">
          <a href="#waitlist" className="btn-pill btn-primary animate-glow">
            Get Early Access
          </a>
          <a href="#features" className="btn-pill btn-outline-dark">
            See Features →
          </a>
        </div>
      </div>

      {/* Dashboard Mockup */}
      <div className="animate-fade-in-up delay-500 animate-float mt-[72px] max-w-[880px] w-full relative z-10">
        <div className="bg-th-bg-secondary rounded-xl border border-th-border shadow-hero-mockup overflow-hidden">
          {/* Window chrome */}
          <div className="bg-th-bg-card py-3 px-4 flex items-center gap-2 border-b border-th-border-card">
            <span className="w-3 h-3 rounded-full bg-[#ff5f57] inline-block" />
            <span className="w-3 h-3 rounded-full bg-[#ffbd2e] inline-block" />
            <span className="w-3 h-3 rounded-full bg-[#28c840] inline-block" />
            <span className="flex-1 text-center text-xs text-th-section-label font-text">
              CreatorFlow Dashboard
            </span>
          </div>

          {/* Dashboard body */}
          <div className="flex h-[420px]">
            {/* Sidebar */}
            <div className="w-[200px] bg-th-bg-secondary border-r border-th-border py-5 px-3 flex flex-col gap-1 shrink-0">
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
                  className={`flex items-center gap-2.5 py-2 px-3 rounded-lg text-[13px] font-text cursor-default ${item.active ? 'bg-[rgba(0,113,227,0.2)] text-[#2997ff]' : 'bg-transparent text-th-text-tertiary'}`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>

            {/* Main content */}
            <div className="flex-1 p-5 overflow-hidden">
              {/* Header row */}
              <div className="flex justify-between items-center mb-5">
                <h2 className="font-display text-[18px] font-semibold text-th-text-primary">
                  Content Calendar
                </h2>
                <div className="flex gap-2">
                  {['YouTube', 'Instagram', 'Twitter/X'].map((p) => (
                    <span
                      key={p}
                      className="py-[3px] px-2.5 rounded-[980px] bg-th-border text-[11px] text-th-text-tertiary font-text border border-th-border"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-[repeat(7,1fr)] gap-[6px]">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
                  <div key={d} className="text-center text-[11px] text-th-section-label py-1 font-text">{d}</div>
                ))}
                {Array.from({ length: 28 }).map((_, i) => {
                  const hasPost = [2, 5, 8, 11, 14, 16, 19, 22].includes(i);
                  const isToday = i === 10;
                  const postColors = ['#ff6b6b', '#0071e3', '#30d158'];
                  return (
                    <div
                      key={i}
                      className={`aspect-square rounded-md flex flex-col items-center justify-center gap-[3px] p-1 relative ${isToday ? 'bg-[rgba(0,113,227,0.18)] border border-[rgba(0,113,227,0.5)]' : 'bg-th-border border border-th-border'}`}
                    >
                      <span className={`text-[10px] font-text ${isToday ? 'text-[#2997ff]' : 'text-th-text-tertiary'}`}>
                        {i + 1}
                      </span>
                      {hasPost && (
                        <div className="flex gap-[2px]">
                          <span className="w-[5px] h-[5px] rounded-full" style={{ background: postColors[i % 3] }} />
                          {i % 4 === 0 && <span className="w-[5px] h-[5px] rounded-full" style={{ background: postColors[(i + 1) % 3] }} />}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* AI insight strip */}
              <div className="mt-4 py-3 px-4 bg-[rgba(0,113,227,0.1)] rounded-lg border border-[rgba(0,113,227,0.2)] flex items-center gap-2.5">
                <span className="text-[18px]">✨</span>
                <span className="text-xs text-th-eyebrow font-text">
                  AI Insight: Your audience engages 3× more on Tuesday mornings. 2 posts scheduled for peak time.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Glow under mockup */}
        <div
          aria-hidden
          className="absolute -bottom-[30px] left-1/2 -translate-x-1/2 w-[60%] h-[60px] bg-[rgba(0,113,227,0.15)] blur-[30px] rounded-full"
        />
      </div>
</section>
  );
}
