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
import { useTranslation } from "react-i18next";
import { SEO, pageSEO } from "@/components/SEO";

interface CartItemWithBook extends CartItem {
  book?: Book;
}

export default function Checkout() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState<CartItemWithBook[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [shippingAddress, setShippingAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"CREDIT_CARD" | "DEBIT_CARD" | "PAYPAL" | "BANK_TRANSFER">("CREDIT_CARD");

  useEffect(() => {
    if (user) loadCart();
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
        title: t("checkout.loading"),
        description: error instanceof Error ? error.message : t("checkout.loading"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const calculateTotal = () =>
    cartItems.reduce((total, item) => total + (item.book?.price || 0) * item.quantity, 0);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || cartItems.length === 0) return;
    setIsProcessing(true);
    try {
      const totalAmount = calculateTotal();
      const order = await ordersAPI.create({
        userId: user.id,
        totalAmount,
        status: "PENDING",
        paymentMethod,
        paymentStatus: "PENDING",
        shippingAddress,
      });
      await paymentsAPI.create({
        orderId: order.id,
        amount: totalAmount,
        paymentMethod,
        paymentStatus: "COMPLETED",
      });
      await Promise.all(cartItems.map((item) => cartAPI.delete(item.id)));
      toast({
        title: t("checkout.place_order"),
        description: `Order #${order.id} ${t("checkout.place_order")}`,
      });
      navigate("/orders");
    } catch (error) {
      toast({
        title: t("checkout.place_order"),
        description: error instanceof Error ? error.message : t("checkout.place_order"),
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">{t("checkout.loading")}</p>
        </div>
      </Layout>
    );
  }

  if (cartItems.length === 0) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <p className="text-muted-foreground mb-4">{t("checkout.empty_cart")}</p>
          <Button onClick={() => navigate("/books")}>{t("checkout.continue_shopping")}</Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <SEO {...pageSEO.checkout} />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8">{t("checkout.title")}</h1>
        <form onSubmit={handleCheckout}>
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Checkout Form */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>{t("checkout.shipping_info")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="address">{t("checkout.shipping_address")}</Label>
                      <Input
                        id="address"
                        placeholder={t("checkout.shipping_placeholder")}
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
                  <CardTitle>{t("checkout.payment_method")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Select value={paymentMethod} onValueChange={(value: any) => setPaymentMethod(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CREDIT_CARD">{t("checkout.payment_credit")}</SelectItem>
                      <SelectItem value="DEBIT_CARD">{t("checkout.payment_debit")}</SelectItem>
                      <SelectItem value="PAYPAL">{t("checkout.payment_paypal")}</SelectItem>
                      <SelectItem value="BANK_TRANSFER">{t("checkout.payment_bank")}</SelectItem>
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
            </div>

            {/* Order Summary */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>{t("checkout.order_summary")}</CardTitle>
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
                      <span>{t("checkout.total")}</span>
                      <span>${calculateTotal().toFixed(2)}</span>
                    </div>
                  </div>
                  <Button type="submit" className="w-full" size="lg" disabled={isProcessing}>
                    {isProcessing ? t("checkout.processing") : t("checkout.place_order")}
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
