import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useEmergencySos } from '@/lib/hooks/useEmergencySos';
import { supabase } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';
import type { Loop, EmergencyContact } from '@/lib/types';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

vi.mock('@/lib/haptics', () => ({
  triggerHaptic: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    captureException: vi.fn(),
  },
}));

type MockFn = ReturnType<typeof vi.fn>;
const fromMock = supabase.from as unknown as MockFn;
const rpcMock = supabase.rpc as unknown as MockFn;

const uid = 'sos-user-1';

const mockSession: Session = {
  access_token: 'fake',
  refresh_token: 'fake',
  expires_in: 3600,
  token_type: 'bearer',
  user: {
    id: uid,
    email: 'sanjay.24mic7130@vitapstudent.ac.in',
    aud: 'authenticated',
    app_metadata: {},
    user_metadata: {},
    created_at: new Date().toISOString(),
  },
};

const futureLoop: Loop = {
  id: 'loop-sos-1',
  creator_id: uid,
  destination: 'Vijayawada Junction',
  departure_time: new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
  participants_limit: 4,
  is_female_only: false,
  status: 'open',
  created_at: new Date().toISOString(),
  expires_at: new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
};

const cacheKey = `loop_emergency_contacts_${uid}`;
const leaseKey = `loop_manifest_lease_${uid}`;

function fetchChain(result: { data: unknown; error: unknown }) {
  return {
    select: vi.fn(() => ({
      order: vi.fn(() => ({
        limit: vi.fn(() => Promise.resolve(result)),
      })),
    })),
  };
}

function renderSos(overrides: Partial<Parameters<typeof useEmergencySos>[0]> = {}) {
  return renderHook(() =>
    useEmergencySos({
      session: mockSession,
      activeLoops: [],
      userJoinedLoops: [],
      userLoops: [],
      selectedLoop: null,
      ...overrides,
    })
  );
}

describe('useEmergencySos Hook', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
  });

  it('hydrates contacts from the per-user localStorage cache when offline', async () => {
    localStorage.setItem(
      cacheKey,
      JSON.stringify([{ id: 'c1', name: 'Mom', phone: '9999900001', relation: 'Parent' }])
    );
    fromMock.mockImplementation(() => fetchChain({ data: null, error: { message: 'offline' } }));

    const { result } = renderSos();

    expect(result.current.emergencyContact?.name).toBe('Mom');
    expect(result.current.emergencyContacts).toHaveLength(1);
    await waitFor(() => expect(fromMock).toHaveBeenCalled());
  });

  it('loads contacts from the cloud and rewrites the cache', async () => {
    fromMock.mockImplementation(() =>
      fetchChain({
        data: [{ id: 'c2', name: 'Dad', phone: '9999900002', relation: 'Father' }],
        error: null,
      })
    );

    const { result } = renderSos();

    await waitFor(() => expect(result.current.emergencyContacts).toHaveLength(1));
    expect(result.current.emergencyContact?.name).toBe('Dad');
    expect(JSON.parse(localStorage.getItem(cacheKey) || '[]')[0].name).toBe('Dad');
  });

  it('saves through the atomic RPC, trimming values and capping at 3 contacts', async () => {
    fromMock.mockImplementation(() => fetchChain({ data: [], error: null }));
    rpcMock.mockResolvedValue({
      data: [{ id: 'r1', name: 'A', phone: '9999900003', relation: 'Parent' }],
      error: null,
    });

    const { result } = renderSos();

    await act(async () => {
      await result.current.saveEmergencyContacts([
        { name: ' A ', phone: ' 9999900003 ', relation: 'Parent' },
        { name: 'B', phone: '9999900004' },
        { name: 'C', phone: '9999900005' },
        { name: 'D', phone: '9999900006' },
      ]);
    });

    expect(rpcMock).toHaveBeenCalledTimes(1);
    expect(rpcMock.mock.calls[0][0]).toBe('sync_emergency_contacts');
    const payload = (rpcMock.mock.calls[0][1] as { contacts_payload: EmergencyContact[] })
      .contacts_payload;
    expect(payload).toHaveLength(3);
    expect(payload[0].name).toBe('A');
    expect(payload[0].phone).toBe('9999900003');
    expect(result.current.emergencyContacts[0].id).toBe('r1');
  });

  it('falls back to differential insert-then-delete when the RPC is unavailable', async () => {
    const deleteInMock = vi.fn().mockResolvedValue({ data: null, error: null });

    fromMock.mockImplementation(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
        eq: vi.fn(() => Promise.resolve({ data: [{ id: 'old-1' }], error: null })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn().mockResolvedValue({
          data: [{ id: 'new-1', name: 'Mom', phone: '9999900001', relation: 'Parent' }],
          error: null,
        }),
      })),
      delete: vi.fn(() => ({ in: deleteInMock })),
    }));
    rpcMock.mockResolvedValue({ data: null, error: { message: 'function not found' } });

    const { result } = renderSos();

    await act(async () => {
      await result.current.saveEmergencyContacts([
        { name: 'Mom', phone: '9999900001', relation: 'Parent' },
      ]);
    });

    expect(result.current.emergencyContacts[0].id).toBe('new-1');
    expect(deleteInMock).toHaveBeenCalledWith('id', ['old-1']);
  });

  it('provisions an offline SOS manifest lease for an active joined loop', async () => {
    fromMock.mockImplementation(() => fetchChain({ data: [], error: null }));

    renderSos({ activeLoops: [futureLoop], userJoinedLoops: [futureLoop.id] });

    await waitFor(() => expect(localStorage.getItem(leaseKey)).toBeTruthy());
    const lease = JSON.parse(localStorage.getItem(leaseKey) || '{}');
    expect(lease.id).toBe('loop-sos-1');
    expect(lease.lease_ttl).toBe(new Date(futureLoop.departure_time).getTime() + 5 * 3600 * 1000);
  });

  it('purges the lease once the user has no active ride', async () => {
    localStorage.setItem(leaseKey, JSON.stringify({ id: 'stale' }));
    fromMock.mockImplementation(() => fetchChain({ data: [], error: null }));

    renderSos();

    await waitFor(() => expect(localStorage.getItem(leaseKey)).toBeNull());
  });
});
