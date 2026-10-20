export type View = "home" | "create" | "chat-list" | "profile" | "ride-details" | "chat" | "trusted-vehicles" | "past-loops";

export interface Loop {
  id: string;
  creator_id: string;
  destination: string;
  departure_time: string;
  participants_limit: number;
  is_female_only: boolean;
  purpose?: string;
  expires_at: string;
  created_at: string;
  member_count?: number;
  status?: "open" | "started" | "in_progress" | "cancelled" | "ended" | "active";
  start_point?: string | null;
  total_fare?: number | null;
  is_driver_offering?: boolean | null;
  vehicle_type?: "car" | "bike" | "scooter" | null;
  creator?: {
    display_name?: string | null;
    avatar_url?: string | null;
    reg_no?: string | null;
  } | null;
}

export interface EmergencyContact {
  id?: string;
  user_id?: string;
  name: string;
  phone: string;
  relation?: string | null;
  created_at?: string | null;
}

export interface Profile {
  display_name: string;
  theme: "dark" | "light";
  gender?: string | null;
  reg_no?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  phone_number?: string | null;
  is_student_verified?: boolean | null;
  emergency_contact?: EmergencyContact | null;
  emergency_contacts?: EmergencyContact[];
}

export interface Message {
  id: string;
  loop_id: string;
  user_id: string;
  content: string;
  created_at: string;
  edited_at?: string | null;
  reactions?: Record<string, string[]>;
  profiles?: {
    display_name: string;
    avatar_url?: string | null;
    reg_no?: string | null;
    gender?: string | null;
    bio?: string | null;
    phone_number?: string | null;
    is_student_verified?: boolean | null;
  };
}

export interface LoopMember {
  user_id: string;
  profiles: {
    display_name: string;
    gender?: string | null;
    avatar_url?: string | null;
    reg_no?: string | null;
    bio?: string | null;
    phone_number?: string | null;
    is_student_verified?: boolean | null;
  } | null;
}

export interface LoopParticipant {
  id: string;
  loop_id: string;
  user_id: string;
  joined_at: string;
  profiles?: {
    display_name: string;
    avatar_url?: string | null;
    reg_no?: string | null;
    gender?: string | null;
    bio?: string | null;
  };
}

export interface ThemeClasses {
  isDark: boolean;
  bg: string;
  text: string;
  border: string;
  cardBg: string;
  mutedText: string;
  accentText: string;
  accentBg: string;
  accentBgSubtle: string;
  accentBorder: string;
  accentBorderSubtle: string;
  primaryBtn: string;
  accentColor: string;
}

export interface TrustedVehicle {
  id: string;
  user_id: string;
  driver_name: string;
  phone_number: string;
  vehicle_type: "bike" | "auto" | "share_auto";
  from_location?: string;
  to_location?: string;
  expected_fare?: number;
  created_at: string;
  profiles?: { display_name: string; avatar_url?: string };
}

export interface ExpectedFare {
  id: string;
  user_id: string | null; // null for other users' rows (identity-minimizing RPC)
  from_location: string;
  to_location: string;
  expected_fare: number;
  vehicle_type?: string;
  created_at: string;
  profiles?: { display_name: string; avatar_url?: string };
}
