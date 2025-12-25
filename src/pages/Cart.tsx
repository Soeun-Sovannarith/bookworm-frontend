import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { cartAPI, booksAPI, ordersAPI, openLibraryAPI, bakongAPI, stripeAPI } from "@/lib/api";
import type { CartItem, Book, BakongPaymentResponse, StripePaymentResponse } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Trash2, Plus, Minus, ShoppingCart } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { QRCodeSVG } from "qrcode.react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { useTranslation } from "react-i18next";

interface CartItemWithBook extends CartItem {
  book?: Book;
}

export default function Cart() {
  const { user } = useAuth();
  const { updateCartCount, clearCartCount } = useCart();
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState<CartItemWithBook[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showClearCartDialog, setShowClearCartDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [shippingAddress, setShippingAddress] = useState("");
  const [bakongQR, setBakongQR] = useState<BakongPaymentResponse | null>(null);
  const [isGeneratingQR, setIsGeneratingQR] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"BAKONG" | "STRIPE">("STRIPE");
  const [stripePromise, setStripePromise] = useState<any>(null);
  const [stripeClientSecret, setStripeClientSecret] = useState<string | null>(null);
  const [isPollingPayment, setIsPollingPayment] = useState(false);
  const [paymentStatusMessage, setPaymentStatusMessage] = useState("");
  const { t } = useTranslation();

  useEffect(() => {
    if (user) {
      loadCart();
    }
  }, [user]);

  useEffect(() => {
    // Load Stripe publishable key
    const initStripe = async () => {
      try {
        const config = await stripeAPI.getConfig();
        const stripe = await loadStripe(config.publishableKey);
        setStripePromise(stripe);
      } catch (error) {
        console.error("Failed to load Stripe:", error);
      }
    };
    initStripe();
  }, []);

  // Poll payment status for Bakong payments
  useEffect(() => {
    let pollInterval: NodeJS.Timeout;
    
    if (currentOrderId && paymentMethod === "BAKONG" && bakongQR) {
      // console.log("Starting payment polling for order:", currentOrderId);
      setIsPollingPayment(true);
      setPaymentStatusMessage("Waiting for payment...");
      
      let attempts = 0;
      const maxAttempts = 60; // 3 minutes (60 * 3 seconds)
      
      const checkPaymentStatus = async () => {
        attempts++;
        
        try {
          // console.log(`Polling payment status for order: ${currentOrderId} (attempt ${attempts}/${maxAttempts})`);
          
          const response = await fetch(
            `http://localhost:8080/api/payments/bakong/verify-payment?orderId=${currentOrderId}&md5=${bakongQR.md5}`,
            {
              method: 'POST',
            }
          );
          
          if (!response.ok) {
            console.error("Failed to verify payment:", response.status);
            return;
          }
          
          const status = await response.json();
          // console.log("Order status received:", status);
          
          // Check if payment is completed according to the API spec
          if (status.paymentStatus === 'COMPLETED' && status.orderStatus === 'PAID') {
            // console.log("Payment confirmed! Clearing interval.");
            clearInterval(pollInterval);
            setIsPollingPayment(false);
            setPaymentStatusMessage("Payment confirmed!");
            
            toast({
              title: "Payment Successful!",
              description: `Order #${currentOrderId} payment confirmed.`,
            });
            
            // Process checkout (clear cart and redirect)
            setTimeout(() => {
              processCheckout();
            }, 1500);
          } else if (status.paymentStatus === 'FAILED') {
            // console.log("Payment failed!");
            clearInterval(pollInterval);
            setIsPollingPayment(false);
            setPaymentStatusMessage("Payment failed. Please try again.");
            
            toast({
              title: "Payment Failed",
              description: status.message || "Your payment could not be processed.",
              variant: "destructive",
            });
          } else if (attempts >= maxAttempts) {
            // console.log("Payment verification timeout");
            clearInterval(pollInterval);
            setIsPollingPayment(false);
            setPaymentStatusMessage("Timeout. Please check your order status.");
            
            toast({
              title: "Verification Timeout",
              description: "Payment verification timeout. Please check your order status.",
              variant: "destructive",
            });
          } else {
            // console.log("Payment still pending, will check again in 3 seconds...");
            setPaymentStatusMessage(`Waiting for payment... (${attempts}/${maxAttempts})`);
          }
        } catch (error) {
          console.error("Error polling payment status:", error);
          if (attempts >= maxAttempts) {
            clearInterval(pollInterval);
            setIsPollingPayment(false);
            setPaymentStatusMessage("Unable to verify payment.");
            
            toast({
              title: "Verification Error",
              description: "Unable to verify payment. Please contact support.",
              variant: "destructive",
            });
          }
        }
      };
      
      // Check immediately once
      checkPaymentStatus();
      
      // Then poll every 3 seconds
      pollInterval = setInterval(checkPaymentStatus, 3000);
    }
    
    return () => {
      if (pollInterval) {
        // console.log("Cleaning up payment polling interval");
        clearInterval(pollInterval);
      }
    };
  }, [currentOrderId, paymentMethod, bakongQR]);

  const loadCart = async () => {
    if (!user) return;

    try {
      const items = await cartAPI.getByUserId(user.id);
      
      // Fetch book details for each cart item
      const itemsWithBooks: CartItemWithBook[] = await Promise.all(
        items.map(async (item): Promise<CartItemWithBook> => {
          try {
            const book = await booksAPI.getById(item.bookId);
            return { ...item, book };
          } catch {
            return item as CartItemWithBook;
          }
        })
      );

      // Enrich books with Open Library covers
      const books = itemsWithBooks
        .map(item => item.book)
        .filter((book): book is Book => book !== undefined);
      const enrichedBooks = await openLibraryAPI.enrichBooksWithCovers(books);
      
      // Map enriched books back to cart items
      const enrichedCartItems: CartItemWithBook[] = itemsWithBooks.map(item => {
        if (item.book) {
          const enrichedBook = enrichedBooks.find(b => b.bookID === item.book!.bookID);
          return { ...item, book: enrichedBook || item.book };
        }
        return item;
      });

      setCartItems(enrichedCartItems);
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

    const item = cartItems.find((i) => i.id === itemId);
    if (!item || !user) return;

    // Check stock availability
    if (item.book && newQuantity > item.book.stock) {
      toast({
        title: "Insufficient stock",
        description: `Only ${item.book.stock} items available`,
        variant: "destructive",
      });
      return;
    }

    try {
      // console.log("Updating cart item:", {
      //   itemId,
      //   newQuantity,
      //   userId: user.id,
      //   bookId: item.bookId,
      //   token: localStorage.getItem("token") ? "exists" : "missing",
      // });

      await cartAPI.update(itemId, {
        userId: user.id,
        bookId: item.bookId,
        quantity: newQuantity,
      });

      setCartItems(
        cartItems.map((i) => (i.id === itemId ? { ...i, quantity: newQuantity } : i))
      );
      
      toast({
        title: "Quantity updated",
        description: "Cart updated successfully",
      });
    } catch (error) {
      console.error("Update quantity error:", error);
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
      
      // Update cart count
      await updateCartCount();
      
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

  const clearCart = async () => {
    if (!user) return;
    
    try {
      setIsProcessing(true);
      // Delete all cart items for the user
      await Promise.all(cartItems.map(item => cartAPI.delete(item.id)));
      
      setCartItems([]);
      setShowClearCartDialog(false);
      
      // Clear cart count
      clearCartCount();
      
      toast({
        title: "Cart cleared",
        description: "All items removed from cart",
      });
    } catch (error) {
      toast({
        title: "Error clearing cart",
        description: error instanceof Error ? error.message : "Could not clear cart",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCheckout = () => {
    if (!shippingAddress.trim()) {
      toast({
        title: "Shipping address required",
        description: "Please enter your shipping address",
        variant: "destructive",
      });
      return;
    }
    setShowPaymentModal(true);
  };

  const handlePaymentMethodSubmit = async () => {
    if (!user) return;

    try {
      setIsProcessing(true);

      // Create order first
      const order = await ordersAPI.create({
        userId: user.id,
        totalAmount: calculateTotal(),
        status: "PENDING",
        paymentMethod,
        paymentStatus: "PENDING",
        shippingAddress,
      });

      setCurrentOrderId(order.id);

      if (paymentMethod === "BAKONG") {
        // Generate Bakong QR code
        setIsGeneratingQR(true);
        try {
          const qrResponse = await bakongAPI.generateQR(order.id, "USD");
          setBakongQR(qrResponse);
          toast({
            title: "Order Created",
            description: `Order #${order.id} created. Please scan the QR code to complete payment.`,
          });
        } catch (qrError) {
          console.error("Bakong QR generation failed:", qrError);
          toast({
            title: "Backend Not Ready",
            description: "Bakong payment endpoint not implemented yet.",
            variant: "destructive",
          });
          setShowPaymentModal(false);
          setCurrentOrderId(null);
        } finally {
          setIsGeneratingQR(false);
        }
      } else if (paymentMethod === "STRIPE") {
        // Create Stripe payment intent
        setIsGeneratingQR(true);
        try {
          const stripeResponse = await stripeAPI.createPaymentIntent({
            orderId: order.id,
            currency: "usd",
            receiptEmail: user.email,
          });
          setStripeClientSecret(stripeResponse.clientSecret);
          toast({
            title: "Order Created",
            description: `Order #${order.id} created. Please complete payment.`,
          });
        } catch (stripeError) {
          console.error("Stripe payment intent failed:", stripeError);
          toast({
            title: "Payment Error",
            description: "Could not initialize Stripe payment.",
            variant: "destructive",
          });
          setShowPaymentModal(false);
          setCurrentOrderId(null);
        } finally {
          setIsGeneratingQR(false);
        }
      }
    } catch (error) {
      setShowPaymentModal(false);
      toast({
        title: "Error creating order",
        description: error instanceof Error ? error.message : "Could not create order",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const processCheckout = async () => {
    if (!user || !currentOrderId) return;

    try {
      setIsProcessing(true);

      // Clear the cart after payment confirmation
      const deletePromises = cartItems.map(item => cartAPI.delete(item.id));
      await Promise.all(deletePromises);

      // Update UI state
      setCartItems([]);
      setShowPaymentModal(false);
      setBakongQR(null);
      setCurrentOrderId(null);
      setShippingAddress("");
      setIsPollingPayment(false);
      setPaymentStatusMessage("");

      // Clear cart count badge
      clearCartCount();

      // Show success message
      toast({
        title: "Payment Confirmed!",
        description: `Your order #${currentOrderId} has been confirmed. Cart has been cleared.`,
      });

      // Redirect to orders page
      setTimeout(() => {
        navigate("/orders");
      }, 1500);
    } catch (error) {
      toast({
        title: "Error clearing cart",
        description: error instanceof Error ? error.message : "Could not clear cart",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
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
            <p className="text-muted-foreground">
              {t("cart.loading")}
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">{t("cart.title")}</h1>
          {cartItems.length > 0 && (
            <Button
              variant="outline"
              onClick={() => setShowClearCartDialog(true)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {t("cart.clear")}
            </Button>
          )}
        </div>

        {cartItems.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">{t("cart.empty")}</p>
            <Button onClick={() => navigate("/books")}>{t("cart.continue")}</Button>
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
                          src={item.book?.imageURL || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='450'%3E%3Crect width='300' height='450' fill='%23e5e7eb'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='20' fill='%239ca3af'%3ENo Cover%3C/text%3E%3C/svg%3E"}
                          alt={item.book?.title || "Book"}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='450'%3E%3Crect width='300' height='450' fill='%23e5e7eb'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='20' fill='%239ca3af'%3ENo Cover%3C/text%3E%3C/svg%3E";
                          }}
                        />
                      </div>

                      <div className="flex-1">
                        <h3 className="font-semibold mb-1">{item.book?.title}</h3>
                        <p className="text-sm text-muted-foreground mb-2">
                          {item.book?.author}
                        </p>
                        <p className="text-lg font-bold text-primary mb-1">
                          ${item.book?.price.toFixed(2)}
                        </p>
                        {item.book && item.book.stock < 10 && (
                          <p className="text-xs text-orange-600">
                            {t("cart.only_left", { count: item.book.stock })}
                          </p>
                        )}
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
                            disabled={item.quantity <= 1}
                          >
                            <Minus className="w-4 h-4" />
                          </Button>
                          <span className="w-8 text-center font-semibold">{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            disabled={item.book ? item.quantity >= item.book.stock : false}
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
                  <h2 className="text-xl font-semibold mb-4">{t("cart.summary")}</h2>

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t("cart.items", { count: cartItems.length })}</span>
                      <span>${calculateTotal().toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t("cart.shipping")}</span>
                      <span className="text-green-600">{t("cart.free")}</span>
                    </div>
                  </div>

                  <div className="border-t pt-4 mb-6">
                    <div className="flex justify-between text-lg font-bold">
                      <span>{t("cart.total")}</span>
                      <span>${calculateTotal().toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="space-y-4 mb-4">
                    <div>
                      <Label htmlFor="shipping">{t("cart.address")}</Label>
                      <Input
                        id="shipping"
                        placeholder={t("cart.address_placeholder")}
                        value={shippingAddress}
                        onChange={(e) => setShippingAddress(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <Button
                    className="w-full"
                    size="lg"
                    onClick={handleCheckout}
                    disabled={!shippingAddress.trim()}
                  >
                    {t("cart.checkout")}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("cart.choose_payment")}</DialogTitle>
            <DialogDescription>
              {t("cart.choose_payment_desc")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="border rounded-lg p-4 bg-muted">
              <div className="flex justify-between mb-2">
                <span className="text-sm text-muted-foreground">
                  {t("cart.total")}
                </span>
                <span className="text-lg font-bold">${calculateTotal().toFixed(2)}</span>
              </div>
              <div className="text-sm text-muted-foreground">
                {t("cart.shipping_to")}: {shippingAddress}
              </div>
              {currentOrderId && (
                <div className="text-sm text-muted-foreground mt-1">
                  {t("cart.order_id")}: #{currentOrderId}
                </div>
              )}
            </div>

            {!currentOrderId && (
              <div>
                <Label className="mb-3 block">{t("cart.payment_method")}</Label>
                <RadioGroup value={paymentMethod} onValueChange={(value: any) => setPaymentMethod(value)}>
                  <div className="flex items-center space-x-2 border rounded-lg p-3">
                    <RadioGroupItem value="STRIPE" id="stripe" />
                    <Label htmlFor="stripe" className="flex-1 cursor-pointer">
                      {t("cart.card")}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 border rounded-lg p-3">
                    <RadioGroupItem value="BAKONG" id="bakong" />
                    <Label htmlFor="bakong" className="flex-1 cursor-pointer">
                      {t("cart.bakong")}
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            )}

            {isGeneratingQR && (
              <div className="text-center py-8">
                <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                <p className="text-muted-foreground">{t("cart.generating_qr")}</p>
              </div>
            )}

            {bakongQR && !isGeneratingQR && (
              <div className="space-y-4">
                {/* Payment Status */}
                {isPollingPayment && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <div className="animate-spin w-5 h-5 border-3 border-primary border-t-transparent rounded-full" />
                      <span className="font-medium text-blue-900">{paymentStatusMessage}</span>
                    </div>
                    <p className="text-xs text-blue-700">⏳ Checking payment status every 3 seconds...</p>
                  </div>
                )}

                {/* QR Code Display */}
                <div className="flex justify-center bg-white p-4 rounded-lg">
                  <QRCodeSVG
                    value={bakongQR.qrCode}
                    size={220}
                    level="H"
                    includeMargin={true}
                  />
                </div>

                {/* Payment Instructions */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
                  <h4 className="font-semibold text-blue-900 text-sm">{t("cart.bakong_instructions")}</h4>
                  <ol className="text-xs text-blue-800 space-y-1 list-decimal list-inside">
                    <li>{t("cart.bakong_step1")}</li>
                    <li>{t("cart.bakong_step2")}</li>
                    <li>{t("cart.bakong_step3")}</li>
                    <li>{t("cart.bakong_step4", { amount: bakongQR.amount.toFixed(2) })}</li>
                    <li>{t("cart.bakong_step5")}</li>
                  </ol>
                </div>

                {/* Payment Details */}
                <div className="text-xs text-muted-foreground space-y-1">
                  <div>Bill Number: {bakongQR.billNumber}</div>
                  <div>Currency: {bakongQR.currency}</div>
                  <div className="text-green-600 font-medium">Payment will be auto-detected when completed</div>
                </div>

                {/* Manual Payment Completion Button (for testing) */}
                <div className="pt-2">
                  <Button
                    onClick={async () => {
                      if (!currentOrderId) return;
                      try {
                        // console.log("Manually completing payment for order:", currentOrderId);
                        const response = await fetch(`http://localhost:8080/api/payments/bakong/complete-payment`, {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                          },
                          body: JSON.stringify({ orderId: currentOrderId }),
                        });
                        
                        const result = await response.json();
                        // console.log("Complete payment response:", result);
                        
                        if (response.ok) {
                          toast({
                            title: "Payment Completed",
                            description: "Payment marked as complete. Waiting for status update...",
                          });
                        } else {
                          toast({
                            title: "Error",
                            description: result.message || "Failed to complete payment",
                            variant: "destructive",
                          });
                        }
                      } catch (error) {
                        console.error("Error completing payment:", error);
                        toast({
                          title: "Error",
                          description: "Failed to complete payment",
                          variant: "destructive",
                        });
                      }
                    }}
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    Mark Payment as Complete
                  </Button>
                </div>
              </div>
            )}

            {stripeClientSecret && stripePromise && paymentMethod === "STRIPE" && (
              <div className="space-y-4">
                <Elements stripe={stripePromise} options={{ clientSecret: stripeClientSecret }}>
                  <StripePaymentForm 
                    clientSecret={stripeClientSecret}
                    orderId={currentOrderId!}
                    onSuccess={() => processCheckout()}
                    onCancel={() => {
                      setShowPaymentModal(false);
                      setStripeClientSecret(null);
                      setCurrentOrderId(null);
                    }}
                  />
                </Elements>
              </div>
            )}
          </div>

          <DialogFooter className="flex flex-col gap-2 sm:flex-col">
            {!currentOrderId ? (
              <>
                <Button
                  className="w-full"
                  onClick={handlePaymentMethodSubmit}
                  disabled={isProcessing}
                >
                  {isProcessing ? t("common.processing") : t("cart.checkout")}
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowPaymentModal(false)}
                  disabled={isProcessing}
                >
                  {t("common.cancel")}
                </Button>
              </>
            ) : paymentMethod === "BAKONG" && bakongQR ? (
              <>
                <Button
                  className="w-full"
                  onClick={processCheckout}
                  disabled={isProcessing || isGeneratingQR}
                >
                  {isProcessing ? t("common.confirming") : t("cart.complete_payment")}
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setShowPaymentModal(false);
                    setBakongQR(null);
                    setCurrentOrderId(null);
                  }}
                  disabled={isProcessing}
                >
                  {t("common.cancel")}
                </Button>
              </>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clear Cart Confirmation Dialog */}
      <AlertDialog open={showClearCartDialog} onOpenChange={setShowClearCartDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("cart.confirm_clear")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("cart.confirm_clear_desc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={clearCart} disabled={isProcessing}>
              {isProcessing ? t("common.processing") : t("cart.clear")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}

// Stripe Payment Form Component
function StripePaymentForm({ clientSecret, orderId, onSuccess, onCancel }: {
  clientSecret: string;
  orderId: number;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { t } = useTranslation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement)!,
        },
      });

      if (error) {
        setErrorMessage(error.message || "Payment failed");
        toast({
          title: "Payment Failed",
          description: error.message,
          variant: "destructive",
        });
      } else if (paymentIntent.status === "succeeded") {
        // Confirm payment with backend
        await stripeAPI.confirmPayment(paymentIntent.id, orderId);
        
        toast({
          title: "Payment Successful!",
          description: `Order #${orderId} has been paid successfully.`,
        });
        onSuccess();
      }
    } catch (error) {
      setErrorMessage("An error occurred during payment");
      toast({
        title: "Payment Error",
        description: error instanceof Error ? error.message : "Could not process payment",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="border rounded-lg p-4 bg-white">
        <Label className="mb-2 block">{t("cart.card_details")}</Label>
        <CardElement
          options={{
            style: {
              base: {
                fontSize: "16px",
                color: "#424770",
                "::placeholder": {
                  color: "#aab7c4",
                },
              },
              invalid: {
                color: "#9e2146",
              },
            },
          }}
        />
      </div>

      {errorMessage && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">
          {errorMessage}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Button
          type="submit"
          className="w-full"
          disabled={!stripe || isProcessing}
        >
          {isProcessing ? t("common.processing") : t("cart.pay_now")}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={onCancel}
          disabled={isProcessing}
        >
          {t("common.cancel")}
        </Button>
      </div>
    </form>
  );
}
