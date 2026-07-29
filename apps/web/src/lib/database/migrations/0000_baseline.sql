CREATE TABLE "collection" (
	"path" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"last_opened" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "collection_settings" (
	"collection_path" text PRIMARY KEY NOT NULL,
	"editor" jsonb NOT NULL,
	"notes" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entry" (
	"path" text PRIMARY KEY NOT NULL,
	"name" text,
	"parent_path" text NOT NULL,
	"collection_path" text,
	"content" text,
	"is_folder" boolean DEFAULT false,
	"size" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "collection_settings" ADD CONSTRAINT "collection_settings_collection_path_collection_path_fk" FOREIGN KEY ("collection_path") REFERENCES "public"."collection"("path") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entry" ADD CONSTRAINT "entry_collection_path_collection_path_fk" FOREIGN KEY ("collection_path") REFERENCES "public"."collection"("path") ON DELETE no action ON UPDATE no action;