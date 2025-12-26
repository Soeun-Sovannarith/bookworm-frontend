import { ReactNode, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { 
  BookOpen, 
  ShoppingCart, 
  User, 
  LogOut, 
  LayoutDashboard,
  Menu,
  Package
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { ModeSwitcher } from "./ui/mode-switcher";
import { Chatbot } from "./Chatbot";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const { cartCount } = useCart();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/");
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 text-xl sm:text-2xl font-bold text-primary hover:opacity-90 transition-opacity">
              <BookOpen className="w-6 h-6 sm:w-8 sm:h-8" />
              <span>BookHaven</span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1 lg:gap-2">
              <Link to="/books">
                <Button variant="ghost" className="text-sm font-medium">
                  {t("nav.browse_books")}
                </Button>
              </Link>
              
              {user?.role === "ADMIN" && (
                <Link to="/admin">
                  <Button variant="ghost" className="text-sm font-medium">
                    <LayoutDashboard className="w-4 h-4 mr-2" />
                    {t("nav.admin")}
                  </Button>
                </Link>
              )}

              <div className="flex items-center gap-1 border-l pl-2 border-border/60">
                <LanguageSwitcher />
                <ModeSwitcher />
              </div>

              <div className="flex items-center gap-1 border-l pl-2 border-border/60">
                {user ? (
                  <>
                    <Link to="/cart">
                      <Button variant="ghost" size="icon" className="relative" title={t("nav.cart")}>
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

                    <Link to="/orders">
                      <Button variant="ghost" className="text-sm">
                        {t("nav.my_orders")}
                      </Button>
                    </Link>

                    <Link to="/profile">
                      <Button variant="ghost" size="icon" title={t("nav.my_profile")}>
                        <User className="w-5 h-5" />
                      </Button>
                    </Link>

                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={handleLogout} 
                      title={t("nav.logout")}
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

            {/* Mobile Navigation */}
            <div className="flex md:hidden items-center gap-2">
              <LanguageSwitcher />
              <ModeSwitcher />
              
              {user && (
                <Link to="/cart" className="relative">
                  <Button variant="ghost" size="icon">
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
              )}

              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Menu className="w-5 h-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                  <SheetHeader>
                    <SheetTitle className="flex items-center gap-2">
                      <BookOpen className="w-6 h-6 text-primary" />
                      BookHaven
                    </SheetTitle>
                  </SheetHeader>
                  
                  <div className="flex flex-col gap-4 mt-8">
                    <Link to="/books" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="outline" className="w-full justify-start text-base h-12">
                        <BookOpen className="w-5 h-5 mr-3" />
                        {t("nav.browse_books")}
                      </Button>
                    </Link>

                    {user ? (
                      <>
                        <Link to="/cart" onClick={() => setMobileMenuOpen(false)}>
                          <Button variant="outline" className="w-full justify-start text-base h-12">
                            <ShoppingCart className="w-5 h-5 mr-3" />
                            {t("nav.cart")}
                            {cartCount > 0 && (
                              <Badge className="ml-auto" variant="destructive">
                                {cartCount}
                              </Badge>
                            )}
                          </Button>
                        </Link>

                        <Link to="/orders" onClick={() => setMobileMenuOpen(false)}>
                          <Button variant="outline" className="w-full justify-start text-base h-12">
                            <Package className="w-5 h-5 mr-3" />
                            {t("nav.my_orders")}
                          </Button>
                        </Link>

                        <Link to="/profile" onClick={() => setMobileMenuOpen(false)}>
                          <Button variant="outline" className="w-full justify-start text-base h-12">
                            <User className="w-5 h-5 mr-3" />
                            {t("nav.my_profile")}
                          </Button>
                        </Link>

                        {user.role === "ADMIN" && (
                          <Link to="/admin" onClick={() => setMobileMenuOpen(false)}>
                            <Button variant="outline" className="w-full justify-start text-base h-12">
                              <LayoutDashboard className="w-5 h-5 mr-3" />
                              {t("nav.admin")}
                            </Button>
                          </Link>
                        )}

                        <Button 
                          variant="destructive" 
                          onClick={handleLogout}
                          className="w-full justify-start text-base h-12 mt-4"
                        >
                          <LogOut className="w-5 h-5 mr-3" />
                          {t("nav.logout")}
                        </Button>
                      </>
                    ) : (
                      <Link to="/auth" onClick={() => setMobileMenuOpen(false)}>
                        <Button className="w-full text-base h-12">
                          {t("nav.sign_in")}
                        </Button>
                      </Link>
                    )}
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 sm:py-8">
        {children}
      </main>

      <footer className="border-t mt-auto bg-muted/50">
        <div className="container mx-auto px-4 py-6 sm:py-8">
          <div className="text-center text-sm sm:text-base text-muted-foreground space-y-2">
            <p>{t("nav.copyright")}</p>
            <p className="text-xs sm:text-sm">
              Developed by <span className="font-medium">Soeun Sovannarith</span> & <span className="font-medium">Serey Sunteang</span>
            </p>
          </div>
        </div>
      </footer>

      {/* AI Chatbot */}
      <Chatbot />
    </div>
  );
}