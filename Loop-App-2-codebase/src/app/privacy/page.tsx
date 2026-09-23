import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, ArrowLeft, Lock, Trash2, Eye, Server, Mail } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy | LOOP",
  description: "Official Privacy Policy for the LOOP ride coordination platform.",
};

export default function PrivacyPolicyPage() {
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
          Official Policy
        </span>
      </header>

      {/* Main Document Content */}
      <main className="max-w-3xl mx-auto px-5 py-10 sm:py-16 space-y-10">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFC554]/10 border border-[#FFC554]/25 text-[#FFC554] text-xs font-bold uppercase tracking-wider">
            <ShieldCheck size={14} />
            <span>DPDP Act 2023 Compliant</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Privacy Policy
          </h1>
          <p className="text-zinc-400 text-sm">
            Last Updated: September 9, 2026 • Effective Date: Immediate
          </p>
        </div>

        {/* Intro */}
        <section className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-3">
          <h2 className="text-base font-bold text-[#FFC554]">1. Overview & Platform Mission</h2>
          <p className="text-sm text-zinc-300 leading-relaxed">
            LOOP is a real-time, purpose-based ride coordination platform developed for university students and commuters, founded by Sanjay Kamal S (VIT-AP University). LOOP is designed strictly for peer-to-peer ride pooling and cost sharing. We respect your personal privacy and collect only the absolute minimum information required to safely coordinate shared rides.
          </p>
        </section>

        {/* What We Collect */}
        <section className="space-y-4">
          <div className="flex items-center gap-2.5 text-lg font-bold text-white">
            <div className="w-8 h-8 rounded-lg bg-[#FFC554]/15 flex items-center justify-center text-[#FFC554]">
              <Eye size={18} />
            </div>
            <h2>2. Information We Collect</h2>
          </div>
          <p className="text-sm text-zinc-400 leading-relaxed">
            When you register, create a ride, or join a group on LOOP, we collect the following categories of information:
          </p>
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/80 space-y-1.5">
              <span className="font-semibold text-white">Email Address</span>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Used for account creation, one-time authentication code (OTP) verification, password resets, and preventing spam.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/80 space-y-1.5">
              <span className="font-semibold text-white">Display Name & Avatar</span>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Displayed in ride listings and group chats so co-passengers can identify who they are coordinating with.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/80 space-y-1.5">
              <span className="font-semibold text-white">Phone Number (Optional)</span>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Optional contact detail shared solely with confirmed ride members for emergency coordination.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/80 space-y-1.5">
              <span className="font-semibold text-white">Campus Reg. Number & Gender</span>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Used to verify student status and power the "Female Only" safety filter for comfortable peer rides.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/80 space-y-1.5 sm:col-span-2">
              <span className="font-semibold text-white">Ride Coordination & Location Data</span>
              <p className="text-xs text-zinc-400 leading-relaxed">
                When you share a meeting spot or live GPS coordinates in a ride chat, that location is shared only with confirmed co-passengers within that specific temporary loop. We do not track your location in the background.
              </p>
            </div>
          </div>
        </section>

        {/* How We Use Information */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-white">3. How We Use Your Data</h2>
          <ul className="text-sm text-zinc-300 space-y-2.5 list-disc pl-5 leading-relaxed">
            <li>Facilitate real-time ride discovery, matching, and seat booking between students.</li>
            <li>Enable temporary group chat, fare splitting calculations, and coordinate meeting points.</li>
            <li>Maintain trust and safety through student verification and female-only filters.</li>
            <li>Send essential push and local notifications when co-passengers message or join your ride.</li>
            <li><strong className="text-white">We never sell, monetize, rent, or lease your personal information to third parties, advertising networks, or data brokers.</strong></li>
          </ul>
        </section>

        {/* Storage & Third-Party Infrastructure */}
        <section className="space-y-4">
          <div className="flex items-center gap-2.5 text-lg font-bold text-white">
            <div className="w-8 h-8 rounded-lg bg-[#FFC554]/15 flex items-center justify-center text-[#FFC554]">
              <Server size={18} />
            </div>
            <h2>4. Third-Party Service Providers & Storage</h2>
          </div>
          <p className="text-sm text-zinc-300 leading-relaxed">
            LOOP relies on world-class infrastructure providers to operate securely:
          </p>
          <div className="space-y-2 text-sm">
            <div className="p-3.5 rounded-xl bg-zinc-900/30 border border-zinc-800/60">
              <span className="font-bold text-[#FFC554]">Supabase (Database, Auth & Realtime):</span>
              <p className="text-xs text-zinc-400 mt-1">
                Data is stored in encrypted PostgreSQL databases with Postgres Row Level Security (RLS) enforcing strict access boundaries. Passwords are salted and hashed with bcrypt.
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-zinc-900/30 border border-zinc-800/60">
              <span className="font-bold text-[#FFC554]">Vercel (Web Hosting & Edge Delivery):</span>
              <p className="text-xs text-zinc-400 mt-1">
                Our responsive web application and API routes run on secure, global edge servers with HTTPS SSL/TLS encryption in transit.
              </p>
            </div>
          </div>
        </section>

        {/* Data Retention & Deletion */}
        <section className="space-y-4">
          <div className="flex items-center gap-2.5 text-lg font-bold text-white">
            <div className="w-8 h-8 rounded-lg bg-red-500/15 flex items-center justify-center text-red-400">
              <Trash2 size={18} />
            </div>
            <h2>5. Data Retention & Your Right to Erase</h2>
          </div>
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-zinc-300 space-y-2 leading-relaxed">
            <p className="font-semibold text-white">In-App Account & Data Deletion:</p>
            <p className="text-xs text-zinc-300">
              You maintain full control over your personal data. At any time, you can navigate to <strong className="text-white">Profile → Settings → Delete Account</strong> to permanently erase your profile, memberships, chat messages, and authentication records immediately.
            </p>
            <p className="text-xs text-zinc-400">
              Past completed loops are automatically expired and cleaned up by scheduled database procedures.
            </p>
          </div>
        </section>

        {/* Security */}
        <section className="space-y-4">
          <div className="flex items-center gap-2.5 text-lg font-bold text-white">
            <div className="w-8 h-8 rounded-lg bg-[#FFC554]/15 flex items-center justify-center text-[#FFC554]">
              <Lock size={18} />
            </div>
            <h2>6. Security Measures</h2>
          </div>
          <p className="text-sm text-zinc-300 leading-relaxed">
            We implement comprehensive security safeguards:
          </p>
          <ul className="text-xs text-zinc-400 space-y-1.5 list-disc pl-5 leading-relaxed">
            <li>Strict PostgreSQL Row Level Security (RLS) policies on every database table.</li>
            <li>Enforced HTTPS on all client and server transmissions.</li>
            <li>Cryptographic JSON Web Tokens (JWT) for session authentication.</li>
            <li>Zero client-side storage of raw passwords.</li>
          </ul>
        </section>

        {/* Contact Information */}
        <section className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-3">
          <div className="flex items-center gap-2 text-[#FFC554] font-bold text-base">
            <Mail size={18} />
            <h2>7. Contact Us & Grievance Redressal</h2>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            If you have questions, feedback, or grievance redressal requests regarding this Privacy Policy or your personal information, please contact:
          </p>
          <div className="text-xs text-zinc-300 space-y-1 font-mono">
            <p><strong>Platform:</strong> LOOP (Peer-to-Peer Ride Coordination)</p>
            <p><strong>Grievance & Privacy Support:</strong>{" "}
              <a href={`mailto:${process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@loopcampus.in"}`} className="text-[#FFC554] underline">
                {process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@loopcampus.in"}
              </a>
            </p>
          </div>
        </section>

        {/* Footer */}
        <footer className="pt-8 border-t border-zinc-800 text-center text-xs text-zinc-500 space-y-2">
          <p>© 2026 LOOP. All rights reserved.</p>
          <div className="flex justify-center gap-4">
            <Link href="/terms" className="hover:text-zinc-300 transition-colors">Terms of Service</Link>
            <span>•</span>
            <Link href="/" className="hover:text-zinc-300 transition-colors">Back to App</Link>
          </div>
        </footer>
      </main>
    </div>
  );
}
