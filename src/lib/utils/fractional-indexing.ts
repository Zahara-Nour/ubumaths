/**
 * Fractional indexing
 * ===================
 *
 * Helpers for assigning a fractional `position` to an item being inserted /
 * moved within an ordered list, without having to renumber its siblings.
 *
 * Strategy: pick a `number` between the positions of the items immediately
 * before and after the insertion point. The DB column is DOUBLE PRECISION so
 * we have ~52 bits of precision before two consecutive midpoints become
 * indistinguishable (more than enough for any reasonable kanban board).
 *
 * Conventions:
 * - `before` is the position of the item that should remain *above* / *left*
 *   of the new item (smaller position). `null` means "insert at the start".
 * - `after` is the position of the item that should remain *below* / *right*
 *   of the new item (greater position). `null` means "insert at the end".
 * - When both are `null`, the list is empty → use 0.
 */

/**
 * Compute a new position halfway between `before` and `after`.
 *
 * Examples:
 *   getPositionBetween(null, null)  // 0  (empty list)
 *   getPositionBetween(null, 1)     // 0  (insert at start, shift below 1)
 *   getPositionBetween(null, 0)     // -1 (insert at start, shift below 0 — avoids collision)
 *   getPositionBetween(5, null)     // 6  (insert at end)
 *   getPositionBetween(2, 4)        // 3  (insert between two siblings)
 *
 * Note: when inserting at the start we subtract 1 from `after` rather than
 * dividing it by 2. Dividing collides with `after = 0` (returns 0 → same
 * position as the existing first item). Subtracting always lands strictly
 * below the smallest existing position.
 */
export function getPositionBetween(before: number | null, after: number | null): number {
	if (before == null && after == null) return 0;
	if (before == null) return (after as number) - 1;
	if (after == null) return before + 1;
	return (before + after) / 2;
}
