import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

import { storage } from "../services/storage";
import {
  hasServerSync,
  loginWithServer,
  registerWithServer,
  resumeServerSession,
  syncServerThreads,
  updateServerUser
} from "../services/serverSyncApi";
import { AuthSession, LoginInput, NeuralMode, RegisteredUserInput, User } from "../types";
import { createId } from "../utils/id";

type AuthContextValue = {
  currentUser: User | null;
  session: AuthSession | null;
  isReady: boolean;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisteredUserInput) => Promise<void>;
  logout: () => Promise<void>;
  updatePreferredMode: (mode: NeuralMode) => Promise<void>;
  updateAssistantName: (assistantName: string) => Promise<void>;
};

const AuthSyncContext = createContext<AuthContextValue | undefined>(undefined);

function isServerSession(session: AuthSession | null | undefined) {
  return Boolean(session?.authMode === "server" && session.token);
}

function replaceCachedUser(users: User[], nextUser: User) {
  const nextUsers = users.filter(
    (user) =>
      user.id !== nextUser.id &&
      user.email.trim().toLowerCase() !== nextUser.email.trim().toLowerCase()
  );

  return [...nextUsers, nextUser];
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function bootstrap() {
      const [storedSession, users] = await Promise.all([storage.getSession(), storage.getUsers()]);

      if (storedSession) {
        if (isServerSession(storedSession) && (await hasServerSync())) {
          try {
            const resumed = await resumeServerSession(storedSession.token as string);
            setCurrentUser(resumed.user);
            setSession(storedSession);
            setIsReady(true);
            return;
          } catch {
            await storage.saveSession(null);
          }
        }

        const localUser = users.find((item) => item.id === storedSession.userId) ?? null;
        setCurrentUser(localUser);
        setSession(localUser ? storedSession : null);

        if (!localUser) {
          await storage.saveSession(null);
        } else {
          void tryUpgradeLocalSession(localUser);
        }
      }

      setIsReady(true);
    }

    async function tryUpgradeLocalSession(localUser: User) {
      if (!(await hasServerSync()) || !localUser.password.trim()) {
        return;
      }

      try {
        let result;

        try {
          result = await loginWithServer({
            email: localUser.email,
            password: localUser.password
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : "";

          if (message.includes("Invalid email or password")) {
            return;
          }

          try {
            result = await registerWithServer({
              name: localUser.name,
              email: localUser.email,
              password: localUser.password,
              preferredMode: localUser.preferredMode,
              assistantName: localUser.assistantName
            });
          } catch (registerError) {
            const registerMessage =
              registerError instanceof Error ? registerError.message : "";

            if (registerMessage.includes("already exists")) {
              return;
            }

            throw registerError;
          }
        }

        const localThreads = (await storage.getThreads())
          .filter((thread) => thread.userId === localUser.id)
          .map((thread) => ({
            ...thread,
            userId: result.user.id
          }));

        if (localThreads.length) {
          await syncServerThreads(result.sessionToken, localThreads);
        }

        const promotedUser: User = {
          ...result.user,
          password: localUser.password
        };
        const nextSession: AuthSession = {
          userId: promotedUser.id,
          token: result.sessionToken,
          authMode: "server"
        };
        const nextUsers = replaceCachedUser(await storage.getUsers(), promotedUser);

        await storage.saveUsers(nextUsers);
        await storage.saveSession(nextSession);
        setCurrentUser(promotedUser);
        setSession(nextSession);
      } catch {
        // Keep local mode if promotion fails.
      }
    }

    void bootstrap();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      currentUser,
      session,
      isReady,
      login: async ({ email, password }) => {
        if (await hasServerSync()) {
          const result = await loginWithServer({ email, password });
          const nextUser: User = {
            ...result.user,
            password
          };
          const nextSession: AuthSession = {
            userId: nextUser.id,
            token: result.sessionToken,
            authMode: "server"
          };
          const nextUsers = replaceCachedUser(await storage.getUsers(), nextUser);

          await storage.saveUsers(nextUsers);
          await storage.saveSession(nextSession);
          setCurrentUser(nextUser);
          setSession(nextSession);
          return;
        }

        const users = await storage.getUsers();
        const user = users.find(
          (item) =>
            item.email.trim().toLowerCase() === email.trim().toLowerCase() &&
            item.password === password
        );

        if (!user) {
          throw new Error("Неверный email или пароль");
        }

        const nextSession: AuthSession = {
          userId: user.id,
          authMode: "local"
        };
        await storage.saveSession(nextSession);
        setCurrentUser(user);
        setSession(nextSession);
      },
      register: async ({ name, email, password, preferredMode, assistantName }) => {
        if (await hasServerSync()) {
          const result = await registerWithServer({
            name,
            email,
            password,
            preferredMode,
            assistantName
          });
          const nextUser: User = {
            ...result.user,
            password
          };
          const nextSession: AuthSession = {
            userId: nextUser.id,
            token: result.sessionToken,
            authMode: "server"
          };
          const nextUsers = replaceCachedUser(await storage.getUsers(), nextUser);

          await storage.saveUsers(nextUsers);
          await storage.saveSession(nextSession);
          setCurrentUser(nextUser);
          setSession(nextSession);
          return;
        }

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
        const nextSession: AuthSession = {
          userId: newUser.id,
          authMode: "local"
        };
        await storage.saveUsers(nextUsers);
        await storage.saveSession(nextSession);
        setCurrentUser(newUser);
        setSession(nextSession);
      },
      logout: async () => {
        await storage.saveSession(null);
        setCurrentUser(null);
        setSession(null);
      },
      updatePreferredMode: async (mode) => {
        if (!currentUser) {
          return;
        }

        if (isServerSession(session)) {
          const nextUser = await updateServerUser(session?.token as string, {
            preferredMode: mode
          });
          const mergedUser: User = {
            ...nextUser,
            password: currentUser.password
          };
          const nextUsers = replaceCachedUser(await storage.getUsers(), mergedUser);
          await storage.saveUsers(nextUsers);
          setCurrentUser(mergedUser);
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

        if (isServerSession(session)) {
          const nextUser = await updateServerUser(session?.token as string, {
            assistantName: normalizedAssistantName
          });
          const mergedUser: User = {
            ...nextUser,
            password: currentUser.password
          };
          const nextUsers = replaceCachedUser(await storage.getUsers(), mergedUser);
          await storage.saveUsers(nextUsers);
          setCurrentUser(mergedUser);
          return;
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
    [currentUser, isReady, session]
  );

  return <AuthSyncContext.Provider value={value}>{children}</AuthSyncContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthSyncContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
