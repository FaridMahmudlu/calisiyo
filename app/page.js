import LandingPageLegacy from '@/components/landing/LandingPageLegacy';
import LandingPageNew from '@/components/landing/LandingPageNew';

export default function HomePage() {
  // Enabled by default unless explicitly disabled with NEXT_PUBLIC_NEW_LANDING=false
  const useNewLanding = process.env.NEXT_PUBLIC_NEW_LANDING !== 'false';

  if (useNewLanding) {
    return <LandingPageNew />;
  }

  return <LandingPageLegacy />;
}
