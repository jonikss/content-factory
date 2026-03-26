"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  {
    label: "Дашборд",
    href: "/",
    icon: (
      <svg
        viewBox="0 0 14 14"
        fill="currentColor"
        className="w-3.5 h-3.5 shrink-0"
      >
        <rect x="1" y="1" width="5" height="5" rx="1" />
        <rect x="8" y="1" width="5" height="5" rx="1" />
        <rect x="1" y="8" width="5" height="5" rx="1" />
        <rect x="8" y="8" width="5" height="5" rx="1" />
      </svg>
    ),
    badge: { text: "live", color: "bg-green/15 text-green" },
  },
  {
    label: "Генерация",
    href: "/generate",
    icon: (
      <svg viewBox="0 0 14 14" className="w-3.5 h-3.5 shrink-0">
        <path
          d="M7 1v12M1 7h12"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
    badge: { text: "new", color: "bg-accent/20 text-accent" },
  },
  {
    label: "Статьи",
    href: "/articles",
    icon: (
      <svg
        viewBox="0 0 14 14"
        fill="currentColor"
        className="w-3.5 h-3.5 shrink-0"
      >
        <path d="M2 1h10a1 1 0 011 1v10a1 1 0 01-1 1H2a1 1 0 01-1-1V2a1 1 0 011-1zm1 3h8v1H3V4zm0 2h8v1H3V6zm0 2h5v1H3V8z" />
      </svg>
    ),
  },
];

const systemItems = [
  {
    label: "Настройки",
    href: "/settings",
    icon: (
      <svg
        viewBox="0 0 14 14"
        fill="currentColor"
        className="w-3.5 h-3.5 shrink-0"
      >
        <path d="M7 4.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5zM1 7l1.2-2.1-.8-2.2 2.3-.7L5.1 1 7 1.8 8.9 1l1.4 1 2.3.7-.8 2.2L13 7l-1.2 2.1.8 2.2-2.3.7L8.9 13 7 12.2 5.1 13l-1.4-1-2.3-.7.8-2.2L1 7z" />
      </svg>
    ),
  },
];

export function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <div className="w-48 shrink-0 bg-bg2 border-r border-border flex flex-col">
      {/* Logo */}
      <div className="px-3.5 py-4 flex items-center gap-2 border-b border-border">
        <div className="w-[26px] h-[26px] bg-accent rounded-md flex items-center justify-center shrink-0">
          <svg viewBox="0 0 14 14" className="w-[13px] h-[13px] fill-white">
            <path d="M2 2h4v4H2zm6 0h4v4H8zM2 8h4v4H2zm6 2h2v2H8zm2-2h2v2h-2z" />
          </svg>
        </div>
        <div>
          <div className="text-[13px] font-semibold tracking-tight">
            ContentFactory
          </div>
          <div className="text-[9px] text-text3 font-mono uppercase tracking-wider mt-0.5">
            MVP v0.1
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="p-1.5 flex-1">
        <div className="text-[9px] font-medium text-text3 uppercase tracking-wider px-2 pt-2.5 pb-1">
          Основное
        </div>
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-medium transition-colors mb-0.5 ${
              isActive(item.href)
                ? "bg-bg4 text-text"
                : "text-text2 hover:bg-bg3 hover:text-text"
            }`}
          >
            <span
              className={isActive(item.href) ? "opacity-100" : "opacity-65"}
            >
              {item.icon}
            </span>
            {item.label}
            {item.badge && (
              <span
                className={`ml-auto text-[10px] px-1.5 py-px rounded font-mono ${item.badge.color}`}
              >
                {item.badge.text}
              </span>
            )}
          </Link>
        ))}

        <div className="text-[9px] font-medium text-text3 uppercase tracking-wider px-2 pt-2.5 pb-1">
          Система
        </div>
        {systemItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-medium transition-colors mb-0.5 ${
              isActive(item.href)
                ? "bg-bg4 text-text"
                : "text-text2 hover:bg-bg3 hover:text-text"
            }`}
          >
            <span
              className={isActive(item.href) ? "opacity-100" : "opacity-65"}
            >
              {item.icon}
            </span>
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-1.5 pb-3 border-t border-border">
        <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-md bg-bg3 text-[10px] text-text3 font-mono">
          <div className="w-[5px] h-[5px] rounded-full bg-green shrink-0 shadow-[0_0_4px_var(--color-green)]" />
          OpenAI-compatible
        </div>
      </div>
    </div>
  );
}
