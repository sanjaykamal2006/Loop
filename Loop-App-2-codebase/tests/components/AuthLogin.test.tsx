import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AuthLogin from '@/components/sections/AuthLogin';
import { toast } from '@/components/ui/NativeToast';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithOtp: vi.fn(),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      verifyOtp: vi.fn(),
      resetPasswordForEmail: vi.fn(),
    },
  },
}));

vi.mock('@/components/ui/NativeToast', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    log: vi.fn(),
  },
}));

describe('AuthLogin Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders email and password inputs on initial Login view', () => {
    render(<AuthLogin />);

    expect(screen.getByPlaceholderText('name.rollno@vitapstudent.ac.in')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
  });

  it('switches between Login and Sign Up modes', () => {
    render(<AuthLogin />);

    const toggleBtn = screen.getByRole('button', { name: /new to loop\? sign up/i });
    fireEvent.click(toggleBtn);

    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
    expect(screen.getByText(/students: @vitapstudent\.ac\.in/i)).toBeInTheDocument();
  });

  it('rejects plus-addressing (+) aliases with toast error', async () => {
    render(<AuthLogin />);

    const emailInput = screen.getByPlaceholderText('name.rollno@vitapstudent.ac.in');
    const passInput = screen.getByPlaceholderText('••••••••');

    fireEvent.change(emailInput, { target: { value: 'sanjay.24mic7130+spam@vitapstudent.ac.in' } });
    fireEvent.change(passInput, { target: { value: 'password123' } });

    const loginBtn = screen.getByRole('button', { name: /login/i });
    fireEvent.click(loginBtn);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/plus-addressing/i));
    });
  });

  it('validates minimum 8-character password in Sign Up mode', async () => {
    render(<AuthLogin />);

    fireEvent.click(screen.getByRole('button', { name: /new to loop\? sign up/i }));

    const emailInput = screen.getByPlaceholderText('name.rollno@vitapstudent.ac.in');
    const passInput = screen.getByPlaceholderText('••••••••');
    const consentCheckbox = screen.getByRole('checkbox');

    fireEvent.change(emailInput, { target: { value: 'sanjay.24mic7130@vitapstudent.ac.in' } });
    fireEvent.change(passInput, { target: { value: 'short' } });
    fireEvent.click(consentCheckbox);

    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Password must be at least 8 characters long');
    });
  });

  it('rejects non-institutional email domains in Sign Up mode', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ allowed: false }),
    }) as any;

    render(<AuthLogin />);
    fireEvent.click(screen.getByRole('button', { name: /new to loop\? sign up/i }));

    fireEvent.change(screen.getByPlaceholderText('name.rollno@vitapstudent.ac.in'), {
      target: { value: 'random@gmail.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByRole('checkbox'));

    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
    });
  });

  it('handles rate limit errors gracefully during Login', async () => {
    const { supabase } = await import('@/lib/supabase');
    (supabase.auth.signInWithPassword as any).mockResolvedValue({
      data: null,
      error: { message: 'Email rate limit exceeded', status: 429 },
    });

    render(<AuthLogin />);

    fireEvent.change(screen.getByPlaceholderText('name.rollno@vitapstudent.ac.in'), {
      target: { value: 'sanjay.24mic7130@vitapstudent.ac.in' },
    });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'password123' },
    });

    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/rate limit exceeded/i));
    });
  });
});
