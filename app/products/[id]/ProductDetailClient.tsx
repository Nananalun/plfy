'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

// Inquiry Modal Component
function InquiryModal({ isOpen, onClose, product, coverImage }: { isOpen: boolean; onClose: () => void; product: any; coverImage: string }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
            <div className="bg-white w-[600px] rounded shadow-lg overflow-hidden relative">
                <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600">
                    ✕
                </button>
                <div className="bg-red-800 text-white p-4">
                    <h3 className="text-lg font-bold">快速询价</h3>
                    <p className="text-xs opacity-80">专业顾问将在10分钟内回复您</p>
                </div>
                <div className="p-6 flex gap-6">
                    {/* Left: Contact Info */}
                    <div className="w-1/3 text-center border-r border-gray-100 pr-6">
                        <div className="w-32 h-32 bg-gray-100 mx-auto mb-3 flex items-center justify-center text-xs text-gray-400">
                            二维码
                        </div>
                        <p className="text-xs text-gray-500 mb-4">扫一扫添加专属顾问</p>
                        <div className="bg-red-50 text-red-800 py-2 rounded font-bold text-lg">
                            400-123-4567
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1">7x24小时咨询热线</p>
                    </div>

                    {/* Right: Inquiry Form */}
                    <div className="flex-1">
                        <div className="bg-gray-50 p-3 rounded mb-4 flex gap-3">
                            <div className="w-12 h-12 bg-white border flex-shrink-0 overflow-hidden">
                                {coverImage ? (
                                    <img src={coverImage} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-gray-200" />
                                )}
                            </div>
                            <div className="overflow-hidden">
                                <div className="text-sm font-bold truncate">{product.title}</div>
                                <div className="text-xs text-gray-500">作者：{product.artist?.name}</div>
                            </div>
                        </div>
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            alert('提交成功！顾问稍后会联系您。');
                            onClose();
                        }}>
                            <div className="mb-4">
                                <label className="block text-sm text-gray-700 mb-1">您的手机号码</label>
                                <input 
                                    type="tel" 
                                    placeholder="请输入手机号码" 
                                    className="w-full border border-gray-300 p-2 rounded focus:border-red-800 focus:outline-none"
                                    required
                                />
                            </div>
                            <button type="submit" className="w-full bg-red-800 text-white py-2 rounded hover:bg-red-900 transition">
                                立即询价
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Image Gallery Component
function ImageGallery({ images, title }: { images: string[], title: string }) {
    const [selectedImage, setSelectedImage] = useState(images[0]);

    useEffect(() => {
        if (images.length > 0) {
            setSelectedImage(images[0]);
        }
    }, [images]);

    return (
        <div>
            <div className="bg-white border rounded-lg p-2 mb-4">
                <div className="aspect-square bg-gray-100 relative flex items-center justify-center overflow-hidden">
                    {selectedImage ? (
                        <img 
                            src={selectedImage} 
                            alt={title} 
                            className="w-full h-full object-contain transition-opacity duration-300"
                        />
                    ) : (
                        <span className="text-gray-400">暂无图片</span>
                    )}
                </div>
            </div>
            {/* Thumbnails */}
            {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                    {images.map((img, idx) => (
                        <div 
                            key={idx} 
                            onClick={() => setSelectedImage(img)}
                            className={`w-20 h-20 border cursor-pointer p-1 flex-shrink-0 bg-white transition-all ${selectedImage === img ? 'border-red-800 ring-1 ring-red-800 opacity-100' : 'border-gray-200 hover:border-red-300 opacity-70 hover:opacity-100'}`}
                        >
                            <img src={img} className="w-full h-full object-contain"/>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function ProductDetailClient({ product, imageList }: { product: any, imageList: string[] }) {
  const [isInquiryOpen, setIsInquiryOpen] = useState(false);

  return (
    <div className="bg-gray-50 min-h-screen pb-12">
      <div className="zisha-container py-6">
        {/* Breadcrumb */}
        <div className="text-xs text-gray-500 mb-6">
          <Link href="/" className="hover:text-red-800">首页</Link>
          <span className="mx-2">&gt;</span>
          <Link href="/products" className="hover:text-red-800">选壶中心</Link>
          <span className="mx-2">&gt;</span>
          <span className="text-gray-800">{product.title}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
           {/* Left: Images */}
           <div className="lg:col-span-5">
              <ImageGallery images={imageList} title={product.title} />
           </div>

           {/* Center: Info */}
           <div className="lg:col-span-5 space-y-6">
              <h1 className="text-2xl font-bold text-gray-900">{product.title}</h1>
              
              <div className="bg-red-50 p-4 rounded text-red-900 text-sm">
                 <span className="font-bold border border-red-800 px-1 mr-2 text-xs">严选</span>
                 【紫砂之家】承诺：所售作品均为原矿紫砂，老师手工制作，包真包鉴定！
              </div>

              <div className="bg-[#fcfafa] p-6">
                 <div className="flex items-baseline gap-2 mb-4">
                    <span className="text-gray-500 text-sm">价格：</span>
                    <span className="text-3xl font-bold text-red-700">¥{product.price}</span>
                 </div>
                 <div className="flex items-center gap-2 mb-4">
                    <span className="text-gray-500 text-sm">服务：</span>
                    <div className="flex gap-3 text-xs text-gray-600">
                       <span className="flex items-center"><i className="w-1 h-1 bg-red-800 rounded-full mr-1"></i>正品保证</span>
                       <span className="flex items-center"><i className="w-1 h-1 bg-red-800 rounded-full mr-1"></i>15天退换</span>
                       <span className="flex items-center"><i className="w-1 h-1 bg-red-800 rounded-full mr-1"></i>免费配送</span>
                    </div>
                 </div>
                 
                 {/* Product Specs */}
                 <div className="border-t border-dashed border-gray-200 pt-4 grid grid-cols-2 gap-y-2 text-sm">
                    <div><span className="text-gray-500">作者：</span><Link href={`/artists/${product.artistId}`} className="text-blue-600 hover:underline">{product.artist?.name}</Link></div>
                    <div><span className="text-gray-500">编号：</span>{product.id}10086</div>
                    <div><span className="text-gray-500">泥料：</span>{product.material || '原矿紫泥'}</div>
                    <div><span className="text-gray-500">容量：</span>{product.capacity || '未录入'}</div>
                    <div><span className="text-gray-500">壶型：</span>{product.shape || '未录入'}</div>
                    <div><span className="text-gray-500">库存：</span>{product.stock > 0 ? '现货' : '预定'}</div>
                 </div>
              </div>

              <div className="flex gap-4 pt-4">
                  <button 
                    onClick={() => setIsInquiryOpen(true)}
                    className="flex-1 bg-red-800 text-white h-12 rounded font-bold hover:bg-red-900 transition shadow-lg flex flex-col items-center justify-center"
                  >
                      <span className="text-base">我要询价</span>
                      <span className="text-[10px] font-normal opacity-80">10分钟内回复</span>
                  </button>
                  <button 
                    onClick={() => alert('优惠券领取成功！')}
                    className="flex-1 border border-red-800 text-red-800 h-12 rounded font-bold hover:bg-red-50 transition flex flex-col items-center justify-center"
                  >
                      <span className="text-base">获取抵扣券</span>
                      <span className="text-[10px] font-normal opacity-80">最高抵扣500元</span>
                  </button>
              </div>
           </div>

           {/* Right: Artist Card */}
           <div className="lg:col-span-2">
              <div className="bg-white border border-gray-200 p-4 text-center sticky top-24">
                 <h3 className="font-bold text-gray-800 mb-4 border-b pb-2">作者简介</h3>
                 <Link href={`/artists/${product.artistId}`} className="block group">
                    <div className="w-20 h-20 mx-auto bg-gray-100 rounded-full overflow-hidden mb-3">
                       {product.artist?.avatar ? (
                          <img src={product.artist.avatar} className="w-full h-full object-cover group-hover:scale-110 transition"/>
                       ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">Avatar</div>
                       )}
                    </div>
                    <div className="font-bold text-lg mb-1 group-hover:text-red-800">{product.artist?.name}</div>
                    <div className="text-xs bg-orange-100 text-orange-800 inline-block px-2 py-1 rounded mb-3">{product.artist?.title || "艺人"}</div>
                 </Link>
                 <div className="text-xs text-gray-500 text-left line-clamp-4 mb-4">
                    {product.artist?.bio || "暂无简介..."}
                 </div>
                 <Link href={`/artists/${product.artistId}`} className="block w-full border border-gray-300 text-gray-600 text-xs py-2 rounded hover:border-red-800 hover:text-red-800">
                    查看全部作品
                 </Link>
              </div>
           </div>
        </div>

        {/* Details Section */}
        <div className="mt-12 grid grid-cols-1 lg:grid-cols-12 gap-8">
           <div className="lg:col-span-9">
              <div className="bg-white border border-gray-200">
                 <div className="border-b bg-gray-50 px-6 py-3 font-bold text-red-800 border-t-2 border-t-red-800">
                    商品详情
                 </div>
                 <div className="p-8 min-h-[400px]">
                    <div className="prose max-w-none mx-auto">
                       {product.description ? (
                          <p className="whitespace-pre-line">{product.description}</p>
                       ) : (
                          <div className="text-center text-gray-400 py-12">暂无详细图文介绍</div>
                       )}
                       {/* Show all images in detail body */}
                       <div className="mt-8 space-y-4 text-center">
                          {imageList.map((img, idx) => (
                             <img key={idx} src={img} className="max-w-full h-auto mx-auto border" />
                          ))}
                       </div>
                    </div>
                 </div>
              </div>
           </div>
           
           {/* Right Sidebar: Hot Products */}
           <div className="lg:col-span-3 hidden lg:block">
               <div className="bg-white border border-gray-200">
                  <div className="bg-gray-50 px-4 py-3 font-bold text-gray-800 border-b">
                     热门推荐
                  </div>
                  <div className="p-4 space-y-4">
                     {/* Mock Hot Products */}
                     {[1,2,3].map(i => (
                        <div key={i} className="flex gap-3 cursor-pointer group">
                           <div className="w-20 h-20 bg-gray-100 flex-shrink-0"></div>
                           <div>
                              <div className="text-sm line-clamp-2 group-hover:text-red-800">宜兴原矿紫砂壶 名家全手工</div>
                              <div className="text-red-800 font-bold mt-1">¥2800</div>
                           </div>
                        </div>
                     ))}
                  </div>
               </div>
           </div>
        </div>

        {/* Modals */}
        <InquiryModal 
            isOpen={isInquiryOpen} 
            onClose={() => setIsInquiryOpen(false)} 
            product={product}
            coverImage={imageList[0]}
        />

      </div>
    </div>
  );
}
