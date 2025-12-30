/**
 * Migration: Add atomic score upsert function to eliminate race condition
 *
 * Problem:
 * - Current implementation uses READ-then-WRITE pattern
 * - Concurrent score submissions can fail with unique constraint violations
 * - Poor user experience when race condition occurs
 *
 * Solution:
 * - PostgreSQL function with INSERT ... ON CONFLICT DO UPDATE
 * - Atomic operation eliminates race condition
 * - All logic handled in single database transaction
 *
 * Impact:
 * - Eliminates race condition errors
 * - Improves reliability for concurrent submissions
 * - Better user experience
 */

-- Drop function if exists (for idempotency)
DROP FUNCTION IF EXISTS upsert_2048_score(uuid, text, integer, boolean, boolean);

/**
 * Function: upsert_2048_score
 *
 * Atomically inserts or updates a 2048 game score record.
 * Uses INSERT ... ON CONFLICT to handle concurrent submissions safely.
 *
 * Logic:
 * - If no record exists: INSERT new row
 * - If record exists:
 *   - Update best_score to max(existing, new)
 *   - Increment games_played by 1
 *   - Increment tiles_2048_reached if reached_2048 is true
 *   - Increment tiles_4096_reached if reached_4096 is true
 *
 * @param p_user_id - UUID of the user submitting the score
 * @param p_mode - Game mode ('classic', 'multiplication', 'equations', 'fractions')
 * @param p_score - Final game score
 * @param p_reached_2048 - Whether the player reached the 2048 tile
 * @param p_reached_4096 - Whether the player reached the 4096 tile
 *
 * @returns TABLE(best_score integer, games_played integer, is_new_best boolean)
 *
 * Example usage:
 * SELECT * FROM upsert_2048_score(
 *   '123e4567-e89b-12d3-a456-426614174000'::uuid,
 *   'classic',
 *   5000,
 *   true,
 *   false
 * );
 *
 * Result:
 * | best_score | games_played | is_new_best |
 * |------------|--------------|-------------|
 * |       5000 |            1 |        true |
 */
CREATE OR REPLACE FUNCTION upsert_2048_score(
	p_user_id uuid,
	p_mode text,
	p_score integer,
	p_reached_2048 boolean,
	p_reached_4096 boolean
)
RETURNS TABLE(
	best_score integer,
	games_played integer,
	is_new_best boolean
)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
AS $$
DECLARE
	v_existing_best_score integer;
	v_new_best_score integer;
	v_is_new_best boolean;
BEGIN
	-- Attempt INSERT with ON CONFLICT to handle race conditions
	INSERT INTO game_2048_scores (
		user_id,
		mode,
		best_score,
		games_played,
		tiles_2048_reached,
		tiles_4096_reached
	)
	VALUES (
		p_user_id,
		p_mode,
		p_score,
		1,
		CASE WHEN p_reached_2048 THEN 1 ELSE 0 END,
		CASE WHEN p_reached_4096 THEN 1 ELSE 0 END
	)
	ON CONFLICT (user_id, mode)
	DO UPDATE SET
		-- Update best_score only if new score is higher
		best_score = GREATEST(game_2048_scores.best_score, p_score),
		-- Increment counters
		games_played = game_2048_scores.games_played + 1,
		tiles_2048_reached = game_2048_scores.tiles_2048_reached + CASE WHEN p_reached_2048 THEN 1 ELSE 0 END,
		tiles_4096_reached = game_2048_scores.tiles_4096_reached + CASE WHEN p_reached_4096 THEN 1 ELSE 0 END
	RETURNING
		game_2048_scores.best_score,
		game_2048_scores.games_played
	INTO v_new_best_score, games_played;

	-- Determine if this is a new personal best
	-- For INSERT: always true
	-- For UPDATE: true if new score > existing score
	SELECT game_2048_scores.best_score
	INTO v_existing_best_score
	FROM game_2048_scores
	WHERE game_2048_scores.user_id = p_user_id
	  AND game_2048_scores.mode = p_mode;

	-- If this was an INSERT, v_existing_best_score will equal v_new_best_score
	-- If this was an UPDATE where p_score > old best_score, it's a new best
	v_is_new_best := (p_score >= v_existing_best_score);

	-- Return results
	best_score := v_new_best_score;
	is_new_best := v_is_new_best;

	RETURN NEXT;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION upsert_2048_score(uuid, text, integer, boolean, boolean) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION upsert_2048_score IS
'Atomically inserts or updates a 2048 game score record.
Eliminates race condition from concurrent submissions using INSERT ... ON CONFLICT.
Returns best_score, games_played, and is_new_best flag.';
