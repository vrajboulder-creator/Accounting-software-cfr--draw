"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, Building2, FileCheck2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BoulderLogo } from "@/components/boulder-logo";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => router.push("/projects"), 500);
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-[1.1fr_1fr]">
      {/* Left — form */}
      <div className="flex flex-col justify-between p-8 lg:p-14">
        <div>
          <BoulderLogo size="md" filled />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-md w-full mx-auto lg:mx-0"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-boulder-200 bg-boulder-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-boulder-700">
            <span className="h-1.5 w-1.5 rounded-full bg-boulder-500" />
            CFR & Draw Platform
          </div>

          <h1 className="mt-5 font-display text-5xl font-bold tracking-tight text-neutral-950 leading-[1.05]">
            Build it.
            <br />
            <span className="text-boulder-500">Bill it.</span>{" "}
            <span className="text-neutral-400">Balance it.</span>
          </h1>

          <p className="mt-4 text-neutral-600 text-base leading-relaxed">
            One system for cost tracking, AIA G702/G703 draws, and owner billing —
            kept in reconciliation, in real time.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-700">Work email</label>
              <Input
                type="email"
                defaultValue="miguel@boulderconstruction.com"
                placeholder="you@company.com"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-700">Password</label>
              <Input type="password" defaultValue="demo-preview" required />
            </div>
            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </form>

          <p className="mt-4 text-xs text-neutral-500">
            Demo build — any credentials will work. Use the role switcher (bottom-right) to preview each perspective.
          </p>
        </motion.div>

        <div className="text-xs text-neutral-400">
          &copy; {new Date().getFullYear()} Boulder Construction. All rights reserved.
        </div>
      </div>

      {/* Right — brand panel */}
      <div className="hidden lg:flex relative overflow-hidden bg-neutral-950 text-white p-14 flex-col justify-between">
        {/* Decorative giant outlined wordmark */}
        <div className="absolute -top-8 -right-10 pointer-events-none select-none">
          <div className="outline-text text-boulder-500 font-display font-black leading-none text-[18rem] tracking-tighter">
            BC
          </div>
        </div>

        <div className="absolute inset-0 opacity-40 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(242,107,53,0.22),transparent_55%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(242,107,53,0.12),transparent_45%)]" />
        </div>

        <div className="relative z-10">
          <div className="text-[10px] font-semibold uppercase tracking-[0.32em] text-boulder-300">
            Residence Inn · Waxahachie TX
          </div>
          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-6xl font-display font-black text-boulder-500">96.2%</span>
            <span className="text-sm text-neutral-400">complete</span>
          </div>
          <div className="mt-1 text-sm text-neutral-400">$11.8M contract · Draw 17 submitted</div>
        </div>

        <div className="relative z-10 space-y-5 max-w-sm">
          <Feature icon={<Building2 className="h-4 w-4" />} title="Unified project view" desc="Every contract, division, transaction, and draw in one reconciled ledger." />
          <Feature icon={<FileCheck2 className="h-4 w-4" />} title="AIA G702 / G703 native" desc="Printable, auditable pay applications generated from your cost data." />
          <Feature icon={<Shield className="h-4 w-4" />} title="Role-aware access" desc="Owner sees billing. Contractor sees margin. Both see only what they should." />
        </div>
      </div>
    </div>
  );
}

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex gap-3">
      <div className="h-7 w-7 rounded-md bg-boulder-500/15 text-boulder-400 flex items-center justify-center shrink-0 mt-0.5">
        {icon}
      </div>
      <div>
        <div className="font-semibold text-white text-sm">{title}</div>
        <div className="text-xs text-neutral-400 leading-relaxed mt-0.5">{desc}</div>
      </div>
    </div>
  );
}
