export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
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
  public: {
    Tables: {
      app_admins: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      event_organizers: {
        Row: {
          created_at: string
          event_id: string
          organization_id: string
          role: string
        }
        Insert: {
          created_at?: string
          event_id: string
          organization_id: string
          role: string
        }
        Update: {
          created_at?: string
          event_id?: string
          organization_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_organizers_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_organizers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          address: string
          category: Database["public"]["Enums"]["event_category"]
          created_at: string
          description: string | null
          ends_at: string
          id: string
          image_path: string | null
          location: unknown
          neighborhood_id: string | null
          owner_org: string
          price_amount: number | null
          price_type: Database["public"]["Enums"]["price_type"]
          recurrence: Database["public"]["Enums"]["recurrence"]
          recurrence_until: string | null
          slug: string
          starts_at: string
          title: string
          updated_at: string
          venue_name: string | null
        }
        Insert: {
          address: string
          category: Database["public"]["Enums"]["event_category"]
          created_at?: string
          description?: string | null
          ends_at: string
          id?: string
          image_path?: string | null
          location: unknown
          neighborhood_id?: string | null
          owner_org: string
          price_amount?: number | null
          price_type?: Database["public"]["Enums"]["price_type"]
          recurrence?: Database["public"]["Enums"]["recurrence"]
          recurrence_until?: string | null
          slug: string
          starts_at: string
          title: string
          updated_at?: string
          venue_name?: string | null
        }
        Update: {
          address?: string
          category?: Database["public"]["Enums"]["event_category"]
          created_at?: string
          description?: string | null
          ends_at?: string
          id?: string
          image_path?: string | null
          location?: unknown
          neighborhood_id?: string | null
          owner_org?: string
          price_amount?: number | null
          price_type?: Database["public"]["Enums"]["price_type"]
          recurrence?: Database["public"]["Enums"]["recurrence"]
          recurrence_until?: string | null
          slug?: string
          starts_at?: string
          title?: string
          updated_at?: string
          venue_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_neighborhood_id_fkey"
            columns: ["neighborhood_id"]
            isOneToOne: false
            referencedRelation: "neighborhoods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_owner_org_fkey"
            columns: ["owner_org"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      geocode_cache: {
        Row: {
          created_at: string
          display_name: string | null
          location: unknown
          query_normalized: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          location?: unknown
          query_normalized: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          location?: unknown
          query_normalized?: string
        }
        Relationships: []
      }
      invites: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string
          id: string
          organization_id: string
          token: string
          used_at: string | null
          used_by_org: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          organization_id: string
          token?: string
          used_at?: string | null
          used_by_org?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          organization_id?: string
          token?: string
          used_at?: string | null
          used_by_org?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invites_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invites_used_by_org_fkey"
            columns: ["used_by_org"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          created_at: string
          organization_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          organization_id: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          organization_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      moderation_actions: {
        Row: {
          action: Database["public"]["Enums"]["moderation_action"]
          admin_id: string | null
          created_at: string
          id: string
          organization_id: string
          organization_name: string
          reason: string
        }
        Insert: {
          action: Database["public"]["Enums"]["moderation_action"]
          admin_id?: string | null
          created_at?: string
          id?: string
          organization_id: string
          organization_name: string
          reason: string
        }
        Update: {
          action?: Database["public"]["Enums"]["moderation_action"]
          admin_id?: string | null
          created_at?: string
          id?: string
          organization_id?: string
          organization_name?: string
          reason?: string
        }
        Relationships: []
      }
      municipal_associations: {
        Row: {
          category: string | null
          cif: string
          district: string | null
          imported_at: string
          name: string
          neighborhood: string | null
          registry_number: string | null
        }
        Insert: {
          category?: string | null
          cif: string
          district?: string | null
          imported_at?: string
          name: string
          neighborhood?: string | null
          registry_number?: string | null
        }
        Update: {
          category?: string | null
          cif?: string
          district?: string | null
          imported_at?: string
          name?: string
          neighborhood?: string | null
          registry_number?: string | null
        }
        Relationships: []
      }
      neighborhoods: {
        Row: {
          boundary: unknown
          centroid: unknown
          created_at: string
          district: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          boundary: unknown
          centroid?: unknown
          created_at?: string
          district?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          boundary?: unknown
          centroid?: unknown
          created_at?: string
          district?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      organization_answers: {
        Row: {
          how_sustained: string | null
          organization_id: string
          updated_at: string
          what_for_whom: string | null
        }
        Insert: {
          how_sustained?: string | null
          organization_id: string
          updated_at?: string
          what_for_whom?: string | null
        }
        Update: {
          how_sustained?: string | null
          organization_id?: string
          updated_at?: string
          what_for_whom?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_answers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_verifications: {
        Row: {
          nif: string
          organization_id: string
          verified_at: string
        }
        Insert: {
          nif: string
          organization_id: string
          verified_at?: string
        }
        Update: {
          nif?: string
          organization_id?: string
          verified_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_verifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          address: string | null
          contact_email: string | null
          contact_phone: string | null
          contact_url: string | null
          created_at: string
          entry_method: Database["public"]["Enums"]["entry_method"]
          flagged_for_review: boolean
          id: string
          indexable: boolean
          kind: Database["public"]["Enums"]["org_kind"]
          last_activity_at: string
          last_reviewed_at: string | null
          location: unknown
          name: string
          neighborhood_id: string | null
          one_liner: string | null
          seeking_offering: string | null
          slug: string
          status: Database["public"]["Enums"]["org_status"]
          updated_at: string
          usual_category: Database["public"]["Enums"]["event_category"] | null
          venue_activity: Database["public"]["Enums"]["venue_activity"] | null
          verified: boolean
          when_to_visit: string | null
        }
        Insert: {
          address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          contact_url?: string | null
          created_at?: string
          entry_method: Database["public"]["Enums"]["entry_method"]
          flagged_for_review?: boolean
          id?: string
          indexable?: boolean
          kind: Database["public"]["Enums"]["org_kind"]
          last_activity_at?: string
          last_reviewed_at?: string | null
          location?: unknown
          name: string
          neighborhood_id?: string | null
          one_liner?: string | null
          seeking_offering?: string | null
          slug: string
          status?: Database["public"]["Enums"]["org_status"]
          updated_at?: string
          usual_category?: Database["public"]["Enums"]["event_category"] | null
          venue_activity?: Database["public"]["Enums"]["venue_activity"] | null
          verified?: boolean
          when_to_visit?: string | null
        }
        Update: {
          address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          contact_url?: string | null
          created_at?: string
          entry_method?: Database["public"]["Enums"]["entry_method"]
          flagged_for_review?: boolean
          id?: string
          indexable?: boolean
          kind?: Database["public"]["Enums"]["org_kind"]
          last_activity_at?: string
          last_reviewed_at?: string | null
          location?: unknown
          name?: string
          neighborhood_id?: string | null
          one_liner?: string | null
          seeking_offering?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["org_status"]
          updated_at?: string
          usual_category?: Database["public"]["Enums"]["event_category"] | null
          venue_activity?: Database["public"]["Enums"]["venue_activity"] | null
          verified?: boolean
          when_to_visit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organizations_neighborhood_id_fkey"
            columns: ["neighborhood_id"]
            isOneToOne: false
            referencedRelation: "neighborhoods"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          count: number
          key: string
          window_start: string
        }
        Insert: {
          count?: number
          key: string
          window_start: string
        }
        Update: {
          count?: number
          key?: string
          window_start?: string
        }
        Relationships: []
      }
      spaces: {
        Row: {
          contact: string | null
          created_at: string
          description: string | null
          id: string
          neighborhood_id: string | null
          organization_id: string
          price_type: Database["public"]["Enums"]["price_type"]
          space_type: Database["public"]["Enums"]["space_type"]
          updated_at: string
        }
        Insert: {
          contact?: string | null
          created_at?: string
          description?: string | null
          id?: string
          neighborhood_id?: string | null
          organization_id: string
          price_type: Database["public"]["Enums"]["price_type"]
          space_type: Database["public"]["Enums"]["space_type"]
          updated_at?: string
        }
        Update: {
          contact?: string | null
          created_at?: string
          description?: string | null
          id?: string
          neighborhood_id?: string | null
          organization_id?: string
          price_type?: Database["public"]["Enums"]["price_type"]
          space_type?: Database["public"]["Enums"]["space_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "spaces_neighborhood_id_fkey"
            columns: ["neighborhood_id"]
            isOneToOne: false
            referencedRelation: "neighborhoods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spaces_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      terms_acceptances: {
        Row: {
          accepted_at: string
          age_confirmed: boolean
          id: string
          privacy_version: string
          terms_version: string
          user_id: string
        }
        Insert: {
          accepted_at?: string
          age_confirmed: boolean
          id?: string
          privacy_version: string
          terms_version: string
          user_id: string
        }
        Update: {
          accepted_at?: string
          age_confirmed?: boolean
          id?: string
          privacy_version?: string
          terms_version?: string
          user_id?: string
        }
        Relationships: []
      }
      threads: {
        Row: {
          color_seed: number
          confirmed_at: string | null
          created_at: string
          expires_at: string
          id: string
          proposer_org: string
          receiver_org: string
          status: Database["public"]["Enums"]["thread_status"]
          story_proposer: string
          story_receiver: string | null
        }
        Insert: {
          color_seed?: number
          confirmed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          proposer_org: string
          receiver_org: string
          status?: Database["public"]["Enums"]["thread_status"]
          story_proposer: string
          story_receiver?: string | null
        }
        Update: {
          color_seed?: number
          confirmed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          proposer_org?: string
          receiver_org?: string
          status?: Database["public"]["Enums"]["thread_status"]
          story_proposer?: string
          story_receiver?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "threads_proposer_org_fkey"
            columns: ["proposer_org"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "threads_receiver_org_fkey"
            columns: ["receiver_org"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      connection_lines: {
        Row: {
          color_seed: number | null
          confirmed_at: string | null
          id: string | null
          proposer_lat: number | null
          proposer_lng: number | null
          proposer_name: string | null
          proposer_slug: string | null
          receiver_lat: number | null
          receiver_lng: number | null
          receiver_name: string | null
          receiver_slug: string | null
          story_proposer: string | null
          story_receiver: string | null
        }
        Relationships: []
      }
      map_items: {
        Row: {
          address: string | null
          category: Database["public"]["Enums"]["event_category"] | null
          id: string | null
          item_type: string | null
          last_activity_at: string | null
          lat: number | null
          lng: number | null
          name: string | null
          neighborhood_slug: string | null
          occ_end: string | null
          occ_start: string | null
          organization_kind: Database["public"]["Enums"]["org_kind"] | null
          organizer_kinds: Database["public"]["Enums"]["org_kind"][] | null
          organizer_names: string | null
          price_amount: number | null
          price_type: Database["public"]["Enums"]["price_type"] | null
          slug: string | null
          venue_name: string | null
        }
        Relationships: []
      }
      map_neighborhoods: {
        Row: {
          center_lat: number | null
          center_lng: number | null
          district: string | null
          east: number | null
          name: string | null
          north: number | null
          slug: string | null
          south: number | null
          west: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_review_list: {
        Args: never
        Returns: {
          contact_url: string
          created_at: string
          entry_method: Database["public"]["Enums"]["entry_method"]
          flagged_for_review: boolean
          how_sustained: string
          id: string
          kind: Database["public"]["Enums"]["org_kind"]
          last_reviewed_at: string
          name: string
          neighborhood_name: string
          slug: string
          status: Database["public"]["Enums"]["org_status"]
          venue_activity: Database["public"]["Enums"]["venue_activity"]
          what_for_whom: string
        }[]
      }
      check_rate_limit: {
        Args: { p_key: string; p_max: number; p_window: string }
        Returns: boolean
      }
      create_professional: {
        Args: {
          p_age_confirmed: boolean
          p_invite_token?: string
          p_name: string
          p_one_liner: string
          p_privacy_version: string
          p_terms_version: string
        }
        Returns: string
      }
      delete_my_account: { Args: never; Returns: undefined }
      event_occurrences: {
        Args: { p_from: string; p_to: string }
        Returns: {
          event_id: string
          occ_end: string
          occ_start: string
        }[]
      }
      export_my_data: { Args: never; Returns: Json }
      get_invite: {
        Args: { p_token: string }
        Returns: {
          name: string
          slug: string
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
      is_doubtful_activity: {
        Args: { p_activity: Database["public"]["Enums"]["venue_activity"] }
        Returns: boolean
      }
      lookup_municipal_association: {
        Args: { p_nif: string }
        Returns: {
          found: boolean
          name: string
        }[]
      }
      mark_reviewed: { Args: { p_org: string }; Returns: undefined }
      moderate_organization: {
        Args: {
          p_action: Database["public"]["Enums"]["moderation_action"]
          p_org: string
          p_reason: string
        }
        Returns: string
      }
      register_entity: {
        Args: {
          p_age_confirmed: boolean
          p_how_sustained?: string
          p_invite_token?: string
          p_kind: Database["public"]["Enums"]["org_kind"]
          p_name: string
          p_nif: string
          p_privacy_version: string
          p_terms_version: string
          p_venue_activity?: Database["public"]["Enums"]["venue_activity"]
          p_what_for_whom?: string
        }
        Returns: {
          flagged: boolean
          slug: string
        }[]
      }
    }
    Enums: {
      entry_method:
        | "municipal_registry"
        | "invite"
        | "self_declared"
        | "email_only"
      event_category:
        | "musica"
        | "teatro_danza"
        | "arte"
        | "talleres"
        | "encuentros"
        | "comunidad"
        | "otros"
      moderation_action: "suspend" | "reactivate" | "delete"
      org_kind: "association" | "venue" | "professional"
      org_status: "active" | "suspended"
      price_type: "free" | "donation" | "paid"
      recurrence: "none" | "weekly" | "monthly"
      space_type: "sala" | "local" | "exterior" | "estudio" | "otro"
      thread_status: "pending" | "confirmed"
      venue_activity:
        | "libreria"
        | "sala_pequena"
        | "centro_cultural"
        | "galeria"
        | "taller_estudio"
        | "cafe_cultural"
        | "discoteca_club"
        | "bar_nocturno"
        | "otro"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      entry_method: [
        "municipal_registry",
        "invite",
        "self_declared",
        "email_only",
      ],
      event_category: [
        "musica",
        "teatro_danza",
        "arte",
        "talleres",
        "encuentros",
        "comunidad",
        "otros",
      ],
      moderation_action: ["suspend", "reactivate", "delete"],
      org_kind: ["association", "venue", "professional"],
      org_status: ["active", "suspended"],
      price_type: ["free", "donation", "paid"],
      recurrence: ["none", "weekly", "monthly"],
      space_type: ["sala", "local", "exterior", "estudio", "otro"],
      thread_status: ["pending", "confirmed"],
      venue_activity: [
        "libreria",
        "sala_pequena",
        "centro_cultural",
        "galeria",
        "taller_estudio",
        "cafe_cultural",
        "discoteca_club",
        "bar_nocturno",
        "otro",
      ],
    },
  },
} as const
