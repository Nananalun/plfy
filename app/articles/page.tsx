import Link from 'next/link';

async function getArticles(type?: string) {
  try {
    const url = type ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/articles?type=${type}` : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000') + '/articles';
    const res = await fetch(url, { cache: 'no-store' });
    return res.ok ? await res.json() : [];
  } catch (error) {
    return [];
  }
}

// Section Component
function ArticleSection({ title, articles, moreLink }: { title: string, articles: any[], moreLink: string }) {
    const firstArticle = articles[0];
    const otherArticles = articles.slice(1);

    return (
        <div className="mb-12">
            <div className="flex justify-between items-end mb-6 border-b border-gray-200 pb-2">
                <h2 className="text-2xl font-bold text-gray-800 border-l-4 border-red-800 pl-3 leading-none">
                    {title}
                </h2>
                <Link href={moreLink} className="text-sm text-gray-500 hover:text-red-800">更多 &gt;</Link>
            </div>
            {articles.length > 0 ? (
                <div className="flex flex-col md:flex-row gap-6 h-64">
                    {/* Left: Hero Article */}
                    {firstArticle && (
                        <Link href={`/articles/${firstArticle.id}`} className="md:w-5/12 relative group block overflow-hidden rounded-sm">
                            <div className="w-full h-full bg-gray-200">
                                {firstArticle.cover ? (
                                    <img src={firstArticle.cover} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" alt={firstArticle.title} />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-400">暂无图片</div>
                                )}
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 pt-12">
                                <h3 className="text-white font-bold text-lg truncate">{firstArticle.title}</h3>
                            </div>
                        </Link>
                    )}

                    {/* Right: List */}
                    <div className="flex-1 bg-white p-4 border border-gray-100 rounded-sm">
                         <ul className="space-y-4 h-full flex flex-col justify-center">
                            {otherArticles.map((article) => (
                                <li key={article.id} className="border-b border-dashed border-gray-200 pb-2 last:border-0 last:pb-0">
                                    <Link href={`/articles/${article.id}`} className="flex items-center text-gray-700 hover:text-red-800 group">
                                        <span className="w-1.5 h-1.5 bg-gray-300 rounded-full mr-3 group-hover:bg-red-800 transition-colors"></span>
                                        <span className="truncate flex-1 font-medium">{article.title}</span>
                                        <span className="text-xs text-gray-400 ml-2 flex-shrink-0">{new Date(article.createdAt).toLocaleDateString()}</span>
                                    </Link>
                                </li>
                            ))}
                            {otherArticles.length === 0 && (
                                <li className="text-gray-400 text-sm">暂无更多相关文章</li>
                            )}
                         </ul>
                        </div>
                </div>
            ) : (
                <div className="text-gray-400 text-center py-8 bg-gray-50">暂无相关报道</div>
            )}
        </div>
    );
}

export default async function ArticlesPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const { type } = await searchParams;
  
  // Fetch data for all sections in parallel for Home view
  const [
      industryArticles,
      auctionArticles,
      reportArticles,
      interviewArticles,
      companyArticles,
      allArticles
  ] = await Promise.all([
      getArticles('INDUSTRY'),
      getArticles('AUCTION'),
      getArticles('REPORT'),
      getArticles('INTERVIEW'),
      getArticles('COMPANY'),
      getArticles()
  ]);

  // Hot Recommendations (Top 4 latest)
  const hotArticles = allArticles.slice(0, 4);

  // If a specific type is selected, show list view (simplified here, reusing logic)
  if (type) {
      const typeNameMap: any = {
          'INDUSTRY': '行业咨询', 'AUCTION': '拍卖升值', 'REPORT': '人物报道',
          'INTERVIEW': '名家访谈', 'COMPANY': '公司动态', 'KNOWLEDGE': '紫砂学院', 'NEWS': '新闻首页'
      };
      const currentArticles = type === 'INDUSTRY' ? industryArticles :
                              type === 'AUCTION' ? auctionArticles :
                              type === 'REPORT' ? reportArticles :
                              type === 'INTERVIEW' ? interviewArticles :
                              type === 'COMPANY' ? companyArticles : []; // Fallback fetch needed if not pre-fetched

      return (
          <div className="bg-gray-50 min-h-screen py-8">
              <div className="zisha-container">
                  <div className="flex justify-between items-center mb-8">
                      <div>
                          <h1 className="text-3xl font-bold text-gray-800">紫砂资讯</h1>
                          <p className="text-sm text-gray-500 mt-2">及时、准确、可读、全面，紫砂资讯平台</p>
                      </div>
                  </div>
                  {/* Nav */}
                  <div className="bg-white border-b border-gray-200 mb-8 flex">
                      {[
                          {name: '新闻首页', key: ''},
                          {name: '行业咨询', key: 'INDUSTRY'},
                          {name: '拍卖升值', key: 'AUCTION'},
                          {name: '人物报道', key: 'REPORT'},
                          {name: '名家访谈', key: 'INTERVIEW'},
                          {name: '公司动态', key: 'COMPANY'}
                      ].map(tab => (
                          <Link 
                              key={tab.key} 
                              href={tab.key ? `/articles?type=${tab.key}` : '/articles'}
                              className={`px-6 py-4 font-bold text-sm border-b-2 transition ${type === tab.key ? 'border-red-800 text-red-800' : 'border-transparent text-gray-600 hover:text-red-800'}`}
                          >
                              {tab.name}
                          </Link>
                      ))}
                  </div>
                  {/* List View */}
                  <div className="bg-white p-6 min-h-[400px]">
                      <h2 className="text-xl font-bold mb-6 border-l-4 border-red-800 pl-3">{typeNameMap[type]}</h2>
                      {currentArticles.length > 0 ? (
                          <div className="space-y-6">
                              {currentArticles.map((article: any) => (
                                  <div key={article.id} className="flex gap-6 border-b border-gray-100 pb-6 last:border-0">
                                      {article.cover && (
                                          <div className="w-48 h-32 bg-gray-100 flex-shrink-0">
                                              <img src={article.cover} className="w-full h-full object-cover" />
                                          </div>
                                      )}
                                      <div className="flex-1">
                                          <Link href={`/articles/${article.id}`} className="text-lg font-bold text-gray-800 hover:text-red-800 mb-2 block">{article.title}</Link>
                                          <div className="text-sm text-gray-500 line-clamp-2 mb-2" dangerouslySetInnerHTML={{ __html: article.content.replace(/<[^>]+>/g, '') }} />
                                          <span className="text-xs text-gray-400">{new Date(article.createdAt).toLocaleDateString()}</span>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      ) : (
                          <div className="text-center text-gray-400 py-12">暂无数据</div>
                      )}
                  </div>
              </div>
          </div>
      );
  }

  // Default: News Home Layout
  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="zisha-container">
        {/* Header */}
        <div className="flex justify-between items-end mb-6">
            <div>
                <h1 className="text-3xl font-serif font-bold text-red-900">紫砂资讯</h1>
                <p className="text-sm text-gray-500 mt-2 tracking-wide">及时、准确、可读、全面，紫砂资讯平台</p>
            </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white shadow-sm border-t-2 border-red-800 mb-8">
            <div className="flex">
                {[
                    {name: '新闻首页', key: ''},
                    {name: '行业咨询', key: 'INDUSTRY'},
                    {name: '拍卖升值', key: 'AUCTION'},
                    {name: '人物报道', key: 'REPORT'},
                    {name: '名家访谈', key: 'INTERVIEW'},
                    {name: '公司动态', key: 'COMPANY'}
                ].map(tab => (
                    <Link 
                        key={tab.key} 
                        href={tab.key ? `/articles?type=${tab.key}` : '/articles'}
                        className={`px-8 py-4 font-bold text-sm border-r border-gray-100 hover:bg-red-50 hover:text-red-800 transition ${!tab.key ? 'text-red-800 bg-red-50' : 'text-gray-700'}`}
                    >
                        {tab.name}
                    </Link>
                ))}
            </div>
        </div>

        {/* Module 1: Hot Recommendations */}
        <div className="mb-12">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                <span className="w-2 h-6 bg-red-800 mr-2"></span>
                热门推荐
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {hotArticles.map((article: any) => (
                    <Link key={article.id} href={`/articles/${article.id}`} className="group bg-white shadow-sm hover:shadow-lg transition overflow-hidden">
                        <div className="aspect-video bg-gray-200 overflow-hidden">
                            {article.cover ? (
                                <img src={article.cover} className="w-full h-full object-cover group-hover:scale-110 transition duration-500" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">暂无图片</div>
                            )}
                        </div>
                        <div className="p-4">
                            <h3 className="font-bold text-gray-800 truncate group-hover:text-red-800 mb-2">{article.title}</h3>
                            <div className="text-xs text-gray-500 line-clamp-2 h-8" dangerouslySetInnerHTML={{ __html: article.content.replace(/<[^>]+>/g, '') }} />
                        </div>
                    </Link>
                ))}
            </div>
        </div>

        {/* Module 2: Industry News */}
        <ArticleSection title="行业咨询" articles={industryArticles.slice(0, 4)} moreLink="/articles?type=INDUSTRY" />

        {/* Module 3: Auction */}
        <ArticleSection title="拍卖升值" articles={auctionArticles.slice(0, 4)} moreLink="/articles?type=AUCTION" />

        {/* Module 4: Reports */}
        <ArticleSection title="人物报道" articles={reportArticles.slice(0, 4)} moreLink="/articles?type=REPORT" />

        {/* Module 5: Interviews */}
        <ArticleSection title="名家访谈" articles={interviewArticles.slice(0, 4)} moreLink="/articles?type=INTERVIEW" />

        {/* Module 6: Company News */}
        <ArticleSection title="公司动态" articles={companyArticles.slice(0, 4)} moreLink="/articles?type=COMPANY" />

      </div>
    </div>
  );
}
