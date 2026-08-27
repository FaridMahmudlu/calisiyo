import Link from 'next/link';
import { PiArrowRight, PiClock } from 'react-icons/pi';
import { formatEditorialDate } from '@/lib/seo/content';

export default function GuideCard({ guide }) {
  return (
    <article className="guide-card">
      <div className="guide-card-meta">
        <span>{guide.kicker}</span>
        <time dateTime={guide.updatedAt}><PiClock /> {formatEditorialDate(guide.updatedAt)}</time>
      </div>
      <h2><Link href={`/rehber/${guide.slug}`}>{guide.title}</Link></h2>
      <p>{guide.summary}</p>
      <Link className="guide-card-link" href={`/rehber/${guide.slug}`}>Rehberi oku <PiArrowRight /></Link>
    </article>
  );
}
