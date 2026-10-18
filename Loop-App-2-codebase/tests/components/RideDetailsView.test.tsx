import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import RideDetailsView from '@/components/sections/RideDetailsView';
import type { Loop } from '@/lib/types';

const mockUseLoop = vi.fn();

vi.mock('@/lib/LoopContext', () => ({
  useLoop: () => mockUseLoop(),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({
          data: [
            {
              id: 'member-1',
              loop_id: 'loop-100',
              user_id: 'user-creator',
              joined_at: new Date().toISOString(),
              profile: { display_name: 'Creator Student', reg_no: '24BCI0001', gender: 'male' },
            },
          ],
          error: null,
        }),
      })),
    })),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    })),
    removeChannel: vi.fn(),
    rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
  },
}));

const mockLoop: Loop = {
  id: 'loop-100',
  creator_id: 'user-creator',
  start_point: 'Main Block',
  destination: 'Vijayawada Railway Station',
  departure_time: new Date(Date.now() + 7200000).toISOString(),
  participants_limit: 4,
  member_count: 2,
  status: 'open',
  vehicle_type: 'car',
  is_female_only: false,
  purpose: 'general',
  created_at: new Date().toISOString(),
  expires_at: new Date(Date.now() + 4 * 3600000).toISOString(),
};

const defaultContext = {
  session: { user: { id: 'user-creator' } },
  profile: { display_name: 'Creator Student', reg_no: '24BCI0001', gender: 'male' },
  selectedLoop: mockLoop,
  userJoinedLoops: ['loop-100'],
  userLoops: ['loop-100'],
  joinLoop: vi.fn(),
  deleteLoop: vi.fn(),
  leaveLoop: vi.fn(),
  isJoining: false,
  isDeleting: false,
  setSelectedLoop: vi.fn(),
  setView: vi.fn(),
  fetchLoops: vi.fn(),
  setChatSource: vi.fn(),
  setCreatePrefill: vi.fn(),
  triggerSos: vi.fn(),
  emergencyContacts: [],
  setShowTermsModal: vi.fn(),
  theme: {
    isDark: true,
    bg: 'bg-black',
    text: 'text-white',
    border: 'border-white/10',
    cardBg: 'bg-zinc-900',
    mutedText: 'text-zinc-400',
  },
};

describe('RideDetailsView Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseLoop.mockReturnValue(defaultContext);
  });

  it('renders route destination and schedule details', async () => {
    await act(async () => {
      render(<RideDetailsView />);
    });

    expect(screen.getByText('Vijayawada Railway Station')).toBeInTheDocument();
    expect(screen.getByText('Fare Splitter')).toBeInTheDocument();
  });

  it('renders chat and host actions when current user is loop creator', async () => {
    await act(async () => {
      render(<RideDetailsView />);
    });

    const openChatBtn = screen.getByRole('button', { name: /open chat/i });
    expect(openChatBtn).toBeInTheDocument();

    fireEvent.click(openChatBtn);
    expect(defaultContext.setChatSource).toHaveBeenCalledWith('ride-details');
    expect(defaultContext.setView).toHaveBeenCalledWith('chat');
  });

  it('allows creator to trigger delete loop via confirmation dialog', async () => {
    await act(async () => {
      render(<RideDetailsView />);
    });

    const deleteBtn = screen.getByRole('button', { name: /delete loop/i });
    expect(deleteBtn).toBeInTheDocument();
    fireEvent.click(deleteBtn);

    const confirmBtn = screen.getByRole('button', { name: /confirm delete/i });
    expect(confirmBtn).toBeInTheDocument();
    fireEvent.click(confirmBtn);

    expect(defaultContext.deleteLoop).toHaveBeenCalledWith('loop-100');
  });

  it('renders Join button when current user is not a member or host', async () => {
    mockUseLoop.mockReturnValue({
      ...defaultContext,
      session: { user: { id: 'other-user-999' } },
      userJoinedLoops: [],
      userLoops: [],
    });

    await act(async () => {
      render(<RideDetailsView />);
    });

    const joinBtn = screen.getByRole('button', { name: /join loop/i });
    expect(joinBtn).toBeInTheDocument();

    fireEvent.click(joinBtn);
    expect(defaultContext.joinLoop).toHaveBeenCalledWith(mockLoop);
  });

  it('renders Leave button when user is a joined passenger and handles leaving', async () => {
    mockUseLoop.mockReturnValue({
      ...defaultContext,
      session: { user: { id: 'passenger-user-2' } },
      userJoinedLoops: ['loop-100'],
      userLoops: [],
    });

    await act(async () => {
      render(<RideDetailsView />);
    });

    const leaveBtn = screen.getByRole('button', { name: /leave loop/i });
    expect(leaveBtn).toBeInTheDocument();

    fireEvent.click(leaveBtn);
    expect(defaultContext.leaveLoop).toHaveBeenCalledWith('loop-100');
  });

  it('allows host to plan return ride', async () => {
    await act(async () => {
      render(<RideDetailsView />);
    });

    const planReturnBtn = screen.getByRole('button', { name: /plan return ride/i });
    expect(planReturnBtn).toBeInTheDocument();

    fireEvent.click(planReturnBtn);
    expect(defaultContext.setCreatePrefill).toHaveBeenCalled();
    expect(defaultContext.setView).toHaveBeenCalledWith('create');
  });
});
