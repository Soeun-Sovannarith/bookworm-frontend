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
import { useTranslation } from "react-i18next";
import { SEO, pageSEO } from "@/components/SEO";

const formatDate = (dateString: string | undefined) => {
  if (!dateString) return "N/A";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "N/A";
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return "N/A";
  }
};

export default function Profile() {
  const { t } = useTranslation();
  const { user: authUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", email: "" });

  useEffect(() => {
    if (authUser) {
      setEditForm({ name: authUser.name, email: authUser.email });
    }
  }, [authUser]);

  const handleEdit = () => {
    if (authUser) {
      setEditForm({ name: authUser.name, email: authUser.email });
      setIsEditing(true);
    }
  };

  const handleCancel = () => {
    if (authUser) setEditForm({ name: authUser.name, email: authUser.email });
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!authUser) return;
    try {
      await usersAPI.update(authUser.id, { name: editForm.name, email: editForm.email });
      setIsEditing(false);
      toast({
        title: t("profile.save"),
        description: `${t("profile.save")} successfully. Please log out and log back in to see changes.`,
      });
    } catch (error) {
      toast({
        title: t("profile.save"),
        description: error instanceof Error ? error.message : t("profile.save"),
        variant: "destructive",
      });
    }
  };

  if (!authUser) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <p className="text-muted-foreground">{t("profile.login_prompt")}</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <SEO {...pageSEO.profile} />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold mb-8">{t("profile.title")}</h1>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{t("profile.personal_info")}</CardTitle>
                {!isEditing ? (
                  <Button onClick={handleEdit} variant="outline">
                    <Edit className="w-4 h-4 mr-2" />
                    {t("profile.edit_profile")}
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button onClick={handleCancel} variant="outline" size="sm">
                      <X className="w-4 h-4 mr-2" />
                      {t("profile.cancel")}
                    </Button>
                    <Button onClick={handleSave} size="sm">
                      <Save className="w-4 h-4 mr-2" />
                      {t("profile.save")}
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
                    {authUser.role === "ADMIN" ? t("profile.administrator") : t("profile.standard_user")}
                  </Badge>
                </div>
              </div>

              <Separator />

              {/* Profile Details */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="flex items-center gap-2">
                    <UserIcon className="w-4 h-4" />
                    {t("profile.name")}
                  </Label>
                  {isEditing ? (
                    <Input
                      id="name"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      placeholder={t("profile.name_placeholder")}
                    />
                  ) : (
                    <p className="text-lg">{authUser.name}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    {t("profile.email")}
                  </Label>
                  {isEditing ? (
                    <Input
                      id="email"
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      placeholder={t("profile.email_placeholder")}
                    />
                  ) : (
                    <p className="text-lg">{authUser.email}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    {t("profile.role")}
                  </Label>
                  <p className="text-lg">{authUser.role}</p>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {t("profile.member_since")}
                  </Label>
                  <p className="text-lg">{formatDate(authUser.createdAt)}</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-muted-foreground">{t("profile.user_id")}</Label>
                  <p className="text-sm text-muted-foreground font-mono">{authUser.id}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Account Statistics */}
          <div className="grid md:grid-cols-2 gap-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t("profile.account_status")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t("profile.status")}</span>
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    {t("profile.active")}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t("profile.account_type")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t("profile.role")}</span>
                  <Badge variant={authUser.role === "ADMIN" ? "default" : "secondary"}>
                    {authUser.role === "ADMIN" ? t("profile.administrator") : t("profile.standard_user")}
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
