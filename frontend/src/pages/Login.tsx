import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogIn, Mail, Lock } from "lucide-react";

import { useAuth } from "../contexts/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login({ username, password });
      navigate("/");
    } catch {
      setError("Invalid username or password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 shadow-lg">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <LogIn className="h-7 w-7 text-primary" />
          </div>

          <h1 className="text-2xl font-bold text-text-primary">Welcome Back</h1>

          <p className="mt-2 text-sm text-text-secondary">
            Sign in to access your Pokémon collection.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-text-primary">
              Username
            </label>

            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-text-secondary" />

              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                required
                className="w-full rounded-xl border border-border bg-background py-3 pl-11 pr-4 text-text-primary outline-none focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-text-primary">
              Password
            </label>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-text-secondary" />

              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                className="w-full rounded-xl border border-border bg-background py-3 pl-11 pr-4 text-text-primary outline-none focus:border-primary"
              />
            </div>
          </div>

          {error && (
            <p className="rounded-lg bg-red-500/10 p-3 text-sm text-red-500">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-primary py-3 font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-text-secondary">
          Don't have an account?{" "}
          <Link
            to="/register"
            className="font-semibold text-primary hover:underline"
          >
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
