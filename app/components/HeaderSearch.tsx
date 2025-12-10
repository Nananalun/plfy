'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

type SearchType = 'product' | 'artist' | 'title';
type SubFilter = 'id' | 'name' | 'material' | 'capacity';

export default function HeaderSearch() {
    const router = useRouter();
    const [searchType, setSearchType] = useState<SearchType>('product');
    const [subFilter, setSubFilter] = useState<SubFilter>('name');
    const [keyword, setKeyword] = useState('');

    // Mock Data for dropdowns
    const materials = ['紫泥', '朱泥', '段泥', '绿泥', '降坡泥', '底槽清', '清水泥', '大红袍'];
    const capacities = ['100cc以下', '100-150cc', '150-200cc', '200-250cc', '250-300cc', '300-400cc', '400-600cc', '600cc以上'];

    const handleSearch = () => {
        const trimmed = keyword.trim();

        if (searchType === 'product') {
            const params = new URLSearchParams();
            if (subFilter === 'material' && trimmed) params.set('material', trimmed);
            else if (subFilter === 'capacity' && trimmed) params.set('capacity', trimmed);
            else if (trimmed) params.set('q', trimmed); // id/name fallback用 q

            router.push(`/products${params.toString() ? `?${params.toString()}` : ''}`);
            return;
        }

        if (searchType === 'artist') {
            // 复用职称查询页的姓名搜索
            if (!trimmed) return;
            router.push(`/titles?q=${encodeURIComponent(trimmed)}`);
            return;
        }

        if (searchType === 'title') {
            // 职称按钮：直接跳转工艺师页，不要求再次输入
            router.push('/artists');
        }
    };

    return (
        <div className="flex-1 max-w-3xl mx-8">
            {/* Top Tabs */}
            <div className="flex space-x-2 mb-1 ml-1">
                <button 
                    onClick={() => setSearchType('product')}
                    className={`text-sm px-3 py-1 rounded-t-md ${searchType === 'product' ? 'bg-red-800 text-white font-bold' : 'text-gray-600 hover:text-red-800'}`}
                >
                    作品
                </button>
                <button 
                    onClick={() => setSearchType('artist')}
                    className={`text-sm px-3 py-1 rounded-t-md ${searchType === 'artist' ? 'bg-red-800 text-white font-bold' : 'text-gray-600 hover:text-red-800'}`}
                >
                    艺人
                </button>
                <button 
                    onClick={() => {
                        setSearchType('title');
                        router.push('/artists');
                    }}
                    className={`text-sm px-3 py-1 rounded-t-md ${searchType === 'title' ? 'bg-red-800 text-white font-bold' : 'text-gray-600 hover:text-red-800'}`}
                >
                    职称
                </button>
            </div>

            {/* Search Bar Container */}
            <div className="flex border-2 border-red-800 bg-white h-10">
                {/* Sub Filter Dropdown (Only for Product) */}
                {searchType === 'product' && (
                    <div className="relative group border-r border-gray-200">
                        <select 
                            value={subFilter}
                            onChange={(e) => {
                                setSubFilter(e.target.value as SubFilter);
                                setKeyword(''); // Clear keyword when filter changes
                            }}
                            className="h-full px-3 outline-none bg-gray-50 text-gray-700 text-sm cursor-pointer appearance-none pr-8"
                        >
                            <option value="id">作品编号</option>
                            <option value="name">作品名称</option>
                            <option value="material">作品泥料</option>
                            <option value="capacity">作品容量</option>
                        </select>
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 text-xs">▼</div>
                    </div>
                )}

                {/* Dynamic Input Area */}
                <div className="flex-1 relative">
                    {searchType === 'product' && subFilter === 'material' ? (
                        <>
                          <input 
                              list="materials"
                              className="w-full h-full px-4 outline-none text-gray-700"
                              value={keyword}
                              onChange={(e) => setKeyword(e.target.value)}
                              placeholder="请选择或输入泥料"
                          />
                          <datalist id="materials">
                              {materials.map(m => <option key={m} value={m} />)}
                          </datalist>
                        </>
                    ) : searchType === 'product' && subFilter === 'capacity' ? (
                        <>
                          <input 
                              list="capacities"
                              className="w-full h-full px-4 outline-none text-gray-700"
                              value={keyword}
                              onChange={(e) => setKeyword(e.target.value)}
                              placeholder="请选择或输入容量范围"
                          />
                          <datalist id="capacities">
                              {capacities.map(c => <option key={c} value={c} />)}
                          </datalist>
                        </>
                    ) : (
                        <input 
                            type="text" 
                            placeholder={
                                searchType === 'artist' ? "请输入艺人姓名" :
                                searchType === 'title' ? "请输入职称（如：国家级高工）" :
                                subFilter === 'id' ? "请输入作品编号" : "请输入关键词"
                            }
                            value={keyword}
                            onChange={(e) => setKeyword(e.target.value)}
                            className="w-full h-full px-4 outline-none"
                        />
                    )}
                </div>

                <button 
                    onClick={handleSearch}
                    className="bg-red-800 text-white px-8 font-bold hover:bg-red-900 transition"
                >
                    搜索
                </button>
            </div>

            {/* Hot Keywords */}
            <div className="mt-1 text-xs text-gray-500 space-x-3 pl-1">
                <span>热门搜索：</span>
                <a href="#" className="hover:text-red-800">石瓢</a>
                <a href="#" className="hover:text-red-800">西施</a>
                <a href="#" className="hover:text-red-800">供春</a>
                <a href="#" className="hover:text-red-800">顾景舟</a>
            </div>
        </div>
    );
}

