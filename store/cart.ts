import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  id: number;
  title: string;
  price: number;
  image: string;
  quantity: number;
  artistName?: string;
}

interface CartState {
  items: CartItem[];
  addToCart: (product: any) => void;
  removeFromCart: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  clearCart: () => void;
  totalItems: () => number;
  totalPrice: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      
      addToCart: (product) => set((state) => {
        const existingItem = state.items.find(item => item.id === product.id);
        if (existingItem) {
          return {
            items: state.items.map(item => 
              item.id === product.id 
                ? { ...item, quantity: item.quantity + 1 } 
                : item
            )
          };
        }
        return {
          items: [...state.items, {
            id: product.id,
            title: product.title,
            price: product.price,
            image: product.images,
            quantity: 1,
            artistName: product.artist?.name
          }]
        };
      }),

      removeFromCart: (productId) => set((state) => ({
        items: state.items.filter(item => item.id !== productId)
      })),

      updateQuantity: (productId, quantity) => set((state) => ({
        items: state.items.map(item => 
          item.id === productId 
            ? { ...item, quantity: Math.max(1, quantity) } 
            : item
        )
      })),

      clearCart: () => set({ items: [] }),

      totalItems: () => {
        const state = get();
        return state.items.reduce((total, item) => total + item.quantity, 0);
      },

      totalPrice: () => {
        const state = get();
        return state.items.reduce((total, item) => total + item.price * item.quantity, 0);
      }
    }),
    {
      name: 'zisha-cart-storage',
    }
  )
);

