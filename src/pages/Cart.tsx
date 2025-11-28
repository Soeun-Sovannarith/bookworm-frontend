import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { cartAPI, booksAPI, ordersAPI, openLibraryAPI, bakongAPI } from "@/lib/api";
import type { CartItem, Book, BakongPaymentResponse } from "@/types";
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
import { Trash2, Plus, Minus, ShoppingCart } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { QRCodeSVG } from "qrcode.react";

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

      // Enrich books with Open Library covers
      const books = itemsWithBooks.map(item => item.book).filter((book): book is Book => book !== undefined);
      const enrichedBooks = await openLibraryAPI.enrichBooksWithCovers(books);
      
      // Map enriched books back to cart items
      const enrichedCartItems = itemsWithBooks.map(item => {
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
      console.log("Updating cart item:", {
        itemId,
        newQuantity,
        userId: user.id,
        bookId: item.bookId,
        token: localStorage.getItem("token") ? "exists" : "missing",
      });

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

  const handleCheckout = async () => {
    if (!shippingAddress.trim()) {
      toast({
        title: "Shipping address required",
        description: "Please enter your shipping address",
        variant: "destructive",
      });
      return;
    }

    if (!user) return;

    try {
      setIsProcessing(true);
      setShowPaymentModal(true);

      // Create order first
      const order = await ordersAPI.create({
        userId: user.id,
        totalAmount: calculateTotal(),
        status: "PENDING",
        paymentMethod: "BAKONG",
        paymentStatus: "PENDING",
        shippingAddress,
      });

      setCurrentOrderId(order.id);

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
        // If Bakong endpoint returns 403 or is not implemented yet
        console.error("Bakong QR generation failed:", qrError);
        toast({
          title: "Backend Not Ready",
          description: "Bakong payment endpoint not implemented yet. Please check bakong.md for backend implementation guide.",
          variant: "destructive",
        });
        setShowPaymentModal(false);
        setCurrentOrderId(null);
      } finally {
        setIsGeneratingQR(false);
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
            <p className="text-muted-foreground">Loading cart...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">Shopping Cart</h1>
          {cartItems.length > 0 && (
            <Button
              variant="outline"
              onClick={() => setShowClearCartDialog(true)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear Cart
            </Button>
          )}
        </div>

        {cartItems.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
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
                            Only {item.book.stock} left in stock
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
                  <h2 className="text-xl font-semibold mb-4">Order Summary</h2>

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Items ({cartItems.length})</span>
                      <span>${calculateTotal().toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Shipping</span>
                      <span className="text-green-600">Free</span>
                    </div>
                  </div>

                  <div className="border-t pt-4 mb-6">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span>${calculateTotal().toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="space-y-4 mb-4">
                    <div>
                      <Label htmlFor="shipping">Shipping Address</Label>
                      <Input
                        id="shipping"
                        placeholder="Enter your address"
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
                    Proceed to Checkout
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Bakong Payment</DialogTitle>
            <DialogDescription>
              Scan the QR code with your Bakong app to complete payment
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="border rounded-lg p-4 bg-muted">
              <div className="flex justify-between mb-2">
                <span className="text-sm text-muted-foreground">Total Amount:</span>
                <span className="text-lg font-bold">${calculateTotal().toFixed(2)}</span>
              </div>
              <div className="text-sm text-muted-foreground">
                Shipping to: {shippingAddress}
              </div>
              {currentOrderId && (
                <div className="text-sm text-muted-foreground mt-1">
                  Order ID: #{currentOrderId}
                </div>
              )}
            </div>

            {isGeneratingQR && (
              <div className="text-center py-8">
                <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                <p className="text-muted-foreground">Generating QR code...</p>
              </div>
            )}

            {bakongQR && !isGeneratingQR && (
              <div className="space-y-4">
                {/* QR Code Display */}
                <div className="flex justify-center bg-white p-6 rounded-lg">
                  <QRCodeSVG
                    value={bakongQR.qrCode}
                    size={256}
                    level="H"
                    includeMargin={true}
                  />
                </div>

                {/* Payment Instructions */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
                  <h4 className="font-semibold text-blue-900">Payment Instructions:</h4>
                  <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                    <li>Open your Bakong app</li>
                    <li>Tap "Scan QR" or "Pay"</li>
                    <li>Scan this QR code</li>
                    <li>Confirm the amount: ${bakongQR.amount.toFixed(2)}</li>
                    <li>Complete the payment</li>
                  </ol>
                </div>

                {/* Payment Details */}
                <div className="text-xs text-muted-foreground space-y-1">
                  <div>Bill Number: {bakongQR.billNumber}</div>
                  <div>Currency: {bakongQR.currency}</div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-col gap-2">
            <Button
              className="w-full"
              onClick={processCheckout}
              disabled={isProcessing || isGeneratingQR || !bakongQR}
            >
              {isProcessing ? "Confirming..." : "I've Completed Payment"}
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
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clear Cart Confirmation Dialog */}
      <AlertDialog open={showClearCartDialog} onOpenChange={setShowClearCartDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear Cart?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove all items from your cart? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={clearCart} disabled={isProcessing}>
              {isProcessing ? "Clearing..." : "Clear Cart"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
