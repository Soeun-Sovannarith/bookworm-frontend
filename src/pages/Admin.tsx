import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { usersAPI, booksAPI } from "@/lib/api";
import type { User, Book } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Plus, Edit, Eye } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

export default function Admin() {
  const [users, setUsers] = useState<User[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedBookId, setSelectedBookId] = useState<number | null>(null);
  const [deleteBookId, setDeleteBookId] = useState<number | null>(null);
  const [viewBook, setViewBook] = useState<Book | null>(null);

  const [bookForm, setBookForm] = useState({
    title: "",
    author: "",
    published_date: "",
    stock: 0,
    category: "",
    price: 0,
    description: "",
    imageURL: "",
  });
  const { t } = useTranslation();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Try to load users, but continue if it fails (403 forbidden)
      let usersData: User[] = [];
      try {
        usersData = await usersAPI.getAll();
        setUsers(usersData);
      } catch (userError) {
        console.warn("Could not load users (might not have permission):", userError);
        toast({
          title: "Limited Access",
          description: "User management is restricted. Showing book management only.",
          variant: "default",
        });
      }

      // Load books
      const booksData = await booksAPI.getAll();
      setBooks(booksData);
    } catch (error) {
      toast({
        title: "Error loading data",
        description: error instanceof Error ? error.message : "Could not load admin data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteUser = async (id: number) => {
    try {
      await usersAPI.delete(id);
      setUsers(users.filter((u) => u.id !== id));
      toast({
        title: "User deleted",
        description: "User has been removed",
      });
    } catch (error) {
      toast({
        title: "Error deleting user",
        description: error instanceof Error ? error.message : "Could not delete user",
        variant: "destructive",
      });
    }
  };

  const handleDeleteBook = async (id: number) => {
    try {
      await booksAPI.delete(id);
      setBooks(books.filter((b) => b.bookID !== id));
      setDeleteBookId(null);
      toast({
        title: "Book deleted",
        description: "Book has been removed successfully",
      });
    } catch (error) {
      toast({
        title: "Error deleting book",
        description: error instanceof Error ? error.message : "Could not delete book",
        variant: "destructive",
      });
    }
  };

  const handleOpenEditDialog = (book: Book) => {
    setIsEditMode(true);
    setSelectedBookId(book.bookID);
    setBookForm({
      title: book.title,
      author: book.author,
      published_date: book.published_date,
      stock: book.stock,
      category: book.category,
      price: book.price,
      description: book.description,
      imageURL: book.imageURL,
    });
    setIsDialogOpen(true);
  };

  const handleOpenCreateDialog = () => {
    setIsEditMode(false);
    setSelectedBookId(null);
    setBookForm({
      title: "",
      author: "",
      published_date: "",
      stock: 0,
      category: "",
      price: 0,
      description: "",
      imageURL: "",
    });
    setIsDialogOpen(true);
  };

  const handleSubmitBook = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditMode && selectedBookId) {
        // Update existing book
        const updatedBook = await booksAPI.update(selectedBookId, bookForm);
        setBooks(books.map((b) => (b.bookID === selectedBookId ? updatedBook : b)));
        toast({
          title: t("admin.book_updated_title"),
          description: t("admin.book_updated_description"),
        });
      } else {
        // Create new book
        const newBook = await booksAPI.create(bookForm);
        setBooks([...books, newBook]);
        toast({
          title: t("admin.book_created_title"),
          description: t("admin.book_created_description"),
        });
      }
      setIsDialogOpen(false);
      setIsEditMode(false);
      setSelectedBookId(null);
    } catch (error) {
      toast({
        title: isEditMode
          ? t("admin.error_updating_title")
          : t("admin.error_creating_title"),
        description: error instanceof Error
          ? error.message
          : isEditMode
          ? t("admin.error_updating_description")
          : t("admin.error_creating_description"),
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16">
          <div className="text-center">
            <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-muted-foreground">{t("admin.loading_dashboard")}</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8">{t("admin.dashboard")}</h1>

        <Tabs defaultValue="users" className="w-full">
          <TabsList>
            <TabsTrigger value="users">
              {t("admin.users")} ({users.length})
            </TabsTrigger>
            <TabsTrigger value="books">
              {t("admin.books")} ({books.length})
            </TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>{t("admin.user_management")}</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("admin.id")}</TableHead>
                      <TableHead>{t("admin.name")}</TableHead>
                      <TableHead>{t("admin.email")}</TableHead>
                      <TableHead>{t("admin.role")}</TableHead>
                      <TableHead>{t("admin.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>{user.id}</TableCell>
                        <TableCell>{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.role}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteUser(user.id)}
                            title={t("admin.delete")}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Books Tab */}
          <TabsContent value="books">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>{t("admin.book_management")}</CardTitle>
                  <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                      <Button onClick={handleOpenCreateDialog}>
                        <Plus className="w-4 h-4 mr-2" />
                        {t("admin.add_book")}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>
                          {isEditMode ? t("admin.edit_book") : t("admin.add_new_book")}
                        </DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleSubmitBook} className="space-y-4">
                        {/* Form fields with Labels using t("admin.field_name") */}
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <Label>{t("admin.title")} *</Label>
                            <Input
                              value={bookForm.title}
                              onChange={(e) =>
                                setBookForm({ ...bookForm, title: e.target.value })
                              }
                              required
                            />
                          </div>
                          <div>
                            <Label>{t("admin.author")} *</Label>
                            <Input
                              value={bookForm.author}
                              onChange={(e) =>
                                setBookForm({ ...bookForm, author: e.target.value })
                              }
                              required
                            />
                          </div>
                          <div>
                            <Label>{t("admin.published_date")} *</Label>
                            <Input
                              type="date"
                              value={bookForm.published_date}
                              onChange={(e) =>
                                setBookForm({ ...bookForm, published_date: e.target.value })
                              }
                              required
                            />
                          </div>
                          <div>
                            <Label>{t("admin.category")} *</Label>
                            <Input
                              value={bookForm.category}
                              onChange={(e) =>
                                setBookForm({ ...bookForm, category: e.target.value })
                              }
                              required
                            />
                          </div>
                          <div>
                            <Label>{t("admin.price")} ($) *</Label>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={bookForm.price}
                              onChange={(e) =>
                                setBookForm({ ...bookForm, price: parseFloat(e.target.value) || 0 })
                              }
                              required
                            />
                          </div>
                          <div>
                            <Label>{t("admin.stock")} *</Label>
                            <Input
                              type="number"
                              min="0"
                              value={bookForm.stock}
                              onChange={(e) =>
                                setBookForm({ ...bookForm, stock: parseInt(e.target.value) || 0 })
                              }
                              required
                            />
                          </div>
                        </div>
                        <div>
                          <Label>{t("admin.image_url")}</Label>
                          <Input
                            value={bookForm.imageURL}
                            onChange={(e) =>
                              setBookForm({ ...bookForm, imageURL: e.target.value })
                            }
                            placeholder={t("admin.image_placeholder")}
                          />
                        </div>
                        <div>
                          <Label>{t("admin.description")} *</Label>
                          <Textarea
                            value={bookForm.description}
                            onChange={(e) =>
                              setBookForm({ ...bookForm, description: e.target.value })
                            }
                            required
                            rows={4}
                          />
                        </div>
                        <div className="flex gap-2 pt-4">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsDialogOpen(false)}
                            className="flex-1"
                          >
                            {t("admin.cancel")}
                          </Button>
                          <Button type="submit" className="flex-1">
                            {isEditMode ? t("admin.update_book") : t("admin.create_book")}
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>

              {/* Books Table */}
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("admin.id")}</TableHead>
                      <TableHead>{t("admin.title")}</TableHead>
                      <TableHead>{t("admin.author")}</TableHead>
                      <TableHead>{t("admin.category")}</TableHead>
                      <TableHead>{t("admin.price")}</TableHead>
                      <TableHead>{t("admin.stock")}</TableHead>
                      <TableHead>{t("admin.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {books.map((book) => (
                      <TableRow key={book.bookID}>
                        <TableCell>{book.bookID}</TableCell>
                        <TableCell>{book.title}</TableCell>
                        <TableCell>{book.author}</TableCell>
                        <TableCell>{book.category}</TableCell>
                        <TableCell>${book.price.toFixed(2)}</TableCell>
                        <TableCell>{book.stock}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => setViewBook(book)} title={t("admin.view")}>
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleOpenEditDialog(book)} title={t("admin.edit")}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setDeleteBookId(book.bookID)} title={t("admin.delete")}>
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Delete Book Confirmation Dialog */}
        <AlertDialog open={deleteBookId !== null} onOpenChange={(open) => !open && setDeleteBookId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("admin.confirm_delete")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("admin.confirm_delete_description")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setDeleteBookId(null)}>
                {t("admin.cancel")}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteBookId && handleDeleteBook(deleteBookId)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {t("admin.delete")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* View Book Dialog */}
        <Dialog open={viewBook !== null} onOpenChange={(open) => !open && setViewBook(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{viewBook?.title}</DialogTitle>
            </DialogHeader>
            {viewBook && (
              <div className="space-y-4">
                {viewBook.imageURL && (
                  <img
                    src={viewBook.imageURL}
                    alt={viewBook.title}
                    className="w-full h-64 object-cover rounded-lg"
                  />
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">{t("admin.author")}</Label>
                    <p>{viewBook.author}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">{t("admin.category")}</Label>
                    <p>{viewBook.category}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">{t("admin.published_date")}</Label>
                    <p>{viewBook.published_date}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">{t("admin.price")}</Label>
                    <p>${viewBook.price.toFixed(2)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">{t("admin.stock")}</Label>
                    <p>{viewBook.stock}</p>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">{t("admin.description")}</Label>
                  <p className="mt-2 text-sm">{viewBook.description}</p>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
