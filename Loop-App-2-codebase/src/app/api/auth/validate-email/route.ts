import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const DEVELOPER_WHITELIST = [
  'sanjaykamal2006@gmail.com',
];

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

    // 1. Permanent developer whitelist & optional env whitelist
    const envWhitelist = (process.env.ALLOWED_EXTERNAL_EMAILS || '')
      .toLowerCase()
      .split(',')
      .map((e) => e.trim())
      .filter(Boolean);

    if (DEVELOPER_WHITELIST.includes(email) || envWhitelist.includes(email)) {
      return NextResponse.json({ allowed: true, type: 'whitelisted' });
    }

    // 2. Educational / College domains - always allowed without quota
    if (isEducationalDomain(email)) {
      return NextResponse.json({ allowed: true, type: 'student' });
    }

    // 3. For external emails:
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseServiceKey || !supabaseUrl) {
      if (isLogin) {
        return NextResponse.json({ allowed: true, type: 'external_login_fallback' });
      }
      return NextResponse.json({
        allowed: false,
        reason: '🎓 Please use your official VIT-AP student email (name.rollno@vitapstudent.ac.in).',
      });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data, error } = await adminClient.auth.admin.listUsers();

    if (error || !data) {
      console.error('Error fetching auth users for external limit:', error);
      if (isLogin) {
        return NextResponse.json({ allowed: true, type: 'external_login_attempt' });
      }
      return NextResponse.json({
        allowed: false,
        reason: 'Could not verify external registration quota. Please try again.',
      });
    }

    const existingUser = data.users.find((u) => (u.email || '').toLowerCase() === email);

    // If logging in: allow attempt through to Supabase auth
    if (isLogin) {
      return NextResponse.json({ allowed: true });
    }

    // If signing up and user already exists, allow them to proceed to login/signup handler
    if (existingUser) {
      return NextResponse.json({ allowed: true });
    }

    // Count external registered users (excluding developer whitelist)
    const externalUsers = data.users.filter((u) => {
      const userEmail = (u.email || '').toLowerCase();
      if (DEVELOPER_WHITELIST.includes(userEmail) || envWhitelist.includes(userEmail)) {
        return false;
      }
      return !isEducationalDomain(userEmail);
    });

    const maxExternal = parseInt(process.env.MAX_EXTERNAL_EMAILS || '15', 10) || 15;
    const currentCount = externalUsers.length;

    if (currentCount >= maxExternal) {
      return NextResponse.json({
        allowed: false,
        reason: `🎓 External signup quota reached (${currentCount}/${maxExternal}). Please use your official VIT-AP student email (name.rollno@vitapstudent.ac.in).`,
      });
    }

    return NextResponse.json({
      allowed: true,
    });
  } catch (err: any) {
    console.error('validate-email route error:', err);
    return NextResponse.json(
      { allowed: false, error: err?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
