import { Link } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { BookOpen, Search, ShoppingBag, Star } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function Home() {
  const { t } = useTranslation();

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary/10 via-background to-accent/10 py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-5xl font-bold mb-6 text-foreground">
              {t("home.welcome")}
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              {t("home.description")}
            </p>
            <div className="flex gap-4 justify-center">
              <Link to="/books">
                <Button size="lg" className="gap-2">
                  <Search className="w-5 h-5" />
                  {t("home.browse_books")}
                </Button>
              </Link>
              <Link to="/auth">
                <Button size="lg" variant="outline" className="gap-2">
                  {t("home.sign_in")}
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
              <h3 className="text-xl font-semibold mb-2">
                {t("home.features.vast_collection")}
              </h3>
              <p className="text-muted-foreground">
                {t("home.features.vast_collection_desc")}
              </p>
            </div>

            <div className="text-center p-6 bg-card rounded-lg border">
              <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShoppingBag className="w-8 h-8 text-accent" />
              </div>
              <h3 className="text-xl font-semibold mb-2">
                {t("home.features.easy_shopping")}
              </h3>
              <p className="text-muted-foreground">
                {t("home.features.easy_shopping_desc")}
              </p>
            </div>

            <div className="text-center p-6 bg-card rounded-lg border">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">
                {t("home.features.quality_guaranteed")}
              </h3>
              <p className="text-muted-foreground">
                {t("home.features.quality_guaranteed_desc")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-muted">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">{t("home.cta_title")}</h2>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
            {t("home.cta_desc")}
          </p>
          <Link to="/books">
            <Button size="lg">{t("home.cta_button")}</Button>
          </Link>
        </div>
      </section>
    </Layout>
  );
}
