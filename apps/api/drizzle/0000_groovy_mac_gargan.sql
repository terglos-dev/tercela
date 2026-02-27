CREATE SCHEMA IF NOT EXISTS "auth";
--> statement-breakpoint
CREATE SCHEMA IF NOT EXISTS "channels";
--> statement-breakpoint
CREATE SCHEMA IF NOT EXISTS "config";
--> statement-breakpoint
CREATE SCHEMA IF NOT EXISTS "contacts";
--> statement-breakpoint
CREATE SCHEMA IF NOT EXISTS "inbox";
--> statement-breakpoint
CREATE SCHEMA IF NOT EXISTS "storage";
--> statement-breakpoint
CREATE TABLE "channels"."channels" (
	"id" text PRIMARY KEY NOT NULL,
	"type" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contacts"."contacts" (
	"id" text PRIMARY KEY NOT NULL,
	"external_id" varchar(255) NOT NULL,
	"name" varchar(255),
	"phone" varchar(50),
	"channel_type" varchar(50) NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inbox"."conversation_reads" (
	"id" text PRIMARY KEY NOT NULL,
	"conversation_id" text NOT NULL,
	"user_id" text NOT NULL,
	"last_read_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "conversation_reads_conv_user_uniq" UNIQUE("conversation_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "inbox"."conversations" (
	"id" text PRIMARY KEY NOT NULL,
	"contact_id" text NOT NULL,
	"channel_id" text NOT NULL,
	"assigned_to" text,
	"status" varchar(20) DEFAULT 'open' NOT NULL,
	"last_message_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "storage"."media" (
	"id" text PRIMARY KEY NOT NULL,
	"s3_key" text NOT NULL,
	"mime_type" varchar(255) NOT NULL,
	"filename" varchar(500),
	"size" integer,
	"uploaded_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inbox"."messages" (
	"id" text PRIMARY KEY NOT NULL,
	"conversation_id" text NOT NULL,
	"direction" varchar(20) NOT NULL,
	"type" varchar(20) DEFAULT 'text' NOT NULL,
	"content" text NOT NULL,
	"data" jsonb,
	"media_id" text,
	"external_id" varchar(255),
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"sender_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "config"."settings" (
	"id" text PRIMARY KEY NOT NULL,
	"key" varchar(100) NOT NULL,
	"value" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "channels"."templates" (
	"id" text PRIMARY KEY NOT NULL,
	"channel_id" text NOT NULL,
	"meta_id" varchar(255),
	"name" varchar(512) NOT NULL,
	"language" varchar(10) NOT NULL,
	"category" varchar(50) NOT NULL,
	"status" varchar(50) NOT NULL,
	"components" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"synced_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "templates_channel_name_language_idx" UNIQUE("channel_id","name","language")
);
--> statement-breakpoint
CREATE TABLE "auth"."users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text NOT NULL,
	"role" varchar(20) DEFAULT 'agent' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "inbox"."conversation_reads" ADD CONSTRAINT "conversation_reads_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "inbox"."conversations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inbox"."conversation_reads" ADD CONSTRAINT "conversation_reads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inbox"."conversations" ADD CONSTRAINT "conversations_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "contacts"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inbox"."conversations" ADD CONSTRAINT "conversations_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "channels"."channels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inbox"."conversations" ADD CONSTRAINT "conversations_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storage"."media" ADD CONSTRAINT "media_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inbox"."messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "inbox"."conversations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inbox"."messages" ADD CONSTRAINT "messages_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "storage"."media"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inbox"."messages" ADD CONSTRAINT "messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channels"."templates" ADD CONSTRAINT "templates_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "channels"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "contacts_external_id_channel_type_idx" ON "contacts"."contacts" USING btree ("external_id","channel_type");--> statement-breakpoint
CREATE INDEX "conversation_reads_conv_user_idx" ON "inbox"."conversation_reads" USING btree ("conversation_id","user_id");--> statement-breakpoint
CREATE INDEX "conversations_contact_id_idx" ON "inbox"."conversations" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "conversations_channel_id_idx" ON "inbox"."conversations" USING btree ("channel_id");--> statement-breakpoint
CREATE INDEX "conversations_last_message_at_idx" ON "inbox"."conversations" USING btree ("last_message_at");--> statement-breakpoint
CREATE INDEX "media_s3_key_idx" ON "storage"."media" USING btree ("s3_key");--> statement-breakpoint
CREATE INDEX "messages_conversation_id_idx" ON "inbox"."messages" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "messages_external_id_idx" ON "inbox"."messages" USING btree ("external_id");--> statement-breakpoint
CREATE INDEX "templates_channel_id_idx" ON "channels"."templates" USING btree ("channel_id");--> statement-breakpoint
CREATE INDEX "templates_status_idx" ON "channels"."templates" USING btree ("status");--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "auth"."users" USING btree ("email");