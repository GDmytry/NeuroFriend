import React from "react";

import { AuthProvider, useAuth } from "../contexts/AuthContext";
import { ChatProvider } from "../contexts/ChatContext";

function NestedProviders({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAuth();

  return <ChatProvider currentUser={currentUser}>{children}</ChatProvider>;
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <NestedProviders>{children}</NestedProviders>
    </AuthProvider>
  );
}
