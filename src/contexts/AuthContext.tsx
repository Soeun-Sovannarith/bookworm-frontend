import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import type { User, LoginRequest, RegisterRequest } from "@/types";
import { authAPI, usersAPI } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing token on mount
    const storedToken = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (data: LoginRequest) => {
    try {
      const response = await authAPI.login(data);
      setToken(response.token);
      
      // Store token first so the API call can use it
      localStorage.setItem("token", response.token);
      
      // Fetch complete user profile to get all fields including createdAt
      try {
        const fullUserProfile = await usersAPI.getById(response.user.id);
        setUser(fullUserProfile);
        localStorage.setItem("user", JSON.stringify(fullUserProfile));
      } catch (profileError) {
        // Fallback to user from login response if profile fetch fails
        console.warn("Could not fetch full profile, using login response data", profileError);
        setUser(response.user);
        localStorage.setItem("user", JSON.stringify(response.user));
      }
      
      toast({
        title: "Welcome back!",
        description: `Logged in as ${response.user.name}`,
      });
    } catch (error) {
      toast({
        title: "Login failed",
        description: error instanceof Error ? error.message : "Invalid credentials",
        variant: "destructive",
      });
      throw error;
    }
  };

  const register = async (data: RegisterRequest) => {
    try {
      await authAPI.register(data);
      toast({
        title: "Registration successful!",
        description: "You can now log in with your credentials",
      });
    } catch (error) {
      toast({
        title: "Registration failed",
        description: error instanceof Error ? error.message : "Could not create account",
        variant: "destructive",
      });
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    toast({
      title: "Logged out",
      description: "See you soon!",
    });
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
