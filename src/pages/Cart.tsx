import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { cartAPI, booksAPI, ordersAPI, openLibraryAPI } from "@/lib/api";
import type { CartItem, Book } from "@/types";
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
  const [paymentMethod, setPaymentMethod] = useState<"CREDIT_CARD" | "DEBIT_CARD" | "PAYPAL" | "BANK_TRANSFER">("CREDIT_CARD");
  const [shippingAddress, setShippingAddress] = useState("");

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

  const processCheckout = async () => {
    if (!user) return;

    try {
      setIsProcessing(true);

      console.log("Creating order...", {
        userId: user.id,
        totalAmount: calculateTotal(),
        status: "PENDING",
        paymentMethod,
        paymentStatus: "COMPLETED",
        shippingAddress,
      });

      // Create order
      const order = await ordersAPI.create({
        userId: user.id,
        totalAmount: calculateTotal(),
        status: "PENDING",
        paymentMethod,
        paymentStatus: "COMPLETED",
        shippingAddress,
      });

      console.log("Order created successfully:", order);

      // Clear the cart after successful checkout
      console.log("Clearing cart items...");
      const deletePromises = cartItems.map(item => {
        console.log(`Deleting cart item ${item.id}`);
        return cartAPI.delete(item.id);
      });
      await Promise.all(deletePromises);
      
      console.log("Cart cleared successfully");

      // Update UI state
      setCartItems([]);
      setShowPaymentModal(false);
      setShippingAddress("");

      // Clear cart count badge
      clearCartCount();

      // Show success message
      toast({
        title: "Payment Successful!",
        description: `Your order #${order.id} has been placed successfully. Cart has been cleared.`,
      });

      // Redirect to orders page after a short delay
      setTimeout(() => {
        navigate("/orders");
      }, 1500);
    } catch (error) {
      console.error("Checkout error:", error);
      toast({
        title: "Checkout failed",
        description: error instanceof Error ? error.message : "Could not complete checkout",
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Payment</DialogTitle>
            <DialogDescription>
              Select your payment method to complete the order
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
            </div>

            <div>
              <Label className="mb-3 block">Payment Method</Label>
              <RadioGroup value={paymentMethod} onValueChange={(value: any) => setPaymentMethod(value)}>
                <div className="flex items-center space-x-2 border rounded-lg p-3">
                  <RadioGroupItem value="CREDIT_CARD" id="credit" />
                  <Label htmlFor="credit" className="flex-1 cursor-pointer">
                    Credit Card
                  </Label>
                </div>
                <div className="flex items-center space-x-2 border rounded-lg p-3">
                  <RadioGroupItem value="DEBIT_CARD" id="debit" />
                  <Label htmlFor="debit" className="flex-1 cursor-pointer">
                    Debit Card
                  </Label>
                </div>
                <div className="flex items-center space-x-2 border rounded-lg p-3">
                  <RadioGroupItem value="PAYPAL" id="paypal" />
                  <Label htmlFor="paypal" className="flex-1 cursor-pointer">
                    PayPal
                  </Label>
                </div>
                <div className="flex items-center space-x-2 border rounded-lg p-3">
                  <RadioGroupItem value="BANK_TRANSFER" id="bank" />
                  <Label htmlFor="bank" className="flex-1 cursor-pointer">
                    Bank Transfer
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPaymentModal(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button onClick={processCheckout} disabled={isProcessing}>
              {isProcessing ? "Processing..." : "Confirm Payment"}
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
