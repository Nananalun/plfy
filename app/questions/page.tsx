import Link from 'next/link';

async function getQuestions() {
  try {
    const res = await fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000') + '/questions', { cache: 'no-store' });
    return res.ok ? await res.json() : [];
  } catch (error) {
    return [];
  }
}

export default async function QuestionsPage() {
  const questions = await getQuestions();

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="zisha-container max-w-5xl">
        <div className="text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-red-800">首页</Link>
          <span className="mx-2">&gt;</span>
          <span className="text-gray-800">紫砂问答</span>
        </div>

        <div className="bg-white border border-gray-200 p-8">
           <div className="flex justify-between items-center mb-8 pb-4 border-b border-gray-100">
              <h1 className="text-2xl font-bold text-gray-800 border-l-4 border-red-800 pl-4">
                有问必答
              </h1>
              <button className="bg-red-800 text-white px-6 py-2 rounded text-sm hover:bg-red-900">
                 我要提问
              </button>
           </div>

           <div className="space-y-6">
              {questions.length > 0 ? (
                 questions.map((q: any) => (
                    <div key={q.id} className="border-b border-dashed border-gray-100 pb-6 last:border-0">
                       <div className="flex gap-3 mb-3">
                          <div className="w-6 h-6 bg-red-800 text-white rounded flex items-center justify-center text-xs flex-shrink-0 mt-0.5">Q</div>
                          <h3 className="font-bold text-gray-800 text-lg">{q.question}</h3>
                       </div>
                       <div className="flex gap-3 ml-9">
                          <div className="w-6 h-6 bg-gray-200 text-gray-500 rounded flex items-center justify-center text-xs flex-shrink-0 mt-0.5">A</div>
                          <div className="text-gray-600 text-sm leading-relaxed bg-gray-50 p-4 rounded w-full">
                             {q.answer}
                          </div>
                       </div>
                    </div>
                 ))
              ) : (
                 <div className="text-center py-12 text-gray-400">暂无问答数据</div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
}

