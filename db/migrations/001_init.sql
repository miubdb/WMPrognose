-- Road to Matchday – Schema v1
-- Alle Nutzerdaten hängen per user_id an users (ON DELETE CASCADE => Konto-Löschung entfernt alles).
-- RLS ist aktiviert (ohne Policies), damit die Tabellen nicht über eine eventuell vorhandene
-- Supabase-REST-API (anon/authenticated) erreichbar sind. Die App greift ausschließlich serverseitig zu.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX users_email_lower_idx ON users (lower(email));

CREATE TABLE sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sessions_user_idx ON sessions (user_id);

CREATE TABLE login_attempts (
  id bigserial PRIMARY KEY,
  key text NOT NULL,
  at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX login_attempts_key_idx ON login_attempts (key, at);

CREATE TABLE profiles (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  display_name text,
  birth_year int CHECK (birth_year BETWEEN 1920 AND 2020),
  height_cm numeric(5,1) CHECK (height_cm BETWEEN 100 AND 250),
  sex text CHECK (sex IN ('m','f')),
  activity_level text NOT NULL DEFAULT 'moderate' CHECK (activity_level IN ('low','moderate','high')),
  start_date date NOT NULL,
  first_friendly_date date NOT NULL,
  main_goal_date date NOT NULL,
  start_weight_kg numeric(5,2) NOT NULL CHECK (start_weight_kg BETWEEN 30 AND 300),
  target_weight_kg numeric(5,2) NOT NULL CHECK (target_weight_kg BETWEEN 30 AND 300),
  start_ftp_w int NOT NULL CHECK (start_ftp_w BETWEEN 50 AND 600),
  onboarded_at timestamptz NOT NULL DEFAULT now(),
  CHECK (first_friendly_date > start_date),
  CHECK (main_goal_date >= first_friendly_date)
);

CREATE TABLE availability (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  weekday int NOT NULL CHECK (weekday BETWEEN 1 AND 7),
  available_minutes int NOT NULL DEFAULT 0 CHECK (available_minutes BETWEEN 0 AND 600),
  team_training boolean NOT NULL DEFAULT false,
  team_training_minutes int NOT NULL DEFAULT 0 CHECK (team_training_minutes BETWEEN 0 AND 300),
  notes text,
  PRIMARY KEY (user_id, weekday)
);

CREATE TABLE availability_exceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date date NOT NULL,
  available_minutes int NOT NULL CHECK (available_minutes BETWEEN 0 AND 600),
  reason text,
  UNIQUE (user_id, date)
);

CREATE TABLE events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('friendly','main_goal','match','test','other')),
  title text NOT NULL CHECK (length(title) BETWEEN 1 AND 120),
  date date NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX events_user_date_idx ON events (user_id, date);

CREATE TABLE ftp_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date date NOT NULL,
  ftp_w int NOT NULL CHECK (ftp_w BETWEEN 50 AND 600),
  method text NOT NULL CHECK (method IN ('initial','20min','ramp','manual')),
  test_value_w int CHECK (test_value_w BETWEEN 50 AND 1000),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ftp_tests_user_date_idx ON ftp_tests (user_id, date);

CREATE TABLE weight_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date date NOT NULL,
  weight_kg numeric(5,2) NOT NULL CHECK (weight_kg BETWEEN 30 AND 300),
  body_fat_pct numeric(4,1) CHECK (body_fat_pct BETWEEN 3 AND 60),
  notes text,
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','import')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);

CREATE TABLE plan_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date date NOT NULL,
  type text NOT NULL CHECK (type IN ('rad','kraft','lauf','fussball','torwart','mannschaft','mobilitaet','test','spiel','ruhe')),
  title text NOT NULL CHECK (length(title) BETWEEN 1 AND 160),
  duration_min int NOT NULL CHECK (duration_min BETWEEN 0 AND 600),
  intensity int NOT NULL DEFAULT 1 CHECK (intensity BETWEEN 1 AND 3),
  description text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  phase text,
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','generator','ai','rule')),
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','done','skipped')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX plan_sessions_user_date_idx ON plan_sessions (user_id, date);

CREATE TABLE workouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date date NOT NULL,
  type text NOT NULL CHECK (type IN ('rad','kraft','lauf','fussball','torwart','mannschaft','mobilitaet','test','spiel','sonstiges')),
  title text NOT NULL CHECK (length(title) BETWEEN 1 AND 160),
  duration_min numeric(6,1) NOT NULL CHECK (duration_min > 0 AND duration_min <= 1440),
  distance_km numeric(7,2) CHECK (distance_km >= 0),
  avg_power_w int CHECK (avg_power_w BETWEEN 0 AND 2000),
  normalized_power_w int CHECK (normalized_power_w BETWEEN 0 AND 2500),
  avg_hr int CHECK (avg_hr BETWEEN 30 AND 230),
  max_hr int CHECK (max_hr BETWEEN 30 AND 250),
  elevation_m int CHECK (elevation_m >= 0),
  rpe int CHECK (rpe BETWEEN 1 AND 10),
  tss numeric(6,1) CHECK (tss >= 0),
  tss_source text CHECK (tss_source IN ('power','rpe')),
  kcal int CHECK (kcal >= 0),
  notes text,
  plan_session_id uuid REFERENCES plan_sessions(id) ON DELETE SET NULL,
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','fit','tcx','gpx','apple_health')),
  external_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX workouts_user_date_idx ON workouts (user_id, date);
CREATE UNIQUE INDEX workouts_external_idx ON workouts (user_id, external_id) WHERE external_id IS NOT NULL;

CREATE TABLE plan_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source text NOT NULL CHECK (source IN ('ai','rule')),
  summary text NOT NULL,
  rationale text,
  changes jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz
);
CREATE INDEX plan_proposals_user_idx ON plan_proposals (user_id, status, created_at);

CREATE TABLE readiness_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date date NOT NULL,
  sleep_hours numeric(3,1) CHECK (sleep_hours BETWEEN 0 AND 16),
  sleep_quality int CHECK (sleep_quality BETWEEN 1 AND 5),
  soreness int CHECK (soreness BETWEEN 1 AND 5),
  energy int CHECK (energy BETWEEN 1 AND 5),
  mood int CHECK (mood BETWEEN 1 AND 5),
  stress int CHECK (stress BETWEEN 1 AND 5),
  resting_hr int CHECK (resting_hr BETWEEN 25 AND 150),
  hrv_ms int CHECK (hrv_ms BETWEEN 5 AND 300),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);

CREATE TABLE foods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 160),
  kcal_100g numeric(6,1) NOT NULL CHECK (kcal_100g >= 0),
  protein_100g numeric(5,1) NOT NULL DEFAULT 0 CHECK (protein_100g >= 0),
  carbs_100g numeric(5,1) NOT NULL DEFAULT 0 CHECK (carbs_100g >= 0),
  fat_100g numeric(5,1) NOT NULL DEFAULT 0 CHECK (fat_100g >= 0),
  serving_g numeric(6,1) CHECK (serving_g > 0),
  barcode text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE food_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date date NOT NULL,
  meal text NOT NULL CHECK (meal IN ('fruehstueck','mittag','abend','snack')),
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 160),
  amount_g numeric(7,1) CHECK (amount_g > 0),
  kcal numeric(7,1) NOT NULL CHECK (kcal >= 0),
  protein_g numeric(6,1) NOT NULL DEFAULT 0 CHECK (protein_g >= 0),
  carbs_g numeric(6,1) NOT NULL DEFAULT 0 CHECK (carbs_g >= 0),
  fat_g numeric(6,1) NOT NULL DEFAULT 0 CHECK (fat_g >= 0),
  food_id uuid REFERENCES foods(id) ON DELETE SET NULL,
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','food','ai_estimate')),
  is_estimate boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX food_entries_user_date_idx ON food_entries (user_id, date);

CREATE TABLE gk_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 120),
  category text NOT NULL CHECK (category IN ('fangen','fussarbeit','stellungsspiel','reaktion','eins_gegen_eins','spieleroeffnung','flanken','athletik','sonstiges')),
  description text,
  default_sets int CHECK (default_sets BETWEEN 1 AND 50),
  default_reps int CHECK (default_reps BETWEEN 1 AND 500),
  default_duration_min int CHECK (default_duration_min BETWEEN 1 AND 240),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE gk_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date date NOT NULL,
  title text NOT NULL CHECK (length(title) BETWEEN 1 AND 160),
  duration_min int NOT NULL CHECK (duration_min BETWEEN 1 AND 600),
  rpe int CHECK (rpe BETWEEN 1 AND 10),
  focus text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX gk_sessions_user_date_idx ON gk_sessions (user_id, date);

CREATE TABLE match_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date date NOT NULL,
  opponent text NOT NULL CHECK (length(opponent) BETWEEN 1 AND 120),
  competition text,
  goals_for int NOT NULL DEFAULT 0 CHECK (goals_for BETWEEN 0 AND 99),
  goals_against int NOT NULL DEFAULT 0 CHECK (goals_against BETWEEN 0 AND 99),
  minutes_played int NOT NULL DEFAULT 90 CHECK (minutes_played BETWEEN 0 AND 150),
  shots_faced int NOT NULL DEFAULT 0 CHECK (shots_faced BETWEEN 0 AND 99),
  saves int NOT NULL DEFAULT 0 CHECK (saves BETWEEN 0 AND 99),
  crosses_claimed int NOT NULL DEFAULT 0 CHECK (crosses_claimed BETWEEN 0 AND 99),
  crosses_faced int NOT NULL DEFAULT 0 CHECK (crosses_faced BETWEEN 0 AND 99),
  passes_completed int NOT NULL DEFAULT 0 CHECK (passes_completed BETWEEN 0 AND 300),
  passes_attempted int NOT NULL DEFAULT 0 CHECK (passes_attempted BETWEEN 0 AND 300),
  errors_leading_to_goal int NOT NULL DEFAULT 0 CHECK (errors_leading_to_goal BETWEEN 0 AND 20),
  rating int CHECK (rating BETWEEN 1 AND 10),
  strengths text,
  weaknesses text,
  goals_against_notes jsonb NOT NULL DEFAULT '[]'::jsonb,
  training_goals text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (saves <= shots_faced),
  CHECK (crosses_claimed <= crosses_faced),
  CHECK (passes_completed <= passes_attempted)
);
CREATE INDEX match_analyses_user_date_idx ON match_analyses (user_id, date);

CREATE TABLE coach_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user','assistant')),
  content text NOT NULL,
  proposal_id uuid REFERENCES plan_proposals(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX coach_messages_user_idx ON coach_messages (user_id, created_at);

CREATE TABLE ai_usage (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind text NOT NULL,
  at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ai_usage_user_idx ON ai_usage (user_id, at);

DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> 'schema_migrations' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;
