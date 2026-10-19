import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isIOS,
  isStandalonePWA,
  isNotificationSupported,
  getNotificationPermission,
  isNotificationEnabled,
  setNotificationEnabled,
  playNotificationSound,
  requestNotificationPermission,
  sendLocalNotification,
} from '@/lib/notifications';

describe('notifications utility', () => {
  beforeEach(() => {

    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('isIOS', () => {
    it('detects iOS devices based on userAgent', () => {
      const userAgentSpy = vi.spyOn(window.navigator, 'userAgent', 'get');
      userAgentSpy.mockReturnValue('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)');
      expect(isIOS()).toBe(true);
    });

    it('returns false for non-iOS devices', () => {
      const userAgentSpy = vi.spyOn(window.navigator, 'userAgent', 'get');
      userAgentSpy.mockReturnValue('Mozilla/5.0 (Windows NT 10.0; Win64; x64)');
      expect(isIOS()).toBe(false);
    });
  });

  describe('isStandalonePWA', () => {
    it('returns true if matchMedia standalone matches', () => {
      vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
        matches: query === '(display-mode: standalone)',
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => true,
      }));

      expect(isStandalonePWA()).toBe(true);
    });

    it('returns false if not in standalone display mode', () => {
      vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => true,
      }));

      expect(isStandalonePWA()).toBe(false);
    });
  });

  describe('isNotificationSupported & getNotificationPermission', () => {
    it('checks if Notification is in window', () => {
      expect(typeof isNotificationSupported()).toBe('boolean');
    });

    it('returns permission when supported', () => {
      const perm = getNotificationPermission();
      expect(['granted', 'denied', 'default']).toContain(perm);
    });
  });

  describe('isNotificationEnabled & setNotificationEnabled', () => {
    it('handles explicit false in localStorage', () => {
      localStorage.setItem('loop_notifications_enabled', 'false');
      expect(isNotificationEnabled()).toBe(false);
    });

    it('sets notification enabled preference', () => {
      setNotificationEnabled(true);
      expect(localStorage.getItem('loop_notifications_enabled')).toBe('true');
      setNotificationEnabled(false);
      expect(localStorage.getItem('loop_notifications_enabled')).toBe('false');
    });
  });

  describe('playNotificationSound', () => {
    it('runs without throwing when AudioContext is present', () => {
      const mockOscillator = {
        type: 'sine',
        frequency: {
          setValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
        },
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
      };
      const mockGain = {
        gain: {
          setValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
        },
        connect: vi.fn(),
      };
      const mockAudioContext = vi.fn(function AudioContextMock() {
        return {
          currentTime: 0,
          createOscillator: vi.fn().mockReturnValue(mockOscillator),
          createGain: vi.fn().mockReturnValue(mockGain),
          destination: {},
        };
      });

      (window as any).AudioContext = mockAudioContext;
      expect(() => playNotificationSound()).not.toThrow();
      expect(mockOscillator.start).toHaveBeenCalled();
    });

    it('handles AudioContext failure gracefully', () => {
      (window as any).AudioContext = undefined;
      expect(() => playNotificationSound()).not.toThrow();
    });
  });

  describe('requestNotificationPermission', () => {
    it('returns unsupported if Notification is not in window', async () => {
      const originalNotification = window.Notification;
      delete (window as any).Notification;
      const res = await requestNotificationPermission();
      expect(res.granted).toBe(false);
      expect(res.reason).toBe('unsupported');
      (window as any).Notification = originalNotification;
    });

    it('returns blocked if Notification.permission is denied', async () => {
      (window as any).Notification = {
        permission: 'denied',
        requestPermission: vi.fn(),
      };
      const res = await requestNotificationPermission();
      expect(res.granted).toBe(false);
      expect(res.reason).toBe('blocked');
    });

    it('handles granted permission', async () => {
      (window as any).Notification = {
        permission: 'default',
        requestPermission: vi.fn().mockResolvedValue('granted'),
      };
      const res = await requestNotificationPermission();
      expect(res.granted).toBe(true);
      expect(localStorage.getItem('loop_notifications_enabled')).toBe('true');
    });
  });

  describe('sendLocalNotification', () => {
    it('returns false if notification is not enabled', async () => {
      localStorage.setItem('loop_notifications_enabled', 'false');
      const res = await sendLocalNotification('Test Notification');
      expect(res).toBe(false);
    });

    it('creates standard Notification when permission is granted and SW is not available', async () => {
      localStorage.setItem('loop_notifications_enabled', 'true');
      const notificationSpy = vi.fn();
      (window as any).Notification = Object.assign(notificationSpy, {
        permission: 'granted',
        requestPermission: vi.fn(),
      });

      const res = await sendLocalNotification('Hello Ride', { body: 'Ready to go' });
      expect(res).toBe(true);
      expect(notificationSpy).toHaveBeenCalledWith('Hello Ride', expect.objectContaining({
        body: 'Ready to go',
      }));
    });
  });
});
