CREATE TABLE IF NOT EXISTS "PortfolioQuery" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tickers" json NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"data" json NOT NULL,
	"userId" uuid NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "PortfolioQuery" ADD CONSTRAINT "PortfolioQuery_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
