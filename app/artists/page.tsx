import Link from 'next/link';

async function getArtists(title?: string) {
  try {
    const url = title 
        ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/artists?title=${encodeURIComponent(title)}` 
        : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000') + '/artists';
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return [];
    return res.json();
  } catch (error) {
    return [];
  }
}

async function getArticles(type?: string) {
  try {
    const url = type ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/articles?type=${type}` : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000') + '/articles';
    const res = await fetch(url, { cache: 'no-store' });
    return res.ok ? await res.json() : [];
  } catch (error) {
    return [];
  }
}

const navItems = [
  { name: "工艺师首页", value: "" },
  { name: "工艺师大全", value: "all" },
  { name: "正高级工艺美术师", value: "研究员级高级工艺美术师" },
  { name: "高级工艺美术师", value: "国家级高级工艺美术师" },
  { name: "中青年实力派", value: "中青年实力派" },
  { name: "工艺美术师", value: "国家级工艺美术师" },
  { name: "助理工艺美术师", value: "国家级助理工艺美术师" },
  { name: "工艺美术员", value: "国家级工艺美术员" },
  { name: "陶艺艺人", value: "民间艺人" },
  { name: "历代名家", value: "历代名家" }
];

// Helper to filter artists (if we fetch all) or just for display logic
function filterArtists(allArtists: any[], title: string) {
    return allArtists.filter(a => a.title === title);
}

export default async function ArtistsPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const { category } = await searchParams;
  
  // 1. Fetch Data
  // If category is present (and not 'all' or empty), we show the list view (existing logic).
  // If category is empty (Home), we show the complex layout.
  
  const isHome = !category;
  
  if (!isHome) {
      // ... Existing List View Logic (Simplified for brevity, or reused) ...
      const artists = await getArtists(category === 'all' ? undefined : category);
      const currentTitle = navItems.find(item => item.value === category)?.name || "全部名家";

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="zisha-container">
        <div className="text-xs text-gray-500 mb-6">
          <Link href="/" className="hover:text-red-800">首页</Link>
          <span className="mx-2">&gt;</span>
              <Link href="/artists" className="hover:text-red-800">名家库</Link>
              <span className="mx-2">&gt;</span>
              <span className="text-gray-800">{currentTitle}</span>
        </div>

            {/* Nav */}
            <div className="bg-[#F5F0EB] mb-8">
               <div className="flex flex-wrap">
                  {navItems.map(item => (
                     <Link 
                       key={item.name}
                       href={item.value ? `/artists?category=${item.value}` : '/artists'}
                       className={`px-6 py-3 text-sm font-bold transition-colors ${
                           (category === item.value) 
                           ? 'bg-[#8b0000] text-white' 
                           : 'text-[#5c3b1e] hover:text-[#8b0000] hover:bg-red-50'
                       }`}
                     >
                        {item.name}
                     </Link>
                 ))}
              </div>
               <div className="h-1 bg-[#8b0000] w-full"></div>
        </div>

            {/* List */}
            <h2 className="text-2xl font-bold text-gray-800 border-l-4 border-red-800 pl-4 mb-6">{currentTitle}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
           {artists.map((artist: any) => (
             <Link href={`/artists/${artist.id}`} key={artist.id} className="bg-white p-6 hover:shadow-xl transition duration-300 group text-center border border-transparent hover:border-red-100">
                <div className="w-24 h-24 mx-auto bg-gray-100 rounded-full overflow-hidden mb-4 relative">
                   {artist.avatar ? (
                     <img src={artist.avatar} alt={artist.name} className="w-full h-full object-cover group-hover:scale-110 transition"/>
                   ) : (
                     <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">暂无照片</div>
                   )}
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-1 group-hover:text-red-800">{artist.name}</h3>
                <p className="text-xs text-gray-500 mb-3">{artist.title || "紫砂艺人"}</p>
                <div className="text-xs text-gray-400 bg-gray-50 py-2 rounded">
                   作品：<span className="text-red-800 font-bold">{artist._count?.products || 0}</span> 件
                </div>
             </Link>
           ))}
        </div>
            {artists.length === 0 && <div className="p-12 text-center text-gray-500">暂无数据</div>}
          </div>
        </div>
      );
  }

  // --- HOME LAYOUT ---
  // Fetch everything needed
  const [
      allArtists,
      interviewArticles,
      reportArticles
  ] = await Promise.all([
      getArtists(), // fetch all
      getArticles('INTERVIEW'),
      getArticles('REPORT')
  ]);
  
  const articles = [...interviewArticles.slice(0, 5), ...reportArticles.slice(0, 5)];

  // Grouping
  const recommended = allArtists.slice(0, 4); // Mock recommendation
  const senior = filterArtists(allArtists, "研究员级高级工艺美术师").slice(0, 4);
  const advanced = filterArtists(allArtists, "国家级高级工艺美术师").slice(0, 4);
  const young = filterArtists(allArtists, "中青年实力派").slice(0, 6);
  const craftsman = filterArtists(allArtists, "国家级工艺美术师").slice(0, 6);
  const assistant = filterArtists(allArtists, "国家级助理工艺美术师").slice(0, 6);
  const junior = filterArtists(allArtists, "国家级工艺美术员").slice(0, 6);
  const pottery = filterArtists(allArtists, "民间艺人").slice(0, 6);

  // Shared Section Component for lower tiers
  const ArtistGridSection = ({ title, items, link }: { title: string, items: any[], link: string }) => (
      <div className="mb-10">
         <div className="flex justify-between items-end mb-4 border-b border-red-800 pb-2">
             <h3 className="text-xl font-bold text-gray-800">{title}</h3>
             <Link href={link} className="text-xs text-gray-500 hover:text-red-800">更多 &gt;</Link>
         </div>
         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             {items.map(artist => (
                 <Link key={artist.id} href={`/artists/${artist.id}`} className="flex items-center p-4 bg-white border border-gray-100 hover:shadow-md hover:border-red-100 transition group">
                     <div className="w-16 h-16 bg-gray-100 rounded-full overflow-hidden flex-shrink-0 mr-4">
                         {artist.avatar ? (
                             <img src={artist.avatar} className="w-full h-full object-cover" />
                         ) : (
                             <div className="w-full h-full flex items-center justify-center text-xs text-gray-300">暂无</div>
                         )}
                     </div>
                     <div>
                         <h4 className="font-bold text-gray-800 group-hover:text-red-800">{artist.name}</h4>
                         <p className="text-xs text-gray-500 mt-1">{artist.title}</p>
                     </div>
                 </Link>
             ))}
             {items.length === 0 && <div className="col-span-3 text-center text-gray-400 py-4 bg-gray-50 text-xs">暂无数据</div>}
         </div>
      </div>
  );

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="zisha-container">
        {/* Breadcrumb & Nav are same as above */}
        <div className="text-xs text-gray-500 mb-6">
          <Link href="/" className="hover:text-red-800">首页</Link>
          <span className="mx-2">&gt;</span>
          <span className="text-gray-800">名家库</span>
        </div>

        <div className="bg-[#F5F0EB] mb-8">
           <div className="flex flex-wrap">
              {navItems.map(item => (
                 <Link 
                   key={item.name}
                   href={item.value ? `/artists?category=${item.value}` : '/artists'}
                   className={`px-6 py-3 text-sm font-bold transition-colors ${
                       (category || '') === item.value 
                       ? 'bg-[#8b0000] text-white' 
                       : 'text-[#5c3b1e] hover:text-[#8b0000] hover:bg-red-50'
                   }`}
                 >
                    {item.name}
                 </Link>
              ))}
           </div>
           <div className="h-1 bg-[#8b0000] w-full"></div>
        </div>

        {/* MAIN LAYOUT */}
        <div className="flex flex-col lg:flex-row gap-8 mb-12">
            {/* Left Main Area */}
            <div className="flex-1 min-w-0">
                
                {/* 1. Recommended */}
                <div className="mb-8">
                    <h2 className="text-xl font-bold text-gray-800 border-l-4 border-red-800 pl-3 mb-4">名家推荐</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {recommended.map(artist => (
                            <Link href={`/artists/${artist.id}`} key={artist.id} className="bg-white p-4 flex gap-4 shadow-sm hover:shadow-md transition">
                                <div className="w-[200px] h-[130px] bg-gray-100 flex-shrink-0 overflow-hidden">
                                     {artist.avatar ? (
                                        <img src={artist.avatar} className="w-full h-full object-cover" />
                                     ) : (
                                        <div className="w-full h-full flex items-center justify-center text-xs text-gray-300">暂无</div>
                                     )}
                                </div>
                                <div className="flex-1 flex flex-col justify-between py-1">
                                    <div>
                                        <h3 className="font-bold text-lg text-gray-800">{artist.name}</h3>
                                        <p className="text-xs text-red-800 mb-2">{artist.title}</p>
                                        <p className="text-xs text-gray-500 line-clamp-3 leading-5">{artist.bio || '暂无简介...'}</p>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>

                {/* 2. Senior (Zhenggao) */}
                <div className="mb-8">
                    <div className="flex justify-between items-end mb-4 border-b border-gray-200 pb-2">
                        <h2 className="text-xl font-bold text-gray-800 border-l-4 border-red-800 pl-3">正高级工艺美术师</h2>
                        <Link href="/artists?category=研究员级高级工艺美术师" className="text-xs text-gray-500 hover:text-red-800">更多 &gt;</Link>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                        {senior.map(artist => (
                            <Link href={`/artists/${artist.id}`} key={artist.id} className="bg-white p-4 flex gap-6 shadow-sm hover:shadow-md transition">
                                <div className="w-[200px] h-[130px] bg-gray-100 flex-shrink-0 overflow-hidden">
                                     {artist.avatar ? (
                                        <img src={artist.avatar} className="w-full h-full object-cover" />
                                     ) : (
                                        <div className="w-full h-full flex items-center justify-center text-xs text-gray-300">暂无</div>
                                     )}
                                </div>
                                <div className="flex-1 flex flex-col justify-between py-1">
                                    <div>
                                        <h3 className="font-bold text-lg text-gray-800">{artist.name}</h3>
                                        <p className="text-xs text-red-800 mb-2">{artist.title}</p>
                                        <div className="text-xs text-gray-500 line-clamp-3 leading-5" dangerouslySetInnerHTML={{ __html: artist.bio || '暂无简介...' }} />
                                    </div>
                                </div>
                            </Link>
                        ))}
                        {senior.length === 0 && <div className="text-center py-8 text-gray-400 bg-gray-50">暂无数据</div>}
                    </div>
                </div>

                {/* 3. Advanced (Gaogong) */}
                <div className="mb-8">
                     <div className="flex justify-between items-end mb-4 border-b border-gray-200 pb-2">
                        <h2 className="text-xl font-bold text-gray-800 border-l-4 border-red-800 pl-3">高级工艺美术师</h2>
                        <Link href="/artists?category=国家级高级工艺美术师" className="text-xs text-gray-500 hover:text-red-800">更多 &gt;</Link>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                        {advanced.map(artist => (
                            <Link href={`/artists/${artist.id}`} key={artist.id} className="bg-white p-4 flex gap-6 shadow-sm hover:shadow-md transition">
                                <div className="w-[200px] h-[130px] bg-gray-100 flex-shrink-0 overflow-hidden">
                                     {artist.avatar ? (
                                        <img src={artist.avatar} className="w-full h-full object-cover" />
                                     ) : (
                                        <div className="w-full h-full flex items-center justify-center text-xs text-gray-300">暂无</div>
                                     )}
                                </div>
                                <div className="flex-1 flex flex-col justify-between py-1">
                                    <div>
                                        <h3 className="font-bold text-lg text-gray-800">{artist.name}</h3>
                                        <p className="text-xs text-red-800 mb-2">{artist.title}</p>
                                        <div className="text-xs text-gray-500 line-clamp-3 leading-5" dangerouslySetInnerHTML={{ __html: artist.bio || '暂无简介...' }} />
                                    </div>
                                </div>
                            </Link>
                        ))}
                        {advanced.length === 0 && <div className="text-center py-8 text-gray-400 bg-gray-50">暂无数据</div>}
                    </div>
                </div>

            </div>

            {/* Right Sidebar */}
            <div className="w-full lg:w-72 flex-shrink-0">
                <div className="bg-white border border-gray-200 p-4">
                    <h3 className="font-bold text-gray-800 mb-4 pb-2 border-b border-gray-100">名家访谈 & 报道</h3>
                    <ul className="space-y-4">
                        {articles.map(article => (
                            <li key={article.id}>
                                <Link href={`/articles/${article.id}`} className="block group">
                                    <h4 className="text-sm text-gray-700 group-hover:text-red-800 line-clamp-1 mb-1">{article.title}</h4>
                                    <p className="text-xs text-gray-400">{new Date(article.createdAt).toLocaleDateString()}</p>
                                </Link>
                            </li>
                        ))}
                        {articles.length === 0 && <li className="text-center text-gray-400 text-xs">暂无文章</li>}
                    </ul>
                </div>
            </div>
        </div>

        {/* Lower Sections: 3 Cols Grid */}
        <ArtistGridSection title="中青年实力派" items={young} link="/artists?category=中青年实力派" />
        <ArtistGridSection title="工艺美术师" items={craftsman} link="/artists?category=国家级工艺美术师" />
        <ArtistGridSection title="助理工艺美术师" items={assistant} link="/artists?category=国家级助理工艺美术师" />
        <ArtistGridSection title="工艺美术员" items={junior} link="/artists?category=国家级工艺美术员" />
        <ArtistGridSection title="陶艺艺人" items={pottery} link="/artists?category=民间艺人" />

      </div>
    </div>
  );
}

