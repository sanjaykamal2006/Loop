import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import CreateView from '@/components/sections/CreateView';
import { toast } from '@/components/ui/NativeToast';

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

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: { id: 'loop-123' }, error: null }),
        })),
      })),
    })),
  },
}));

const defaultContext = {
  session: { user: { id: 'user-1', email: 'sanjay.24mic7130@vitapstudent.ac.in' } },
  profile: { display_name: 'Sanjay Kamal S', reg_no: '24MIC7130', gender: 'male', theme: 'dark' },
  isProfileLoaded: true,
  setView: vi.fn(),
  fetchLoops: vi.fn(),
  fetchUserMemberships: vi.fn(),
  setShowGenderSelect: vi.fn(),
  setPendingAction: vi.fn(),
  pendingAction: null,
  showGenderSelect: false,
  createPrefill: null,
  setCreatePrefill: vi.fn(),
  theme: {
    isDark: true,
    bg: 'bg-black',
    text: 'text-white',
    border: 'border-white/10',
    cardBg: 'bg-zinc-900',
    mutedText: 'text-zinc-400',
  },
};

describe('CreateView Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseLoop.mockReturnValue(defaultContext);
  });

  it('renders Starting Point, Destination, and Group Size buttons (2 to 10)', () => {
    render(<CreateView />);

    expect(screen.getByPlaceholderText('Where from?')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Where to?')).toBeInTheDocument();
    for (let n = 2; n <= 10; n++) {
      expect(screen.getByRole('button', { name: String(n) })).toBeInTheDocument();
    }
  });

  it('validates Starting Point and Destination before creating loop', async () => {
    render(<CreateView />);

    fireEvent.click(screen.getByRole('button', { name: /create loop/i }));
    expect(toast.error).toHaveBeenCalledWith('Starting Point is required');

    fireEvent.change(screen.getByPlaceholderText('Where from?'), { target: { value: 'VIT-AP Main Gate' } });
    fireEvent.click(screen.getByRole('button', { name: /create loop/i }));
    expect(toast.error).toHaveBeenCalledWith('Destination is required');
  });

  it('prevents identical Starting Point and Destination', () => {
    render(<CreateView />);

    fireEvent.change(screen.getByPlaceholderText('Where from?'), { target: { value: 'VIT-AP' } });
    fireEvent.change(screen.getByPlaceholderText('Where to?'), { target: { value: 'VIT-AP' } });

    fireEvent.click(screen.getByRole('button', { name: /create loop/i }));
    expect(toast.error).toHaveBeenCalledWith('Starting point and destination cannot be the same');
  });

  it('restricts Female Only toggle for male profile and allows for female profile', () => {
    const { rerender } = render(<CreateView />);

    fireEvent.click(screen.getByText(/female only/i));
    expect(toast.error).toHaveBeenCalledWith('Applicable for female travellers only');

    mockUseLoop.mockReturnValue({
      ...defaultContext,
      profile: { ...defaultContext.profile, gender: 'female' },
    });
    rerender(<CreateView />);

    fireEvent.click(screen.getByText(/female only/i));
    expect(screen.getByText(/based on self-reported gender at signup/i)).toBeInTheDocument();
  });

  it('switches to Offering a Ride mode and displays Scooter, Bike, and Car options', () => {
    render(<CreateView />);

    const buttons = screen.getAllByRole('button');
    // Toggle "Offering a Ride" switch
    const offerSwitch = buttons.find((b) => b.className.includes('w-12 h-7'));
    if (offerSwitch) fireEvent.click(offerSwitch);

    expect(screen.getByText(/scooter \(1\)/i)).toBeInTheDocument();
    expect(screen.getByText(/bike \(1\)/i)).toBeInTheDocument();
    expect(screen.getByText(/car \(1-6\)/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /offer ride/i })).toBeInTheDocument();
  });
});
