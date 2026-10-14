# LOOP — Complete Technical Documentation

> **Version:** 1.0 · **Last Updated:** August 2026  
> **Author:** Sanjay Kamal S · **Reg. No:** 24MIC7130  
> **Institution:** VIT-AP University, SCOPE (M.Tech Integrated CSE)

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Getting Started](#2-getting-started)
3. [Technology Stack](#3-technology-stack)
4. [Project File Structure](#4-project-file-structure)
5. [Architecture & Data Flow](#5-architecture--data-flow)
6. [State Management (LoopContext)](#6-state-management-loopcontext)
7. [Authentication System](#7-authentication-system)
8. [Database Schema](#8-database-schema)
9. [Component Reference](#9-component-reference)
   - 9.1 [MainApp.tsx — View Router & Shell](#91-mainapptsx--view-router--shell)
   - 9.2 [AuthLogin.tsx — Authentication Flow](#92-authlogintsx--authentication-flow)
   - 9.3 [AppHeader.tsx — Top Navigation Bar](#93-appheadertsx--top-navigation-bar)
   - 9.4 [HomeView.tsx — Live Loop Feed](#94-homeviewtsx--live-loop-feed)
   - 9.5 [CreateView.tsx — Loop Creation Form](#95-createviewtsx--loop-creation-form)
   - 9.6 [ChatView.tsx — Real-Time Group Chat](#96-chatviewtsx--real-time-group-chat)
   - 9.7 [ChatListView.tsx — Active Chats List](#97-chatlistviewtsx--active-chats-list)
   - 9.8 [RideDetailsView.tsx — Ride Info & Host Controls](#98-ridedetailsviewtsx--ride-info--host-controls)
   - 9.9 [ProfileView.tsx — User Profile & Settings](#99-profileviewtsx--user-profile--settings)
   - 9.10 [TrustedVehiclesView.tsx — Community Driver Directory](#910-trustedvehiclesviewtsx--community-driver-directory)
   - 9.11 [BottomNav.tsx — Tab Navigation Bar](#911-bottomnavtsx--tab-navigation-bar)
   - 9.12 [Modal Components](#912-modal-components)
10. [Real-Time Communication Engine](#10-real-time-communication-engine)
11. [Design System](#11-design-system)
12. [Supabase Query Reference](#12-supabase-query-reference)
13. [TypeScript Interfaces](#13-typescript-interfaces)
14. [Configuration Files](#14-configuration-files)
15. [Environment Variables](#15-environment-variables)
16. [Deployment & CI/CD](#16-deployment--cicd)
17. [Known Technical Challenges & Solutions](#17-known-technical-challenges--solutions)
18. [Glossary](#18-glossary)

---

## 1. Project Overview

**LOOP** is a real-time, purpose-based ride coordination platform built as a mobile-first progressive web application for university campuses. It enables students to instantly find co-passengers heading to the same destination at the same time — transforming ride coordination from a minutes-long WhatsApp negotiation into a **single-tap, seconds-fast** interaction.

### Core Philosophy

- **Speed over features** — The entire app is designed for sub-10-second interactions
- **Temporary coordination** — Loops are created, used, and closed; no lingering digital clutter
- **Safety by design** — Gender filtering, registration number visibility, trusted driver directories
- **Mobile-perfect** — The full app runs within a single mobile viewport (`100dvh`) with zero page scrolling

### Key User Flow

```
1. Open LOOP → See live feed of active rides
2. Find a ride going your way → Tap "Join"
3. Instantly enter the group chat → Coordinate pickup
4. Ride together → Host enters fare → Auto-split
5. Done. Loop closes.
```

---

## 2. Getting Started

### Prerequisites

- **Node.js** ≥ 18.x
- **npm** ≥ 9.x
- **Git**
- A **Supabase** project (free tier works)

### Installation

```bash
# Clone the repository
git clone https://github.com/sanjaykamal2006/Loop.git
cd Loop

# Install dependencies
npm install
```

### Environment Setup

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...your-anon-key
```

### Running Locally

```bash
# Development server (Turbopack enabled)
npm run dev

# Production build
npm run build
npm start

# Lint check
npm run lint
```

The dev server starts at `http://localhost:3000` with Turbopack hot module replacement.

---

## 3. Technology Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Framework** | Next.js (App Router) | 15.3.5 | React server-rendered framework with file-based routing |
| **Language** | TypeScript | 5.x | Static type safety across all components and data models |
| **UI Library** | React | 19.0.0 | Component-based UI with hooks and concurrent features |
| **Backend** | Supabase | 2.91.0 | PostgreSQL database, Auth, Realtime, Storage — all-in-one BaaS |
| **Styling** | Tailwind CSS | 4.x | Utility-first CSS with CSS-variable design tokens |
| **Animation** | Framer Motion | 12.23.24 | Declarative animations and gesture handling |
| **Icons** | Lucide React | latest | Open-source SVG icon library (tree-shakable) |
| **OTP Input** | input-otp | latest | Accessible one-time-password input component |
| **Toasts** | Sonner | latest | Lightweight toast notification system |
| **UI Primitives** | Radix UI | latest | Accessible headless components (dialog, slot, etc.) |
| **Font** | Space Grotesk | — | Google Font — geometric sans-serif with tech aesthetic |
| **Hosting** | Vercel | — | Edge-optimized deployment with auto CI/CD from GitHub |
| **Version Control** | Git + GitHub | — | Source code management on `main` branch |

### NPM Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `next dev --turbopack` | Start development server with Turbopack |
| `build` | `next build` | Create production build |
| `start` | `next start` | Serve production build |
| `lint` | `next lint` | Run ESLint checks |

---

## 4. Project File Structure

```
Loop-App-2-codebase/
├── public/
│   ├── icon.png                    # App icon (PWA)
│   ├── logo.png                    # LOOP logo
│   └── creator.jpg                 # Creator photo
│
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout (metadata, fonts, toaster)
│   │   ├── page.tsx                # Entry point (session routing)
│   │   └── globals.css             # Design system (Tailwind, tokens, dot-matrix)
│   │
│   ├── components/
│   │   └── sections/
│   │       ├── MainApp.tsx         # View router & state orchestrator (911 lines)
│   │       ├── AuthLogin.tsx       # Login / Signup / OTP flow (295 lines)
│   │       ├── AppHeader.tsx       # Top navigation bar
│   │       ├── HomeView.tsx        # Live loop feed with search
│   │       ├── CreateView.tsx      # Loop creation form
│   │       ├── ChatView.tsx        # Real-time group chat engine (~23 KB)
│   │       ├── ChatListView.tsx    # Active chats list (52 lines)
│   │       ├── RideDetailsView.tsx # Ride info, passengers, fare split
│   │       ├── ProfileView.tsx     # User profile & settings
│   │       ├── TrustedVehiclesView.tsx # Community driver directory
│   │       ├── BottomNav.tsx       # Tab navigation bar
│   │       ├── GenderModal.tsx     # Gender selection prompt
│   │       ├── TermsModal.tsx      # Terms & conditions modal
│   │       ├── CreatorModal.tsx    # About the creator modal
│   │       └── UserProfileModal.tsx # User profile card modal
│   │
│   └── lib/
│       ├── LoopContext.tsx         # React Context (global state provider)
│       ├── supabase.ts            # Supabase client initialization (7 lines)
│       └── types.ts               # TypeScript interfaces (82 lines)
│
├── .env.local                     # Environment variables (not committed)
├── next.config.ts                 # Next.js configuration
├── tsconfig.json                  # TypeScript configuration
├── package.json                   # Dependencies & scripts
├── AGENTS.md                      # Project guidelines for AI agents
└── LOOP_Documentation.md          # ← This file
```

---

## 5. Architecture & Data Flow

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     CLIENT (Browser)                     │
│                                                          │
│   Next.js 15 App Router → React 19 → Tailwind CSS 4    │
│                                                          │
│   ┌──────────┐   ┌──────────┐   ┌──────────────────┐   │
│   │ AuthLogin│   │ MainApp  │   │  LoopContext      │   │
│   │ (unauth) │   │ (authed) │   │  (global state)   │   │
│   └──────────┘   └──────────┘   └──────────────────┘   │
└──────────────┬──────────────┬───────────────────────────┘
               │              │
    ┌──────────▼──────────────▼──────────────┐
    │           SUPABASE CLOUD                │
    │                                          │
    │   ┌──────────┐  ┌───────────────────┐   │
    │   │   Auth    │  │   PostgreSQL DB    │   │
    │   │ (GoTrue)  │  │   (5 tables)      │   │
    │   └──────────┘  └───────────────────┘   │
    │                                          │
    │   ┌──────────┐  ┌───────────────────┐   │
    │   │ Realtime  │  │    Storage        │   │
    │   │ (WebSocket│  │  (Avatar uploads) │   │
    │   │  + CDC)   │  │                   │   │
    │   └──────────┘  └───────────────────┘   │
    └──────────────────────────────────────────┘
```

### View Routing Model

The app uses a **single-page, view-based state machine** — there is no traditional page routing. All navigation is instant in-memory view switching controlled by a `view` state variable:

```
┌──────────────────────────────────────────────────────┐
│                      MainApp                          │
│                                                       │
│  view === "home"          →  <HomeView />             │
│  view === "create"        →  <CreateView />           │
│  view === "chat-list"     →  <ChatListView />         │
│  view === "chat"          →  <ChatView />             │
│  view === "profile"       →  <ProfileView />          │
│  view === "ride-details"  →  <RideDetailsView />      │
│  view === "trusted-vehicles" → <TrustedVehiclesView />│
│                                                       │
│  Bottom Nav: visible on home, create, chat-list,      │
│              profile views. Hidden on chat,            │
│              ride-details, trusted-vehicles.           │
└──────────────────────────────────────────────────────┘
```

### Data Flow Pattern

```
User Action (tap button)
    │
    ▼
Component calls Supabase SDK  ───────→  Supabase REST API
    │                                         │
    ▼                                         ▼
Optimistic UI update (instant)          PostgreSQL write
    │                                         │
    │                                         ▼
    │                                   CDC event fires
    │                                         │
    ▼                                         ▼
State update via                        Realtime WebSocket
  setMessages() / setActiveLoops()      pushes to all clients
```

---

## 6. State Management (LoopContext)

### File: `src/lib/LoopContext.tsx`

LOOP uses **React Context** for global state management. The `LoopContext` provides shared state and functions to all components.

### Context Values Provided

| Property | Type | Description |
|----------|------|-------------|
| `view` | `View` | Current active screen (`"home"`, `"create"`, `"chat-list"`, etc.) |
| `activeLoops` | `Loop[]` | Array of currently active, non-expired loops |
| `userJoinedLoops` | `string[]` | Array of loop IDs the current user has joined |
| `selectedLoop` | `Loop \| null` | Currently focused loop (for chat or ride details) |
| `profile` | `Profile` | Current user's profile data |
| `showGenderSelect` | `boolean` | Whether the gender selection modal should show |
| `theme` | `ThemeClasses` | Computed theme tokens (`isDark`, `bg`, `text`, `border`, `cardBg`, `mutedText`) |

### Context Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `setView` | `(view: View) => void` | Navigate to a different view |
| `setSelectedLoop` | `(loop: Loop \| null) => void` | Set the active loop context |
| `updateProfile` | `(updates: Partial<Profile>) => void` | Update profile and sync to Supabase |
| `formatTime` | `(iso: string) => string` | Format ISO timestamp to `hh:mm AM/PM` |

### Theme System

The theme is derived from `profile.theme` and provides CSS-ready values:

```typescript
// Dark mode
{
  isDark: true,
  bg: "#000000",
  text: "#ffffff",
  border: "rgba(255,255,255,0.06)",
  cardBg: "rgba(255,255,255,0.03)",
  mutedText: "rgba(255,255,255,0.4)"
}

// Light mode
{
  isDark: false,
  bg: "#FFFFFF",
  text: "#000000",
  border: "rgba(0,0,0,0.08)",
  cardBg: "rgba(0,0,0,0.02)",
  mutedText: "rgba(0,0,0,0.4)"
}
```

---

## 7. Authentication System

### File: `src/components/sections/AuthLogin.tsx` (295 lines, ~10.5 KB)

### Auth Flow Diagram

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│  Login Mode  │     │  Signup Mode  │     │  OTP Verify  │
│              │     │               │     │              │
│ Email + Pass │     │ Email + Pass  │     │  6-digit OTP │
│     ↓        │     │     ↓         │     │     ↓        │
│ signInWith   │     │ signUp()      │     │ verifyOtp()  │
│ Password()   │     │     ↓         │     │     ↓        │
│     ↓        │     │ OTP sent to   │     │ Account      │
│ Session      │     │ email         │────→│ Activated    │
│ Created ✓    │     │               │     │     ↓        │
└──────────────┘     └───────────────┘     │ Auto Login ✓ │
                                           └──────────────┘
```

### State Variables

| Variable | Type | Default | Purpose |
|----------|------|---------|---------|
| `isLogin` | `boolean` | `true` | Toggle between Login and Sign Up mode |
| `email` | `string` | `""` | Email input field |
| `password` | `string` | `""` | Password input field (min 6 chars) |
| `showPassword` | `boolean` | `false` | Toggle password visibility (eye icon) |
| `isLoading` | `boolean` | `false` | Disables buttons during API calls |
| `isVerifying` | `boolean` | `false` | Shows OTP input screen after signup |
| `otp` | `string` | `""` | 6-digit OTP code |
| `countdown` | `number` | `0` | Resend OTP timer (counts down from 60s) |

### Supabase Auth Methods Used

```typescript
// Login
supabase.auth.signInWithPassword({ email, password })

// Signup (sends OTP email)
supabase.auth.signUp({ email, password })

// Verify OTP
supabase.auth.verifyOtp({ email, token: otp, type: "email" })

// Resend OTP (with 60s cooldown)
supabase.auth.resend({ type: "signup", email })
```

### Validation Rules

- **Password**: Minimum 6 characters (enforced client-side)
- **Email**: Standard email format (browser validation)
- **OTP**: Exactly 6 digits
- **Rate Limiting**: Custom error handling for Supabase 429 responses — displays "Too many attempts, please wait" toast

### UI Components

- **OTP Slot**: Custom `Slot` component with animated caret (`caret-blink` keyframe) for each OTP digit
- **Password Toggle**: Eye / EyeOff icon button to reveal password
- **Mode Toggle**: "Don't have an account? Sign up" / "Already have an account? Login" text buttons
- **Resend Timer**: `{countdown}s` countdown badge that disables resend button for 60 seconds

---

## 8. Database Schema

### Entity Relationship Diagram

```
┌─────────────────┐       ┌─────────────────┐
│   auth.users     │       │    profiles      │
│ (Supabase Auth)  │       │                  │
│                  │  1:1  │  id (PK, FK)     │
│  id (PK)  ──────┼───────│  display_name    │
│  email           │       │  reg_no          │
│  encrypted_pass  │       │  gender          │
│  created_at      │       │  avatar_url      │
│                  │       │  bio             │
│                  │       │  theme           │
└─────────────────┘       └────────┬─────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
              ┌─────▼─────┐  ┌─────▼─────┐  ┌─────▼──────────┐
              │   loops     │  │ messages   │  │trusted_vehicles│
              │             │  │            │  │                │
              │ id (PK)     │  │ id (PK)    │  │ id (PK)        │
              │ creator_id  │  │ loop_id(FK)│  │ user_id (FK)   │
              │ destination │  │ user_id(FK)│  │ driver_name    │
              │ start_point │  │ content    │  │ phone_number   │
              │ departure.. │  │ reactions  │  │ vehicle_type   │
              │ participants│  │ edited_at  │  │ created_at     │
              │ is_female.. │  │ created_at │  │                │
              │ total_fare  │  └────────────┘  └────────────────┘
              │ status      │
              │ expires_at  │
              │ created_at  │
              └──────┬──────┘
                     │
              ┌──────▼──────┐
              │ loop_members │
              │              │
              │ id (PK)      │
              │ loop_id (FK) │
              │ user_id (FK) │
              │ joined_at    │
              └──────────────┘
```

### Table: `profiles`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | PK, FK → `auth.users.id` | User identifier, auto-created on signup |
| `display_name` | `TEXT` | NOT NULL | Visible name across the app |
| `reg_no` | `TEXT` | nullable | University registration number (e.g., `24MIC7130`) |
| `gender` | `TEXT` | nullable | `"male"` or `"female"` — required for safety filtering |
| `avatar_url` | `TEXT` | nullable | Public URL of uploaded profile picture (Supabase Storage) |
| `bio` | `TEXT` | nullable | Short bio (max 120 characters) |
| `theme` | `TEXT` | DEFAULT `'dark'` | `"dark"` or `"light"` — persisted preference |
| `updated_at` | `TIMESTAMPTZ` | — | Last profile update timestamp |

### Table: `loops`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | PK, DEFAULT `gen_random_uuid()` | Unique loop identifier |
| `creator_id` | `UUID` | FK → `profiles.id`, NOT NULL | The user who created the loop (host) |
| `destination` | `TEXT` | NOT NULL | Where the ride is going |
| `start_point` | `TEXT` | nullable | Pickup / departure location |
| `departure_time` | `TIMESTAMPTZ` | NOT NULL | Scheduled departure time |
| `participants_limit` | `INT` | NOT NULL, DEFAULT `4` | Maximum number of passengers (2–10) |
| `is_female_only` | `BOOLEAN` | DEFAULT `false` | Restrict to female-only passengers |
| `purpose` | `TEXT` | nullable | Optional ride purpose description |
| `total_fare` | `NUMERIC` | nullable | Total ride cost entered by host |
| `status` | `TEXT` | DEFAULT `'active'` | `"open"` → `"active"` → `"started"` → `"ended"` / `"cancelled"` |
| `expires_at` | `TIMESTAMPTZ` | NOT NULL | Auto-expiry timestamp (2 hours after departure) |
| `created_at` | `TIMESTAMPTZ` | DEFAULT `now()` | Loop creation time |

### Table: `loop_members`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | PK, DEFAULT `gen_random_uuid()` | Unique membership record |
| `loop_id` | `UUID` | FK → `loops.id`, NOT NULL | Which loop this membership belongs to |
| `user_id` | `UUID` | FK → `profiles.id`, NOT NULL | Which user joined |
| `joined_at` | `TIMESTAMPTZ` | DEFAULT `now()` | When the user joined the loop |

### Table: `messages`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | PK, DEFAULT `gen_random_uuid()` | Unique message identifier |
| `loop_id` | `UUID` | FK → `loops.id`, NOT NULL | Which loop chat this message belongs to |
| `user_id` | `UUID` | FK → `profiles.id`, NOT NULL | Who sent the message |
| `content` | `TEXT` | NOT NULL | Message body text |
| `reactions` | `JSONB` | DEFAULT `'{}'` | Emoji reactions: `{"👍": ["user_id_1", ...]}` |
| `edited_at` | `TIMESTAMPTZ` | nullable | Null if never edited; timestamp if edited |
| `created_at` | `TIMESTAMPTZ` | DEFAULT `now()` | When the message was sent |

### Table: `trusted_vehicles`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | PK, DEFAULT `gen_random_uuid()` | Unique entry identifier |
| `user_id` | `UUID` | FK → `profiles.id`, NOT NULL | Who added this driver |
| `driver_name` | `TEXT` | NOT NULL | Name of the trusted driver |
| `phone_number` | `TEXT` | NOT NULL | Driver's contact number |
| `vehicle_type` | `TEXT` | NOT NULL | `"bike"`, `"auto"`, or `"share_auto"` |
| `created_at` | `TIMESTAMPTZ` | DEFAULT `now()` | When the entry was added |

### Row Level Security (RLS)

All tables have RLS enabled. Key policies:

- **profiles**: Users can only UPDATE their own row (`auth.uid() = id`)
- **loops**: Any authenticated user can SELECT; only creator can DELETE
- **loop_members**: Any authenticated user can INSERT (join); only loop creator or the member themselves can DELETE
- **messages**: Any loop member can SELECT & INSERT; only the sender can UPDATE their own messages
- **trusted_vehicles**: Any authenticated user can SELECT; only the owner can INSERT/UPDATE/DELETE

---

## 9. Component Reference

### 9.1 `MainApp.tsx` — View Router & Shell

**Path:** `src/components/sections/MainApp.tsx`  
**Size:** 911 lines / ~44.8 KB  
**Role:** The monolithic view container and state orchestrator for all authenticated users.

#### Responsibilities

- Manages the central `view` state that controls which screen is rendered
- Holds ALL application state (loops, messages, members, profile, etc.)
- Sets up Supabase Realtime subscriptions for live data
- Passes state and callbacks as props to child view components
- Handles loop creation, joining, message sending, profile updates

#### State Variables

| Variable | Type | Default | Purpose |
|----------|------|---------|---------|
| `view` | `View` | `"home"` | Current active screen |
| `activeLoops` | `Loop[]` | `[]` | All active, non-expired loops |
| `selectedLoop` | `Loop \| null` | `null` | Currently focused loop |
| `messages` | `Message[]` | `[]` | Chat messages for the active loop |
| `loopMembers` | `any[]` | `[]` | Members of the selected loop |
| `newMessage` | `string` | `""` | Chat input text buffer |
| `isJoining` | `boolean` | `false` | Join button loading state |
| `isCreatingLoop` | `boolean` | `false` | Create button loading state |
| `userJoinedLoops` | `string[]` | `[]` | Loop IDs the user has joined |
| `userLoops` | `string[]` | `[]` | Loop IDs the user has created |
| `editingMsgId` | `string \| null` | `null` | ID of message being edited |
| `editingContent` | `string` | `""` | Edited message text buffer |
| `profile` | `Profile` | `{display_name: "", theme: "dark"}` | Current user profile |
| `tempName` | `string` | `""` | Profile name edit buffer |
| `tempRegNo` | `string` | `""` | Reg. number edit buffer |
| `isEditingProfile` | `boolean` | `false` | Profile edit mode flag |
| `showGenderSelect` | `boolean` | `false` | Gender modal visibility |
| `pendingAction` | `object \| null` | `null` | Queued action awaiting gender selection |
| `dest` | `string` | `""` | Create form: destination |
| `hour` | `string` | `""` | Create form: departure hour |
| `minute` | `string` | `""` | Create form: departure minute |
| `ampm` | `"AM" \| "PM"` | `"AM"` | Create form: AM/PM toggle |
| `limit` | `number` | `8` | Create form: seat count |
| `isFemaleOnly` | `boolean` | `false` | Create form: girls-only toggle |

#### Realtime Subscriptions

```
Channel: "loops-channel"
  → postgres_changes on `loops` table (INSERT, UPDATE, DELETE)
  → Triggers: re-fetch all active loops

Channel: "members-{loopId}"
  → postgres_changes on `loop_members` table
  → Triggers: re-fetch member list for selected loop

Channel: "chat-{loopId}"
  → postgres_changes on `messages` table (INSERT, UPDATE)
  → Triggers: append new messages or update edited messages
```

---

### 9.2 `AuthLogin.tsx` — Authentication Flow

**Path:** `src/components/sections/AuthLogin.tsx`  
**Size:** 295 lines / ~10.5 KB  
**Role:** Complete authentication UI — login, signup, OTP verification, password toggle, error handling.

*(See [Section 7: Authentication System](#7-authentication-system) for full details)*

---

### 9.3 `AppHeader.tsx` — Top Navigation Bar

**Path:** `src/components/sections/AppHeader.tsx`  
**Size:** ~8 KB  
**Role:** Context-aware sticky header at the top of every view.

#### Behavior by View

| View | Left | Center | Right |
|------|------|--------|-------|
| `home` | — | **LOOP** title + tagline | Refresh button |
| `create` | ← Back to home | "Create Loop" | — |
| `chat-list` | — | "Chats" | — |
| `chat` | ← Back to chat list | Loop destination | Settings ⚙️ |
| `profile` | — | "Profile" | Theme toggle 🌙/☀️ |
| `ride-details` | ← Back to home | Destination | — |

---

### 9.4 `HomeView.tsx` — Live Loop Feed

**Path:** `src/components/sections/HomeView.tsx`  
**Size:** ~6.5 KB  
**Role:** Displays real-time feed of all active loops with search and filtering.

#### Features

- **Instant search** — Filters loops by destination, start point, or vehicle type as user types
- **Loop cards** — Each card shows:
  - Destination and start point
  - Vehicle type icon
  - Departure time (formatted as `hh:mm AM/PM`)
  - Seat availability (`member_count / participants_limit`)
  - Per-person fare split (if total fare is set)
  - "Girls Only" badge (if applicable)
- **Smart filtering** — Female-only loops are hidden from male users (unless they created it)
- **Empty state** — Illustrated message when no loops are active
- **Pull-to-refresh** — Manual refresh button in header reloads all loops

#### Data Source

```typescript
SELECT *, loop_members(count)
FROM loops
WHERE status = 'active' AND expires_at > now()
ORDER BY created_at DESC
```

---

### 9.5 `CreateView.tsx` — Loop Creation Form

**Path:** `src/components/sections/CreateView.tsx`  
**Size:** ~9.3 KB  
**Role:** Interactive form for creating a new ride loop.

#### Form Fields

| Field | Input Type | Validation | Default |
|-------|-----------|------------|---------|
| Destination | Text input | Required, non-empty | — |
| Start Point | Text input | Optional | — |
| Vehicle Type | Button selector | Required | Auto |
| Departure Time | Hour (01-12) + Minute (00-59) + AM/PM | Required | Current time |
| Seats | 2-row button grid (2-10) | Required | 8 |
| Girls Only | Toggle switch | Optional | Off |

#### Vehicle Types

| Type | Icon | Description |
|------|------|-------------|
| `auto` | 🛺 | Auto-rickshaw |
| `bike` | 🏍️ | Two-wheeler |
| `car` | 🚗 | Car |
| `share_auto` | 🚐 | Shared auto |
| `walk` | 🚶 | Walking group |

#### Gender Guard

If `profile.gender` is not set when the user tries to create a loop, the **GenderModal** is triggered. The creation action is stored in `pendingAction` and executed after gender selection.

#### Expiry Calculation

```typescript
// Loop expires 2 hours after departure time
expires_at = departure_time + 2 hours
```

---

### 9.6 `ChatView.tsx` — Real-Time Group Chat

**Path:** `src/components/sections/ChatView.tsx`  
**Size:** ~23.5 KB  
**Role:** Full-featured real-time group chat engine.

*(See [Section 10: Real-Time Communication Engine](#10-real-time-communication-engine) for the complete technical deep-dive)*

#### Features

| Feature | Description |
|---------|-------------|
| **Instant messaging** | Messages appear immediately via optimistic UI |
| **Triple-engine delivery** | WebSocket Broadcast + 1s Polling + PostgreSQL CDC |
| **Emoji reactions** | 👍 ❤️ 😂 👎 — one per user per message |
| **Message editing** | Double-tap to edit within 5-minute window |
| **Typing indicators** | "X is typing..." with Supabase Presence |
| **Smart scroll** | Auto-scroll only when messages overflow viewport |
| **Profile viewing** | Tap any user's avatar to see their profile card |
| **Anti-autofill** | `type="search"` + `autoComplete="new-password"` blocks Gboard popups |
| **Avatar display** | Profile pictures shown next to each message |

#### Message Bubble Layout

```
┌────────────────────────────────────────────┐
│ [Avatar] Display Name        12:34 PM      │
│          Message content goes here...       │
│                                             │
│          [👍 2] [❤️ 1]              edited  │
└────────────────────────────────────────────┘
```

---

### 9.7 `ChatListView.tsx` — Active Chats List

**Path:** `src/components/sections/ChatListView.tsx`  
**Size:** 52 lines / ~1.8 KB  
**Role:** Shows all loops the user has joined that have active chats.

#### Behavior

- Filters `activeLoops` to only show loops present in `userJoinedLoops`
- Each chat item shows the loop's destination and member count
- Tapping a chat item sets `selectedLoop` and navigates to `"chat"` view
- Shows empty state when no active chats exist

---

### 9.8 `RideDetailsView.tsx` — Ride Info & Host Controls

**Path:** `src/components/sections/RideDetailsView.tsx`  
**Size:** ~11.9 KB  
**Role:** Detailed view of a selected loop with passenger management.

#### Information Displayed

- Loop destination and start point
- Vehicle type with icon
- Departure time (formatted)
- Seat availability progress bar
- Total fare and per-person split calculation
- Female-only badge (if applicable)

#### Passenger Roster

Each passenger entry shows:
- Profile avatar (or initial badge)
- Display name
- Registration number
- Gender badge (color-coded: pink for female, blue for male)

#### Host Controls (visible only to loop creator)

| Action | Description |
|--------|-------------|
| **Edit Fare** | Update `total_fare` — recalculates per-person split |
| **Remove Passenger** | Kick a member from the loop |
| **Delete Loop** | Sets `status = 'cancelled'`, removes from all feeds |

#### Non-Host Actions

| Action | Description |
|--------|-------------|
| **Join Loop** | Inserts into `loop_members` table |
| **Open Chat** | Navigates to `"chat"` view |
| **Share via WhatsApp** | SOS deep link with pre-filled ride details |

---

### 9.9 `ProfileView.tsx` — User Profile & Settings

**Path:** `src/components/sections/ProfileView.tsx`  
**Size:** ~13.8 KB  
**Role:** User profile management, settings, and account actions.

#### Sections

| Section | Features |
|---------|----------|
| **Avatar** | Profile picture upload via Supabase Storage; "Change Photo 📷" pill button; fallback to initial badge |
| **Name & Reg No** | Inline editable with save/cancel; synced to Supabase on save |
| **Bio** | Short text bio (max 120 chars) |
| **Theme Toggle** | Dark 🌙 / Light ☀️ switch; persisted to `profiles.theme` |
| **Trusted Drivers** | Navigation link to `TrustedVehiclesView` |
| **Past Loops** | History of loops the user created or joined |
| **About Creator** | Opens `CreatorModal` |
| **Sign Out** | `supabase.auth.signOut()` — clears session |

#### Avatar Upload Flow

```
1. User taps "Change Photo 📷"
2. File picker opens (accept: image/*)
3. Image uploaded to Supabase Storage bucket: avatars/{userId}
4. Public URL retrieved and saved to profiles.avatar_url
5. Avatar renders immediately from new URL
```

---

### 9.10 `TrustedVehiclesView.tsx` — Community Driver Directory

**Path:** `src/components/sections/TrustedVehiclesView.tsx`  
**Size:** ~11.7 KB  
**Role:** Community-sourced directory of verified local auto/cab drivers.

#### Features

- **Browse**: All trusted drivers shared by any student are visible to everyone
- **Add**: Submit a driver with name, phone number, and vehicle type (max 5 per user)
- **Edit**: Update driver details (only your own entries)
- **Delete**: Remove a driver entry (only your own)
- **Call**: Tap phone number to initiate call via `tel:` link
- **Vehicle Type Filter**: Filter by bike, auto, or share_auto

#### Data Model

```typescript
interface TrustedVehicle {
  id: string;
  user_id: string;
  driver_name: string;
  phone_number: string;
  vehicle_type: "bike" | "auto" | "share_auto";
  created_at: string;
  profiles?: { display_name: string; avatar_url?: string };
}
```

---

### 9.11 `BottomNav.tsx` — Tab Navigation Bar

**Path:** `src/components/sections/BottomNav.tsx`  
**Size:** ~1.8 KB  
**Role:** Fixed bottom tab bar for primary navigation.

#### Tabs

| Tab | Icon | View | Description |
|-----|------|------|-------------|
| Home | `Home` | `"home"` | Live loop feed |
| Create | `PlusCircle` | `"create"` | Create new loop |
| Chats | `MessageSquare` | `"chat-list"` | Active conversations |
| Profile | `User` | `"profile"` | Settings & account |

#### Visibility Rules

- **Visible**: `home`, `create`, `chat-list`, `profile`
- **Hidden**: `chat`, `ride-details`, `trusted-vehicles`

#### Active State

Active tab is highlighted with:
- Icon color: `#FFC554` (primary yellow)
- Background tint fill
- Label color change

---

### 9.12 Modal Components

#### `GenderModal.tsx`

**Size:** ~4.8 KB  
**Trigger:** First loop creation or join when `profile.gender` is null  
**Function:** Forces gender selection ("Male" or "Female") before allowing ride actions. Selection is persisted to `profiles.gender` in Supabase. Required for the "Girls Only" safety filter to work.

#### `TermsModal.tsx`

**Size:** ~3.8 KB  
**Function:** Displays terms of service and community guidelines. Shown on first app usage.

#### `CreatorModal.tsx`

**Size:** ~3 KB  
**Function:** About the creator — shows Sanjay Kamal S's profile photo (`/creator.jpg`), bio, and project credits.

#### `UserProfileModal.tsx`

**Size:** ~3.6 KB  
**Trigger:** Tapping any user's name/avatar in the chat or passenger list  
**Function:** Displays the selected user's profile card: avatar, display name, registration number, gender, and bio.

---

## 10. Real-Time Communication Engine

The chat system uses a **hybrid triple-engine approach** to guarantee message delivery regardless of network conditions.

### Engine 1: Supabase Realtime Broadcast (Primary — ~10ms)

```
Sender types message → sendMessage()
    │
    ├── INSERT into messages table (async)
    │
    └── supabase.channel("chat-{loopId}").send({
          type: "broadcast",
          event: "new-message",
          payload: { message }
        })
            │
            ▼
        All connected clients receive instantly
        via WebSocket (sub-10ms on good networks)
```

### Engine 2: 1-Second Background Polling (Safety Net)

```typescript
// Inside ChatView useEffect
const poller = setInterval(async () => {
  const { data } = await supabase
    .from("messages")
    .select("*, profiles:user_id(display_name, avatar_url, reg_no, gender, bio)")
    .eq("loop_id", loopId)
    .order("created_at", { ascending: true });

  // Merge with existing messages, deduplicate by ID
  setMessages(prev => deduplicateById([...prev, ...newMessages]));
}, 1000); // Every 1 second
```

**Why 1 second?** College Wi-Fi (VIT-AP) uses firewalls (Fortinet/SonicWall) that silently kill WebSocket connections. Mobile networks drop sockets when screens lock or apps switch. The 1-second poller guarantees no message is ever missed for more than 1 second.

### Engine 3: PostgreSQL CDC Events (Tertiary)

```typescript
supabase
  .channel("chat-{loopId}")
  .on("postgres_changes", {
    event: "INSERT",
    schema: "public",
    table: "messages",
    filter: `loop_id=eq.${loopId}`
  }, (payload) => {
    // Append new message from database change event
    setMessages(prev => deduplicateById([...prev, payload.new]));
  })
```

### Deduplication Strategy

All three engines may deliver the same message. The deduplication logic:

```typescript
function deduplicateById(messages: Message[]): Message[] {
  const seen = new Map<string, Message>();
  for (const msg of messages) {
    // Skip optimistic messages if real one arrived
    if (msg.id.startsWith("opt-") && seen.has(msg.id.replace("opt-", ""))) continue;
    seen.set(msg.id, msg);
  }
  return Array.from(seen.values())
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
}
```

### Optimistic UI

When a user sends a message:

```
1. Generate temporary ID: `opt-${Date.now()}`
2. Immediately append to local state (instant render)
3. INSERT into Supabase messages table (async)
4. When confirmed, replace optimistic message with real record
```

### Typing Indicators

```typescript
// Send typing state
supabase.channel("chat-{loopId}").track({
  user_id: session.user.id,
  display_name: profile.display_name,
  typing: true
});

// Auto-clear after 2 seconds of inactivity
setTimeout(() => {
  channel.track({ ...presence, typing: false });
}, 2000);

// Render on receiver side
const typingUsers = presenceState
  .filter(p => p.typing && p.user_id !== myId)
  .map(p => p.display_name);
// Shows: "Sanjay is typing..."
```

### Message Editing (5-Minute Rule)

```typescript
const canEdit = (msg) => {
  return msg.user_id === session.user.id &&
    Date.now() - new Date(msg.created_at).getTime() <= 300_000; // 5 minutes
};

// Double-tap to edit → shows inline editor
// On save:
await supabase
  .from("messages")
  .update({ content: editedText, edited_at: new Date().toISOString() })
  .eq("id", messageId);
```

### Emoji Reactions

Available reactions: `👍 ❤️ 😂 👎`

```typescript
// Toggle reaction (one per user per emoji per message)
const currentReactions = message.reactions || {};
const users = currentReactions[emoji] || [];

if (users.includes(myId)) {
  // Remove my reaction
  users.splice(users.indexOf(myId), 1);
} else {
  // Add my reaction
  users.push(myId);
}

await supabase
  .from("messages")
  .update({ reactions: { ...currentReactions, [emoji]: users } })
  .eq("id", message.id);
```

### Smart Scroll Engine

```typescript
function scrollToBottom(force: boolean = false) {
  const container = chatScrollRef.current;
  if (!container) return;

  const { scrollHeight, clientHeight } = container;

  // Only scroll if content actually overflows the viewport
  if (scrollHeight > clientHeight + 20) {
    container.scrollTop = scrollHeight - clientHeight;
  }
}
```

**Why this matters:** On mobile, short chat lists (1-2 messages) would scroll up and disappear behind the header when the keyboard opened. This check prevents scrolling until messages actually need it.

### Anti-Autofill Input

```html
<form action="javascript:void(0);" autoComplete="off">
  <input
    type="search"
    name="search"
    autoComplete="new-password"
    data-lpignore="true"
    data-1p-ignore="true"
    aria-autocomplete="none"
    enterKeyHint="send"
  />
</form>
```

**Why:** Android Chrome / Gboard detects `type="text"` inputs and shows a toolbar with 🔑 (passwords), 💳 (credit cards), and 📍 (addresses). Setting `type="search"` with `autoComplete="new-password"` completely bypasses this detection.

---

## 11. Design System

### Color Palette

| Token | Dark Mode | Light Mode | Usage |
|-------|-----------|------------|-------|
| `--bg` | `#000000` (OLED Black) | `#FFFFFF` | App canvas background |
| `--text` | `#FFFFFF` | `#000000` | Primary text |
| `--primary` | `#FFC554` | `#FFC554` | CTAs, branding, accents |
| `--card-bg` | `rgba(255,255,255,0.03)` | `rgba(0,0,0,0.02)` | Card surfaces |
| `--border` | `rgba(255,255,255,0.06)` | `rgba(0,0,0,0.08)` | Dividers, outlines |
| `--muted` | `rgba(255,255,255,0.4)` | `rgba(0,0,0,0.4)` | Labels, captions |

### Typography

- **Font Family:** Space Grotesk (Google Fonts)
- **Base Size:** 13px
- **Heading Weight:** 700-900
- **Label Style:** `font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.15em`

### Dot-Matrix Background

```css
.dot-matrix-bg {
  background-image: radial-gradient(
    circle,
    currentColor 1px,
    transparent 1px
  );
  background-size: 24px 24px;
  opacity: 0.07;
}
```

### Component Shapes

| Element | Border Radius |
|---------|--------------|
| Buttons (pill) | `28px` |
| Inputs | `20px` |
| Cards | `16px` |
| Avatars | `50%` (circle) |
| Modals | `24px` |

### Theme Transitions

```css
/* Smooth 250ms cross-fade on all theme-dependent properties */
* {
  transition: background-color 250ms ease,
              color 250ms ease,
              border-color 250ms ease;
}
```

### Responsive Design

- **Target:** Mobile-first, single viewport (`100dvh`)
- **Max Width:** Content fills screen edge-to-edge
- **Scroll Policy:** Only internal containers scroll (chat messages, loop feed). The page body never scrolls.
- **Touch Targets:** Minimum 44×44px with `active:scale-95` press feedback
- **Keyboard Handling:** `100dvh` prevents viewport resize on keyboard open

---

## 12. Supabase Query Reference

### Profiles

```sql
-- Fetch current user profile
SELECT display_name, theme, gender, reg_no, avatar_url, bio
FROM profiles WHERE id = $userId

-- Update profile
UPDATE profiles
SET display_name = $name, reg_no = $regNo, bio = $bio, updated_at = now()
WHERE id = $userId

-- Update theme
UPDATE profiles SET theme = $theme, updated_at = now()
WHERE id = $userId

-- Update gender
UPDATE profiles SET gender = $gender, updated_at = now()
WHERE id = $userId

-- Update avatar
UPDATE profiles SET avatar_url = $url, updated_at = now()
WHERE id = $userId
```

### Loops

```sql
-- Fetch all active loops with member count
SELECT *, loop_members(count)
FROM loops
WHERE status = 'active' AND expires_at > now()
ORDER BY created_at DESC

-- Create loop
INSERT INTO loops
  (creator_id, destination, start_point, departure_time,
   participants_limit, is_female_only, expires_at)
VALUES ($userId, $dest, $start, $time, $limit, $femaleOnly, $expiry)

-- Delete loop (soft delete)
UPDATE loops SET status = 'cancelled' WHERE id = $loopId

-- Update fare
UPDATE loops SET total_fare = $fare WHERE id = $loopId

-- Get user's created loops
SELECT id FROM loops WHERE creator_id = $userId
```

### Loop Members

```sql
-- Get members of a loop
SELECT user_id, profiles:user_id(display_name, gender, avatar_url, reg_no, bio)
FROM loop_members WHERE loop_id = $loopId

-- Join a loop
INSERT INTO loop_members (loop_id, user_id)
VALUES ($loopId, $userId)

-- Leave / kick from loop
DELETE FROM loop_members
WHERE loop_id = $loopId AND user_id = $userId

-- Get all loops user has joined
SELECT loop_id FROM loop_members WHERE user_id = $userId
```

### Messages

```sql
-- Fetch all messages for a loop
SELECT id, loop_id, user_id, content, created_at, edited_at, reactions,
       profiles:user_id(display_name, avatar_url, reg_no, gender, bio)
FROM messages
WHERE loop_id = $loopId
ORDER BY created_at ASC

-- Send message
INSERT INTO messages (loop_id, user_id, content)
VALUES ($loopId, $userId, $content)

-- Edit message
UPDATE messages
SET content = $newContent, edited_at = now()
WHERE id = $msgId AND user_id = $userId

-- Update reactions
UPDATE messages
SET reactions = $reactionsJson
WHERE id = $msgId
```

### Trusted Vehicles

```sql
-- Fetch all trusted drivers
SELECT *, profiles:user_id(display_name, avatar_url)
FROM trusted_vehicles
ORDER BY created_at DESC

-- Add a driver
INSERT INTO trusted_vehicles (user_id, driver_name, phone_number, vehicle_type)
VALUES ($userId, $name, $phone, $type)

-- Delete a driver
DELETE FROM trusted_vehicles WHERE id = $vehicleId AND user_id = $userId
```

### Storage (Avatars)

```typescript
// Upload avatar
const { data, error } = await supabase.storage
  .from("avatars")
  .upload(`${userId}/avatar.jpg`, file, {
    cacheControl: "3600",
    upsert: true
  });

// Get public URL
const { data: { publicUrl } } = supabase.storage
  .from("avatars")
  .getPublicUrl(`${userId}/avatar.jpg`);
```

---

## 13. TypeScript Interfaces

### File: `src/lib/types.ts` (82 lines)

```typescript
export type View = "home" | "create" | "chat-list" | "profile"
                 | "ride-details" | "chat" | "trusted-vehicles";

export interface Loop {
  id: string;
  creator_id: string;
  destination: string;
  departure_time: string;
  participants_limit: number;
  is_female_only: boolean;
  purpose?: string;
  expires_at: string;
  created_at: string;
  member_count?: number;
  status?: "open" | "started" | "in_progress" | "cancelled" | "ended" | "active";
  start_point?: string;
  total_fare?: number;
}

export interface Profile {
  display_name: string;
  theme: "dark" | "light";
  gender?: string;
  reg_no?: string;
  avatar_url?: string;
  bio?: string;
}

export interface Message {
  id: string;
  loop_id: string;
  user_id: string;
  content: string;
  created_at: string;
  edited_at?: string;
  reactions?: Record<string, string[]>;
  profiles?: {
    display_name: string;
    avatar_url?: string;
    reg_no?: string;
    gender?: string;
    bio?: string;
  };
}

export interface LoopMember {
  user_id: string;
  profiles: {
    display_name: string;
    gender: string;
    avatar_url?: string;
    reg_no?: string;
    bio?: string;
  } | null;
}

export interface LoopParticipant {
  id: string;
  loop_id: string;
  user_id: string;
  joined_at: string;
  profiles?: {
    display_name: string;
    avatar_url?: string;
    reg_no?: string;
    gender?: string;
    bio?: string;
  };
}

export interface ThemeClasses {
  isDark: boolean;
  bg: string;
  text: string;
  border: string;
  cardBg: string;
  mutedText: string;
}

export interface TrustedVehicle {
  id: string;
  user_id: string;
  driver_name: string;
  phone_number: string;
  vehicle_type: "bike" | "auto" | "share_auto";
  created_at: string;
  profiles?: { display_name: string; avatar_url?: string };
}
```

---

## 14. Configuration Files

### `next.config.ts`

```typescript
// Key settings:
{
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "**" },
      { protocol: "https", hostname: "**" }
    ]
  },
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true }
}
```

### `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "module": "esnext",
    "moduleResolution": "bundler",
    "jsx": "preserve",
    "strict": true,
    "paths": { "@/*": ["./src/*"] }
  }
}
```

### `globals.css` (Tailwind CSS 4 Config)

```css
@import "tailwindcss";

@theme {
  --color-primary: #FFC554;
  --font-space-grotesk: "Space Grotesk", sans-serif;
}
```

---

## 15. Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL (e.g., `https://abc123.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anonymous/public API key |

Both are prefixed with `NEXT_PUBLIC_` to be accessible in the browser (client-side rendering).

### Supabase Client Initialization

```typescript
// src/lib/supabase.ts (7 lines)
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
```

---

## 16. Deployment & CI/CD

### Hosting: Vercel

LOOP is deployed on **Vercel** with automatic deployments from the GitHub `main` branch.

### Deployment Pipeline

```
Developer pushes to `main` on GitHub
    │
    ▼
Vercel detects push via webhook
    │
    ▼
Vercel runs `npm run build` (Next.js production build)
    │
    ▼
Build artifacts deployed to Vercel's edge network
    │
    ▼
App is live at https://loop-app.vercel.app (or custom domain)
```

### Build Settings

| Setting | Value |
|---------|-------|
| Framework Preset | Next.js |
| Build Command | `next build` |
| Output Directory | `.next` |
| Install Command | `npm install` |
| Node.js Version | 18.x |
| Environment Variables | Set in Vercel Dashboard (Supabase keys) |

### Deployment Notes

- Every push to `main` triggers a production deployment
- Preview deployments are created for pull requests
- Environment variables must be configured in Vercel's dashboard
- `typescript.ignoreBuildErrors: true` and `eslint.ignoreDuringBuilds: true` are set in `next.config.ts` to prevent non-critical warnings from blocking deploys

---

## 17. Known Technical Challenges & Solutions

### Challenge 1: Messages Disappearing on Receiver

**Problem:** React `useEffect` had the entire `selectedLoop` object as a dependency. When any loop property changed (e.g., member count update), the effect re-ran and reset the messages array.

**Solution:** Changed dependency to `selectedLoop?.id` (a stable string reference) and added a `currentLoopIdRef` guard to prevent stale closures from overwriting messages.

---

### Challenge 2: Mobile Keyboard Pushing Layout Up

**Problem:** Android Chrome resizes the viewport when the soft keyboard opens. `scrollIntoView()` on the message container caused the entire page to scroll up, hiding the header and top messages.

**Solution:** Replaced `scrollIntoView()` with internal container `scrollTop` assignment. Added height overflow detection (`scrollHeight > clientHeight + 20`) to prevent scrolling short message lists that don't need it.

---

### Challenge 3: Gboard Password/Card Autofill Toolbar

**Problem:** Android Chrome detects `type="text"` inputs and triggers Gboard's autofill toolbar showing password (🔑), credit card (💳), and address (📍) buttons over the keyboard.

**Solution:** Changed chat input to `type="search"` with `autoComplete="new-password"` inside a `<form autoComplete="off">`. Added `data-lpignore="true"` and `data-1p-ignore="true"` to block third-party password managers.

---

### Challenge 4: WebSocket Messages Missed on Mobile

**Problem:** College Wi-Fi (VIT-AP uses Fortinet/SonicWall firewalls) and mobile network handoffs silently kill WebSocket connections without triggering `onclose` events.

**Solution:** Added a 1-second `setInterval` background poller as a safety net. Combined with WebSocket Broadcast and PostgreSQL CDC, this gives three independent delivery paths with deduplication.

---

### Challenge 5: SSL Certificate Errors on College Network

**Problem:** VIT-AP Wi-Fi uses SSL inspection that intercepts and re-signs HTTPS certificates for `.vercel.app` subdomains, causing `ERR_CERT_AUTHORITY_INVALID` errors.

**Solution:** Recommended DNS-over-HTTPS (DoH) configuration in Chrome settings to bypass SSL inspection. Long-term fix: custom domain with direct certificate.

---

### Challenge 6: App Layout Side Gaps

**Problem:** Setting `position: fixed` on `html, body` to prevent viewport resize on keyboard open caused the layout to shrink with visible gaps on the sides.

**Solution:** Reverted `position: fixed` and used `100dvh` (dynamic viewport height) instead, which properly handles mobile browser chrome and keyboard states.

---

## 18. Glossary

| Term | Definition |
|------|-----------|
| **Loop** | A temporary ride coordination session — created, joined, used, and closed |
| **Host / Creator** | The user who created a loop and has admin controls (fare, kick, delete) |
| **Member / Passenger** | A user who has joined an existing loop |
| **Girls Only** | A loop restricted to female-identified users (enforced via `profiles.gender`) |
| **Fare Split** | Auto-calculated per-person cost: `Total Fare ÷ Number of Members` |
| **Trusted Driver** | A community-verified local auto/cab driver added to the shared directory |
| **Optimistic UI** | Pattern where UI updates instantly before server confirmation |
| **CDC** | Change Data Capture — PostgreSQL triggers that push row changes to Supabase Realtime |
| **RLS** | Row Level Security — PostgreSQL policies that restrict data access per user |
| **DVH** | Dynamic Viewport Height — CSS unit that accounts for mobile browser chrome |
| **Dot Matrix** | The signature CSS background pattern using radial gradients |
| **OTP** | One-Time Password — 6-digit email verification code for new signups |
| **Broadcast** | Supabase Realtime WebSocket channel for instant peer-to-peer message delivery |
| **Presence** | Supabase Realtime feature for tracking online users and typing state |

---

> **LOOP** — Purpose-Based Ride Coordination  
> Built by **Sanjay Kamal S** · 24MIC7130 · VIT-AP University, SCOPE  
> August 2026
