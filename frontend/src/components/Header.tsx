import { Bell, Menu, Search, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

interface HeaderProps {
  activePage: string;
  onMenuClick: () => void;
}

export default function Header({ activePage, onMenuClick }: HeaderProps) {
  const { logout, username } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-border bg-background/90 px-4 backdrop-blur-md sm:px-6 lg:px-8">
      {/* Left section */}
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="text-text-secondary hover:text-text-primary lg:hidden"
        >
          <Menu size={24} />
        </button>

        <div>
          <h1 className="text-xl font-semibold text-text-primary">
            {activePage}
          </h1>
          <p className="hidden text-xs text-text-secondary sm:block">
            Manage your Pokémon TCG collection
          </p>
        </div>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-3 sm:gap-5">
        <div className="relative hidden sm:block">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
          />
          <input
            type="text"
            placeholder="Search..."
            className="w-48 rounded-xl border border-border bg-surface py-2.5 pl-10 pr-4 text-sm text-text-primary outline-none transition focus:border-primary lg:w-64"
          />
        </div>

        <button className="relative rounded-xl p-2 text-text-secondary transition hover:bg-surface-light hover:text-text-primary">
          <Bell size={21} />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary" />
        </button>

        <div
          title={username ?? "User"}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/20 text-sm font-semibold text-primary"
        >
          {username?.charAt(0).toUpperCase() ?? "P"}
        </div>

        <button
          onClick={handleLogout}
          title="Logout"
          className="flex items-center gap-2 rounded-xl p-2 text-text-secondary transition hover:bg-surface-light hover:text-red-500"
        >
          <LogOut size={20} />
          <span className="hidden text-sm sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}
