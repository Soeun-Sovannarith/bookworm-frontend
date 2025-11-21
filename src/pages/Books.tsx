import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { booksAPI } from "@/lib/api";
import type { Book } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Search, Filter } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function Books() {
  const [books, setBooks] = useState<Book[]>([]);
  const [filteredBooks, setFilteredBooks] = useState<Book[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadBooks();
  }, []);

  useEffect(() => {
    filterBooks();
  }, [searchTerm, selectedCategory, books]);

  const loadBooks = async () => {
    try {
      const data = await booksAPI.getAll();
      setBooks(data);
      setFilteredBooks(data);
    } catch (error) {
      toast({
        title: "Error loading books",
        description: error instanceof Error ? error.message : "Could not fetch books",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filterBooks = () => {
    let result = books;

    if (selectedCategory !== "all") {
      result = result.filter((book) => book.category === selectedCategory);
    }

    if (searchTerm) {
      result = result.filter(
        (book) =>
          book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          book.author.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredBooks(result);
  };

  const categories = ["all", ...new Set(books.map((book) => book.category))];

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16">
          <div className="text-center">
            <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-muted-foreground">Loading books...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-6">Browse Our Collection</h1>

          {/* Search and Filter */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <Input
                placeholder="Search by title or author..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex gap-2 overflow-x-auto">
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  onClick={() => setSelectedCategory(category)}
                  className="whitespace-nowrap"
                >
                  {category === "all" ? "All Books" : category}
                </Button>
              ))}
            </div>
          </div>

          <p className="text-muted-foreground">
            Showing {filteredBooks.length} {filteredBooks.length === 1 ? "book" : "books"}
          </p>
        </div>

        {/* Books Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredBooks.map((book) => (
            <Link key={book.bookID} to={`/books/${book.bookID}`}>
              <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader className="p-0">
                  <div className="aspect-[2/3] bg-muted rounded-t-lg overflow-hidden">
                    <img
                      src={book.imageURL}
                      alt={book.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = "/placeholder.svg";
                      }}
                    />
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  <h3 className="font-semibold line-clamp-2 mb-2">{book.title}</h3>
                  <p className="text-sm text-muted-foreground mb-2">{book.author}</p>
                  <p className="text-xs text-muted-foreground">{book.category}</p>
                </CardContent>
                <CardFooter className="p-4 pt-0 flex justify-between items-center">
                  <span className="text-lg font-bold text-primary">${book.price.toFixed(2)}</span>
                  <span className="text-sm text-muted-foreground">
                    {book.stock > 0 ? `${book.stock} in stock` : "Out of stock"}
                  </span>
                </CardFooter>
              </Card>
            </Link>
          ))}
        </div>

        {filteredBooks.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No books found matching your criteria</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
