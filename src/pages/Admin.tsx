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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [usersData, booksData] = await Promise.all([
        usersAPI.getAll(),
        booksAPI.getAll(),
      ]);
      setUsers(usersData);
      setBooks(booksData);
    } catch (error) {
      toast({
        title: "Error loading data",
        description: error instanceof Error ? error.message : "Could not fetch admin data",
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
          title: "Book updated",
          description: "Book has been updated successfully",
        });
      } else {
        // Create new book
        const newBook = await booksAPI.create(bookForm);
        setBooks([...books, newBook]);
        toast({
          title: "Book created",
          description: "New book has been added successfully",
        });
      }
      setIsDialogOpen(false);
      setIsEditMode(false);
      setSelectedBookId(null);
    } catch (error) {
      toast({
        title: `Error ${isEditMode ? "updating" : "creating"} book`,
        description: error instanceof Error ? error.message : `Could not ${isEditMode ? "update" : "create"} book`,
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
            <p className="text-muted-foreground">Loading admin dashboard...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8">Admin Dashboard</h1>

        <Tabs defaultValue="users" className="w-full">
          <TabsList>
            <TabsTrigger value="users">Users ({users.length})</TabsTrigger>
            <TabsTrigger value="books">Books ({books.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Actions</TableHead>
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

          <TabsContent value="books">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Book Management</CardTitle>
                  <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                      <Button onClick={handleOpenCreateDialog}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Book
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>{isEditMode ? "Edit Book" : "Add New Book"}</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleSubmitBook} className="space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <Label>Title *</Label>
                            <Input
                              value={bookForm.title}
                              onChange={(e) => setBookForm({ ...bookForm, title: e.target.value })}
                              required
                              placeholder="Enter book title"
                            />
                          </div>
                          <div>
                            <Label>Author *</Label>
                            <Input
                              value={bookForm.author}
                              onChange={(e) => setBookForm({ ...bookForm, author: e.target.value })}
                              required
                              placeholder="Enter author name"
                            />
                          </div>
                          <div>
                            <Label>Published Date *</Label>
                            <Input
                              type="date"
                              value={bookForm.published_date}
                              onChange={(e) => setBookForm({ ...bookForm, published_date: e.target.value })}
                              required
                            />
                          </div>
                          <div>
                            <Label>Category *</Label>
                            <Input
                              value={bookForm.category}
                              onChange={(e) => setBookForm({ ...bookForm, category: e.target.value })}
                              required
                              placeholder="e.g., Fiction, Self-Help"
                            />
                          </div>
                          <div>
                            <Label>Price ($) *</Label>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={bookForm.price}
                              onChange={(e) => setBookForm({ ...bookForm, price: parseFloat(e.target.value) || 0 })}
                              required
                              placeholder="0.00"
                            />
                          </div>
                          <div>
                            <Label>Stock *</Label>
                            <Input
                              type="number"
                              min="0"
                              value={bookForm.stock}
                              onChange={(e) => setBookForm({ ...bookForm, stock: parseInt(e.target.value) || 0 })}
                              required
                              placeholder="0"
                            />
                          </div>
                        </div>
                        <div>
                          <Label>Image URL (optional)</Label>
                          <Input
                            value={bookForm.imageURL}
                            onChange={(e) => setBookForm({ ...bookForm, imageURL: e.target.value })}
                            placeholder="Leave empty to fetch from Open Library"
                          />
                        </div>
                        <div>
                          <Label>Description *</Label>
                          <Textarea
                            value={bookForm.description}
                            onChange={(e) => setBookForm({ ...bookForm, description: e.target.value })}
                            required
                            placeholder="Enter book description"
                            rows={4}
                          />
                        </div>
                        <div className="flex gap-2 pt-4">
                          <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1">
                            Cancel
                          </Button>
                          <Button type="submit" className="flex-1">
                            {isEditMode ? "Update Book" : "Create Book"}
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Author</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Actions</TableHead>
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
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setViewBook(book)}
                              title="View details"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenEditDialog(book)}
                              title="Edit book"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteBookId(book.bookID)}
                              title="Delete book"
                            >
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
      </div>

      {/* View Book Dialog */}
      <Dialog open={!!viewBook} onOpenChange={() => setViewBook(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Book Details</DialogTitle>
          </DialogHeader>
          {viewBook && (
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div>
                    <Label className="text-muted-foreground">Title</Label>
                    <p className="font-semibold">{viewBook.title}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Author</Label>
                    <p>{viewBook.author}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Category</Label>
                    <p>{viewBook.category}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Published Date</Label>
                    <p>{viewBook.published_date}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div>
                    <Label className="text-muted-foreground">Price</Label>
                    <p className="font-semibold text-lg">${viewBook.price.toFixed(2)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Stock</Label>
                    <p>{viewBook.stock} available</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Book ID</Label>
                    <p>{viewBook.bookID}</p>
                  </div>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Description</Label>
                <p className="mt-1 text-sm">{viewBook.description}</p>
              </div>
              {viewBook.imageURL && (
                <div>
                  <Label className="text-muted-foreground">Cover Image</Label>
                  <div className="mt-2 w-48 h-72 bg-muted rounded overflow-hidden">
                    <img
                      src={viewBook.imageURL}
                      alt={viewBook.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='450'%3E%3Crect width='300' height='450' fill='%23e5e7eb'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='20' fill='%239ca3af'%3ENo Cover%3C/text%3E%3C/svg%3E";
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteBookId} onOpenChange={() => setDeleteBookId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Book?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this book? This action cannot be undone and will remove the book from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteBookId && handleDeleteBook(deleteBookId)} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
