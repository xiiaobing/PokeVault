import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode
} from "react";

import { loginUser, registerUser, logoutUser } from "../services/authService";
import type { LoginData, RegisterData } from "../services/authService";

interface AuthContextType {
  token: string | null;
  username: string | null;
  isAuthenticated: boolean;
  login: (data: LoginData) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(
    localStorage.getItem("token")
  );

  const [username, setUsername] = useState<string | null>(
    localStorage.getItem("username")
  );

  const isAuthenticated = Boolean(token);

  useEffect(() => {
    if (token) {
      localStorage.setItem("token", token);
    }
  }, [token]);

  const login = async (data: LoginData) => {
    const response = await loginUser(data);

    localStorage.setItem("token", response.token);
    localStorage.setItem("username", response.username);

    setToken(response.token);
    setUsername(response.username);
  };

  const register = async (data: RegisterData) => {
    const response = await registerUser(data);

    localStorage.setItem("token", response.token);
    localStorage.setItem("username", response.username);

    setToken(response.token);
    setUsername(response.username);
  };

  const logout = () => {
    logoutUser();
    setToken(null);
    setUsername(null);
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        username,
        isAuthenticated,
        login,
        register,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
