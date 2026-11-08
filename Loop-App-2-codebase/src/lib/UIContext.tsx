"use client";

import React, { createContext, useContext, useState, useCallback, useMemo } from "react";

export interface UIContextValue {
  showTermsModal: boolean;
  setShowTermsModal: (show: boolean) => void;
  showTeluguGuideModal: boolean;
  setShowTeluguGuideModal: (show: boolean) => void;
  showCreatorModal: boolean;
  setShowCreatorModal: (show: boolean) => void;
  showBuyCoffeeModal: boolean;
  setShowBuyCoffeeModal: (show: boolean) => void;
  isMessageSearchOpen: boolean;
  setIsMessageSearchOpen: React.Dispatch<React.SetStateAction<boolean>>;
  toggleMessageSearch: () => void;
  isChatSearchOpen: boolean;
  setIsChatSearchOpen: React.Dispatch<React.SetStateAction<boolean>>;
  toggleChatSearch: () => void;
}

const UIContext = createContext<UIContextValue | null>(null);

export function useUI(): UIContextValue {
  const ctx = useContext(UIContext);
  if (!ctx) {
    throw new Error("useUI must be used within a UIProvider");
  }
  return ctx;
}

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showTeluguGuideModal, setShowTeluguGuideModal] = useState(false);
  const [showCreatorModal, setShowCreatorModal] = useState(false);
  const [showBuyCoffeeModal, setShowBuyCoffeeModal] = useState(false);
  const [isMessageSearchOpen, setIsMessageSearchOpen] = useState(false);
  const [isChatSearchOpen, setIsChatSearchOpen] = useState(false);

  const toggleMessageSearch = useCallback(() => {
    setIsMessageSearchOpen((prev) => !prev);
  }, []);

  const toggleChatSearch = useCallback(() => {
    setIsChatSearchOpen((prev) => !prev);
  }, []);

  const value = useMemo(
    () => ({
      showTermsModal,
      setShowTermsModal,
      showTeluguGuideModal,
      setShowTeluguGuideModal,
      showCreatorModal,
      setShowCreatorModal,
      showBuyCoffeeModal,
      setShowBuyCoffeeModal,
      isMessageSearchOpen,
      setIsMessageSearchOpen,
      toggleMessageSearch,
      isChatSearchOpen,
      setIsChatSearchOpen,
      toggleChatSearch,
    }),
    [
      showTermsModal,
      showTeluguGuideModal,
      showCreatorModal,
      showBuyCoffeeModal,
      isMessageSearchOpen,
      toggleMessageSearch,
      isChatSearchOpen,
      toggleChatSearch,
    ]
  );

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}
