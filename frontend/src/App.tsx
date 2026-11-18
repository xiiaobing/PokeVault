import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  Outlet
} from "react-router-dom";

import DashboardLayout from "./layouts/DashboardLayout";

import Dashboard from "./pages/Dashboard";
import CardSearch from "./pages/CardSearch";
import Collection from "./pages/Collection";
import Watchlist from "./pages/Watchlist";
import AIAssistant from "./pages/AIAssistant";
import Settings from "./pages/Settings";

import Login from "./pages/Login";
import Register from "./pages/Register";

import { AuthProvider, useAuth } from "./contexts/AuthContext";

function ProtectedRoute() {
  const { isAuthenticated } = useAuth();

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" replace /> : <Login />}
      />

      <Route
        path="/register"
        element={isAuthenticated ? <Navigate to="/" replace /> : <Register />}
      />

      {/* Protect all dashboard pages */}
      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/search" element={<CardSearch />} />
          <Route path="/collection" element={<Collection />} />
          <Route path="/watchlist" element={<Watchlist />} />
          <Route path="/ai-assistant" element={<AIAssistant />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
