"use client";

import React, { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useLoop } from "@/lib/LoopContext";
import { toast } from "@/components/ui/NativeToast";
import UserProfileModal from "./UserProfileModal";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { MessageList } from "@/components/chat/MessageList";
import { ChatComposer } from "@/components/chat/ChatComposer";
import { MessageActionModal } from "@/components/chat/MessageActionModal";
import { useChatRoom } from "@/components/chat/useChatRoom";

export default function ChatView() {
  const {
    session,
    selectedLoop,
    setSelectedLoop,
    profile,
    formatTime,
    theme,
    setView,
    userJoinedLoops,
    userLoops,
    isJoining,
    activeLoops,
    triggerSos,
    emergencyContacts = [],
    isMessageSearchOpen,
    setIsMessageSearchOpen,
  } = useLoop();
  const { isDark, border, cardBg, mutedText, text } = theme;

  // Guard against unauthorized chat access (IDOR & URL / state manipulation defense)
  useEffect(() => {
    if (!selectedLoop?.id) {
      setView("home");
      return;
    }

    let isCancelled = false;

    const verifyAccess = async () => {
      // 1. If user is creator, access is granted
      if (selectedLoop.creator_id === session.user.id || userLoops.includes(selectedLoop.id)) return;

      // 2. If user is already in local joined loops state, access is granted
      if (userJoinedLoops.includes(selectedLoop.id)) return;

      // 3. If joining is in flight, do not kick out
      if (isJoining) return;

      // 4. If not in local cache, verify membership with database
      const { data, error } = await supabase
        .from("loop_members")
        .select("id")
        .eq("loop_id", selectedLoop.id)
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (isCancelled) return;

      if (userJoinedLoops.includes(selectedLoop.id)) return;

      if (!data || error) {
        toast.error("Access denied: You must join this ride to access the group chat.");
        setView("home");
      }
    };

    verifyAccess();

    return () => {
      isCancelled = true;
    };
  }, [selectedLoop?.id, selectedLoop?.creator_id, session.user.id, userJoinedLoops, userLoops, isJoining, setView]);

  const {
    messages,
    newMessage,
    editingMsgId,
    setEditingMsgId,
    editingContent,
    setEditingContent,
    actionMenuMsg,
    setActionMenuMsg,
    holdingMsgId,
    didTriggerHoldRef,
    startHold,
    moveHold,
    endHold,
    members,
    selectedUser,
    setSelectedUser,
    avatarErrors,
    hasMoreMessages,
    isLoadingMore,
    isSharingLocation,
    searchQuery,
    setSearchQuery,
    matchingMsgIds,
    messagesEndRef,
    chatScrollRef,
    loadMoreMessages,
    sendMessage,
    saveEditMessage,
    deleteMessage,
    handleOpenReturnLoop,
    handleInputChange,
    startEditMessage,
    handleShareLocation,
    handleShare,
  } = useChatRoom({
    session,
    selectedLoop,
    setSelectedLoop,
    profile,
    userJoinedLoops,
    userLoops,
    activeLoops,
    setView,
  });

  if (!selectedLoop) return null;

  const isHost = selectedLoop?.creator_id === session.user.id;

  return (
    <div className="flex-1 flex flex-col relative z-10 overflow-hidden">
      <ChatHeader
        members={members}
        sessionUserId={session.user.id}
        currentProfile={profile}
        avatarErrors={avatarErrors}
        isDark={isDark}
        border={border}
        cardBg={cardBg}
        mutedText={mutedText}
        onSelectUser={setSelectedUser}
        onViewRideDetails={() => setView("ride-details")}
        onTriggerSos={triggerSos}
        hasEmergencyContacts={emergencyContacts.length > 0}
        onShareLocation={handleShareLocation}
        isSharingLocation={isSharingLocation}
        onShareInvite={handleShare}
        isMessageSearchOpen={isMessageSearchOpen}
        onCloseSearch={() => {
          setIsMessageSearchOpen(false);
          setSearchQuery("");
        }}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        matchingCount={matchingMsgIds.size}
      />

      <MessageList
        messages={messages}
        sessionUserId={session.user.id}
        profile={profile}
        theme={theme}
        formatTime={formatTime}
        hasMoreMessages={hasMoreMessages}
        isLoadingMore={isLoadingMore}
        onLoadMoreMessages={loadMoreMessages}
        searchQuery={searchQuery}
        matchingMsgIds={matchingMsgIds}
        editingMsgId={editingMsgId}
        editingContent={editingContent}
        setEditingContent={setEditingContent}
        onSaveEdit={saveEditMessage}
        onCancelEdit={() => setEditingMsgId(null)}
        holdingMsgId={holdingMsgId}
        startHold={startHold}
        moveHold={moveHold}
        endHold={endHold}
        onActionMenu={setActionMenuMsg}
        onStartEditMessage={startEditMessage}
        onOpenReturnLoop={handleOpenReturnLoop}
        onSelectUser={setSelectedUser}
        chatScrollRef={chatScrollRef}
        messagesEndRef={messagesEndRef}
        didTriggerHoldRef={didTriggerHoldRef}
      />

      <ChatComposer
        newMessage={newMessage}
        onInputChange={handleInputChange}
        onSendMessage={sendMessage}
        cardBg={cardBg}
        border={border}
        isDark={isDark}
      />

      <UserProfileModal user={selectedUser} isOpen={!!selectedUser} onClose={() => setSelectedUser(null)} />

      <MessageActionModal
        actionMenuMsg={actionMenuMsg}
        sessionUserId={session.user.id}
        isHost={isHost}
        isDark={isDark}
        cardBg={cardBg}
        border={border}
        text={text}
        mutedText={mutedText}
        formatTime={formatTime}
        onClose={() => setActionMenuMsg(null)}
        onStartEdit={startEditMessage}
        onDeleteMessage={deleteMessage}
      />
    </div>
  );
}
