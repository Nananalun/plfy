import Link from 'next/link';

async function getArtist(id: string) {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/artists/${id}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return res.json();
  } catch (error) {
    return null;
  }
}

async function getArticles(limit = 4) {
    try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/articles`, { cache: 'no-store' });
        if (!res.ok) return [];
        const data = await res.json();
        return data.slice(0, limit);
    } catch { return []; }
}

async function getQuestions(limit = 2) {
     try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/questions`, { cache: 'no-store' });
        if (!res.ok) return [];
        const data = await res.json();
        return data.slice(0, limit);
    } catch { return []; }
}

export default async function ArtistDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [artist, articles, questions] = await Promise.all([
      getArtist(id),
      getArticles(4),
      getQuestions(2)
  ]);

  if (!artist) return <div className="p-24 text-center">名家未找到</div>;

  return (
    <div className="bg-gray-50 min-h-screen pb-12">
        <div className="zisha-container py-8">
             {/* Breadcrumb */}
             <div className="text-xs text-gray-500 mb-6">
                <Link href="/" className="hover:text-red-800">首页</Link>
                <span className="mx-2">&gt;</span>
                <Link href="/artists" className="hover:text-red-800">名家库</Link>
                <span className="mx-2">&gt;</span>
                <span className="text-gray-800">{artist.name}</span>
             </div>

             {/* 1. Top Card Info */}
             <div className="bg-white p-8 shadow-sm mb-8 flex flex-col md:flex-row gap-8 items-start">
                 <div className="w-48 h-64 bg-gray-100 flex-shrink-0 border p-1">
                     {artist.avatar ? (
                         <img src={artist.avatar} className="w-full h-full object-cover" />
                     ) : (
                         <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">暂无照片</div>
                     )}
                 </div>
                 <div className="flex-1">
                     <div className="flex items-baseline gap-4 mb-4">
                         <h1 className="text-3xl font-bold text-gray-800">{artist.name}</h1>
                         <span className="text-red-800 border border-red-800 px-2 py-0.5 text-sm rounded">{artist.title || "紫砂艺人"}</span>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 text-sm text-gray-600 mb-6">
                         <p>荣誉称号：<span className="text-gray-800">{artist.title || "无"}</span></p>
                         <p>出生年月：<span className="text-gray-800">19XX年</span></p>
                         <p className="col-span-2">简介概括：<span className="text-gray-800">{artist.bio ? artist.bio.replace(/<[^>]+>/g, '').slice(0, 50) + '...' : '暂无'}</span></p>
                     </div>
                     {/* Stats or Badges */}
                     <div className="flex gap-4 text-xs text-gray-500">
                         <span className="bg-gray-100 px-3 py-1 rounded">认证艺人</span>
                         <span className="bg-gray-100 px-3 py-1 rounded">作品: {artist.products?.length || 0}</span>
                         <span className="bg-gray-100 px-3 py-1 rounded">粉丝: 99+</span>
                     </div>
                 </div>
             </div>

             {/* 2. Bio (Full) */}
             <div className="mb-12">
                 <h2 className="text-xl font-bold text-gray-800 border-l-4 border-red-800 pl-3 mb-6">专栏艺人简介</h2>
                 <div className="bg-white p-8 shadow-sm text-gray-600 leading-loose text-sm">
                     {artist.bio ? (
                         <div dangerouslySetInnerHTML={{ __html: artist.bio }} />
                     ) : (
                         <p>暂无详细简介。</p>
                     )}
                 </div>
             </div>

             {/* 3. Recommended Works */}
             <div className="mb-12">
                 <h2 className="text-xl font-bold text-gray-800 border-l-4 border-red-800 pl-3 mb-6">推荐作品</h2>
                 <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
                      {artist.products && artist.products.length > 0 ? artist.products.slice(0, 4).map((p: any) => (
                          <Link href={`/products/${p.id}`} key={p.id} className="bg-white p-4 shadow-sm hover:shadow-md transition group">
                              <div className="aspect-square bg-gray-100 mb-4 overflow-hidden">
                                  {p.images && <img src={p.images} className="w-full h-full object-cover group-hover:scale-105 transition" />}
                              </div>
                              <h3 className="text-gray-800 font-bold truncate">{p.title}</h3>
                              <p className="text-red-800 mt-1">¥{p.price}</p>
                          </Link>
                      )) : <div className="col-span-4 text-gray-400 text-center py-8">暂无推荐作品</div>}
                 </div>
             </div>

             {/* 4. Representative Works */}
             <div className="mb-12">
                 <h2 className="text-xl font-bold text-gray-800 border-l-4 border-red-800 pl-3 mb-6">代表作品</h2>
                 <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
                      {artist.products && artist.products.length > 0 ? artist.products.slice(0, 4).map((p: any) => (
                          <Link href={`/products/${p.id}`} key={p.id} className="bg-white p-4 shadow-sm hover:shadow-md transition group">
                              <div className="aspect-square bg-gray-100 mb-4 overflow-hidden">
                                  {p.images && <img src={p.images} className="w-full h-full object-cover group-hover:scale-105 transition" />}
                              </div>
                              <h3 className="text-gray-800 font-bold truncate">{p.title}</h3>
                              <p className="text-red-800 mt-1">¥{p.price}</p>
                          </Link>
                      )) : <div className="col-span-4 text-gray-400 text-center py-8">暂无代表作品</div>}
                 </div>
             </div>

             {/* 5. Artist Highlights (Certificates) */}
             <div className="mb-12">
                 <h2 className="text-xl font-bold text-gray-800 border-l-4 border-red-800 pl-3 mb-6">工艺师风采</h2>
                 <div className="bg-white p-6 shadow-sm grid grid-cols-2 md:grid-cols-4 gap-4">
                     {[1, 2, 3, 4].map(i => (
                         <div key={i} className="aspect-[3/4] bg-gray-100 flex items-center justify-center text-gray-300 text-xs border">
                             证书/照片展示位 {i}
                         </div>
                     ))}
                 </div>
             </div>

             {/* 6. Related Reports & Questions */}
             <div className="mb-12 grid grid-cols-1 lg:grid-cols-2 gap-8">
                 {/* Questions */}
                 <div>
                     <h2 className="text-xl font-bold text-gray-800 border-l-4 border-red-800 pl-3 mb-6">名家问答</h2>
                     <div className="bg-white p-6 shadow-sm min-h-[200px]">
                         {questions.length > 0 ? (
                             <ul className="space-y-4">
                                 {questions.map((q: any) => (
                                     <li key={q.id} className="border-b border-dashed pb-4 last:border-0 last:pb-0">
                                         <h4 className="font-bold text-gray-800 text-sm mb-2">问：{q.question}</h4>
                                         <p className="text-gray-500 text-xs line-clamp-2">答：{q.answer}</p>
                                     </li>
                                 ))}
                             </ul>
                         ) : <div className="text-gray-400 text-center py-8">暂无问答</div>}
                     </div>
                 </div>
                 {/* Articles */}
                 <div>
                     <h2 className="text-xl font-bold text-gray-800 border-l-4 border-red-800 pl-3 mb-6">咨询中心</h2>
                     <div className="bg-white p-6 shadow-sm min-h-[200px]">
                         {articles.length > 0 ? (
                             <ul className="space-y-3">
                                 {articles.map((a: any) => (
                                     <li key={a.id} className="flex justify-between items-center">
                                         <Link href={`/articles/${a.id}`} className="text-sm text-gray-700 hover:text-red-800 truncate flex-1 mr-4">
                                             • {a.title}
                                         </Link>
                                         <span className="text-xs text-gray-400">{new Date(a.createdAt).toLocaleDateString()}</span>
                                     </li>
                                 ))}
                             </ul>
                         ) : <div className="text-gray-400 text-center py-8">暂无文章</div>}
                     </div>
                 </div>
             </div>

             {/* 7. Message Board */}
             <div className="bg-[#FFF5F5] border border-red-100 p-8 rounded-lg">
                 <div className="text-center mb-8">
                     <h2 className="text-2xl font-bold text-red-900 mb-2">向 {artist.name} 老师提问 / 留言</h2>
                     <p className="text-red-700 text-sm">填写评论立即获取抵扣金，我们将尽快回复您的咨询</p>
                 </div>
                 
                 <form className="max-w-2xl mx-auto space-y-6">
                     <div>
                         <textarea 
                             className="w-full p-4 border border-gray-300 rounded focus:border-red-800 focus:ring-1 focus:ring-red-800 outline-none h-32"
                             placeholder="请输入您的留言内容..."
                         ></textarea>
                     </div>
                     
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <input 
                             type="text" 
                             placeholder="手机号码" 
                             className="w-full p-3 border border-gray-300 rounded focus:border-red-800 outline-none"
                         />
                         <div className="flex gap-4">
                             <input 
                                 type="text" 
                                 placeholder="您的称呼" 
                                 className="flex-1 p-3 border border-gray-300 rounded focus:border-red-800 outline-none"
                             />
                             <div className="flex items-center gap-4 bg-white px-4 border border-gray-300 rounded">
                                 <label className="flex items-center cursor-pointer">
                                     <input type="radio" name="gender" className="mr-2" /> 先生
                                 </label>
                                 <label className="flex items-center cursor-pointer">
                                     <input type="radio" name="gender" className="mr-2" /> 女士
                                 </label>
                             </div>
                         </div>
                     </div>

                     <div className="text-center">
                         <button className="bg-red-800 text-white px-12 py-3 rounded hover:bg-red-900 transition font-bold text-lg">
                             提交留言
                         </button>
                     </div>
                 </form>
             </div>
        </div>
    </div>
  );
}

