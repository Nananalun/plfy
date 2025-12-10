import Link from 'next/link';

// 模拟数据（实际应从数据库获取或定义常量）
// 这里仅作演示，后续需替换为真实API数据
const materialCategories = [
  { 
    key: 'ZINI', 
    name: '紫泥', 
    desc: '紫泥，为较常见之典型紫砂泥；良者寡，而劣者多，呈紫棕色，玩家惯呼"黑紫泥"，为最广泛市场接受的泥料之一。', 
    subtypes: ['底槽清', '清水泥', '紫泥', '黑泥', '特种紫泥'] 
  },
  { 
    key: 'HONGNI', 
    name: '红泥', 
    desc: '红泥，热淋变色，烧成后色泽红艳，光洁明亮。', 
    subtypes: ['朱泥', '大红袍', '红皮龙', '降坡泥', '红泥'] 
  },
  { 
    key: 'DUANNI', 
    name: '段泥', 
    desc: '段泥，原矿称之“团泥”，产于宜兴黄龙山，原矿外观近白色，夹深绿斑点；除可当泥胚製陶外，亦常去杂质加工成“砂”用。', 
    subtypes: ['本山段泥', '黄金段', '芝麻段', '老段泥', '白泥'] 
  },
  { 
    key: 'LVNI', 
    name: '绿泥', 
    desc: '绿泥，又称“本山绿泥”，古名“梨皮泥”。矿土呈淡绿色层片状，烧成陶后现梨皮冻色（米黄色）。', 
    subtypes: ['本山绿泥', '墨绿泥', '民国绿', '青灰泥', '松花泥'] 
  },
  { 
    key: 'RARE', 
    name: '稀有', 
    desc: '稀有泥料，指存世量极少，或者开采难度极大的珍稀紫砂矿料。', 
    subtypes: ['天青泥', '红卫泥', '龙血砂', '黑星土', '桃花泥'] 
  },
  { 
    key: 'MIXED', 
    name: '拼泥', 
    desc: '拼配泥料，是指用不同颜色的泥料混合调制，或为了追求某种色泽效果而进行的人工调配。', 
    subtypes: ['调砂', '铺砂', '抽角', '绞泥', '拼紫'] 
  }
];

// 导航项
const navItems = [
  { name: "泥料首页", value: "" },
  { name: "泥料大全", value: "ALL" },
  { name: "紫泥", value: "ZINI" },
  { name: "红泥", value: "HONGNI" },
  { name: "段泥", value: "DUANNI" },
  { name: "绿泥", value: "LVNI" },
  { name: "稀有", value: "RARE" },
  { name: "拼泥", value: "MIXED" }
];

// 壶型数据
const shapeCategories = [
  {
    key: 'ROUND',
    name: '圆器',
    desc: '圆器是紫砂壶中最常见的器型，讲究“圆、稳、匀、正”，柔中寓刚，刚柔并济。圆器造型珠圆玉润，比例协调，转折圆润。',
    subtypes: ['西施', '石瓢', '仿古', '掇球', '德钟', '井栏', '汉铎', '茄段', '秦权', '虚扁']
  },
  {
    key: 'SQUARE',
    name: '方器',
    desc: '方器造型变化众多，讲究线条流畅，轮廓分明，平稳庄重。方中寓圆，圆中寓方，要求线面挺括，轮廓清晰。',
    subtypes: ['四方', '六方', '八方', '升方', '砖方', '亚明四方', '魁方', '汉方', '僧帽', '传炉']
  },
  {
    key: 'BEAM',
    name: '提梁器',
    desc: '提梁壶是指以提梁为把的紫砂壶，造型独特，式样丰富，有硬提梁和软提梁之分。提梁与壶身的虚实对比，构成了独特的空间美感。',
    subtypes: ['提梁', '鹧鸪提梁', '提壁', '吴经提梁', '大彬提梁', '曼生提梁', '石瓢提梁', '扁竹提梁', '雨露天星', '洋桶']
  },
  {
    key: 'RIB',
    name: '颈纹器',
    desc: '颈纹器（筋纹器）是利用线条的起伏变化，制作出具有韵律美的紫砂壶型。讲究上下印对，身盖齐同，纹理清晰，深浅自如。',
    subtypes: ['菊蕾', '菱花', '葵仿古', '合菱', '筋囊', '瓜棱', '半菊', '水仙', '梅花', '海棠']
  }
];

// 壶型导航项
const shapeNavItems = [
  { name: "壶型首页", value: "" },
  { name: "壶型大全", value: "ALL" },
  { name: "圆器", value: "ROUND" },
  { name: "方器", value: "SQUARE" },
  { name: "花器", value: "FLOWER" },
  { name: "提梁器", value: "BEAM" },
  { name: "颈纹器", value: "RIB" },
  { name: "曼生十八式", value: "MANSHENG" }
];

async function getKnowledge(type: string) {
  try {
    // Note: backend API might need to be updated to support 'category' filtering for Knowledge
    // For now, we assume existing API or this is a placeholder
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/knowledge?type=${type}`, { cache: 'no-store' });
    return res.ok ? await res.json() : [];
  } catch (error) {
    return [];
  }
}

export default async function KnowledgePage({ searchParams }: { searchParams: Promise<{ type?: string; category?: string }> }) {
  const { type, category } = await searchParams;
  const currentMainType = type || 'MATERIAL'; // MATERIAL or SHAPE
  const currentCategory = category || '';

  // 如果是壶型页面 (SHAPE)
  if (currentMainType === 'SHAPE') {
  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="zisha-container">
             {/* Breadcrumb */}
             <div className="text-xs text-gray-500 mb-6">
          <Link href="/" className="hover:text-red-800">首页</Link>
          <span className="mx-2">&gt;</span>
              <span className="text-gray-800">壶型百科</span>
        </div>

            {/* Navigation Bar */}
            <div className="bg-[#F5F0EB] mb-8">
               <div className="flex flex-wrap">
                  {shapeNavItems.map(item => (
              <Link 
                       key={item.name}
                       href={`/knowledge?type=SHAPE${item.value ? `&category=${item.value}` : ''}`}
                       className={`px-6 py-3 text-sm font-bold transition-colors ${
                           (currentCategory === item.value) 
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

            {/* Content */}
            {currentCategory === '' ? (
                // --- SHAPE HOME ---
                <div>
                    {shapeCategories.map(cat => (
                        <div key={cat.key} className="mb-12 bg-white p-6 shadow-sm">
                          <div className="flex justify-between items-end mb-6 border-b border-gray-100 pb-4">
                              <div>
                                  <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                                      <span className="w-2 h-6 bg-red-800 mr-3"></span>
                                      {cat.name}赏析
                                  </h2>
                                  <p className="text-gray-500 text-sm mt-2 max-w-3xl">{cat.desc}</p>
                              </div>
                              <Link href={`/knowledge?type=SHAPE&category=${cat.key}`} className="text-sm text-gray-500 hover:text-red-800 flex-shrink-0">
                                  查看更多{cat.name} &gt;
              </Link>
                          </div>
                          
                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                              {cat.subtypes.map((sub: string, idx: number) => (
              <Link 
                                    key={idx} 
                                    href={`/products?shape=${encodeURIComponent(sub)}`} // Link to products filtered by shape
                                    className="group block bg-gray-50 hover:bg-red-50 border border-transparent hover:border-red-200 transition rounded overflow-hidden"
                                  >
                                      <div className="aspect-square bg-gray-200 relative">
                                          {/* Placeholder for shape image */}
                                          <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                                              {sub}图片
                                          </div>
                                      </div>
                                      <div className="p-3 text-center">
                                          <h3 className="font-bold text-gray-700 group-hover:text-red-800 text-sm">{sub}</h3>
                                      </div>
              </Link>
                              ))}
           </div>
        </div>
                    ))}
                </div>
            ) : (
                // --- SHAPE LIST VIEW (Placeholder) ---
                <div className="bg-white p-12 text-center text-gray-500">
                    <h2 className="text-2xl font-bold mb-4">{shapeNavItems.find(n => n.value === currentCategory)?.name}列表</h2>
                    <p>此处展示该分类下的所有壶型详细列表...</p>
                    <div className="mt-8 grid grid-cols-2 md:grid-cols-5 gap-6">
                        {/* Mock items for list view if needed, or leave empty */}
                </div>
              </div>
          )}
        </div>
        </div>
      );
  }

  // --- MATERIAL PAGE LOGIC ---

  // Component for Material Section
  const MaterialSection = ({ cat }: { cat: any }) => (
      <div className="mb-12 bg-white p-6 shadow-sm">
          <div className="flex justify-between items-end mb-6 border-b border-gray-100 pb-4">
              <div>
                  <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                      <span className="w-2 h-6 bg-red-800 mr-3"></span>
                      {cat.name}赏析
                  </h2>
                  <p className="text-gray-500 text-sm mt-2 max-w-3xl">{cat.desc}</p>
              </div>
              <Link href={`/knowledge?type=MATERIAL&category=${cat.key}`} className="text-sm text-gray-500 hover:text-red-800 flex-shrink-0">
                  查看更多{cat.name} &gt;
              </Link>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
              {cat.subtypes.map((sub: string, idx: number) => (
                  <Link 
                    key={idx} 
                    href={`/products?material=${encodeURIComponent(sub)}`} // 点击跳转到作品库筛选
                    className="group block bg-gray-50 hover:bg-red-50 border border-transparent hover:border-red-200 transition rounded overflow-hidden"
                  >
                      <div className="aspect-square bg-gray-200 relative">
                          {/* Placeholder for material texture image */}
                          <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                              {sub}图片
                          </div>
                      </div>
                      <div className="p-3 text-center">
                          <h3 className="font-bold text-gray-700 group-hover:text-red-800 text-sm">{sub}</h3>
                      </div>
                  </Link>
              ))}
          </div>
      </div>
  );

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="zisha-container">
        {/* Breadcrumb */}
        <div className="text-xs text-gray-500 mb-6">
          <Link href="/" className="hover:text-red-800">首页</Link>
          <span className="mx-2">&gt;</span>
          <span className="text-gray-800">泥料百科</span>
        </div>

        {/* Navigation Bar */}
        <div className="bg-[#F5F0EB] mb-8">
           <div className="flex flex-wrap">
              {navItems.map(item => {
                 const isActive = currentCategory === item.value;
                 // If item.value is empty, it's Home, so we check if category is empty
                 // If item.value is ALL, it's All List
                 // Note: URL logic needs to match
                 return (
                    <Link 
                      key={item.name}
                      href={`/knowledge?type=MATERIAL${item.value ? `&category=${item.value}` : ''}`}
                      className={`px-6 py-3 text-sm font-bold transition-colors ${
                          (currentCategory === item.value) 
                          ? 'bg-[#8b0000] text-white' 
                          : 'text-[#5c3b1e] hover:text-[#8b0000] hover:bg-red-50'
                      }`}
                    >
                       {item.name}
                    </Link>
                 );
              })}
           </div>
           <div className="h-1 bg-[#8b0000] w-full"></div>
        </div>

        {/* Content Area */}
        {currentCategory === '' ? (
            // --- MATERIAL HOME ---
            <div>
                {materialCategories.map(cat => (
                    <MaterialSection key={cat.key} cat={cat} />
                ))}
            </div>
        ) : (
            // --- LIST VIEW (Placeholder for now) ---
            <div className="bg-white p-12 text-center text-gray-500">
                <h2 className="text-2xl font-bold mb-4">{navItems.find(n => n.value === currentCategory)?.name}列表</h2>
                <p>此处展示该分类下的所有泥料详细列表...</p>
                {/* You would map through real data here */}
            </div>
        )}
        
      </div>
    </div>
  );
}


