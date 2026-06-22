-- Tracks per-player, per-match appearance data (minutes played, match rating)
-- Used to compute games played count and average tournament ratings in team overview
CREATE TABLE IF NOT EXISTS game_appearances (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id     uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  match_id      text NOT NULL,   -- references GROUP_SCHEDULE match ids
  minutes_played smallint NOT NULL DEFAULT 0 CHECK (minutes_played >= 0 AND minutes_played <= 120),
  sofascore_rating numeric(3,1)  CHECK (sofascore_rating >= 0 AND sofascore_rating <= 10),
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (player_id, match_id)
);

CREATE INDEX IF NOT EXISTS game_appearances_player_id_idx ON game_appearances(player_id);
CREATE INDEX IF NOT EXISTS game_appearances_match_id_idx  ON game_appearances(match_id);
