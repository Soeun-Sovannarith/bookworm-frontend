import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  type?: string;
}

export const SEO = ({
  title = 'BookHaven - Online Bookstore in Cambodia | Buy Books in Phnom Penh',
  description = "BookHaven is Cambodia's leading online bookstore. Buy books online in Phnom Penh with fast delivery. Browse thousands of books - fiction, non-fiction, textbooks & more. Best bookshop near you in Cambodia!",
  keywords = 'bookstore near me, bookshop in cambodia, bookshop in phnom penh, online bookstore cambodia, buy books cambodia, books phnom penh',
  image = 'https://book-haven.rith.codes/og-image.jpg',
  type = 'website'
}: SEOProps) => {
  const location = useLocation();
  const url = `https://book-haven.rith.codes${location.pathname}`;

  useEffect(() => {
    // Update title
    document.title = title;

    // Update or create meta tags
    const updateMetaTag = (name: string, content: string, isProperty = false) => {
      const attribute = isProperty ? 'property' : 'name';
      let element = document.querySelector(`meta[${attribute}="${name}"]`);
      
      if (element) {
        element.setAttribute('content', content);
      } else {
        element = document.createElement('meta');
        element.setAttribute(attribute, name);
        element.setAttribute('content', content);
        document.head.appendChild(element);
      }
    };

    // Update primary meta tags
    updateMetaTag('description', description);
    updateMetaTag('keywords', keywords);
    
    // Update Open Graph tags
    updateMetaTag('og:title', title, true);
    updateMetaTag('og:description', description, true);
    updateMetaTag('og:image', image, true);
    updateMetaTag('og:url', url, true);
    updateMetaTag('og:type', type, true);
    
    // Update Twitter Card tags
    updateMetaTag('twitter:title', title, true);
    updateMetaTag('twitter:description', description, true);
    updateMetaTag('twitter:image', image, true);
    updateMetaTag('twitter:url', url, true);

    // Update canonical link
    let canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) {
      canonical.setAttribute('href', url);
    } else {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      canonical.setAttribute('href', url);
      document.head.appendChild(canonical);
    }
  }, [title, description, keywords, image, type, url]);

  return null;
};

// Page-specific SEO configurations
export const pageSEO = {
  home: {
    title: 'BookHaven - Online Bookstore in Cambodia | Buy Books in Phnom Penh',
    description: "Cambodia's premier online bookstore. Buy books online with fast delivery across Phnom Penh and Cambodia. Browse fiction, non-fiction, textbooks, and more. Best bookshop near you!",
    keywords: 'bookstore near me, bookshop in cambodia, bookshop in phnom penh, online bookstore cambodia, buy books cambodia, books phnom penh, cambodia bookstore, book shop near me'
  },
  books: {
    title: 'Browse Books - Online Bookstore Cambodia | BookHaven',
    description: 'Explore thousands of books at BookHaven Cambodia. Find fiction, non-fiction, textbooks, and bestsellers. Fast delivery in Phnom Penh and across Cambodia. Shop books online now!',
    keywords: 'browse books cambodia, buy books online cambodia, books catalog cambodia, bookstore phnom penh, fiction books cambodia, textbooks cambodia, bestsellers cambodia'
  },
  bookDetail: (bookTitle: string) => ({
    title: `${bookTitle} - Buy Online at BookHaven Cambodia`,
    description: `Buy ${bookTitle} online at BookHaven, Cambodia's leading bookstore. Fast delivery in Phnom Penh and across Cambodia. Secure checkout and best prices.`,
    keywords: `${bookTitle}, buy ${bookTitle} cambodia, ${bookTitle} phnom penh, bookstore cambodia, buy books online`,
    type: 'product'
  }),
  cart: {
    title: 'Shopping Cart - BookHaven Cambodia',
    description: 'View your shopping cart at BookHaven. Review your selected books and proceed to secure checkout. Fast delivery across Cambodia.',
    keywords: 'shopping cart, buy books cambodia, book checkout, online bookstore cambodia'
  },
  checkout: {
    title: 'Checkout - BookHaven Cambodia',
    description: 'Complete your book purchase at BookHaven. Secure checkout with multiple payment options. Fast delivery in Phnom Penh and across Cambodia.',
    keywords: 'book checkout cambodia, buy books online, secure payment cambodia, book delivery cambodia'
  },
  profile: {
    title: 'My Profile - BookHaven Cambodia',
    description: 'Manage your BookHaven account. View your order history, update your details, and track your book deliveries.',
    keywords: 'account, profile, order history, bookstore cambodia'
  },
  orders: {
    title: 'My Orders - BookHaven Cambodia',
    description: 'Track your book orders at BookHaven. View order history and delivery status for your purchases.',
    keywords: 'order tracking, order history, book delivery status, bookstore cambodia'
  }
};
