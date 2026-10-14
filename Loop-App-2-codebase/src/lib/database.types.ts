export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      allowed_external_emails: {
        Row: {
          email: string
          description: string | null
          created_at: string | null
        }
        Insert: {
          email: string
          description?: string | null
          created_at?: string | null
        }
        Update: {
          email?: string
          description?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      emergency_contacts: {
        Row: {
          id: string
          user_id: string
          name: string
          phone: string
          relation: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          phone: string
          relation?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          phone?: string
          relation?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      expected_fares: {
        Row: {
          id: string
          user_id: string
          from_location: string
          to_location: string
          expected_fare: number
          vehicle_type: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          from_location: string
          to_location: string
          expected_fare: number
          vehicle_type?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          from_location?: string
          to_location?: string
          expected_fare?: number
          vehicle_type?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      loop_members: {
        Row: {
          loop_id: string
          user_id: string
          joined_at: string | null
        }
        Insert: {
          loop_id: string
          user_id: string
          joined_at?: string | null
        }
        Update: {
          loop_id?: string
          user_id?: string
          joined_at?: string | null
        }
        Relationships: []
      }
      loop_participants: {
        Row: {
          id: string
          loop_id: string | null
          user_id: string | null
          joined_at: string | null
        }
        Insert: {
          id?: string
          loop_id?: string | null
          user_id?: string | null
          joined_at?: string | null
        }
        Update: {
          id?: string
          loop_id?: string | null
          user_id?: string | null
          joined_at?: string | null
        }
        Relationships: []
      }
      loops: {
        Row: {
          id: string
          creator_id: string | null
          destination: string
          start_time_type: string | null
          participants_limit: number
          gender_preference: string
          purpose: string | null
          created_at: string | null
          expires_at: string
          status: string | null
          is_female_only: boolean | null
          departure_time: string | null
          category: string | null
          start_point: string | null
          total_fare: number | null
          is_driver_offering: boolean | null
          vehicle_type: string | null
        }
        Insert: {
          id?: string
          creator_id?: string | null
          destination: string
          start_time_type?: string | null
          participants_limit?: number
          gender_preference?: string
          purpose?: string | null
          created_at?: string | null
          expires_at: string
          status?: string | null
          is_female_only?: boolean | null
          departure_time?: string | null
          category?: string | null
          start_point?: string | null
          total_fare?: number | null
          is_driver_offering?: boolean | null
          vehicle_type?: string | null
        }
        Update: {
          id?: string
          creator_id?: string | null
          destination?: string
          start_time_type?: string | null
          participants_limit?: number
          gender_preference?: string
          purpose?: string | null
          created_at?: string | null
          expires_at?: string
          status?: string | null
          is_female_only?: boolean | null
          departure_time?: string | null
          category?: string | null
          start_point?: string | null
          total_fare?: number | null
          is_driver_offering?: boolean | null
          vehicle_type?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          id: string
          loop_id: string | null
          user_id: string | null
          content: string
          created_at: string | null
          edited_at: string | null
          reactions: Json | null
        }
        Insert: {
          id?: string
          loop_id?: string | null
          user_id?: string | null
          content: string
          created_at?: string | null
          edited_at?: string | null
          reactions?: Json | null
        }
        Update: {
          id?: string
          loop_id?: string | null
          user_id?: string | null
          content?: string
          created_at?: string | null
          edited_at?: string | null
          reactions?: Json | null
        }
        Relationships: []
      }
      profile_contacts: {
        Row: {
          user_id: string
          phone_number: string
          updated_at: string | null
        }
        Insert: {
          user_id: string
          phone_number: string
          updated_at?: string | null
        }
        Update: {
          user_id?: string
          phone_number?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          display_name: string | null
          theme: string | null
          updated_at: string
          gender: string | null
          reg_no: string | null
          avatar_url: string | null
          bio: string | null
          phone_number: string | null
          is_student_verified: boolean | null
        }
        Insert: {
          id: string
          display_name?: string | null
          theme?: string | null
          updated_at?: string
          gender?: string | null
          reg_no?: string | null
          avatar_url?: string | null
          bio?: string | null
          phone_number?: string | null
          is_student_verified?: boolean | null
        }
        Update: {
          id?: string
          display_name?: string | null
          theme?: string | null
          updated_at?: string
          gender?: string | null
          reg_no?: string | null
          avatar_url?: string | null
          bio?: string | null
          phone_number?: string | null
          is_student_verified?: boolean | null
        }
        Relationships: []
      }
      trusted_vehicles: {
        Row: {
          id: string
          user_id: string
          driver_name: string
          phone_number: string
          vehicle_type: string
          created_at: string | null
          from_location: string | null
          to_location: string | null
          expected_fare: number | null
        }
        Insert: {
          id?: string
          user_id: string
          driver_name: string
          phone_number: string
          vehicle_type: string
          created_at?: string | null
          from_location?: string | null
          to_location?: string | null
          expected_fare?: number | null
        }
        Update: {
          id?: string
          user_id?: string
          driver_name?: string
          phone_number?: string
          vehicle_type?: string
          created_at?: string | null
          from_location?: string | null
          to_location?: string | null
          expected_fare?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_loop: {
        Args: {
          target_loop_id: string
        }
        Returns: {
          success?: boolean
          error?: string
        } | null
      }
      get_loop_contacts: {
        Args: {
          target_loop_id: string
        }
        Returns: {
          user_id: string
          phone_number: string
        }[]
      }
      health_check: {
        Args: Record<PropertyKey, never>
        Returns: {
          status: string
        } | null
      }
      sync_emergency_contacts: {
        Args: {
          contacts_payload: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
