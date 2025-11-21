import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { cartAPI, booksAPI, ordersAPI, paymentsAPI } from "@/lib/api";
import type { CartItem, Book } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

interface CartItemWithBook extends CartItem {
  book?: Book;
}

export default function Checkout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState<CartItemWithBook[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const [shippingAddress, setShippingAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"CREDIT_CARD" | "DEBIT_CARD" | "PAYPAL" | "BANK_TRANSFER">("CREDIT_CARD");

  useEffect(() => {
    if (user) {
      loadCart();
    }
  }, [user]);

  const loadCart = async () => {
    if (!user) return;

    try {
      const items = await cartAPI.getByUserId(user.id);
      
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

  const calculateTotal = () => {
    return cartItems.reduce((total, item) => {
      return total + (item.book?.price || 0) * item.quantity;
    }, 0);
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || cartItems.length === 0) return;

    setIsProcessing(true);

    try {
      const totalAmount = calculateTotal();

      // Create order
      const order = await ordersAPI.create({
        userId: user.id,
        totalAmount,
        status: "PENDING",
        paymentMethod,
        paymentStatus: "PENDING",
        shippingAddress,
      });

      // Create payment
      await paymentsAPI.create({
        orderId: order.id,
        amount: totalAmount,
        paymentMethod,
        paymentStatus: "COMPLETED",
      });

      // Clear cart
      await Promise.all(cartItems.map((item) => cartAPI.delete(item.id)));

      toast({
        title: "Order placed successfully!",
        description: `Order #${order.id} has been created`,
      });

      navigate("/orders");
    } catch (error) {
      toast({
        title: "Checkout failed",
        description: error instanceof Error ? error.message : "Could not complete order",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16">
          <div className="text-center">
            <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-muted-foreground">Loading checkout...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (cartItems.length === 0) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <p className="text-muted-foreground mb-4">Your cart is empty</p>
          <Button onClick={() => navigate("/books")}>Continue Shopping</Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8">Checkout</h1>

        <form onSubmit={handleCheckout}>
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Checkout Form */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Shipping Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="address">Shipping Address</Label>
                      <Input
                        id="address"
                        placeholder="123 Main St, City, State, ZIP"
                        value={shippingAddress}
                        onChange={(e) => setShippingAddress(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Payment Method</CardTitle>
                </CardHeader>
                <CardContent>
                  <Select
                    value={paymentMethod}
                    onValueChange={(value: any) => setPaymentMethod(value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CREDIT_CARD">Credit Card</SelectItem>
                      <SelectItem value="DEBIT_CARD">Debit Card</SelectItem>
                      <SelectItem value="PAYPAL">PayPal</SelectItem>
                      <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
            </div>

            {/* Order Summary */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    {cartItems.map((item) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          {item.book?.title} x{item.quantity}
                        </span>
                        <span>${((item.book?.price || 0) * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="border-t pt-4">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span>${calculateTotal().toFixed(2)}</span>
                    </div>
                  </div>

                  <Button type="submit" className="w-full" size="lg" disabled={isProcessing}>
                    {isProcessing ? "Processing..." : "Place Order"}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </div>
    </Layout>
  );
}
