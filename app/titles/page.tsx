import Link from 'next/link';

async function searchArtist(name: string) {
  if (!name) return [];
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/artists?name=${encodeURIComponent(name)}`, { cache: 'no-store' });
    return res.ok ? await res.json() : [];
  } catch {
    return [];
  }
}

export default async function TitleSearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const results = q ? await searchArtist(q) : [];

  return (
    <div className="bg-gray-50 min-h-screen py-12">
       <div className="zisha-container">
          <div className="max-w-2xl mx-auto bg-white p-8 shadow-sm rounded-lg">
             <h1 className="text-2xl font-bold text-center text-gray-800 mb-8">宜兴紫砂艺人职称查询</h1>
             
             {/* Search Form */}
             <form className="flex gap-4 mb-8">
                <input 
                   name="q" 
                   defaultValue={q} 
                   type="text" 
                   placeholder="请输入艺人姓名（如：顾景舟）" 
                   className="flex-1 border border-gray-300 px-4 py-3 rounded focus:border-red-800 focus:outline-none"
                />
                <button type="submit" className="bg-red-800 text-white px-8 py-3 rounded font-bold hover:bg-red-900 transition">
                   查询
                </button>
             </form>

             {/* Results */}
             {q && (
                <div>
                   <h2 className="text-lg font-bold border-b border-gray-100 pb-2 mb-4">
                      查询结果："{q}"
                   </h2>
                   {results.length > 0 ? (
                      <div className="space-y-4">
                         {results.map((artist: any) => (
                            <Link href={`/artists/${artist.id}`} key={artist.id} className="flex items-center gap-4 p-4 border border-gray-100 hover:border-red-800 hover:shadow-sm transition group rounded">
                                <div className="w-16 h-16 bg-gray-100 rounded-full overflow-hidden flex-shrink-0">
                                   {artist.avatar ? (
                                      <img src={artist.avatar} className="w-full h-full object-cover" />
                                   ) : (
                                      <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">暂无</div>
                                   )}
                                </div>
                                <div className="flex-1">
                                   <h3 className="font-bold text-lg text-gray-800 group-hover:text-red-800">{artist.name}</h3>
                                   <p className="text-sm text-gray-500">{artist.title || "未录入职称"}</p>
                                </div>
                                <span className="text-xs text-gray-400">点击查看详情 &gt;</span>
                            </Link>
                         ))}
                      </div>
                   ) : (
                      <div className="text-center py-12 text-gray-500 bg-gray-50 rounded">
                         <p className="mb-2">未找到相关艺人信息。</p>
                         <p className="text-xs">请确认姓名输入正确，或该艺人尚未收录。</p>
                      </div>
                   )}
                </div>
             )}
             
             {!q && (
                <div className="text-center text-gray-400 text-sm py-12">
                   <p>输入姓名，点击查询即可查看职称信息。</p>
                </div>
             )}
          </div>
       </div>
    </div>
  );
}
