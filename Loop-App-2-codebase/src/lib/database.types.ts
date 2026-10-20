
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "allowed_external_emails": {
                  Row: {
                    "created_at": string | null,"description": string | null,"email": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string | null,"description"?: string | null,"email": string
                  }
                  Update: {
                    "created_at"?: string | null,"description"?: string | null,"email"?: string
                  }
                  Relationships: [
                    
                  ]
                },"emergency_contacts": {
                  Row: {
                    "created_at": string | null,"id": string,"name": string,"phone": string,"relation": string | null,"updated_at": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string | null,"id"?: string,"name": string,"phone": string,"relation"?: string | null,"updated_at"?: string | null,"user_id": string
                  }
                  Update: {
                    "created_at"?: string | null,"id"?: string,"name"?: string,"phone"?: string,"relation"?: string | null,"updated_at"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"expected_fares": {
                  Row: {
                    "created_at": string | null,"expected_fare": number,"from_location": string,"id": string,"to_location": string,"user_id": string,"vehicle_type": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string | null,"expected_fare": number,"from_location": string,"id"?: string,"to_location": string,"user_id": string,"vehicle_type"?: string | null
                  }
                  Update: {
                    "created_at"?: string | null,"expected_fare"?: number,"from_location"?: string,"id"?: string,"to_location"?: string,"user_id"?: string,"vehicle_type"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "expected_fares_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"loop_members": {
                  Row: {
                    "joined_at": string | null,"loop_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "joined_at"?: string | null,"loop_id": string,"user_id": string
                  }
                  Update: {
                    "joined_at"?: string | null,"loop_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "fk_loop_members_user_id"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "loop_members_loop_id_fkey"
      columns: ["loop_id"]
isOneToOne: false
      referencedRelation: "loops"
      referencedColumns: ["id"]
    }
                  ]
                },"loop_participants": {
                  Row: {
                    "id": string,"joined_at": string | null,"loop_id": string | null,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: string,"joined_at"?: string | null,"loop_id"?: string | null,"user_id"?: string | null
                  }
                  Update: {
                    "id"?: string,"joined_at"?: string | null,"loop_id"?: string | null,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "loop_participants_loop_id_fkey"
      columns: ["loop_id"]
isOneToOne: false
      referencedRelation: "loops"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "loop_participants_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"loops": {
                  Row: {
                    "category": string | null,"created_at": string | null,"creator_id": string | null,"departure_time": string | null,"destination": string,"expires_at": string,"gender_preference": string,"id": string,"is_driver_offering": boolean | null,"is_female_only": boolean | null,"participants_limit": number,"purpose": string | null,"start_point": string | null,"start_time_type": string | null,"status": string | null,"total_fare": number | null,"vehicle_type": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "category"?: string | null,"created_at"?: string | null,"creator_id"?: string | null,"departure_time"?: string | null,"destination": string,"expires_at": string,"gender_preference"?: string,"id"?: string,"is_driver_offering"?: boolean | null,"is_female_only"?: boolean | null,"participants_limit"?: number,"purpose"?: string | null,"start_point"?: string | null,"start_time_type"?: string | null,"status"?: string | null,"total_fare"?: number | null,"vehicle_type"?: string | null
                  }
                  Update: {
                    "category"?: string | null,"created_at"?: string | null,"creator_id"?: string | null,"departure_time"?: string | null,"destination"?: string,"expires_at"?: string,"gender_preference"?: string,"id"?: string,"is_driver_offering"?: boolean | null,"is_female_only"?: boolean | null,"participants_limit"?: number,"purpose"?: string | null,"start_point"?: string | null,"start_time_type"?: string | null,"status"?: string | null,"total_fare"?: number | null,"vehicle_type"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "fk_loops_creator_id"
      columns: ["creator_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"messages": {
                  Row: {
                    "content": string,"created_at": string | null,"edited_at": string | null,"id": string,"loop_id": string | null,"reactions": Json | null,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "content": string,"created_at"?: string | null,"edited_at"?: string | null,"id"?: string,"loop_id"?: string | null,"reactions"?: Json | null,"user_id"?: string | null
                  }
                  Update: {
                    "content"?: string,"created_at"?: string | null,"edited_at"?: string | null,"id"?: string,"loop_id"?: string | null,"reactions"?: Json | null,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "fk_messages_profiles"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "messages_loop_id_fkey"
      columns: ["loop_id"]
isOneToOne: false
      referencedRelation: "loops"
      referencedColumns: ["id"]
    }
                  ]
                },"profile_contacts": {
                  Row: {
                    "phone_number": string,"updated_at": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "phone_number": string,"updated_at"?: string | null,"user_id": string
                  }
                  Update: {
                    "phone_number"?: string,"updated_at"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"profiles": {
                  Row: {
                    "avatar_url": string | null,"bio": string | null,"display_name": string | null,"gender": string | null,"id": string,"is_student_verified": boolean | null,"phone_number": string | null,"reg_no": string | null,"theme": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "avatar_url"?: string | null,"bio"?: string | null,"display_name"?: string | null,"gender"?: string | null,"id": string,"is_student_verified"?: boolean | null,"phone_number"?: string | null,"reg_no"?: string | null,"theme"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "avatar_url"?: string | null,"bio"?: string | null,"display_name"?: string | null,"gender"?: string | null,"id"?: string,"is_student_verified"?: boolean | null,"phone_number"?: string | null,"reg_no"?: string | null,"theme"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"trusted_vehicles": {
                  Row: {
                    "created_at": string | null,"driver_name": string,"expected_fare": number | null,"from_location": string | null,"id": string,"phone_number": string,"to_location": string | null,"user_id": string,"vehicle_type": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string | null,"driver_name": string,"expected_fare"?: number | null,"from_location"?: string | null,"id"?: string,"phone_number": string,"to_location"?: string | null,"user_id": string,"vehicle_type": string
                  }
                  Update: {
                    "created_at"?: string | null,"driver_name"?: string,"expected_fare"?: number | null,"from_location"?: string | null,"id"?: string,"phone_number"?: string,"to_location"?: string | null,"user_id"?: string,"vehicle_type"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "trusted_vehicles_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "cleanup_old_rides":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"cleanup_unconfirmed_users":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"count_external_users":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"delete_loop":
{ Args: { "loop_id": string }; Returns: {
              "cancelled_id": string,"new_status": string
            }[]
                           },
"expire_old_loops":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"get_expected_fares":
{ Args: Record<PropertyKey, never>; Returns: {
              "avatar_url": string | null,"created_at": string,"display_name": string | null,"expected_fare": number,"from_location": string,"id": string,"to_location": string,"user_id": string | null,"vehicle_type": string | null
}[] },
"get_loop_contacts":
{ Args: { "target_loop_id": string }; Returns: {
              "phone_number": string,"user_id": string
            }[]
                           },
"health_check":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"purge_old_data":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"tools_delete_user_assets":
{ Args: { "p_user_id": string }; Returns: undefined
                           },
"sync_emergency_contacts":
{ Args: { "contacts_payload": Json }; Returns: {
              "id": string,"name": string,"phone": string,"relation": string
            }[]
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

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            
          }
        }
} as const
