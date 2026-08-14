"use client";

import React from "react";
import { ChevronLeft } from "lucide-react";

interface PrivacyPolicyViewProps {
  onBack: () => void;
}

export default function PrivacyPolicyView({ onBack }: PrivacyPolicyViewProps) {
  return (
    <div className="flex flex-col h-[100dvh] max-w-md mx-auto relative overflow-hidden bg-black text-white font-sans">
      {/* Header */}
      <div className="flex items-center px-4 h-16 border-b border-white/10 shrink-0">
        <button
          onClick={onBack}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/5 active:scale-90 transition-all"
        >
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-xl font-bold ml-2 text-[#FFC554]">Privacy Notice</h1>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-6 py-8 space-y-8 scrollbar-hide">
        <div>
          <p className="text-sm text-white/60 font-medium">Last Updated: August 2026</p>
        </div>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-[#FFC554]">1. Who We Are</h2>
          <p className="text-sm text-white/80 leading-relaxed">
            LOOP is a ride coordination platform for university students, created by Sanjay Kamal S (24MIC7130, VIT-AP University).
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-[#FFC554]">2. What We Collect & Why</h2>
          <ul className="text-sm text-white/80 leading-relaxed space-y-2 list-disc pl-4">
            <li><strong>Email address</strong> — for account creation and login</li>
            <li><strong>Display name</strong> — so co-passengers can identify you</li>
            <li><strong>Password</strong> — stored securely by Supabase Auth (bcrypt hashed, never in plaintext)</li>
            <li><strong>Gender (optional)</strong> — used solely to power the "Girls Only" ride safety filter</li>
            <li><strong>Registration number (optional)</strong> — for campus identity verification among co-passengers</li>
            <li><strong>Profile picture (optional)</strong> — for visual identification in ride chats</li>
            <li><strong>Bio (optional)</strong> — short personal description visible to co-passengers</li>
            <li><strong>Ride data</strong> — destinations, departure times, and group chat messages within loops you join</li>
            <li><strong>Trusted driver entries</strong> — driver names and phone numbers you choose to share with the community</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-[#FFC554]">3. How We Use Your Data</h2>
          <p className="text-sm text-white/80 leading-relaxed">
            Your data is used solely to provide LOOP's ride coordination service. We do not sell, rent, or share your personal data with advertisers or data brokers.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-[#FFC554]">4. Third-Party Services</h2>
          <p className="text-sm text-white/80 leading-relaxed">
            LOOP uses Supabase (supabase.com) for authentication, database, and file storage. Supabase processes your data on our behalf. The app is hosted on Vercel (vercel.com).
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-[#FFC554]">5. Data Retention</h2>
          <p className="text-sm text-white/80 leading-relaxed">
            Your data is retained as long as your account exists. You can delete your account and all associated data at any time from your Profile settings.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-[#FFC554]">6. Your Rights (under India's DPDP Act, 2023)</h2>
          <ul className="text-sm text-white/80 leading-relaxed space-y-2 list-disc pl-4">
            <li>Right to access your personal data (visible on your Profile page)</li>
            <li>Right to correct inaccurate data (editable on your Profile page)</li>
            <li>Right to erase your data (via "Delete Account" in Profile settings)</li>
            <li>Right to withdraw consent (by deleting your account)</li>
            <li>Right to grievance redressal (contact us below)</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-[#FFC554]">7. Children's Data</h2>
          <p className="text-sm text-white/80 leading-relaxed">
            LOOP is intended for university students (18+). We do not knowingly collect data from children under 18. If you are under 18, please do not use this app.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-[#FFC554]">8. Security</h2>
          <p className="text-sm text-white/80 leading-relaxed">
            We use industry-standard security measures including encrypted connections (HTTPS), bcrypt password hashing, Row Level Security on all database tables, and JWT-based authentication.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-[#FFC554]">9. Contact & Grievance Redressal</h2>
          <p className="text-sm text-white/80 leading-relaxed">
            For any privacy concerns, data requests, or grievances, contact: <a href="mailto:sanjaykamal001@gmail.com" className="text-[#FFC554] hover:underline">sanjaykamal001@gmail.com</a>
          </p>
        </section>

        <div className="pt-8 pb-12">
          <button
            onClick={onBack}
            className="w-full h-14 bg-[#FFC554] text-black font-black rounded-full text-sm transition-all active:scale-[0.98] shadow-xl shadow-[#FFC554]/10"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
}
