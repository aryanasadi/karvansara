ALTER TABLE "gateway_settings" ADD COLUMN "webhook_secret" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "gateway_settings" ADD COLUMN "card_number" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "gateway_settings" ADD COLUMN "card_holder" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "gateway_settings" ADD COLUMN "bank_name" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "receipt_url" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "payer_name" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "payer_card" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "paid_at" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "review_note" text DEFAULT '' NOT NULL;