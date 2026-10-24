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

    // Select travel date
    const dateInput = screen.getByLabelText("Travel date");
    fireEvent.change(dateInput, { target: { value: "2028-10-25" } });

    // Submit form
    const submitBtn = screen.getByTestId("post-want-btn");
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(postSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          destination: "Airport",
          departDate: "2028-10-25",
          note: "Flight at 6 PM",
        })
      );
      expect(toast.success).toHaveBeenCalledWith(
        expect.stringContaining("3 students going this way")
      );
    });
  });

  it("renders a solo own-row with a 'Just you so far' label instead of a count", async () => {
    const mockData = [
      {
        destination_key: "vijayawada",
        depart_date: "2028-10-25",
        intent_count: 1,
        has_mine: true,
        first_depart_time: null,
      },
    ];
    vi.spyOn(rideWantsLib, "fetchRideWants").mockResolvedValue({ data: mockData, error: null });

    render(<RideWantsView />);

    await waitFor(() => {
      expect(screen.getByText("Just you so far — others can still join")).toBeInTheDocument();
      // Solo rows must not show the multi-student count phrasing
      expect(screen.queryByText(/students going this way/)).not.toBeInTheDocument();
    });

    // Own solo row: the action button reads as an undo affordance and stays
    // enabled — an accidental "Me too!" can always be taken back.
    const meTooBtn = screen.getByTestId("me-too-btn");
    expect(meTooBtn).toHaveTextContent("Undo");
    expect(meTooBtn).toBeEnabled();
  });

  it("renders someone else's solo row as demand the viewer can join", async () => {
    const mockData = [
      {
        destination_key: "guntur",
        depart_date: "2028-10-25",
        intent_count: 1,
        has_mine: false,
        first_depart_time: null,
      },
    ];
    vi.spyOn(rideWantsLib, "fetchRideWants").mockResolvedValue({ data: mockData, error: null });

    render(<RideWantsView />);

    await waitFor(() => {
      expect(screen.getByText("1 student wants this — be the 2nd!")).toBeInTheDocument();
      expect(screen.queryByText(/students going this way/)).not.toBeInTheDocument();
    });

    // Viewer hasn't joined yet: button stays an active "Me too!" joiner
    expect(screen.getByTestId("me-too-btn")).toHaveTextContent("Me too!");
    expect(screen.getByTestId("me-too-btn")).not.toBeDisabled();
  });

  it("calls removeRideWant when Undo is tapped on a co-passenger's joined row", async () => {
    vi.spyOn(rideWantsLib, "fetchRideWants")
      .mockResolvedValueOnce({
        data: [
          { destination_key: "vijayawada", depart_date: "2028-10-25", intent_count: 2, has_mine: true, is_creator: false, first_depart_time: null },
        ],
        error: null,
      })
      .mockResolvedValueOnce({ data: [], error: null });
    const undoSpy = vi.spyOn(rideWantsLib, "removeRideWant").mockResolvedValueOnce({ ok: true, error: null });

    render(<RideWantsView />);

    await waitFor(() => expect(screen.getByTestId("me-too-btn")).toBeEnabled());
    const meTooBtn = screen.getByTestId("me-too-btn");
    expect(meTooBtn).toHaveTextContent("Undo");
    fireEvent.click(meTooBtn);

    await waitFor(() => {
      expect(undoSpy).toHaveBeenCalledWith({ destination: "vijayawada", departDate: "2028-10-25" });
      expect(toast.success).toHaveBeenCalledWith("Removed from co-traveller group");
    });
  });

  it("renders 'Delete' button for the ride creator and calls removeRideWant on click", async () => {
    vi.spyOn(rideWantsLib, "fetchRideWants")
      .mockResolvedValueOnce({
        data: [
          { destination_key: "vijayawada", depart_date: "2028-10-25", intent_count: 3, has_mine: true, is_creator: true, first_depart_time: null },
        ],
        error: null,
      })
      .mockResolvedValueOnce({ data: [], error: null });
    const undoSpy = vi.spyOn(rideWantsLib, "removeRideWant").mockResolvedValueOnce({ ok: true, error: null });

    render(<RideWantsView />);

    await waitFor(() => expect(screen.getByTestId("me-too-btn")).toBeEnabled());
    const meTooBtn = screen.getByTestId("me-too-btn");
    expect(meTooBtn).toHaveTextContent("Delete");
    expect(meTooBtn).toHaveAttribute("aria-label", "Delete your ride plan");
    fireEvent.click(meTooBtn);

    await waitFor(() => {
      expect(undoSpy).toHaveBeenCalledWith({ destination: "vijayawada", departDate: "2028-10-25" });
      expect(toast.success).toHaveBeenCalledWith("Ride plan deleted");
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
      // Joined group: button flips to "Undo" and stays enabled so the co-passenger can leave anytime
      expect(meTooBtn).toHaveTextContent("Undo");
      expect(meTooBtn).toBeEnabled();
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

  describe("Native Android / OS Date and Time Pickers", () => {
    it("renders native Travel Date input with min=today and updates displayed label on change", async () => {
      vi.spyOn(rideWantsLib, "fetchRideWants").mockResolvedValue({ data: [], error: null });
      render(<RideWantsView />);
      await waitFor(() => expect(screen.getByText("No co-travellers yet")).toBeInTheDocument());

      const dateInput = screen.getByLabelText("Travel date") as HTMLInputElement;
      expect(dateInput).toBeInTheDocument();
      expect(dateInput.type).toBe("date");
      expect(screen.getByText("Pick a date")).toBeInTheDocument();

      // Change date
      fireEvent.change(dateInput, { target: { value: "2028-12-25" } });
      expect(dateInput.value).toBe("2028-12-25");
      expect(screen.getByText(/Dec 25/)).toBeInTheDocument();
    });

    it("clicking the date row or input invokes showPicker when available", async () => {
      vi.spyOn(rideWantsLib, "fetchRideWants").mockResolvedValue({ data: [], error: null });
      const showPickerSpy = vi.fn();
      HTMLInputElement.prototype.showPicker = showPickerSpy;

      render(<RideWantsView />);
      await waitFor(() => expect(screen.getByText("No co-travellers yet")).toBeInTheDocument());

      const dateInput = screen.getByLabelText("Travel date");
      fireEvent.click(dateInput);

      expect(showPickerSpy).toHaveBeenCalled();
    });

    it("renders native Travel Time input and updates displayed label on change", async () => {
      vi.spyOn(rideWantsLib, "fetchRideWants").mockResolvedValue({ data: [], error: null });
      render(<RideWantsView />);
      await waitFor(() => expect(screen.getByText("No co-travellers yet")).toBeInTheDocument());

      const timeInput = screen.getByLabelText("Travel time") as HTMLInputElement;
      expect(timeInput).toBeInTheDocument();
      expect(timeInput.type).toBe("time");
      expect(screen.getByText("Pick a time")).toBeInTheDocument();

      // Change time
      fireEvent.change(timeInput, { target: { value: "18:30" } });
      expect(timeInput.value).toBe("18:30");
      expect(screen.getByText("6:30 PM")).toBeInTheDocument();
    });

    it("clicking the time row or input invokes showPicker when available", async () => {
      vi.spyOn(rideWantsLib, "fetchRideWants").mockResolvedValue({ data: [], error: null });
      const showPickerSpy = vi.fn();
      HTMLInputElement.prototype.showPicker = showPickerSpy;

      render(<RideWantsView />);
      await waitFor(() => expect(screen.getByText("No co-travellers yet")).toBeInTheDocument());

      const timeInput = screen.getByLabelText("Travel time");
      fireEvent.click(timeInput);

      expect(showPickerSpy).toHaveBeenCalled();
    });

    it("submitting form with selected date and time passes them to postRideWant", async () => {
      vi.spyOn(rideWantsLib, "fetchRideWants").mockResolvedValue({ data: [], error: null });
      const postSpy = vi.spyOn(rideWantsLib, "postRideWant").mockResolvedValue({
        count: 2,
        error: null,
      });

      render(<RideWantsView />);
      await waitFor(() => expect(screen.getByText("No co-travellers yet")).toBeInTheDocument());

      const destInput = screen.getByLabelText("Destination");
      fireEvent.change(destInput, { target: { value: "Airport" } });

      const dateInput = screen.getByLabelText("Travel date");
      fireEvent.change(dateInput, { target: { value: "2028-10-25" } });

      const timeInput = screen.getByLabelText("Travel time");
      fireEvent.change(timeInput, { target: { value: "14:15" } });

      const submitBtn = screen.getByTestId("post-want-btn");
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(postSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            destination: "Airport",
            departDate: "2028-10-25",
            departTime: "14:15",
          })
        );
      });
    });
  });
});
