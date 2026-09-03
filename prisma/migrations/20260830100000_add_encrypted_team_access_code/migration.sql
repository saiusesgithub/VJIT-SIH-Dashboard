-- Keep the bcrypt hash authoritative for authentication while allowing
-- authorized faculty to recover a team's code through server-side decryption.
ALTER TABLE "Team" ADD COLUMN "accessCodeEncrypted" TEXT;
