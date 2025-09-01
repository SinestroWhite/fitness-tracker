-- -- Add trainer_id field to users table to assign clients to specific trainers
-- ALTER TABLE users ADD COLUMN trainer_id INTEGER;
-- ALTER TABLE users ADD CONSTRAINT fk_users_trainer FOREIGN KEY (trainer_id) REFERENCES users(id) ON DELETE SET NULL;

-- -- Create index for better performance
-- CREATE INDEX IF NOT EXISTS idx_users_trainer_id ON users(trainer_id);


-- Idempotent: add trainer_id, FK, and index only if missing

-- 1) Column
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS trainer_id INTEGER;

-- 2) Foreign key (skip if it already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_users_trainer'
      AND conrelid = 'users'::regclass
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT fk_users_trainer
      FOREIGN KEY (trainer_id) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END$$;

-- 3) Index
CREATE INDEX IF NOT EXISTS idx_users_trainer_id ON users(trainer_id);
