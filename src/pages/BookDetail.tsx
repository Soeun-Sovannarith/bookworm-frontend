import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { booksAPI, cartAPI, openLibraryAPI } from "@/lib/api";
import type { Book } from "@/types";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ShoppingCart } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function BookDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { incrementCartCount } = useCart();
  const [book, setBook] = useState<Book | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingToCart, setIsAddingToCart] = useState(false);

  useEffect(() => {
    if (id) {
      loadBook(parseInt(id));
    }
  }, [id]);

  const loadBook = async (bookId: number) => {
    try {
      const data = await booksAPI.getById(bookId);
      // Enrich with Open Library cover
      const enrichedBooks = await openLibraryAPI.enrichBooksWithCovers([data]);
      setBook(enrichedBooks[0]);
    } catch (error) {
      toast({
        title: "Error loading book",
        description: error instanceof Error ? error.message : "Could not fetch book details",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToCart = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }

    if (!book) return;

    setIsAddingToCart(true);
    try {
      await cartAPI.create({
        userId: user.id,
        bookId: book.bookID,
        quantity: 1,
      });

      // Increment cart count badge
      incrementCartCount();

      toast({
        title: "Added to cart",
        description: `${book.title} has been added to your cart`,
      });
    } catch (error) {
      toast({
        title: "Error adding to cart",
        description: error instanceof Error ? error.message : "Could not add item to cart",
        variant: "destructive",
      });
    } finally {
      setIsAddingToCart(false);
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16">
          <div className="text-center">
            <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-muted-foreground">Loading book details...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!book) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <p className="text-muted-foreground">Book not found</p>
          <Button onClick={() => navigate("/books")} className="mt-4">
            Back to Books
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => navigate("/books")} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Books
        </Button>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Book Image */}
          <div className="aspect-[2/3] bg-muted rounded-lg overflow-hidden max-w-sm mx-auto md:mx-0">
            <img
              src={book.imageURL}
              alt={book.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='450'%3E%3Crect width='300' height='450' fill='%23e5e7eb'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='20' fill='%239ca3af'%3ENo Cover%3C/text%3E%3C/svg%3E";
              }}
            />
          </div>

          {/* Book Details */}
          <div>
            <h1 className="text-4xl font-bold mb-2">{book.title}</h1>
            <p className="text-xl text-muted-foreground mb-4">by {book.author}</p>

            <div className="flex items-center gap-4 mb-6">
              <span className="text-3xl font-bold text-primary">${book.price.toFixed(2)}</span>
              <span className="px-3 py-1 bg-secondary text-secondary-foreground rounded-full text-sm">
                {book.category}
              </span>
            </div>

            <div className="mb-6">
              <p className="text-sm text-muted-foreground mb-1">Published: {book.published_date}</p>
              <p className="text-sm text-muted-foreground">
                Availability: {book.stock > 0 ? `${book.stock} in stock` : "Out of stock"}
              </p>
            </div>

            <div className="mb-8">
              <h2 className="text-lg font-semibold mb-2">Description</h2>
              <p className="text-muted-foreground leading-relaxed">{book.description}</p>
            </div>

            <Button
              size="lg"
              onClick={handleAddToCart}
              disabled={book.stock === 0 || isAddingToCart}
              className="w-full md:w-auto gap-2"
            >
              <ShoppingCart className="w-5 h-5" />
              {isAddingToCart ? "Adding..." : book.stock === 0 ? "Out of Stock" : "Add to Cart"}
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
