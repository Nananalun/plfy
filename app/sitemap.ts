import { MetadataRoute } from 'next'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://www.jinxizisha.com'

  // Fetch products
  let products = []
  try {
    // Note: ensure the API is accessible during build time if this is SSG, 
    // or this will run at request time if dynamic.
    const res = await fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000') + '/products', { next: { revalidate: 3600 } });
    if (res.ok) {
        products = await res.json();
    }
  } catch (e) {
      console.error('Failed to fetch products for sitemap', e);
  }

  const productUrls = products.map((product: any) => ({
    url: `${baseUrl}/products/${product.id}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/products`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/artists`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/articles`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/knowledge`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    ...productUrls,
  ]
}

