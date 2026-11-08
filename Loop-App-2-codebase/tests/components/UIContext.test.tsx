import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { UIProvider, useUI } from "@/lib/UIContext";

function UIProbe() {
  const {
    showTermsModal,
    setShowTermsModal,
    showCreatorModal,
    setShowCreatorModal,
    showTeluguGuideModal,
    setShowTeluguGuideModal,
    showBuyCoffeeModal,
    setShowBuyCoffeeModal,
    isMessageSearchOpen,
    toggleMessageSearch,
    isChatSearchOpen,
    toggleChatSearch,
  } = useUI();

  return (
    <div>
      <span data-testid="terms">{String(showTermsModal)}</span>
      <span data-testid="creator">{String(showCreatorModal)}</span>
      <span data-testid="telugu">{String(showTeluguGuideModal)}</span>
      <span data-testid="coffee">{String(showBuyCoffeeModal)}</span>
      <span data-testid="msg-search">{String(isMessageSearchOpen)}</span>
      <span data-testid="chat-search">{String(isChatSearchOpen)}</span>

      <button onClick={() => setShowTermsModal(true)}>open-terms</button>
      <button onClick={() => setShowCreatorModal(true)}>open-creator</button>
      <button onClick={() => setShowTeluguGuideModal(true)}>open-telugu</button>
      <button onClick={() => setShowBuyCoffeeModal(true)}>open-coffee</button>
      <button onClick={toggleMessageSearch}>toggle-msg-search</button>
      <button onClick={toggleChatSearch}>toggle-chat-search</button>
    </div>
  );
}

describe("UIContext", () => {
  it("throws when useUI is used outside UIProvider", () => {
    expect(() => render(<UIProbe />)).toThrow("useUI must be used within a UIProvider");
  });

  it("manages modal and search visibility states independently", () => {
    render(
      <UIProvider>
        <UIProbe />
      </UIProvider>
    );

    expect(screen.getByTestId("terms").textContent).toBe("false");
    expect(screen.getByTestId("creator").textContent).toBe("false");
    expect(screen.getByTestId("msg-search").textContent).toBe("false");

    fireEvent.click(screen.getByText("open-terms"));
    expect(screen.getByTestId("terms").textContent).toBe("true");

    fireEvent.click(screen.getByText("open-creator"));
    expect(screen.getByTestId("creator").textContent).toBe("true");

    fireEvent.click(screen.getByText("toggle-msg-search"));
    expect(screen.getByTestId("msg-search").textContent).toBe("true");
  });
});
