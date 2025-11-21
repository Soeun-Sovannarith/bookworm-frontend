import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { cartAPI, booksAPI } from "@/lib/api";
import type { CartItem, Book } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Trash2, Plus, Minus } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface CartItemWithBook extends CartItem {
  book?: Book;
}

export default function Cart() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState<CartItemWithBook[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadCart();
    }
  }, [user]);

  const loadCart = async () => {
    if (!user) return;

    try {
      const items = await cartAPI.getByUserId(user.id);
      
      // Fetch book details for each cart item
      const itemsWithBooks = await Promise.all(
        items.map(async (item) => {
          try {
            const book = await booksAPI.getById(item.bookId);
            return { ...item, book };
          } catch {
            return item;
          }
        })
      );

      setCartItems(itemsWithBooks);
    } catch (error) {
      toast({
        title: "Error loading cart",
        description: error instanceof Error ? error.message : "Could not fetch cart items",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateQuantity = async (itemId: number, newQuantity: number) => {
    if (newQuantity < 1) return;

    try {
      const item = cartItems.find((i) => i.id === itemId);
      if (!item || !user) return;

      await cartAPI.update(itemId, {
        ...item,
        quantity: newQuantity,
      });

      setCartItems(
        cartItems.map((i) => (i.id === itemId ? { ...i, quantity: newQuantity } : i))
      );
    } catch (error) {
      toast({
        title: "Error updating quantity",
        description: error instanceof Error ? error.message : "Could not update item",
        variant: "destructive",
      });
    }
  };

  const removeItem = async (itemId: number) => {
    try {
      await cartAPI.delete(itemId);
      setCartItems(cartItems.filter((i) => i.id !== itemId));
      toast({
        title: "Item removed",
        description: "Item removed from cart",
      });
    } catch (error) {
      toast({
        title: "Error removing item",
        description: error instanceof Error ? error.message : "Could not remove item",
        variant: "destructive",
      });
    }
  };

  const calculateTotal = () => {
    return cartItems.reduce((total, item) => {
      return total + (item.book?.price || 0) * item.quantity;
    }, 0);
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16">
          <div className="text-center">
            <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-muted-foreground">Loading cart...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8">Shopping Cart</h1>

        {cartItems.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">Your cart is empty</p>
            <Button onClick={() => navigate("/books")}>Continue Shopping</Button>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {cartItems.map((item) => (
                <Card key={item.id}>
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <div className="w-24 h-32 bg-muted rounded overflow-hidden flex-shrink-0">
                        <img
                          src={item.book?.imageURL || "/placeholder.svg"}
                          alt={item.book?.title || "Book"}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = "/placeholder.svg";
                          }}
                        />
                      </div>

                      <div className="flex-1">
                        <h3 className="font-semibold mb-1">{item.book?.title}</h3>
                        <p className="text-sm text-muted-foreground mb-2">
                          {item.book?.author}
                        </p>
                        <p className="text-lg font-bold text-primary">
                          ${item.book?.price.toFixed(2)}
                        </p>
                      </div>

                      <div className="flex flex-col justify-between items-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(item.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          >
                            <Minus className="w-4 h-4" />
                          </Button>
                          <span className="w-8 text-center">{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Order Summary */}
            <div>
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold mb-4">Order Summary</h2>

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>${calculateTotal().toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Shipping</span>
                      <span>Free</span>
                    </div>
                  </div>

                  <div className="border-t pt-4 mb-6">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span>${calculateTotal().toFixed(2)}</span>
                    </div>
                  </div>

                  <Button
                    className="w-full"
                    size="lg"
                    onClick={() => navigate("/checkout")}
                  >
                    Proceed to Checkout
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
