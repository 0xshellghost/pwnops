import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dashboard/', '/api/'], // We don't want search engines crawling private dashboards or APIs
    },
    sitemap: 'https://pwnops.vercel.app/sitemap.xml',
  };
}
