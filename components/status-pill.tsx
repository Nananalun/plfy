import type { ReactNode } from "react";

type Tone = "green" | "amber" | "blue" | "red";

export function StatusPill({ children, tone }: { children: ReactNode; tone: Tone }) {
  return <span className={`status-pill status-pill-${tone}`}>{children}</span>;
}
