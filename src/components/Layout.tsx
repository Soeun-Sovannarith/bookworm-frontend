import { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, ShoppingCart, User, LogOut, LayoutDashboard } from "lucide-react";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/ui/language-switcher";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const { cartCount } = useCart();
  const navigate = useNavigate();
  const { t } = useTranslation();

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
                <Button variant="ghost">{t("nav.browse_books")}</Button>
              </Link>

              <LanguageSwitcher />

              {user ? (
                <>
                  <Link to="/cart">
                    <Button variant="ghost" size="icon" className="relative">
                      <ShoppingCart className="w-5 h-5" />
                      {cartCount > 0 && (
                        <Badge 
                          className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                          variant="destructive"
                        >
                          {cartCount > 99 ? '99+' : cartCount}
                        </Badge>
                      )}
                    </Button>
                  </Link>

                  <Link to="/orders">
                    <Button variant="ghost">{t("nav.my_orders")}</Button>
                  </Link>

                  {user.role === "ADMIN" && (
                    <Link to="/admin">
                      <Button variant="outline">
                        <LayoutDashboard className="w-4 h-4 mr-2" />
                        {t("nav.admin")}
                      </Button>
                    </Link>
                  )}

                  <div className="flex items-center gap-2">
                    <Link to="/profile">
                      <Button variant="ghost" size="icon" title="My Profile">
                        <User className="w-5 h-5" />
                      </Button>
                    </Link>
                    <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout">
                      <LogOut className="w-5 h-5" />
                    </Button>
                  </div>
                </>
              ) : (
                <Link to="/auth">
                  <Button>{t("nav.sign_in")}</Button>
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
            <p>{t("nav.copyright")}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
