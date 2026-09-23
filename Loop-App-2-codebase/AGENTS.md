## Project Summary
LOOP is a real-time, purpose-based coordination platform designed as a mobile-first responsive website. It allows users to connect with others going to the same destination or doing the same thing at the same time. The app emphasizes speed, utility, and temporary coordination without social media distractions.

## Tech Stack
- Framework: Next.js 15 (App Router)
- Language: TypeScript
- Backend: Supabase (Auth, Database, Realtime)
- Styling: Tailwind CSS 4
- Icons: Lucide React
- Components: Custom React components with focus on mobile-first, single-screen flows

## Architecture
- `src/app/`: Next.js app router pages.
- `src/components/sections/`: Core app views (`AuthLogin.tsx`, `MainApp.tsx`).
- `src/lib/`: Supabase client and utilities.
- `src/app/globals.css`: Global styles including dot-matrix background pattern.

## User Preferences
- Theme: Dark (Pure black #000000) & Light (White #FFFFFF)
- Primary Color: Yellow (#FFC554)
- Font: Space Grotesk (High-end tech aesthetic)
- Responsive Design: Mobile-perfect (no vertical scrolling)
- Component Style: Pill-shaped inputs and rounded buttons (28px)
- Login UI: Minimalist, large bold "LOOP" title, no logo boxes, pure black background with subtle dot matrix.

## Project Guidelines
- Core flows must fit within one mobile screen (no vertical scrolling).
- Minimalistic and neat aesthetic with dot-matrix background.
- One-time 6-digit OTP verification for new account creation (Signup).
- Simple Email/Password authentication for login with rate limit error handling.
- One-hand friendly UI with large touch targets.
- Real-time coordination and chat functionality.
- Support for display name and Registration Number (Reg. No) editing.
- Bottom navigation is visible on Home, Create, Chat List, and Profile views.
- Bottom navigation is hidden in Chat and Ride Details views.
- Theme toggle is located on the Profile page.

## Common Patterns
- View-based state management within `MainApp`.
- Supabase Realtime for live chat and loop updates.
- Theme-aware dot-matrix background texture.
- Seat selection in 2-row layout (2-10).
