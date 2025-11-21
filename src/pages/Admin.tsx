import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { usersAPI, booksAPI } from "@/lib/api";
import type { User, Book } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Plus, Edit } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function Admin() {
  const [users, setUsers] = useState<User[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

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
      toast({
        title: "Book deleted",
        description: "Book has been removed",
      });
    } catch (error) {
      toast({
        title: "Error deleting book",
        description: error instanceof Error ? error.message : "Could not delete book",
        variant: "destructive",
      });
    }
  };

  const handleCreateBook = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newBook = await booksAPI.create(bookForm);
      setBooks([...books, newBook]);
      setIsDialogOpen(false);
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
      toast({
        title: "Book created",
        description: "New book has been added",
      });
    } catch (error) {
      toast({
        title: "Error creating book",
        description: error instanceof Error ? error.message : "Could not create book",
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
                      <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Book
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Add New Book</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleCreateBook} className="space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <Label>Title</Label>
                            <Input
                              value={bookForm.title}
                              onChange={(e) => setBookForm({ ...bookForm, title: e.target.value })}
                              required
                            />
                          </div>
                          <div>
                            <Label>Author</Label>
                            <Input
                              value={bookForm.author}
                              onChange={(e) => setBookForm({ ...bookForm, author: e.target.value })}
                              required
                            />
                          </div>
                          <div>
                            <Label>Published Date</Label>
                            <Input
                              type="date"
                              value={bookForm.published_date}
                              onChange={(e) => setBookForm({ ...bookForm, published_date: e.target.value })}
                              required
                            />
                          </div>
                          <div>
                            <Label>Category</Label>
                            <Input
                              value={bookForm.category}
                              onChange={(e) => setBookForm({ ...bookForm, category: e.target.value })}
                              required
                            />
                          </div>
                          <div>
                            <Label>Price</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={bookForm.price}
                              onChange={(e) => setBookForm({ ...bookForm, price: parseFloat(e.target.value) })}
                              required
                            />
                          </div>
                          <div>
                            <Label>Stock</Label>
                            <Input
                              type="number"
                              value={bookForm.stock}
                              onChange={(e) => setBookForm({ ...bookForm, stock: parseInt(e.target.value) })}
                              required
                            />
                          </div>
                        </div>
                        <div>
                          <Label>Image URL</Label>
                          <Input
                            value={bookForm.imageURL}
                            onChange={(e) => setBookForm({ ...bookForm, imageURL: e.target.value })}
                            required
                          />
                        </div>
                        <div>
                          <Label>Description</Label>
                          <Input
                            value={bookForm.description}
                            onChange={(e) => setBookForm({ ...bookForm, description: e.target.value })}
                            required
                          />
                        </div>
                        <Button type="submit" className="w-full">Create Book</Button>
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
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteBook(book.bookID)}
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
        </Tabs>
      </div>
    </Layout>
  );
}
