export type View = "home" | "create" | "chat-list" | "profile" | "ride-details" | "chat";

export interface Loop {
  id: string;
  creator_id: string;
  destination: string;
  departure_time: string;
  participants_limit: number;
  is_female_only: boolean;
  purpose?: string;
  expires_at: string;
  member_count?: number;
}

export interface Profile {
  display_name: string;
  theme: "dark" | "light";
  gender?: string;
  reg_no?: string;
}

export interface Message {
  id: string;
  loop_id: string;
  user_id: string;
  content: string;
  created_at: string;
  edited_at?: string;
  profiles?: { display_name: string };
}

export interface LoopMember {
  user_id: string;
  profiles: {
    display_name: string;
    gender: string;
  } | null;
}

export interface ThemeClasses {
  isDark: boolean;
  bg: string;
  text: string;
  border: string;
  cardBg: string;
  mutedText: string;
}
