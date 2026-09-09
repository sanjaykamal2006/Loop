# Supabase Free Tier Maximization Guide for LOOP

This document details all optimizations implemented to maximize the capacity of the **Supabase Free Tier** before needing to upgrade to the $25/mo Pro tier.

---

## 1. Free Tier Optimization Summary

| Area | Before | After | Benefit |
|------|--------|-------|---------|
| **Realtime Subscriptions** | Always connected | Unsubscribes when tab is hidden | **~4x concurrent user capacity** |
| **Initial Message Fetch** | All messages | 25 messages with "Load More" cursor | **~80% reduction in query payload** |
| **Initial Ride Fetch** | All active rides | 30 rides limit | **Prevents massive response payloads** |
| **Data Retention** | Permanent growth | Auto-cleanup rides > 7 days | **Prevents 500MB DB storage limit breach** |
| **Audio Synthesis** | External CDN audio | Web Audio API synthesizer | **Zero external bandwidth, instant chime** |

---

## 2. Realtime Tab Visibility Optimization

### How It Works:
- **`ChatView.tsx`**: When a user switches tabs or puts their phone to sleep, the WebSocket channel is immediately closed, freeing up one of the ~200 free-tier concurrent connection slots.
- When the tab becomes visible again, the app seamlessly refetches the latest messages and re-establishes the subscription.
- **`ChatListView.tsx`**: Unsubscribes from recent message listeners when backgrounded.
- **`LoopContext.tsx`**: Has a 15-second grace period before disconnecting global ride listeners when backgrounded.

### Impact:
If you have 200 registered users, but only 40 have the tab actively open on their screen at any given second, Supabase will see only **40 active connections** instead of 200!

---

## 3. Cursor-Based Message Pagination

### How It Works:
- When entering a chat, only the **25 most recent messages** are fetched.
- If there are more than 25 messages, a subtle **"↑ Load older messages"** button appears at the top of the chat.
- Clicking it loads the previous 25 messages using `.lt('created_at', oldestTimestamp)` without reloading existing messages.

### Impact:
Even if a ride chat has 500 messages, it only loads 25 on entry, keeping database memory usage and network transfer tiny.

---

## 4. Automatic Database Cleanup (Rides > 7 Days)

### Setup in Supabase:
1. Go to your [Supabase SQL Editor](https://supabase.com/dashboard/project/_/sql).
2. Open `supabase/migrations/20260909_cleanup_old_rides.sql` and run the script.
3. This creates a secure stored procedure `cleanup_old_rides()` that cascades and deletes:
   - Chat messages older than 7 days
   - Member associations older than 7 days
   - Completed/cancelled rides older than 7 days

### Triggering Cleanup (Free Automated Cron):
We added an endpoint at `/api/cleanup`. You can set up a free scheduled cron ping:
1. Go to [cron-job.org](https://cron-job.org) (100% free forever).
2. Create a new cron job:
   - **URL**: `https://your-vercel-domain.vercel.app/api/cleanup`
   - **Method**: `POST`
   - **Schedule**: Every Sunday at midnight (or daily at 3 AM)
   - **Headers**: `Authorization: Bearer YOUR_CLEANUP_CRON_SECRET`
3. Add `CLEANUP_CRON_SECRET=your-random-token` to your Vercel Environment Variables.

---

## 5. Capacity Benchmarks on Free Tier

With these optimizations in place:

| Metric | Estimated Safe Capacity |
|--------|--------------------------|
| **Registered Students** | 500 - 1,500 students |
| **Simultaneously Active Screen-On Users** | 100 - 150 users |
| **Rides Created per Day** | 50 - 100 rides |
| **Chat Messages per Day** | 2,000 - 5,000 messages |
| **Database Storage Footprint** | Stays under ~50MB (Limit is 500MB) |

---

## 6. When to Upgrade to Supabase Pro ($25/mo)

Monitor your Supabase dashboard (**Project Settings → Usage**). Upgrade only when:
- Active database connections consistently exceed **80% of limit**
- Monthly database egress reaches **1.5 GB** (Free tier limit is 2 GB)
- Realtime messages per month exceed **1.5 million** (Free tier limit is 2 million)
- You have **200+ daily active student commuters** regularly using the app!
