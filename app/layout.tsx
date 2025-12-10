import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import CartWidget from './components/CartWidget';
import HeaderSearch from './components/HeaderSearch';

export const metadata: Metadata = {
  metadataBase: new URL('https://www.jinxizisha.com'),
  title: {
    template: '%s | 紫砂之家',
    default: '紫砂之家 - 宜兴紫砂壶正品交易平台',
  },
  description: "紫砂之家提供宜兴紫砂壶、名家壶、老壶等紫砂艺术品的展示与交易，拥有顾景舟、蒋蓉等大师作品。正品保证，大师手作。",
  keywords: ["紫砂壶", "宜兴紫砂", "名家紫砂", "顾景舟", "紫砂杯", "紫砂茶具", "紫砂壶价格"],
  openGraph: {
    title: '紫砂之家 - 宜兴紫砂壶正品交易平台',
    description: '紫砂之家提供宜兴紫砂壶、名家壶、老壶等紫砂艺术品的展示与交易。',
    url: 'https://www.jinxizisha.com',
    siteName: '紫砂之家',
    locale: 'zh_CN',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen flex flex-col bg-[#f5f5f5]">
        {/* Top Bar */}
        <div className="bg-[#f2f2f2] border-b border-gray-200 text-xs text-gray-600">
          <div className="zisha-container h-8 flex justify-between items-center">
            <div className="flex space-x-4">
              <span>您好，欢迎来到紫砂之家！</span>
              <Link href="#" className="hover:text-red-800">请登录</Link>
              <Link href="#" className="hover:text-red-800">免费注册</Link>
            </div>
            <div className="flex space-x-4">
              <Link href="#" className="hover:text-red-800">我的订单</Link>
              <Link href="#" className="hover:text-red-800">会员中心</Link>
              <span className="text-gray-300">|</span>
              <Link href="#" className="hover:text-red-800">客户服务</Link>
              <Link href="#" className="hover:text-red-800">网站导航</Link>
            </div>
          </div>
        </div>

        {/* Header Search Area */}
        <header className="bg-white py-6">
          <div className="zisha-container flex items-center justify-between">
            <Link href="/" className="text-4xl font-serif font-bold text-red-900 flex items-center gap-2 flex-shrink-0">
              <span className="bg-red-900 text-white w-10 h-10 flex items-center justify-center rounded text-2xl">紫</span>
              紫砂之家
            </Link>
            
            <HeaderSearch />

            <div className="flex items-center gap-4 flex-shrink-0">
               <div className="text-right hidden lg:block">
                 <p className="text-red-800 font-bold text-lg">400-000-0000</p>
                 <p className="text-xs text-gray-500">周一至周日 9:00-22:00</p>
               </div>
               <CartWidget />
            </div>
          </div>
        </header>

        {/* Main Navigation */}
        <nav className="bg-red-900 text-white border-t border-red-800">
          <div className="zisha-container">
             <div className="flex text-sm">
               {/* Section 1: Information & Tools */}
               <div className="flex-1 flex items-center space-x-6 py-3">
                  <Link href="/articles" className="font-bold hover:text-yellow-200">新闻</Link>
                  <Link href="/artists" className="font-bold hover:text-yellow-200">工艺师</Link>
                  <Link href="/knowledge?type=MATERIAL" className="font-bold hover:text-yellow-200">泥料</Link>
                  <Link href="/knowledge?type=SHAPE" className="font-bold hover:text-yellow-200">壶型</Link>
                  <Link href="/questions" className="font-bold hover:text-yellow-200">问答</Link>
                  <Link href="/titles" className="font-bold hover:text-yellow-200">职称查询</Link>
                  <Link href="/articles?type=KNOWLEDGE" className="font-bold hover:text-yellow-200">学院</Link>
                  <Link href="/products" className="font-bold hover:text-yellow-200">作品库</Link>
                  <Link href="/gallery?type=FEEDBACK" className="font-bold hover:text-yellow-200">返图</Link>
                  <Link href="#" className="font-bold hover:text-yellow-200">视频</Link>
                  <Link href="/articles?type=AUCTION" className="font-bold hover:text-yellow-200">拍卖纪录</Link>
               </div>

               {/* Section 2: Mall */}
               <div className="flex items-center space-x-6 px-8 border-l border-red-800 bg-red-950/30">
                  <span className="text-red-300 text-xs">商城:</span>
                  <Link href="/products" className="font-bold hover:text-yellow-200">紫砂</Link>
                  <Link href="#" className="font-bold hover:text-yellow-200">茶叶</Link>
               </div>

               {/* Section 3: Stores */}
               <div className="flex items-center px-8 border-l border-red-800 bg-red-950/50">
                  <Link href="/stores" className="font-bold hover:text-yellow-200">门店</Link>
               </div>
             </div>
          </div>
        </nav>

        {/* Main Content */}
        <div className="flex-grow">
            {children}
        </div>

        {/* Footer */}
        <footer className="bg-[#333] text-gray-400 pt-12 pb-6 mt-8 text-sm">
            <div className="zisha-container">
                {/* Service Icons */}
                <div className="grid grid-cols-4 gap-8 border-b border-gray-700 pb-10 mb-8 text-center">
                  <div className="flex flex-col items-center">
                    <span className="text-3xl mb-2 text-white">💯</span>
                    <h4 className="text-white font-bold mb-1">正品保证</h4>
                    <p className="text-xs">100% 原产地手工制作</p>
                  </div>
                  <div className="flex flex-col items-center">
                     <span className="text-3xl mb-2 text-white">📦</span>
                    <h4 className="text-white font-bold mb-1">15天退还</h4>
                    <p className="text-xs">15天无理由退换货</p>
                  </div>
                  <div className="flex flex-col items-center">
                     <span className="text-3xl mb-2 text-white">🚚</span>
                    <h4 className="text-white font-bold mb-1">免费配送</h4>
                    <p className="text-xs">支持货到付款 急速发货</p>
                  </div>
                  <div className="flex flex-col items-center">
                     <span className="text-3xl mb-2 text-white">🛡️</span>
                    <h4 className="text-white font-bold mb-1">无忧售后</h4>
                    <p className="text-xs">破损补寄 终身保修</p>
                  </div>
                </div>

                {/* Footer Links */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-8 mb-10">
                  <div>
                    <h5 className="text-white font-bold mb-4">新手指南</h5>
                    <ul className="space-y-2 text-xs">
                      <li><a href="#" className="hover:text-white">注册登录</a></li>
                      <li><a href="#" className="hover:text-white">购物流程</a></li>
                      <li><a href="#" className="hover:text-white">常见问题</a></li>
                    </ul>
                  </div>
                  <div>
                    <h5 className="text-white font-bold mb-4">支付方式</h5>
                    <ul className="space-y-2 text-xs">
                      <li><a href="#" className="hover:text-white">在线支付</a></li>
                      <li><a href="#" className="hover:text-white">银行汇款</a></li>
                      <li><a href="#" className="hover:text-white">货到付款</a></li>
                    </ul>
                  </div>
                  <div>
                    <h5 className="text-white font-bold mb-4">配送服务</h5>
                    <ul className="space-y-2 text-xs">
                      <li><a href="#" className="hover:text-white">验货签收</a></li>
                      <li><a href="#" className="hover:text-white">配送范围</a></li>
                      <li><a href="#" className="hover:text-white">运费说明</a></li>
                    </ul>
                  </div>
                  <div>
                    <h5 className="text-white font-bold mb-4">关于我们</h5>
                    <ul className="space-y-2 text-xs">
                      <li><a href="#" className="hover:text-white">了解我们</a></li>
                      <li><a href="#" className="hover:text-white">联系我们</a></li>
                      <li><a href="#" className="hover:text-white">加入我们</a></li>
                    </ul>
                  </div>
                  <div>
                    <h5 className="text-white font-bold mb-4">关注我们</h5>
                    <div className="w-24 h-24 bg-white flex items-center justify-center text-gray-800 text-xs">
                      二维码
                    </div>
                  </div>
                </div>
                
                <div className="text-center border-t border-gray-700 pt-6 text-xs">
                    <p>&copy; 2025 紫砂之家. All rights reserved. ICP备案号：苏ICP备XXXXXX号</p>
                </div>
            </div>
        </footer>
      </body>
    </html>
  );
}
