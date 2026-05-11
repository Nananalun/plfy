"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const navItems = [
  { href: "/", label: "总览", hint: "控制台" },
  { href: "/assets", label: "素材", hint: "素材库" },
  { href: "/tasks", label: "任务", hint: "批处理" },
  { href: "/workflows", label: "工作流", hint: "流程" },
  { href: "/models", label: "模型", hint: "模型中心" },
  { href: "/settings", label: "设置", hint: "系统" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-stack">
          <div className="brand-card">
            <span className="brand-kicker">FrameFlow AI</span>
            <h2>批量图片编辑平台</h2>
            <p>前后端一体、模型可切换、工作流可编排、任务可批量恢复。</p>
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
            <strong>推荐后端切分</strong>
            <p>统一网关 / 素材服务 / 工作流服务 / 任务编排 / 模型网关</p>
          </div>

          <div className="sidebar-card">
            <strong>当前阶段</strong>
            <p>本地可用版本。支持上传素材、前端填写密钥、调用真实模型和批量重绘任务。</p>
          </div>
        </div>
      </aside>

      <main className="shell-main">
        <div className="shell-main-inner">
          <header className="topbar">
            <div className="topbar-copy">
              <h1>AI 图片处理控制台</h1>
              <p>从素材导入到结果交付，用统一控制台管理整个批处理链路。</p>
            </div>
            <div className="topbar-stats">
              <span>多模型接入</span>
              <span>批量任务</span>
              <span>本地可用</span>
            </div>
          </header>
          {children}
        </div>
      </main>
    </div>
  );
}
