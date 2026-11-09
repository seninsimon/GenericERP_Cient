import { lazy, Suspense } from "react";
import type { ReactNode } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Center, Loader } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { ModalsProvider } from "@mantine/modals";

import ErrorBoundary from "./components/ErrorBoundary";
import MainLayout from "./layout/MainLayout";
import { AuthProvider } from "./auth/AuthContext";
import ServerLoader from "./components/ServerLoader";

// pages are loaded on demand so the first download stays small
const HomePage = lazy(() => import("./pages/HomePage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const JobsPage = lazy(() => import("./pages/JobsPage"));
const TableListPage = lazy(() => import("./pages/Table/TableListPage"));
const TableFormPage = lazy(() => import("./pages/TableFormPage"));
const SettingsLayout = lazy(() => import("./pages/settings/SettingsLayout"));
const SettingsTables = lazy(() => import("./pages/settings/SettingsTables"));
const UsersPage = lazy(() => import("./pages/settings/UsersPage"));
const RolesPage = lazy(() => import("./pages/settings/RolesPage"));
const DepartmentsPage = lazy(() => import("./pages/settings/DepartmentsPage"));
const AuditLogPage = lazy(() => import("./pages/settings/AuditLogPage"));

const PageLoader = () => (
  <Center h={300}>
    <Loader />
  </Center>
);

const page = (element: ReactNode) => <Suspense fallback={<PageLoader />}>{element}</Suspense>;

function App({ themeName, setThemeName }: any) {
  return (
    <BrowserRouter>
      <ModalsProvider>
        <Notifications position="top-right" />

        <ErrorBoundary>
          <ServerLoader>
            {/* shows the login page until someone is signed in */}
            <AuthProvider>
              <Routes>
                <Route
                  element={
                    <MainLayout
                      themeName={themeName}
                      setThemeName={setThemeName}
                    />
                  }
                >
                  <Route path="/" element={page(<HomePage />)} />
                  <Route path="/profile" element={page(<ProfilePage />)} />
                  <Route path="/jobs" element={page(<JobsPage />)} />

                  {/* admins only (enforced in SettingsLayout and by the API) */}
                  <Route path="/settings" element={page(<SettingsLayout />)}>
                    <Route index element={<Navigate to="tables" replace />} />
                    <Route path="tables" element={page(<SettingsTables />)} />
                    <Route path="users" element={page(<UsersPage />)} />
                    <Route path="roles" element={page(<RolesPage />)} />
                    <Route path="departments" element={page(<DepartmentsPage />)} />
                    <Route path="audit" element={page(<AuditLogPage />)} />
                  </Route>

                  <Route path="/table/:table" element={page(<TableListPage />)} />
                  <Route path="/table/:table/new" element={page(<TableFormPage />)} />
                  <Route path="/table/:table/view/:id" element={page(<TableFormPage />)} />
                  <Route path="/table/:table/edit/:id" element={page(<TableFormPage />)} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
              </Routes>
            </AuthProvider>
          </ServerLoader>
        </ErrorBoundary>
      </ModalsProvider>
    </BrowserRouter>
  );
}

export default App;
