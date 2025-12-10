import Link from 'next/link';

async function getGallery(type: string) {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/gallery?type=${type}`, { cache: 'no-store' });
    return res.ok ? await res.json() : [];
  } catch (error) {
    return [];
  }
}

export default async function GalleryPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const { type } = await searchParams;
  const currentType = type || 'MASTERPIECE';
  const items = await getGallery(currentType);

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="zisha-container">
        <div className="text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-red-800">首页</Link>
          <span className="mx-2">&gt;</span>
          <span className="text-gray-800">紫砂图库</span>
        </div>

        <div className="flex items-center justify-between mb-8">
           <h1 className="text-3xl font-bold text-gray-800 border-l-4 border-red-800 pl-4">
             {currentType === 'MASTERPIECE' ? '美壶鉴赏' : '壶友返图'}
           </h1>
           <div className="flex gap-2">
              <Link 
                href="/gallery?type=MASTERPIECE" 
                className={`px-4 py-2 text-sm border ${currentType === 'MASTERPIECE' ? 'bg-red-800 text-white border-red-800' : 'bg-white text-gray-600 border-gray-300 hover:border-red-800'}`}
              >
                美壶鉴赏
              </Link>
              <Link 
                href="/gallery?type=FEEDBACK" 
                className={`px-4 py-2 text-sm border ${currentType === 'FEEDBACK' ? 'bg-red-800 text-white border-red-800' : 'bg-white text-gray-600 border-gray-300 hover:border-red-800'}`}
              >
                壶友返图
              </Link>
           </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {items.length > 0 ? (
            items.map((item: any) => (
              <div key={item.id} className="bg-white border border-gray-200 group hover:shadow-lg transition duration-300">
                <div className="aspect-square bg-gray-100 relative overflow-hidden">
                   {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover group-hover:scale-110 transition duration-500"/>
                   ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">暂无图片</div>
                   )}
                </div>
                <div className="p-4">
                   <h3 className="text-lg font-bold text-gray-800 mb-1 truncate group-hover:text-red-800">{item.title}</h3>
                   <p className="text-xs text-gray-500 mb-2">
                      {currentType === 'MASTERPIECE' ? `作者：${item.author || '未知'}` : `用户：${item.author || '匿名'}`}
                   </p>
                   {item.description && (
                      <div className="text-xs bg-gray-50 p-2 rounded text-gray-600 line-clamp-2">
                         {item.description}
                      </div>
                   )}
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-4 text-center py-12 text-gray-400">暂无数据</div>
          )}
        </div>
      </div>
    </div>
  );
}

