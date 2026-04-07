"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import api from "@/lib/api";

export interface User {
  user_id: string;
  display_name: string;
  email: string;
  points: number;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (token: string, userData: User) => void;
  logout: () => void;
  updatePoints: (newPoints: number) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("cvhell_token");
      if (token) {
        try {
          const res = await api.get("/me");
          setUser(res.data);
        } catch (error) {
          console.error("Failed to fetch user profile", error);
          localStorage.removeItem("cvhell_token");
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = (token: string, userData: User) => {
    localStorage.setItem("cvhell_token", token);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem("cvhell_token");
    setUser(null);
  };

  const updatePoints = (newPoints: number) => {
    setUser((prev) => (prev ? { ...prev, points: newPoints } : null));
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updatePoints }}>
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
