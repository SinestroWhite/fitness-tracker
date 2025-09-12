-- Adding nutrition system tables
-- Nutrition Plans table
DROP TABLE IF EXISTS nutrition_plans CASCADE;
DROP TABLE IF EXISTS meals CASCADE;
DROP TABLE IF EXISTS nutrition_plan_meal_pivot CASCADE;

CREATE TABLE IF NOT EXISTS nutrition_plans (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    goal VARCHAR(20) NOT NULL CHECK (goal IN ('lose', 'gain', 'maintain')),
    description TEXT,
    author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Meals table
CREATE TABLE IF NOT EXISTS meals (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    image VARCHAR(500),
    description TEXT,
    calories DECIMAL(8,2) NOT NULL CHECK (calories >= 0),
    protein DECIMAL(8,2) NOT NULL CHECK (protein >= 0),
    carbohydrates DECIMAL(8,2) NOT NULL CHECK (carbohydrates >= 0),
    fat DECIMAL(8,2) NOT NULL CHECK (fat >= 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE IF NOT EXISTS nutrition_plan_meal_pivot (
    id SERIAL PRIMARY KEY,
    nutrition_plan_id INTEGER NOT NULL REFERENCES nutrition_plans(id) ON DELETE CASCADE,
    meal_id INTEGER NOT NULL REFERENCES meals(id) ON DELETE CASCADE,

    -- add this column so the UNIQUE/index can use it
    position INTEGER NOT NULL CHECK (position > 0),

    quantity INTEGER CHECK (quantity > 0),
    quantity_kg DECIMAL(8,3) CHECK (quantity_kg > 0),
    schedule JSONB, -- Array of {day: string, time: string}
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- allows same meal multiple times in a plan, distinguished by position
    UNIQUE (nutrition_plan_id, meal_id, position)

    -- optional safety checks:
    --CHECK (schedule IS NULL OR jsonb_typeof(schedule) = 'array'),
   --CHECK ( ((quantity IS NOT NULL)::int + (quantity_kg IS NOT NULL)::int) = 1 )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_nutrition_plan_meal_pivot_position
  ON nutrition_plan_meal_pivot (nutrition_plan_id, position);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_nutrition_plans_author ON nutrition_plans(author_id);
CREATE INDEX IF NOT EXISTS idx_nutrition_plans_goal ON nutrition_plans(goal);
CREATE INDEX IF NOT EXISTS idx_meals_calories ON meals(calories);
CREATE INDEX IF NOT EXISTS idx_meals_protein ON meals(protein);
CREATE INDEX IF NOT EXISTS idx_nutrition_plan_meal_pivot_plan ON nutrition_plan_meal_pivot(nutrition_plan_id);
CREATE INDEX IF NOT EXISTS idx_nutrition_plan_meal_pivot_meal ON nutrition_plan_meal_pivot(meal_id);

-- Sample meals data
-- INSERT INTO meals (title, image, description, calories, protein, carbohydrates, fat) VALUES
-- ('Grilled Chicken Breast', '/images/meals/grilled-chicken.jpg', 'Lean protein source, perfect for muscle building', 165.0, 31.0, 0.0, 3.6),
-- ('Brown Rice Bowl', '/images/meals/brown-rice.jpg', 'Complex carbohydrates for sustained energy', 216.0, 5.0, 45.0, 1.8),
-- ('Greek Yogurt with Berries', '/images/meals/greek-yogurt.jpg', 'High protein breakfast with antioxidants', 150.0, 20.0, 15.0, 0.5),
-- ('Salmon Fillet', '/images/meals/salmon.jpg', 'Rich in omega-3 fatty acids and protein', 206.0, 22.0, 0.0, 12.0),
-- ('Quinoa Salad', '/images/meals/quinoa-salad.jpg', 'Complete protein with fresh vegetables', 180.0, 8.0, 32.0, 3.0),
-- ('Avocado Toast', '/images/meals/avocado-toast.jpg', 'Healthy fats with whole grain bread', 250.0, 8.0, 25.0, 15.0),
-- ('Protein Smoothie', '/images/meals/protein-smoothie.jpg', 'Post-workout recovery drink', 200.0, 25.0, 20.0, 2.0),
-- ('Sweet Potato', '/images/meals/sweet-potato.jpg', 'Complex carbs with vitamins and minerals', 112.0, 2.0, 26.0, 0.1)
-- ON CONFLICT DO NOTHING;
