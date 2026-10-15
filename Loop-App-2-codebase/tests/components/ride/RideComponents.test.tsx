import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { FareSplitterCard } from '@/components/ride/FareSplitterCard';
import { PassengerList } from '@/components/ride/PassengerList';
import { RideActionButtons } from '@/components/ride/RideActionButtons';
import type { Loop, LoopMember, Profile, ThemeClasses } from '@/lib/types';

const mockTheme: ThemeClasses = {
  isDark: true,
  bg: 'bg-black',
  text: 'text-white',
  border: 'border-white/10',
  cardBg: 'bg-zinc-900',
  mutedText: 'text-zinc-400',
};

const mockLoop: Loop = {
  id: 'loop-1',
  creator_id: 'user-creator',
  start_point: 'Main Building',
  destination: 'Vijayawada',
  departure_time: new Date().toISOString(),
  participants_limit: 4,
  member_count: 2,
  status: 'open',
  vehicle_type: 'auto',
  is_female_only: false,
  purpose: 'general',
  total_fare: 400,
};

const mockProfile: Profile = {
  display_name: 'Sanjay Kamal',
  reg_no: '24MIC7130',
  gender: 'male',
};

describe('Ride Subcomponents', () => {
  describe('FareSplitterCard', () => {
    it('renders default fare state and opens fare input when Set Fare clicked', () => {
      const setIsEditingFare = vi.fn();
      render(
        <FareSplitterCard
          loop={{ ...mockLoop, total_fare: undefined }}
          isCreator={true}
          isPast={false}
          memberCount={2}
          fareInput=""
          setFareInput={vi.fn()}
          isEditingFare={false}
          setIsEditingFare={setIsEditingFare}
          onSaveFare={vi.fn()}
          theme={mockTheme}
        />
      );

      expect(screen.getByText('Fare Splitter')).toBeInTheDocument();
      expect(screen.getByText('Not Set')).toBeInTheDocument();

      const setFareBtn = screen.getByText('Set Fare');
      fireEvent.click(setFareBtn);

      expect(setIsEditingFare).toHaveBeenCalledWith(true);
    });

    it('calculates and renders total fare and split per person', () => {
      render(
        <FareSplitterCard
          loop={mockLoop}
          isCreator={false}
          isPast={false}
          memberCount={4}
          fareInput="400"
          setFareInput={vi.fn()}
          isEditingFare={false}
          setIsEditingFare={vi.fn()}
          onSaveFare={vi.fn()}
          theme={mockTheme}
        />
      );

      expect(screen.getByText('₹400')).toBeInTheDocument();
      expect(screen.getByText('₹100')).toBeInTheDocument();
    });
  });

  describe('PassengerList', () => {
    const mockMembers: LoopMember[] = [
      {
        id: 'mem-1',
        loop_id: 'loop-1',
        user_id: 'user-creator',
        joined_at: new Date().toISOString(),
        profiles: {
          display_name: 'Sanjay Kamal',
          reg_no: '24MIC7130',
          gender: 'male',
        },
      },
      {
        id: 'mem-2',
        loop_id: 'loop-1',
        user_id: 'user-2',
        joined_at: new Date().toISOString(),
        profiles: {
          display_name: 'Rahul V',
          reg_no: '24BCE0100',
          gender: 'male',
        },
      },
    ];

    it('renders passenger list with names and host badge', () => {
      const onSelectUser = vi.fn();
      render(
        <PassengerList
          loop={mockLoop}
          loopMembers={mockMembers}
          isLoadingMembers={false}
          sessionUserId="user-creator"
          profile={mockProfile}
          isCreator={true}
          isJoined={true}
          isPast={false}
          onSelectUser={onSelectUser}
          onRemoveMember={vi.fn()}
          theme={mockTheme}
        />
      );

      expect(screen.getByText('Sanjay Kamal')).toBeInTheDocument();
      expect(screen.getByText('Rahul V')).toBeInTheDocument();
      expect(screen.getByText('Host')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Rahul V'));
      expect(onSelectUser).toHaveBeenCalled();
    });
  });

  describe('RideActionButtons', () => {
    it('renders Open Chat, Share, and Host action buttons', () => {
      const onEnterChat = vi.fn();
      const onShareLoop = vi.fn();
      const onOpenEditModal = vi.fn();

      render(
        <RideActionButtons
          loop={mockLoop}
          isPast={false}
          isCreator={true}
          isJoined={true}
          isJoining={false}
          isDeleting={false}
          showDeleteConfirm={false}
          setShowDeleteConfirm={vi.fn()}
          emergencyContactsCount={1}
          onJoin={vi.fn()}
          onEnterChat={onEnterChat}
          onShareLoop={onShareLoop}
          onOpenEditModal={onOpenEditModal}
          onPlanReturnRide={vi.fn()}
          onTriggerSos={vi.fn()}
          onDeleteLoop={vi.fn()}
          onLeaveLoop={vi.fn()}
          onBackToHistory={vi.fn()}
          theme={mockTheme}
        />
      );

      expect(screen.getByRole('button', { name: /open chat/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /share loop/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /edit ride details/i })).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /open chat/i }));
      expect(onEnterChat).toHaveBeenCalled();
    });
  });
});
