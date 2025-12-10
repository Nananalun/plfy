'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

// 定义筛选选项
const filters = {
  category: [
    { label: "全部", value: "" },
    { label: "紫砂壶", value: "1" }, // 假设 ID 1
    { label: "建盏", value: "2" },
    { label: "茶叶", value: "3" },
  ],
  material: [
    { label: "全部", value: "" },
    { label: "紫泥", value: "紫泥" },
    { label: "朱泥", value: "朱泥" },
    { label: "段泥", value: "段泥" },
    { label: "绿泥", value: "绿泥" },
    { label: "降坡泥", value: "降坡泥" },
  ],
  capacity: [
    { label: "全部", value: "" },
    { label: "100cc以下", value: "100cc以下" },
    { label: "100-200cc", value: "100-200cc" },
    { label: "200-300cc", value: "200-300cc" },
    { label: "300cc以上", value: "300cc以上" },
  ],
  shape: [
    { label: "全部", value: "" },
    { label: "石瓢", value: "石瓢" },
    { label: "西施", value: "西施" },
    { label: "供春", value: "供春" },
    { label: "仿古", value: "仿古" },
  ]
};

export default function ProductsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // 获取当前 URL 参数
  const currentCategory = searchParams.get('categoryId') || '';
  const currentMaterial = searchParams.get('material') || '';
  const currentCapacity = searchParams.get('capacity') || '';
  const currentShape = searchParams.get('shape') || '';

  // 更新筛选条件
  const handleFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/products?${params.toString()}`);
  };

  // 监听 URL 变化并获取数据
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const query = new URLSearchParams(searchParams.toString()).toString();
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/products?${query}`, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          setProducts(data);
        } else {
          setProducts([]);
        }
      } catch (error) {
        console.error(error);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [searchParams]);

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="zisha-container">
        
        {/* Breadcrumb */}
        <div className="text-xs text-gray-500 mb-4">
          <Link href="/" className="hover:text-red-800">首页</Link>
          <span className="mx-2">&gt;</span>
          <span className="text-gray-800">选壶中心</span>
        </div>

        {/* Filter Block */}
        <div className="bg-white border border-gray-200 p-6 mb-6 text-sm">
           <div className="space-y-4">
              {/* Category Filter */}
              <div className="flex items-start">
                 <span className="text-gray-500 w-20 pt-1 font-bold">分类：</span>
                 <div className="flex-1 flex flex-wrap gap-3">
                    {filters.category.map((item) => (
                       <span 
                          key={item.label} 
                          onClick={() => handleFilter('categoryId', item.value)}
                          className={`cursor-pointer px-2 py-1 rounded ${currentCategory === item.value ? 'bg-red-800 text-white' : 'hover:text-red-800'}`}
                       >
                          {item.label}
                       </span>
                    ))}
                 </div>
              </div>
              <div className="border-t border-dashed border-gray-100 my-2"></div>
              
              {/* Material Filter */}
              <div className="flex items-start">
                 <span className="text-gray-500 w-20 pt-1 font-bold">泥料：</span>
                 <div className="flex-1 flex flex-wrap gap-3">
                    {filters.material.map((item) => (
                       <span 
                          key={item.label} 
                          onClick={() => handleFilter('material', item.value)}
                          className={`cursor-pointer px-2 py-1 rounded ${currentMaterial === item.value ? 'bg-red-800 text-white' : 'hover:text-red-800'}`}
                       >
                          {item.label}
                       </span>
                    ))}
                 </div>
              </div>
              <div className="border-t border-dashed border-gray-100 my-2"></div>

              {/* Capacity Filter */}
              <div className="flex items-start">
                 <span className="text-gray-500 w-20 pt-1 font-bold">容量：</span>
                 <div className="flex-1 flex flex-wrap gap-3">
                    {filters.capacity.map((item) => (
                       <span 
                          key={item.label} 
                          onClick={() => handleFilter('capacity', item.value)}
                          className={`cursor-pointer px-2 py-1 rounded ${currentCapacity === item.value ? 'bg-red-800 text-white' : 'hover:text-red-800'}`}
                       >
                          {item.label}
                       </span>
                    ))}
                 </div>
              </div>
              <div className="border-t border-dashed border-gray-100 my-2"></div>

              {/* Shape Filter */}
              <div className="flex items-start">
                 <span className="text-gray-500 w-20 pt-1 font-bold">壶型：</span>
                 <div className="flex-1 flex flex-wrap gap-3">
                    {filters.shape.map((item) => (
                       <span 
                          key={item.label} 
                          onClick={() => handleFilter('shape', item.value)}
                          className={`cursor-pointer px-2 py-1 rounded ${currentShape === item.value ? 'bg-red-800 text-white' : 'hover:text-red-800'}`}
                       >
                          {item.label}
                       </span>
                    ))}
                 </div>
              </div>
           </div>
        </div>

        {/* Sort Toolbar */}
        <div className="bg-white border border-gray-200 p-3 mb-6 flex items-center text-sm">
           <span className="mr-6 font-bold text-red-800 border-b-2 border-red-800 pb-3 -mb-3">综合排序</span>
           <span className="mr-6 cursor-pointer hover:text-red-800">销量 &darr;</span>
           <span className="mr-6 cursor-pointer hover:text-red-800">价格 &uarr;&darr;</span>
           <span className="mr-6 cursor-pointer hover:text-red-800">新品 &darr;</span>
           <div className="ml-auto text-gray-500">
              共 <span className="text-red-800 font-bold">{products.length}</span> 件商品
           </div>
        </div>

        {/* Product Grid */}
        {loading ? (
           <div className="py-20 text-center text-gray-500">加载中...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {products.map((product: any) => {
               // Parse images JSON
               let mainImage = '';
               try {
                  const urls = JSON.parse(product.images);
                  mainImage = Array.isArray(urls) && urls.length > 0 ? urls[0] : product.images;
               } catch(e) {
                  mainImage = product.images;
               }

               return (
                 <Link href={`/products/${product.id}`} key={product.id} className="bg-white border hover:border-red-800 hover:shadow-xl transition duration-300 group p-3">
                    <div className="aspect-square bg-gray-50 overflow-hidden mb-3 relative">
                       {mainImage ? (
                         <img src={mainImage} alt={product.title} className="w-full h-full object-contain group-hover:scale-105 transition"/>
                       ) : (
                         <div className="w-full h-full flex items-center justify-center text-gray-300">暂无图片</div>
                       )}
                       {product.stock < 5 && product.stock > 0 && (
                         <div className="absolute top-0 left-0 bg-red-600 text-white text-xs px-2 py-1">仅剩{product.stock}件</div>
                       )}
                    </div>
                    <p className="text-red-800 font-bold text-lg mb-1">¥{product.price}</p>
                    <h3 className="text-sm font-normal text-gray-800 truncate hover:text-red-800 hover:underline mb-2">{product.title}</h3>
                    <div className="flex items-center justify-between text-xs text-gray-500 border-t border-dashed pt-2">
                       <span className="flex items-center gap-1">
                          <span className="w-4 h-4 rounded-full bg-gray-200 inline-block overflow-hidden">
                             {product.artist?.avatar && <img src={product.artist.avatar} className="w-full h-full object-cover"/>}
                          </span>
                          {product.artist?.name}
                       </span>
                       <span>{product.artist?.title || "艺人"}</span>
                    </div>
                 </Link>
               );
            })}
          </div>
        )}

        {!loading && products.length === 0 && (
           <div className="py-20 text-center text-gray-500 bg-white border">
              没有找到符合条件的商品，请尝试其他筛选条件。
           </div>
        )}
      </div>
    </div>
  );
}
