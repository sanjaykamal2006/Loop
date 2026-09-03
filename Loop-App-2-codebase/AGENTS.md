## Project Summary
LOOP is a real-time, purpose-based campus coordination platform designed as a mobile-first Progressive Web App (PWA). It connects university students (primarily VIT-AP) traveling to the same transit hubs or destinations at the same time. The app emphasizes speed, zero social-media clutter, instant coordination, and safety.

## Tech Stack
- Framework: Next.js 15 (App Router, Turbopack)
- Language: TypeScript
- Backend: Supabase (Auth, PostgreSQL, Realtime WebSockets, Storage)
- Styling: Tailwind CSS 4 (Custom tokens for `#000000`, `#121214`, and `#FFC554`)
- Icons: Lucide React & Custom SVG Vehicle Icons (`src/components/ui/VehicleIcons.tsx`)
- Components: Single-screen mobile-first React views (`MainApp.tsx`)

## Architecture & File Structure
- `src/app/`: Next.js app router pages & PWA manifest.
- `src/components/sections/`:
  - `AuthLogin.tsx`: Minimalist email/password auth, OTP verification, pre-checks via `check_user_exists` RPC.
  - `MainApp.tsx`: Central view router.
  - `HomeView.tsx`: Active rides feed (within 5h), search filter, dynamic vehicle icon & steering wheel badge.
  - `CreateView.tsx`: New ride creation, "Offering a Ride" day-scholar driver toggle, vehicle selector (Scooter/Bike/Car), seat locks.
  - `RideDetailsView.tsx`: Passenger list with 0px layout shift skeleton reservation, fare splitter (hidden for personal driver rides), delete/leave actions.
  - `ChatView.tsx`: Real-time WebSocket chat, typing presence, reactions, 1-tap formatted WhatsApp ride invite.
  - `ChatListView.tsx`: Active conversations list.
  - `ProfileView.tsx`: User details, reg. no, avatar upload, account deletion (`delete_user_account` RPC).
  - `AppHeader.tsx`: Contextual back navigation (returns to `ride-details` if entered from ride, `chat-list` if from list), ⚙️ Settings menu (Theme, Past Loops, Telugu Auto Guide).
  - `TeluguGuideModal.tsx`: Non-meter Telugu auto negotiation phrases with search, phonetic copy, and "Driver Display Mode".
  - `GenderModal.tsx`: Profile completion guard (Name, Reg. No, Gender).
  - `TrustedVehiclesView.tsx` & `ExpectedFaresModal.tsx`: Community verified driver directory and campus fare tables.
- `src/lib/`:
  - `LoopContext.tsx`: Global state, Supabase realtime subscriptions, profile caching in `localStorage`, 5-hour cutoff filtering.
  - `types.ts`: TypeScript interfaces for `Loop`, `Profile`, `Message`, `LoopMember`.
  - `supabase.ts`: Supabase client initialization.

## User Preferences & Design System
- Theme: Dark (Pure black `#000000`) & Light (Warm white `#FFFFFF` / `#EFE9DF`)
- Primary Accent: Yellow (`#FFC554` / `#FFC53D`)
- Font: Space Grotesk
- Single-Screen Rule: Core flows MUST fit within one mobile screen without vertical scrolling.
- UI Style: Pill-shaped inputs (`rounded-2xl`), rounded buttons (`rounded-[20px]`), dot-matrix background pattern.

## Key Features & Business Logic
1. **Day Scholar / Student Driver Mode ("Offering a Ride")**:
   - Creator can toggle "Offering a Ride" for personal vehicles.
   - Scooter & Bike automatically lock passenger limit to **1 seat**.
   - Car allows 1–4 seats.
   - Cards display matching vehicle icon on left and a **Steering Wheel badge** on right before the departure time.
   - Commercial Fare Splitter is hidden on ride details in favor of a "Personal Vehicle Drop • Coordinate in chat" pill.
2. **5-Hour Automatic Expiration**:
   - Loops older than 5 hours automatically expire to `status = 'ended'` via `expire_old_loops()` PostgreSQL RPC and client-side cutoff filter.
3. **1-Tap WhatsApp Ride Invite**:
   - Replaced static SOS with active formatted WhatsApp share: destination, departure time, seats left, and link.
4. **Telugu Auto Phrases Guide**:
   - Located exclusively in the ⚙️ Settings menu dropdown in `AppHeader.tsx` (not cluttering Profile body).
   - Contains approved non-meter student negotiation phrases with high-contrast "Show to Driver" mode.
5. **Zero Layout Shift (CLS)**:
   - Passengers section in `RideDetailsView` uses pre-calculated skeleton rows so action buttons (Open Chat, Delete Loop) never jump or cause mis-clicks.
6. **Contextual Navigation**:
   - Chat Back chevron `<` returns directly to `RideDetailsView` when opened from a ride, rather than dumping to `ChatListView`.
7. **Profile Persistence**:
   - Profile is cached in `localStorage` for instant 0-millisecond access, preventing premature "Complete Profile" popups.
8. **Security & Data Deletion**:
   - `check_user_exists(email)` RPC prevents password reset spam to deleted/non-existent accounts.
   - `delete_user_account()` RPC provides full cascading GDPR/DPDP-compliant account purging.
