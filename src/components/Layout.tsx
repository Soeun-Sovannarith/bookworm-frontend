import { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { BookOpen, ShoppingCart, User, LogOut, LayoutDashboard } from "lucide-react";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 text-2xl font-bold text-primary">
              <BookOpen className="w-8 h-8" />
              <span>BookHaven</span>
            </Link>

            <nav className="flex items-center gap-4">
              <Link to="/books">
                <Button variant="ghost">Browse Books</Button>
              </Link>

              {user ? (
                <>
                  <Link to="/cart">
                    <Button variant="ghost" size="icon">
                      <ShoppingCart className="w-5 h-5" />
                    </Button>
                  </Link>

                  <Link to="/orders">
                    <Button variant="ghost">My Orders</Button>
                  </Link>

                  {user.role === "ADMIN" && (
                    <Link to="/admin">
                      <Button variant="outline">
                        <LayoutDashboard className="w-4 h-4 mr-2" />
                        Admin
                      </Button>
                    </Link>
                  )}

                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon">
                      <User className="w-5 h-5" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={handleLogout}>
                      <LogOut className="w-5 h-5" />
                    </Button>
                  </div>
                </>
              ) : (
                <Link to="/auth">
                  <Button>Sign In</Button>
                </Link>
              )}
            </nav>
          </div>
        </div>
      </header>

      <main>{children}</main>

      <footer className="border-t mt-20 bg-muted">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-muted-foreground">
            <p>© 2025 BookHaven. Your trusted online bookstore.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
