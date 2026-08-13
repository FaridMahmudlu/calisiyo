export default function sitemap() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://calisiyo-theta.vercel.app';
  const lastModified = new Date();

  return [
    {
      url: baseUrl,
      lastModified,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/gizlilik`,
      lastModified,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/kvkk`,
      lastModified,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/kullanim-sartlari`,
      lastModified,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/iletisim`,
      lastModified,
      changeFrequency: 'yearly',
      priority: 0.4,
    },
    {
      url: `${baseUrl}/paketler`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    ...['on-bilgilendirme', 'mesafeli-satis', 'iptal-iade', 'cerez-politikasi'].map((path) => ({
      url: `${baseUrl}/${path}`,
      lastModified,
      changeFrequency: 'yearly',
      priority: 0.3,
    })),
  ];
}
