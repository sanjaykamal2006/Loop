import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ProfileView from '@/components/sections/ProfileView';

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
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: 'fake-token' } },
      }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ data: {}, error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/avatar.webp' } }),
      })),
    },
  },
}));

const defaultContext = {
  session: { user: { id: 'user-1', email: 'sanjay.24mic7130@vitapstudent.ac.in' } },
  profile: {
    display_name: 'Sanjay Kamal S',
    reg_no: '24MIC7130',
    gender: 'male',
    bio: 'CS Student',
    phone_number: '9876543210',
    is_student_verified: true,
    avatar_url: null,
  },
  updateProfile: vi.fn().mockResolvedValue(true),
  handleSignOut: vi.fn(),
  setView: vi.fn(),
  toggleTheme: vi.fn(),
  theme: {
    isDark: true,
    bg: 'bg-black',
    text: 'text-white',
    border: 'border-white/10',
    cardBg: 'bg-zinc-900',
    mutedText: 'text-zinc-400',
  },
};

describe('ProfileView Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseLoop.mockReturnValue(defaultContext);
  });

  it('renders user details, student tag, email, and WhatsApp info', () => {
    render(<ProfileView />);

    expect(screen.getByText('Sanjay Kamal S')).toBeInTheDocument();
    expect(screen.getByText('24MIC7130')).toBeInTheDocument();
    expect(screen.getByText('sanjay.24mic7130@vitapstudent.ac.in')).toBeInTheDocument();
    expect(screen.getByText('+91 9876543210')).toBeInTheDocument();
    expect(screen.getByText('CS Student')).toBeInTheDocument();
  });

  it('allows switching gender to female', () => {
    render(<ProfileView />);

    const femaleBtn = screen.getByRole('button', { name: 'Female' });
    fireEvent.click(femaleBtn);

    expect(defaultContext.updateProfile).toHaveBeenCalledWith({ gender: 'female' });
  });

  it('enters edit profile mode and saves changes', async () => {
    render(<ProfileView />);

    const editBtn = screen.getByRole('button', { name: /edit profile/i });
    fireEvent.click(editBtn);

    expect(screen.getByText('Edit Details')).toBeInTheDocument();

    const nameInput = screen.getByDisplayValue('Sanjay Kamal S');
    fireEvent.change(nameInput, { target: { value: 'Sanjay K' } });

    const saveBtn = screen.getByRole('button', { name: /save/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(defaultContext.updateProfile).toHaveBeenCalledWith({
        display_name: 'Sanjay K',
        reg_no: '24MIC7130',
        bio: 'CS Student',
        phone_number: '9876543210',
      });
    });
  });

  it('triggers handleSignOut on Sign Out click', () => {
    render(<ProfileView />);

    const signOutBtn = screen.getByRole('button', { name: /sign out/i });
    fireEvent.click(signOutBtn);

    expect(defaultContext.handleSignOut).toHaveBeenCalledTimes(1);
  });

  it('opens and closes delete account modal', () => {
    render(<ProfileView />);

    const deleteBtn = screen.getByRole('button', { name: /delete account/i });
    fireEvent.click(deleteBtn);

    expect(screen.getByText('Delete Account?')).toBeInTheDocument();

    const cancelBtn = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelBtn);

    expect(screen.queryByText('Delete Account?')).not.toBeInTheDocument();
  });
});
