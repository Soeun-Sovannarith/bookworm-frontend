import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { cartAPI } from "@/lib/api";

interface CartContextType {
  cartCount: number;
  updateCartCount: () => Promise<void>;
  incrementCartCount: () => void;
  clearCartCount: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cartCount, setCartCount] = useState(0);
  const { user } = useAuth();

  const updateCartCount = async () => {
    if (!user) {
      setCartCount(0);
      return;
    }

    try {
      const items = await cartAPI.getByUserId(user.id);
      const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);
      setCartCount(totalCount);
    } catch (error) {
      console.error("Failed to update cart count:", error);
    }
  };

  const incrementCartCount = () => {
    setCartCount(prev => prev + 1);
  };

  const clearCartCount = () => {
    setCartCount(0);
  };

  useEffect(() => {
    updateCartCount();
  }, [user]);

  return (
    <CartContext.Provider value={{ cartCount, updateCartCount, incrementCartCount, clearCartCount }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
