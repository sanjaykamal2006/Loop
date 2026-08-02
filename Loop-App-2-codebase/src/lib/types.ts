export type View = "home" | "create" | "chat-list" | "profile" | "ride-details" | "chat" | "trusted-vehicles";

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
  status?: "open" | "started" | "ended";
  start_point?: string;
  total_fare?: number;
}

export interface Profile {
  display_name: string;
  theme: "dark" | "light";
  gender?: string;
  reg_no?: string;
  avatar_url?: string;
}

export interface Message {
  id: string;
  loop_id: string;
  user_id: string;
  content: string;
  created_at: string;
  edited_at?: string;
  reactions?: Record<string, string[]>;
  profiles?: { display_name: string; avatar_url?: string };
}

export interface LoopMember {
  user_id: string;
  profiles: {
    display_name: string;
    gender: string;
    avatar_url?: string;
  } | null;
}

export interface LoopParticipant {
  id: string;
  loop_id: string;
  user_id: string;
  joined_at: string;
  profiles?: {
    display_name: string;
    avatar_url?: string;
  };
}

export interface ThemeClasses {
  isDark: boolean;
  bg: string;
  text: string;
  border: string;
  cardBg: string;
  mutedText: string;
}

export interface TrustedVehicle {
  id: string;
  user_id: string;
  driver_name: string;
  phone_number: string;
  vehicle_type: "bike" | "auto" | "share_auto";
  created_at: string;
  profiles?: { display_name: string; avatar_url?: string };
}
