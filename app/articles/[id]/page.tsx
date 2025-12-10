import Link from 'next/link';

async function getArticle(id: string) {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/articles/${id}`, { cache: 'no-store' });
    return res.ok ? await res.json() : null;
  } catch (error) {
    return null;
  }
}

export default async function ArticleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const article = await getArticle(id);

  if (!article) return (
    <div className="p-24 text-center">
      <h2 className="text-2xl mb-4">文章未找到</h2>
      <Link href="/articles" className="text-red-600 hover:underline">返回列表</Link>
    </div>
  );

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="zisha-container max-w-4xl">
        <div className="text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-red-800">首页</Link>
          <span className="mx-2">&gt;</span>
          <Link href="/articles" className="hover:text-red-800">紫砂学院</Link>
          <span className="mx-2">&gt;</span>
          <span className="text-gray-800">正文</span>
        </div>

        <div className="bg-white p-8 lg:p-12 border border-gray-200 shadow-sm">
          <h1 className="text-3xl font-bold text-gray-900 mb-4 text-center">{article.title}</h1>
          <div className="flex justify-center items-center gap-6 text-xs text-gray-400 mb-8 border-b border-gray-100 pb-4">
            <span>发布时间：{new Date(article.createdAt).toLocaleDateString()}</span>
            <span>分类：{article.type}</span>
            <span>浏览：{article.views}</span>
          </div>

          {article.cover && (
            <div className="mb-8">
              <img src={article.cover} alt={article.title} className="max-w-full h-auto mx-auto" />
            </div>
          )}

          <div className="prose prose-red max-w-none text-gray-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: article.content }} />
          
          <div className="mt-12 pt-8 border-t border-gray-100 flex justify-between text-sm">
             <Link href="/articles" className="text-gray-500 hover:text-red-800">&lt; 返回列表</Link>
             <span className="text-gray-400">声明：本文由紫砂之家整理发布</span>
          </div>
        </div>
      </div>
    </div>
  );
}

