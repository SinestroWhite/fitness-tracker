-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(20) CHECK(role IN ('user', 'trainer', 'admin')) DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create user_personal table
CREATE TABLE IF NOT EXISTS user_personal (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE NOT NULL,
  sex VARCHAR(10) CHECK(sex IN ('male', 'female')),
  height DECIMAL(5,2),
  goal VARCHAR(10) CHECK(goal IN ('lose', 'gain', 'keep')),
  nutrition_plan_id INTEGER,
  workout_plan_id INTEGER,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- Create progress table
CREATE TABLE IF NOT EXISTS progress (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  weight_kg DECIMAL(5,2) NOT NULL,
  body_fat DECIMAL(5,2),
  images JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- Create refresh_tokens table
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  token VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_user_personal_user_id ON user_personal(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_user_id ON progress(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);


-- -- 1. Добавяме статус и детайли за блокиране към users
-- ALTER TABLE users
--   ADD COLUMN IF NOT EXISTS status VARCHAR(20)
--     CHECK (status IN ('active', 'blocked')) DEFAULT 'active',
--   ADD COLUMN IF NOT EXISTS blocked_until TIMESTAMP NULL,
--   ADD COLUMN IF NOT EXISTS blocked_reason TEXT NULL,
--   ADD COLUMN IF NOT EXISTS blocked_by INTEGER NULL,
--   ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMP NULL,
--   ADD CONSTRAINT fk_users_blocked_by
--     FOREIGN KEY (blocked_by) REFERENCES users(id) ON DELETE SET NULL;

-- -- 2. Индекси за по-бързи филтри
-- CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
-- CREATE INDEX IF NOT EXISTS idx_users_role_status ON users(role, status);
-- CREATE INDEX IF NOT EXISTS idx_users_blocked_until ON users(blocked_until);

-- -- 3. (По желание) Таблица за одит/история на блокиранията
-- CREATE TABLE IF NOT EXISTS user_block_log (
--   id SERIAL PRIMARY KEY,
--   user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
--   action VARCHAR(10) CHECK (action IN ('block','unblock')) NOT NULL,
--   reason TEXT,
--   until_ts TIMESTAMP NULL,        -- ако е временно блокиране
--   acted_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
--   acted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );
-- CREATE INDEX IF NOT EXISTS idx_user_block_log_user ON user_block_log(user_id);


-- -- password_reset_tokens.sql
-- CREATE TABLE IF NOT EXISTS password_reset_tokens (
--   id SERIAL PRIMARY KEY,
--   user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
--   token_hash VARCHAR(64) NOT NULL, -- sha256 hex
--   expires_at TIMESTAMP NOT NULL,
--   used_at TIMESTAMP NULL,
--   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );

-- CREATE INDEX IF NOT EXISTS idx_prt_user_id ON password_reset_tokens(user_id);
-- CREATE INDEX IF NOT EXISTS idx_prt_token_hash ON password_reset_tokens(token_hash);


-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(20) CHECK(role IN ('user', 'trainer', 'admin')) DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create user_personal table
CREATE TABLE IF NOT EXISTS user_personal (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE NOT NULL,
  sex VARCHAR(10) CHECK(sex IN ('male', 'female')),
  height DECIMAL(5,2),
  goal VARCHAR(10) CHECK(goal IN ('lose', 'gain', 'keep')),
  nutrition_plan_id INTEGER,
  workout_plan_id INTEGER,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- Create progress table
CREATE TABLE IF NOT EXISTS progress (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  weight_kg DECIMAL(5,2) NOT NULL,
  body_fat DECIMAL(5,2),
  images JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- Create refresh_tokens table
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  token VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_user_personal_user_id ON user_personal(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_user_id ON progress(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);

------------------------------------------------------------
-- Block/Unblock fields on users (idempotent)
------------------------------------------------------------

-- Add columns if missing
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS status VARCHAR(20),
  ADD COLUMN IF NOT EXISTS blocked_until TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS blocked_reason TEXT NULL,
  ADD COLUMN IF NOT EXISTS blocked_by INTEGER NULL,
  ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMP NULL;

-- Ensure valid data and default for status
UPDATE users
SET status = 'active'
WHERE status IS NULL OR status NOT IN ('active', 'blocked');

ALTER TABLE users
  ALTER COLUMN status SET DEFAULT 'active';

-- Ensure CHECK constraint for status exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'users_status_check'
      AND conrelid = 'users'::regclass
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_status_check
      CHECK (status IN ('active','blocked'));
  END IF;
END
$$ LANGUAGE plpgsql;

-- Ensure FK (blocked_by -> users.id) exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_users_blocked_by'
      AND conrelid = 'users'::regclass
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT fk_users_blocked_by
      FOREIGN KEY (blocked_by) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END
$$ LANGUAGE plpgsql;

-- Indexes for block fields
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_role_status ON users(role, status);
CREATE INDEX IF NOT EXISTS idx_users_blocked_until ON users(blocked_until);

------------------------------------------------------------
-- (Optional) Audit table for block history
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_block_log (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR(10) CHECK (action IN ('block','unblock')) NOT NULL,
  reason TEXT,
  until_ts TIMESTAMP NULL,        -- if temporary block
  acted_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  acted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_user_block_log_user ON user_block_log(user_id);

------------------------------------------------------------
-- Password reset tokens
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(64) NOT NULL, -- sha256 hex
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_prt_user_id ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_prt_token_hash ON password_reset_tokens(token_hash);