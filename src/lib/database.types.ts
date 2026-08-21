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
    PostgrestVersion: "14.15"
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
      account_resolution_attempts: {
        Row: {
          created_at: string
          id: string
          profile_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          profile_id: string
        }
        Update: {
          created_at?: string
          id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_resolution_attempts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_accounts: {
        Row: {
          account_number: string
          bank_code: string
          bank_name: string
          created_at: string
          id: string
          name_match_score: number
          paystack_recipient_code: string | null
          profile_id: string
          resolved_account_name: string
          verification_status: string
        }
        Insert: {
          account_number: string
          bank_code: string
          bank_name: string
          created_at?: string
          id?: string
          name_match_score: number
          paystack_recipient_code?: string | null
          profile_id: string
          resolved_account_name: string
          verification_status?: string
        }
        Update: {
          account_number?: string
          bank_code?: string
          bank_name?: string
          created_at?: string
          id?: string
          name_match_score?: number
          paystack_recipient_code?: string | null
          profile_id?: string
          resolved_account_name?: string
          verification_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_accounts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      banks: {
        Row: {
          code: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          code: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          code?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          created_at: string
          household_id: string
          id: string
          product_id: string
          quantity: number
        }
        Insert: {
          created_at?: string
          household_id: string
          id?: string
          product_id: string
          quantity: number
        }
        Update: {
          created_at?: string
          household_id?: string
          id?: string
          product_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "low_stock_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          sort_order: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      conversations: {
        Row: {
          created_at: string
          farmer_id: string
          household_id: string
          id: string
          last_message_at: string
          last_message_preview: string | null
        }
        Insert: {
          created_at?: string
          farmer_id: string
          household_id: string
          id?: string
          last_message_at?: string
          last_message_preview?: string | null
        }
        Update: {
          created_at?: string
          farmer_id?: string
          household_id?: string
          id?: string
          last_message_at?: string
          last_message_preview?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_farmer_id_fkey"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "farmer_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_locations: {
        Row: {
          address_line: string
          created_at: string
          geolocation: unknown
          id: string
          latitude: number | null
          lga: string | null
          longitude: number | null
          profile_id: string
          state: string | null
        }
        Insert: {
          address_line: string
          created_at?: string
          geolocation?: unknown
          id?: string
          latitude?: number | null
          lga?: string | null
          longitude?: number | null
          profile_id: string
          state?: string | null
        }
        Update: {
          address_line?: string
          created_at?: string
          geolocation?: unknown
          id?: string
          latitude?: number | null
          lga?: string | null
          longitude?: number | null
          profile_id?: string
          state?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_locations_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_zones: {
        Row: {
          created_at: string
          farmer_id: string
          fee: number
          id: string
          is_active: boolean
          zone_name: string
        }
        Insert: {
          created_at?: string
          farmer_id: string
          fee?: number
          id?: string
          is_active?: boolean
          zone_name: string
        }
        Update: {
          created_at?: string
          farmer_id?: string
          fee?: number
          id?: string
          is_active?: boolean
          zone_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_zones_farmer_id_fkey"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "farmer_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      farm_locations: {
        Row: {
          address_line: string
          created_at: string
          geolocation: unknown
          id: string
          latitude: number | null
          lga: string | null
          longitude: number | null
          profile_id: string
          state: string | null
        }
        Insert: {
          address_line: string
          created_at?: string
          geolocation?: unknown
          id?: string
          latitude?: number | null
          lga?: string | null
          longitude?: number | null
          profile_id: string
          state?: string | null
        }
        Update: {
          address_line?: string
          created_at?: string
          geolocation?: unknown
          id?: string
          latitude?: number | null
          lga?: string | null
          longitude?: number | null
          profile_id?: string
          state?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "farm_locations_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      farmer_profiles: {
        Row: {
          bio: string | null
          business_hours: Json | null
          created_at: string
          farm_name: string
          id: string
          is_open_now: boolean
          photo_url: string | null
          profile_id: string
        }
        Insert: {
          bio?: string | null
          business_hours?: Json | null
          created_at?: string
          farm_name: string
          id?: string
          is_open_now?: boolean
          photo_url?: string | null
          profile_id: string
        }
        Update: {
          bio?: string | null
          business_hours?: Json | null
          created_at?: string
          farm_name?: string
          id?: string
          is_open_now?: boolean
          photo_url?: string | null
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "farmer_profiles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachment_type: string | null
          attachment_url: string | null
          content: string
          conversation_id: string
          created_at: string
          id: string
          read_at: string | null
          reply_to_id: string | null
          sender_id: string
        }
        Insert: {
          attachment_type?: string | null
          attachment_url?: string | null
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          read_at?: string | null
          reply_to_id?: string | null
          sender_id: string
        }
        Update: {
          attachment_type?: string | null
          attachment_url?: string | null
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          read_at?: string | null
          reply_to_id?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          is_read: boolean
          profile_id: string
          related_id: string | null
          title: string
          type: string
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          is_read?: boolean
          profile_id: string
          related_id?: string | null
          title: string
          type: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_read?: boolean
          profile_id?: string
          related_id?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          id: string
          line_total: number
          order_id: string
          product_id: string | null
          product_name_snapshot: string
          quantity: number
          unit_price: number
        }
        Insert: {
          id?: string
          line_total: number
          order_id: string
          product_id?: string | null
          product_name_snapshot: string
          quantity: number
          unit_price: number
        }
        Update: {
          id?: string
          line_total?: number
          order_id?: string
          product_id?: string | null
          product_name_snapshot?: string
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "low_stock_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          completed_at: string | null
          created_at: string
          delivery_address: string | null
          farmer_confirmed_at: string | null
          farmer_id: string
          fulfillment_type: string | null
          household_confirmed_at: string | null
          household_id: string
          id: string
          payment_status: string
          paystack_recipient_code: string | null
          paystack_reference: string | null
          status: string
          subtotal: number
          total: number
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          delivery_address?: string | null
          farmer_confirmed_at?: string | null
          farmer_id: string
          fulfillment_type?: string | null
          household_confirmed_at?: string | null
          household_id: string
          id?: string
          payment_status?: string
          paystack_recipient_code?: string | null
          paystack_reference?: string | null
          status?: string
          subtotal?: number
          total?: number
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          delivery_address?: string | null
          farmer_confirmed_at?: string | null
          farmer_id?: string
          fulfillment_type?: string | null
          household_confirmed_at?: string | null
          household_id?: string
          id?: string
          payment_status?: string
          paystack_recipient_code?: string | null
          paystack_reference?: string | null
          status?: string
          subtotal?: number
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "orders_farmer_id_fkey"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "farmer_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payouts: {
        Row: {
          amount: number
          created_at: string
          farmer_id: string
          id: string
          order_id: string
          paystack_transfer_code: string | null
          status: string
        }
        Insert: {
          amount: number
          created_at?: string
          farmer_id: string
          id?: string
          order_id: string
          paystack_transfer_code?: string | null
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string
          farmer_id?: string
          id?: string
          order_id?: string
          paystack_transfer_code?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "payouts_farmer_id_fkey"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "farmer_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payouts_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string
          created_at: string
          description: string | null
          farmer_id: string
          harvest_date: string | null
          id: string
          is_available: boolean
          is_preorder: boolean
          low_stock_threshold: number | null
          name: string
          photo_urls: string[]
          price: number
          quantity_available: number
          unit: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          farmer_id: string
          harvest_date?: string | null
          id?: string
          is_available?: boolean
          is_preorder?: boolean
          low_stock_threshold?: number | null
          name: string
          photo_urls?: string[]
          price: number
          quantity_available?: number
          unit: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          farmer_id?: string
          harvest_date?: string | null
          id?: string
          is_available?: boolean
          is_preorder?: boolean
          low_stock_threshold?: number | null
          name?: string
          photo_urls?: string[]
          price?: number
          quantity_available?: number
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_farmer_id_fkey"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "farmer_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active_view: Database["public"]["Enums"]["profile_view"] | null
          avatar_url: string | null
          created_at: string
          date_of_birth: string | null
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"] | null
          step: Database["public"]["Enums"]["onboarding_step"]
          updated_at: string
        }
        Insert: {
          active_view?: Database["public"]["Enums"]["profile_view"] | null
          avatar_url?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          step?: Database["public"]["Enums"]["onboarding_step"]
          updated_at?: string
        }
        Update: {
          active_view?: Database["public"]["Enums"]["profile_view"] | null
          avatar_url?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          step?: Database["public"]["Enums"]["onboarding_step"]
          updated_at?: string
        }
        Relationships: []
      }
      promotions: {
        Row: {
          created_at: string
          discount_percent: number
          ends_at: string
          id: string
          is_active: boolean
          product_id: string
          starts_at: string
        }
        Insert: {
          created_at?: string
          discount_percent: number
          ends_at: string
          id?: string
          is_active?: boolean
          product_id: string
          starts_at?: string
        }
        Update: {
          created_at?: string
          discount_percent?: number
          ends_at?: string
          id?: string
          is_active?: boolean
          product_id?: string
          starts_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "promotions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "low_stock_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      refunds: {
        Row: {
          amount: number
          created_at: string
          household_id: string
          id: string
          order_id: string
          paystack_transfer_code: string | null
          status: string
        }
        Insert: {
          amount: number
          created_at?: string
          household_id: string
          id?: string
          order_id: string
          paystack_transfer_code?: string | null
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string
          household_id?: string
          id?: string
          order_id?: string
          paystack_transfer_code?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "refunds_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          farmer_id: string
          household_id: string
          id: string
          order_id: string
          rating: number
        }
        Insert: {
          comment?: string | null
          created_at?: string
          farmer_id: string
          household_id: string
          id?: string
          order_id: string
          rating: number
        }
        Update: {
          comment?: string | null
          created_at?: string
          farmer_id?: string
          household_id?: string
          id?: string
          order_id?: string
          rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "reviews_farmer_id_fkey"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "farmer_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      farmer_verification: {
        Row: {
          is_verified: boolean | null
          profile_id: string | null
        }
        Insert: {
          is_verified?: never
          profile_id?: string | null
        }
        Update: {
          is_verified?: never
          profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_accounts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      low_stock_products: {
        Row: {
          category: string | null
          created_at: string | null
          farmer_id: string | null
          harvest_date: string | null
          id: string | null
          is_available: boolean | null
          is_preorder: boolean | null
          low_stock_threshold: number | null
          name: string | null
          photo_urls: string[] | null
          price: number | null
          quantity_available: number | null
          unit: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          farmer_id?: string | null
          harvest_date?: string | null
          id?: string | null
          is_available?: boolean | null
          is_preorder?: boolean | null
          low_stock_threshold?: number | null
          name?: string | null
          photo_urls?: string[] | null
          price?: number | null
          quantity_available?: number | null
          unit?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          farmer_id?: string | null
          harvest_date?: string | null
          id?: string | null
          is_available?: boolean | null
          is_preorder?: boolean | null
          low_stock_threshold?: number | null
          name?: string | null
          photo_urls?: string[] | null
          price?: number | null
          quantity_available?: number | null
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_farmer_id_fkey"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "farmer_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      onboarding_step:
        | "role_pending"
        | "password_pending"
        | "identity_pending"
        | "location_pending"
        | "bank_pending"
        | "complete"
      profile_view: "household" | "farmer"
      user_role: "farmer" | "consumer"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      onboarding_step: [
        "role_pending",
        "password_pending",
        "identity_pending",
        "location_pending",
        "bank_pending",
        "complete",
      ],
      profile_view: ["household", "farmer"],
      user_role: ["farmer", "consumer"],
    },
  },
} as const
