import Link from 'next/link';
import CountdownTimer from './components/CountdownTimer';

async function getData() {
  try {
    const [
      artistsRes, 
      productsRes, 
      categoriesRes, 
      articlesRes, 
      questionsRes,
      materialsRes,
      shapesRes,
      masterpiecesRes,
      feedbacksRes
    ] = await Promise.all([
      fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000') + '/artists', { cache: 'no-store' }),
      fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000') + '/products', { cache: 'no-store' }),
      fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000') + '/categories', { cache: 'no-store' }),
      fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000') + '/articles', { cache: 'no-store' }),
      fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000') + '/questions?isHot=true&limit=5', { cache: 'no-store' }),
      fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000') + '/knowledge?type=MATERIAL', { cache: 'no-store' }),
      fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000') + '/knowledge?type=SHAPE', { cache: 'no-store' }),
      fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000') + '/gallery?type=MASTERPIECE', { cache: 'no-store' }),
      fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000') + '/gallery?type=FEEDBACK', { cache: 'no-store' })
    ]);
    
    return {
      artists: artistsRes.ok ? await artistsRes.json() : [],
      products: productsRes.ok ? await productsRes.json() : [],
      categories: categoriesRes.ok ? await categoriesRes.json() : [],
      articles: articlesRes.ok ? await articlesRes.json() : [],
      questions: questionsRes.ok ? await questionsRes.json() : [],
      materials: materialsRes.ok ? await materialsRes.json() : [],
      shapes: shapesRes.ok ? await shapesRes.json() : [],
      masterpieces: masterpiecesRes.ok ? await masterpiecesRes.json() : [],
      feedbacks: feedbacksRes.ok ? await feedbacksRes.json() : []
    };
  } catch (error) {
    return { 
      artists: [], products: [], categories: [], articles: [], questions: [],
      materials: [], shapes: [], masterpieces: [], feedbacks: []
    };
  }
}

export default async function Home() {
  const { 
    artists, products, categories, articles, questions,
    materials, shapes, masterpieces, feedbacks 
  } = await getData();

  // Filter articles for Academy section
  const academyArticles = articles.filter((a: any) => a.type === 'KNOWLEDGE' || a.type === 'NEWS').slice(0, 4);
  const featuredArticle = academyArticles.length > 0 ? academyArticles[0] : null;
  const listArticles = academyArticles.length > 1 ? academyArticles.slice(1) : [];

  // Mock fallback for questions if empty
  const displayQuestions = questions.length > 0 ? questions : [
     { id: 1, question: "新买的紫砂壶有异味正常吗？", answer: "正常的紫砂壶出窑后只有土腥味和火气味...", isHot: true },
     { id: 2, question: "紫砂壶可以直接用开水煮吗？", answer: "不建议...", isHot: false }
  ];

  // Fallback data for Materials/Shapes/Gallery if empty
  const displayMaterials = materials.length > 0 ? materials : [
    { id: 101, name: '底槽清', description: '紫泥中的极品', coverImage: '', type: 'MATERIAL' },
    { id: 102, name: '大红袍', description: '泥中贵族 色泽红艳', coverImage: '', type: 'MATERIAL' },
    { id: 103, name: '紫泥', type: 'MATERIAL' }, { id: 104, name: '朱泥', type: 'MATERIAL' },
    { id: 105, name: '段泥', type: 'MATERIAL' }, { id: 106, name: '绿泥', type: 'MATERIAL' }
  ];
  const featuredMaterials = displayMaterials.slice(0, 2);
  const listMaterials = displayMaterials.slice(2);

  const displayShapes = shapes.length > 0 ? shapes : [
    { id: 201, name: '石瓢', description: '经典永流传', coverImage: '', type: 'SHAPE' },
    { id: 202, name: '西施', description: '倒把西施 最美身段', coverImage: '', type: 'SHAPE' },
    { id: 203, name: '圆壶', type: 'SHAPE' }, { id: 204, name: '方壶', type: 'SHAPE' },
    { id: 205, name: '花壶', type: 'SHAPE' }, { id: 206, name: '筋纹壶', type: 'SHAPE' }
  ];
  const featuredShapes = displayShapes.slice(0, 2);
  const listShapes = displayShapes.slice(2);

  return (
    <main className="min-h-screen pb-12">
      {/* ... (Previous Sections 1-4 remain unchanged) ... */}
      {/* 1. 首页首屏 */}
      <div className="zisha-container flex gap-4 h-[420px]">
        {/* 左侧分类菜单 */}
        <div className="w-48 bg-white shadow-sm border-t-2 border-red-800 hidden md:block flex-shrink-0 z-10">
          <ul className="py-2">
            {/* 按职称选壶 -> 跳转艺人分类，子项直接跳艺人列表带分类 */}
            <li className="px-4 py-3 hover:bg-red-50 cursor-pointer border-b border-dashed border-gray-100 group relative">
              <Link href="/artists" className="flex justify-between items-center">
                <span className="font-bold text-gray-700">按职称选壶</span>
                <span className="text-gray-400 text-xs">&gt;</span>
              </Link>
              <div className="hidden group-hover:block absolute left-full top-0 w-96 bg-white shadow-lg border h-[360px] z-20 p-4">
                 <h4 className="font-bold mb-2 text-red-800">职称分类</h4>
                 <div className="grid grid-cols-3 gap-2 text-sm">
                    <Link href="/artists?category=研究员级高级工艺美术师" className="hover:text-red-800">研究员级高工</Link>
                    <Link href="/artists?category=国家级高级工艺美术师" className="hover:text-red-800">国家级高工</Link>
                    <Link href="/artists?category=国家级工艺美术师" className="hover:text-red-800">国家级工美师</Link>
                    <Link href="/artists?category=国家级助理工艺美术师" className="hover:text-red-800">助理工美师</Link>
                    <Link href="/artists?category=民间艺人" className="hover:text-red-800">民间艺人</Link>
                 </div>
              </div>
            </li>

            {/* 按泥料选壶 -> 产品列表筛选 material */}
            <li className="px-4 py-3 hover:bg-red-50 cursor-pointer border-b border-dashed border-gray-100 group relative">
              <Link href="/products" className="flex justify-between items-center">
                <span className="font-bold text-gray-700">按泥料选壶</span>
                <span className="text-gray-400 text-xs">&gt;</span>
              </Link>
              <div className="hidden group-hover:block absolute left-full top-0 w-96 bg-white shadow-lg border h-[360px] z-20 p-4">
                 <h4 className="font-bold mb-2 text-red-800">热门泥料</h4>
                 <div className="grid grid-cols-3 gap-2 text-sm">
                    {displayMaterials.slice(0,9).map((m:any) => (
                      <Link key={m.id ?? m.name} href={`/products?material=${encodeURIComponent(m.name)}`} className="hover:text-red-800">
                        {m.name}
                      </Link>
                    ))}
                 </div>
              </div>
            </li>

            {/* 按壶型选壶 -> 产品列表筛选 shape */}
            <li className="px-4 py-3 hover:bg-red-50 cursor-pointer border-b border-dashed border-gray-100 group relative">
              <Link href="/products" className="flex justify-between items-center">
                <span className="font-bold text-gray-700">按壶型选壶</span>
                <span className="text-gray-400 text-xs">&gt;</span>
              </Link>
              <div className="hidden group-hover:block absolute left-full top-0 w-96 bg-white shadow-lg border h-[360px] z-20 p-4">
                 <h4 className="font-bold mb-2 text-red-800">热门壶型</h4>
                 <div className="grid grid-cols-3 gap-2 text-sm">
                    {displayShapes.slice(0,9).map((s:any) => (
                      <Link key={s.id ?? s.name} href={`/products?shape=${encodeURIComponent(s.name)}`} className="hover:text-red-800">
                        {s.name}
                      </Link>
                    ))}
                 </div>
              </div>
            </li>

            {/* 容量与价格可后续接入具体筛选 */}
            <li className="px-4 py-3 hover:bg-red-50 cursor-pointer border-b border-dashed border-gray-100">
              <Link href="/products" className="flex justify-between items-center">
                <span className="font-bold text-gray-700">按容量选壶</span>
                <span className="text-gray-400 text-xs">&gt;</span>
              </Link>
            </li>
            <li className="px-4 py-3 hover:bg-red-50 cursor-pointer">
              <Link href="/products" className="flex justify-between items-center">
                <span className="font-bold text-gray-700">按价格选壶</span>
                <span className="text-gray-400 text-xs">&gt;</span>
              </Link>
            </li>
          </ul>
        </div>

        {/* 中间轮播图 */}
        <div className="flex-1 bg-gray-200 relative overflow-hidden rounded-sm">
           <div className="absolute inset-0 flex items-center justify-center bg-red-50">
              <div className="text-center">
                <h2 className="text-4xl font-serif text-red-900 mb-4">名家手制 · 传世经典</h2>
                <p className="text-gray-600">每一把壶，都是一个故事</p>
              </div>
           </div>
           <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
             <span className="w-3 h-3 bg-red-800 rounded-full"></span>
             <span className="w-3 h-3 bg-white rounded-full opacity-50"></span>
             <span className="w-3 h-3 bg-white rounded-full opacity-50"></span>
           </div>
        </div>

        {/* 右侧快讯 */}
        <div className="w-64 bg-white shadow-sm hidden lg:flex flex-col">
           <div className="p-4 border-b text-center bg-gray-50">
             <div className="w-14 h-14 bg-gray-300 rounded-full mx-auto mb-2 flex items-center justify-center text-gray-500">User</div>
             <p className="text-sm text-gray-600 mb-2">Hi, 欢迎来到紫砂之家</p>
             <div className="flex gap-2 justify-center">
               <button className="bg-red-800 text-white text-xs px-3 py-1 rounded">登录</button>
               <button className="bg-white border border-gray-300 text-xs px-3 py-1 rounded">注册</button>
             </div>
           </div>
           <div className="p-4 flex-1">
             <h3 className="font-bold text-gray-800 border-l-2 border-red-800 pl-2 mb-3 text-sm">紫砂快讯</h3>
             <ul className="space-y-3 text-xs text-gray-600">
               <li className="truncate hover:text-red-800 cursor-pointer">· 2025年宜兴紫砂手工大赛结果公布</li>
               <li className="truncate hover:text-red-800 cursor-pointer">· 如何辨别全手工与半手工紫砂壶？</li>
               <li className="truncate hover:text-red-800 cursor-pointer">· 紫砂壶开壶的正确步骤图解</li>
               <li className="truncate hover:text-red-800 cursor-pointer">· 顾景舟作品在秋拍中再创新高</li>
             </ul>
           </div>
        </div>
      </div>

      {/* 2. 名家推荐楼层 */}
      <section className="zisha-container mt-8">
         <div className="flex justify-between items-end mb-4 border-b-2 border-red-800 pb-2">
             <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                <span className="text-red-800 mr-2">|</span> 
                名家推荐 
                <span className="text-sm font-normal text-gray-500 ml-4 mt-1">大师云集 匠心独运</span>
             </h2>
             <Link href="/artists" className="text-sm text-gray-600 hover:text-red-800 mb-1">查看全部名家 &gt;</Link>
         </div>
         <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* 左栏：艺人推荐 */}
            <div className="lg:col-span-3 space-y-4">
                <div className="bg-white border border-gray-200 p-4 flex items-center gap-3 hover:shadow-md transition">
                    <div className="w-16 h-16 bg-gray-200 rounded-full flex-shrink-0"></div>
                    <div>
                        <div className="font-bold text-gray-800">顾景舟</div>
                        <div className="text-xs text-gray-500 mt-1">中国工艺美术大师</div>
                        <div className="text-xs text-red-800 border border-red-800 px-1 inline-block mt-1 rounded">本月力荐</div>
                    </div>
                </div>
                 <div className="bg-white border border-gray-200 p-4 flex items-center gap-3 hover:shadow-md transition">
                    <div className="w-16 h-16 bg-gray-200 rounded-full flex-shrink-0"></div>
                    <div>
                        <div className="font-bold text-gray-800">蒋蓉</div>
                        <div className="text-xs text-gray-500 mt-1">中国工艺美术大师</div>
                    </div>
                </div>
                <div className="bg-white border border-gray-200 p-4 flex items-center gap-3 hover:shadow-md transition">
                    <div className="w-16 h-16 bg-gray-200 rounded-full flex-shrink-0"></div>
                    <div>
                        <div className="font-bold text-gray-800">徐秀棠</div>
                        <div className="text-xs text-gray-500 mt-1">中国工艺美术大师</div>
                    </div>
                </div>
            </div>
            {/* 中间栏：职称表格 */}
            <div className="lg:col-span-6 bg-white border border-gray-200 p-4">
                <div className="grid grid-cols-3 gap-4 h-full">
                    <div className="border-r border-dashed border-gray-200 pr-2">
                        <h4 className="font-bold text-center bg-red-50 py-2 mb-3 text-red-900 border-b border-red-100">大师 / 正高工</h4>
                        <div className="grid grid-cols-2 gap-2 text-center text-sm text-gray-600">
                            {Array(12).fill("").map((_, i) => <div key={i} className="bg-gray-50 py-1 rounded hover:bg-red-800 hover:text-white cursor-pointer transition">待添加</div>)}
                        </div>
                    </div>
                    <div className="border-r border-dashed border-gray-200 pr-2">
                        <h4 className="font-bold text-center bg-red-50 py-2 mb-3 text-red-900 border-b border-red-100">高工 / 名家</h4>
                        <div className="grid grid-cols-2 gap-2 text-center text-sm text-gray-600">
                            {Array(12).fill("").map((_, i) => <div key={i} className="bg-gray-50 py-1 rounded hover:bg-red-800 hover:text-white cursor-pointer transition">待添加</div>)}
                        </div>
                    </div>
                    <div>
                        <h4 className="font-bold text-center bg-red-50 py-2 mb-3 text-red-900 border-b border-red-100">工艺师 / 助工</h4>
                        <div className="grid grid-cols-2 gap-2 text-center text-sm text-gray-600">
                             {Array(12).fill("").map((_, i) => <div key={i} className="bg-gray-50 py-1 rounded hover:bg-red-800 hover:text-white cursor-pointer transition">待添加</div>)}
                        </div>
                    </div>
                </div>
            </div>
            {/* 右栏：拍卖 */}
            <div className="lg:col-span-3 bg-white border border-gray-200">
                <div className="bg-gray-100 px-4 py-2 font-bold border-b border-gray-200 flex justify-between items-center">
                    <span>拍卖成交记录</span>
                    <span className="text-xs font-normal text-gray-500 cursor-pointer">更多 &gt;</span>
                </div>
                <ul className="divide-y divide-gray-100">
                    {[1,2,3,4,5,6].map(i => (
                        <li key={i} className="px-4 py-3 text-xs flex justify-between items-center hover:bg-gray-50 cursor-pointer group">
                            <span className="truncate w-2/3 text-gray-700 group-hover:text-red-800">顾景舟制 提璧壶以一千万...</span>
                            <span className="text-red-800 font-bold">1800万</span>
                        </li>
                    ))}
                </ul>
            </div>
         </div>
      </section>

      {/* 3. 限时特卖 */}
      <section className="zisha-container mt-12">
        <div className="flex justify-between items-center mb-4 border-b-2 border-red-800 pb-2">
             <div className="flex items-center">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                    <span className="text-red-800 mr-2">|</span> 
                    限时特卖 
                </h2>
                <CountdownTimer />
             </div>
             <Link href="/products" className="text-sm text-gray-600 hover:text-red-800 mb-1">查看更多 &gt;</Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
           {products.slice(0, 4).map((product: any) => (
              <Link href={`/products/${product.id}`} key={product.id} className="bg-white border hover:border-red-800 hover:shadow-xl transition duration-300 group relative">
                 <div className="absolute top-2 left-2 bg-red-600 text-white text-xs px-2 py-1 z-10 rounded-sm font-bold shadow">
                    限时 85折
                 </div>
                 <div className="aspect-square bg-gray-50 overflow-hidden m-2">
                    {product.images ? (
                      <img src={product.images} alt={product.title} className="w-full h-full object-contain group-hover:scale-105 transition"/>
                    ) : (
                      <div className="flex items-center justify-center h-full text-xs text-gray-300">暂无图片</div>
                    )}
                 </div>
                 <div className="p-3">
                    <div className="flex items-end gap-2 mb-1">
                       <span className="text-red-800 font-bold text-lg">¥{Math.floor(product.price * 0.85)}</span>
                       <span className="text-gray-400 text-xs line-through mb-1">¥{product.price}</span>
                    </div>
                    <h4 className="text-sm text-gray-700 truncate group-hover:text-red-800">{product.title}</h4>
                    <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5 dark:bg-gray-200">
                       <div className="bg-red-600 h-1.5 rounded-full" style={{width: '45%'}}></div>
                    </div>
                    <div className="flex justify-between mt-1 text-[10px] text-gray-500">
                       <span>已抢 45%</span>
                       <span>剩余 {product.stock} 件</span>
                    </div>
                 </div>
              </Link>
           ))}
           {products.length === 0 && (
              <div className="col-span-4 py-12 text-center text-gray-400 bg-white border">暂无特卖商品</div>
           )}
        </div>
      </section>

      {/* 4. 新品上架 */}
      <section className="zisha-container mt-12">
        <div className="flex justify-between items-end mb-4 border-b-2 border-red-800 pb-2">
             <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                <span className="text-red-800 mr-2">|</span> 
                新品上架 
                <span className="text-sm font-normal text-gray-500 ml-4 mt-1">每日更新 严选精品</span>
             </h2>
             <div className="space-x-4 text-sm mb-1">
                <Link href="#" className="hover:text-red-800">紫泥</Link>
                <Link href="#" className="hover:text-red-800">朱泥</Link>
                <Link href="#" className="hover:text-red-800">段泥</Link>
                <Link href="/products" className="text-gray-600 hover:text-red-800 ml-4">更多 &gt;</Link>
             </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="hidden md:block bg-gray-100 relative group cursor-pointer overflow-hidden">
             <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition z-10"></div>
             <div className="h-full flex flex-col items-center justify-center p-6 text-center">
                <h3 className="text-2xl font-bold text-gray-800 mb-2">紫砂·石瓢</h3>
                <p className="text-gray-500 mb-6">经典器型 永恒之美</p>
                <span className="border border-gray-800 px-6 py-2 text-sm hover:bg-gray-800 hover:text-white transition">查看专题</span>
             </div>
          </div>
          {products.slice(0, 8).map((product: any) => (
            <Link href={`/products/${product.id}`} key={product.id} className="bg-white border hover:border-red-800 hover:shadow-xl transition duration-300 group relative">
               <div className="aspect-square bg-gray-50 overflow-hidden m-2">
                  {product.images ? (
                    <img src={product.images} alt={product.title} className="w-full h-full object-contain group-hover:scale-105 transition"/>
                  ) : (
                    <div className="flex items-center justify-center h-full text-xs text-gray-300">暂无图片</div>
                  )}
               </div>
               <div className="p-3">
                  <p className="text-red-800 font-bold text-lg">¥{product.price}</p>
                  <h4 className="text-sm text-gray-700 truncate group-hover:text-red-800 mt-1">{product.title}</h4>
                  <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
                     <span>{product.artist?.name}</span>
                     <span>{product.stock > 0 ? '有货' : '售罄'}</span>
                  </div>
               </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 5. 泥料与壶型双栏模块 */}
      <section className="zisha-container mt-12 mb-12">
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* 左侧：泥料推荐 */}
            <div>
               <div className="flex justify-between items-end mb-4 border-b-2 border-red-800 pb-2">
                  <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                     <span className="text-red-800 mr-2">|</span> 
                     泥料推荐
                  </h2>
                  <Link href="#" className="text-sm text-gray-600 hover:text-red-800 mb-1">更多泥料 &gt;</Link>
               </div>
               <div className="bg-white border border-gray-200 p-4">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                     {featuredMaterials.map((item: any) => (
                        <div key={item.id} className="bg-gray-100 h-32 p-4 relative overflow-hidden cursor-pointer group">
                            <div className="relative z-10">
                                <h3 className="font-bold text-lg mb-1 text-red-900">{item.name}</h3>
                                <p className="text-xs text-gray-600">{item.description || '暂无描述'}</p>
                            </div>
                            {/* If coverImage exists, show it as bg or element */}
                            {item.coverImage ? (
                                <img src={item.coverImage} alt={item.name} className="absolute right-0 bottom-0 h-full object-contain opacity-50 group-hover:scale-110 transition duration-500" />
                            ) : (
                                <div className="absolute right-0 bottom-0 w-16 h-16 bg-red-200 rounded-full opacity-20 group-hover:scale-150 transition duration-500"></div>
                            )}
                        </div>
                     ))}
                     {featuredMaterials.length === 0 && <div className="col-span-2 text-center text-gray-400 py-4">暂无推荐泥料</div>}
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center text-sm">
                     {listMaterials.map((item: any) => (
                        <span key={item.id} className="bg-gray-50 py-2 hover:bg-red-800 hover:text-white cursor-pointer transition">{item.name}</span>
                     ))}
                  </div>
               </div>
            </div>

            {/* 右侧：壶型大全 */}
            <div>
               <div className="flex justify-between items-end mb-4 border-b-2 border-red-800 pb-2">
                  <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                     <span className="text-red-800 mr-2">|</span> 
                     壶型大全
                  </h2>
                  <Link href="#" className="text-sm text-gray-600 hover:text-red-800 mb-1">更多壶型 &gt;</Link>
               </div>
               <div className="bg-white border border-gray-200 p-4">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                     {featuredShapes.map((item: any) => (
                        <div key={item.id} className="bg-gray-100 h-32 p-4 relative overflow-hidden cursor-pointer group">
                            <div className="relative z-10">
                                <h3 className="font-bold text-lg mb-1 text-red-900">{item.name}</h3>
                                <p className="text-xs text-gray-600">{item.description || '暂无描述'}</p>
                            </div>
                            {item.coverImage ? (
                                <img src={item.coverImage} alt={item.name} className="absolute right-0 bottom-0 h-full object-contain opacity-50 group-hover:scale-110 transition duration-500" />
                            ) : (
                                <div className="absolute right-0 bottom-0 w-16 h-16 bg-blue-200 rounded-full opacity-20 group-hover:scale-150 transition duration-500"></div>
                            )}
                        </div>
                     ))}
                     {featuredShapes.length === 0 && <div className="col-span-2 text-center text-gray-400 py-4">暂无推荐壶型</div>}
                  </div>
                  <div className="grid grid-cols-5 gap-2 text-center text-sm">
                     {listShapes.map((item: any) => (
                        <span key={item.id} className="bg-gray-50 py-2 hover:bg-red-800 hover:text-white cursor-pointer transition">{item.name}</span>
                     ))}
                  </div>
               </div>
            </div>
         </div>
      </section>

      {/* 6. 紫砂学院与问答 */}
      <section className="zisha-container mb-12">
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* 左侧：紫砂学院 */}
            <div>
               <div className="flex justify-between items-end mb-4 border-b-2 border-red-800 pb-2">
                  <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                     <span className="text-red-800 mr-2">|</span> 
                     紫砂学院
                  </h2>
                  <div className="space-x-4 text-sm">
                     <Link href="#" className="text-gray-600 hover:text-red-800">新手</Link>
                     <Link href="#" className="text-gray-600 hover:text-red-800">鉴赏</Link>
                     <Link href="#" className="text-gray-600 hover:text-red-800">收藏</Link>
                     <Link href="#" className="text-gray-600 hover:text-red-800">更多 &gt;</Link>
                  </div>
               </div>
               <div className="bg-white border border-gray-200 p-4 flex gap-4">
                  {featuredArticle ? (
                     <>
                        <div className="w-48 h-32 bg-gray-100 flex-shrink-0 overflow-hidden">
                           {featuredArticle.cover ? <img src={featuredArticle.cover} alt={featuredArticle.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">头条图片</div>}
                        </div>
                        <div className="flex-1">
                           <h3 className="font-bold text-gray-800 text-lg mb-2 hover:text-red-800 cursor-pointer truncate">{featuredArticle.title}</h3>
                           <div className="text-xs text-gray-500 line-clamp-2 mb-3" dangerouslySetInnerHTML={{ __html: featuredArticle.content.replace(/<[^>]+>/g, '') }}></div>
                           <ul className="space-y-2 text-sm text-gray-600">
                              {listArticles.map((article: any) => (
                                 <li key={article.id} className="truncate hover:text-red-800 cursor-pointer">· {article.title}</li>
                              ))}
                           </ul>
                        </div>
                     </>
                  ) : (
                     <div className="w-full text-center py-8 text-gray-400">暂无文章数据</div>
                  )}
               </div>
            </div>

            {/* 右侧：紫砂问答 */}
            <div>
               <div className="flex justify-between items-end mb-4 border-b-2 border-red-800 pb-2">
                  <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                     <span className="text-red-800 mr-2">|</span> 
                     紫砂问答
                  </h2>
                  <Link href="#" className="text-sm text-gray-600 hover:text-red-800 mb-1">我要提问 &gt;</Link>
               </div>
               <div className="bg-white border border-gray-200 p-4">
                  {displayQuestions.length > 0 && (
                     <div className="flex gap-4 items-start mb-4 border-b border-dashed border-gray-100 pb-4">
                        <div className="w-10 h-10 bg-red-800 text-white rounded flex items-center justify-center font-bold flex-shrink-0">问</div>
                        <div>
                           <h3 className="font-bold text-gray-800 mb-1">{displayQuestions[0].question}</h3>
                           <p className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                              <span className="text-red-800 font-bold">答：</span>
                              {displayQuestions[0].answer}
                           </p>
                        </div>
                     </div>
                  )}
                  <ul className="space-y-3 text-sm text-gray-600">
                     {displayQuestions.slice(1).map((q: any) => (
                        <li key={q.id} className="flex gap-2">
                           <span className="bg-gray-200 text-xs px-1 text-gray-500">Q</span>
                           <span className="hover:text-red-800 cursor-pointer truncate">{q.question}</span>
                        </li>
                     ))}
                  </ul>
               </div>
            </div>
         </div>
      </section>

      {/* 7. 权威职称查询 */}
      <section className="zisha-container mb-12">
         <div className="bg-[url('https://www.zisha.com/themes/default/images/chaxun_bg.jpg')] bg-cover bg-center h-40 rounded-lg flex items-center justify-between px-12 shadow-md relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-red-900/90 to-transparent z-0"></div>
            <div className="relative z-10 text-white">
               <h2 className="text-3xl font-bold mb-2">宜兴紫砂艺人权威职称查询</h2>
               <p className="opacity-80">官方数据同步 · 拒绝假冒伪劣 · 放心购壶</p>
            </div>
            <div className="relative z-10 bg-white/10 backdrop-blur-sm p-4 rounded-lg flex gap-2">
               <input 
                  type="text" 
                  placeholder="请输入艺人姓名查询" 
                  className="bg-white text-gray-800 px-4 py-3 w-64 outline-none rounded"
               />
               <button className="bg-yellow-500 text-red-900 font-bold px-6 py-3 rounded hover:bg-yellow-400 transition">
                  立即查询
               </button>
            </div>
         </div>
      </section>

      {/* 8. 美壶鉴赏与壶友返图 */}
      <section className="zisha-container mb-12">
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* 左侧：美壶鉴赏 */}
            <div>
               <div className="flex justify-between items-end mb-4 border-b-2 border-red-800 pb-2">
                  <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                     <span className="text-red-800 mr-2">|</span> 
                     美壶鉴赏
                  </h2>
                  <div className="space-x-4 text-sm">
                     <Link href="#" className="text-gray-600 hover:text-red-800">名家佳作</Link>
                     <Link href="#" className="text-gray-600 hover:text-red-800">民间珍品</Link>
                     <Link href="#" className="text-gray-600 hover:text-red-800">更多 &gt;</Link>
                  </div>
               </div>
               <div className="bg-white border border-gray-200 p-4">
                  <div className="grid grid-cols-3 gap-4">
                     {masterpieces.length > 0 ? masterpieces.slice(0,3).map((item: any) => (
                        <div key={item.id} className="group cursor-pointer">
                           <div className="bg-gray-100 aspect-square mb-2 overflow-hidden">
                              {item.imageUrl ? (
                                 <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover group-hover:scale-110 transition duration-500" />
                              ) : (
                                 <div className="w-full h-full flex items-center justify-center text-xs text-gray-400 group-hover:scale-110 transition duration-500">鉴赏图</div>
                              )}
                           </div>
                           <h4 className="text-sm font-bold text-gray-800 group-hover:text-red-800 truncate">{item.title}</h4>
                           <p className="text-xs text-gray-500 mt-1">{item.description || '暂无描述'}</p>
                        </div>
                     )) : (
                        // Fallback
                        [1,2,3].map(i => (
                           <div key={i} className="group cursor-pointer">
                              <div className="bg-gray-100 aspect-square mb-2 overflow-hidden">
                                 <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">暂无鉴赏</div>
                              </div>
                              <h4 className="text-sm font-bold text-gray-800 group-hover:text-red-800 truncate">示例鉴赏 {i}</h4>
                           </div>
                        ))
                     )}
                  </div>
                  <ul className="mt-4 space-y-2 text-sm text-gray-600 border-t border-dashed pt-4">
                     {masterpieces.slice(3).map((item: any) => (
                        <li key={item.id} className="flex justify-between hover:text-red-800 cursor-pointer">
                           <span className="truncate w-3/4">· {item.title}</span>
                           <span className="text-xs text-gray-400">2025-01-01</span>
                        </li>
                     ))}
                  </ul>
               </div>
            </div>

            {/* 右侧：壶友返图 */}
            <div>
               <div className="flex justify-between items-end mb-4 border-b-2 border-red-800 pb-2">
                  <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                     <span className="text-red-800 mr-2">|</span> 
                     壶友返图
                  </h2>
                  <Link href="#" className="text-sm text-gray-600 hover:text-red-800 mb-1">我要晒图 &gt;</Link>
               </div>
               <div className="bg-white border border-gray-200 p-4">
                  <div className="grid grid-cols-2 gap-4">
                     {feedbacks.length > 0 ? feedbacks.slice(0,4).map((item: any) => (
                        <div key={item.id} className="flex gap-3 group cursor-pointer hover:bg-gray-50 p-2 rounded transition">
                           <div className="w-24 h-24 bg-gray-100 flex-shrink-0 overflow-hidden rounded">
                              {item.imageUrl ? (
                                 <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                              ) : (
                                 <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">返图</div>
                              )}
                           </div>
                           <div className="flex-1 flex flex-col justify-between py-1">
                              <div>
                                 <h4 className="text-sm font-bold text-gray-800 line-clamp-2 group-hover:text-red-800">{item.title}</h4>
                                 <p className="text-xs text-gray-500 mt-1">用户：{item.author || '匿名'}</p>
                              </div>
                              {item.description && <div className="text-xs text-red-800 bg-red-50 inline-block px-2 py-1 rounded w-max truncate max-w-full">
                                 {item.description}
                              </div>}
                           </div>
                        </div>
                     )) : (
                        // Fallback
                        [1,2,3,4].map(i => (
                           <div key={i} className="flex gap-3 group cursor-pointer hover:bg-gray-50 p-2 rounded transition">
                              <div className="w-24 h-24 bg-gray-100 flex-shrink-0 overflow-hidden rounded">
                                 <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">暂无返图</div>
                              </div>
                              <div className="flex-1 flex flex-col justify-between py-1">
                                 <div>
                                    <h4 className="text-sm font-bold text-gray-800 line-clamp-2 group-hover:text-red-800">示例返图描述...</h4>
                                    <p className="text-xs text-gray-500 mt-1">用户：示例</p>
                                 </div>
                              </div>
                           </div>
                        ))
                     )}
                  </div>
               </div>
            </div>
         </div>
      </section>
    </main>
  );
}
