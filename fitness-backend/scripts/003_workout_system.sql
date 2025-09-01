

-- ============================
-- Drop old tables if they exist
-- ============================
DROP TABLE IF EXISTS session_exercises CASCADE;
DROP TABLE IF EXISTS workout_plan_sessions CASCADE;
DROP TABLE IF EXISTS exercises CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS workout_plans CASCADE;

-- ============================
-- Adding workout system tables
-- ============================

-- Create workout plans table
CREATE TABLE workout_plans (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    goal VARCHAR(20) NOT NULL CHECK (goal IN ('lose', 'gain', 'maintain')),
    author_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create sessions table
CREATE TABLE sessions (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    body_area VARCHAR(20) NOT NULL CHECK (body_area IN ('full_body', 'upper_body', 'lower_body', 'core')),
    duration_mins INTEGER NOT NULL,
    description TEXT,
    author_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create exercises table
CREATE TABLE exercises (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    muscle VARCHAR(20) NOT NULL CHECK (muscle IN ('chest', 'back', 'legs', 'shoulders', 'arms', 'core', 'full_body')),
    image VARCHAR(500),
    video VARCHAR(500),
    author_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create workout plan session pivot table
CREATE TABLE workout_plan_sessions (
    id SERIAL PRIMARY KEY,
    workout_plan_id INTEGER REFERENCES workout_plans(id) ON DELETE CASCADE,
    session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
    schedule JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(workout_plan_id, session_id)
);

-- Create session exercise pivot table (variant B)
CREATE TABLE session_exercises (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
    exercise_id INTEGER REFERENCES exercises(id) ON DELETE CASCADE,
    repetitions INTEGER,
    time INTEGER,
    occurrence SMALLINT NOT NULL DEFAULT 1,
    position INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT session_exercises_unique_triplet
        UNIQUE (session_id, exercise_id, occurrence)
);

-- Create indexes for better performance
CREATE INDEX idx_workout_plans_goal ON workout_plans(goal);
CREATE INDEX idx_workout_plans_author ON workout_plans(author_id);
CREATE INDEX idx_sessions_body_area ON sessions(body_area);
CREATE INDEX idx_sessions_author ON sessions(author_id);
CREATE INDEX idx_exercises_muscle ON exercises(muscle);
CREATE INDEX idx_exercises_author ON exercises(author_id);

CREATE INDEX idx_session_exercises_session ON session_exercises(session_id);
CREATE INDEX idx_session_exercises_exercise ON session_exercises(exercise_id);
CREATE INDEX idx_session_exercises_session_position ON session_exercises(session_id, position);
