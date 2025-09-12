
DROP TABLE IF EXISTS completed_user_workout_pivot;
DROP TABLE IF EXISTS completed_user_session_exercises;

CREATE TABLE completed_user_workout_pivot (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workout_plan_id BIGINT NOT NULL REFERENCES workout_plans(id) ON DELETE CASCADE,
  session_id BIGINT NOT NULL REFERENCES workout_plan_sessions(id) ON DELETE CASCADE, -- <-- важното
  performed_on DATE NOT NULL,        -- датата за която е маркирано
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Уникалност: потребител + план + сесия + ден
CREATE UNIQUE INDEX IF NOT EXISTS uq_completed_per_session_day
  ON completed_user_workout_pivot (user_id, workout_plan_id, session_id, performed_on);

-- Индекси за заявки
CREATE INDEX IF NOT EXISTS idx_cw_user_performed_on
  ON completed_user_workout_pivot (user_id, performed_on);

CREATE INDEX IF NOT EXISTS idx_cw_user_plan_performed_on
  ON completed_user_workout_pivot (user_id, workout_plan_id, performed_on);

CREATE INDEX IF NOT EXISTS idx_cw_user_session_performed_on
  ON completed_user_workout_pivot (user_id, session_id, performed_on);




-- -- ============================================
-- -- Track which exercises in a session were done
-- -- ============================================

CREATE TABLE completed_user_session_exercises (
  id BIGSERIAL PRIMARY KEY,

  -- Who/when/which schedule:
  user_id                 INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workout_plan_id         INTEGER NOT NULL REFERENCES workout_plans(id) ON DELETE CASCADE,
  workout_plan_session_id INTEGER NOT NULL REFERENCES workout_plan_sessions(id) ON DELETE CASCADE,
  performed_on            DATE    NOT NULL,

  -- What exactly was prescribed:
  session_exercise_id     INTEGER NOT NULL REFERENCES session_exercises(id) ON DELETE CASCADE,

  -- Snapshot/actuals:
  completed               BOOLEAN NOT NULL DEFAULT TRUE,   -- allows partial/incomplete tracking too
  reps_prescribed         INTEGER,                         -- denormalized for fast reads (optional)
  time_prescribed         INTEGER,                         -- seconds or whatever your unit is
  reps_done               INTEGER,
  time_done               INTEGER,                         -- seconds
  weight_kg               NUMERIC(6,2),
  distance_m              NUMERIC(7,2),
  notes                   TEXT,

  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One row per user + schedule + prescribed row + day
  CONSTRAINT uq_cuse_unique
    UNIQUE (user_id, workout_plan_id, workout_plan_session_id, session_exercise_id, performed_on)
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_cuse_user_day
  ON completed_user_session_exercises (user_id, performed_on);

CREATE INDEX IF NOT EXISTS idx_cuse_user_plan_day
  ON completed_user_session_exercises (user_id, workout_plan_id, performed_on);

CREATE INDEX IF NOT EXISTS idx_cuse_sched_day
  ON completed_user_session_exercises (workout_plan_session_id, performed_on);

CREATE INDEX IF NOT EXISTS idx_cuse_session_exercise
  ON completed_user_session_exercises (session_exercise_id);

