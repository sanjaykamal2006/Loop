import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, ArrowLeft, Scale, Users, AlertTriangle, FileText, Mail } from "lucide-react";

export const metadata: Metadata = {
  title: "Terms of Service | LOOP",
  description: "Terms of Service and Community Guidelines for the LOOP platform.",
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-black text-white selection:bg-[#FFC554]/30 selection:text-[#FFC554]">
      {/* Top App Bar */}
      <header className="sticky top-0 z-30 backdrop-blur-md bg-black/80 border-b border-zinc-800/80 px-4 h-16 flex items-center justify-between max-w-3xl mx-auto">
        <Link
          href="/"
          className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm font-medium"
        >
          <ArrowLeft size={18} />
          <span>Back to LOOP</span>
        </Link>
        <span className="text-xs font-mono uppercase tracking-widest text-[#FFC554] bg-[#FFC554]/10 border border-[#FFC554]/20 px-2.5 py-1 rounded-full">
          Terms & Conditions
        </span>
      </header>

      {/* Main Document Content */}
      <main className="max-w-3xl mx-auto px-5 py-10 sm:py-16 space-y-10">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFC554]/10 border border-[#FFC554]/25 text-[#FFC554] text-xs font-bold uppercase tracking-wider">
            <Scale size={14} />
            <span>Community Agreement</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Terms of Service
          </h1>
          <p className="text-zinc-400 text-sm">
            Last Updated: September 9, 2026 • Effective Date: Immediate
          </p>
        </div>

        {/* 1. Nature of Platform */}
        <section className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-3">
          <h2 className="text-base font-bold text-[#FFC554]">1. Platform Nature & Non-Commercial Purpose</h2>
          <p className="text-sm text-zinc-300 leading-relaxed">
            LOOP is a peer-to-peer digital coordination bulletin and chat tool built specifically for college students and local campus commuters. 
            <strong className="text-white"> LOOP is NOT a transportation network company, commercial taxi service, or motor vehicle carrier.</strong> LOOP does not own, lease, or operate vehicles, nor does it employ or contract drivers. All ride coordination is strictly voluntary, private, and peer-to-peer.
          </p>
        </section>

        {/* 2. Voluntary Cost Sharing */}
        <section className="space-y-4">
          <div className="flex items-center gap-2.5 text-lg font-bold text-white">
            <div className="w-8 h-8 rounded-lg bg-[#FFC554]/15 flex items-center justify-center text-[#FFC554]">
              <Users size={18} />
            </div>
            <h2>2. Cost Sharing & Fare Splitting</h2>
          </div>
          <p className="text-sm text-zinc-300 leading-relaxed">
            Any monetary amounts referenced in the app (such as estimated fares or split fares) represent purely shared out-of-pocket expenses (e.g. shared auto-rickshaw fares, metered cab fares, fuel, or toll fees) divided equally among passengers. Under no circumstances may any user generate commercial profit or charge commercial fares through LOOP.
          </p>
        </section>

        {/* 3. Community Conduct */}
        <section className="space-y-4">
          <div className="flex items-center gap-2.5 text-lg font-bold text-white">
            <div className="w-8 h-8 rounded-lg bg-[#FFC554]/15 flex items-center justify-center text-[#FFC554]">
              <ShieldCheck size={18} />
            </div>
            <h2>3. Community Guidelines & Safety</h2>
          </div>
          <p className="text-sm text-zinc-300 leading-relaxed">
            By using LOOP, you agree to:
          </p>
          <ul className="text-sm text-zinc-400 space-y-2 list-disc pl-5 leading-relaxed">
            <li>Treat all students, co-passengers, and drivers with courtesy and mutual respect.</li>
            <li>Abide by campus safety codes, traffic regulations, and passenger limits.</li>
            <li>Respect the "Female Only" filter: users who do not identify as female must never attempt to bypass or join designated female-only loops.</li>
            <li>Never use the platform for unlawful purposes, harassment, hate speech, reckless driving, or spamming.</li>
          </ul>
        </section>

        {/* 4. Limitation of Liability */}
        <section className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-3">
          <div className="flex items-center gap-2 text-[#FFC554] font-bold text-base">
            <AlertTriangle size={18} />
            <h2>4. Limitation of Liability & Assumption of Risk</h2>
          </div>
          <p className="text-xs text-zinc-300 leading-relaxed">
            Users participate in coordinated rides entirely at their own independent discretion and risk. Neither the creator of LOOP, VIT-AP University, nor any platform operators shall be held liable for any bodily injury, vehicle accidents, delays, property damage, missed trains or flights, interpersonal disputes, or third-party actions occurring prior to, during, or subsequent to a coordinated ride.
          </p>
        </section>

        {/* 5. Account Termination */}
        <section className="space-y-4">
          <div className="flex items-center gap-2.5 text-lg font-bold text-white">
            <div className="w-8 h-8 rounded-lg bg-[#FFC554]/15 flex items-center justify-center text-[#FFC554]">
              <FileText size={18} />
            </div>
            <h2>5. Account Management & Termination</h2>
          </div>
          <p className="text-sm text-zinc-300 leading-relaxed">
            We reserve the right to suspend or terminate accounts that violate community rules, misrepresent their identity, or engage in suspicious or harmful activities. Users may voluntarily close and permanently delete their account at any time via the in-app settings.
          </p>
        </section>

        {/* 6. Contact */}
        <section className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-3">
          <div className="flex items-center gap-2 text-[#FFC554] font-bold text-base">
            <Mail size={18} />
            <h2>6. Contact Information</h2>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            For questions or assistance regarding these terms, please contact:
          </p>
          <div className="text-xs text-zinc-300 space-y-1 font-mono">
            <p><strong>Platform:</strong> LOOP (Ride Coordination)</p>
            <p><strong>Support & Grievances:</strong> <a href={`mailto:${process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@loopcampus.in"}`} className="text-[#FFC554] underline">{process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@loopcampus.in"}</a></p>
          </div>
        </section>

        {/* Footer */}
        <footer className="pt-8 border-t border-zinc-800 text-center text-xs text-zinc-500 space-y-2">
          <p>© 2026 LOOP. All rights reserved.</p>
          <div className="flex justify-center gap-4">
            <Link href="/privacy" className="hover:text-zinc-300 transition-colors">Privacy Policy</Link>
            <span>•</span>
            <Link href="/" className="hover:text-zinc-300 transition-colors">Back to App</Link>
          </div>
        </footer>
      </main>
    </div>
  );
}
