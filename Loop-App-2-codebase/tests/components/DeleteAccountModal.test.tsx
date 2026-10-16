import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import DeleteAccountModal from "@/components/profile/DeleteAccountModal";
import { supabase } from "@/lib/supabase";
import { toast } from "@/components/ui/NativeToast";

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      signOut: vi.fn(),
    },
  },
}));

vi.mock("@/components/ui/NativeToast", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("DeleteAccountModal Component", () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not render when isOpen is false", () => {
    const { container } = render(
      <DeleteAccountModal
        isOpen={false}
        onClose={onClose}
        cardBg="bg-zinc-900"
        border="border-white/10"
        mutedText="text-zinc-400"
        isDark={true}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders modal dialog and triggers onClose when Cancel is clicked", () => {
    render(
      <DeleteAccountModal
        isOpen={true}
        onClose={onClose}
        cardBg="bg-zinc-900"
        border="border-white/10"
        mutedText="text-zinc-400"
        isDark={true}
      />
    );

    expect(screen.getByText("Delete Account?")).toBeInTheDocument();
    const cancelButton = screen.getByText("Cancel");
    fireEvent.click(cancelButton);
    expect(onClose).toHaveBeenCalled();
  });

  it("handles successful account deletion flow", async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
      data: { session: { access_token: "mock_token" } as any },
      error: null,
    });
    vi.mocked(supabase.auth.signOut).mockResolvedValueOnce({ error: null });

    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      })
    ) as any;

    render(
      <DeleteAccountModal
        isOpen={true}
        onClose={onClose}
        cardBg="bg-zinc-900"
        border="border-white/10"
        mutedText="text-zinc-400"
        isDark={true}
      />
    );

    const deleteButton = screen.getByRole("button", { name: "Delete" });
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/account/delete", expect.anything());
      expect(supabase.auth.signOut).toHaveBeenCalledWith({ scope: "global" });
      expect(toast.success).toHaveBeenCalledWith("Account permanently deleted.");
      expect(onClose).toHaveBeenCalled();
    });
  });

  it("handles API failure with toast error message", async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
      data: { session: { access_token: "mock_token" } as any },
      error: null,
    });

    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ error: "Decommissioning failed" }),
      })
    ) as any;

    render(
      <DeleteAccountModal
        isOpen={true}
        onClose={onClose}
        cardBg="bg-zinc-900"
        border="border-white/10"
        mutedText="text-zinc-400"
        isDark={true}
      />
    );

    const deleteButton = screen.getByRole("button", { name: "Delete" });
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Decommissioning failed");
      expect(onClose).toHaveBeenCalled();
    });
  });
});
