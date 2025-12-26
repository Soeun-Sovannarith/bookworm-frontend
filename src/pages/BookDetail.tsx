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
import { useTranslation } from "react-i18next";
import { SEO, pageSEO } from "@/components/SEO";

export default function BookDetail() {
  const { t } = useTranslation();
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
      const enrichedBooks = await openLibraryAPI.enrichBooksWithCovers([data]);
      setBook(enrichedBooks[0]);
    } catch (error) {
      toast({
        title: t("bookDetail.error_loading"),
        description:
          error instanceof Error
            ? error.message
            : t("bookDetail.fetch_error"),
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

      incrementCartCount();

      toast({
        title: t("bookDetail.added_title"),
        description: t("bookDetail.added_desc", { title: book.title }),
      });
    } catch (error) {
      toast({
        title: t("bookDetail.error_add"),
        description:
          error instanceof Error
            ? error.message
            : t("bookDetail.add_error"),
        variant: "destructive",
      });
    } finally {
      setIsAddingToCart(false);
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <SEO />
        <div className="container mx-auto px-4 py-16 text-center">
          <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">{t("bookDetail.loading")}</p>
        </div>
      </Layout>
    );
  }

  if (!book) {
    return (
      <Layout>
        <SEO />
        <div className="container mx-auto px-4 py-16 text-center">
          <p className="text-muted-foreground">{t("bookDetail.not_found")}</p>
          <Button onClick={() => navigate("/books")} className="mt-4">
            {t("bookDetail.back_to_books")}
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>      <SEO {...pageSEO.bookDetail(book.title)} />      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => navigate("/books")} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t("bookDetail.back_to_books")}
        </Button>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="aspect-[2/3] bg-muted rounded-lg overflow-hidden max-w-sm mx-auto md:mx-0">
            <img src={book.imageURL} alt={book.title} className="w-full h-full object-cover" />
          </div>

          <div>
            <h1 className="text-4xl font-bold mb-2">{book.title}</h1>
            <p className="text-xl text-muted-foreground mb-4">
              {t("bookDetail.by_author", { author: book.author })}
            </p>

            <div className="flex items-center gap-4 mb-6">
              <span className="text-3xl font-bold text-primary">
                ${book.price.toFixed(2)}
              </span>
              <span className="px-3 py-1 bg-secondary rounded-full text-sm">
                {book.category}
              </span>
            </div>

            <div className="mb-6">
              <p className="text-sm text-muted-foreground mb-1">
                {t("bookDetail.published")} {book.published_date}
              </p>
              <p className="text-sm text-muted-foreground">
                {t("bookDetail.availability")}{" "}
                {book.stock > 0
                  ? t("bookDetail.in_stock", { count: book.stock })
                  : t("bookDetail.out_of_stock")}
              </p>
            </div>

            <div className="mb-8">
              <h2 className="text-lg font-semibold mb-2">
                {t("bookDetail.description")}
              </h2>
              <p className="text-muted-foreground">{book.description}</p>
            </div>

            <Button
              size="lg"
              onClick={handleAddToCart}
              disabled={book.stock === 0 || isAddingToCart}
              className="gap-2"
            >
              <ShoppingCart className="w-5 h-5" />
              {isAddingToCart
                ? t("bookDetail.adding")
                : book.stock === 0
                ? t("bookDetail.out_of_stock")
                : t("bookDetail.add_to_cart")}
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
