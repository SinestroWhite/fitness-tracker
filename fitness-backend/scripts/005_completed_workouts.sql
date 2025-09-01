-- CREATE TABLE IF NOT EXISTS completed_user_workout_pivot (
--     id SERIAL PRIMARY KEY,
--     user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
--     workout_plan_id INTEGER NOT NULL REFERENCES workout_plans(id) ON DELETE CASCADE,
--     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--     UNIQUE(user_id, workout_plan_id, created_at::date) -- Prevent duplicate completions on same day
-- );

-- -- Add indexes for better performance
-- CREATE INDEX IF NOT EXISTS idx_completed_workouts_user_id ON completed_user_workout_pivot(user_id);
-- CREATE INDEX IF NOT EXISTS idx_completed_workouts_workout_id ON completed_user_workout_pivot(workout_plan_id);
-- CREATE INDEX IF NOT EXISTS idx_completed_workouts_created_at ON completed_user_workout_pivot(created_at);






-- CREATE TABLE IF NOT EXISTS completed_user_workout_pivot (
--   id BIGSERIAL PRIMARY KEY,
--   user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
--   workout_plan_id INTEGER NOT NULL REFERENCES workout_plans(id) ON DELETE CASCADE,
--   created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
-- );

-- -- IMMUTABLE: (timestamp без tz)::date
-- CREATE UNIQUE INDEX IF NOT EXISTS uq_completed_per_day
--   ON completed_user_workout_pivot (user_id, workout_plan_id, (created_at::date));

-- CREATE INDEX IF NOT EXISTS idx_completed_workouts_user_id ON completed_user_workout_pivot(user_id);
-- CREATE INDEX IF NOT EXISTS idx_completed_workouts_workout_plan_id ON completed_user_workout_pivot(workout_plan_id);
-- CREATE INDEX IF NOT EXISTS idx_completed_workouts_created_at ON completed_user_workout_pivot(created_at);




DROP TABLE IF EXISTS completed_user_workout_pivot;

CREATE TABLE completed_user_workout_pivot (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workout_plan_id BIGINT NOT NULL REFERENCES workout_plans(id) ON DELETE CASCADE,
  performed_on DATE NOT NULL,                 -- <-- НОВО: „коя дата е приключено“
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Уникалност по потребител, план и ден (едно „Готово“ на ден)
CREATE UNIQUE INDEX IF NOT EXISTS uq_completed_per_day
  ON completed_user_workout_pivot (user_id, workout_plan_id, performed_on);

-- Индекси за заявки по период
CREATE INDEX IF NOT EXISTS idx_cw_user_performed_on
  ON completed_user_workout_pivot (user_id, performed_on);

CREATE INDEX IF NOT EXISTS idx_cw_user_plan_performed_on
  ON completed_user_workout_pivot (user_id, workout_plan_id, performed_on);
