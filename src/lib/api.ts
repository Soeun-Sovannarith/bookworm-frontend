import type { 
  User, 
  Book, 
  Order, 
  CartItem, 
  Payment, 
  AuthResponse, 
  LoginRequest, 
  RegisterRequest,
  BakongPaymentRequest,
  BakongPaymentResponse,
  StripePaymentRequest,
  StripePaymentResponse,
  StripeConfig
} from "@/types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const API_KEY = import.meta.env.VITE_API_KEY;

if (!API_BASE_URL) {
  throw new Error("VITE_API_BASE_URL environment variable is not set");
}

if (!API_KEY) {
  throw new Error("VITE_API_KEY environment variable is not set");
}

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
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    // Log only in development mode
    if (import.meta.env.DEV) {
      console.error(`API Error:`, response.status, response.statusText);
    }
    throw new Error(error.error || error.message || `Request failed: ${response.status}`);
  }

  // Handle empty responses (like DELETE operations)
  const contentType = response.headers.get("content-type");
  const contentLength = response.headers.get("content-length");
  
  if (contentLength === "0" || !contentType?.includes("application/json")) {
    return undefined as T;
  }

  // Check if response has content
  const text = await response.text();
  if (!text || text.trim() === "") {
    return undefined as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch (e) {
    console.warn("Failed to parse JSON response:", text);
    return undefined as T;
  }
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

// Open Library API for book covers
// Following Open Library guidelines: https://openlibrary.org/dev/docs/api/covers
export const openLibraryAPI = {
  /**
   * Get Open Library cover URL by ISBN
   * @param isbn - Book ISBN (10 or 13 digits)
   * @param size - Cover size: S (small), M (medium), or L (large)
   * @returns Direct URL to the book cover image
   */
  getCoverByISBN: (isbn: string, size: 'S' | 'M' | 'L' = 'L'): string => {
    return `https://covers.openlibrary.org/b/isbn/${isbn}-${size}.jpg`;
  },

  /**
   * Get Open Library cover URL by OLID (Open Library ID)
   * @param olid - Open Library ID (e.g., OL7353617M)
   * @param size - Cover size: S (small), M (medium), or L (large)
   * @returns Direct URL to the book cover image
   */
  getCoverByOLID: (olid: string, size: 'S' | 'M' | 'L' = 'L'): string => {
    return `https://covers.openlibrary.org/b/olid/${olid}-${size}.jpg`;
  },

  /**
   * Search for a book and get its cover URL using Open Library Search API
   * Note: This is used sparingly and only when necessary, following Open Library guidelines
   * @param title - Book title to search for
   * @param author - Optional author name for better matching
   * @returns URL to the book cover image or null if not found
   */
  searchBookCover: async (title: string, author?: string): Promise<string | null> => {
    try {
      // Clean up and normalize search terms
      const cleanTitle = title.trim();
      const cleanAuthor = author?.trim();
      
      // Try multiple search strategies
      const searchStrategies = [
        // Strategy 1: Exact title and author
        cleanAuthor ? `title=${encodeURIComponent(cleanTitle)}&author=${encodeURIComponent(cleanAuthor)}` : `title=${encodeURIComponent(cleanTitle)}`,
        // Strategy 2: Just title (broader search)
        `q=${encodeURIComponent(cleanTitle)}`,
      ];
      
      for (const [index, searchQuery] of searchStrategies.entries()) {
        const searchUrl = `https://openlibrary.org/search.json?${searchQuery}&limit=5`;
        // console.log(`🔍 Search Strategy ${index + 1} for: "${cleanTitle}" - ${searchUrl}`);
        
        const searchResponse = await fetch(searchUrl);
        
        if (!searchResponse.ok) {
          // console.warn(`⚠️ Open Library API returned status: ${searchResponse.status}`);
          continue;
        }
        
        const searchData = await searchResponse.json();
        // console.log(`📚 Found ${searchData.numFound || 0} results for "${cleanTitle}"`);

        if (searchData.docs && searchData.docs.length > 0) {
          // Try to find the best match
          for (const book of searchData.docs) {
            // console.log(`  📖 Checking: "${book.title}" by ${book.author_name?.join(', ') || 'unknown'}`);
            
            // Priority 1: Use ISBN (most reliable)
            if (book.isbn && book.isbn.length > 0) {
              const isbn = book.isbn[0];
              const coverUrl = openLibraryAPI.getCoverByISBN(isbn, 'L');
              // console.log(`✅ Found cover via ISBN: ${coverUrl}`);
              return coverUrl;
            }
            
            // Priority 2: Use OLID (Open Library ID)
            if (book.cover_edition_key) {
              const coverUrl = openLibraryAPI.getCoverByOLID(book.cover_edition_key, 'L');
              // console.log(`✅ Found cover via OLID: ${coverUrl}`);
              return coverUrl;
            }
            
            // Priority 3: Use Cover ID (internal ID)
            if (book.cover_i) {
              const coverUrl = `https://covers.openlibrary.org/b/id/${book.cover_i}-L.jpg`;
              // console.log(`✅ Found cover via Cover ID: ${coverUrl}`);
              return coverUrl;
            }
          }
        }
      }
      
      // console.warn(`⚠️ No cover found for "${cleanTitle}" after trying all strategies`);
      return null;
    } catch (error) {
      // Silently fail for cover images
      return null;
    }
  },

  /**
   * Enrich books array with Open Library cover images
   * Uses search API sparingly, following Open Library best practices
   * @param books - Array of books to enrich
   * @returns Books with updated imageURL from Open Library
   */
  enrichBooksWithCovers: async (books: Book[]): Promise<Book[]> => {
    // Process books in smaller batches to avoid overwhelming the API
    const batchSize = 5;
    const enrichedBooks: Book[] = [];
    
    for (let i = 0; i < books.length; i += batchSize) {
      const batch = books.slice(i, i + batchSize);
      
      const batchResults = await Promise.all(
        batch.map(async (book) => {
          // Check if book has a valid image URL (not empty, not placeholder, not invalid like "book.jpg")
          const isValidURL = book.imageURL && 
                            book.imageURL !== "" && 
                            !book.imageURL.includes("placeholder") && 
                            !book.imageURL.includes("data:image") &&
                            (book.imageURL.startsWith("http://") || book.imageURL.startsWith("https://")) &&
                            !book.imageURL.includes("book.jpg");
          
          // Skip if book already has a valid image URL
          if (isValidURL) {
            return book;
          }

          // Search for cover using title and author
          const coverUrl = await openLibraryAPI.searchBookCover(book.title, book.author);
          
          return {
            ...book,
            imageURL: coverUrl || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='450'%3E%3Crect width='300' height='450' fill='%23e5e7eb'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='20' fill='%239ca3af'%3ENo Cover%3C/text%3E%3C/svg%3E",
          };
        })
      );
      
      enrichedBooks.push(...batchResults);
      
      // Add a small delay between batches to be respectful to the API
      if (i + batchSize < books.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return enrichedBooks;
  },

  /**
   * Get Open Library book page URL
   * @param isbn - Book ISBN for creating a courtesy link
   * @returns URL to the book's page on Open Library
   */
  getBookPageURL: (isbn: string): string => {
    return `https://openlibrary.org/isbn/${isbn}`;
  },
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

// Bakong Payment API
export const bakongAPI = {
  generateQR: (orderId: number, currency: "USD" | "KHR" = "USD", expiresInMinutes: number = 30) =>
    fetchAPI<BakongPaymentResponse>("/api/payments/bakong/generate-qr", {
      method: "POST",
      headers: getAuthHeader(),
      body: JSON.stringify({ orderId, currency, expiresInMinutes }),
    }),

  verifyPayment: (md5: string, orderId: number) =>
    fetchAPI<{ status: string; message: string }>(`/api/payments/bakong/verify-payment?md5=${md5}&orderId=${orderId}`, {
      method: "POST",
      headers: getAuthHeader(),
    }),
};

// Stripe Payment API
export const stripeAPI = {
  getConfig: () =>
    fetchAPI<StripeConfig>("/api/payments/stripe/config", {
      headers: getAuthHeader(),
    }),

  createPaymentIntent: (request: StripePaymentRequest) =>
    fetchAPI<StripePaymentResponse>("/api/payments/stripe/create-payment-intent", {
      method: "POST",
      headers: getAuthHeader(),
      body: JSON.stringify(request),
    }),

  confirmPayment: (paymentIntentId: string, orderId: number) =>
    fetchAPI<{ status: string; paymentIntentId: string; orderId: number }>("/api/payments/stripe/confirm", {
      method: "POST",
      headers: getAuthHeader(),
      body: JSON.stringify({ paymentIntentId, orderId }),
    }),

  cancelPayment: (paymentIntentId: string) =>
    fetchAPI<{ status: string; paymentIntentId: string }>(`/api/payments/stripe/cancel/${paymentIntentId}`, {
      method: "POST",
      headers: getAuthHeader(),
    }),
};
