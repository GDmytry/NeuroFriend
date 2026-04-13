import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

import { storage } from "../services/storage";
import { LoginInput, NeuralMode, RegisteredUserInput, User } from "../types";
import { createId } from "../utils/id";

type AuthContextValue = {
  currentUser: User | null;
  isReady: boolean;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisteredUserInput) => Promise<void>;
  logout: () => Promise<void>;
  updatePreferredMode: (mode: NeuralMode) => Promise<void>;
  updateAssistantName: (assistantName: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function bootstrap() {
      const [session, users] = await Promise.all([storage.getSession(), storage.getUsers()]);

      if (session) {
        const user = users.find((item) => item.id === session.userId) ?? null;
        setCurrentUser(user);

        if (!user) {
          await storage.saveSession(null);
        }
      }

      setIsReady(true);
    }

    bootstrap();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      currentUser,
      isReady,
      login: async ({ email, password }) => {
        const users = await storage.getUsers();
        const user = users.find(
          (item) =>
            item.email.trim().toLowerCase() === email.trim().toLowerCase() &&
            item.password === password
        );

        if (!user) {
          throw new Error("Неверный email или пароль");
        }

        await storage.saveSession({ userId: user.id });
        setCurrentUser(user);
      },
      register: async ({ name, email, password, preferredMode, assistantName }) => {
        const users = await storage.getUsers();
        const normalizedEmail = email.trim().toLowerCase();
        const exists = users.some((item) => item.email === normalizedEmail);

        if (exists) {
          throw new Error("Пользователь с таким email уже существует");
        }

        if (password.trim().length < 6) {
          throw new Error("Пароль должен содержать минимум 6 символов");
        }

        const newUser: User = {
          id: createId(),
          name: name.trim(),
          email: normalizedEmail,
          password,
          preferredMode,
          assistantName: assistantName.trim() || "NeuroFriend",
          createdAt: new Date().toISOString()
        };

        const nextUsers = [...users, newUser];
        await storage.saveUsers(nextUsers);
        await storage.saveSession({ userId: newUser.id });
        setCurrentUser(newUser);
      },
      logout: async () => {
        await storage.saveSession(null);
        setCurrentUser(null);
      },
      updatePreferredMode: async (mode) => {
        if (!currentUser) {
          return;
        }

        const users = await storage.getUsers();
        const nextUsers = users.map((user) =>
          user.id === currentUser.id ? { ...user, preferredMode: mode } : user
        );
        const nextCurrentUser = nextUsers.find((user) => user.id === currentUser.id) ?? null;

        await storage.saveUsers(nextUsers);
        setCurrentUser(nextCurrentUser);
      },
      updateAssistantName: async (assistantName) => {
        if (!currentUser) {
          return;
        }

        const normalizedAssistantName = assistantName.trim();

        if (!normalizedAssistantName) {
          throw new Error("Имя нейросети не может быть пустым");
        }

        const users = await storage.getUsers();
        const nextUsers = users.map((user) =>
          user.id === currentUser.id ? { ...user, assistantName: normalizedAssistantName } : user
        );
        const nextCurrentUser = nextUsers.find((user) => user.id === currentUser.id) ?? null;

        await storage.saveUsers(nextUsers);
        setCurrentUser(nextCurrentUser);
      }
    }),
    [currentUser, isReady]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
