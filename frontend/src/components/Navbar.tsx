import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Boxes,
  PackagePlus,
  ArrowLeftRightIcon,
  Bell,
  Menu,
  X,
  User,
  MapPin,
} from "lucide-react";
import { useAuth } from "../Auth/context";
import Button from "./UI/Button";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navLinks: NavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Product", href: "/add", icon: PackagePlus },
  { label: "Location", href: "/location", icon: MapPin },
  { label: "Batches", href: "/batches", icon: Boxes },
  { label: "Stock Adjustments", href: "/adjustment", icon: ArrowLeftRightIcon },
  { label: "Expiry Alert", href: "/alert", icon: Bell },
];

const isLinkActive = (href: string) => {
  if (href === "/") {
    return location.pathname === "/" || location.pathname === "/home";
  }
  return location.pathname.startsWith(href);
};

const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigate = useNavigate();
  const { user, logout } = useAuth();

  async function handleLogout() {
    try {
      await logout();
    } catch (error) {
      console.error("Could not notify the server about logout:", error);
    } finally {
      navigate("/auth", { replace: true });
    }
  }

  return (
    <>
      <header className="fixed top-0 z-40 h-16 w-full border-b border-gray-300/80 bg-white/95 px-4  backdrop-blur-md md:px-6 ">
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between gap-4">
          <Link to="/" aria-label="Xpire Home" className="w-30 h-full">
            <img
              src="xpire-green.png"
              alt="Xpire Logo"
              className="h-full w-full object-contain"
            />
          </Link>

          <nav className="hidden items-center gap-2 md:flex">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const active = isLinkActive(link.href);

              return (
                <Link
                  key={link.label}
                  to={link.href}
                  className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition outline-none focus:outline-none focus:ring-0 ${
                    active
                      ? " bg-green-900 text-white  "
                      : "border-slate-200  text-slate-600  hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700"
                  }`}
                >
                  {active && (
                    <Icon
                      className={`h-4 w-4 ${active ? "text-white" : "text-slate-500"}`}
                    />
                  )}
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Menu Button */}
          <div className="flex items-center md:hidden">
            <button
              type="button"
              aria-label="Toggle menu"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="rounded-lg p-2 text-slate-700 transition hover:bg-slate-100 outline-none focus:outline-none focus:ring-0"
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
          <div className="hidden items-center gap-3 md:flex">
            {user && (
              <span className="max-w-40 truncate text-sm text-slate-600">
                {user.fullName}
              </span>
            )}
            <Button variant="secondary" onClick={() => void handleLogout()}>
              Sign out
            </Button>
          </div>
          {mobileMenuOpen && (
            <div className="fixed inset-x-0 top-16 z-30 border-b border-slate-200 bg-white px-4 py-4 shadow-xl md:hidden">
              <nav className="flex flex-col space-y-2">
                {navLinks.map((link) => {
                  const Icon = link.icon;
                  const active = isLinkActive(link.href);

                  return (
                    <Link
                      key={link.label}
                      to={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 rounded-lg border px-4 py-2.5 text-sm font-semibold transition outline-none focus:outline-none focus:ring-0 ${
                        active
                          ? "border-green-600 bg-green-600 text-white shadow-sm"
                          : "border-slate-200 bg-slate-50/50 text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-100"
                      }`}
                    >
                      <Icon
                        className={`h-4 w-4 ${active ? "text-white" : "text-slate-500"}`}
                      />
                      {link.label}
                    </Link>
                  );
                })}

                <div className="my-1 border-t border-slate-100 pt-1" />

                {user && (
                  <div className="flex items-center gap-3 px-4 py-2 text-sm text-slate-600">
                    <User className="h-4 w-4 text-slate-500" />
                    {user.fullName}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    void handleLogout();
                  }}
                  className="rounded-lg px-4 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  Sign out
                </button>
              </nav>
            </div>
          )}
        </div>
      </header>
    </>
  );
};

export default Navbar;
