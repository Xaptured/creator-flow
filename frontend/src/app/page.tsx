import { ThemeProvider } from '@/context/ThemeContext';
import Navbar from '@/components/landing/Navbar';
import Hero from '@/components/landing/Hero';
import Features from '@/components/landing/Features';
import SocialProof from '@/components/landing/SocialProof';
import WaitlistCTA from '@/components/landing/WaitlistCTA';
import Footer from '@/components/landing/Footer';

export default function Home() {
  return (
    <ThemeProvider>
      <main style={{ background: 'var(--th-bg-primary)', transition: 'background 0.3s' }}>
        <Navbar />
        <Hero />
        <Features />
        <SocialProof />
        <WaitlistCTA />
        <Footer />
      </main>
    </ThemeProvider>
  );
}
