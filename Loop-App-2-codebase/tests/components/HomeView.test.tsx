import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import HomeView from '@/components/sections/HomeView';
import type { Loop } from '@/lib/types';

const mockUseLoop = vi.fn();

vi.mock('@/lib/LoopContext', () => ({
  useLoop: () => mockUseLoop(),
}));

vi.mock('@/lib/rideWants', () => ({
  fetchRideWants: vi.fn(() => Promise.resolve({
    data: [
      { destination_key: 'vijayawada', depart_date: '2026-10-25', intent_count: 5, has_mine: false },
      { destination_key: 'guntur', depart_date: '2026-10-26', intent_count: 2, has_mine: false },
    ],
    error: null,
  })),
}));

const sampleLoops: Loop[] = [
  {
    id: 'loop-1',
    creator_id: 'user-1',
    start_point: 'Campus Gate 1',
    destination: 'Vijayawada Junction',
    departure_time: new Date(Date.now() + 3600000).toISOString(),
    participants_limit: 4,
    member_count: 2,
    status: 'open',
    vehicle_type: 'car',
    is_female_only: false,
    purpose: 'general',
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 4 * 3600000).toISOString(),
  },
  {
    id: 'loop-2',
    creator_id: 'user-2',
    start_point: 'Main Building',
    destination: 'Guntur Bus Stand',
    departure_time: new Date(Date.now() + 7200000).toISOString(),
    participants_limit: 3,
    member_count: 3,
    status: 'open',
    vehicle_type: 'car',
    is_female_only: true,
    purpose: 'general',
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 5 * 3600000).toISOString(),
  },
  {
    id: 'loop-3',
    creator_id: 'user-1',
    start_point: 'Vijayawada Station',
    destination: 'Campus',
    departure_time: new Date(Date.now() + 10800000).toISOString(),
    participants_limit: 4,
    member_count: 1,
    status: 'open',
    vehicle_type: 'car',
    is_female_only: false,
    purpose: 'return',
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 6 * 3600000).toISOString(),
  },
];

const defaultContext = {
  activeLoops: sampleLoops,
  userJoinedLoops: ['loop-1'],
  userLoops: ['loop-1', 'loop-3'],
  setSelectedLoop: vi.fn(),
  setView: vi.fn(),
  formatTime: vi.fn(() => '10:30 AM'),
  profile: {
    display_name: 'Sanjay Kamal S',
    reg_no: '24MIC7130',
    gender: 'male',
  },
  setShowGenderSelect: vi.fn(),
  setPendingAction: vi.fn(),
  theme: {
    isDark: true,
    bg: 'bg-black',
    text: 'text-white',
    border: 'border-white/10',
    cardBg: 'bg-zinc-900',
    mutedText: 'text-zinc-400',
  },
};

describe('HomeView Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseLoop.mockReturnValue(defaultContext);
  });

  it('renders list of active loops with routes, times, and capacity', () => {
    render(<HomeView />);

    expect(screen.getByText('Vijayawada Junction')).toBeInTheDocument();
    expect(screen.getByText('Guntur Bus Stand')).toBeInTheDocument();
    expect(screen.getByText('Campus Gate 1')).toBeInTheDocument();

    expect(screen.getByText('2/4')).toBeInTheDocument();
    expect(screen.getByText('3/3')).toBeInTheDocument();
  });

  it('filters loops dynamically by destination via search input', () => {
    render(<HomeView />);

    const searchInput = screen.getByPlaceholderText(/Search destination/i);
    fireEvent.change(searchInput, { target: { value: 'Guntur' } });

    expect(screen.getByText('Guntur Bus Stand')).toBeInTheDocument();
    expect(screen.queryByText('Vijayawada Junction')).not.toBeInTheDocument();

    const clearBtn = screen.getByRole('button', { name: /clear search/i });
    fireEvent.click(clearBtn);

    expect(screen.getByText('Vijayawada Junction')).toBeInTheDocument();
  });

  it('renders badges for Host, Joined, Female-only, and Return loops', () => {
    render(<HomeView />);

    const hostBadges = screen.getAllByText('Host');
    expect(hostBadges.length).toBeGreaterThan(0);

    expect(screen.getByText('Female')).toBeInTheDocument();
    expect(screen.getByText('Return')).toBeInTheDocument();
  });

  it('navigates to ride-details when a loop card is clicked', () => {
    render(<HomeView />);

    const loopCard = screen.getByText('Vijayawada Junction').closest('div[class*="cursor-pointer"]');
    expect(loopCard).not.toBeNull();
    fireEvent.click(loopCard!);

    expect(defaultContext.setSelectedLoop).toHaveBeenCalledWith(sampleLoops[0]);
    expect(defaultContext.setView).toHaveBeenCalledWith('ride-details');
  });

  it('displays empty state when activeLoops is empty and navigates to create', () => {
    mockUseLoop.mockReturnValue({
      ...defaultContext,
      activeLoops: [],
    });

    render(<HomeView />);

    expect(screen.getByText(/No Active Loops/i)).toBeInTheDocument();

    const createBtn = screen.getByRole('button', { name: /\+ Create Loop/i });
    fireEvent.click(createBtn);

    expect(defaultContext.setView).toHaveBeenCalledWith('create');
  });

  it('prompts for profile/gender completion when empty state Create is clicked with incomplete profile', () => {
    mockUseLoop.mockReturnValue({
      ...defaultContext,
      activeLoops: [],
      profile: { display_name: '', reg_no: '', gender: null },
    });

    render(<HomeView />);

    const createBtn = screen.getByRole('button', { name: /\+ Create Loop/i });
    fireEvent.click(createBtn);

    expect(defaultContext.setPendingAction).toHaveBeenCalledWith({ type: 'create' });
    expect(defaultContext.setShowGenderSelect).toHaveBeenCalledWith(true);
    expect(defaultContext.setView).not.toHaveBeenCalledWith('create');
  });

  it('displays friendly search empty state and allows resetting query', () => {
    render(<HomeView />);

    const searchInput = screen.getByPlaceholderText(/Search destination/i);
    fireEvent.change(searchInput, { target: { value: 'NonExistentDestination999' } });

    expect(screen.getByText(/No loops found/i)).toBeInTheDocument();
    const clearBtn = screen.getByText('Clear Search');
    fireEvent.click(clearBtn);

    expect(screen.getByText('Vijayawada Junction')).toBeInTheDocument();
  });

  it('navigates to wants view when "I Need a Ride" button is clicked in empty state', () => {
    mockUseLoop.mockReturnValue({
      ...defaultContext,
      activeLoops: [],
    });

    render(<HomeView />);

    const wantsBtn = screen.getByTestId('wants-board-empty-btn');
    expect(wantsBtn).toBeInTheDocument();
    fireEvent.click(wantsBtn);

    expect(defaultContext.setView).toHaveBeenCalledWith('wants');
  });

  it('renders search bar prominently at the top of the feed without feed strip obstruction', () => {
    render(<HomeView />);

    const searchInput = screen.getByLabelText('Search loops');
    expect(searchInput).toBeInTheDocument();
    expect(screen.queryByTestId('wants-board-feed-btn')).not.toBeInTheDocument();
  });
});
