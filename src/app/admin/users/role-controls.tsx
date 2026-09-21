"use client";
import { useState, useTransition } from "react";
import type { SerrianRole } from "@/db/authorization-schema";
import { setUserRole } from "./actions";
const roleLabels = { admin: "ADMIN", god: "G.O.D.", player: "PLAYER" } as const;
export function RoleControls({ userId, roles, ownAccount }: { userId: string; roles: SerrianRole[]; ownAccount: boolean }) {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);
  return <div className="lg:min-w-[370px] lg:text-right">
    <p className="text-xs uppercase tracking-[0.14em] text-slate-300">Access Permissions</p>
    <div className="mt-4 flex flex-wrap gap-3 lg:justify-end">
      {(["admin", "god", "player"] as const).map((role) => {
        const hasRole = roles.includes(role);
        const locked = ownAccount && role === "admin" && hasRole;
        return <button key={role} type="button" disabled={pending || locked}
          aria-label={`${hasRole ? "Remove" : "Grant"} ${roleLabels[role]} access`} aria-pressed={hasRole}
          title={locked ? "You cannot remove your own administrator access." : undefined}
          className={`st-button ${hasRole ? "is-primary" : ""}`}
          onClick={() => {
            const data = new FormData();
            data.set("userId", userId); data.set("role", role); data.set("enabled", String(!hasRole));
            setFeedback(null);
            startTransition(async () => {
              try { setFeedback(await setUserRole(data)); }
              catch { setFeedback({ ok: false, message: "Unable to update access. Please try again." }); }
            });
          }}>{roleLabels[role]} {hasRole ? "On" : "+"}</button>;
      })}
    </div>
    {roles.length === 0 && <p className="mt-3 text-sm text-slate-300">This account currently has no Serrian Tide access.</p>}
    {feedback && <p role={feedback.ok ? "status" : "alert"} className={`mt-3 text-sm ${feedback.ok ? "text-emerald-300" : "text-red-300"}`}>{feedback.message}</p>}
  </div>;
}
