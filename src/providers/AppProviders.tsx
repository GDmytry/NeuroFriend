import React from "react";

import { AuthProvider, useAuth } from "../contexts/AuthContext";
import { ChatProvider } from "../contexts/ChatRuntimeContext";
import { SettingsProvider } from "../contexts/SettingsContext";

function NestedProviders({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAuth();

  return <ChatProvider currentUser={currentUser}>{children}</ChatProvider>;
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <SettingsProvider>
      <AuthProvider>
        <NestedProviders>{children}</NestedProviders>
      </AuthProvider>
    </SettingsProvider>
  );
}
