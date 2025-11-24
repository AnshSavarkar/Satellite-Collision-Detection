import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

type User = {
  username: string;
  email?: string;
};

type AuthContextType = {
  user: User | null;
  password?: string; // session-only, not persisted
  login: (username: string, email?: string, password?: string) => void;
  updateUser: (partial: Partial<User>) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [sessionPassword, setSessionPassword] = useState<string | undefined>(undefined);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("auth_user");
      if (saved) {
        const u = JSON.parse(saved) as User | null;
        if (u && u.username && !u.email) {
          // Try to enrich from local registry if email missing
          try {
            const reg = JSON.parse(localStorage.getItem("user_registry") || "{}");
            const exact = reg?.[u.username]?.email;
            const lower = reg?.[String(u.username).toLowerCase()]?.email;
            const regEmail = exact || lower;
            if (regEmail) {
              const enriched = { ...u, email: String(regEmail) } as User;
              setUser(enriched);
              localStorage.setItem("auth_user", JSON.stringify(enriched));
              return;
            }
          } catch {
            // ignore
          }
        }
        setUser(u);
      }
    } catch {
      // ignore
    }
  }, []);

  const login = (username: string, email?: string, password?: string) => {
    // If email not provided, try to look it up from a local registry (simulated DB)
    let resolvedEmail = email;
    if (!resolvedEmail) {
      try {
        const reg = JSON.parse(localStorage.getItem("user_registry") || "{}");
        const exact = reg?.[username]?.email;
        const lower = reg?.[String(username).toLowerCase()]?.email;
        const found = exact || lower;
        if (found) resolvedEmail = String(found);
      } catch {
        // ignore
      }
    }

    const u: User = resolvedEmail ? { username, email: resolvedEmail } : { username };
    setUser(u);
    setSessionPassword(password);
    try {
      localStorage.setItem("auth_user", JSON.stringify(u));
    } catch {
      // ignore
    }
  };

  const updateUser = (partial: Partial<User>) => {
    setUser((prev) => {
      const base: User = prev || { username: "" };
      const next: User = { ...base, ...partial };
      try {
        localStorage.setItem("auth_user", JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const logout = () => {
    setUser(null);
    setSessionPassword(undefined);
    try {
      localStorage.removeItem("auth_user");
    } catch {
      // ignore
    }
  };

  const value = useMemo(() => ({ user, password: sessionPassword, login, updateUser, logout }), [user, sessionPassword]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
};
