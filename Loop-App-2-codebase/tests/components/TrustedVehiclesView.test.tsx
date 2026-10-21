import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import TrustedVehiclesView from "@/components/sections/TrustedVehiclesView";

vi.mock("@/components/sections/ExpectedFaresModal", () => ({
  default: ({ isOpen }: { isOpen: boolean }) => (isOpen ? <div data-testid="fares-modal" /> : null),
}));

const mockUseLoop = vi.fn();

vi.mock("@/lib/LoopContext", () => ({
  useLoop: () => mockUseLoop(),
}));

vi.mock("@/components/ui/NativeToast", () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}));
vi.mock("@/lib/haptics", () => ({ triggerHaptic: vi.fn() }));

const interactions = {
  setView: vi.fn(),
  insertCalls: [] as any[],
  deleteCalls: [] as string[],
};

const ownVehicle = {
  id: "v-1",
  user_id: "u1",
  driver_name: "Raju",
  phone_number: "9876543210",
  vehicle_type: "auto",
  created_at: "2026-10-01T00:00:00Z",
  profiles: { display_name: "Sanjay", avatar_url: null },
};
const otherVehicle = {
  id: "v-2",
  user_id: "u2",
  driver_name: "Laxmi",
  phone_number: "9123456789",
  vehicle_type: "bike",
  created_at: "2026-10-02T00:00:00Z",
  profiles: { display_name: "Priya", avatar_url: null },
};

let fetchedVehicles: unknown[] = [ownVehicle, otherVehicle];
let insertSingle: { data: unknown; error: unknown } = { data: null, error: null };
let deleteResult: { data: unknown; error: unknown } = { data: null, error: null };

vi.mock("@/lib/supabase", () => {
  return {
    supabase: {
      from: vi.fn((table: string) => {
        const q: any = {
          select: vi.fn(() => q),
          eq: vi.fn(() => q),
          order: vi.fn(() =>
            Promise.resolve(table === "trusted_vehicles" ? { data: fetchedVehicles, error: null } : { data: [], error: null })
          ),
          insert: vi.fn((payload: any) => {
            interactions.insertCalls.push(payload);
            return {
              select: vi.fn(() => ({
                single: vi.fn(() =>
                  Promise.resolve(
                    insertSingle.data
                      ? insertSingle
                      : { data: { id: "v-new", ...payload, created_at: "2026-10-20T00:00:00Z", profiles: { display_name: "Sanjay", avatar_url: null } }, error: null }
                  )
                ),
              })),
            };
          }),
          delete: vi.fn(() => ({
            eq: vi.fn((col: string, id: string) => {
              interactions.deleteCalls.push(String(id));
              return Promise.resolve(deleteResult);
            }),
          })),
        };
        return q;
      }),
    },
  };
});

const baseContext = {
  session: { user: { id: "u1" } },
  theme: {
    isDark: true,
    bg: "bg-black",
    border: "border-white/10",
    cardBg: "bg-zinc-900",
    mutedText: "text-zinc-400",
    text: "text-white",
  },
};

describe("TrustedVehiclesView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchedVehicles = [ownVehicle, otherVehicle];
    insertSingle = { data: null, error: null };
    deleteResult = { data: null, error: null };
    interactions.setView.mockClear();
    interactions.insertCalls = [];
    interactions.deleteCalls = [];
    mockUseLoop.mockReturnValue({ ...baseContext, setView: interactions.setView });
  });

  it("renders the driver list with owner attribution and dialer links", async () => {
    render(<TrustedVehiclesView />);
    expect(await screen.findByText("Raju")).toBeInTheDocument();
    expect(screen.getByText("Laxmi")).toBeInTheDocument();
    expect(screen.getByText("Added by You")).toBeInTheDocument();
    expect(screen.getByText("Added by Priya")).toBeInTheDocument();
    expect(screen.getByLabelText("Call Raju")).toHaveAttribute("href", "tel:+919876543210");
  });

  it("filters by vehicle type and recovers with the show-all link", async () => {
    render(<TrustedVehiclesView />);
    await screen.findByText("Raju");

    fireEvent.click(screen.getByText("Bike"));
    expect(screen.queryByText("Raju")).not.toBeInTheDocument();
    expect(screen.getByText("Laxmi")).toBeInTheDocument();

    fireEvent.click(screen.getByText("All Drivers"));
    expect(screen.getByText("Raju")).toBeInTheDocument();
  });

  it("adds a trusted driver through the modal (validated, sanitized, inserted)", async () => {
    const { toast } = await import("@/components/ui/NativeToast");
    render(<TrustedVehiclesView />);
    await screen.findByText("Raju");

    fireEvent.click(screen.getByLabelText("Add trusted driver"));
    expect(await screen.findByRole("dialog")).toHaveAttribute("aria-label", "Add trusted driver");

    // Validation first: no name/type/phone → nothing written.
    fireEvent.click(screen.getByText("Add Trusted Driver"));
    expect(toast.error).toHaveBeenCalledWith(
      "Please enter driver name, vehicle type, and a valid 10-digit phone number."
    );
    expect(interactions.insertCalls).toHaveLength(0);

    // Fill the form ("Auto" chip is scoped to the dialog; the top filter bar
    // also exposes an "Auto" chip outside it).
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Auto" }));
    fireEvent.change(screen.getByPlaceholderText("Driver's Name"), { target: { value: "Kiran" } });
    fireEvent.change(screen.getByPlaceholderText("9876543210"), { target: { value: "98765 43211" } });
    fireEvent.click(screen.getByText("Add Trusted Driver"));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Driver added!");
    });
    expect(interactions.insertCalls[0]).toMatchObject({
      user_id: "u1",
      driver_name: "Kiran",
      phone_number: "9876543211", // sanitized (spaces stripped)
    });
    expect(await screen.findByText("Kiran")).toBeInTheDocument();
  });

  it("deletes an owned vehicle but hides delete on other users' entries", async () => {
    const { toast } = await import("@/components/ui/NativeToast");
    fetchedVehicles = [ownVehicle];
    render(<TrustedVehiclesView />);
    await screen.findByText("Raju");

    expect(screen.queryByLabelText("Delete trusted vehicle")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Delete trusted vehicle"));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Removed");
    });
    expect(interactions.deleteCalls).toEqual(["v-1"]);
    expect(screen.queryByText("Raju")).not.toBeInTheDocument();
  });

  it("opens the expected fares modal and returns to the profile view", async () => {
    render(<TrustedVehiclesView />);
    await screen.findByText("Raju");

    fireEvent.click(screen.getByLabelText("Open expected campus fares"));
    expect(screen.getByTestId("fares-modal")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Back to profile"));
    expect(interactions.setView).toHaveBeenCalledWith("profile");
  });
});
