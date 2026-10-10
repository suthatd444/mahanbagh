"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useState } from "react";
import { api } from "../../lib/api";

interface AdminLayoutProps {
  children: ReactNode;
  user?: {
    name?: string | null;
    role?: string | null;
  } | null;
}

interface NavItem {
  label: string;
  abbreviation: string;
  href: string;
}

function buildNavigation(role?: string | null): NavItem[] {
  const canManageProjects = role === "ADMIN";
  // Every role manages a team of brokers below them: employees create
  // top-level brokers and brokers grow their own downline.
  const canManageTeam = true;

  return [
    {
      label: "Dashboard",
      abbreviation: "D",
      href: "/dashboard",
    },
    // {
    //   label: "Users",
    //   abbreviation: "U",
    //   href: "/users",
    // },
    ...(canManageTeam
      ? [
          {
            label: "Team",
            abbreviation: "T",
            href: "/team",
          },
        ]
      : []),
    {
      label: "Projects",
      abbreviation: "P",
      href: canManageProjects ? "/projects" : "/projects/browse",
    },
    {
      label: "Enquiries",
      abbreviation: "E",
      href: "/enquiries",
    },
    // {
    //   label: "Reports",
    //   abbreviation: "R",
    //   href: "/reports",
    // },
    // {
    //   label: "Settings",
    //   abbreviation: "S",
    //   href: "/settings",
    // },
  ];
}

function Sidebar({
  mobile = false,
  onClose,
  items,
}: {
  mobile?: boolean;
  onClose?: () => void;
  items: NavItem[];
}) {
  const pathname = usePathname();

  return (
    <aside
      className={`flex h-full w-72 flex-col bg-primary text-white shadow-xl ${
        mobile
          ? "fixed inset-y-0 left-0 z-50 md:hidden"
          : "hidden md:fixed md:inset-y-0 md:left-0 md:flex"
      }`}
    >
      {/* Logo */}
      <div className="flex h-20 items-center justify-between border-b border-white/15 px-6">
        <div>
          <p className="font-serif text-xl font-semibold">Mohan Bagh</p>

          <p className="mt-0.5 text-xs text-white/70">Administration</p>
        </div>

        {mobile && (
          <button
            type="button"
            aria-label="Close navigation"
            onClick={onClose}
            className="rounded-md p-2 text-white/80 hover:bg-white/10 hover:text-white"
          >
            <span aria-hidden="true">×</span>
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav
        className="flex-1 space-y-1 px-3 py-6"
        aria-label="Dashboard navigation"
      >
        {items.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" &&
              pathname.startsWith(`${item.href}/`));

          return (
            <Link
              key={item.label}
              href={item.href}
              onClick={mobile ? onClose : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition ${
                isActive
                  ? "bg-white text-primary shadow-sm"
                  : "text-white/75 hover:bg-white/10 hover:text-white"
              }`}
            >
              <span
                className={`flex h-7 w-7 items-center justify-center rounded text-xs font-bold ${
                  isActive ? "bg-primary/10" : "bg-white/10"
                }`}
              >
                {item.abbreviation}
              </span>

              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Support */}
      <div className="border-t border-white/15 p-4">
        <div className="rounded-lg bg-white/10 px-3 py-3 text-sm text-white/80">
          <p className="font-medium text-white">Need assistance?</p>

          <p className="mt-1 text-xs leading-5">
            Contact the Mohan Bagh support team.
          </p>
        </div>
      </div>
    </aside>
  );
}

function Header({
  user,
  onMenuClick,
  onLogout,
  isLoggingOut,
}: {
  user?: {
    name?: string | null;
    role?: string | null;
  } | null;
  onMenuClick: () => void;
  onLogout: () => void;
  isLoggingOut: boolean;
}) {
  const initials =
    user?.name
      ?.split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "MB";

  return (
    <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-amber-900/10 bg-bg/95 px-4 backdrop-blur sm:px-6 lg:px-8">
      {/* Left */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Open navigation"
          onClick={onMenuClick}
          className="rounded-lg border border-amber-900/15 bg-white p-2 text-primary shadow-sm md:hidden"
        >
          <span aria-hidden="true">☰</span>
        </button>

        <div>
          {/* <p className="text-sm text-gray-500">Administration</p> */}

          <h1 className="font-serif text-xl font-semibold text-primary sm:text-2xl">
            Mohan Bagh  
          </h1>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">
        {/* <button
          type="button"
          aria-label="Notifications"
          className="hidden rounded-lg border border-amber-900/15 bg-white px-3 py-2 text-sm text-gray-600 shadow-sm hover:bg-amber-50 sm:inline-flex"
        >
          Notifications
        </button> */}

        <div className="flex items-center gap-2 rounded-lg bg-white py-1.5 pl-2 pr-3 shadow-sm ring-1 ring-amber-900/10">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">
            {initials}
          </span>

          <div className="hidden text-left sm:block">
            <p className="max-w-32 truncate text-sm font-medium">
              {user?.name || "Administrator"}
            </p>

            <p className="text-xs text-gray-500">{user?.role || "ADMIN"}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onLogout}
          disabled={isLoggingOut}
          className="rounded-lg border border-amber-900/15 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoggingOut ? "Logging out..." : "Log out"}
        </button>
      </div>
    </header>
  );
}

export default function AdminLayout({ children, user }: AdminLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const router = useRouter();
  const navigation = buildNavigation(user?.role);

  async function logout() {
    try {
      setIsLoggingOut(true);
      await api.post("/auth/logout");
      router.replace("/login");
      router.refresh();
    } catch {
      window.alert("Unable to log out. Please try again.");
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg text-gray-900">
      {/* Desktop sidebar */}
      <Sidebar items={navigation} />

      {/* Mobile sidebar */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-950/40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        >
          <Sidebar
            items={navigation}
            mobile
            onClose={() => setIsSidebarOpen(false)}
          />
        </div>
      )}

      <div className="min-h-screen md:pl-72">
        <Header
          user={user}
          onMenuClick={() => setIsSidebarOpen(true)}
          onLogout={logout}
          isLoggingOut={isLoggingOut}
        />

        <main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
