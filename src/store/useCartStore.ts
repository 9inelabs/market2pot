import { create } from 'zustand';

// Local-only item count for the Home header's cart badge — no real cart,
// checkout, or persistence yet (explicitly a later phase). Just enough
// state for the "+" quick-add button on a product card to feel real.
type CartState = {
  itemCount: number;
  addItem: () => void;
};

export const useCartStore = create<CartState>((set) => ({
  itemCount: 0,
  addItem: () => set((state) => ({ itemCount: state.itemCount + 1 })),
}));
