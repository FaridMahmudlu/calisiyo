import { PUBLIC_INDEXABLE_ROUTES } from '@/lib/seo/content';
import { absoluteUrl } from '@/lib/seo/site';

export default function sitemap() {
  return PUBLIC_INDEXABLE_ROUTES.map(({ path, lastModified }) => ({
    url: absoluteUrl(path),
    lastModified,
  }));
}
