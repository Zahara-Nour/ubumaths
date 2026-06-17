-- Create user_presence table for WebSocket-based tracking
CREATE TABLE user_presence (
  user_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('online', 'offline')) DEFAULT 'offline',
  last_heartbeat timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index for quick lookups
CREATE INDEX idx_user_presence_status ON user_presence(status);
CREATE INDEX idx_user_presence_heartbeat ON user_presence(last_heartbeat);

-- Enable RLS
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;

-- Users can view their own presence
CREATE POLICY "Users can view own presence"
  ON user_presence FOR SELECT
  USING (auth.uid() = user_id);

-- Users can view presence of their accepted friends only
CREATE POLICY "Users can view friend presence"
  ON user_presence FOR SELECT
  USING (
    user_id IN (
      SELECT CASE
        WHEN requester_id = auth.uid() THEN addressee_id
        WHEN addressee_id = auth.uid() THEN requester_id
      END
      FROM friendships
      WHERE status = 'accepted'
      AND (requester_id = auth.uid() OR addressee_id = auth.uid())
    )
  );

-- Users can insert/update their own presence
CREATE POLICY "Users can manage own presence"
  ON user_presence FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_presence_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER user_presence_updated_at_trigger
  BEFORE UPDATE ON user_presence
  FOR EACH ROW
  EXECUTE FUNCTION update_user_presence_updated_at();

-- Function to cleanup stale presence (mark offline after 2 minutes)
CREATE OR REPLACE FUNCTION cleanup_stale_presence()
RETURNS void AS $$
BEGIN
  UPDATE user_presence
  SET status = 'offline', updated_at = now()
  WHERE status = 'online'
  AND last_heartbeat < now() - interval '2 minutes';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to upsert user presence (used by WebSocket server)
CREATE OR REPLACE FUNCTION upsert_user_presence(
  p_user_id uuid,
  p_status text
)
RETURNS void AS $$
BEGIN
  INSERT INTO user_presence (user_id, status, last_heartbeat, updated_at)
  VALUES (p_user_id, p_status, now(), now())
  ON CONFLICT (user_id)
  DO UPDATE SET
    status = EXCLUDED.status,
    last_heartbeat = EXCLUDED.last_heartbeat,
    updated_at = EXCLUDED.updated_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get friend IDs for a user (helper for WebSocket server)
CREATE OR REPLACE FUNCTION get_friend_ids(p_user_id uuid)
RETURNS TABLE(friend_id uuid) AS $$
BEGIN
  RETURN QUERY
  SELECT CASE
    WHEN requester_id = p_user_id THEN addressee_id
    WHEN addressee_id = p_user_id THEN requester_id
  END AS friend_id
  FROM friendships
  WHERE status = 'accepted'
  AND (requester_id = p_user_id OR addressee_id = p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
