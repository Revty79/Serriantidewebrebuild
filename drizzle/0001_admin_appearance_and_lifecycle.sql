CREATE TABLE "site_appearance_setting" (
	"key" text PRIMARY KEY NOT NULL,
	"preset_id" text NOT NULL,
	"page_background" text NOT NULL,
	"surface_background" text NOT NULL,
	"primary_accent" text NOT NULL,
	"secondary_accent" text NOT NULL,
	"main_text" text NOT NULL,
	"muted_text" text NOT NULL,
	"updated_by_user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "site_appearance_singleton_key" CHECK ("site_appearance_setting"."key" = 'site'),
	CONSTRAINT "site_appearance_preset_valid" CHECK ("site_appearance_setting"."preset_id" IN ('serrian-tide', 'classic')),
	CONSTRAINT "site_appearance_page_background_hex" CHECK ("site_appearance_setting"."page_background" ~ '^#[0-9A-F]{6}$'),
	CONSTRAINT "site_appearance_surface_background_hex" CHECK ("site_appearance_setting"."surface_background" ~ '^#[0-9A-F]{6}$'),
	CONSTRAINT "site_appearance_primary_accent_hex" CHECK ("site_appearance_setting"."primary_accent" ~ '^#[0-9A-F]{6}$'),
	CONSTRAINT "site_appearance_secondary_accent_hex" CHECK ("site_appearance_setting"."secondary_accent" ~ '^#[0-9A-F]{6}$'),
	CONSTRAINT "site_appearance_main_text_hex" CHECK ("site_appearance_setting"."main_text" ~ '^#[0-9A-F]{6}$'),
	CONSTRAINT "site_appearance_muted_text_hex" CHECK ("site_appearance_setting"."muted_text" ~ '^#[0-9A-F]{6}$')
);
--> statement-breakpoint
CREATE TABLE "lifecycle_audit_event" (
	"id" serial PRIMARY KEY NOT NULL,
	"action" text NOT NULL,
	"entity_kind" text NOT NULL,
	"target_id" text NOT NULL,
	"target_name" text NOT NULL,
	"campaign_id_snapshot" integer,
	"owner_user_id_snapshot" text,
	"actor_user_id" text NOT NULL,
	"reason" text DEFAULT '' NOT NULL,
	"dependency_summary_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "lifecycle_audit_event_action_valid" CHECK ("lifecycle_audit_event"."action" IN ('archive', 'restore', 'delete')),
	CONSTRAINT "lifecycle_audit_event_entity_kind_valid" CHECK ("lifecycle_audit_event"."entity_kind" IN (
        'campaign',
        'player-character',
        'race-npc',
        'creature-npc',
        'race',
        'creature',
        'skill',
        'item',
        'derived-ability',
        'campaign-session',
        'scene',
        'encounter',
        'campaign-player',
        'user-account',
        'shop',
        'town',
        'town-place'
      )),
	CONSTRAINT "lifecycle_audit_event_target_id_nonblank" CHECK (length(trim("lifecycle_audit_event"."target_id")) > 0),
	CONSTRAINT "lifecycle_audit_event_target_name_nonblank" CHECK (length(trim("lifecycle_audit_event"."target_name")) > 0),
	CONSTRAINT "lifecycle_audit_event_campaign_id_valid" CHECK ("lifecycle_audit_event"."campaign_id_snapshot" IS NULL OR "lifecycle_audit_event"."campaign_id_snapshot" > 0),
	CONSTRAINT "lifecycle_audit_event_owner_snapshot_valid" CHECK ("lifecycle_audit_event"."owner_user_id_snapshot" IS NULL OR length(trim("lifecycle_audit_event"."owner_user_id_snapshot")) > 0),
	CONSTRAINT "lifecycle_audit_event_reason_length_valid" CHECK (length("lifecycle_audit_event"."reason") <= 1000),
	CONSTRAINT "lifecycle_audit_event_dependency_summary_object" CHECK (jsonb_typeof("lifecycle_audit_event"."dependency_summary_json") = 'object')
);
--> statement-breakpoint
ALTER TABLE "site_appearance_setting" ADD CONSTRAINT "site_appearance_setting_updated_by_user_id_user_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lifecycle_audit_event" ADD CONSTRAINT "lifecycle_audit_event_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "lifecycle_audit_event_target_idx" ON "lifecycle_audit_event" USING btree ("entity_kind","target_id","created_at","id");--> statement-breakpoint
CREATE INDEX "lifecycle_audit_event_campaign_idx" ON "lifecycle_audit_event" USING btree ("campaign_id_snapshot","created_at","id");--> statement-breakpoint
CREATE INDEX "lifecycle_audit_event_actor_idx" ON "lifecycle_audit_event" USING btree ("actor_user_id","created_at","id");