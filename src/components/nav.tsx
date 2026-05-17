"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Layers, FolderKanban, Package, Home, BarChart2, Ruler, Scissors } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Home", icon: Home, exact: true },
  { href: "/journal", label: "Journal", icon: BookOpen, exact: false },
  { href: "/patterns", label: "Patterns", icon: Layers, exact: false },
  { href: "/projects", label: "Projects", icon: FolderKanban, exact: false },
  { href: "/stash", label: "Stash", icon: Package, exact: false },
  { href: "/gauge",   label: "Gauge",   icon: Ruler,    exact: false },
  { href: "/needles", label: "Needles", icon: Scissors, exact: false },
  { href: "/stats",   label: "Stats",   icon: BarChart2, exact: false },
];

export function Nav() {
  const pathname = usePathname();

  function isActive(href: string, exact: boolean) {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-56 min-h-screen border-r border-border bg-sidebar px-3 py-6 gap-1">
        <div className="px-3 mb-6">
          <span className="text-xl font-semibold text-primary">🧶 Knitify</span>
        </div>
        {navItems.map(({ href, label, icon: Icon, exact }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
              isActive(href, exact)
                ? "bg-primary text-primary-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
          >
            <Icon size={18} />
            {label}
          </Link>
        ))}
      </aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-sidebar border-t border-border flex">
        {navItems.map(({ href, label, icon: Icon, exact }) => (
          <Link
            key={href}
            href={href}
            title={label}
            className={cn(
              "flex-1 flex flex-col items-center justify-center py-3 transition-colors",
              isActive(href, exact)
                ? "text-primary"
                : "text-muted-foreground"
            )}
          >
            <Icon size={20} />
          </Link>
        ))}
      </nav>
    </>
  );
}
