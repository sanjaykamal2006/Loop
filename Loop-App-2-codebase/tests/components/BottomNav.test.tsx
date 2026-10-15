import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import BottomNav from '@/components/sections/BottomNav';

const mockUseLoop = vi.fn();

vi.mock('@/lib/LoopContext', () => ({
  useLoop: () => mockUseLoop(),
}));

const defaultContext = {
  view: 'home',
  setView: vi.fn(),
  profile: {
    display_name: 'Sanjay Kamal S',
    reg_no: '24MIC7130',
    gender: 'male',
  },
  setShowGenderSelect: vi.fn(),
  setPendingAction: vi.fn(),
  unreadLoopIds: [] as string[],
  theme: {
    isDark: true,
  },
};

describe('BottomNav Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseLoop.mockReturnValue(defaultContext);
  });

  it('renders all 4 primary navigation tabs', () => {
    render(<BottomNav />);

    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Create')).toBeInTheDocument();
    expect(screen.getByText('Chat')).toBeInTheDocument();
    expect(screen.getByText('Profile')).toBeInTheDocument();
  });

  it('hides completely when active view is chat or ride-details', () => {
    mockUseLoop.mockReturnValue({
      ...defaultContext,
      view: 'chat',
    });

    const { container: chatContainer } = render(<BottomNav />);
    expect(chatContainer.firstChild).toBeNull();

    mockUseLoop.mockReturnValue({
      ...defaultContext,
      view: 'ride-details',
    });

    const { container: detailsContainer } = render(<BottomNav />);
    expect(detailsContainer.firstChild).toBeNull();
  });

  it('switches view to chat-list and profile on tab click', () => {
    render(<BottomNav />);

    const chatTab = screen.getByText('Chat').closest('button');
    fireEvent.click(chatTab!);
    expect(defaultContext.setView).toHaveBeenCalledWith('chat-list');

    const profileTab = screen.getByText('Profile').closest('button');
    fireEvent.click(profileTab!);
    expect(defaultContext.setView).toHaveBeenCalledWith('profile');
  });

  it('navigates to create when user clicks Create tab with completed profile', () => {
    render(<BottomNav />);

    const createTab = screen.getByText('Create').closest('button');
    fireEvent.click(createTab!);

    expect(defaultContext.setView).toHaveBeenCalledWith('create');
  });

  it('prompts gender and profile completion if user clicks Create with incomplete profile', () => {
    mockUseLoop.mockReturnValue({
      ...defaultContext,
      profile: { display_name: '', reg_no: '', gender: null },
    });

    render(<BottomNav />);

    const createTab = screen.getByText('Create').closest('button');
    fireEvent.click(createTab!);

    expect(defaultContext.setPendingAction).toHaveBeenCalledWith({ type: 'create' });
    expect(defaultContext.setShowGenderSelect).toHaveBeenCalledWith(true);
    expect(defaultContext.setView).not.toHaveBeenCalledWith('create');
  });

  it('renders unread radar indicator when unreadLoopIds contains loops', () => {
    mockUseLoop.mockReturnValue({
      ...defaultContext,
      unreadLoopIds: ['loop-abc'],
    });

    const { container } = render(<BottomNav />);
    const radar = container.querySelector('span.animate-ping');
    expect(radar).toBeInTheDocument();
  });
});
