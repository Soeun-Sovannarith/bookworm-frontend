export interface User {
  id: number;
  name: string;
  email: string;
  password?: string;
  role: "USER" | "ADMIN";
  createdAt: string;
}

export interface Book {
  bookID: number;
  title: string;
  author: string;
  published_date: string;
  stock: number;
  category: string;
  price: number;
  description: string;
  imageURL: string;
}

export interface Order {
  id: number;
  userId: number;
  totalAmount: number;
  status: "PENDING" | "CONFIRMED" | "SHIPPED" | "DELIVERED" | "CANCELLED";
  paymentMethod: "CREDIT_CARD" | "DEBIT_CARD" | "PAYPAL" | "BANK_TRANSFER" | "BAKONG";
  paymentStatus: "PENDING" | "COMPLETED" | "FAILED";
  shippingAddress: string;
  createdAt: string;
}

export interface CartItem {
  id: number;
  userId: number;
  bookId: number;
  quantity: number;
  createdAt: string;
}

export interface Payment {
  id: number;
  orderId: number;
  amount: number;
  paymentMethod: "CREDIT_CARD" | "DEBIT_CARD" | "PAYPAL" | "BANK_TRANSFER" | "BAKONG";
  paymentStatus: "PENDING" | "COMPLETED" | "FAILED";
  createdAt: string;
}

export interface BakongPaymentRequest {
  orderId: number;
  currency: "USD" | "KHR";
}

export interface BakongPaymentResponse {
  qrCode: string;
  md5: string;
  billNumber: string;
  amount: number;
  currency: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  role: "USER" | "ADMIN";
}
