import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ChatView from '@/components/sections/ChatView';

const mockUseLoop = vi.fn();

vi.mock('@/lib/LoopContext', () => ({
  useLoop: () => mockUseLoop(),
}));

vi.mock('@/components/ui/NativeToast', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
  },
}));

const mockChannel = {
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn().mockReturnThis(),
};

vi.mock('@/lib/supabase', () => {
  const createQueryChain = (): any => {
    const chain: any = {
      select: vi.fn(() => chain),
      eq: vi.fn(() => chain),
      in: vi.fn(() => Promise.resolve({ data: [], error: null })),
      order: vi.fn(() => chain),
      limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
      maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
      single: vi.fn(() =>
        Promise.resolve({
          data: {
            id: 'msg-1',
            loop_id: 'loop-1',
            user_id: 'user-1',
            content: 'test',
            created_at: new Date().toISOString(),
            reactions: {},
          },
          error: null,
        })
      ),
      insert: vi.fn(() => chain),
      then: (resolve: any) => Promise.resolve({ data: [], error: null }).then(resolve),
    };
    return chain;
  };

  return {
    supabase: {
      from: vi.fn(() => createQueryChain()),
      channel: vi.fn(() => mockChannel),
      removeChannel: vi.fn(),
      rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
    },
  };
});

const baseContext = {
  session: { user: { id: 'user-1', email: 'sanjay.24mic7130@vitapstudent.ac.in' } },
  selectedLoop: {
    id: 'loop-1',
    creator_id: 'user-1',
    start_point: 'VIT-AP Main Gate',
    destination: 'Vijayawada Station',
    departure_time: '2026-10-15T18:00:00.000Z',
    participants_limit: 4,
    member_count: 1,
    status: 'open',
  },
  setSelectedLoop: vi.fn(),
  profile: { display_name: 'Sanjay Kamal S', reg_no: '24MIC7130', gender: 'male', avatar_url: null },
  formatTime: vi.fn((t) => t),
  theme: {
    isDark: true,
    bg: 'bg-black',
    border: 'border-white/10',
    cardBg: 'bg-zinc-900',
    mutedText: 'text-zinc-400',
    text: 'text-white',
  },
  setView: vi.fn(),
  userJoinedLoops: ['loop-1'],
  userLoops: ['loop-1'],
  isJoining: false,
  activeLoops: [],
  triggerSos: vi.fn(),
  emergencyContacts: [],
  isMessageSearchOpen: false,
  setIsMessageSearchOpen: vi.fn(),
};

describe('ChatView Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseLoop.mockReturnValue(baseContext);
  });

  it('redirects to home if selectedLoop is null', () => {
    mockUseLoop.mockReturnValue({
      ...baseContext,
      selectedLoop: null,
    });

    const { container } = render(<ChatView />);
    expect(container).toBeEmptyDOMElement();
    expect(baseContext.setView).toHaveBeenCalledWith('home');
  });

  it('renders ChatHeader and ChatComposer for authorized ride host', () => {
    render(<ChatView />);

    expect(screen.getByPlaceholderText('Message...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sos/i })).toBeInTheDocument();
  });

  it('allows typing and triggers message sending', async () => {
    render(<ChatView />);

    const input = screen.getByPlaceholderText('Message...');
    fireEvent.change(input, { target: { value: 'Leaving at 6 sharp!' } });
    expect(input).toHaveValue('Leaving at 6 sharp!');

    const form = input.closest('form');
    expect(form).not.toBeNull();
    fireEvent.submit(form!);

    await waitFor(() => {
      // Input resets upon submission
      expect(input).toHaveValue('');
    });
  });

  it('triggers SOS when SOS header button is pressed', () => {
    render(<ChatView />);

    const sosBtn = screen.getByRole('button', { name: /sos/i });
    fireEvent.click(sosBtn);

    expect(baseContext.triggerSos).toHaveBeenCalledTimes(1);
  });
});
