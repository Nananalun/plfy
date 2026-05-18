"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const navItems = [
  { href: "/", label: "Overview", hint: "Console" },
  { href: "/tasks", label: "Tasks", hint: "Batch queue" },
  { href: "/workflows", label: "Workflows", hint: "Pipeline" },
  { href: "/models", label: "Models", hint: "Routing" },
  { href: "/settings", label: "Settings", hint: "System" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-stack">
          <div className="brand-card">
            <span className="brand-kicker">FrameFlow AI</span>
            <h2>Batch Image Operations</h2>
            <p>Upload from task creation, run model jobs, retry failures, and download outputs.</p>
          </div>

          <nav className="sidebar-nav" aria-label="Primary">
            {navItems.map((item) => {
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-link${isActive ? " nav-link-active" : ""}`}
                >
                  <span>{item.label}</span>
                  <span>{item.hint}</span>
                </Link>
              );
            })}
          </nav>

          <div className="sidebar-card">
            <strong>Runtime Focus</strong>
            <p>Task queue / model gateway / output delivery. Asset browsing is intentionally disabled.</p>
          </div>

          <div className="sidebar-card">
            <strong>Current Mode</strong>
            <p>Local persistent runner with at least 10 concurrent job slots.</p>
          </div>
        </div>
      </aside>

      <main className="shell-main">
        <div className="shell-main-inner">
          <header className="topbar">
            <div className="topbar-copy">
              <h1>AI Image Processing Console</h1>
              <p>Manage upload, execution, retry, and output delivery from the task queue.</p>
            </div>
            <div className="topbar-stats">
              <span>Multi-model</span>
              <span>Batch jobs</span>
              <span>Local runner</span>
            </div>
          </header>
          {children}
        </div>
      </main>
    </div>
  );
}
