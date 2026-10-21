import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import ExpectedFaresModal from "@/components/sections/ExpectedFaresModal";

const mockUseLoop = vi.fn();

vi.mock("@/lib/LoopContext", () => ({
  useLoop: () => mockUseLoop(),
}));
vi.mock("@/components/ui/NativeToast", () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}));
vi.mock("@/lib/haptics", () => ({ triggerHaptic: vi.fn() }));

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn() }));
vi.mock("@/lib/supabase", () => ({ supabase: { rpc: mocks.rpc, from: mocks.from } }));

const rpcRows = [
  {
    id: "f-1", user_id: "u1", from_location: "Campus", to_location: "Vijayawada Station",
    expected_fare: 50, vehicle_type: "auto", created_at: "2026-10-01T00:00:00Z",
    display_name: "Sanjay", avatar_url: null,
  },
  {
    id: "f-2", user_id: "u2", from_location: "Campus", to_location: "Amaravati",
    expected_fare: 90, vehicle_type: "bike", created_at: "2026-10-02T00:00:00Z",
    display_name: "Priya", avatar_url: null,
  },
];

const insertData = {
  id: "f-new", user_id: "u1", from_location: "Campus", to_location: "Amaravati",
  expected_fare: 60, vehicle_type: "bike", created_at: "2026-10-20T00:00:00Z",
  profiles: { display_name: "Sanjay", avatar_url: null },
};

const baseContext = {
  session: { user: { id: "u1" } },
  theme: {
    isDark: true, bg: "bg-black", border: "border-white/10",
    cardBg: "bg-zinc-900", mutedText: "text-zinc-400", text: "text-white",
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.rpc.mockResolvedValue({ data: rpcRows, error: null });
  mocks.from.mockImplementation(() => {
    const q: any = {
      select: vi.fn(() => q),
      eq: vi.fn(() => q),
      insert: vi.fn(() => q),
      single: vi.fn(() => Promise.resolve({ data: insertData, error: null })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    };
    return q;
  });
  mockUseLoop.mockReturnValue(baseContext);
});

describe("ExpectedFaresModal", () => {
  it("renders nothing while closed", () => {
    const { container } = render(<ExpectedFaresModal isOpen={false} onClose={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("loads the community fare board via the SECURITY DEFINER RPC", async () => {
    render(<ExpectedFaresModal isOpen onClose={vi.fn()} />);

    expect(await screen.findByText("Vijayawada Station")).toBeInTheDocument();
    expect(screen.getByText("Amaravati")).toBeInTheDocument();
    expect(screen.getByText("₹50")).toBeInTheDocument();
    expect(screen.getByText("₹90")).toBeInTheDocument();
    // Owner entries are deletable; other members' entries are not.
    expect(screen.getByText("By You")).toBeInTheDocument();
    expect(screen.getByText("By Priya")).toBeInTheDocument();
    expect(screen.getAllByLabelText("Delete fare")).toHaveLength(1);
    expect(mocks.rpc).toHaveBeenCalledWith("get_expected_fares");
  });

  it("toasts a load failure when the RPC errors", async () => {
    const { toast } = await import("@/components/ui/NativeToast");
    mocks.rpc.mockRejectedValue({ message: "RPC down" });

    render(<ExpectedFaresModal isOpen onClose={vi.fn()} />);
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to load expected fares");
    });
  });

  it("validates the add-fare form before writing anything", async () => {
    const { toast } = await import("@/components/ui/NativeToast");
    render(<ExpectedFaresModal isOpen onClose={vi.fn()} />);
    await screen.findByText("Vijayawada Station");

    fireEvent.click(screen.getByText("+ Add Expected Fare"));
    // No destination → error
    fireEvent.click(screen.getByText("Save Expected Fare"));
    expect(toast.error).toHaveBeenCalledWith("Please enter a destination");

    // Destination but invalid amount → error
    fireEvent.change(screen.getByPlaceholderText("e.g. Railway Station / Airport"), { target: { value: "Amaravati" } });
    fireEvent.click(screen.getByText("Save Expected Fare"));
    expect(toast.error).toHaveBeenCalledWith("Please enter a valid fare amount");

    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("creates a fare entry, prepends it, and returns to the list", async () => {
    const { toast } = await import("@/components/ui/NativeToast");
    render(<ExpectedFaresModal isOpen onClose={vi.fn()} />);
    await screen.findByText("Vijayawada Station");

    fireEvent.click(screen.getByText("+ Add Expected Fare"));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Bike" }));
    fireEvent.change(screen.getByPlaceholderText("e.g. Railway Station / Airport"), { target: { value: "Amaravati" } });
    fireEvent.change(screen.getByPlaceholderText("e.g. 150 (standard rate)"), { target: { value: "60" } });
    fireEvent.click(screen.getByText("Save Expected Fare"));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Expected fare added!");
    });
    expect(mocks.from).toHaveBeenCalledWith("expected_fares");
    expect(await screen.findByText("₹60")).toBeInTheDocument();
  });

  it("removes an owned fare entry", async () => {
    const { toast } = await import("@/components/ui/NativeToast");
    render(<ExpectedFaresModal isOpen onClose={vi.fn()} />);
    await screen.findByText("Vijayawada Station");

    fireEvent.click(screen.getByLabelText("Delete fare"));
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Fare entry removed");
    });
    expect(screen.queryByText("₹50")).not.toBeInTheDocument();
    expect(screen.getByText("₹90")).toBeInTheDocument();
  });

  it("filters the board with the search box when enough rows exist", async () => {
    // Search input appears only for >2 rows.
    mocks.rpc.mockResolvedValue({
      data: [
        ...rpcRows,
        { id: "f-3", user_id: "u3", from_location: "Campus", to_location: "KL University", expected_fare: 120, vehicle_type: "cab", created_at: "2026-10-03T00:00:00Z", display_name: "Ram", avatar_url: null },
      ],
      error: null,
    });
    render(<ExpectedFaresModal isOpen onClose={vi.fn()} />);
    const search = await screen.findByPlaceholderText("Search route (e.g. Station, Airport)...");
    fireEvent.change(search, { target: { value: "university" } });
    expect(screen.getByText("KL University")).toBeInTheDocument();
    expect(screen.queryByText("Amaravati")).not.toBeInTheDocument();
  });
});
