import type { 
  User, 
  Book, 
  Order, 
  CartItem, 
  Payment, 
  AuthResponse, 
  LoginRequest, 
  RegisterRequest 
} from "@/types";

const API_BASE_URL = "http://localhost:8080";
const API_KEY = "Jct6ISFPFCPTVN5Owb3zsf9j6CMWR3qADNrp9r18icxwkibA";

// Helper to get auth header
const getAuthHeader = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Helper for API key header
const getApiKeyHeader = () => ({
  "X-API-Key": API_KEY,
});

// Generic fetch wrapper
async function fetchAPI<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || `Request failed: ${response.status}`);
  }

  return response.json();
}

// Auth API
export const authAPI = {
  login: (data: LoginRequest) =>
    fetchAPI<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  register: (data: RegisterRequest) =>
    fetchAPI<{ message: string }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

// Users API
export const usersAPI = {
  getAll: () =>
    fetchAPI<User[]>("/api/users", {
      headers: getAuthHeader(),
    }),

  getById: (id: number) =>
    fetchAPI<User>(`/api/users/${id}`, {
      headers: getAuthHeader(),
    }),

  create: (data: Partial<User>) =>
    fetchAPI<User>("/api/users", {
      method: "POST",
      headers: getAuthHeader(),
      body: JSON.stringify(data),
    }),

  update: (id: number, data: Partial<User>) =>
    fetchAPI<User>(`/api/users/${id}`, {
      method: "PUT",
      headers: getAuthHeader(),
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    fetchAPI<void>(`/api/users/${id}`, {
      method: "DELETE",
      headers: getAuthHeader(),
    }),
};

// Books API
export const booksAPI = {
  getAll: () => fetchAPI<Book[]>("/api/books"),

  getById: (id: number) => fetchAPI<Book>(`/api/books/${id}`),

  getByCategory: (category: string) =>
    fetchAPI<Book[]>(`/api/books/category/${category}`),

  searchByTitle: (title: string) =>
    fetchAPI<Book[]>(`/api/books/search/title?title=${encodeURIComponent(title)}`),

  searchByAuthor: (author: string) =>
    fetchAPI<Book[]>(`/api/books/search/author?author=${encodeURIComponent(author)}`),

  create: (data: Partial<Book>) =>
    fetchAPI<Book>("/api/books", {
      method: "POST",
      headers: getApiKeyHeader(),
      body: JSON.stringify(data),
    }),

  update: (id: number, data: Partial<Book>) =>
    fetchAPI<Book>(`/api/books/${id}`, {
      method: "PUT",
      headers: getApiKeyHeader(),
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    fetchAPI<void>(`/api/books/${id}`, {
      method: "DELETE",
      headers: getApiKeyHeader(),
    }),
};

// Orders API
export const ordersAPI = {
  getAll: () =>
    fetchAPI<Order[]>("/api/orders", {
      headers: getAuthHeader(),
    }),

  getById: (id: number) =>
    fetchAPI<Order>(`/api/orders/${id}`, {
      headers: getAuthHeader(),
    }),

  getByUserId: (userId: number) =>
    fetchAPI<Order[]>(`/api/orders/user/${userId}`, {
      headers: getAuthHeader(),
    }),

  getByStatus: (status: string) =>
    fetchAPI<Order[]>(`/api/orders/status/${status}`, {
      headers: getAuthHeader(),
    }),

  create: (data: Partial<Order>) =>
    fetchAPI<Order>("/api/orders", {
      method: "POST",
      headers: getAuthHeader(),
      body: JSON.stringify(data),
    }),

  update: (id: number, data: Partial<Order>) =>
    fetchAPI<Order>(`/api/orders/${id}`, {
      method: "PUT",
      headers: getAuthHeader(),
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    fetchAPI<void>(`/api/orders/${id}`, {
      method: "DELETE",
      headers: getAuthHeader(),
    }),
};

// Cart Items API
export const cartAPI = {
  getAll: () =>
    fetchAPI<CartItem[]>("/api/cart-items", {
      headers: getAuthHeader(),
    }),

  getById: (id: number) =>
    fetchAPI<CartItem>(`/api/cart-items/${id}`, {
      headers: getAuthHeader(),
    }),

  getByUserId: (userId: number) =>
    fetchAPI<CartItem[]>(`/api/cart-items/user/${userId}`, {
      headers: getAuthHeader(),
    }),

  create: (data: Partial<CartItem>) =>
    fetchAPI<CartItem>("/api/cart-items", {
      method: "POST",
      headers: getAuthHeader(),
      body: JSON.stringify(data),
    }),

  update: (id: number, data: Partial<CartItem>) =>
    fetchAPI<CartItem>(`/api/cart-items/${id}`, {
      method: "PUT",
      headers: getAuthHeader(),
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    fetchAPI<void>(`/api/cart-items/${id}`, {
      method: "DELETE",
      headers: getAuthHeader(),
    }),
};

// Payments API
export const paymentsAPI = {
  getAll: () =>
    fetchAPI<Payment[]>("/api/payments", {
      headers: getAuthHeader(),
    }),

  getById: (id: number) =>
    fetchAPI<Payment>(`/api/payments/${id}`, {
      headers: getAuthHeader(),
    }),

  getByOrderId: (orderId: number) =>
    fetchAPI<Payment[]>(`/api/payments/order/${orderId}`, {
      headers: getAuthHeader(),
    }),

  create: (data: Partial<Payment>) =>
    fetchAPI<Payment>("/api/payments", {
      method: "POST",
      headers: getAuthHeader(),
      body: JSON.stringify(data),
    }),

  update: (id: number, data: Partial<Payment>) =>
    fetchAPI<Payment>(`/api/payments/${id}`, {
      method: "PUT",
      headers: getAuthHeader(),
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    fetchAPI<void>(`/api/payments/${id}`, {
      method: "DELETE",
      headers: getAuthHeader(),
    }),
};
