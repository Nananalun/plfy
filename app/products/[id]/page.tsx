import Link from 'next/link';
import { Metadata } from 'next';
import ProductDetailClient from './ProductDetailClient';

async function getProduct(id: string) {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/products/${id}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return res.json();
  } catch (error) {
    return null;
  }
}

function parseImages(imagesString: string): string[] {
    let imageList: string[] = [];
    try {
        const parsed = JSON.parse(imagesString);
        if (Array.isArray(parsed)) {
            imageList = parsed;
        } else {
            imageList = [imagesString];
        }
    } catch (e) {
        imageList = imagesString ? [imagesString] : [];
    }
    return imageList.filter(url => !!url);
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const product = await getProduct(id);
  
  if (!product) return { title: '商品未找到' };

  const images = parseImages(product.images);
  
  return {
    title: product.title,
    description: product.description?.slice(0, 160) || `${product.title} - 紫砂之家正品推荐`,
    openGraph: {
        title: product.title,
        description: product.description?.slice(0, 160),
        images: images.length > 0 ? images : [],
    }
  }
}

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getProduct(id);

  if (!product) return (
    <div className="p-24 text-center">
      <h2 className="text-2xl mb-4">商品未找到</h2>
      <Link href="/products" className="text-red-600 hover:underline">返回列表</Link>
    </div>
  );

  const imageList = parseImages(product.images);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    image: imageList,
    description: product.description || product.title,
    sku: product.id,
    offers: {
      '@type': 'Offer',
      price: product.price,
      priceCurrency: 'CNY',
      availability: product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    }
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ProductDetailClient product={product} imageList={imageList} />
    </>
  );
}
