"use client";

import { ToasterProvider } from "./components/views/ui/toaster";
import { AuthProvider } from "@/contexts/AuthContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import PageTransitionFramer from "@/components/PageTransitionFramer";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <NotificationProvider>
        <ToasterProvider>
          <PageTransitionFramer>{children}</PageTransitionFramer>
        </ToasterProvider>
      </NotificationProvider>
    </AuthProvider>
  );
}
