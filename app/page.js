import LandingPageLegacy from '@/components/landing/LandingPageLegacy';
import LandingPageNew from '@/components/landing/LandingPageNew';

export default function HomePage() {
  const useNewLanding = process.env.NEXT_PUBLIC_NEW_LANDING === 'true';

  if (useNewLanding) {
    return <LandingPageNew />;
  }

  return <LandingPageLegacy />;
}
