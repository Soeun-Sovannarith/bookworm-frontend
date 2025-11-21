import { Link } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { BookOpen, Search, ShoppingBag, Star } from "lucide-react";

export default function Home() {
  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary/10 via-background to-accent/10 py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-5xl font-bold mb-6 text-foreground">
              Welcome to BookHaven
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Discover your next great read from our curated collection of timeless classics and modern bestsellers
            </p>
            <div className="flex gap-4 justify-center">
              <Link to="/books">
                <Button size="lg" className="gap-2">
                  <Search className="w-5 h-5" />
                  Browse Books
                </Button>
              </Link>
              <Link to="/auth">
                <Button size="lg" variant="outline" className="gap-2">
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6 bg-card rounded-lg border">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Vast Collection</h3>
              <p className="text-muted-foreground">
                Thousands of books across all genres and categories
              </p>
            </div>

            <div className="text-center p-6 bg-card rounded-lg border">
              <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShoppingBag className="w-8 h-8 text-accent" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Easy Shopping</h3>
              <p className="text-muted-foreground">
                Simple cart and checkout process with secure payments
              </p>
            </div>

            <div className="text-center p-6 bg-card rounded-lg border">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Quality Guaranteed</h3>
              <p className="text-muted-foreground">
                Carefully selected books with detailed descriptions
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-muted">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Start Your Literary Journey Today</h2>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of readers who trust BookHaven for their reading needs
          </p>
          <Link to="/books">
            <Button size="lg">Explore Our Catalog</Button>
          </Link>
        </div>
      </section>
    </Layout>
  );
}
