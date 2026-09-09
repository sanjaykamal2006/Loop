"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Users,
  Clock,
  MapPin,
  Search,
  ChevronRight,
  ShieldCheck,
  Send,
  Navigation,
  Plus,
  ArrowLeft,
  Share2,
  Calendar,
  Sparkles,
  Coffee,
  Heart,
  CarFront,
} from "lucide-react";
import {
  AutoRickshawIcon,
  ShareAutoIcon,
  MotorcycleIcon,
  CarIcon,
  SteeringWheelIcon,
} from "@/components/ui/VehicleIcons";

function ScreenshotContent() {
  const searchParams = useSearchParams();
  const screen = searchParams.get("screen") || "1";
  const isDarkParam = searchParams.get("dark");
  const isDark = isDarkParam === "true" || screen === "6" || screen === "1" || screen === "2" || screen === "3" || screen === "4" || screen === "5";

  return (
    <div
      style={{ width: "1080px", height: "1920px" }}
      className={`relative overflow-hidden font-sans select-none flex flex-col justify-between ${
        isDark ? "bg-[#000000] text-white" : "bg-[#F2EFE9] text-black"
      }`}
    >
      {/* Background Dot Matrix */}
      <div className={`dot-matrix-bg ${isDark ? "text-white" : "text-black"}`} />

      {/* Screen 1: Home Screen (Active Rides) */}
      {screen === "1" && (
        <div className="relative z-10 flex flex-col h-full justify-between p-12">
          {/* Top Header */}
          <div className="space-y-6">
            <div className="flex items-center justify-between pt-6">
              <div className="flex items-center gap-3">
                <h1 className="text-6xl font-black tracking-tighter text-white">LOOP</h1>
                <div className="w-3.5 h-3.5 rounded-full bg-[#FFC554] animate-pulse" />
              </div>
              <div className="flex items-center gap-3">
                <div className="px-5 py-2.5 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-bold text-zinc-300 flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  <span>VIT-AP CAMPUS</span>
                </div>
              </div>
            </div>

            {/* Search Bar */}
            <div className="p-5 rounded-[28px] bg-zinc-900/80 border border-zinc-800 flex items-center gap-4 text-zinc-400">
              <Search size={28} className="text-[#FFC554]" />
              <span className="text-2xl font-medium text-zinc-400">Search destination or train/flight...</span>
            </div>

            {/* Section Title */}
            <div className="flex items-center justify-between pt-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold uppercase tracking-wider text-zinc-400">Active Rides</span>
                <span className="px-3 py-1 rounded-full bg-[#FFC554]/15 text-[#FFC554] font-mono text-sm font-bold">
                  8 Live
                </span>
              </div>
              <span className="text-zinc-500 text-sm">Tap to join group</span>
            </div>

            {/* Rides List */}
            <div className="space-y-4 pt-2">
              {/* Card 1 */}
              <div className="p-6 rounded-[32px] bg-zinc-900/70 border border-zinc-800 flex items-center justify-between shadow-xl">
                <div className="flex items-center gap-5">
                  <div className="w-20 h-20 rounded-[24px] bg-[#FFC554]/10 border border-[#FFC554]/20 flex items-center justify-center text-[#FFC554]">
                    <AutoRickshawIcon size={44} strokeWidth={2.2} />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-black text-white">Campus</span>
                      <span className="text-xl font-bold text-[#FFC554]">→</span>
                      <span className="text-2xl font-black text-white">Vijayawada Rly Station</span>
                    </div>
                    <div className="flex items-center gap-4 text-zinc-400 text-sm">
                      <span className="flex items-center gap-1.5 text-zinc-300">
                        <Clock size={16} className="text-[#FFC554]" /> Today • 4:30 PM
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1.5 text-zinc-300">
                        <Users size={16} className="text-[#FFC554]" /> 3 of 4 Seats Filled
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="px-3.5 py-1.5 rounded-full bg-[#FFC554]/15 border border-[#FFC554]/30 text-[#FFC554] text-xs font-black uppercase tracking-wider">
                    Joined
                  </span>
                  <span className="text-lg font-bold text-white">₹75 <span className="text-xs text-zinc-400 font-normal">/seat</span></span>
                </div>
              </div>

              {/* Card 2 */}
              <div className="p-6 rounded-[32px] bg-zinc-900/70 border border-zinc-800 flex items-center justify-between shadow-xl">
                <div className="flex items-center gap-5">
                  <div className="w-20 h-20 rounded-[24px] bg-white/5 border border-white/10 flex items-center justify-center text-[#FFC554]">
                    <ShareAutoIcon size={44} strokeWidth={2.2} />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-black text-white">Campus</span>
                      <span className="text-xl font-bold text-[#FFC554]">→</span>
                      <span className="text-2xl font-black text-white">PNBS Bus Stand</span>
                    </div>
                    <div className="flex items-center gap-4 text-zinc-400 text-sm">
                      <span className="flex items-center gap-1.5 text-zinc-300">
                        <Clock size={16} className="text-[#FFC554]" /> Today • 5:15 PM
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1.5 text-zinc-300">
                        <Users size={16} className="text-[#FFC554]" /> 5 of 6 Seats Filled
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="px-3.5 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-black uppercase tracking-wider">
                    Fast Fill
                  </span>
                  <span className="text-lg font-bold text-white">₹40 <span className="text-xs text-zinc-400 font-normal">/seat</span></span>
                </div>
              </div>

              {/* Card 3 - Female Only */}
              <div className="p-6 rounded-[32px] bg-zinc-900/70 border border-pink-500/30 flex items-center justify-between shadow-xl">
                <div className="flex items-center gap-5">
                  <div className="w-20 h-20 rounded-[24px] bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400">
                    <CarIcon size={44} strokeWidth={2.2} />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-black text-white">Campus</span>
                      <span className="text-xl font-bold text-pink-400">→</span>
                      <span className="text-2xl font-black text-white">PVP Square Mall</span>
                    </div>
                    <div className="flex items-center gap-4 text-zinc-400 text-sm">
                      <span className="flex items-center gap-1.5 text-zinc-300">
                        <Clock size={16} className="text-pink-400" /> Tomorrow • 2:00 PM
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1.5 text-zinc-300">
                        <Users size={16} className="text-pink-400" /> 2 of 4 Seats
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="px-3.5 py-1.5 rounded-full bg-pink-500/15 border border-pink-500/30 text-pink-400 text-xs font-black uppercase tracking-wider">
                    Girls Only
                  </span>
                  <span className="text-lg font-bold text-white">₹120 <span className="text-xs text-zinc-400 font-normal">/seat</span></span>
                </div>
              </div>

              {/* Card 4 - Airport Run */}
              <div className="p-6 rounded-[32px] bg-zinc-900/70 border border-zinc-800 flex items-center justify-between shadow-xl">
                <div className="flex items-center gap-5">
                  <div className="w-20 h-20 rounded-[24px] bg-white/5 border border-white/10 flex items-center justify-center text-[#FFC554]">
                    <CarIcon size={44} strokeWidth={2.2} />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-black text-white">Campus</span>
                      <span className="text-xl font-bold text-[#FFC554]">→</span>
                      <span className="text-2xl font-black text-white">RGIA Hyderabad Airport</span>
                    </div>
                    <div className="flex items-center gap-4 text-zinc-400 text-sm">
                      <span className="flex items-center gap-1.5 text-zinc-300">
                        <Clock size={16} className="text-[#FFC554]" /> Friday • 9:00 PM
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1.5 text-zinc-300">
                        <Users size={16} className="text-[#FFC554]" /> 3 of 4 Seats
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="px-3.5 py-1.5 rounded-full bg-zinc-800 text-zinc-300 text-xs font-bold">
                    Cab Pool
                  </span>
                  <span className="text-lg font-bold text-white">₹850 <span className="text-xs text-zinc-400 font-normal">/seat</span></span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Navigation */}
          <div className="p-4 rounded-[36px] bg-zinc-900/90 border border-zinc-800 backdrop-blur-xl flex items-center justify-around">
            <div className="flex flex-col items-center gap-1 text-[#FFC554]">
              <div className="w-12 h-12 rounded-2xl bg-[#FFC554]/20 flex items-center justify-center">
                <CarFront size={26} />
              </div>
              <span className="text-xs font-bold tracking-wider uppercase">Home</span>
            </div>
            <div className="flex flex-col items-center gap-1 text-zinc-400">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center">
                <Plus size={26} />
              </div>
              <span className="text-xs font-medium tracking-wider uppercase">Create</span>
            </div>
            <div className="flex flex-col items-center gap-1 text-zinc-400">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center">
                <Navigation size={26} />
              </div>
              <span className="text-xs font-medium tracking-wider uppercase">Chats</span>
            </div>
            <div className="flex flex-col items-center gap-1 text-zinc-400">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center">
                <Users size={26} />
              </div>
              <span className="text-xs font-medium tracking-wider uppercase">Profile</span>
            </div>
          </div>
        </div>
      )}

      {/* Screen 2: Create Ride Form */}
      {screen === "2" && (
        <div className="relative z-10 flex flex-col h-full justify-between p-12">
          <div className="space-y-6 pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300">
                  <ArrowLeft size={24} />
                </div>
                <h1 className="text-4xl font-extrabold text-white">Create a Loop</h1>
              </div>
              <span className="text-xs font-mono text-[#FFC554] bg-[#FFC554]/10 border border-[#FFC554]/20 px-3 py-1.5 rounded-full font-bold">
                CAMPUS POOL
              </span>
            </div>

            {/* Form Fields */}
            <div className="space-y-5 pt-2">
              {/* Pickup & Destination */}
              <div className="p-6 rounded-[32px] bg-zinc-900/80 border border-zinc-800 space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 block mb-2">Pickup Point</label>
                  <div className="p-4 rounded-2xl bg-black border border-zinc-800 flex items-center gap-3 text-white text-xl font-bold">
                    <MapPin size={22} className="text-[#FFC554]" />
                    <span>VIT-AP Main Gate (Arch)</span>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 block mb-2">Destination</label>
                  <div className="p-4 rounded-2xl bg-black border border-zinc-800 flex items-center gap-3 text-white text-xl font-bold">
                    <Navigation size={22} className="text-[#FFC554]" />
                    <span>Vijayawada Railway Station (BZA)</span>
                  </div>
                </div>
              </div>

              {/* Vehicle Selection */}
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 block">Select Vehicle Type</label>
                <div className="grid grid-cols-4 gap-3">
                  <div className="p-4 rounded-2xl bg-[#FFC554] text-black border border-[#FFC554] flex flex-col items-center gap-2 font-bold shadow-lg shadow-[#FFC554]/20">
                    <AutoRickshawIcon size={32} strokeWidth={2.4} />
                    <span className="text-xs">Auto</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-zinc-900 text-zinc-300 border border-zinc-800 flex flex-col items-center gap-2 font-medium">
                    <ShareAutoIcon size={32} strokeWidth={2} />
                    <span className="text-xs">Share Auto</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-zinc-900 text-zinc-300 border border-zinc-800 flex flex-col items-center gap-2 font-medium">
                    <CarIcon size={32} strokeWidth={2} />
                    <span className="text-xs">Cab</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-zinc-900 text-zinc-300 border border-zinc-800 flex flex-col items-center gap-2 font-medium">
                    <MotorcycleIcon size={32} strokeWidth={2} />
                    <span className="text-xs">Bike</span>
                  </div>
                </div>
              </div>

              {/* Departure Time & Seats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-5 rounded-[28px] bg-zinc-900/80 border border-zinc-800 space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 block">Departure</label>
                  <div className="flex items-center gap-2 text-xl font-bold text-white">
                    <Clock size={20} className="text-[#FFC554]" />
                    <span>Today, 5:00 PM</span>
                  </div>
                </div>
                <div className="p-5 rounded-[28px] bg-zinc-900/80 border border-zinc-800 space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 block">Available Seats</label>
                  <div className="flex items-center gap-2 text-xl font-bold text-white">
                    <Users size={20} className="text-[#FFC554]" />
                    <span>3 Seats</span>
                  </div>
                </div>
              </div>

              {/* Female Only Toggle */}
              <div className="p-5 rounded-[28px] bg-pink-500/10 border border-pink-500/20 flex items-center justify-between">
                <div>
                  <span className="font-bold text-base text-pink-300 block">Girls Only Ride</span>
                  <span className="text-xs text-zinc-400">Only verified female students can view & join</span>
                </div>
                <div className="w-14 h-8 rounded-full bg-pink-500 flex items-center justify-end px-1">
                  <div className="w-6 h-6 rounded-full bg-white shadow-md" />
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-4">
            <button className="w-full h-18 py-5 rounded-[28px] bg-[#FFC554] text-black font-black text-xl flex items-center justify-center gap-3 shadow-xl shadow-[#FFC554]/20">
              <span>Start Loop Ride</span>
              <ChevronRight size={24} />
            </button>
          </div>
        </div>
      )}

      {/* Screen 3: Live Chat & Location Sharing */}
      {screen === "3" && (
        <div className="relative z-10 flex flex-col h-full justify-between p-10">
          {/* Header */}
          <div className="pt-6 border-b border-zinc-800/80 pb-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300">
                  <ArrowLeft size={20} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white">Campus → BZA Station</h2>
                  <p className="text-xs text-zinc-400">4 co-passengers • Auto Pool</p>
                </div>
              </div>
              <div className="px-3.5 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                Auto Booked
              </div>
            </div>
          </div>

          {/* Chat Stream */}
          <div className="space-y-4 py-6 flex-1 flex flex-col justify-end">
            {/* Message 1 */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-sm font-bold text-zinc-300">
                SK
              </div>
              <div className="p-4 rounded-3xl rounded-tl-sm bg-zinc-900 border border-zinc-800 max-w-sm space-y-1">
                <span className="text-xs font-bold text-[#FFC554]">Sanjay (Creator)</span>
                <p className="text-base text-zinc-200 leading-snug">
                  Hey everyone! Auto driver reached main arch. Vehicle number AP 16 TX 4421.
                </p>
                <span className="text-[10px] text-zinc-500 block text-right">4:25 PM</span>
              </div>
            </div>

            {/* Location Pin Message */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-sm font-bold text-zinc-300">
                PR
              </div>
              <div className="p-4 rounded-3xl rounded-tl-sm bg-zinc-900 border border-[#FFC554]/30 max-w-sm space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-[#FFC554]">
                  <MapPin size={16} />
                  <span>Prashanth shared spot</span>
                </div>
                <div className="p-3 rounded-2xl bg-black border border-zinc-800 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#FFC554]/20 flex items-center justify-center text-[#FFC554]">
                    <Navigation size={20} />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-white block">Near Student Gate</span>
                    <span className="text-[11px] text-zinc-400">Walking down in 2 mins</span>
                  </div>
                </div>
                <span className="text-[10px] text-zinc-500 block text-right">4:26 PM</span>
              </div>
            </div>

            {/* Message from me */}
            <div className="flex items-start justify-end gap-3">
              <div className="p-4 rounded-3xl rounded-tr-sm bg-[#FFC554] text-black max-w-sm space-y-1 shadow-lg shadow-[#FFC554]/10">
                <span className="text-xs font-bold text-black/70">You</span>
                <p className="text-base font-semibold leading-snug">
                  Great! I have UPI ready for the ₹75 split. Boarding now.
                </p>
                <span className="text-[10px] text-black/60 block text-right">4:27 PM</span>
              </div>
            </div>
          </div>

          {/* Input Bar */}
          <div className="p-3 rounded-full bg-zinc-900 border border-zinc-800 flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-black border border-zinc-800 flex items-center justify-center text-[#FFC554]">
              <MapPin size={22} />
            </div>
            <input
              type="text"
              readOnly
              value="I am near the auto stand..."
              className="flex-1 bg-transparent text-lg text-zinc-200 outline-none px-2 font-medium"
            />
            <div className="w-12 h-12 rounded-full bg-[#FFC554] text-black flex items-center justify-center font-bold">
              <Send size={20} />
            </div>
          </div>
        </div>
      )}

      {/* Screen 4: Ride Details & Fare Calculator */}
      {screen === "4" && (
        <div className="relative z-10 flex flex-col h-full justify-between p-12">
          <div className="space-y-6 pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300">
                <ArrowLeft size={24} />
              </div>
              <div>
                <h1 className="text-3xl font-black text-white">Ride Overview</h1>
                <p className="text-xs text-zinc-400">Campus to Vijayawada Railway Station</p>
              </div>
            </div>

            {/* Split Fare Calculator Box */}
            <div className="p-6 rounded-[32px] bg-gradient-to-br from-zinc-900 to-zinc-950 border border-[#FFC554]/30 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Total Auto Fare</span>
                <span className="text-3xl font-black text-white">₹300</span>
              </div>
              <div className="h-px bg-zinc-800" />
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#FFC554] block">Your Fair Share</span>
                  <span className="text-xs text-zinc-400">Equal split among 4 confirmed passengers</span>
                </div>
                <div className="text-right">
                  <span className="text-4xl font-black text-[#FFC554]">₹75</span>
                  <span className="text-xs text-zinc-400 block">/ person</span>
                </div>
              </div>
            </div>

            {/* Co-passengers List */}
            <div className="space-y-3 pt-2">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 block">
                Confirmed Passengers (4/4)
              </span>

              <div className="space-y-2.5">
                <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-[#FFC554]/20 text-[#FFC554] flex items-center justify-center font-bold">
                      SK
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-white">Sanjay Kamal</span>
                        <ShieldCheck size={16} className="text-emerald-400" />
                      </div>
                      <span className="text-xs text-zinc-400">24MIC7130 • Creator</span>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-[#FFC554] bg-[#FFC554]/10 border border-[#FFC554]/20 px-2.5 py-1 rounded-full">
                    Ride Lead
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-zinc-800 text-zinc-300 flex items-center justify-center font-bold">
                      PK
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-white">Praveen Kumar</span>
                        <ShieldCheck size={16} className="text-emerald-400" />
                      </div>
                      <span className="text-xs text-zinc-400">23BCE2041 • Passenger</span>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-zinc-400">Confirmed</span>
                </div>

                <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-zinc-800 text-zinc-300 flex items-center justify-center font-bold">
                      AY
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-white">Ananya Yadav</span>
                        <ShieldCheck size={16} className="text-emerald-400" />
                      </div>
                      <span className="text-xs text-zinc-400">24BEE1012 • Passenger</span>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-zinc-400">Confirmed</span>
                </div>
              </div>
            </div>
          </div>

          {/* Chat Action */}
          <div className="pt-4">
            <button className="w-full h-18 py-5 rounded-[28px] bg-[#FFC554] text-black font-black text-xl flex items-center justify-center gap-3 shadow-xl shadow-[#FFC554]/20">
              <Navigation size={22} />
              <span>Open Group Chat</span>
            </button>
          </div>
        </div>
      )}

      {/* Screen 5: Profile & Student Verification */}
      {screen === "5" && (
        <div className="relative z-10 flex flex-col h-full justify-between p-12">
          <div className="space-y-6 pt-6">
            <h1 className="text-4xl font-black text-white">Student Profile</h1>

            {/* Profile Card */}
            <div className="p-6 rounded-[36px] bg-zinc-900/80 border border-zinc-800 flex items-center gap-5 shadow-xl">
              <div className="w-24 h-24 rounded-full bg-[#FFC554]/15 border-2 border-[#FFC554] flex items-center justify-center text-3xl font-black text-[#FFC554]">
                SK
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-bold text-white">Sanjay Kamal</h2>
                  <ShieldCheck size={20} className="text-emerald-400" />
                </div>
                <p className="text-sm font-mono text-zinc-400">24MIC7130 • VIT-AP</p>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                  Verified Student
                </div>
              </div>
            </div>

            {/* Fast Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 text-center">
                <span className="text-2xl font-black text-[#FFC554]">24</span>
                <span className="text-[11px] text-zinc-400 block mt-1">Rides Coordinated</span>
              </div>
              <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 text-center">
                <span className="text-2xl font-black text-emerald-400">₹1,850</span>
                <span className="text-[11px] text-zinc-400 block mt-1">Fares Saved</span>
              </div>
              <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 text-center">
                <span className="text-2xl font-black text-white">5.0 ★</span>
                <span className="text-[11px] text-zinc-400 block mt-1">Community Trust</span>
              </div>
            </div>

            {/* Trusted Driver & Community Directory */}
            <div className="space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 block">Community Tools</span>
              <div className="p-5 rounded-[28px] bg-zinc-900/60 border border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#FFC554]/10 text-[#FFC554] flex items-center justify-center">
                    <AutoRickshawIcon size={28} />
                  </div>
                  <div>
                    <span className="text-base font-bold text-white block">Trusted Campus Drivers</span>
                    <span className="text-xs text-zinc-400">Verified local auto & cab contacts</span>
                  </div>
                </div>
                <ChevronRight size={20} className="text-zinc-500" />
              </div>

              {/* Buy Me a Coffee / Support */}
              <div className="p-5 rounded-[28px] bg-[#FFC554]/10 border border-[#FFC554]/30 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#FFC554] text-black flex items-center justify-center">
                    <Coffee size={24} />
                  </div>
                  <div>
                    <span className="text-base font-bold text-white block">Support Developer</span>
                    <span className="text-xs text-[#FFC554]">Buy the student creator a coffee</span>
                  </div>
                </div>
                <ChevronRight size={20} className="text-[#FFC554]" />
              </div>
            </div>
          </div>

          {/* Account Privacy & Delete */}
          <div className="text-center text-xs text-zinc-500 space-y-2 pb-2">
            <p>LOOP v0.1 • Non-Commercial Campus Peer Utility</p>
            <p className="text-zinc-400">Compliant with Digital Personal Data Protection Act (DPDP)</p>
          </div>
        </div>
      )}

      {/* Screen 6: Dark Mode Home Screen Focus */}
      {screen === "6" && (
        <div className="relative z-10 flex flex-col h-full justify-between p-12">
          <div className="space-y-8 pt-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h1 className="text-6xl font-black tracking-tighter text-white">LOOP</h1>
                <div className="w-3.5 h-3.5 rounded-full bg-[#FFC554] animate-pulse" />
              </div>
              <div className="px-4 py-2 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-bold text-[#FFC554]">
                HIGH CONTRAST DARK
              </div>
            </div>

            {/* Highlight Banner */}
            <div className="p-8 rounded-[36px] bg-gradient-to-r from-zinc-900 via-zinc-900 to-black border border-[#FFC554]/40 space-y-3 shadow-2xl">
              <span className="text-xs font-black uppercase tracking-widest text-[#FFC554]">Purpose-Based Coordination</span>
              <h2 className="text-3xl font-extrabold text-white leading-tight">
                Never ride alone. Split fares with campus peers.
              </h2>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Peer-to-peer auto, cab, and bike pooling designed for zero distractions and instant coordination.
              </p>
            </div>

            {/* Recent active ride card */}
            <div className="p-6 rounded-[32px] bg-zinc-900/90 border border-zinc-800 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#FFC554]">Featured Destination</span>
                <span className="text-xs text-emerald-400 font-bold">2 Spots Left</span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-black text-white">Tenali Railway Station</h3>
                  <p className="text-sm text-zinc-400">Departure: Saturday, 6:00 AM • Auto Pool</p>
                </div>
                <div className="w-16 h-16 rounded-2xl bg-[#FFC554]/15 border border-[#FFC554]/20 flex items-center justify-center text-[#FFC554]">
                  <AutoRickshawIcon size={36} />
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-[32px] bg-zinc-900/60 border border-zinc-800/80 text-center">
            <p className="text-sm font-bold text-[#FFC554]">Rides go better in Loop.</p>
            <p className="text-xs text-zinc-400 mt-1">Available now for verified university students.</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ScreenshotPreviewPage() {
  return (
    <Suspense fallback={<div className="bg-black text-white p-6">Loading preview...</div>}>
      <ScreenshotContent />
    </Suspense>
  );
}
