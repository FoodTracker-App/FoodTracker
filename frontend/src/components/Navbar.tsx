import { useState } from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Boxes,
  PackagePlus,
  ArrowLeftRightIcon,
  Bell,
  Menu,
  X,
  User,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navLinks: NavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Add Product", href: "/add", icon: PackagePlus },
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

  const location = useLocation();
  const navigate = useNavigate();

  return (
    <>
      <header className="fixed top-0 z-40 h-16 w-full border-b border-slate-200/80 bg-white px-4  backdrop-blur-md md:px-6 lg:py-1">
        <div className=" flex h-full w-full items-center justify-between gap-4 ">
          <Link to="/" aria-label="Xpire Home" className="w-20 h-full ">
            {/* <span className='text-4xl font-bold text-green-700 drop-shadow-[0_2px_8px_rgba(0,0,0,0,0.6)] '>X</span>
            <span className='text-green-600'>pire</span> */}
            <img
              src="xpire.png"
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
                      ? " bg-green-900 text-white "
                      : "border-gray-200  text-gray-700  hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 ${active ? "text-white" : "text-slate-500"}`}
                  />
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
                      className={`flex items-center gap-3 rounded-lg border px-4 py-2.5 text-sm font-medium transition outline-none focus:outline-none focus:ring-0 ${
                        active
                          ? " bg-green-900 text-white shadow-sm"
                          : "border-slate-200 bg-slate-50/20 text-slate-700  hover:border-slate-300 hover:bg-slate-100"
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

                {/* Mobile Account Link */}
                <Link
                  to="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition outline-none focus:outline-none focus:ring-0 ${
                    location.pathname.startsWith("/profile")
                      ? "bg-green-50 text-green-600 font-semibold"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <User
                    className={`h-4 w-4 ${
                      location.pathname.startsWith("/profile")
                        ? "text-blue-600"
                        : "text-slate-500"
                    }`}
                  />
                  My Profile
                </Link>
              </nav>
            </div>
          )}
        </div>
      </header>
    </>
  );
};

export default Navbar;
