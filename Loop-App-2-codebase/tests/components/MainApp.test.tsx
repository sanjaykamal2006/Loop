import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import MainApp from '@/components/sections/MainApp';
import type { Session } from '@supabase/supabase-js';

const mockUseLoop = vi.fn();

vi.mock('@/lib/LoopContext', () => ({
  LoopProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useLoop: () => mockUseLoop(),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        })),
      })),
    })),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    })),
    removeChannel: vi.fn(),
    rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: 'user-100' } }, error: null } }),
      signOut: vi.fn().mockResolvedValue(undefined),
      refreshSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: 'user-100' } } }, error: null }),
    },
  },
}));

const mockSession: Session = {
  access_token: 'fake-token',
  refresh_token: 'fake-refresh',
  expires_in: 3600,
  token_type: 'bearer',
  user: {
    id: 'user-100',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: new Date().toISOString(),
    email: 'sanjay.24mic7130@vitapstudent.ac.in',
  },
};

const defaultContext = {
  session: mockSession,
  view: 'home',
  setView: vi.fn(),
  selectedLoop: null,
  activeLoops: [],
  userJoinedLoops: [],
  userLoops: [],
  profile: { display_name: 'Sanjay Kamal', reg_no: '24MIC7130', gender: 'male' },
  isProfileLoaded: true,
  fetchLoops: vi.fn(),
  fetchUserMemberships: vi.fn(),
  setShowGenderSelect: vi.fn(),
  setPendingAction: vi.fn(),
  pendingAction: null,
  showGenderSelect: false,
  showTermsModal: false,
  setShowTermsModal: vi.fn(),
  showTeluguGuideModal: false,
  setShowTeluguGuideModal: vi.fn(),
  showCreatorModal: false,
  setShowCreatorModal: vi.fn(),
  showBuyCoffeeModal: false,
  setShowBuyCoffeeModal: vi.fn(),
  showEmergencyModal: false,
  setShowEmergencyModal: vi.fn(),
  showSosModal: false,
  setShowSosModal: vi.fn(),
  createPrefill: null,
  setCreatePrefill: vi.fn(),
  unreadLoopIds: [],
  formatTime: vi.fn(() => '10:00 AM'),
  theme: {
    isDark: true,
    bg: 'bg-black',
    text: 'text-white',
    border: 'border-white/10',
    cardBg: 'bg-zinc-900',
    mutedText: 'text-zinc-400',
  },
};

describe('MainApp Component (Root Application Container)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseLoop.mockReturnValue(defaultContext);
  });

  it('renders root app with AppHeader, HomeView empty state, and BottomNav on home view', async () => {
    await act(async () => {
      render(<MainApp session={mockSession} />);
    });

    expect(screen.getByText('LOOP')).toBeInTheDocument();
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Create')).toBeInTheDocument();
    expect(screen.getByText('Chat')).toBeInTheDocument();
    expect(screen.getByText('Profile')).toBeInTheDocument();
    expect(screen.getByText(/No Active Loops/i)).toBeInTheDocument();
  });

  it('renders CreateView when view is set to create', async () => {
    mockUseLoop.mockReturnValue({
      ...defaultContext,
      view: 'create',
    });

    await act(async () => {
      render(<MainApp session={mockSession} />);
    });

    expect(await screen.findByText('Starting Point')).toBeInTheDocument();
    expect(screen.getByText('Destination')).toBeInTheDocument();
  });

  it('renders ChatListView when view is set to chat-list', async () => {
    mockUseLoop.mockReturnValue({
      ...defaultContext,
      view: 'chat-list',
    });

    await act(async () => {
      render(<MainApp session={mockSession} />);
    });

    expect(await screen.findByText(/No Active Chats/i)).toBeInTheDocument();
    expect(screen.getByText(/Explore Campus Rides/i)).toBeInTheDocument();
  });

  it('renders ProfileView when view is set to profile', async () => {
    mockUseLoop.mockReturnValue({
      ...defaultContext,
      view: 'profile',
    });

    await act(async () => {
      render(<MainApp session={mockSession} />);
    });

    expect(await screen.findByText('Sanjay Kamal')).toBeInTheDocument();
    expect(screen.getByText('24MIC7130')).toBeInTheDocument();
  });

  it('renders RideWantsView when view is set to wants', async () => {
    mockUseLoop.mockReturnValue({
      ...defaultContext,
      view: 'wants',
    });

    await act(async () => {
      render(<MainApp session={mockSession} />);
    });

    expect(await screen.findByRole('heading', { name: 'Find Co-Travellers' })).toBeInTheDocument();
    expect(screen.getByText('Match with students going the same way')).toBeInTheDocument();
  });

  it('renders modal dialogs when respective state flags are true', async () => {
    mockUseLoop.mockReturnValue({
      ...defaultContext,
      showTermsModal: true,
    });

    await act(async () => {
      render(<MainApp session={mockSession} />);
    });

    expect(screen.getByText(/Terms & Privacy Policy/i)).toBeInTheDocument();
  });
});
