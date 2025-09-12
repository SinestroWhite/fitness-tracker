-- -- Create reviews table for trainer reviews
-- CREATE TABLE IF NOT EXISTS reviews (
--     id SERIAL PRIMARY KEY,
--     user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
--     trainer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
--     rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
--     text TEXT,
--     images JSONB DEFAULT '[]'::jsonb,
--     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );

-- -- Create indexes for performance
-- CREATE INDEX IF NOT EXISTS idx_reviews_trainer_id ON reviews(trainer_id);
-- CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
-- CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);
-- CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at);

-- -- Ensure users can only review trainers (not other users)
-- ALTER TABLE reviews ADD CONSTRAINT check_trainer_role 
-- CHECK (trainer_id IN (SELECT id FROM users WHERE role = 'trainer'));

-- -- Prevent users from reviewing the same trainer multiple times
-- ALTER TABLE reviews ADD CONSTRAINT unique_user_trainer_review 
-- UNIQUE (user_id, trainer_id);


-- reviews table
CREATE TABLE IF NOT EXISTS reviews (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    trainer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    text TEXT,
    images JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_user_trainer_review UNIQUE (user_id, trainer_id),
    CONSTRAINT cannot_review_self CHECK (user_id <> trainer_id)
);

-- Helpful indexes (keep the ones you actually query on)
CREATE INDEX IF NOT EXISTS idx_reviews_trainer_id       ON reviews(trainer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id          ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating           ON reviews(rating);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at       ON reviews(created_at);
-- Often useful for trainer detail pages:
CREATE INDEX IF NOT EXISTS idx_reviews_trainer_created  ON reviews(trainer_id, created_at DESC);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION set_reviews_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_reviews_updated_at ON reviews;
CREATE TRIGGER trg_set_reviews_updated_at
BEFORE UPDATE ON reviews
FOR EACH ROW
EXECUTE FUNCTION set_reviews_updated_at();

-- Enforce that trainer_id belongs to a user whose role = 'trainer'
CREATE OR REPLACE FUNCTION enforce_trainer_role()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Lock the user row to avoid race with role changes
  PERFORM 1
  FROM users
  WHERE id = NEW.trainer_id
    AND role = 'trainer'
  FOR SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'trainer_id % does not belong to a user with role=trainer', NEW.trainer_id
      USING ERRCODE = '23514';  -- integrity_constraint_violation
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_trainer_role ON reviews;
CREATE TRIGGER trg_enforce_trainer_role
BEFORE INSERT OR UPDATE OF trainer_id ON reviews
FOR EACH ROW
EXECUTE FUNCTION enforce_trainer_role();

-- (Optional but recommended)
-- Prevent changing a user's role away from 'trainer' if they are referenced as a trainer in reviews.
CREATE OR REPLACE FUNCTION prevent_trainer_demotion_if_reviewed()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.role = 'trainer' AND NEW.role <> 'trainer' THEN
    IF EXISTS (SELECT 1 FROM reviews WHERE trainer_id = OLD.id) THEN
      RAISE EXCEPTION 'Cannot change role of user % from trainer while reviews reference them', OLD.id
        USING ERRCODE = '23503'; -- foreign_key_violation-ish semantics
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_trainer_demotion ON users;
CREATE TRIGGER trg_prevent_trainer_demotion
BEFORE UPDATE OF role ON users
FOR EACH ROW
EXECUTE FUNCTION prevent_trainer_demotion_if_reviewed();
