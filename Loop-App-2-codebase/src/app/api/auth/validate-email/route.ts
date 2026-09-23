import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function getAdminWhitelist(): string[] {
  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .toLowerCase()
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean);

  const allowedExternal = (process.env.ALLOWED_EXTERNAL_EMAILS || '')
    .toLowerCase()
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean);

  return Array.from(new Set([...adminEmails, ...allowedExternal]));
}

function isEducationalDomain(email: string): boolean {
  const domain = (email.split('@')[1] || '').toLowerCase();
  const isVitAp = domain.includes('vitap');
  return (
    isVitAp ||
    domain.endsWith('.ac.in') ||
    domain.endsWith('.edu.in') ||
    domain.endsWith('.edu') ||
    domain.includes('student') ||
    domain.includes('college') ||
    domain.includes('univ')
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = (body?.email || '').toLowerCase().trim();
    const isLogin = Boolean(body?.isLogin);

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { allowed: false, reason: 'Please enter a valid email address.' },
        { status: 400 }
      );
    }

    // 1. Configured Admin / Developer whitelist
    const whitelist = getAdminWhitelist();
    if (whitelist.includes(email)) {
      return NextResponse.json({ allowed: true, type: 'whitelisted' });
    }

    // 2. Educational / College domains - always allowed without quota
    if (isEducationalDomain(email)) {
      return NextResponse.json({ allowed: true, type: 'student' });
    }

    // 3. If logging in: allow attempt through to Supabase auth for credential verification
    if (isLogin) {
      return NextResponse.json({ allowed: true });
    }

    // 4. For external non-educational signups: verify registration quota
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseServiceKey || !supabaseUrl) {
      return NextResponse.json({
        allowed: false,
        reason: '🎓 Please use your official college email (name.rollno@vitapstudent.ac.in).',
      });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const maxExternal = parseInt(process.env.MAX_EXTERNAL_EMAILS || '100', 10) || 100;
    let currentExternalCount: number | null = null;

    // Fast path: Database RPC count_external_users()
    const { data: rpcCount, error: rpcError } = await adminClient.rpc('count_external_users');
    if (!rpcError && typeof rpcCount === 'number') {
      currentExternalCount = rpcCount;
    } else {
      // Fallback: Paginated Auth user scan (avoids 50-user default limit)
      let page = 1;
      let totalExt = 0;
      let hasMore = true;

      while (hasMore && page <= 10) {
        const { data: pageData, error: pageErr } = await adminClient.auth.admin.listUsers({
          page,
          perPage: 1000,
        });

        if (pageErr || !pageData?.users || pageData.users.length === 0) {
          hasMore = false;
          break;
        }

        for (const u of pageData.users) {
          const userEmail = (u.email || '').toLowerCase();
          if (userEmail === email) {
            // User already exists, allow to proceed to auth handler
            return NextResponse.json({ allowed: true });
          }
          if (!isEducationalDomain(userEmail) && !whitelist.includes(userEmail)) {
            totalExt += 1;
          }
        }

        if (pageData.users.length < 1000) {
          hasMore = false;
        } else {
          page += 1;
        }
      }
      currentExternalCount = totalExt;
    }

    if (currentExternalCount !== null && currentExternalCount >= maxExternal) {
      return NextResponse.json({
        allowed: false,
        reason: `🎓 External signup quota reached (${currentExternalCount}/${maxExternal}). Please use your official student email (name.rollno@vitapstudent.ac.in).`,
      });
    }

    return NextResponse.json({ allowed: true });
  } catch (err: any) {
    console.error('validate-email route exception:', err?.message || 'Unknown');
    return NextResponse.json(
      { allowed: false, error: 'Unable to validate email at this time. Please try again.' },
      { status: 500 }
    );
  }
}
