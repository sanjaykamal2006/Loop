# LOOP Domain Model & Ubiquitous Language

**Last Updated:** 2026-10-10  
**Status:** Active

This document defines the shared vocabulary used across LOOP's codebase, database, and user interface. Use these exact terms in code, docs, and conversation to avoid confusion.

---

## Core Concepts

### **Loop**
A temporary coordination group for a shared trip.

**NOT**: "ride", "trip", "group", "carpool"

**Properties:**
- Created by one Creator
- Has: destination, departure time, participant limit (2-10 seats)
- Can be: regular or female-only
- Lifecycle: Active until departure time + 2 hours (auto-deleted)

**Examples:**
- "I created a loop to CMR Central"
- "Join my loop leaving at 3 PM"
- "This loop has 3/5 seats filled"

---

### **Creator**
The user who creates a loop and provides the transportation.

**NOT**: "driver", "owner", "organizer", "admin"

**Responsibilities:**
- Sets: destination, departure time, seat capacity, gender restriction
- Provides: actual transportation (auto/bike/van)
- Can: edit loop details, send messages, delete loop
- Cannot: leave their own loop (must delete it instead)

**Database field:** `creator_id` in `loops` table

---

### **Member**
A user who joins an existing loop.

**NOT**: "passenger", "participant", "rider", "joiner"

**Actions:**
- Can: send messages, view other members, leave loop
- Cannot: edit loop details, invite others, delete loop

**Database field:** `loop_members` table with `user_id` + `loop_id`

---

### **Profile**
A user's persistent identity across all loops.

**Required fields:**
- Display name (editable)
- Registration number (editable, VIT-AP student ID)
- Gender (one-time selection, used for female-only enforcement)
- Avatar (optional, compressed to 20-40KB WebP/JPEG)

**NOT**: "account", "user profile", "bio"

---

### **Message**
A text communication sent within a loop's chat.

**Properties:**
- Sent by: Creator OR Member
- Visible to: All loop participants
- Can be: edited (5 min window), deleted (creator only), copied
- Contains: plain text (no images/files)

**Special message types:**
- Return trip messages: contain `[return_loop:ID]` marker
- System messages: departure time changes, member joins/leaves

---

### **Trusted Vehicle**
A pre-approved vehicle saved to a user's profile for instant loop creation.

**NOT**: "saved vehicle", "favorite vehicle", "registered vehicle"

**Purpose:** Skip vehicle entry step when creating loops repeatedly with the same vehicle

**Properties:**
- Vehicle number (registration plate)
- Vehicle type (auto/bike/car/van)
- Owned by: one user (creator)

**Database table:** `trusted_vehicles`

---

### **Female-Only Loop**
A gender-restricted loop where only the creator OR female members can participate.

**NOT**: "women's loop", "ladies-only", "female ride"

**Rules:**
- Male creator: Can create but cannot join as member
- Female creator: Can create and is automatically a participant
- Male users: Cannot join, blocked at UI + API + DB trigger
- Enforcement: 3-tier (UI regex, Edge API, DB RLS policy)

**Database field:** `is_female_only` (boolean) in `loops` table

---

### **Return Trip**
An automated reverse loop created from an existing loop.

**NOT**: "reverse loop", "return ride", "back trip"

**Behavior:**
- Creates new loop: same route, opposite direction
- Scheduled: future departure time set by creator
- Marker: generates `[return_loop:ORIGINAL_LOOP_ID]` message
- Independent: deleting return trip doesn't affect original

**Example flow:**
1. User creates loop: "Amaravati Gate → CMR Central @ 3 PM"
2. User creates return trip: "CMR Central → Amaravati Gate @ 5 PM"
3. Return trip appears in active loops as separate loop

---

### **Institutional Email**
A verified VIT-AP university email address used for authentication.

**Allowed domains:**
- `vitapstudent.ac.in` (students)
- `vitap.ac.in` (faculty/staff)

**Validation:** 3-tier enforcement (patent-pending)
1. **UI Layer:** Regex validation on client
2. **Edge API:** Server validation + rate limiting (10 req/10 min)
3. **DB Trigger:** PostgreSQL-level enforcement (cannot be bypassed)

**Rejected patterns:**
- Plus-addressing: `user+spam@vitapstudent.ac.in` (blocked)
- Domain spoofing: `vitapstudent.ac.in.evil.com` (blocked)

---

### **Emergency Contact**
A trusted person who receives SOS alerts when a user triggers emergency mode.

**NOT**: "contact", "emergency number", "SOS contact"

**Properties:**
- Name (required)
- Phone number (required, Indian format)
- Relationship (optional)
- Set by: each user for themselves (private, not visible to others)

**Database table:** `emergency_contacts` (RLS: user-scoped)

---

### **SOS (Emergency System)**
Zero-backend emergency alert system triggered when user feels unsafe.

**NOT**: "panic button", "emergency mode", "help button"

**Architecture:** Client-only (no server/API calls)
- GPS acquisition: high-accuracy mode (8s timeout)
- Message generation: live coordinates + loop details
- WhatsApp integration: pre-filled message to emergency contacts
- Direct telephony: `tel:112` (Indian emergency number)

**Trigger locations:** Profile page, Chat view (always accessible)

---

### **Active Loop**
A loop whose departure time is in the future.

**NOT**: "upcoming loop", "scheduled loop", "pending loop"

**Lifecycle:**
- Appears in: Home view, Chat List view
- Sorted by: nearest departure time first
- Becomes past loop: 2 hours after departure time

---

### **Past Loop**
A loop whose departure time has passed + 2 hours grace period.

**NOT**: "completed loop", "finished loop", "archived loop"

**Properties:**
- Read-only: cannot edit, cannot send messages
- Visible in: Past Loops view only
- Auto-deleted: after 30 days (database cleanup job)

---

### **Concurrency Mutex**
Atomic database lock preventing race conditions when multiple users join a loop simultaneously.

**Implementation:** `SELECT ... FOR UPDATE` in PostgreSQL

**Example scenario:**
- Loop has 1 seat remaining
- 5 users click "Join" at the same instant
- Mutex ensures: only 1 user gets the seat
- Other 4 get: "Loop is now full" error

**Database trigger:** `prevent_loop_overfill` in `supabase/migrations/`

---

### **Rate Limiting**
Request throttling using Upstash Redis to prevent abuse.

**Limits:**
- Email validation: 10 requests per 10 minutes per IP
- OTP requests: 5 requests per 15 minutes per email
- Loop creation: 20 loops per hour per user

**Fallback:** Local in-memory map (development only)

**Implementation:** `src/lib/rateLimit.ts`

---

## Database Schema Terms

### **`loops` table**
Core table storing all loop information.

**Key fields:**
- `id` (UUID) - Unique loop identifier
- `creator_id` (UUID) - References `profiles.id`
- `destination` (text) - Where the loop is going
- `departure_time` (timestamptz) - When leaving
- `participants_limit` (int) - Total capacity (2-10)
- `is_female_only` (bool) - Gender restriction flag
- `status` (text) - "active" or "past"

---

### **`loop_members` table**
Junction table for many-to-many relationship between users and loops.

**Key fields:**
- `loop_id` (UUID) - References `loops.id`
- `user_id` (UUID) - References `profiles.id`
- `joined_at` (timestamptz) - When user joined

**Constraints:**
- Unique: one user can join a loop only once
- Capacity check: `prevent_loop_overfill` trigger
- Gender check: `enforce_female_only` RLS policy

---

### **`messages` table**
All chat messages sent within loops.

**Key fields:**
- `loop_id` (UUID) - References `loops.id`
- `sender_id` (UUID) - References `profiles.id`
- `content` (text) - Message text
- `created_at` (timestamptz) - Send time
- `edited_at` (timestamptz, nullable) - Last edit time

**RLS Policy:** Users can only read messages from loops they're in (IDOR protection)

---

## UI/UX Terms

### **View**
One of the main screens in LOOP's single-page app architecture.

**Available views:**
- `home` - Active loops feed
- `create` - Loop creation form
- `chat-list` - User's joined loops
- `chat` - Individual loop chat
- `profile` - User settings
- `ride-details` - Loop details page
- `trusted-vehicles` - Saved vehicles
- `past-loops` - Historical loops

**State management:** `LoopContext` (React Context)

---

### **Bottom Navigation**
Fixed navigation bar at screen bottom (mobile-first design).

**Visible on:** Home, Create, Chat List, Profile
**Hidden on:** Chat, Ride Details (full-screen views)

**Buttons:** Home, Create, Chats, Profile

---

### **Theme**
Visual appearance mode (light or dark).

**Options:**
- Light: White background (#FFFFFF), black text
- Dark: Pure black background (#000000), white text

**Accent color:** Yellow (#FFC554) - consistent across both themes

**Toggle location:** Profile page

---

## Anti-Patterns (What NOT to Call Things)

❌ **Don't say "ride"** → Use "loop"
❌ **Don't say "driver"** → Use "creator"
❌ **Don't say "passenger"** → Use "member"
❌ **Don't say "carpool"** → Use "loop" or "coordination"
❌ **Don't say "booking"** → Use "joining a loop"
❌ **Don't say "trip"** → Use "loop"
❌ **Don't say "route"** → Use "destination"
❌ **Don't say "host"** → Use "creator"

---

## Design Principles

### **Temporary Coordination, Not Social Network**
- No followers, likes, comments outside loops
- No user profiles visible to others (except in active loops)
- No persistent friendships or connections
- Loops auto-delete after purpose served

### **Mobile-First, Single-Screen Flows**
- No vertical scrolling on core flows
- One-hand friendly (bottom nav, thumb-reachable buttons)
- 28px pill-shaped inputs and rounded buttons
- Dot-matrix background pattern (theme-aware)

### **Institutional Security First**
- VIT-AP emails only (3-tier validation)
- No external signups without admin approval
- Rate limiting on all auth endpoints
- RLS policies on all database tables

---

## Related Documents

- **AGENTS.md** - Project summary and tech stack
- **ADRs/** - Architecture decision records (why we made key choices)
- **README.md** - Setup and development guide
- **Security Audit Reports** - Phase 1-3 testing results

---

**Questions about terminology?** File an issue or update this document.
