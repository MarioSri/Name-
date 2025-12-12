import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { DocumentWorkflowProvider } from "@/contexts/DocumentWorkflowContext";
import { TutorialProvider } from "@/contexts/TutorialContext";
import { ErrorBoundary } from "@/utils/errorBoundary";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Documents from "./pages/Documents";
import TrackDocuments from "./pages/TrackDocuments";
import Calendar from "./pages/Calendar";
import Messages from "./pages/Messages";
import Approvals from "./pages/Approvals";
import ApprovalRouting from "./pages/ApprovalRouting";
import Analytics from "./pages/Analytics";

import Emergency from "./pages/Emergency";
import Profile from "./pages/Profile";
import AuthCallback from "./pages/AuthCallback";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// No localStorage cleanup needed - using Supabase only

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <AuthProvider>
          <NotificationProvider>
            <DocumentWorkflowProvider>
              <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <TutorialProvider>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } />
                <Route path="/documents" element={
                  <ProtectedRoute>
                    <Documents />
                  </ProtectedRoute>
                } />
                <Route path="/track-documents" element={
                  <ProtectedRoute>
                    <TrackDocuments />
                  </ProtectedRoute>
                } />
                <Route path="/calendar" element={
                  <ProtectedRoute>
                    <Calendar />
                  </ProtectedRoute>
                } />
                <Route path="/messages" element={
                  <ProtectedRoute>
                    <Messages />
                  </ProtectedRoute>
                } />
                <Route path="/approvals" element={
                  <ProtectedRoute requiredPermissions={['canApprove']}>
                    <Approvals />
                  </ProtectedRoute>
                } />
                <Route path="/approval-routing" element={
                  <ProtectedRoute requiredPermissions={['canManageWorkflows']}>
                    <ApprovalRouting />
                  </ProtectedRoute>
                } />
                <Route path="/analytics" element={
                  <ProtectedRoute>
                    <Analytics />
                  </ProtectedRoute>
                } />

                <Route path="/emergency" element={
                  <ProtectedRoute>
                    <Emergency />
                  </ProtectedRoute>
                } />
                <Route path="/profile" element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                } />
                {/* Auth callback route for Google OAuth */}
                <Route path="/auth/callback" element={<AuthCallback />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
                </TutorialProvider>
              </BrowserRouter>
              </TooltipProvider>
            </DocumentWorkflowProvider>
          </NotificationProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
