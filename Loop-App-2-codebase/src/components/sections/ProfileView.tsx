"use client";

import React, { useState } from "react";
import { useLoop } from "@/lib/LoopContext";
import { LogOut, Users, Edit2, Check, Camera, ShieldCheck, Sparkles, Sun, Moon, Trash2, Mail, FileText, AlertTriangle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import TermsModal from "./TermsModal";
import CreatorModal from "./CreatorModal";

export default function ProfileView() {
  const { session, profile, updateProfile, handleSignOut, theme, toggleTheme, setView } = useLoop();
  const { isDark, border, cardBg, mutedText, text } = theme;

  const [tempName, setTempName] = useState(profile.display_name);
  const [tempRegNo, setTempRegNo] = useState(profile.reg_no || "");
  const [tempBio, setTempBio] = useState(profile.bio || "");
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showCreator, setShowCreator] = useState(false);
  const [pastLoops, setPastLoops] = useState<any[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  React.useEffect(() => {
    setTempName(profile.display_name);
    setTempRegNo(profile.reg_no || "");
    setTempBio(profile.bio || "");
  }, [profile.display_name, profile.reg_no, profile.bio]);

  React.useEffect(() => {
    const handlePastLoops = () => {
      fetchPastLoops();
      setShowHistory(true);
    };
    const handleTerms = () => {
      setShowTerms(true);
    };
    const handleCreator = () => {
      setShowCreator(true);
    };

    window.addEventListener("open-past-loops", handlePastLoops);
    window.addEventListener("open-terms-modal", handleTerms);
    window.addEventListener("open-creator-modal", handleCreator);
    return () => {
      window.removeEventListener("open-past-loops", handlePastLoops);
      window.removeEventListener("open-terms-modal", handleTerms);
      window.removeEventListener("open-creator-modal", handleCreator);
    };
  }, [session.user.id]);

  const fetchPastLoops = async () => {
    const { data } = await supabase
      .from("loop_members")
      .select("loop_id, loops(*)")
      .eq("user_id", session.user.id)
      .eq("loops.status", "ended");
    
    if (data) {
      setPastLoops(data.map(d => d.loops).filter(Boolean));
    }
  };

  const handleSave = () => {
    updateProfile({ display_name: tempName, reg_no: tempRegNo, bio: tempBio });
    setIsEditingProfile(false);
  };

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setIsUploading(true);
      if (!event.target.files || event.target.files.length === 0) return;
      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const filePath = `${session.user.id}-${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      await updateProfile({ avatar_url: publicUrl });
      toast.success("Avatar updated!");
    } catch (error: any) {
      console.error(error);
      toast.error("Failed to upload avatar. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center pt-1 pb-1 gap-3">
      {showHistory ? (
        <div className="w-full space-y-3">
          <button onClick={() => setShowHistory(false)} className={`text-[10px] font-black uppercase tracking-wider ${mutedText} mb-2`}>
            ← Back to Profile
          </button>
          <h2 className="text-lg font-black uppercase tracking-tight mb-2">Past Loops</h2>
          {pastLoops.length === 0 && (
            <p className={`text-xs ${mutedText} text-center mt-10`}>No past loops found.</p>
          )}
          {pastLoops.map(loop => (
            <div key={loop.id} className={`p-3 ${cardBg} border ${border} rounded-[20px] space-y-1 shadow-sm`}>
              <div className="flex justify-between items-start">
                <p className={`text-[9px] font-black uppercase tracking-wider ${mutedText}`}>{loop.start_point || "Anywhere"} →</p>
                <p className={`text-[9px] font-black uppercase tracking-wider ${mutedText}`}>{new Date(loop.created_at).toLocaleDateString()}</p>
              </div>
              <h3 className="font-black text-sm uppercase tracking-tight">{loop.destination}</h3>
            </div>
          ))}
        </div>
      ) : (
      <>
      <div className="flex flex-col items-center gap-2.5 my-1">
        {/* Profile Avatar */}
        <div className="relative group cursor-pointer" onClick={() => document.getElementById("avatar-upload")?.click()}>
          <div className={`w-28 h-28 rounded-[32px] ${isDark ? "bg-zinc-900 border-white/10" : "bg-zinc-100 border-black/10"} border-2 flex items-center justify-center text-3xl font-black shadow-xl overflow-hidden shrink-0`}>
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover rounded-[28px]" />
            ) : (
              <span className="opacity-80">{profile.display_name.substring(0, 2).toUpperCase()}</span>
            )}
          </div>
          <div className="absolute inset-0 bg-black/40 rounded-[32px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            {isUploading ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Camera size={28} className="text-white" />}
          </div>
          <input 
            type="file" 
            id="avatar-upload" 
            accept="image/*" 
            className="hidden" 
            onChange={uploadAvatar}
            disabled={isUploading}
          />
        </div>

        {/* Change Photo Button */}
        <button
          onClick={() => document.getElementById("avatar-upload")?.click()}
          disabled={isUploading}
          className={`px-4 py-1.5 rounded-full ${cardBg} border ${border} text-xs font-black uppercase tracking-wider flex items-center gap-2 active:scale-95 transition-all shadow-sm`}
        >
          <Camera size={14} className="text-[#FFC554]" />
          <span>Change Photo</span>
        </button>
      </div>

      <div className="w-full space-y-2">
        <div className={`p-3.5 ${cardBg} border ${border} rounded-[24px]`}>
          <div className="flex items-center justify-between mb-3">
            <p className={`text-[10px] font-bold ${mutedText} uppercase tracking-widest`}>Identity</p>
            {isEditingProfile ? (
              <button
                onClick={handleSave}
                className="w-9 h-9 bg-[#FFC554] rounded-full flex items-center justify-center shadow-lg active:scale-90 "
              >
                <Check size={16} className="text-black" strokeWidth={3} />
              </button>
            ) : (
              <button
                onClick={() => {
                  setTempName(profile.display_name);
                  setTempRegNo(profile.reg_no || "");
                  setTempBio(profile.bio || "");
                  setIsEditingProfile(true);
                }}
                className="p-2 rounded-full active:scale-90 "
              >
                <Edit2 size={15} className="text-[#FFC554]" />
              </button>
            )}
          </div>
          <div className="flex items-start gap-4">
            <div className="flex-1 space-y-1.5">
              <p className={`text-[10px] font-black ${mutedText} uppercase tracking-wider`}>Display Name</p>
              {isEditingProfile ? (
                <input
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  className={`w-full bg-black/10 border ${border} rounded-xl px-2.5 py-1.5 text-xs font-bold outline-none focus:border-[#FFC554]`}
                  placeholder="Name"
                />
              ) : (
                <h2 className="text-base font-black tracking-tight">{profile.display_name}</h2>
              )}
            </div>
            <div className="w-28 space-y-1.5">
              <p className={`text-[10px] font-black ${mutedText} uppercase tracking-wider`}>Reg. No</p>
              {isEditingProfile ? (
                <input
                  value={tempRegNo}
                  onChange={(e) => setTempRegNo(e.target.value)}
                  className={`w-full bg-black/10 border ${border} rounded-xl px-2.5 py-1.5 text-xs font-bold outline-none focus:border-[#FFC554]`}
                  placeholder="Reg #"
                />
              ) : (
                <h2 className="text-base font-black tracking-tight">{profile.reg_no || "—"}</h2>
              )}
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-white/5 space-y-1.5">
            <p className={`text-[10px] font-black ${mutedText} uppercase tracking-wider`}>Bio</p>
            {isEditingProfile ? (
              <textarea
                value={tempBio}
                onChange={(e) => setTempBio(e.target.value)}
                rows={2}
                maxLength={120}
                className={`w-full bg-black/10 border ${border} rounded-xl p-2 text-xs font-bold outline-none focus:border-[#FFC554] resize-none`}
                placeholder="Add a short bio (e.g. CS '26 | Daily commuter)..."
              />
            ) : (
              <p className="text-xs font-bold leading-relaxed opacity-80">
                {profile.bio?.trim() ? profile.bio : <span className={mutedText}>No bio added yet.</span>}
              </p>
            )}
          </div>
        </div>

        <div className={`p-3.5 ${cardBg} border ${border} rounded-[24px] flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#FFC554]/10 flex items-center justify-center text-[#FFC554]">
              <Users size={16} strokeWidth={2.5} />
            </div>
            <div className="space-y-1">
              <p className={`text-[10px] font-black ${mutedText} uppercase tracking-wider`}>Gender</p>
              <p className="text-sm font-bold capitalize">{profile.gender || "Not set"}</p>
            </div>
          </div>
          <div className={`flex gap-1 ${isDark ? "bg-white/5" : "bg-black/5"} p-1 rounded-xl transition-colors duration-1000`}>
            {["male", "female"].map((g) => (
              <button
                key={g}
                onClick={() => updateProfile({ gender: g })}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest active:scale-90 transition-all ${profile.gender === g ? "bg-[#FFC554] text-black shadow-sm" : mutedText}`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        <div className={`p-3.5 ${cardBg} border ${border} rounded-[24px] flex items-center gap-3`}>
          <div className="w-8 h-8 rounded-xl bg-[#FFC554]/10 flex items-center justify-center text-[#FFC554]">
            <LogOut size={16} strokeWidth={2.5} className="rotate-180" />
          </div>
          <div className="space-y-1 overflow-hidden">
            <p className={`text-[10px] font-black ${mutedText} uppercase tracking-wider`}>Account</p>
            <p className="text-sm font-bold opacity-60 truncate">{session.user.email}</p>
          </div>
        </div>

        <button
          onClick={() => setView("trusted-vehicles")}
          className={`p-3.5 ${cardBg} border ${border} rounded-[24px] flex items-center justify-between w-full active:scale-[0.98] transition-transform`}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
              <ShieldCheck size={16} strokeWidth={2.5} />
            </div>
            <div className="space-y-0.5 text-left">
              <p className={`text-[10px] font-black ${mutedText} uppercase tracking-wider`}>Community</p>
              <p className={`text-xs font-bold ${text}`}>Trusted Drivers</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => setShowCreator(true)}
          className={`p-3.5 ${cardBg} border ${border} rounded-[24px] flex items-center justify-between w-full active:scale-[0.98] transition-transform`}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#FFC554]/10 flex items-center justify-center text-[#FFC554]">
              <Sparkles size={16} strokeWidth={2.5} />
            </div>
            <div className="space-y-0.5 text-left">
              <p className={`text-[10px] font-black ${mutedText} uppercase tracking-wider`}>Developer</p>
              <p className={`text-xs font-bold ${text}`}>About Creator</p>
            </div>
          </div>
        </button>

        {/* Privacy Policy */}
        <button
          onClick={() => setShowPrivacy(true)}
          className={`p-3.5 ${cardBg} border ${border} rounded-[24px] flex items-center justify-between w-full active:scale-[0.98] transition-transform`}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500">
              <FileText size={16} strokeWidth={2.5} />
            </div>
            <div className="space-y-0.5 text-left">
              <p className={`text-[10px] font-black ${mutedText} uppercase tracking-wider`}>Legal</p>
              <p className={`text-xs font-bold ${text}`}>Privacy Notice</p>
            </div>
          </div>
        </button>

        {/* Grievance Contact */}
        <a
          href="mailto:sanjaykamal001@gmail.com?subject=LOOP%20Privacy%20Concern"
          className={`p-3.5 ${cardBg} border ${border} rounded-[24px] flex items-center justify-between w-full active:scale-[0.98] transition-transform`}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500">
              <Mail size={16} strokeWidth={2.5} />
            </div>
            <div className="space-y-0.5 text-left">
              <p className={`text-[10px] font-black ${mutedText} uppercase tracking-wider`}>Grievance</p>
              <p className={`text-xs font-bold ${text}`}>Contact Us</p>
            </div>
          </div>
        </a>

        <button
          onClick={handleSignOut}
          className={`w-full py-3 ${cardBg} border ${border} rounded-[20px] text-red-500 font-black text-[10px] uppercase tracking-[0.2em] active:scale-[0.98] shadow-sm mt-2`}
        >
          Sign Out
        </button>

        {/* Delete Account */}
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className={`w-full py-3 ${cardBg} border border-red-500/20 rounded-[20px] text-red-400 font-black text-[10px] uppercase tracking-[0.2em] active:scale-[0.98] shadow-sm`}
        >
          Delete My Account
        </button>
      </div>
      </>
      )}

      <TermsModal isOpen={showTerms} onClose={() => setShowTerms(false)} />
      <CreatorModal isOpen={showCreator} onClose={() => setShowCreator(false)} />

      {/* Delete Account Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in">
          <div className={`w-full max-w-sm ${cardBg} border ${border} rounded-[28px] p-6 space-y-4 shadow-2xl`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center">
                <AlertTriangle size={20} className="text-red-500" />
              </div>
              <h3 className="text-lg font-black">Delete Account?</h3>
            </div>
            <p className={`text-xs font-bold leading-relaxed ${mutedText}`}>
              This will permanently delete your profile, all your messages, ride history, and trusted driver entries. This action cannot be undone.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className={`flex-1 py-3 ${cardBg} border ${border} rounded-2xl text-xs font-black uppercase tracking-wider active:scale-[0.98]`}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setIsDeleting(true);
                  try {
                    const userId = session.user.id;
                    // Delete user's messages
                    await supabase.from('messages').delete().eq('user_id', userId);
                    // Delete user's loop memberships
                    await supabase.from('loop_members').delete().eq('user_id', userId);
                    // Delete user's trusted vehicles
                    await supabase.from('trusted_vehicles').delete().eq('user_id', userId);
                    // Delete loops created by user
                    await supabase.from('loops').update({ status: 'cancelled' }).eq('creator_id', userId);
                    // Delete profile
                    await supabase.from('profiles').delete().eq('id', userId);
                    // Sign out (clears session)
                    await supabase.auth.signOut();
                    toast.success('Account deleted successfully.');
                  } catch (error) {
                    console.error(error);
                    toast.error('Failed to delete account. Please try again.');
                  } finally {
                    setIsDeleting(false);
                    setShowDeleteConfirm(false);
                  }
                }}
                disabled={isDeleting}
                className="flex-1 py-3 bg-red-500 text-white rounded-2xl text-xs font-black uppercase tracking-wider active:scale-[0.98] disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete Forever'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Privacy Notice Modal */}
      {showPrivacy && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className={`w-full max-w-md max-h-[85vh] ${cardBg} border ${border} rounded-[28px] p-6 flex flex-col relative shadow-2xl overflow-hidden`}>
            <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-green-500/10 text-green-500 flex items-center justify-center">
                  <FileText size={18} strokeWidth={2.5} />
                </div>
                <div>
                  <h2 className="text-base font-black uppercase tracking-tight">Privacy Notice</h2>
                  <p className={`text-[10px] font-bold ${mutedText}`}>Last Updated: August 2026</p>
                </div>
              </div>
              <button
                onClick={() => setShowPrivacy(false)}
                aria-label="Close modal"
                className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center active:scale-90"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pt-4 pr-1 text-xs leading-relaxed opacity-90 scrollbar-hide">
              {[
                { title: "1. Who We Are", content: "LOOP is a ride coordination platform for university students, created by Sanjay Kamal S (24MIC7130, VIT-AP University)." },
                { title: "2. What We Collect & Why", content: "• Email address — for account creation and login\n• Display name — so co-passengers can identify you\n• Password — stored securely by Supabase Auth (bcrypt hashed, never in plaintext)\n• Gender (optional) — used solely for the 'Girls Only' ride safety filter\n• Registration number (optional) — for campus identity verification\n• Profile picture (optional) — for visual identification in ride chats\n• Bio (optional) — short description visible to co-passengers\n• Ride data — destinations, departure times, and chat messages within loops\n• Trusted driver entries — driver names and phone numbers you share with the community" },
                { title: "3. How We Use Your Data", content: "Your data is used solely to provide LOOP's ride coordination service. We do not sell, rent, or share your personal data with advertisers or data brokers." },
                { title: "4. Third-Party Services", content: "LOOP uses Supabase (supabase.com) for authentication, database, and file storage. The app is hosted on Vercel (vercel.com). These services process your data on our behalf." },
                { title: "5. Data Retention", content: "Your data is retained as long as your account exists. You can delete your account and all associated data at any time from Profile settings." },
                { title: "6. Your Rights (DPDP Act, 2023)", content: "• Right to access your personal data (visible on your Profile page)\n• Right to correct inaccurate data (editable on your Profile page)\n• Right to erase your data (via 'Delete My Account' in Profile)\n• Right to withdraw consent (by deleting your account)\n• Right to grievance redressal (contact us below)" },
                { title: "7. Children's Data", content: "LOOP is intended for university students (18+). We do not knowingly collect data from children under 18." },
                { title: "8. Security", content: "We use encrypted connections (HTTPS), bcrypt password hashing, Row Level Security on all database tables, and JWT-based authentication." },
                { title: "9. Contact & Grievance", content: "For any privacy concerns, data requests, or grievances:\nsanjaykamal001@gmail.com" },
              ].map((section, i) => (
                <section key={i} className="space-y-1">
                  <h3 className="font-black text-sm uppercase tracking-wider text-[#FFC554]">{section.title}</h3>
                  <p className={`${mutedText} whitespace-pre-line`}>{section.content}</p>
                </section>
              ))}
            </div>

            <div className="pt-4 border-t border-white/10 shrink-0">
              <button
                onClick={() => setShowPrivacy(false)}
                className="w-full py-3 bg-[#FFC554] text-black font-black text-xs uppercase tracking-wider rounded-2xl active:scale-[0.98] shadow-md"
              >
                I Understand
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
