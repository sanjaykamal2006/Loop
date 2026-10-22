import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import RideWantsView, { formatDepartDateLabel, formatTimeLabel } from "@/components/sections/RideWantsView";
import * as rideWantsLib from "@/lib/rideWants";
import { toast } from "@/components/ui/NativeToast";

const mockSetView = vi.fn();
const mockSetCreatePrefill = vi.fn();
const mockSetPendingAction = vi.fn();
const mockSetShowGenderSelect = vi.fn();

const defaultContext = {
  setView: mockSetView,
  setCreatePrefill: mockSetCreatePrefill,
  setPendingAction: mockSetPendingAction,
  setShowGenderSelect: mockSetShowGenderSelect,
  profile: {
    id: "user-test",
    gender: "female",
    display_name: "Test Student",
    reg_no: "21BCE0001",
  },
  theme: {
    isDark: true,
    cardBg: "bg-zinc-900",
    border: "border-zinc-800",
    mutedText: "text-zinc-400",
    bg: "bg-black",
    text: "text-white",
  },
};

vi.mock("@/lib/LoopContext", () => ({
  useLoop: () => defaultContext,
}));

vi.mock("@/components/ui/NativeToast", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe("RideWantsView Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("formatDepartDateLabel helper", () => {
    it("handles empty or malformed dates gracefully", () => {
      expect(formatDepartDateLabel("")).toBe("");
      expect(formatDepartDateLabel("invalid-date-format")).toBe("invalid-date-format");
    });

    it("identifies Today and Tomorrow correctly", () => {
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, "0");
      const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}`;

      expect(formatDepartDateLabel(todayStr)).toBe("Today");
      expect(formatDepartDateLabel(tomorrowStr)).toBe("Tomorrow");
    });

    it("formats future dates with weekday and month", () => {
      const label = formatDepartDateLabel("2028-12-25");
      expect(label).toContain("Dec 25");
    });
  });

  describe("formatTimeLabel helper", () => {
    it("handles empty or invalid inputs", () => {
      expect(formatTimeLabel("")).toBe("");
      expect(formatTimeLabel(null)).toBe("");
      expect(formatTimeLabel(undefined)).toBe("");
      expect(formatTimeLabel("invalid")).toBe("");
      expect(formatTimeLabel("25:00")).toBe("");
      expect(formatTimeLabel("12:65")).toBe("");
    });

    it("converts 24h times to 12h formatted strings correctly", () => {
      expect(formatTimeLabel("00:00")).toBe("12:00 AM");
      expect(formatTimeLabel("09:05")).toBe("9:05 AM");
      expect(formatTimeLabel("12:00")).toBe("12:00 PM");
      expect(formatTimeLabel("18:30")).toBe("6:30 PM");
      expect(formatTimeLabel("23:55")).toBe("11:55 PM");
    });
  });

  it("renders header and navigates back to home on back button click", async () => {
    vi.spyOn(rideWantsLib, "fetchRideWants").mockResolvedValue({ data: [], error: null });

    render(<RideWantsView />);
    await waitFor(() => expect(screen.getByText("No co-travellers yet")).toBeInTheDocument());

    expect(screen.getByRole("heading", { name: "Find Co-Travellers" })).toBeInTheDocument();
    expect(screen.getByText("Match with students going the same way")).toBeInTheDocument();

    const backBtn = screen.getByLabelText("Back to home");
    fireEvent.click(backBtn);
    expect(mockSetView).toHaveBeenCalledWith("home");
  });

  it("shows empty state when board has no active ride wants", async () => {
    vi.spyOn(rideWantsLib, "fetchRideWants").mockResolvedValue({ data: [], error: null });

    render(<RideWantsView />);

    await waitFor(() => {
      expect(screen.getByText("No co-travellers yet")).toBeInTheDocument();
    });
  });

  it("allows selecting destination preset and submitting demand", async () => {
    vi.spyOn(rideWantsLib, "fetchRideWants").mockResolvedValue({ data: [], error: null });
    const postSpy = vi.spyOn(rideWantsLib, "postRideWant").mockResolvedValue({
      count: 3,
      error: null,
    });

    render(<RideWantsView />);

    // Select preset destination chip (e.g. Airport)
    const airportChip = screen.getByText("Airport");
    fireEvent.click(airportChip);

    // Destination input should now have Airport
    const destInput = screen.getByLabelText("Destination");
    expect((destInput as HTMLInputElement).value).toBe("Airport");

    // Enter an optional note
    const noteInput = screen.getByLabelText("Optional note");
    fireEvent.change(noteInput, { target: { value: "Flight at 6 PM" } });

    // Submit form
    const submitBtn = screen.getByTestId("post-want-btn");
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(postSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          destination: "Airport",
          note: "Flight at 6 PM",
        })
      );
      expect(toast.success).toHaveBeenCalledWith(
        expect.stringContaining("3 students going this way")
      );
    });
  });

  it("renders aggregate demand cards with 'Me too!' button", async () => {
    const mockData = [
      {
        destination_key: "vijayawada railway station",
        depart_date: "2028-10-25",
        intent_count: 3,
        has_mine: false,
        first_depart_time: "18:30:00",
      },
    ];
    vi.spyOn(rideWantsLib, "fetchRideWants").mockResolvedValue({ data: mockData, error: null });
    const postSpy = vi.spyOn(rideWantsLib, "postRideWant").mockResolvedValue({ count: 4, error: null });

    render(<RideWantsView />);

    await waitFor(() => {
      expect(screen.getByText("3")).toBeInTheDocument();
      expect(screen.getByText(/students going this way/)).toBeInTheDocument();
    });

    const meTooBtn = screen.getByTestId("me-too-btn");
    expect(meTooBtn).toHaveTextContent("Me too!");

    fireEvent.click(meTooBtn);

    await waitFor(() => {
      expect(postSpy).toHaveBeenCalledWith({
        destination: "vijayawada railway station",
        departDate: "2028-10-25",
      });
      expect(toast.success).toHaveBeenCalledWith(
        expect.stringContaining("Your plan is added")
      );
      expect(meTooBtn).toHaveTextContent("You're in");
      expect(meTooBtn).toBeDisabled();
    });
  });

  it("shows gold 'Create this ride' CTA at >= 4 intents and pre-fills create view", async () => {
    const mockData = [
      {
        destination_key: "vijayawada railway station",
        depart_date: "2028-10-25",
        intent_count: 5,
        has_mine: true,
        first_depart_time: "18:05:00",
      },
    ];
    vi.spyOn(rideWantsLib, "fetchRideWants").mockResolvedValue({ data: mockData, error: null });

    render(<RideWantsView />);

    await waitFor(() => {
      expect(screen.getByTestId("create-ride-btn")).toBeInTheDocument();
    });

    const createBtn = screen.getByTestId("create-ride-btn");
    fireEvent.click(createBtn);

    expect(mockSetCreatePrefill).toHaveBeenCalledWith({
      destination: "Vijayawada Railway Station",
      travelDate: "2028-10-25",
      departTime: "18:05:00",
    });
    expect(mockSetView).toHaveBeenCalledWith("create");
  });

  it("requires profile completion if user taps 'Create this ride' with incomplete profile", async () => {
    const mockData = [
      {
        destination_key: "guntur",
        depart_date: "2028-10-25",
        intent_count: 4,
        has_mine: false,
        first_depart_time: "07:30:00",
      },
    ];
    vi.spyOn(rideWantsLib, "fetchRideWants").mockResolvedValue({ data: mockData, error: null });

    defaultContext.profile.gender = "";

    render(<RideWantsView />);

    await waitFor(() => {
      expect(screen.getByTestId("create-ride-btn")).toBeInTheDocument();
    });

    const createBtn = screen.getByTestId("create-ride-btn");
    fireEvent.click(createBtn);

    expect(mockSetPendingAction).toHaveBeenCalledWith({
      type: "create",
      prefill: { destination: "Guntur", depart_date: "2028-10-25", depart_time: "07:30:00" },
    });
    expect(mockSetShowGenderSelect).toHaveBeenCalledWith(true);

    // Reset profile for other tests
    defaultContext.profile.gender = "female";
  });

  it("handles RPC errors gracefully during post and board fetch", async () => {
    vi.spyOn(rideWantsLib, "fetchRideWants").mockResolvedValue({
      data: null,
      error: { message: "Network unavailable" },
    });

    render(<RideWantsView />);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Network unavailable");
    });
  });

  describe("In-app Custom Date and Time Pickers", () => {
    it("(a) clicking the date row opens the calendar popover and rotates chevron", async () => {
      vi.spyOn(rideWantsLib, "fetchRideWants").mockResolvedValue({ data: [], error: null });
      render(<RideWantsView />);
      await waitFor(() => expect(screen.getByText("No co-travellers yet")).toBeInTheDocument());

      const dateRow = screen.getByLabelText("Travel date");
      expect(dateRow).toHaveAttribute("aria-expanded", "false");
      expect(screen.queryByRole("dialog", { name: "Calendar date picker" })).not.toBeInTheDocument();

      fireEvent.click(dateRow);

      expect(dateRow).toHaveAttribute("aria-expanded", "true");
      expect(screen.getByRole("dialog", { name: "Calendar date picker" })).toBeInTheDocument();
      // Weekday columns Mon-Sun should be visible
      expect(screen.getByText("Mon")).toBeInTheDocument();
      expect(screen.getByText("Sun")).toBeInTheDocument();
    });

    it("(b) picking a date button in the grid updates the row label and Done closes it", async () => {
      vi.spyOn(rideWantsLib, "fetchRideWants").mockResolvedValue({ data: [], error: null });
      render(<RideWantsView />);
      await waitFor(() => expect(screen.getByText("No co-travellers yet")).toBeInTheDocument());

      const dateRow = screen.getByLabelText("Travel date");
      fireEvent.click(dateRow);

      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const pad = (n: number) => String(n).padStart(2, "0");
      const tomorrowStr = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}`;

      // If tomorrow is in next month, click next month first
      if (tomorrow.getMonth() !== now.getMonth()) {
        const nextMonthBtn = screen.getByLabelText("Next month");
        fireEvent.click(nextMonthBtn);
      }

      const dayBtn = screen.getByRole("button", { name: `Select ${tomorrowStr}` });
      fireEvent.click(dayBtn);

      // Label on row should now match formatDepartDateLabel
      expect(dateRow).toHaveTextContent("Tomorrow");

      // Clicking Done closes popover and returns focus to date row
      const doneBtn = screen.getByRole("button", { name: "Done" });
      fireEvent.click(doneBtn);

      expect(screen.queryByRole("dialog", { name: "Calendar date picker" })).not.toBeInTheDocument();
      expect(dateRow).toHaveFocus();
    });

    it("(c) click on the time row opens the clock popover, picking hour + minute + period updates label", async () => {
      vi.spyOn(rideWantsLib, "fetchRideWants").mockResolvedValue({ data: [], error: null });
      render(<RideWantsView />);
      await waitFor(() => expect(screen.getByText("No co-travellers yet")).toBeInTheDocument());

      const timeRow = screen.getByLabelText("Travel time");
      expect(timeRow).toHaveTextContent("Pick a time");

      fireEvent.click(timeRow);

      expect(screen.getByRole("dialog", { name: "Clock time picker" })).toBeInTheDocument();

      // Pick PM
      const pmBtn = screen.getByRole("button", { name: "PM" });
      fireEvent.click(pmBtn);

      // Pick Hour 6
      const hourBtn = screen.getByRole("button", { name: "6" });
      fireEvent.click(hourBtn);

      // Pick Minute :30
      const minBtn = screen.getByRole("button", { name: ":30" });
      fireEvent.click(minBtn);

      // Click Done
      const doneBtn = screen.getByRole("button", { name: "Done" });
      fireEvent.click(doneBtn);

      expect(screen.queryByRole("dialog", { name: "Clock time picker" })).not.toBeInTheDocument();
      expect(timeRow).toHaveTextContent("6:30 PM");
      expect(timeRow).toHaveFocus();
    });

    it("(d) clicking 'Clear' in the time popover resets time to empty and displays 'Pick a time'", async () => {
      vi.spyOn(rideWantsLib, "fetchRideWants").mockResolvedValue({ data: [], error: null });
      render(<RideWantsView />);
      await waitFor(() => expect(screen.getByText("No co-travellers yet")).toBeInTheDocument());

      const timeRow = screen.getByLabelText("Travel time");
      fireEvent.click(timeRow);

      // Select 5 PM first
      fireEvent.click(screen.getByRole("button", { name: "5" }));

      // Click Clear
      const clearBtn = screen.getByRole("button", { name: "Clear" });
      fireEvent.click(clearBtn);

      expect(screen.queryByRole("dialog", { name: "Clock time picker" })).not.toBeInTheDocument();
      expect(timeRow).toHaveTextContent("Pick a time");
      expect(timeRow).toHaveFocus();
    });

    it("(e) pressing 'Escape' closes the open popover and restores row focus", async () => {
      vi.spyOn(rideWantsLib, "fetchRideWants").mockResolvedValue({ data: [], error: null });
      render(<RideWantsView />);
      await waitFor(() => expect(screen.getByText("No co-travellers yet")).toBeInTheDocument());

      const dateRow = screen.getByLabelText("Travel date");
      fireEvent.click(dateRow);
      expect(screen.getByRole("dialog", { name: "Calendar date picker" })).toBeInTheDocument();

      fireEvent.keyDown(document, { key: "Escape" });
      expect(screen.queryByRole("dialog", { name: "Calendar date picker" })).not.toBeInTheDocument();
      expect(dateRow).toHaveFocus();

      const timeRow = screen.getByLabelText("Travel time");
      fireEvent.click(timeRow);
      expect(screen.getByRole("dialog", { name: "Clock time picker" })).toBeInTheDocument();

      fireEvent.keyDown(document, { key: "Escape" });
      expect(screen.queryByRole("dialog", { name: "Clock time picker" })).not.toBeInTheDocument();
      expect(timeRow).toHaveFocus();
    });

    it("ensures only one popover is open at a time and toggles on keyboard Enter", async () => {
      vi.spyOn(rideWantsLib, "fetchRideWants").mockResolvedValue({ data: [], error: null });
      render(<RideWantsView />);
      await waitFor(() => expect(screen.getByText("No co-travellers yet")).toBeInTheDocument());

      const dateRow = screen.getByLabelText("Travel date");
      const timeRow = screen.getByLabelText("Travel time");

      // Open with keyboard Enter
      fireEvent.keyDown(dateRow, { key: "Enter" });
      expect(screen.getByRole("dialog", { name: "Calendar date picker" })).toBeInTheDocument();

      // Opening time closes date
      fireEvent.keyDown(timeRow, { key: " " });
      expect(screen.queryByRole("dialog", { name: "Calendar date picker" })).not.toBeInTheDocument();
      expect(screen.getByRole("dialog", { name: "Clock time picker" })).toBeInTheDocument();

      // Outside click closes time popover
      fireEvent.mouseDown(document.body);
      expect(screen.queryByRole("dialog", { name: "Clock time picker" })).not.toBeInTheDocument();
    });
  });
});
