import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { usersAPI } from "@/lib/api";
import type { User } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User as UserIcon, Mail, Calendar, Shield, Edit, Save, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const formatDate = (dateString: string | undefined) => {
  if (!dateString) return "N/A";
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "N/A";
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch (error) {
    console.error("Error parsing date:", error);
    return "N/A";
  }
};

export default function Profile() {
  const { user: authUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
  });

//   // Debug: Log the authUser to see what data we have
//   useEffect(() => {
//     console.log("AuthUser data:", authUser);
//   }, [authUser]);

  useEffect(() => {
    if (authUser) {
      setEditForm({
        name: authUser.name,
        email: authUser.email,
      });
    }
  }, [authUser]);

  const handleEdit = () => {
    if (authUser) {
      setEditForm({
        name: authUser.name,
        email: authUser.email,
      });
      setIsEditing(true);
    }
  };

  const handleCancel = () => {
    if (authUser) {
      setEditForm({
        name: authUser.name,
        email: authUser.email,
      });
    }
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!authUser) return;

    try {
      await usersAPI.update(authUser.id, {
        name: editForm.name,
        email: editForm.email,
      });
      
      // Note: In a real app, you'd want to update the auth context here
      // For now, the changes will persist in the database but won't reflect
      // until the user logs out and back in
      
      setIsEditing(false);
      
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully. Please log out and log back in to see the changes.",
      });
    } catch (error) {
      toast({
        title: "Error updating profile",
        description: error instanceof Error ? error.message : "Could not update profile",
        variant: "destructive",
      });
    }
  };

  if (!authUser) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <p className="text-muted-foreground">Please log in to view your profile</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold mb-8">My Profile</h1>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Personal Information</CardTitle>
                {!isEditing ? (
                  <Button onClick={handleEdit} variant="outline">
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Profile
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button onClick={handleCancel} variant="outline" size="sm">
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                    <Button onClick={handleSave} size="sm">
                      <Save className="w-4 h-4 mr-2" />
                      Save
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar Section */}
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                  <UserIcon className="w-10 h-10 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold">{authUser.name}</h2>
                  <Badge variant={authUser.role === "ADMIN" ? "default" : "secondary"}>
                    {authUser.role}
                  </Badge>
                </div>
              </div>

              <Separator />

              {/* Profile Details */}
              <div className="space-y-4">
                {/* Name Field */}
                <div className="space-y-2">
                  <Label htmlFor="name" className="flex items-center gap-2">
                    <UserIcon className="w-4 h-4" />
                    Name
                  </Label>
                  {isEditing ? (
                    <Input
                      id="name"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      placeholder="Enter your name"
                    />
                  ) : (
                    <p className="text-lg">{authUser.name}</p>
                  )}
                </div>

                {/* Email Field */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email
                  </Label>
                  {isEditing ? (
                    <Input
                      id="email"
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      placeholder="Enter your email"
                    />
                  ) : (
                    <p className="text-lg">{authUser.email}</p>
                  )}
                </div>

                {/* Role Field */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Role
                  </Label>
                  <p className="text-lg">{authUser.role}</p>
                </div>

                {/* Member Since */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Member Since
                  </Label>
                  <p className="text-lg">
                    {formatDate(authUser.createdAt)}
                  </p>
                </div>

                {/* User ID */}
                <div className="space-y-2">
                  <Label className="text-muted-foreground">User ID</Label>
                  <p className="text-sm text-muted-foreground font-mono">{authUser.id}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Account Statistics */}
          <div className="grid md:grid-cols-2 gap-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Account Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    Active
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Account Type</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Type</span>
                  <Badge variant={authUser.role === "ADMIN" ? "default" : "secondary"}>
                    {authUser.role === "ADMIN" ? "Administrator" : "Standard User"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
