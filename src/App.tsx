import { lazy, Suspense, type ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes, useParams } from "react-router-dom";
import { Notifications } from "@mantine/notifications";
import { ModalsProvider } from "@mantine/modals";

import ErrorBoundary from "./components/ErrorBoundary";
import ServerLoader from "./components/ServerLoader";
import { AuthProvider, useCurrentUser } from "./auth/AuthContext";
import AppLayout from "./layout/AppLayout";
import { useBrandFavicon } from "./lib/branding";

// pages load on demand so the first download stays small
const HomePage = lazy(() => import("./pages/HomePage"));
const AppPage = lazy(() => import("./pages/AppPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const JobsPage = lazy(() => import("./pages/JobsPage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));

const RecordListPage = lazy(() => import("./pages/records/RecordListPage"));
const RecordDetailPage = lazy(() => import("./pages/records/RecordDetailPage"));
const RecordFormPage = lazy(() => import("./pages/records/RecordFormPage"));

const TablesSettingsPage = lazy(() => import("./pages/settings/TablesSettingsPage"));
const TableSettingsPage = lazy(() => import("./pages/settings/TableSettingsPage"));
const UsersPage = lazy(() => import("./pages/settings/UsersPage"));
const RolesPage = lazy(() => import("./pages/settings/RolesPage"));
const DepartmentsPage = lazy(() => import("./pages/settings/DepartmentsPage"));
const AuditLogPage = lazy(() => import("./pages/settings/AuditLogPage"));
const AppsPage = lazy(() => import("./pages/settings/AppsPage"));
const EmailSettingsPage = lazy(() => import("./pages/settings/EmailSettingsPage"));
const BrandingPage = lazy(() => import("./pages/settings/BrandingPage"));
const AiSettingsPage = lazy(() => import("./pages/settings/AiSettingsPage"));
const ChatSettingsPage = lazy(() => import("./pages/settings/ChatSettingsPage"));
const ChatPage = lazy(() => import("./pages/ChatPage"));
const ForgotPasswordPage = lazy(() => import("./pages/PasswordPages").then((m) => ({ default: m.ForgotPasswordPage })));
const SetPasswordPage = lazy(() => import("./pages/PasswordPages").then((m) => ({ default: m.SetPasswordPage })));

// Admin-only pages (the API enforces this too).
function AdminOnly({ children }: { children: ReactNode }) {
  const { isAdmin } = useCurrentUser();
  return isAdmin ? <>{children}</> : <Navigate to="/" replace />;
}

// old record URLs (/table/x/view/:id, /table/x/edit/:id) keep working
function LegacyRecordRedirect({ edit }: { edit?: boolean }) {
  const { table = "", id = "" } = useParams();
  return <Navigate to={`/table/${encodeURIComponent(table)}/${encodeURIComponent(id)}${edit ? "/edit" : ""}`} replace />;
}

export default function App() {
  useBrandFavicon();
  return (
    <BrowserRouter>
      <ModalsProvider>
        <Notifications position="top-right" limit={4} />
        <ErrorBoundary>
          <ServerLoader>
            <Routes>
              {/* "Forgot password?" and the links from password emails: no sign-in */}
              <Route path="forgot-password" element={<Suspense fallback={null}><ForgotPasswordPage /></Suspense>} />
              <Route path="set-password" element={<Suspense fallback={null}><SetPasswordPage /></Suspense>} />
              <Route
                path="*"
                element={
            /* shows the login page until someone is signed in */
            <AuthProvider>
              <Routes>
                <Route element={<AppLayout />}>
                  <Route index element={<HomePage />} />
                  <Route path="apps/:appKey" element={<AppPage />} />
                  <Route path="profile" element={<ProfilePage />} />
                  <Route path="jobs" element={<JobsPage />} />

                  <Route path="table/:table" element={<RecordListPage />} />
                  <Route path="table/:table/new" element={<RecordFormPage />} />
                  <Route path="table/:table/view/:id" element={<LegacyRecordRedirect />} />
                  <Route path="table/:table/edit/:id" element={<LegacyRecordRedirect edit />} />
                  <Route path="table/:table/:id" element={<RecordDetailPage />} />
                  <Route path="table/:table/:id/edit" element={<RecordFormPage />} />

                  {/* bookmarked /login after signing in: go home instead of "Page not found" */}
                  <Route path="login" element={<Navigate to="/" replace />} />
                  <Route path="settings" element={<Navigate to="/settings/tables" replace />} />
                  <Route path="settings/tables" element={<AdminOnly><TablesSettingsPage /></AdminOnly>} />
                  <Route path="settings/tables/:table" element={<AdminOnly><TableSettingsPage /></AdminOnly>} />
                  <Route path="settings/users" element={<AdminOnly><UsersPage /></AdminOnly>} />
                  <Route path="settings/apps" element={<AdminOnly><AppsPage /></AdminOnly>} />
                  <Route path="settings/email" element={<AdminOnly><EmailSettingsPage /></AdminOnly>} />
                  <Route path="settings/branding" element={<AdminOnly><BrandingPage /></AdminOnly>} />
                  <Route path="settings/ai" element={<AdminOnly><AiSettingsPage /></AdminOnly>} />
                  <Route path="settings/chat" element={<AdminOnly><ChatSettingsPage /></AdminOnly>} />
                  <Route path="chat" element={<ChatPage />} />
                  <Route path="settings/roles" element={<AdminOnly><RolesPage /></AdminOnly>} />
                  <Route path="settings/departments" element={<AdminOnly><DepartmentsPage /></AdminOnly>} />
                  <Route path="settings/audit" element={<AdminOnly><AuditLogPage /></AdminOnly>} />

                  <Route path="*" element={<NotFoundPage />} />
                </Route>
              </Routes>
            </AuthProvider>
                }
              />
            </Routes>
          </ServerLoader>
        </ErrorBoundary>
      </ModalsProvider>
    </BrowserRouter>
  );
}
