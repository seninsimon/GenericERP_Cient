import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Notifications } from "@mantine/notifications";
import { ModalsProvider } from "@mantine/modals";

import ErrorBoundary from "./components/ErrorBoundary";
import MainLayout from "./layout/MainLayout";
import { AuthProvider } from "./auth/AuthContext";

import HomePage from "./pages/HomePage";
import ProfilePage from "./pages/ProfilePage";
import TableListPage from "./pages/Table/TableListPage";
import TableFormPage from "./pages/TableFormPage";
import SettingsLayout from "./pages/settings/SettingsLayout";
import SettingsTables from "./pages/settings/SettingsTables";
import UsersPage from "./pages/settings/UsersPage";
import RolesPage from "./pages/settings/RolesPage";
import DepartmentsPage from "./pages/settings/DepartmentsPage";

import ServerLoader from "./components/ServerLoader";

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
                  <Route path="/" element={<HomePage />} />
                  <Route path="/profile" element={<ProfilePage />} />

                  {/* admins only (enforced in SettingsLayout and by the API) */}
                  <Route path="/settings" element={<SettingsLayout />}>
                    <Route index element={<Navigate to="tables" replace />} />
                    <Route path="tables" element={<SettingsTables />} />
                    <Route path="users" element={<UsersPage />} />
                    <Route path="roles" element={<RolesPage />} />
                    <Route path="departments" element={<DepartmentsPage />} />
                  </Route>

                  <Route path="/table/:table" element={<TableListPage />} />
                  <Route path="/table/:table/new" element={<TableFormPage />} />
                  <Route path="/table/:table/view/:id" element={<TableFormPage />} />
                  <Route path="/table/:table/edit/:id" element={<TableFormPage />} />
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
