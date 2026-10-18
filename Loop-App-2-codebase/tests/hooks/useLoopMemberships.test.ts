import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLoopMemberships } from '@/lib/hooks/useLoopMemberships';
import type { Session } from '@supabase/supabase-js';
import type { Loop, Profile } from '@/lib/types';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn((table: string) => ({
      select: vi.fn(() => ({
        eq: vi.fn().mockImplementation(() => {
          if (table === 'loop_members') {
            return Promise.resolve({ data: [{ loop_id: 'loop-joined-1' }], error: null });
          }
          if (table === 'loops') {
            return Promise.resolve({ data: [{ id: 'loop-created-1' }], error: null });
          }
          return Promise.resolve({ data: [], error: null });
        }),
      })),
      insert: vi.fn(() => ({
        select: vi.fn().mockResolvedValue({ data: [{ id: 'mem-1' }], error: null }),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        })),
      })),
    })),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    })),
    removeChannel: vi.fn(),
  },
}));

vi.mock('@/components/ui/NativeToast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

const mockSession: Session = {
  access_token: 'fake',
  refresh_token: 'fake',
  expires_in: 3600,
  token_type: 'bearer',
  user: {
    id: 'user-hook-1',
    email: 'sanjay.24mic7130@vitapstudent.ac.in',
    aud: 'authenticated',
    app_metadata: {},
    user_metadata: {},
    created_at: new Date().toISOString(),
  },
};

const mockProfile: Profile = {
  display_name: 'Sanjay Kamal',
  theme: 'dark',
  reg_no: '24MIC7130',
  gender: 'male',
};

const mockLoop: Loop = {
  id: 'loop-target-1',
  creator_id: 'other-user',
  start_point: 'Campus',
  destination: 'Vijayawada',
  departure_time: new Date(Date.now() + 3600000).toISOString(),
  participants_limit: 4,
  member_count: 1,
  status: 'open',
  vehicle_type: 'car',
  is_female_only: false,
  purpose: 'general',
  created_at: new Date().toISOString(),
  expires_at: new Date(Date.now() + 4 * 3600000).toISOString(),
};

describe('useLoopMemberships Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('initializes with empty joined and created lists when no cache exists', () => {
    const { result } = renderHook(() =>
      useLoopMemberships({
        session: mockSession,
        profile: mockProfile,
        setView: vi.fn(),
        selectedLoop: null,
        setSelectedLoop: vi.fn(),
        setActiveLoops: vi.fn(),
        setChatSource: vi.fn(),
        setShowGenderSelect: vi.fn(),
        setPendingAction: vi.fn(),
        fetchLoops: vi.fn().mockResolvedValue(undefined),
      })
    );

    expect(result.current.userJoinedLoops).toEqual([]);
    expect(result.current.userLoops).toEqual([]);
    expect(result.current.isJoining).toBe(false);
    expect(result.current.isDeleting).toBe(false);
  });

  it('fetches memberships and updates userJoinedLoops and userLoops', async () => {
    const { result } = renderHook(() =>
      useLoopMemberships({
        session: mockSession,
        profile: mockProfile,
        setView: vi.fn(),
        selectedLoop: null,
        setSelectedLoop: vi.fn(),
        setActiveLoops: vi.fn(),
        setChatSource: vi.fn(),
        setShowGenderSelect: vi.fn(),
        setPendingAction: vi.fn(),
        fetchLoops: vi.fn().mockResolvedValue(undefined),
      })
    );

    await act(async () => {
      await result.current.fetchUserMemberships(true);
    });

    expect(result.current.userJoinedLoops).toContain('loop-joined-1');
    expect(result.current.userLoops).toContain('loop-created-1');
  });

  it('prompts profile completion if user tries to join with incomplete profile', async () => {
    const setShowGenderSelect = vi.fn();
    const setPendingAction = vi.fn();

    const { result } = renderHook(() =>
      useLoopMemberships({
        session: mockSession,
        profile: { display_name: '', theme: 'dark', reg_no: '', gender: null },
        setView: vi.fn(),
        selectedLoop: null,
        setSelectedLoop: vi.fn(),
        setActiveLoops: vi.fn(),
        setChatSource: vi.fn(),
        setShowGenderSelect,
        setPendingAction,
        fetchLoops: vi.fn().mockResolvedValue(undefined),
      })
    );

    await act(async () => {
      await result.current.joinLoop(mockLoop);
    });

    expect(setPendingAction).toHaveBeenCalledWith({ type: 'join', data: mockLoop });
    expect(setShowGenderSelect).toHaveBeenCalledWith(true);
  });
});
