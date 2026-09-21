"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return <div className="mt-8 text-center">
    <button type="button" className="st-button" disabled={busy} onClick={async () => {
      setBusy(true); setError("");
      try {
        const result = await authClient.signOut();
        if (result.error) throw new Error(result.error.message);
        router.replace("/login"); router.refresh();
      } catch { setError("Unable to sign out. Please try again."); setBusy(false); }
    }}>{busy ? "Signing out..." : "Sign out"}</button>
    {error && <p role="alert" className="mt-3 text-red-300">{error}</p>}
  </div>;
}
