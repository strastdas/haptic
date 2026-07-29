-- Custom migration (drizzle-kit generate --custom): ported from the legacy
-- hand-written migrations.sql. Keeps entry.updated_at fresh on every UPDATE.
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = CURRENT_TIMESTAMP;
   RETURN NEW;
END;
$$ language 'plpgsql';
--> statement-breakpoint
CREATE TRIGGER update_entry_updated_at
BEFORE UPDATE ON entry
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
