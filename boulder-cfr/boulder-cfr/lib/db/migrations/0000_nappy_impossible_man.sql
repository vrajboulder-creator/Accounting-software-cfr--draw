CREATE TYPE "public"."co_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."draw_status" AS ENUM('draft', 'submitted', 'certified', 'paid', 'voided');--> statement-breakpoint
CREATE TYPE "public"."org_role" AS ENUM('admin', 'member', 'viewer');--> statement-breakpoint
CREATE TYPE "public"."org_type" AS ENUM('contractor', 'owner', 'architect', 'accountant');--> statement-breakpoint
CREATE TYPE "public"."project_role" AS ENUM('contractor_admin', 'contractor_pm', 'contractor_viewer', 'owner', 'architect', 'accountant');--> statement-breakpoint
CREATE TYPE "public"."project_status" AS ENUM('active', 'completed', 'on_hold');--> statement-breakpoint
CREATE TYPE "public"."tx_payment_status" AS ENUM('pending', 'paid', 'voided');--> statement-breakpoint
CREATE TYPE "public"."tx_source" AS ENUM('manual', 'excel_import', 'invoice_upload', 'api');--> statement-breakpoint
CREATE TYPE "public"."tx_type" AS ENUM('invoice', 'payroll', 'expense', 'change_order_cost', 'credit');--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" text PRIMARY KEY NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"action" text NOT NULL,
	"before_json" jsonb,
	"after_json" jsonb,
	"user_id" text,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bid_line_items" (
	"id" text PRIMARY KEY NOT NULL,
	"division_id" text NOT NULL,
	"name" text NOT NULL,
	"budget_cents" bigint NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "change_orders" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"number" integer NOT NULL,
	"date" text NOT NULL,
	"description" text NOT NULL,
	"amount_cents" bigint NOT NULL,
	"status" "co_status" DEFAULT 'pending' NOT NULL,
	"approved_in_draw_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "divisions" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"number" integer NOT NULL,
	"name" text NOT NULL,
	"scheduled_value_cents" bigint NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"retainage_bps_override" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "draw_line_items" (
	"id" text PRIMARY KEY NOT NULL,
	"draw_id" text NOT NULL,
	"division_id" text NOT NULL,
	"col_c_scheduled_value_cents" bigint NOT NULL,
	"col_d_from_previous_cents" bigint DEFAULT 0 NOT NULL,
	"col_e_this_period_cents" bigint DEFAULT 0 NOT NULL,
	"col_f_materials_stored_cents" bigint DEFAULT 0 NOT NULL,
	"col_g_completed_stored_cents" bigint DEFAULT 0 NOT NULL,
	"col_g_percent_bps" integer DEFAULT 0 NOT NULL,
	"col_h_balance_cents" bigint DEFAULT 0 NOT NULL,
	"col_i_retainage_cents" bigint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "draw_line_items_draw_id_division_id_unique" UNIQUE("draw_id","division_id")
);
--> statement-breakpoint
CREATE TABLE "draws" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"number" integer NOT NULL,
	"period_end_date" text NOT NULL,
	"status" "draw_status" DEFAULT 'draft' NOT NULL,
	"line1_contract_sum_cents" bigint NOT NULL,
	"line2_net_co_cents" bigint DEFAULT 0 NOT NULL,
	"line3_contract_sum_to_date_cents" bigint NOT NULL,
	"line4_completed_stored_cents" bigint NOT NULL,
	"line5_retainage_cents" bigint NOT NULL,
	"line6_earned_less_retainage_cents" bigint NOT NULL,
	"line7_less_previous_cents" bigint NOT NULL,
	"line8_current_payment_due_cents" bigint NOT NULL,
	"line9_balance_to_finish_cents" bigint NOT NULL,
	"submitted_at" timestamp with time zone,
	"certified_at" timestamp with time zone,
	"certified_by" text,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "draws_project_id_number_unique" UNIQUE("project_id","number")
);
--> statement-breakpoint
CREATE TABLE "invoice_backup" (
	"id" text PRIMARY KEY NOT NULL,
	"draw_id" text NOT NULL,
	"transaction_id" text,
	"g703_division_id" text NOT NULL,
	"description" text NOT NULL,
	"commentary" text,
	"amount_cents" bigint NOT NULL,
	"retainage_cents" bigint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "org_memberships" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"org_id" text NOT NULL,
	"org_role" "org_role" DEFAULT 'member' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "org_memberships_user_id_org_id_unique" UNIQUE("user_id","org_id")
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" "org_type" NOT NULL,
	"address" text,
	"contact_email" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_memberships" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"user_id" text NOT NULL,
	"project_role" "project_role" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_memberships_project_id_user_id_unique" UNIQUE("project_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" text PRIMARY KEY NOT NULL,
	"contractor_org_id" text NOT NULL,
	"owner_org_id" text NOT NULL,
	"architect_org_id" text NOT NULL,
	"name" text NOT NULL,
	"project_number" text,
	"address" text NOT NULL,
	"contract_date" text NOT NULL,
	"contract_sum_cents" bigint NOT NULL,
	"default_retainage_bps" integer DEFAULT 1000 NOT NULL,
	"retainage_on_stored_materials" boolean DEFAULT true NOT NULL,
	"status" "project_status" DEFAULT 'active' NOT NULL,
	"cover_color" text DEFAULT '#F26B35' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"division_id" text NOT NULL,
	"bid_line_item_id" text,
	"date" text NOT NULL,
	"amount_cents" bigint NOT NULL,
	"vendor" text NOT NULL,
	"description" text NOT NULL,
	"type" "tx_type" DEFAULT 'invoice' NOT NULL,
	"payment_status" "tx_payment_status" DEFAULT 'pending' NOT NULL,
	"source" "tx_source" DEFAULT 'manual' NOT NULL,
	"linked_invoice_id" text,
	"linked_draw_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"org_id" text NOT NULL,
	"avatar_color" text DEFAULT '#64748B' NOT NULL,
	"auth_provider_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "bid_line_items" ADD CONSTRAINT "bid_line_items_division_id_divisions_id_fk" FOREIGN KEY ("division_id") REFERENCES "public"."divisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_orders" ADD CONSTRAINT "change_orders_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "divisions" ADD CONSTRAINT "divisions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draw_line_items" ADD CONSTRAINT "draw_line_items_draw_id_draws_id_fk" FOREIGN KEY ("draw_id") REFERENCES "public"."draws"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draw_line_items" ADD CONSTRAINT "draw_line_items_division_id_divisions_id_fk" FOREIGN KEY ("division_id") REFERENCES "public"."divisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draws" ADD CONSTRAINT "draws_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_backup" ADD CONSTRAINT "invoice_backup_draw_id_draws_id_fk" FOREIGN KEY ("draw_id") REFERENCES "public"."draws"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_backup" ADD CONSTRAINT "invoice_backup_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_backup" ADD CONSTRAINT "invoice_backup_g703_division_id_divisions_id_fk" FOREIGN KEY ("g703_division_id") REFERENCES "public"."divisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_memberships" ADD CONSTRAINT "org_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_memberships" ADD CONSTRAINT "org_memberships_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_memberships" ADD CONSTRAINT "project_memberships_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_memberships" ADD CONSTRAINT "project_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_contractor_org_id_organizations_id_fk" FOREIGN KEY ("contractor_org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_owner_org_id_organizations_id_fk" FOREIGN KEY ("owner_org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_architect_org_id_organizations_id_fk" FOREIGN KEY ("architect_org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_division_id_divisions_id_fk" FOREIGN KEY ("division_id") REFERENCES "public"."divisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_bid_line_item_id_bid_line_items_id_fk" FOREIGN KEY ("bid_line_item_id") REFERENCES "public"."bid_line_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_entity_idx" ON "audit_log" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "bli_division_idx" ON "bid_line_items" USING btree ("division_id");--> statement-breakpoint
CREATE INDEX "co_project_idx" ON "change_orders" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "divisions_project_idx" ON "divisions" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "dli_draw_idx" ON "draw_line_items" USING btree ("draw_id");--> statement-breakpoint
CREATE INDEX "draws_project_idx" ON "draws" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "tx_project_idx" ON "transactions" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "tx_division_idx" ON "transactions" USING btree ("division_id");