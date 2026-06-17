-- =============================================================================
-- Migration: Whiteboard Template Favorites
-- =============================================================================
-- Creates a table for users to mark their favorite whiteboard templates
-- for quick access in the template picker modal.
--
-- Features:
-- - Composite primary key (user_id, template_id)
-- - Automatic cleanup via ON DELETE CASCADE
-- - RLS policies for user-only access
-- =============================================================================

-- =============================================================================
-- Table: user_whiteboard_template_favorites
-- =============================================================================

CREATE TABLE user_whiteboard_template_favorites (
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    template_id UUID NOT NULL REFERENCES whiteboard_templates(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, template_id)
);

-- Add comment for documentation
COMMENT ON TABLE user_whiteboard_template_favorites IS 'User favorites for whiteboard templates - allows quick access to preferred templates';
COMMENT ON COLUMN user_whiteboard_template_favorites.user_id IS 'Reference to the user who favorited the template';
COMMENT ON COLUMN user_whiteboard_template_favorites.template_id IS 'Reference to the favorited template';
COMMENT ON COLUMN user_whiteboard_template_favorites.created_at IS 'When the template was favorited';

-- =============================================================================
-- Index for efficient queries by user
-- =============================================================================

CREATE INDEX idx_wb_template_favorites_user
    ON user_whiteboard_template_favorites(user_id);

-- =============================================================================
-- Row Level Security
-- =============================================================================

ALTER TABLE user_whiteboard_template_favorites ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own favorites
CREATE POLICY user_own_wb_favorites ON user_whiteboard_template_favorites
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
