"use client";

import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Session } from "@supabase/supabase-js";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, Plus, ChevronLeft, Send, Users, Clock, MapPin, MessageSquare, Trash2, Sun, Moon, Edit2, Check, X } from "lucide-react";

type View = "home" | "create" | "chat-list" | "profile" | "ride-details" | "chat";

interface Loop {
  id: string;
  creator_id: string;
  destination: string;
  departure_time: string;
  participants_limit: number;
  is_female_only: boolean;
  purpose?: string;
  expires_at: string;
  member_count?: number;
}

interface Profile {
  display_name: string;
  theme: "dark" | "light";
  gender?: string;
  reg_no?: string;
}

interface Message {
  id: string;
  loop_id: string;
  user_id: string;
  content: string;
  created_at: string;
  edited_at?: string;
  profiles?: { display_name: string };
}

export default function MainApp({ session }: { session: Session }) {
  const [view, setView] = useState<View>("home");
  const [activeLoops, setActiveLoops] = useState<Loop[]>([]);
  const [selectedLoop, setSelectedLoop] = useState<Loop | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loopMembers, setLoopMembers] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [isCreatingLoop, setIsCreatingLoop] = useState(false);
  const [userJoinedLoops, setUserJoinedLoops] = useState<string[]>([]);
  const [userLoops, setUserLoops] = useState<string[]>([]);

  // Edit message state
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");

  // Profile State
  const [profile, setProfile] = useState<Profile>({ display_name: "", theme: "dark" });
  const [tempName, setTempName] = useState("");
  const [tempRegNo, setTempRegNo] = useState("");
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [showGenderSelect, setShowGenderSelect] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ type: 'create' | 'join', data?: any } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Create Loop State
  const [dest, setDest] = useState("");
  const [hour, setHour] = useState("08");
  const [minute, setMinute] = useState("45");
  const [ampm, setAmpm] = useState<"AM" | "PM">("PM");
  const [limit, setLimit] = useState(8);
  const [isFemaleOnly, setIsFemaleOnly] = useState(false);

  useEffect(() => {
    fetchProfile();
    fetchLoops();
    fetchUserMemberships();

    const loopsSubscription = supabase
      .channel("loops-channel")
      .on("postgres_changes", { event: "*", schema: "public", table: "loops" }, () => {
        fetchLoops();
      })
      .subscribe();

    return () => { supabase.removeChannel(loopsSubscription); };
  }, []);

  // Live member count + list updates when viewing ride details
  useEffect(() => {
    if (!selectedLoop) return;
    fetchLoopMembers(selectedLoop.id);

    const memberSub = supabase
      .channel(`members-${selectedLoop.id}`)
      .on("postgres_changes", {
        event: "*", schema: "public", table: "loop_members",
        filter: `loop_id=eq.${selectedLoop.id}`
      }, () => {
        fetchLoopMembers(selectedLoop.id);
        // Also refresh the loop list to update member_count
        fetchLoops();
      })
      .subscribe();

    return () => { supabase.removeChannel(memberSub); };
  }, [selectedLoop]);

  const fetchProfile = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("display_name, theme, gender, reg_no")
      .eq("id", session.user.id)
      .single();

    if (error && error.code === "PGRST116") {
      const defaultName = session.user.email?.split('@')[0] || "User";
      await supabase.from("profiles").upsert({
        id: session.user.id,
        display_name: defaultName,
        theme: "dark",
        updated_at: new Date().toISOString(),
      });
      setProfile({ display_name: defaultName, theme: "dark", gender: undefined, reg_no: "" });
      setTempName(defaultName);
      setTempRegNo("");
      return;
    }

    if (!error && data) {
      const name = data.display_name || session.user.email?.split('@')[0] || "User";
      setProfile({
        display_name: name,
        theme: (data.theme as "dark" | "light") || "dark",
        gender: data.gender,
        reg_no: data.reg_no || ""
      });
      setTempName(name);
      setTempRegNo(data.reg_no || "");
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    const { error } = await supabase
      .from("profiles")
      .upsert({ id: session.user.id, ...updates, updated_at: new Date().toISOString() }, { onConflict: "id" });

    if (error) {
      toast.error("Failed to update profile: " + error.message);
    } else {
      setProfile(prev => ({ ...prev, ...updates }));
      if (updates.display_name !== undefined || updates.reg_no !== undefined) {
        setIsEditingProfile(false);
        toast.success("Profile updated!");
      }
      if (updates.display_name) setTempName(updates.display_name);
      if (updates.reg_no !== undefined) setTempRegNo(updates.reg_no);

      if (updates.gender && pendingAction) {
        if (pendingAction.type === 'create') createLoop();
        else if (pendingAction.type === 'join' && pendingAction.data) joinLoop(pendingAction.data);
        setPendingAction(null);
        setShowGenderSelect(false);
      }
    }
  };

  const fetchLoopMembers = async (loopId: string) => {
    const { data, error } = await supabase
      .from("loop_members")
      .select("user_id, profiles:user_id (display_name, gender)")
      .eq("loop_id", loopId);

    if (!error && data) setLoopMembers(data);
  };

  const toggleTheme = () => {
    updateProfile({ theme: profile.theme === "dark" ? "light" : "dark" });
  };

  const fetchLoops = async () => {
    const { data: profileData } = await supabase
      .from("profiles").select("gender").eq("id", session.user.id).single();
    const userGender = profileData?.gender;

    const { data, error } = await supabase
      .from("loops")
      .select("*, loop_members(count)")
      .eq("status", "active")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });

    if (!error && data) {
      const filtered = data.filter(l => {
        if (l.creator_id === session.user.id) return true;
        if (l.is_female_only && userGender !== 'female') return false;
        return true;
      });
      setActiveLoops(filtered.map(l => ({ ...l, member_count: l.loop_members?.[0]?.count || 0 })));
    }
  };

  const fetchUserMemberships = async () => {
    const { data } = await supabase.from("loop_members").select("loop_id").eq("user_id", session.user.id);
    if (data) setUserJoinedLoops(data.map(m => m.loop_id));

    const { data: creatorData } = await supabase.from("loops").select("id").eq("creator_id", session.user.id);
    if (creatorData) setUserLoops(creatorData.map(l => l.id));
  };

  const handleSignOut = async () => { await supabase.auth.signOut(); };

  const createLoop = async () => {
    if (!profile.gender) { setPendingAction({ type: 'create' }); setShowGenderSelect(true); return; }
    if (!dest) return toast.error("Destination is required");
    if (isCreatingLoop) return;

    setIsCreatingLoop(true);
    const departure = new Date();
    let h = parseInt(hour);
    if (ampm === "PM" && h < 12) h += 12;
    if (ampm === "AM" && h === 12) h = 0;
    departure.setHours(h, parseInt(minute), 0, 0);
    const expiresAt = new Date(departure);
    expiresAt.setHours(expiresAt.getHours() + 2);

    try {
      const { data, error } = await supabase
        .from("loops")
        .insert({ creator_id: session.user.id, destination: dest, departure_time: departure.toISOString(), participants_limit: limit, is_female_only: isFemaleOnly, expires_at: expiresAt.toISOString() })
        .select().single();

      if (error) { toast.error(error.message); }
      else {
        await supabase.from("loop_members").insert({ loop_id: data.id, user_id: session.user.id });
        toast.success("Loop created!");
        setDest("");
        setView("home");
        fetchLoops();
        fetchUserMemberships();
      }
    } catch { toast.error("An error occurred"); }
    finally { setIsCreatingLoop(false); }
  };

  const joinLoop = async (loop: Loop) => {
    if (!profile.gender) { setPendingAction({ type: 'join', data: loop }); setShowGenderSelect(true); return; }
    setIsJoining(true);
    const { error } = await supabase.from("loop_members").insert({ loop_id: loop.id, user_id: session.user.id });
    if (error) { toast.error("Failed to join loop"); }
    else {
      toast.success("Joined loop!");
      setUserJoinedLoops(prev => [...prev, loop.id]);
      fetchLoops();
      enterChat(loop);
    }
    setIsJoining(false);
  };

  const deleteLoop = async (loopId: string) => {
    const { error } = await supabase.from("loops").update({ status: 'cancelled' }).eq('id', loopId);
    if (error) toast.error("Failed to delete loop");
    else { toast.success("Loop deleted"); setView("home"); fetchLoops(); }
  };

  const enterChat = async (loop: Loop) => {
    setSelectedLoop(loop);
    setMessages([]);
    setEditingMsgId(null);
    setView("chat");
    await fetchMessages(loop.id);
  };

  const fetchMessages = async (loopId: string) => {
    const { data, error } = await supabase
      .from("messages")
      .select("id, loop_id, user_id, content, created_at, profiles:user_id (display_name)")
      .eq("loop_id", loopId)
      .order("created_at", { ascending: true });

    if (!error && data) {
      setMessages(data as Message[]);
      requestAnimationFrame(() => messagesEndRef.current?.scrollIntoView());
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedLoop) return;
    const content = newMessage.trim();
    setNewMessage("");

    // Optimistic: add immediately so sender sees it right away
    const optimisticId = `opt-${Date.now()}`;
    const optimisticMsg: Message = {
      id: optimisticId,
      loop_id: selectedLoop.id,
      user_id: session.user.id,
      content,
      created_at: new Date().toISOString(),
      profiles: { display_name: profile.display_name },
    };
    setMessages(prev => [...prev, optimisticMsg]);
    requestAnimationFrame(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }));

    const { data: inserted, error } = await supabase
      .from("messages")
      .insert({ loop_id: selectedLoop.id, user_id: session.user.id, content })
      .select("id, loop_id, user_id, content, created_at")
      .single();

    if (error || !inserted) {
      toast.error("Failed to send message");
      setMessages(prev => prev.filter(m => m.id !== optimisticId));
      setNewMessage(content);
    } else {
      // Replace optimistic with confirmed real message (keep profile from optimistic)
      const realMsg: Message = {
        ...inserted,
        profiles: { display_name: profile.display_name },
      };
      setMessages(prev => prev.map(m => m.id === optimisticId ? realMsg : m));
    }
  };

  const startEditMessage = (msg: Message) => {
    const ageMs = Date.now() - new Date(msg.created_at).getTime();
    if (ageMs > 5 * 60 * 1000) {
      toast.error("You can only edit messages within 5 minutes of sending");
      return;
    }
    setEditingMsgId(msg.id);
    setEditingContent(msg.content);
  };

  const saveEditMessage = async () => {
    if (!editingMsgId || !editingContent.trim()) return;
    const { error } = await supabase
      .from("messages")
      .update({ content: editingContent.trim() })
      .eq("id", editingMsgId);

    if (error) { toast.error("Failed to edit message"); }
    else {
      setMessages(prev => prev.map(m =>
        m.id === editingMsgId ? { ...m, content: editingContent.trim() } : m
      ));
      setEditingMsgId(null);
      setEditingContent("");
    }
  };

  // Real-time chat subscription
  useEffect(() => {
    if (view !== "chat" || !selectedLoop) return;
    const loopId = selectedLoop.id;

    const msgSub = supabase
      .channel(`chat-${loopId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `loop_id=eq.${loopId}` },
        async (payload) => {
          // Skip if it's our own optimistic message (already shown)
          if (payload.new.user_id === session.user.id) return;
          const { data } = await supabase
            .from("messages")
            .select("id, loop_id, user_id, content, created_at, profiles:user_id (display_name)")
            .eq("id", payload.new.id)
            .single();
          if (data) {
            setMessages(prev => {
              if (prev.some(m => m.id === data.id)) return prev;
              return [...prev, data as Message];
            });
            requestAnimationFrame(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }));
          }
        })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages", filter: `loop_id=eq.${loopId}` },
        (payload) => {
          setMessages(prev => prev.map(m => m.id === payload.new.id ? { ...m, ...payload.new } : m));
        })
      .subscribe();

    return () => { supabase.removeChannel(msgSub); };
  }, [view, selectedLoop]);

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const isDark = profile.theme === "dark";
  const bg = isDark ? "bg-[#000000]" : "bg-[#FFFFFF]";
  const text = isDark ? "text-white" : "text-[#18181B]";
  const border = isDark ? "border-[#27272A]" : "border-[#D4D4D8]";
  const cardBg = isDark ? "bg-[#121212]" : "bg-[#F4F4F5]";
  const mutedText = isDark ? "text-[#A1A1AA]" : "text-[#52525B]";

  return (
    <div className={`flex flex-col h-[100dvh] max-w-md mx-auto ${bg} ${text} relative overflow-hidden font-sans`}>
      <div className={`dot-matrix-bg ${isDark ? 'text-white' : 'text-black'}`} />

      {/* Header */}
      <header className="px-5 py-4 shrink-0 relative z-10 flex items-center justify-between">
        {view === "home" && (
          <div className="pt-2">
            <h1 className="text-3xl font-black tracking-tighter leading-none">LOOP</h1>
            <p className="text-xs font-medium opacity-50 mt-1">Rides go better in Loop.</p>
          </div>
        )}
        {(view === "create" || view === "ride-details" || view === "chat") && (
          <div className="flex items-center justify-between w-full pt-2">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setView(view === "chat" ? "chat-list" : "home")}
                className={`w-10 h-10 rounded-full border ${border} flex items-center justify-center ${cardBg} active:scale-90 transition-transform shadow-sm`}
              >
                <ChevronLeft size={20} />
              </button>
              <h1 className="text-2xl font-bold tracking-tight">
                {view === "create" ? "New Loop" : view === "chat" ? selectedLoop?.destination : "Ride Details"}
              </h1>
            </div>
            {view === "create" && (
              <button onClick={() => setView("home")} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center active:scale-90 transition-transform">
                <Plus size={20} className="rotate-45" />
              </button>
            )}
          </div>
        )}
        {view === "chat-list" && (
          <div className="pt-2">
            <h1 className="text-3xl font-bold tracking-tight">Chats</h1>
            <p className="text-xs font-medium opacity-50 mt-1">Your active conversations</p>
          </div>
        )}
        {view === "profile" && (
          <div className="flex items-center justify-between w-full pt-2">
            <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
            <button onClick={toggleTheme} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center active:scale-90 transition-transform">
              {isDark ? <Sun size={18} className="text-[#FFC554]" /> : <Moon size={18} />}
            </button>
          </div>
        )}
      </header>

      {/* Main content — chat gets its own full-height container, others scroll normally */}
      {view === "chat" && selectedLoop ? (
        <div className="flex-1 flex flex-col relative z-10 overflow-hidden">
          {/* Messages scroll area */}
          <div ref={chatScrollRef} className="flex-1 overflow-y-auto px-4 py-2 scrollbar-hide space-y-1 pb-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className={`w-14 h-14 rounded-full ${cardBg} border ${border} flex items-center justify-center mb-3`}>
                  <Send size={22} className="opacity-20 -rotate-12" />
                </div>
                <p className={`text-xs font-black ${mutedText} uppercase tracking-widest`}>No messages yet</p>
                <p className={`text-[10px] ${mutedText} opacity-50 mt-1`}>Be the first to say hi!</p>
              </div>
            ) : (
              messages.map((msg, idx) => {
                const isMe = msg.user_id === session.user.id;
                const showSender = idx === 0 || messages[idx - 1]?.user_id !== msg.user_id;
                const isEditing = editingMsgId === msg.id;
                const isOptimistic = msg.id.startsWith("opt-");

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} ${showSender ? 'mt-4' : 'mt-0.5'}`}
                  >
                    {showSender && (
                      <p className={`text-[10px] font-semibold mb-1 px-1 ${isMe ? 'text-[#FFC554]' : mutedText}`}>
                        {isMe ? "You" : msg.profiles?.display_name || "Member"}
                      </p>
                    )}

                    {isEditing ? (
                      <div className={`w-full max-w-[85%] ${cardBg} border ${border} rounded-[18px] p-2 flex gap-2 items-center`}>
                        <input
                          autoFocus
                          value={editingContent}
                          onChange={e => setEditingContent(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') saveEditMessage(); if (e.key === 'Escape') setEditingMsgId(null); }}
                          className="flex-1 bg-transparent text-[13px] font-medium outline-none"
                        />
                        <button onClick={saveEditMessage} className="w-7 h-7 rounded-lg bg-[#FFC554] text-black flex items-center justify-center shrink-0 active:scale-90">
                          <Check size={13} strokeWidth={3} />
                        </button>
                        <button onClick={() => setEditingMsgId(null)} className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center shrink-0 active:scale-90">
                          <X size={13} />
                        </button>
                      </div>
                    ) : (
                      <div
                        className={`relative max-w-[80%] group`}
                        onDoubleClick={() => isMe && !isOptimistic && startEditMessage(msg)}
                      >
                        <div className={`px-4 py-2.5 text-[13px] font-medium shadow-sm ${
                          isMe
                            ? `bg-[#FFC554] text-black rounded-[18px] rounded-tr-[4px] ${isOptimistic ? 'opacity-60' : ''}`
                            : `${cardBg} border ${border} ${text} rounded-[18px] rounded-tl-[4px]`
                        }`}>
                          {msg.content}
                        </div>
                        {/* Edit button — only on my messages, visible on press/focus */}
                        {isMe && !isOptimistic && (
                          <button
                            onClick={() => startEditMessage(msg)}
                            className="absolute -left-7 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white/10 flex items-center justify-center opacity-0 group-focus-within:opacity-100 active:opacity-100"
                            style={{ WebkitTapHighlightColor: 'transparent' }}
                            onFocus={e => e.currentTarget.parentElement?.classList.add('focused')}
                          >
                            <Edit2 size={10} />
                          </button>
                        )}
                      </div>
                    )}

                    <p className={`text-[9px] ${mutedText} opacity-40 mt-0.5 px-1`}>
                      {formatTime(msg.created_at)}
                    </p>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message input */}
          <div className="shrink-0 px-4 pb-5 pt-2">
            <div className={`${cardBg} border ${border} rounded-[24px] p-1.5 flex gap-2 shadow-xl items-center`}>
              <input
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                placeholder="Message..."
                className="flex-1 bg-transparent px-4 text-sm font-medium outline-none"
              />
              <button
                onClick={sendMessage}
                disabled={!newMessage.trim()}
                className="w-10 h-10 bg-[#FFC554] text-black rounded-[16px] flex items-center justify-center active:scale-90 transition-transform shrink-0 disabled:opacity-40"
              >
                <Send size={15} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.main
            key={view}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="flex-1 overflow-y-auto relative z-10 px-5 scrollbar-hide pb-28"
          >
            {/* HOME */}
            {view === "home" && (
              <div className="space-y-2.5 pt-1">
                {activeLoops.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-[55vh] text-center opacity-40">
                    <MapPin size={36} strokeWidth={1.5} />
                    <p className="text-xs font-black uppercase tracking-[0.2em] mt-3">No Active Loops</p>
                  </div>
                ) : (
                  activeLoops.map(loop => (
                    <motion.div
                      key={loop.id}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => { setSelectedLoop(loop); setView("ride-details"); }}
                      className={`p-4 ${cardBg} border ${border} rounded-[28px] space-y-3 shadow-sm cursor-pointer`}
                    >
                      <div className="flex justify-between items-start">
                        <h3 className="font-black text-sm uppercase tracking-tight truncate flex-1 mr-4">{loop.destination}</h3>
                        <div className="px-3 py-1.5 bg-[#FFC554]/10 rounded-xl text-sm font-black text-[#FFC554] flex items-center gap-1.5">
                          <Clock size={14} strokeWidth={3} /> {formatTime(loop.departure_time)}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className={`flex items-center gap-1 text-[10px] font-bold ${mutedText} opacity-60`}>
                          <Users size={12} strokeWidth={2.5} /> {loop.member_count}/{loop.participants_limit}
                        </div>
                        {loop.is_female_only && (
                          <div className="px-2.5 py-1 bg-pink-500/10 rounded-full text-[9px] font-black text-pink-500 uppercase tracking-[0.15em] border border-pink-500/20 flex items-center gap-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-pink-500" />
                            Female Only
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            )}

            {/* CREATE */}
            {view === "create" && (
              <div className="space-y-4 pt-1">
                <div className="space-y-1.5">
                  <label className={`text-[10px] uppercase font-black ${mutedText} tracking-[0.15em] ml-1`}>Destination</label>
                  <input
                    value={dest}
                    onChange={e => setDest(e.target.value)}
                    placeholder="Where to?"
                    className={`w-full h-12 ${cardBg} border ${border} rounded-[20px] px-5 text-sm font-bold outline-none focus:border-[#FFC554] transition-colors`}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className={`text-[10px] uppercase font-black ${mutedText} tracking-[0.15em] ml-1`}>Departure Time</label>
                  <div className={`${cardBg} border ${border} rounded-[24px] p-3 flex items-center justify-between`}>
                    <div className="flex items-center gap-2">
                      <input type="text" value={hour} onChange={e => setHour(e.target.value.slice(0, 2))}
                        className={`w-10 h-10 ${bg} border ${border} rounded-xl text-center font-black text-base outline-none focus:border-[#FFC554]`} />
                      <span className="font-black text-[#FFC554] text-lg">:</span>
                      <input type="text" value={minute} onChange={e => setMinute(e.target.value.slice(0, 2))}
                        className={`w-10 h-10 ${bg} border ${border} rounded-xl text-center font-black text-base outline-none focus:border-[#FFC554]`} />
                    </div>
                    <div className={`flex ${bg} p-1 rounded-xl border ${border}`}>
                      {(["AM", "PM"] as const).map(p => (
                        <button key={p} onClick={() => setAmpm(p)}
                          className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all ${ampm === p ? 'bg-[#FFC554] text-black shadow-md' : mutedText}`}>
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className={`text-[10px] uppercase font-black ${mutedText} tracking-[0.15em] ml-1`}>Available Seats</label>
                  <div className="space-y-1.5">
                    <div className="flex gap-1.5">
                      {[2, 3, 4, 5, 6].map(n => (
                        <motion.button key={n} whileTap={{ scale: 0.95 }} onClick={() => setLimit(n)}
                          className={`flex-1 h-10 rounded-xl border font-black text-sm active:scale-95 transition-all ${limit === n ? 'bg-[#FFC554] border-[#FFC554] text-black shadow-md' : `${border} ${cardBg} ${mutedText}`}`}>
                          {n}
                        </motion.button>
                      ))}
                    </div>
                    <div className="flex gap-1.5 px-4">
                      {[7, 8, 9, 10].map(n => (
                        <motion.button key={n} whileTap={{ scale: 0.95 }} onClick={() => setLimit(n)}
                          className={`flex-1 h-10 rounded-xl border font-black text-sm active:scale-95 transition-all ${limit === n ? 'bg-[#FFC554] border-[#FFC554] text-black shadow-md' : `${border} ${cardBg} ${mutedText}`}`}>
                          {n}
                        </motion.button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className={`flex items-center justify-between p-4 ${cardBg} border ${border} rounded-[28px] ${isFemaleOnly ? 'border-pink-500/50' : ''}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${isFemaleOnly ? 'bg-pink-500 text-white' : 'bg-white/5 text-white/40'}`}>
                      <Users size={22} strokeWidth={2.5} />
                    </div>
                    <div>
                      <span className="text-sm font-black tracking-tight uppercase">Female Only</span>
                      <p className={`text-[10px] font-bold ${mutedText}`}>Visible to women only</p>
                    </div>
                  </div>
                  <button onClick={() => setIsFemaleOnly(!isFemaleOnly)}
                    className={`w-14 h-7 rounded-full relative transition-all duration-300 ${isFemaleOnly ? 'bg-pink-500' : isDark ? 'bg-zinc-800' : 'bg-zinc-200'}`}>
                    <motion.div animate={{ x: isFemaleOnly ? 28 : 3 }} className="absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-md" />
                  </button>
                </div>

                <button onClick={createLoop} disabled={isCreatingLoop}
                  className="w-full h-12 bg-[#FFC554] text-black font-black rounded-[22px] text-[11px] uppercase tracking-[0.2em] shadow-lg active:scale-[0.98] transition-transform disabled:opacity-50">
                  {isCreatingLoop ? "Creating..." : "Create Loop"}
                </button>
              </div>
            )}

            {/* CHAT LIST */}
            {view === "chat-list" && (
              <div className="space-y-2.5 pt-1">
                {activeLoops.filter(l => userJoinedLoops.includes(l.id)).length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-[55vh] opacity-30">
                    <MessageSquare size={36} strokeWidth={1.5} />
                    <p className="text-xs font-black uppercase tracking-[0.2em] mt-3">No Active Chats</p>
                  </div>
                ) : (
                  activeLoops.filter(l => userJoinedLoops.includes(l.id)).map(loop => (
                    <motion.div key={loop.id} whileTap={{ scale: 0.98 }} onClick={() => enterChat(loop)}
                      className={`p-4 ${cardBg} border ${border} rounded-[28px] shadow-sm cursor-pointer`}>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-[#FFC554]/10 flex items-center justify-center text-[#FFC554]">
                            <MessageSquare size={18} strokeWidth={2.5} />
                          </div>
                          <div>
                            <h3 className="font-black text-sm uppercase tracking-tight">{loop.destination}</h3>
                            <p className={`text-[10px] font-medium ${mutedText} mt-0.5`}>{formatTime(loop.departure_time)}</p>
                          </div>
                        </div>
                        <ChevronLeft size={16} className="rotate-180 opacity-20" />
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            )}

            {/* PROFILE */}
            {view === "profile" && (
              <div className="flex flex-col items-center pt-4 pb-2 gap-5">
                <div className="w-20 h-20 rounded-[28px] bg-[#FFC554] flex items-center justify-center text-black text-2xl font-black shadow-xl shrink-0">
                  {profile.display_name.substring(0, 2).toUpperCase()}
                </div>

                <div className="w-full space-y-3">
                  <div className={`p-5 ${cardBg} border ${border} rounded-[28px]`}>
                    <div className="flex items-center justify-between mb-4">
                      <p className={`text-xs font-bold ${mutedText} uppercase tracking-widest`}>Identity</p>
                      {isEditingProfile ? (
                        <button onClick={() => updateProfile({ display_name: tempName, reg_no: tempRegNo })}
                          className="w-9 h-9 bg-[#FFC554] rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform">
                          <Check size={16} className="text-black" strokeWidth={3} />
                        </button>
                      ) : (
                        <button onClick={() => setIsEditingProfile(true)} className="p-2 rounded-full active:scale-90 transition-transform">
                          <Edit2 size={15} className="text-[#FFC554]" />
                        </button>
                      )}
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="flex-1 space-y-1.5">
                        <p className={`text-[10px] font-black ${mutedText} uppercase tracking-wider`}>Display Name</p>
                        {isEditingProfile ? (
                          <input value={tempName} onChange={e => setTempName(e.target.value)}
                            className={`w-full bg-black/10 border ${border} rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-[#FFC554]`} placeholder="Name" />
                        ) : (
                          <h2 className="text-xl font-black tracking-tight">{profile.display_name}</h2>
                        )}
                      </div>
                      <div className="w-32 space-y-1.5">
                        <p className={`text-[10px] font-black ${mutedText} uppercase tracking-wider`}>Reg. No</p>
                        {isEditingProfile ? (
                          <input value={tempRegNo} onChange={e => setTempRegNo(e.target.value)}
                            className={`w-full bg-black/10 border ${border} rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-[#FFC554]`} placeholder="Reg #" />
                        ) : (
                          <h2 className="text-xl font-black tracking-tight">{profile.reg_no || "—"}</h2>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className={`p-5 ${cardBg} border ${border} rounded-[28px] flex items-center justify-between`}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#FFC554]/10 flex items-center justify-center text-[#FFC554]">
                        <Users size={20} strokeWidth={2.5} />
                      </div>
                      <div className="space-y-1">
                        <p className={`text-[10px] font-black ${mutedText} uppercase tracking-wider`}>Gender</p>
                        <p className="text-sm font-bold capitalize">{profile.gender || 'Not set'}</p>
                      </div>
                    </div>
                    <div className={`flex gap-1 ${isDark ? 'bg-white/5' : 'bg-black/5'} p-1 rounded-xl`}>
                      {['male', 'female'].map(g => (
                        <button key={g} onClick={() => updateProfile({ gender: g })}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest active:scale-90 transition-all ${profile.gender === g ? 'bg-[#FFC554] text-black shadow-sm' : mutedText}`}>
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className={`p-5 ${cardBg} border ${border} rounded-[28px] flex items-center gap-3`}>
                    <div className="w-10 h-10 rounded-xl bg-[#FFC554]/10 flex items-center justify-center text-[#FFC554]">
                      <LogOut size={18} strokeWidth={2.5} className="rotate-180" />
                    </div>
                    <div className="space-y-1 overflow-hidden">
                      <p className={`text-[10px] font-black ${mutedText} uppercase tracking-wider`}>Account</p>
                      <p className="text-sm font-bold opacity-60 truncate">{session.user.email}</p>
                    </div>
                  </div>

                  <button onClick={handleSignOut}
                    className={`w-full py-4 ${cardBg} border ${border} rounded-[22px] text-red-500 font-black text-xs uppercase tracking-[0.2em] active:scale-[0.98] transition-transform shadow-sm`}>
                    Sign Out
                  </button>
                </div>
              </div>
            )}

            {/* RIDE DETAILS */}
            {view === "ride-details" && selectedLoop && (
              <div className="space-y-2.5 pt-1">
                <div className={`p-4 ${cardBg} border ${border} rounded-[28px] flex items-center gap-4`}>
                  <div className="w-9 h-9 rounded-xl bg-[#FFC554]/10 flex items-center justify-center text-[#FFC554]">
                    <MapPin size={18} strokeWidth={2.5} />
                  </div>
                  <div>
                    <p className={`text-[10px] font-black ${mutedText} uppercase tracking-wider`}>Destination</p>
                    <h3 className="font-black text-base uppercase tracking-tight">{selectedLoop.destination}</h3>
                  </div>
                </div>

                <div className={`p-4 ${cardBg} border ${border} rounded-[28px] flex items-center gap-4`}>
                  <div className="w-9 h-9 rounded-xl bg-[#FFC554]/10 flex items-center justify-center text-[#FFC554]">
                    <Clock size={18} strokeWidth={2.5} />
                  </div>
                  <div>
                    <p className={`text-[10px] font-black ${mutedText} uppercase tracking-wider`}>Departure</p>
                    <h3 className="font-black text-xl text-[#FFC554]">{formatTime(selectedLoop.departure_time)}</h3>
                  </div>
                </div>

                {/* Passengers — live updating, no legend, no "waiting" placeholder */}
                <div className={`p-4 ${cardBg} border ${border} rounded-[28px] space-y-3`}>
                  <div className="flex items-center justify-between">
                    <p className={`text-[10px] font-black ${mutedText} uppercase tracking-wider`}>Passengers</p>
                    <span className={`text-xs font-black text-[#FFC554]`}>
                      {loopMembers.length}/{selectedLoop.participants_limit}
                    </span>
                  </div>
                  {loopMembers.length > 0 && (
                    <div className="space-y-2">
                      {loopMembers.map((member, i) => (
                        <div key={member.user_id || i} className={`flex items-center justify-between px-3 py-2.5 ${bg} border ${border} rounded-2xl`}>
                          <div className="flex items-center gap-3">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-black ${member.profiles?.gender === 'female' ? 'bg-pink-500/15 text-pink-400' : 'bg-blue-500/15 text-blue-400'}`}>
                              {(member.profiles?.display_name || 'M').substring(0, 1).toUpperCase()}
                            </div>
                            <span className="text-sm font-bold">{member.profiles?.display_name || 'Member'}</span>
                          </div>
                          <span className={`text-[10px] font-black ${mutedText} capitalize`}>
                            {member.profiles?.gender || '—'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2 pt-1">
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => userJoinedLoops.includes(selectedLoop.id) ? enterChat(selectedLoop) : joinLoop(selectedLoop)}
                    disabled={isJoining}
                    className="w-full h-12 bg-[#FFC554] text-black font-black rounded-[22px] text-[11px] uppercase tracking-[0.2em] shadow-lg disabled:opacity-50 active:scale-[0.98] transition-transform"
                  >
                    {userJoinedLoops.includes(selectedLoop.id) ? "Open Chat" : "Join Loop"}
                  </motion.button>

                  {userLoops.includes(selectedLoop.id) && (
                    <button onClick={() => deleteLoop(selectedLoop.id)}
                      className={`w-full h-10 ${cardBg} border border-red-500/20 text-red-500 rounded-[20px] text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 active:scale-[0.98] transition-transform`}>
                      <Trash2 size={13} /> Delete Loop
                    </button>
                  )}
                </div>
              </div>
            )}
          </motion.main>
        </AnimatePresence>
      )}

      {/* Bottom Navigation */}
      {view !== "chat" && view !== "ride-details" && (
        <nav className={`absolute bottom-0 left-0 right-0 ${bg} border-t ${border} flex items-center justify-around px-2 z-20 pb-5 pt-3`}>
          {([
            { v: "home", icon: <MapPin size={24} className={view === "home" ? 'fill-[#FFC554]/20' : ''} strokeWidth={view === "home" ? 3 : 2} />, label: "Home" },
            { v: "create", icon: <Plus size={24} strokeWidth={view === "create" ? 4 : 2.5} />, label: "Create" },
            { v: "chat-list", icon: <MessageSquare size={24} className={view === "chat-list" ? 'fill-[#FFC554]/20' : ''} strokeWidth={view === "chat-list" ? 3 : 2} />, label: "Chat" },
            { v: "profile", icon: <Users size={24} className={view === "profile" ? 'fill-[#FFC554]/20' : ''} strokeWidth={view === "profile" ? 3 : 2} />, label: "Profile" },
          ] as { v: View; icon: React.ReactNode; label: string }[]).map(({ v, icon, label }) => (
            <button key={v} onClick={() => setView(v)}
              className={`flex flex-col items-center gap-1.5 active:scale-90 transition-transform flex-1 py-1 ${view === v ? 'text-[#FFC554]' : mutedText}`}>
              {icon}
              <span className={`text-[11px] font-bold tracking-tight ${view === v ? 'opacity-100' : 'opacity-50'}`}>{label}</span>
            </button>
          ))}
        </nav>
      )}

      {/* Gender Selection Modal */}
      <AnimatePresence>
        {showGenderSelect && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xl flex items-center justify-center p-6">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
              className={`${cardBg} border ${border} rounded-[40px] p-8 w-full max-w-sm space-y-8 shadow-2xl`}>
              <div className="space-y-2 text-center">
                <div className="w-16 h-16 bg-[#FFC554]/10 rounded-[24px] flex items-center justify-center text-[#FFC554] mx-auto mb-4">
                  <Users size={32} strokeWidth={2.5} />
                </div>
                <h2 className="text-2xl font-black tracking-tight">Select Gender</h2>
                <p className={`text-[10px] font-bold ${mutedText} uppercase tracking-[0.2em]`}>Required to continue</p>
              </div>
              <div className="grid grid-cols-1 gap-4">
                {['male', 'female'].map(g => (
                  <motion.button key={g} whileTap={{ scale: 0.98 }} onClick={() => updateProfile({ gender: g })}
                    className={`w-full h-14 rounded-[24px] border-2 font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 active:scale-[0.97] transition-all ${profile.gender === g ? 'bg-[#FFC554] border-[#FFC554] text-black' : `${border} ${bg} ${mutedText}`}`}>
                    <div className={`w-2 h-2 rounded-full ${g === 'female' ? 'bg-pink-500' : 'bg-blue-500'}`} />
                    {g}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
