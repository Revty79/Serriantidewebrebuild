import Link from "next/link";
import { SignOutButton } from "./access/sign-out-button";

export function DestinationPlaceholder({ title, name }: { title: string; name: string }) {
  return <main className="relative z-10 flex min-h-screen items-center justify-center px-6 py-12">
    <section className="w-full max-w-xl rounded-3xl border border-white/10 bg-black/35 p-8 text-center shadow-2xl backdrop-blur-md">
      <p className="text-sm text-slate-400">Welcome, {name}.</p>
      <h1 className="mt-3 text-3xl text-slate-100">{title}</h1>
      <p className="mt-5 text-slate-300">This part of Serrian Tide is not open yet.</p>
      <Link className="st-button mt-8 inline-block" href="/access">Choose another path</Link>
      <SignOutButton />
    </section>
  </main>;
}
