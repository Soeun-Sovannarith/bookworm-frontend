import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { ordersAPI } from "@/lib/api";
import type { Order } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";

export default function Orders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadOrders();
    }
  }, [user]);

  const loadOrders = async () => {
    if (!user) return;

    try {
      const data = await ordersAPI.getByUserId(user.id);
      setOrders(data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch (error) {
      toast({
        title: "Error loading orders",
        description: error instanceof Error ? error.message : "Could not fetch orders",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: "bg-yellow-500",
      CONFIRMED: "bg-blue-500",
      SHIPPED: "bg-purple-500",
      DELIVERED: "bg-green-500",
      CANCELLED: "bg-red-500",
    };
    return colors[status] || "bg-gray-500";
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16">
          <div className="text-center">
            <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-muted-foreground">Loading orders...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8">My Orders</h1>

        {orders.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">You haven't placed any orders yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <Card key={order.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>Order #{order.id}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge className={getStatusColor(order.status)}>
                      {order.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Amount</p>
                      <p className="text-lg font-bold">${order.totalAmount.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Payment Method</p>
                      <p>{order.paymentMethod.replace("_", " ")}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Payment Status</p>
                      <Badge variant={order.paymentStatus === "COMPLETED" ? "default" : "secondary"}>
                        {order.paymentStatus}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Shipping Address</p>
                      <p className="text-sm">{order.shippingAddress}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
