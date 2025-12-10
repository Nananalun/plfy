"use client";
import { useCartStore } from '@/store/cart';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function CartWidget() {
    const totalItems = useCartStore(state => state.totalItems());
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    return (
        <Link href="#" className="bg-red-800 text-white px-4 py-2 rounded hover:bg-red-900 flex items-center gap-2">
            <span>购物车</span>
            <span className="bg-yellow-400 text-red-900 text-xs font-bold px-1.5 rounded-full">{totalItems}</span>
        </Link>
    );
}

