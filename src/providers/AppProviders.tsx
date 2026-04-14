import React from "react";

import { AuthProvider, useAuth } from "../contexts/AuthSyncContext";
import { ChatProvider } from "../contexts/ChatSyncRuntimeContext";
import { SettingsProvider } from "../contexts/SettingsContext";

function NestedProviders({ children }: { children: React.ReactNode }) {
  const { currentUser, session } = useAuth();

  return (
    <ChatProvider currentUser={currentUser} session={session}>
      {children}
    </ChatProvider>
  );
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
