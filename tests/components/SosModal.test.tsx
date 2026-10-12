import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SosModal from '@/components/sections/SosModal';

const mockUseLoop = vi.fn();

vi.mock('@/lib/LoopContext', () => ({
  useLoop: () => mockUseLoop(),
}));

const mockOpenWhatsApp = vi.fn();
vi.mock('@/lib/whatsapp', () => ({
  openWhatsApp: (...args: any[]) => mockOpenWhatsApp(...args),
}));

vi.mock('@/components/ui/NativeToast', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
  },
}));

const mockGeolocation = {
  getCurrentPosition: vi.fn(),
  watchPosition: vi.fn(),
  clearWatch: vi.fn(),
};

Object.defineProperty(global.navigator, 'geolocation', {
  value: mockGeolocation,
  writable: true,
});

const baseContext = {
  session: { user: { id: 'user-1', email: 'sanjay.24mic7130@vitapstudent.ac.in' } },
  showSosModal: true,
  setShowSosModal: vi.fn(),
  setShowEmergencyContactModal: vi.fn(),
  emergencyContacts: [
    { id: 'c-1', name: 'Parent', phone: '9876543210', relation: 'Parent' },
  ],
  selectedLoop: {
    id: 'loop-1',
    start_point: 'VIT-AP Main Gate',
    destination: 'Vijayawada Railway Station',
    departure_time: '2026-10-12T16:30:00.000Z',
    creator: { display_name: 'Sanjay Kamal S', reg_no: '24MIC7130' },
  },
  activeLoops: [],
  userJoinedLoops: ['loop-1'],
  userLoops: [],
  profile: { display_name: 'Sanjay Kamal S', reg_no: '24MIC7130', gender: 'male' },
  theme: {
    isDark: true,
    cardBg: 'bg-zinc-900',
    border: 'border-white/10',
    mutedText: 'text-zinc-400',
  },
};

describe('SosModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    delete (window as any).location;
    (window as any).location = { href: '' };
    mockUseLoop.mockReturnValue(baseContext);
  });

  it('renders Emergency SOS modal and requests GPS with 8,000 ms timeout', async () => {
    mockGeolocation.getCurrentPosition.mockImplementation((success) => {
      success({
        coords: { latitude: 16.4971, longitude: 80.4992, accuracy: 12 },
      });
    });

    render(<SosModal />);

    expect(screen.getByText(/emergency sos/i)).toBeInTheDocument();
    expect(mockGeolocation.getCurrentPosition).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function),
      expect.objectContaining({
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 0,
      })
    );

    await waitFor(() => {
      expect(screen.getByText(/live gps pinpoint ready/i)).toBeInTheDocument();
    });
  });

  it('does not render when showSosModal is false', () => {
    mockUseLoop.mockReturnValue({ ...baseContext, showSosModal: false });
    render(<SosModal />);
    expect(screen.queryByText(/emergency sos/i)).not.toBeInTheDocument();
  });

  it('dispatches WhatsApp alert with ride manifest and live GPS coordinates', async () => {
    mockGeolocation.getCurrentPosition.mockImplementation((success) => {
      success({
        coords: { latitude: 16.4971, longitude: 80.4992, accuracy: 10 },
      });
    });

    render(<SosModal />);

    await waitFor(() => {
      expect(screen.getByText(/live gps pinpoint ready/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /alert parent via whatsapp/i }));

    expect(mockOpenWhatsApp).toHaveBeenCalledWith(
      expect.objectContaining({
        phone: '9876543210',
        text: expect.stringContaining('Vijayawada Railway Station'),
      })
    );
    expect(mockOpenWhatsApp.mock.calls[0][0].text).toContain('16.4971,80.4992');
  });

  it('falls back to local manifest lease buffer when selectedLoop is null (offline / Home screen)', async () => {
    localStorage.setItem(
      'loop_manifest_lease_user-1',
      JSON.stringify({
        id: 'loop-cached-99',
        start_point: 'VIT-AP Gate 1',
        destination: 'Guntur Junction',
        departure_time: '2026-10-12T18:00:00.000Z',
        creator: { display_name: 'Ravi Kumar', reg_no: '24BCE1001' },
        lease_ttl: Date.now() + 3600000,
      })
    );

    mockUseLoop.mockReturnValue({
      ...baseContext,
      selectedLoop: null,
      activeLoops: [],
      userJoinedLoops: [],
    });

    mockGeolocation.getCurrentPosition.mockImplementation((_s, error) => {
      error({ code: 1, message: 'Permission denied' });
    });

    render(<SosModal />);

    fireEvent.click(screen.getByRole('button', { name: /sms alert/i }));

    expect(window.location.href).toContain('sms:+919876543210');
    expect(decodeURIComponent(window.location.href)).toContain('Guntur Junction');
    expect(decodeURIComponent(window.location.href)).toContain('Ravi Kumar');
  });

  it('invokes tel:112 emergency dialer link even when no personal contact is saved', () => {
    mockUseLoop.mockReturnValue({
      ...baseContext,
      emergencyContacts: [],
    });

    render(<SosModal />);

    expect(screen.getByText(/no emergency contact saved yet/i)).toBeInTheDocument();
    const call112Link = screen.getByRole('link', { name: /call emergency services \(112\)/i });
    expect(call112Link).toHaveAttribute('href', 'tel:112');
  });
});
