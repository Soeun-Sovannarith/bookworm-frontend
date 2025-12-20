import { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  BookOpen, 
  ShoppingCart, 
  User, 
  LogOut, 
  LayoutDashboard 
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { ModeSwitcher } from "./ui/mode-switcher";

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
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 text-2xl font-bold text-primary hover:opacity-90 transition-opacity">
              <BookOpen className="w-8 h-8" />
              <span className="hidden sm:inline">BookHaven</span>
            </Link>

            <nav className="flex items-center gap-1 sm:gap-2">
              
              <div className="flex items-center mr-2">
                <Link to="/books">
                  <Button variant="ghost" className="text-sm font-medium">
                    {t("nav.browse_books")}
                  </Button>
                </Link>
                {user?.role === "ADMIN" && (
                  <Link to="/admin" className="hidden md:block">
                    <Button variant="ghost" className="text-sm font-medium">
                      <LayoutDashboard className="w-4 h-4 mr-2" />
                      {t("nav.admin")}
                    </Button>
                  </Link>
                )}
              </div>

              <div className="flex items-center gap-1 border-l pl-2 border-border/60">
                <LanguageSwitcher />
                <ModeSwitcher />
              </div>

              <div className="flex items-center gap-1 border-l pl-2 border-border/60">
                {user ? (
                  <>
                    <Link to="/cart">
                      <Button variant="ghost" size="icon" className="relative" title="Cart">
                        <ShoppingCart className="w-5 h-5" />
                        {cartCount > 0 && (
                          <Badge 
                            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px]"
                            variant="destructive"
                          >
                            {cartCount > 99 ? '99+' : cartCount}
                          </Badge>
                        )}
                      </Button>
                    </Link>

                    <Link to="/orders" className="hidden lg:block">
                      <Button variant="ghost" className="text-sm">
                        {t("nav.my_orders")}
                      </Button>
                    </Link>

                    <Link to="/profile">
                      <Button variant="ghost" size="icon" title="My Profile">
                        <User className="w-5 h-5" />
                      </Button>
                    </Link>

                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={handleLogout} 
                      title="Logout"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <LogOut className="w-5 h-5" />
                    </Button>
                  </>
                ) : (
                  <Link to="/auth">
                    <Button size="sm" className="px-4">
                      {t("nav.sign_in")}
                    </Button>
                  </Link>
                )}
              </div>
            </nav>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {children}
      </main>

      <footer className="border-t mt-auto bg-muted/50">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-sm text-muted-foreground">
            <p>{t("nav.copyright")}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}