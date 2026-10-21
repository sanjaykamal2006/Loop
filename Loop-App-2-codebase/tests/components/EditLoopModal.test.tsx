import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import EditLoopModal from '@/components/sections/EditLoopModal';
import { toast } from '@/components/ui/NativeToast';
import type { Loop } from '@/lib/types';

const mockLoop: Loop = {
  id: 'loop-edit-1',
  start_point: 'Campus Main Gate',
  destination: 'Vijayawada Railway Station',
  departure_time: new Date(Date.now() + 86400000).toISOString(), // tomorrow
  participants_limit: 4,
  status: 'active',
  creator_id: 'user-creator-1',
  created_at: new Date().toISOString(),
  expires_at: new Date(Date.now() + 100000000).toISOString(),
  member_count: 2,
  is_female_only: false,
  is_driver_offering: false,
};

const mockUpdate = vi.fn();
const mockSingle = vi.fn();
const mockEq = vi.fn();
const mockSelect = vi.fn();
const mockInsert = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === 'loops') {
        return {
          update: mockUpdate.mockReturnValue({
            eq: mockEq.mockReturnValue({
              select: mockSelect.mockReturnValue({
                single: mockSingle,
              }),
            }),
          }),
        };
      }
      if (table === 'messages') {
        return {
          // insertChatMessage (shared writer): insert → select → single
          insert: mockInsert.mockImplementation(() => ({
            select: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: { id: 'sys-1' }, error: null })),
            })),
          })),
        };
      }
      return {};
    }),
  },
}));

vi.mock('@/components/ui/NativeToast', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
  },
}));

const mockContext = {
  theme: {
    isDark: true,
    bg: 'bg-black',
    border: 'border-white/10',
    mutedText: 'text-zinc-400',
  },
  profile: {
    id: 'user-creator-1',
    display_name: 'Host User',
    gender: 'female',
  },
};

vi.mock('@/lib/LoopContext', () => ({
  useLoop: () => mockContext,
}));

describe('EditLoopModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <EditLoopModal
        isOpen={false}
        onClose={vi.fn()}
        loop={mockLoop}
        currentMemberCount={2}
        onUpdated={vi.fn()}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders starting point, destination, and female-only toggle when open', () => {
    render(
      <EditLoopModal
        isOpen={true}
        onClose={vi.fn()}
        loop={mockLoop}
        currentMemberCount={2}
        onUpdated={vi.fn()}
      />
    );

    expect(screen.getByText(/edit ride details/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/e\.g\., Campus Gate 2/i)).toHaveValue('Campus Main Gate');
    expect(screen.getByPlaceholderText(/e\.g\., Airport, Vijayawada/i)).toHaveValue('Vijayawada Railway Station');
    expect(screen.getByText(/female only ride/i)).toBeInTheDocument();
  });

  it('prevents saving when pickup and destination are identical', async () => {
    render(
      <EditLoopModal
        isOpen={true}
        onClose={vi.fn()}
        loop={mockLoop}
        currentMemberCount={2}
        onUpdated={vi.fn()}
      />
    );

    const startInput = screen.getByPlaceholderText(/e\.g\., Campus Gate 2/i);
    const destInput = screen.getByPlaceholderText(/e\.g\., Airport, Vijayawada/i);

    fireEvent.change(startInput, { target: { value: 'Vijayawada' } });
    fireEvent.change(destInput, { target: { value: 'Vijayawada' } });

    const saveBtn = screen.getByRole('button', { name: /save changes/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Pickup and Destination cannot be the same!');
    });
  });

  it('saves successfully and notifies caller on valid update', async () => {
    const onUpdated = vi.fn();
    const onClose = vi.fn();

    mockSingle.mockResolvedValue({
      data: {
        ...mockLoop,
        destination: 'Guntur Bus Station',
        loop_members: [{ count: 2 }],
      },
      error: null,
    });

    render(
      <EditLoopModal
        isOpen={true}
        onClose={onClose}
        loop={mockLoop}
        currentMemberCount={2}
        onUpdated={onUpdated}
      />
    );

    const destInput = screen.getByPlaceholderText(/e\.g\., Airport, Vijayawada/i);
    fireEvent.change(destInput, { target: { value: 'Guntur Bus Station' } });

    const saveBtn = screen.getByRole('button', { name: /save changes/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(onUpdated).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('supports driver ride offering mode with vehicle type and passenger seat limits', () => {
    const driverLoop: Loop = {
      ...mockLoop,
      is_driver_offering: true,
      vehicle_type: 'car',
      participants_limit: 4,
    };

    render(
      <EditLoopModal
        isOpen={true}
        onClose={vi.fn()}
        loop={driverLoop}
        currentMemberCount={2}
        onUpdated={vi.fn()}
      />
    );

    expect(screen.getByText(/passenger seats to offer/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /scooter/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /bike/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /car/i })).toBeInTheDocument();
  });
});
