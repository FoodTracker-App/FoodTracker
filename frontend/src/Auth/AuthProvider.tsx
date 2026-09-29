// src/context/AuthContext.tsx
import React, { useState, useEffect } from "react";
import { ApiError, authApi } from "../api/client";
import { AuthContext, type AuthUser } from "./context";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const restoreSession = async () => {
      const storedToken = localStorage.getItem("auth_token");
      const storedUser = localStorage.getItem("auth_user");
      if (!storedToken || !storedUser) {
        setIsLoading(false);
        return;
      }
      try {
        const currentUser = await authApi.me(storedToken);
        if (!active) return;
        setToken(storedToken);
        setUser(currentUser);
        localStorage.setItem("auth_user", JSON.stringify(currentUser));
      } catch (error) {
        if (!active) return;
        if (error instanceof ApiError && error.status === 401) {
          localStorage.removeItem("auth_token");
          localStorage.removeItem("auth_user");
        } else {
          console.error("Failed to verify the saved session:", error);
          try {
            const parsedUser: AuthUser = JSON.parse(storedUser);
            setToken(storedToken);
            setUser(parsedUser);
          } catch (storageError) {
            console.error("Failed to restore the saved user:", storageError);
            localStorage.removeItem("auth_token");
            localStorage.removeItem("auth_user");
          }
        }
      } finally {
        if (active) setIsLoading(false);
      }
    };
    void restoreSession();
    return () => {
      active = false;
    };
  }, []);

  function login(newToken: string, newUser: AuthUser) {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem("auth_token", newToken);
    localStorage.setItem("auth_user", JSON.stringify(newUser));
  }

  async function logout() {
    const currentToken = token;
    try {
      if (currentToken) await authApi.logout(currentToken);
    } finally {
      setToken(null);
      setUser(null);
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_user");
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}