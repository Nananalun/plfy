import Link from 'next/link';

export default function StoresPage() {
  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="zisha-container">
        <div className="text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-red-800">首页</Link>
          <span className="mx-2">&gt;</span>
          <span className="text-gray-800">线下门店</span>
        </div>

        <h1 className="text-3xl font-bold text-gray-800 mb-8 border-l-4 border-red-800 pl-4">
          全国门店分布
        </h1>

        <div className="bg-white p-12 text-center border border-gray-200">
           <div className="text-6xl mb-4">🏪</div>
           <h2 className="text-xl font-bold text-gray-800 mb-2">全国 30+ 城市直营门店</h2>
           <p className="text-gray-500 mb-8">上海 · 北京 · 深圳 · 广州 · 杭州 · 天津 · 南京 · 苏州 ...</p>
           <button className="bg-red-800 text-white px-8 py-3 rounded hover:bg-red-900 transition">
              查找离我最近的门店
           </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
           {['上海总店', '北京分店', '深圳分店', '广州分店', '杭州分店', '南京分店'].map((store, i) => (
              <div key={i} className="bg-white p-6 border border-gray-200 hover:shadow-lg transition cursor-pointer">
                 <h3 className="font-bold text-lg text-gray-800 mb-2">{store}</h3>
                 <p className="text-sm text-gray-500 mb-1">地址：XX市XX区XX路888号</p>
                 <p className="text-sm text-gray-500">电话：021-12345678</p>
              </div>
           ))}
        </div>
      </div>
    </div>
  );
}

