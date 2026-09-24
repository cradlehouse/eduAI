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
    PostgrestVersion: "14.5"
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
      assets: {
        Row: {
          bytes: number
          chain_hash: string | null
          created_at: string
          created_by: string | null
          duration_s: number | null
          height: number | null
          id: string
          job_id: string | null
          kind: Database["public"]["Enums"]["asset_kind"]
          mime: string
          org_id: string
          prev_hash: string | null
          project_id: string | null
          provenance: Json
          r2_key: string
          sha256: string
          source: Database["public"]["Enums"]["asset_source"]
          width: number | null
        }
        Insert: {
          bytes: number
          chain_hash?: string | null
          created_at?: string
          created_by?: string | null
          duration_s?: number | null
          height?: number | null
          id?: string
          job_id?: string | null
          kind: Database["public"]["Enums"]["asset_kind"]
          mime: string
          org_id: string
          prev_hash?: string | null
          project_id?: string | null
          provenance?: Json
          r2_key: string
          sha256: string
          source: Database["public"]["Enums"]["asset_source"]
          width?: number | null
        }
        Update: {
          bytes?: number
          chain_hash?: string | null
          created_at?: string
          created_by?: string | null
          duration_s?: number | null
          height?: number | null
          id?: string
          job_id?: string | null
          kind?: Database["public"]["Enums"]["asset_kind"]
          mime?: string
          org_id?: string
          prev_hash?: string | null
          project_id?: string | null
          provenance?: Json
          r2_key?: string
          sha256?: string
          source?: Database["public"]["Enums"]["asset_source"]
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "assets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_job_fk"
            columns: ["org_id", "job_id"]
            isOneToOne: false
            referencedRelation: "job_tokens"
            referencedColumns: ["org_id", "job_id"]
          },
          {
            foreignKeyName: "assets_job_fk"
            columns: ["org_id", "job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["org_id", "id"]
          },
          {
            foreignKeyName: "assets_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_org_id_project_id_fkey"
            columns: ["org_id", "project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["org_id", "id"]
          },
        ]
      }
      assistant_events: {
        Row: {
          assistant: string
          cents: number
          cohort_id: string | null
          created_at: string
          id: string
          input: Json | null
          input_hash: string
          input_tokens: number
          latency_ms: number | null
          model: string
          org_id: string
          output: Json | null
          output_tokens: number
          project_id: string | null
          user_id: string
        }
        Insert: {
          assistant: string
          cents?: number
          cohort_id?: string | null
          created_at?: string
          id?: string
          input?: Json | null
          input_hash: string
          input_tokens?: number
          latency_ms?: number | null
          model: string
          org_id: string
          output?: Json | null
          output_tokens?: number
          project_id?: string | null
          user_id: string
        }
        Update: {
          assistant?: string
          cents?: number
          cohort_id?: string | null
          created_at?: string
          id?: string
          input?: Json | null
          input_hash?: string
          input_tokens?: number
          latency_ms?: number | null
          model?: string
          org_id?: string
          output?: Json | null
          output_tokens?: number
          project_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assistant_events_org_id_cohort_id_fkey"
            columns: ["org_id", "cohort_id"]
            isOneToOne: false
            referencedRelation: "cohorts"
            referencedColumns: ["org_id", "id"]
          },
          {
            foreignKeyName: "assistant_events_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assistant_events_org_id_project_id_fkey"
            columns: ["org_id", "project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["org_id", "id"]
          },
          {
            foreignKeyName: "assistant_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      bible_entries: {
        Row: {
          created_at: string
          created_by: string | null
          description: string
          fixed: Json
          forked_from: string | null
          id: string
          kind: Database["public"]["Enums"]["bible_kind"]
          likeness_of: string | null
          name: string
          org_id: string
          project_id: string
          reference_asset_id: string | null
          requires_consent: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string
          fixed?: Json
          forked_from?: string | null
          id?: string
          kind: Database["public"]["Enums"]["bible_kind"]
          likeness_of?: string | null
          name: string
          org_id: string
          project_id: string
          reference_asset_id?: string | null
          requires_consent?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string
          fixed?: Json
          forked_from?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["bible_kind"]
          likeness_of?: string | null
          name?: string
          org_id?: string
          project_id?: string
          reference_asset_id?: string | null
          requires_consent?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bible_entries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bible_entries_forked_from_fkey"
            columns: ["forked_from"]
            isOneToOne: false
            referencedRelation: "bible_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bible_entries_forked_from_fkey"
            columns: ["forked_from"]
            isOneToOne: false
            referencedRelation: "bible_entry_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bible_entries_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bible_entries_org_id_project_id_fkey"
            columns: ["org_id", "project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["org_id", "id"]
          },
          {
            foreignKeyName: "bible_entries_reference_asset_fk"
            columns: ["org_id", "reference_asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["org_id", "id"]
          },
        ]
      }
      bible_entry_assets: {
        Row: {
          asset_id: string
          bible_entry_id: string
          created_at: string
          created_by: string | null
          id: string
          job_id: string | null
          label: string
          lifecycle: Database["public"]["Enums"]["take_lifecycle"]
          org_id: string
          params: Json
          position: number
          project_id: string
          role: string
        }
        Insert: {
          asset_id: string
          bible_entry_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          job_id?: string | null
          label?: string
          lifecycle?: Database["public"]["Enums"]["take_lifecycle"]
          org_id: string
          params?: Json
          position?: number
          project_id: string
          role: string
        }
        Update: {
          asset_id?: string
          bible_entry_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          job_id?: string | null
          label?: string
          lifecycle?: Database["public"]["Enums"]["take_lifecycle"]
          org_id?: string
          params?: Json
          position?: number
          project_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "bible_entry_assets_org_id_asset_id_fkey"
            columns: ["org_id", "asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["org_id", "id"]
          },
          {
            foreignKeyName: "bible_entry_assets_org_id_bible_entry_id_fkey"
            columns: ["org_id", "bible_entry_id"]
            isOneToOne: false
            referencedRelation: "bible_entries"
            referencedColumns: ["org_id", "id"]
          },
          {
            foreignKeyName: "bible_entry_assets_org_id_bible_entry_id_fkey"
            columns: ["org_id", "bible_entry_id"]
            isOneToOne: false
            referencedRelation: "bible_entry_status"
            referencedColumns: ["org_id", "id"]
          },
          {
            foreignKeyName: "bible_entry_assets_org_id_job_id_fkey"
            columns: ["org_id", "job_id"]
            isOneToOne: false
            referencedRelation: "job_tokens"
            referencedColumns: ["org_id", "job_id"]
          },
          {
            foreignKeyName: "bible_entry_assets_org_id_job_id_fkey"
            columns: ["org_id", "job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["org_id", "id"]
          },
          {
            foreignKeyName: "bible_entry_assets_org_id_project_id_fkey"
            columns: ["org_id", "project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["org_id", "id"]
          },
        ]
      }
      cohort_instructors: {
        Row: {
          cohort_id: string
          created_at: string
          id: string
          org_id: string
          user_id: string
        }
        Insert: {
          cohort_id: string
          created_at?: string
          id?: string
          org_id: string
          user_id: string
        }
        Update: {
          cohort_id?: string
          created_at?: string
          id?: string
          org_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cohort_instructors_org_id_cohort_id_fkey"
            columns: ["org_id", "cohort_id"]
            isOneToOne: false
            referencedRelation: "cohorts"
            referencedColumns: ["org_id", "id"]
          },
          {
            foreignKeyName: "cohort_instructors_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cohort_instructors_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      cohort_modules: {
        Row: {
          cohort_id: string
          created_at: string
          due_at: string | null
          enabled: boolean
          gate_unlocked_at: string | null
          gate_unlocked_by: string | null
          id: string
          module_id: string
          opens_at: string | null
          org_id: string
          updated_at: string
        }
        Insert: {
          cohort_id: string
          created_at?: string
          due_at?: string | null
          enabled?: boolean
          gate_unlocked_at?: string | null
          gate_unlocked_by?: string | null
          id?: string
          module_id: string
          opens_at?: string | null
          org_id: string
          updated_at?: string
        }
        Update: {
          cohort_id?: string
          created_at?: string
          due_at?: string | null
          enabled?: boolean
          gate_unlocked_at?: string | null
          gate_unlocked_by?: string | null
          id?: string
          module_id?: string
          opens_at?: string | null
          org_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cohort_modules_gate_unlocked_by_fkey"
            columns: ["gate_unlocked_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cohort_modules_org_id_cohort_id_fkey"
            columns: ["org_id", "cohort_id"]
            isOneToOne: false
            referencedRelation: "cohorts"
            referencedColumns: ["org_id", "id"]
          },
          {
            foreignKeyName: "cohort_modules_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cohort_modules_org_id_module_id_fkey"
            columns: ["org_id", "module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["org_id", "id"]
          },
        ]
      }
      cohorts: {
        Row: {
          course_id: string
          created_at: string
          ends_on: string | null
          id: string
          name: string
          org_id: string
          starts_on: string | null
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          ends_on?: string | null
          id?: string
          name: string
          org_id: string
          starts_on?: string | null
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          ends_on?: string | null
          id?: string
          name?: string
          org_id?: string
          starts_on?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cohorts_org_id_course_id_fkey"
            columns: ["org_id", "course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["org_id", "id"]
          },
          {
            foreignKeyName: "cohorts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      consent_releases: {
        Row: {
          bible_entry_id: string
          created_at: string
          created_by: string | null
          distribution: Database["public"]["Enums"]["distribution_scope"]
          expires_at: string | null
          file_asset_id: string | null
          id: string
          is_guardian: boolean
          org_id: string
          permitted_lanes: Database["public"]["Enums"]["lane"][]
          permitted_uses: Json
          project_id: string
          revoked_at: string | null
          revoked_reason: string | null
          rights_holder_name: string
          signed_at: string | null
          signer_email: string | null
          source_asset_id: string | null
          state: Database["public"]["Enums"]["consent_state"]
          subject_is_minor: boolean
          subject_name: string
          updated_at: string
        }
        Insert: {
          bible_entry_id: string
          created_at?: string
          created_by?: string | null
          distribution?: Database["public"]["Enums"]["distribution_scope"]
          expires_at?: string | null
          file_asset_id?: string | null
          id?: string
          is_guardian?: boolean
          org_id: string
          permitted_lanes?: Database["public"]["Enums"]["lane"][]
          permitted_uses?: Json
          project_id: string
          revoked_at?: string | null
          revoked_reason?: string | null
          rights_holder_name: string
          signed_at?: string | null
          signer_email?: string | null
          source_asset_id?: string | null
          state?: Database["public"]["Enums"]["consent_state"]
          subject_is_minor?: boolean
          subject_name: string
          updated_at?: string
        }
        Update: {
          bible_entry_id?: string
          created_at?: string
          created_by?: string | null
          distribution?: Database["public"]["Enums"]["distribution_scope"]
          expires_at?: string | null
          file_asset_id?: string | null
          id?: string
          is_guardian?: boolean
          org_id?: string
          permitted_lanes?: Database["public"]["Enums"]["lane"][]
          permitted_uses?: Json
          project_id?: string
          revoked_at?: string | null
          revoked_reason?: string | null
          rights_holder_name?: string
          signed_at?: string | null
          signer_email?: string | null
          source_asset_id?: string | null
          state?: Database["public"]["Enums"]["consent_state"]
          subject_is_minor?: boolean
          subject_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "consent_releases_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consent_releases_file_asset_fk"
            columns: ["org_id", "file_asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["org_id", "id"]
          },
          {
            foreignKeyName: "consent_releases_org_id_bible_entry_id_fkey"
            columns: ["org_id", "bible_entry_id"]
            isOneToOne: false
            referencedRelation: "bible_entries"
            referencedColumns: ["org_id", "id"]
          },
          {
            foreignKeyName: "consent_releases_org_id_bible_entry_id_fkey"
            columns: ["org_id", "bible_entry_id"]
            isOneToOne: false
            referencedRelation: "bible_entry_status"
            referencedColumns: ["org_id", "id"]
          },
          {
            foreignKeyName: "consent_releases_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consent_releases_org_id_project_id_fkey"
            columns: ["org_id", "project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["org_id", "id"]
          },
          {
            foreignKeyName: "consent_releases_source_asset_fk"
            columns: ["org_id", "source_asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["org_id", "id"]
          },
        ]
      }
      courses: {
        Row: {
          created_at: string
          description: string
          id: string
          org_id: string
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          org_id: string
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          org_id?: string
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      deployment_profiles: {
        Row: {
          adapter: Json
          adapter_tested_at: string | null
          approval_owner: string | null
          approval_status: Database["public"]["Enums"]["approval_status"]
          approved_at: string | null
          approved_until: string | null
          compute_provider: string
          cost_model: Json
          created_at: string
          credential_policy: Database["public"]["Enums"]["credential_policy"]
          enabled: boolean
          endpoint: string
          energy_profile: Json
          health_status: Database["public"]["Enums"]["health_status"]
          id: string
          image_version: string | null
          kind: Database["public"]["Enums"]["deployment_kind"]
          lanes: Database["public"]["Enums"]["lane"][]
          model_checksum: string | null
          model_version_id: string
          notes: string
          provider: string
          quota: Json
          region: string
          resource_model: Json
          retention: Json
          safety_pipeline_version: string
          slug: string
          updated_at: string
        }
        Insert: {
          adapter?: Json
          adapter_tested_at?: string | null
          approval_owner?: string | null
          approval_status?: Database["public"]["Enums"]["approval_status"]
          approved_at?: string | null
          approved_until?: string | null
          compute_provider?: string
          cost_model: Json
          created_at?: string
          credential_policy?: Database["public"]["Enums"]["credential_policy"]
          enabled?: boolean
          endpoint: string
          energy_profile?: Json
          health_status?: Database["public"]["Enums"]["health_status"]
          id?: string
          image_version?: string | null
          kind: Database["public"]["Enums"]["deployment_kind"]
          lanes: Database["public"]["Enums"]["lane"][]
          model_checksum?: string | null
          model_version_id: string
          notes?: string
          provider: string
          quota?: Json
          region?: string
          resource_model?: Json
          retention?: Json
          safety_pipeline_version?: string
          slug: string
          updated_at?: string
        }
        Update: {
          adapter?: Json
          adapter_tested_at?: string | null
          approval_owner?: string | null
          approval_status?: Database["public"]["Enums"]["approval_status"]
          approved_at?: string | null
          approved_until?: string | null
          compute_provider?: string
          cost_model?: Json
          created_at?: string
          credential_policy?: Database["public"]["Enums"]["credential_policy"]
          enabled?: boolean
          endpoint?: string
          energy_profile?: Json
          health_status?: Database["public"]["Enums"]["health_status"]
          id?: string
          image_version?: string | null
          kind?: Database["public"]["Enums"]["deployment_kind"]
          lanes?: Database["public"]["Enums"]["lane"][]
          model_checksum?: string | null
          model_version_id?: string
          notes?: string
          provider?: string
          quota?: Json
          region?: string
          resource_model?: Json
          retention?: Json
          safety_pipeline_version?: string
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deployment_profiles_model_version_id_fkey"
            columns: ["model_version_id"]
            isOneToOne: false
            referencedRelation: "model_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      enrolments: {
        Row: {
          cohort_id: string
          created_at: string
          id: string
          org_id: string
          status: Database["public"]["Enums"]["enrolment_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          cohort_id: string
          created_at?: string
          id?: string
          org_id: string
          status?: Database["public"]["Enums"]["enrolment_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          cohort_id?: string
          created_at?: string
          id?: string
          org_id?: string
          status?: Database["public"]["Enums"]["enrolment_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrolments_org_id_cohort_id_fkey"
            columns: ["org_id", "cohort_id"]
            isOneToOne: false
            referencedRelation: "cohorts"
            referencedColumns: ["org_id", "id"]
          },
          {
            foreignKeyName: "enrolments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrolments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      invites: {
        Row: {
          accepted_at: string | null
          accepted_user_id: string | null
          cohort_id: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          is_minor: boolean
          org_id: string
          project_id: string | null
          project_role: Database["public"]["Enums"]["project_role"] | null
          role: Database["public"]["Enums"]["member_role"]
          token: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_user_id?: string | null
          cohort_id?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          is_minor?: boolean
          org_id: string
          project_id?: string | null
          project_role?: Database["public"]["Enums"]["project_role"] | null
          role?: Database["public"]["Enums"]["member_role"]
          token?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_user_id?: string | null
          cohort_id?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          is_minor?: boolean
          org_id?: string
          project_id?: string | null
          project_role?: Database["public"]["Enums"]["project_role"] | null
          role?: Database["public"]["Enums"]["member_role"]
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "invites_accepted_user_id_fkey"
            columns: ["accepted_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invites_org_id_cohort_id_fkey"
            columns: ["org_id", "cohort_id"]
            isOneToOne: false
            referencedRelation: "cohorts"
            referencedColumns: ["org_id", "id"]
          },
          {
            foreignKeyName: "invites_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invites_org_id_project_id_fkey"
            columns: ["org_id", "project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["org_id", "id"]
          },
        ]
      }
      job_events: {
        Row: {
          actor: string
          at: string
          event: Database["public"]["Enums"]["job_event"]
          id: number
          job_id: string
          org_id: string
          payload: Json
          schema_version: number
        }
        Insert: {
          actor?: string
          at?: string
          event: Database["public"]["Enums"]["job_event"]
          id?: never
          job_id: string
          org_id: string
          payload?: Json
          schema_version?: number
        }
        Update: {
          actor?: string
          at?: string
          event?: Database["public"]["Enums"]["job_event"]
          id?: never
          job_id?: string
          org_id?: string
          payload?: Json
          schema_version?: number
        }
        Relationships: [
          {
            foreignKeyName: "job_events_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_events_org_id_job_id_fkey"
            columns: ["org_id", "job_id"]
            isOneToOne: false
            referencedRelation: "job_tokens"
            referencedColumns: ["org_id", "job_id"]
          },
          {
            foreignKeyName: "job_events_org_id_job_id_fkey"
            columns: ["org_id", "job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["org_id", "id"]
          },
        ]
      }
      job_receipts: {
        Row: {
          actual_cents: number | null
          consent_basis: Json
          cost_unknown: boolean
          created_at: string
          deployment_profile_id: string | null
          estimated_cents: number | null
          inputs: Json
          job_id: string
          lane: Database["public"]["Enums"]["lane"] | null
          layer: Database["public"]["Enums"]["layer"] | null
          model_version_id: string | null
          org_id: string
          output_hashes: string[]
          policy_decisions: Json
          provenance: Json
          resource_estimate: Json
        }
        Insert: {
          actual_cents?: number | null
          consent_basis?: Json
          cost_unknown?: boolean
          created_at?: string
          deployment_profile_id?: string | null
          estimated_cents?: number | null
          inputs: Json
          job_id: string
          lane?: Database["public"]["Enums"]["lane"] | null
          layer?: Database["public"]["Enums"]["layer"] | null
          model_version_id?: string | null
          org_id: string
          output_hashes?: string[]
          policy_decisions?: Json
          provenance?: Json
          resource_estimate?: Json
        }
        Update: {
          actual_cents?: number | null
          consent_basis?: Json
          cost_unknown?: boolean
          created_at?: string
          deployment_profile_id?: string | null
          estimated_cents?: number | null
          inputs?: Json
          job_id?: string
          lane?: Database["public"]["Enums"]["lane"] | null
          layer?: Database["public"]["Enums"]["layer"] | null
          model_version_id?: string | null
          org_id?: string
          output_hashes?: string[]
          policy_decisions?: Json
          provenance?: Json
          resource_estimate?: Json
        }
        Relationships: [
          {
            foreignKeyName: "job_receipts_deployment_profile_id_fkey"
            columns: ["deployment_profile_id"]
            isOneToOne: false
            referencedRelation: "deployment_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_receipts_model_version_id_fkey"
            columns: ["model_version_id"]
            isOneToOne: false
            referencedRelation: "model_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_receipts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_receipts_org_id_job_id_fkey"
            columns: ["org_id", "job_id"]
            isOneToOne: false
            referencedRelation: "job_tokens"
            referencedColumns: ["org_id", "job_id"]
          },
          {
            foreignKeyName: "job_receipts_org_id_job_id_fkey"
            columns: ["org_id", "job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["org_id", "id"]
          },
        ]
      }
      jobs: {
        Row: {
          actual_cents: number | null
          attempts: number
          bible_entry_id: string | null
          claimed_at: string | null
          claimed_by: string | null
          cohort_id: string
          completed_at: string | null
          cost_unknown: boolean
          created_at: string
          deployment_profile_id: string | null
          entry_role: string | null
          error: string | null
          estimated_cents: number | null
          id: string
          inputs: Json
          kind: Database["public"]["Enums"]["job_kind"]
          lane: Database["public"]["Enums"]["lane"] | null
          layer: Database["public"]["Enums"]["layer"]
          model_version_id: string | null
          org_id: string
          policy_rejection: boolean
          priority: number
          project_id: string
          provider: string | null
          provider_request_id: string | null
          requested_by: string
          settled_at: string | null
          shot_id: string | null
          status: Database["public"]["Enums"]["job_status"]
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          actual_cents?: number | null
          attempts?: number
          bible_entry_id?: string | null
          claimed_at?: string | null
          claimed_by?: string | null
          cohort_id: string
          completed_at?: string | null
          cost_unknown?: boolean
          created_at?: string
          deployment_profile_id?: string | null
          entry_role?: string | null
          error?: string | null
          estimated_cents?: number | null
          id?: string
          inputs?: Json
          kind?: Database["public"]["Enums"]["job_kind"]
          lane?: Database["public"]["Enums"]["lane"] | null
          layer?: Database["public"]["Enums"]["layer"]
          model_version_id?: string | null
          org_id: string
          policy_rejection?: boolean
          priority?: number
          project_id: string
          provider?: string | null
          provider_request_id?: string | null
          requested_by: string
          settled_at?: string | null
          shot_id?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          actual_cents?: number | null
          attempts?: number
          bible_entry_id?: string | null
          claimed_at?: string | null
          claimed_by?: string | null
          cohort_id?: string
          completed_at?: string | null
          cost_unknown?: boolean
          created_at?: string
          deployment_profile_id?: string | null
          entry_role?: string | null
          error?: string | null
          estimated_cents?: number | null
          id?: string
          inputs?: Json
          kind?: Database["public"]["Enums"]["job_kind"]
          lane?: Database["public"]["Enums"]["lane"] | null
          layer?: Database["public"]["Enums"]["layer"]
          model_version_id?: string | null
          org_id?: string
          policy_rejection?: boolean
          priority?: number
          project_id?: string
          provider?: string | null
          provider_request_id?: string | null
          requested_by?: string
          settled_at?: string | null
          shot_id?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_bible_entry_fk"
            columns: ["org_id", "bible_entry_id"]
            isOneToOne: false
            referencedRelation: "bible_entries"
            referencedColumns: ["org_id", "id"]
          },
          {
            foreignKeyName: "jobs_bible_entry_fk"
            columns: ["org_id", "bible_entry_id"]
            isOneToOne: false
            referencedRelation: "bible_entry_status"
            referencedColumns: ["org_id", "id"]
          },
          {
            foreignKeyName: "jobs_deployment_profile_id_fkey"
            columns: ["deployment_profile_id"]
            isOneToOne: false
            referencedRelation: "deployment_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_model_version_id_fkey"
            columns: ["model_version_id"]
            isOneToOne: false
            referencedRelation: "model_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_org_id_cohort_id_fkey"
            columns: ["org_id", "cohort_id"]
            isOneToOne: false
            referencedRelation: "cohorts"
            referencedColumns: ["org_id", "id"]
          },
          {
            foreignKeyName: "jobs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_org_id_project_id_fkey"
            columns: ["org_id", "project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["org_id", "id"]
          },
          {
            foreignKeyName: "jobs_org_id_shot_id_fkey"
            columns: ["org_id", "shot_id"]
            isOneToOne: false
            referencedRelation: "shots"
            referencedColumns: ["org_id", "id"]
          },
          {
            foreignKeyName: "jobs_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ledger: {
        Row: {
          cents: number
          cohort_id: string
          created_at: string
          envelope: Database["public"]["Enums"]["budget_envelope"]
          id: string
          job_id: string | null
          kind: Database["public"]["Enums"]["ledger_kind"]
          note: string | null
          org_id: string
          project_id: string | null
          user_id: string | null
        }
        Insert: {
          cents: number
          cohort_id: string
          created_at?: string
          envelope: Database["public"]["Enums"]["budget_envelope"]
          id?: string
          job_id?: string | null
          kind: Database["public"]["Enums"]["ledger_kind"]
          note?: string | null
          org_id: string
          project_id?: string | null
          user_id?: string | null
        }
        Update: {
          cents?: number
          cohort_id?: string
          created_at?: string
          envelope?: Database["public"]["Enums"]["budget_envelope"]
          id?: string
          job_id?: string | null
          kind?: Database["public"]["Enums"]["ledger_kind"]
          note?: string | null
          org_id?: string
          project_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ledger_org_id_cohort_id_fkey"
            columns: ["org_id", "cohort_id"]
            isOneToOne: false
            referencedRelation: "cohorts"
            referencedColumns: ["org_id", "id"]
          },
          {
            foreignKeyName: "ledger_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_org_id_job_id_fkey"
            columns: ["org_id", "job_id"]
            isOneToOne: false
            referencedRelation: "job_tokens"
            referencedColumns: ["org_id", "job_id"]
          },
          {
            foreignKeyName: "ledger_org_id_job_id_fkey"
            columns: ["org_id", "job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["org_id", "id"]
          },
          {
            foreignKeyName: "ledger_org_id_project_id_fkey"
            columns: ["org_id", "project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["org_id", "id"]
          },
          {
            foreignKeyName: "ledger_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          created_at: string
          id: string
          is_minor: boolean
          org_id: string
          role: Database["public"]["Enums"]["member_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_minor?: boolean
          org_id: string
          role?: Database["public"]["Enums"]["member_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_minor?: boolean
          org_id?: string
          role?: Database["public"]["Enums"]["member_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      model_versions: {
        Row: {
          approval_owner: string | null
          approval_status: Database["public"]["Enums"]["approval_status"]
          approved_at: string | null
          approved_until: string | null
          commercial_eligibility: Database["public"]["Enums"]["commercial_eligibility"]
          created_at: string
          id: string
          indemnification: boolean
          input_schema: Json
          integrity_rating: Database["public"]["Enums"]["integrity_rating"]
          license_family: string
          license_url: string
          license_version: string
          limitations: string
          min_content_tier: Database["public"]["Enums"]["content_tier"]
          model_id: string
          notes: string
          output_rights_summary: string
          release_eligible: boolean
          resource_disclosure: Database["public"]["Enums"]["disclosure_tier"]
          resource_disclosure_source: string
          safety: Json
          safety_pipeline_version: string
          self_hostable: boolean
          slug: string
          training_data_disclosure: Database["public"]["Enums"]["genesis_class"]
          updated_at: string
          version: string
          voice_likeness_risk: Database["public"]["Enums"]["risk_level"]
          weights_status: Database["public"]["Enums"]["weights_status"]
        }
        Insert: {
          approval_owner?: string | null
          approval_status?: Database["public"]["Enums"]["approval_status"]
          approved_at?: string | null
          approved_until?: string | null
          commercial_eligibility?: Database["public"]["Enums"]["commercial_eligibility"]
          created_at?: string
          id?: string
          indemnification?: boolean
          input_schema?: Json
          integrity_rating?: Database["public"]["Enums"]["integrity_rating"]
          license_family: string
          license_url?: string
          license_version?: string
          limitations?: string
          min_content_tier?: Database["public"]["Enums"]["content_tier"]
          model_id: string
          notes?: string
          output_rights_summary?: string
          release_eligible?: boolean
          resource_disclosure?: Database["public"]["Enums"]["disclosure_tier"]
          resource_disclosure_source?: string
          safety?: Json
          safety_pipeline_version?: string
          self_hostable?: boolean
          slug: string
          training_data_disclosure?: Database["public"]["Enums"]["genesis_class"]
          updated_at?: string
          version: string
          voice_likeness_risk?: Database["public"]["Enums"]["risk_level"]
          weights_status: Database["public"]["Enums"]["weights_status"]
        }
        Update: {
          approval_owner?: string | null
          approval_status?: Database["public"]["Enums"]["approval_status"]
          approved_at?: string | null
          approved_until?: string | null
          commercial_eligibility?: Database["public"]["Enums"]["commercial_eligibility"]
          created_at?: string
          id?: string
          indemnification?: boolean
          input_schema?: Json
          integrity_rating?: Database["public"]["Enums"]["integrity_rating"]
          license_family?: string
          license_url?: string
          license_version?: string
          limitations?: string
          min_content_tier?: Database["public"]["Enums"]["content_tier"]
          model_id?: string
          notes?: string
          output_rights_summary?: string
          release_eligible?: boolean
          resource_disclosure?: Database["public"]["Enums"]["disclosure_tier"]
          resource_disclosure_source?: string
          safety?: Json
          safety_pipeline_version?: string
          self_hostable?: boolean
          slug?: string
          training_data_disclosure?: Database["public"]["Enums"]["genesis_class"]
          updated_at?: string
          version?: string
          voice_likeness_risk?: Database["public"]["Enums"]["risk_level"]
          weights_status?: Database["public"]["Enums"]["weights_status"]
        }
        Relationships: [
          {
            foreignKeyName: "model_versions_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
        ]
      }
      models: {
        Row: {
          created_at: string
          creative_guidance: string
          display_name: string
          id: string
          modality: Database["public"]["Enums"]["model_modality"]
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          creative_guidance?: string
          display_name: string
          id?: string
          modality: Database["public"]["Enums"]["model_modality"]
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          creative_guidance?: string
          display_name?: string
          id?: string
          modality?: Database["public"]["Enums"]["model_modality"]
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      modules: {
        Row: {
          brief: string
          course_id: string
          created_at: string
          gate_kind: Database["public"]["Enums"]["gate_kind"]
          gate_module_id: string | null
          id: string
          org_id: string
          position: number
          title: string
          updated_at: string
        }
        Insert: {
          brief?: string
          course_id: string
          created_at?: string
          gate_kind?: Database["public"]["Enums"]["gate_kind"]
          gate_module_id?: string | null
          id?: string
          org_id: string
          position: number
          title: string
          updated_at?: string
        }
        Update: {
          brief?: string
          course_id?: string
          created_at?: string
          gate_kind?: Database["public"]["Enums"]["gate_kind"]
          gate_module_id?: string | null
          id?: string
          org_id?: string
          position?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "modules_gate_module_id_fkey"
            columns: ["gate_module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modules_org_id_course_id_fkey"
            columns: ["org_id", "course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["org_id", "id"]
          },
          {
            foreignKeyName: "modules_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      org_credentials: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          label: string
          org_id: string
          provider: string
          revoked_at: string | null
          rotated_at: string | null
          secret_ref: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          label?: string
          org_id: string
          provider: string
          revoked_at?: string | null
          rotated_at?: string | null
          secret_ref: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          label?: string
          org_id?: string
          provider?: string
          revoked_at?: string | null
          rotated_at?: string | null
          secret_ref?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_credentials_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_credentials_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      org_model_profiles: {
        Row: {
          approved_by: string | null
          budget_cap_cents: number | null
          created_at: string
          deployment_profile_id: string
          ends_on: string
          id: string
          lanes: Database["public"]["Enums"]["lane"][]
          notes: string
          org_id: string
          release_allowed: boolean
          requires_instructor_gate: boolean
          review_by: string
          starts_on: string
          updated_at: string
        }
        Insert: {
          approved_by?: string | null
          budget_cap_cents?: number | null
          created_at?: string
          deployment_profile_id: string
          ends_on: string
          id?: string
          lanes: Database["public"]["Enums"]["lane"][]
          notes?: string
          org_id: string
          release_allowed?: boolean
          requires_instructor_gate?: boolean
          review_by: string
          starts_on?: string
          updated_at?: string
        }
        Update: {
          approved_by?: string | null
          budget_cap_cents?: number | null
          created_at?: string
          deployment_profile_id?: string
          ends_on?: string
          id?: string
          lanes?: Database["public"]["Enums"]["lane"][]
          notes?: string
          org_id?: string
          release_allowed?: boolean
          requires_instructor_gate?: boolean
          review_by?: string
          starts_on?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_model_profiles_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_model_profiles_deployment_profile_id_fkey"
            columns: ["deployment_profile_id"]
            isOneToOne: false
            referencedRelation: "deployment_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_model_profiles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      orgs: {
        Row: {
          billing_email: string | null
          card_on_file: boolean
          content_tier: Database["public"]["Enums"]["content_tier"]
          created_at: string
          credential_default: Database["public"]["Enums"]["credential_mode"]
          has_minors: boolean
          id: string
          logo_url: string | null
          looks: Json
          mark_url: string | null
          name: string
          overage_allowed: boolean
          plan: string
          plan_started_on: string
          project_roles: string[]
          public_entity: boolean
          slug: string
          tokens_per_dollar: number
          updated_at: string
        }
        Insert: {
          billing_email?: string | null
          card_on_file?: boolean
          content_tier?: Database["public"]["Enums"]["content_tier"]
          created_at?: string
          credential_default?: Database["public"]["Enums"]["credential_mode"]
          has_minors?: boolean
          id?: string
          logo_url?: string | null
          looks?: Json
          mark_url?: string | null
          name: string
          overage_allowed?: boolean
          plan?: string
          plan_started_on?: string
          project_roles?: string[]
          public_entity?: boolean
          slug: string
          tokens_per_dollar?: number
          updated_at?: string
        }
        Update: {
          billing_email?: string | null
          card_on_file?: boolean
          content_tier?: Database["public"]["Enums"]["content_tier"]
          created_at?: string
          credential_default?: Database["public"]["Enums"]["credential_mode"]
          has_minors?: boolean
          id?: string
          logo_url?: string | null
          looks?: Json
          mark_url?: string | null
          name?: string
          overage_allowed?: boolean
          plan?: string
          plan_started_on?: string
          project_roles?: string[]
          public_entity?: boolean
          slug?: string
          tokens_per_dollar?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orgs_plan_fkey"
            columns: ["plan"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["key"]
          },
        ]
      }
      personal_budgets: {
        Row: {
          cohort_id: string
          created_at: string
          id: string
          org_id: string
          total_cents: number
          updated_at: string
          user_id: string
        }
        Insert: {
          cohort_id: string
          created_at?: string
          id?: string
          org_id: string
          total_cents: number
          updated_at?: string
          user_id: string
        }
        Update: {
          cohort_id?: string
          created_at?: string
          id?: string
          org_id?: string
          total_cents?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "personal_budgets_org_id_cohort_id_fkey"
            columns: ["org_id", "cohort_id"]
            isOneToOne: false
            referencedRelation: "cohorts"
            referencedColumns: ["org_id", "id"]
          },
          {
            foreignKeyName: "personal_budgets_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personal_budgets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          blurb: string
          key: string
          monthly_cents: number
          name: string
          seats: number
          sort: number
          token_cents_per_month: number
        }
        Insert: {
          blurb?: string
          key: string
          monthly_cents: number
          name: string
          seats: number
          sort?: number
          token_cents_per_month: number
        }
        Update: {
          blurb?: string
          key?: string
          monthly_cents?: number
          name?: string
          seats?: number
          sort?: number
          token_cents_per_month?: number
        }
        Relationships: []
      }
      project_budgets: {
        Row: {
          created_at: string
          id: string
          org_id: string
          project_id: string
          total_cents: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          org_id: string
          project_id: string
          total_cents: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          org_id?: string
          project_id?: string
          total_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_budgets_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_budgets_org_id_project_id_fkey"
            columns: ["org_id", "project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["org_id", "id"]
          },
        ]
      }
      project_members: {
        Row: {
          created_at: string
          id: string
          org_id: string
          project_id: string
          roles: string[]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          org_id: string
          project_id: string
          roles?: string[]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          org_id?: string
          project_id?: string
          roles?: string[]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_members_org_id_project_id_fkey"
            columns: ["org_id", "project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["org_id", "id"]
          },
          {
            foreignKeyName: "project_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          cohort_id: string
          created_at: string
          crew_cap: number | null
          id: string
          logline: string
          look: string | null
          org_id: string
          requires_approval: boolean
          roles_needed: string[]
          slug: string
          status: Database["public"]["Enums"]["project_status"]
          title: string
          updated_at: string
        }
        Insert: {
          cohort_id: string
          created_at?: string
          crew_cap?: number | null
          id?: string
          logline?: string
          look?: string | null
          org_id: string
          requires_approval?: boolean
          roles_needed?: string[]
          slug: string
          status?: Database["public"]["Enums"]["project_status"]
          title: string
          updated_at?: string
        }
        Update: {
          cohort_id?: string
          created_at?: string
          crew_cap?: number | null
          id?: string
          logline?: string
          look?: string | null
          org_id?: string
          requires_approval?: boolean
          roles_needed?: string[]
          slug?: string
          status?: Database["public"]["Enums"]["project_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_org_id_cohort_id_fkey"
            columns: ["org_id", "cohort_id"]
            isOneToOne: false
            referencedRelation: "cohorts"
            referencedColumns: ["org_id", "id"]
          },
          {
            foreignKeyName: "projects_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      publications: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string | null
          error: string | null
          external_id: string | null
          external_url: string | null
          id: string
          org_id: string
          platform: Database["public"]["Enums"]["social_platform"]
          project_id: string
          published_at: string | null
          release_checks: Json
          render_asset_id: string | null
          social_account_id: string | null
          status: Database["public"]["Enums"]["publication_status"]
          timeline_id: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          error?: string | null
          external_id?: string | null
          external_url?: string | null
          id?: string
          org_id: string
          platform: Database["public"]["Enums"]["social_platform"]
          project_id: string
          published_at?: string | null
          release_checks?: Json
          render_asset_id?: string | null
          social_account_id?: string | null
          status?: Database["public"]["Enums"]["publication_status"]
          timeline_id: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          error?: string | null
          external_id?: string | null
          external_url?: string | null
          id?: string
          org_id?: string
          platform?: Database["public"]["Enums"]["social_platform"]
          project_id?: string
          published_at?: string | null
          release_checks?: Json
          render_asset_id?: string | null
          social_account_id?: string | null
          status?: Database["public"]["Enums"]["publication_status"]
          timeline_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "publications_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publications_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publications_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publications_org_id_project_id_fkey"
            columns: ["org_id", "project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["org_id", "id"]
          },
          {
            foreignKeyName: "publications_org_id_render_asset_id_fkey"
            columns: ["org_id", "render_asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["org_id", "id"]
          },
          {
            foreignKeyName: "publications_org_id_social_account_id_fkey"
            columns: ["org_id", "social_account_id"]
            isOneToOne: false
            referencedRelation: "social_accounts"
            referencedColumns: ["org_id", "id"]
          },
          {
            foreignKeyName: "publications_org_id_timeline_id_fkey"
            columns: ["org_id", "timeline_id"]
            isOneToOne: false
            referencedRelation: "timelines"
            referencedColumns: ["org_id", "id"]
          },
        ]
      }
      scenes: {
        Row: {
          created_at: string
          id: string
          org_id: string
          position: number
          project_id: string
          synopsis: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          org_id: string
          position: number
          project_id: string
          synopsis?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          org_id?: string
          position?: number
          project_id?: string
          synopsis?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scenes_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scenes_org_id_project_id_fkey"
            columns: ["org_id", "project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["org_id", "id"]
          },
        ]
      }
      shot_bible_entries: {
        Row: {
          bible_entry_id: string
          org_id: string
          shot_id: string
        }
        Insert: {
          bible_entry_id: string
          org_id: string
          shot_id: string
        }
        Update: {
          bible_entry_id?: string
          org_id?: string
          shot_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shot_bible_entries_org_id_bible_entry_id_fkey"
            columns: ["org_id", "bible_entry_id"]
            isOneToOne: false
            referencedRelation: "bible_entries"
            referencedColumns: ["org_id", "id"]
          },
          {
            foreignKeyName: "shot_bible_entries_org_id_bible_entry_id_fkey"
            columns: ["org_id", "bible_entry_id"]
            isOneToOne: false
            referencedRelation: "bible_entry_status"
            referencedColumns: ["org_id", "id"]
          },
          {
            foreignKeyName: "shot_bible_entries_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shot_bible_entries_org_id_shot_id_fkey"
            columns: ["org_id", "shot_id"]
            isOneToOne: false
            referencedRelation: "shots"
            referencedColumns: ["org_id", "id"]
          },
        ]
      }
      shots: {
        Row: {
          created_at: string
          description: string
          duration_target_s: number | null
          id: string
          intent: Json
          label: string
          org_id: string
          plate_take_id: string | null
          position: number
          project_id: string
          scene_id: string
          selected_take_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          duration_target_s?: number | null
          id?: string
          intent?: Json
          label?: string
          org_id: string
          plate_take_id?: string | null
          position: number
          project_id: string
          scene_id: string
          selected_take_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          duration_target_s?: number | null
          id?: string
          intent?: Json
          label?: string
          org_id?: string
          plate_take_id?: string | null
          position?: number
          project_id?: string
          scene_id?: string
          selected_take_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shots_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shots_org_id_project_id_fkey"
            columns: ["org_id", "project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["org_id", "id"]
          },
          {
            foreignKeyName: "shots_org_id_scene_id_fkey"
            columns: ["org_id", "scene_id"]
            isOneToOne: false
            referencedRelation: "scenes"
            referencedColumns: ["org_id", "id"]
          },
          {
            foreignKeyName: "shots_plate_take_fk"
            columns: ["org_id", "plate_take_id"]
            isOneToOne: false
            referencedRelation: "takes"
            referencedColumns: ["org_id", "id"]
          },
          {
            foreignKeyName: "shots_selected_take_fk"
            columns: ["org_id", "selected_take_id"]
            isOneToOne: false
            referencedRelation: "takes"
            referencedColumns: ["org_id", "id"]
          },
        ]
      }
      signup_requests: {
        Row: {
          created_at: string
          decided_at: string | null
          decided_by: string | null
          id: string
          org_id: string
          project_id: string
          roles: string[]
          status: Database["public"]["Enums"]["signup_status"]
          user_id: string
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          org_id: string
          project_id: string
          roles: string[]
          status?: Database["public"]["Enums"]["signup_status"]
          user_id: string
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          org_id?: string
          project_id?: string
          roles?: string[]
          status?: Database["public"]["Enums"]["signup_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "signup_requests_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signup_requests_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signup_requests_org_id_project_id_fkey"
            columns: ["org_id", "project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["org_id", "id"]
          },
          {
            foreignKeyName: "signup_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      social_accounts: {
        Row: {
          connected_at: string
          created_at: string
          handle: string
          id: string
          org_id: string
          owner_user_id: string | null
          platform: Database["public"]["Enums"]["social_platform"]
          profile_ref: string | null
          revoked_at: string | null
        }
        Insert: {
          connected_at?: string
          created_at?: string
          handle?: string
          id?: string
          org_id: string
          owner_user_id?: string | null
          platform: Database["public"]["Enums"]["social_platform"]
          profile_ref?: string | null
          revoked_at?: string | null
        }
        Update: {
          connected_at?: string
          created_at?: string
          handle?: string
          id?: string
          org_id?: string
          owner_user_id?: string | null
          platform?: Database["public"]["Enums"]["social_platform"]
          profile_ref?: string | null
          revoked_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_accounts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_accounts_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      submissions: {
        Row: {
          attempt: number
          cohort_module_id: string
          compare_set: Json
          created_at: string
          feedback: string | null
          id: string
          org_id: string
          project_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          rubric: Json | null
          rubric_draft: Json | null
          status: Database["public"]["Enums"]["submission_status"]
          submitted_at: string
          submitted_by: string
          timeline_id: string | null
          updated_at: string
        }
        Insert: {
          attempt?: number
          cohort_module_id: string
          compare_set?: Json
          created_at?: string
          feedback?: string | null
          id?: string
          org_id: string
          project_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          rubric?: Json | null
          rubric_draft?: Json | null
          status?: Database["public"]["Enums"]["submission_status"]
          submitted_at?: string
          submitted_by: string
          timeline_id?: string | null
          updated_at?: string
        }
        Update: {
          attempt?: number
          cohort_module_id?: string
          compare_set?: Json
          created_at?: string
          feedback?: string | null
          id?: string
          org_id?: string
          project_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          rubric?: Json | null
          rubric_draft?: Json | null
          status?: Database["public"]["Enums"]["submission_status"]
          submitted_at?: string
          submitted_by?: string
          timeline_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "submissions_org_id_cohort_module_id_fkey"
            columns: ["org_id", "cohort_module_id"]
            isOneToOne: false
            referencedRelation: "cohort_modules"
            referencedColumns: ["org_id", "id"]
          },
          {
            foreignKeyName: "submissions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_org_id_project_id_fkey"
            columns: ["org_id", "project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["org_id", "id"]
          },
          {
            foreignKeyName: "submissions_org_id_timeline_id_fkey"
            columns: ["org_id", "timeline_id"]
            isOneToOne: false
            referencedRelation: "timelines"
            referencedColumns: ["org_id", "id"]
          },
          {
            foreignKeyName: "submissions_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      takes: {
        Row: {
          asset_id: string
          created_at: string
          deployment_profile_id: string | null
          id: string
          job_id: string | null
          killed_at: string | null
          killed_by: string | null
          layer: Database["public"]["Enums"]["layer"]
          lifecycle: Database["public"]["Enums"]["take_lifecycle"]
          model_version_id: string | null
          notes: string
          org_id: string
          project_id: string
          shot_id: string
          updated_at: string
        }
        Insert: {
          asset_id: string
          created_at?: string
          deployment_profile_id?: string | null
          id?: string
          job_id?: string | null
          killed_at?: string | null
          killed_by?: string | null
          layer?: Database["public"]["Enums"]["layer"]
          lifecycle?: Database["public"]["Enums"]["take_lifecycle"]
          model_version_id?: string | null
          notes?: string
          org_id: string
          project_id: string
          shot_id: string
          updated_at?: string
        }
        Update: {
          asset_id?: string
          created_at?: string
          deployment_profile_id?: string | null
          id?: string
          job_id?: string | null
          killed_at?: string | null
          killed_by?: string | null
          layer?: Database["public"]["Enums"]["layer"]
          lifecycle?: Database["public"]["Enums"]["take_lifecycle"]
          model_version_id?: string | null
          notes?: string
          org_id?: string
          project_id?: string
          shot_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "takes_deployment_profile_id_fkey"
            columns: ["deployment_profile_id"]
            isOneToOne: false
            referencedRelation: "deployment_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "takes_job_fk"
            columns: ["org_id", "job_id"]
            isOneToOne: false
            referencedRelation: "job_tokens"
            referencedColumns: ["org_id", "job_id"]
          },
          {
            foreignKeyName: "takes_job_fk"
            columns: ["org_id", "job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["org_id", "id"]
          },
          {
            foreignKeyName: "takes_killed_by_fkey"
            columns: ["killed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "takes_model_version_id_fkey"
            columns: ["model_version_id"]
            isOneToOne: false
            referencedRelation: "model_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "takes_org_id_asset_id_fkey"
            columns: ["org_id", "asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["org_id", "id"]
          },
          {
            foreignKeyName: "takes_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "takes_org_id_project_id_fkey"
            columns: ["org_id", "project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["org_id", "id"]
          },
          {
            foreignKeyName: "takes_org_id_shot_id_fkey"
            columns: ["org_id", "shot_id"]
            isOneToOne: false
            referencedRelation: "shots"
            referencedColumns: ["org_id", "id"]
          },
        ]
      }
      timelines: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_current: boolean
          org_id: string
          otio: Json
          project_id: string
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_current?: boolean
          org_id: string
          otio?: Json
          project_id: string
          version: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_current?: boolean
          org_id?: string
          otio?: Json
          project_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "timelines_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timelines_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timelines_org_id_project_id_fkey"
            columns: ["org_id", "project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["org_id", "id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          display_name: string | null
          email: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email: string
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      webhook_inbox: {
        Row: {
          attempts: number
          body: string
          dedupe_key: string
          error: string | null
          headers: Json
          id: string
          processed_at: string | null
          provider: string
          provider_request_id: string | null
          received_at: string
          signature_ok: boolean
        }
        Insert: {
          attempts?: number
          body: string
          dedupe_key: string
          error?: string | null
          headers?: Json
          id?: string
          processed_at?: string | null
          provider: string
          provider_request_id?: string | null
          received_at?: string
          signature_ok: boolean
        }
        Update: {
          attempts?: number
          body?: string
          dedupe_key?: string
          error?: string | null
          headers?: Json
          id?: string
          processed_at?: string | null
          provider?: string
          provider_request_id?: string | null
          received_at?: string
          signature_ok?: boolean
        }
        Relationships: []
      }
    }
    Views: {
      bible_entry_status: {
        Row: {
          consent_state: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          generation_allowed: boolean | null
          id: string | null
          kind: Database["public"]["Enums"]["bible_kind"] | null
          likeness_of: string | null
          name: string | null
          org_id: string | null
          project_id: string | null
          reference_asset_id: string | null
          requires_consent: boolean | null
          updated_at: string | null
        }
        Insert: {
          consent_state?: never
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          generation_allowed?: never
          id?: string | null
          kind?: Database["public"]["Enums"]["bible_kind"] | null
          likeness_of?: string | null
          name?: string | null
          org_id?: string | null
          project_id?: string | null
          reference_asset_id?: string | null
          requires_consent?: boolean | null
          updated_at?: string | null
        }
        Update: {
          consent_state?: never
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          generation_allowed?: never
          id?: string | null
          kind?: Database["public"]["Enums"]["bible_kind"] | null
          likeness_of?: string | null
          name?: string | null
          org_id?: string | null
          project_id?: string | null
          reference_asset_id?: string | null
          requires_consent?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bible_entries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bible_entries_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bible_entries_org_id_project_id_fkey"
            columns: ["org_id", "project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["org_id", "id"]
          },
          {
            foreignKeyName: "bible_entries_reference_asset_fk"
            columns: ["org_id", "reference_asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["org_id", "id"]
          },
        ]
      }
      job_tokens: {
        Row: {
          actual_tokens: number | null
          bible_entry_id: string | null
          cost_unknown: boolean | null
          created_at: string | null
          entry_role: string | null
          error: string | null
          estimated_tokens: number | null
          job_id: string | null
          lane: Database["public"]["Enums"]["lane"] | null
          layer: Database["public"]["Enums"]["layer"] | null
          org_id: string | null
          project_id: string | null
          shot_id: string | null
          status: Database["public"]["Enums"]["job_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "jobs_bible_entry_fk"
            columns: ["org_id", "bible_entry_id"]
            isOneToOne: false
            referencedRelation: "bible_entries"
            referencedColumns: ["org_id", "id"]
          },
          {
            foreignKeyName: "jobs_bible_entry_fk"
            columns: ["org_id", "bible_entry_id"]
            isOneToOne: false
            referencedRelation: "bible_entry_status"
            referencedColumns: ["org_id", "id"]
          },
          {
            foreignKeyName: "jobs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_org_id_project_id_fkey"
            columns: ["org_id", "project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["org_id", "id"]
          },
          {
            foreignKeyName: "jobs_org_id_shot_id_fkey"
            columns: ["org_id", "shot_id"]
            isOneToOne: false
            referencedRelation: "shots"
            referencedColumns: ["org_id", "id"]
          },
        ]
      }
      org_job_metrics: {
        Row: {
          actual_cents: number | null
          avg_seconds: number | null
          cost_unknown: number | null
          day: string | null
          estimated_cents: number | null
          failed: number | null
          jobs: number | null
          lane: Database["public"]["Enums"]["lane"] | null
          layer: Database["public"]["Enums"]["layer"] | null
          org_id: string | null
          policy_rejected: number | null
          provider: string | null
          succeeded: number | null
        }
        Relationships: [
          {
            foreignKeyName: "jobs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      org_spend_monthly: {
        Row: {
          month: string | null
          org_id: string | null
          spent_cents: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ledger_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      personal_budget_admin: {
        Row: {
          cohort_id: string | null
          org_id: string | null
          remaining_cents: number | null
          reserved_open_cents: number | null
          spent_cents: number | null
          spent_tokens: number | null
          tokens_per_dollar: number | null
          total_cents: number | null
          total_tokens: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "personal_budgets_org_id_cohort_id_fkey"
            columns: ["org_id", "cohort_id"]
            isOneToOne: false
            referencedRelation: "cohorts"
            referencedColumns: ["org_id", "id"]
          },
          {
            foreignKeyName: "personal_budgets_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personal_budgets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      personal_budget_status: {
        Row: {
          cohort_id: string | null
          org_id: string | null
          remaining_cents: number | null
          reserved_open_cents: number | null
          spent_cents: number | null
          total_cents: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "personal_budgets_org_id_cohort_id_fkey"
            columns: ["org_id", "cohort_id"]
            isOneToOne: false
            referencedRelation: "cohorts"
            referencedColumns: ["org_id", "id"]
          },
          {
            foreignKeyName: "personal_budgets_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personal_budgets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      personal_tokens: {
        Row: {
          cohort_id: string | null
          org_id: string | null
          remaining_tokens: number | null
          reserved_open_tokens: number | null
          spent_tokens: number | null
          total_tokens: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "personal_budgets_org_id_cohort_id_fkey"
            columns: ["org_id", "cohort_id"]
            isOneToOne: false
            referencedRelation: "cohorts"
            referencedColumns: ["org_id", "id"]
          },
          {
            foreignKeyName: "personal_budgets_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personal_budgets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      project_budget_admin: {
        Row: {
          cohort_id: string | null
          org_id: string | null
          project_id: string | null
          remaining_cents: number | null
          reserved_open_cents: number | null
          spent_cents: number | null
          spent_tokens: number | null
          tokens_per_dollar: number | null
          total_cents: number | null
          total_tokens: number | null
        }
        Relationships: [
          {
            foreignKeyName: "project_budgets_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_budgets_org_id_project_id_fkey"
            columns: ["org_id", "project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["org_id", "id"]
          },
        ]
      }
      project_budget_status: {
        Row: {
          cohort_id: string | null
          org_id: string | null
          project_id: string | null
          remaining_cents: number | null
          reserved_open_cents: number | null
          spent_cents: number | null
          total_cents: number | null
        }
        Relationships: [
          {
            foreignKeyName: "project_budgets_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_budgets_org_id_project_id_fkey"
            columns: ["org_id", "project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["org_id", "id"]
          },
        ]
      }
      project_tokens: {
        Row: {
          cohort_id: string | null
          org_id: string | null
          project_id: string | null
          remaining_tokens: number | null
          reserved_open_tokens: number | null
          spent_tokens: number | null
          total_tokens: number | null
        }
        Relationships: [
          {
            foreignKeyName: "project_budgets_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_budgets_org_id_project_id_fkey"
            columns: ["org_id", "project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["org_id", "id"]
          },
        ]
      }
    }
    Functions: {
      accept_invite: {
        Args: { p_token: string }
        Returns: Database["public"]["Enums"]["member_role"]
      }
      add_org_credential: {
        Args: {
          p_label?: string
          p_org: string
          p_provider: string
          p_secret: string
        }
        Returns: string
      }
      bible_consent_state_for: {
        Args: { p_entry: string; p_lane: Database["public"]["Enums"]["lane"] }
        Returns: string
      }
      decide_signup: {
        Args: { p_approve: boolean; p_request: string }
        Returns: string
      }
      estimate_tokens: {
        Args: { p_inputs: Json; p_profile: string }
        Returns: number
      }
      invite_preview: {
        Args: { p_token: string }
        Returns: {
          cohort_name: string
          email_masked: string
          org_logo: string
          org_name: string
          project_title: string
          role: Database["public"]["Enums"]["member_role"]
          status: string
        }[]
      }
      model_options: {
        Args: { p_lane: Database["public"]["Enums"]["lane"]; p_project: string }
        Returns: {
          allowed: boolean
          commercial_eligibility: Database["public"]["Enums"]["commercial_eligibility"]
          compute_provider: string
          creative_guidance: string
          display_name: string
          input_schema: Json
          integrity_rating: Database["public"]["Enums"]["integrity_rating"]
          kind: Database["public"]["Enums"]["deployment_kind"]
          lanes: Database["public"]["Enums"]["lane"][]
          license_family: string
          limitations: string
          modality: Database["public"]["Enums"]["model_modality"]
          profile_id: string
          profile_slug: string
          reason: string
          release_eligible: boolean
          resource_disclosure: Database["public"]["Enums"]["disclosure_tier"]
          training_data_disclosure: Database["public"]["Enums"]["genesis_class"]
          version_slug: string
        }[]
      }
      my_landing: { Args: never; Returns: string }
      revoke_org_credential: { Args: { p_id: string }; Returns: boolean }
      set_project_budget_tokens: {
        Args: { p_project: string; p_tokens: number }
        Returns: number
      }
      shot_ready_for: {
        Args: { p_lane: Database["public"]["Enums"]["lane"]; p_shot: string }
        Returns: {
          missing: string[]
          ready: boolean
        }[]
      }
      sign_up: {
        Args: { p_project: string; p_roles: string[] }
        Returns: string
      }
      webhook_ingest: {
        Args: {
          p_body: string
          p_dedupe_key: string
          p_headers: Json
          p_provider: string
          p_request_id: string
          p_signature_ok: boolean
        }
        Returns: boolean
      }
    }
    Enums: {
      approval_status: "draft" | "approved" | "suspended" | "retired"
      asset_kind: "video" | "image" | "audio" | "document" | "render"
      asset_source: "generated" | "uploaded" | "rendered"
      bible_kind: "character" | "location" | "prop" | "style" | "voice"
      budget_envelope: "project" | "personal"
      commercial_eligibility:
        | "allowed"
        | "threshold"
        | "non_commercial"
        | "unknown"
      consent_state: "pending" | "signed" | "revoked"
      content_tier: "M" | "A"
      credential_mode: "org" | "platform"
      credential_policy: "platform" | "org" | "either"
      deployment_kind: "managed_api" | "self_hosted"
      disclosure_tier: "A" | "B" | "C"
      distribution_scope: "internal" | "cohort" | "public"
      enrolment_status: "active" | "withdrawn" | "completed"
      gate_kind: "none" | "submission" | "instructor"
      genesis_class: "licensed" | "opt_out" | "undisclosed" | "synthetic"
      health_status: "untested" | "healthy" | "degraded" | "down"
      integrity_rating: "high" | "medium" | "low" | "unrated"
      job_event:
        | "queued"
        | "claimed"
        | "submitted"
        | "accepted"
        | "running"
        | "output_received"
        | "stored"
        | "policy_approved"
        | "policy_rejected"
        | "settled"
        | "failed"
        | "timed_out"
        | "cancelled"
        | "unknown_cost"
      job_kind: "generate" | "render"
      job_status:
        | "queued"
        | "claimed"
        | "submitted"
        | "running"
        | "succeeded"
        | "failed"
        | "rejected"
        | "cancelled"
        | "timed_out"
      lane: "explore" | "control" | "finish" | "voice_likeness"
      layer:
        | "background"
        | "character"
        | "merged"
        | "dialogue"
        | "sfx"
        | "music"
      ledger_kind:
        | "grant"
        | "reserve"
        | "settle"
        | "release"
        | "refund"
        | "adjust"
      member_role: "student" | "instructor" | "admin" | "owner"
      model_modality:
        | "text_to_video"
        | "image_to_video"
        | "text_to_image"
        | "image_edit"
        | "text_to_speech"
        | "sound_effects"
        | "music"
        | "upscale"
      project_role: "director" | "dp" | "sound" | "editor" | "producer"
      project_status: "draft" | "open" | "crewed" | "closed"
      publication_status:
        | "draft"
        | "approved"
        | "publishing"
        | "published"
        | "failed"
        | "withdrawn"
      risk_level: "none" | "low" | "high"
      signup_status: "pending" | "approved" | "declined"
      social_platform:
        | "youtube"
        | "tiktok"
        | "instagram"
        | "facebook"
        | "x"
        | "linkedin"
      submission_status: "submitted" | "in_review" | "returned" | "accepted"
      take_lifecycle: "live" | "killed" | "archived"
      weights_status: "closed" | "open_weight" | "open_source"
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
      approval_status: ["draft", "approved", "suspended", "retired"],
      asset_kind: ["video", "image", "audio", "document", "render"],
      asset_source: ["generated", "uploaded", "rendered"],
      bible_kind: ["character", "location", "prop", "style", "voice"],
      budget_envelope: ["project", "personal"],
      commercial_eligibility: [
        "allowed",
        "threshold",
        "non_commercial",
        "unknown",
      ],
      consent_state: ["pending", "signed", "revoked"],
      content_tier: ["M", "A"],
      credential_mode: ["org", "platform"],
      credential_policy: ["platform", "org", "either"],
      deployment_kind: ["managed_api", "self_hosted"],
      disclosure_tier: ["A", "B", "C"],
      distribution_scope: ["internal", "cohort", "public"],
      enrolment_status: ["active", "withdrawn", "completed"],
      gate_kind: ["none", "submission", "instructor"],
      genesis_class: ["licensed", "opt_out", "undisclosed", "synthetic"],
      health_status: ["untested", "healthy", "degraded", "down"],
      integrity_rating: ["high", "medium", "low", "unrated"],
      job_event: [
        "queued",
        "claimed",
        "submitted",
        "accepted",
        "running",
        "output_received",
        "stored",
        "policy_approved",
        "policy_rejected",
        "settled",
        "failed",
        "timed_out",
        "cancelled",
        "unknown_cost",
      ],
      job_kind: ["generate", "render"],
      job_status: [
        "queued",
        "claimed",
        "submitted",
        "running",
        "succeeded",
        "failed",
        "rejected",
        "cancelled",
        "timed_out",
      ],
      lane: ["explore", "control", "finish", "voice_likeness"],
      layer: ["background", "character", "merged", "dialogue", "sfx", "music"],
      ledger_kind: [
        "grant",
        "reserve",
        "settle",
        "release",
        "refund",
        "adjust",
      ],
      member_role: ["student", "instructor", "admin", "owner"],
      model_modality: [
        "text_to_video",
        "image_to_video",
        "text_to_image",
        "image_edit",
        "text_to_speech",
        "sound_effects",
        "music",
        "upscale",
      ],
      project_role: ["director", "dp", "sound", "editor", "producer"],
      project_status: ["draft", "open", "crewed", "closed"],
      publication_status: [
        "draft",
        "approved",
        "publishing",
        "published",
        "failed",
        "withdrawn",
      ],
      risk_level: ["none", "low", "high"],
      signup_status: ["pending", "approved", "declined"],
      social_platform: [
        "youtube",
        "tiktok",
        "instagram",
        "facebook",
        "x",
        "linkedin",
      ],
      submission_status: ["submitted", "in_review", "returned", "accepted"],
      take_lifecycle: ["live", "killed", "archived"],
      weights_status: ["closed", "open_weight", "open_source"],
    },
  },
} as const
