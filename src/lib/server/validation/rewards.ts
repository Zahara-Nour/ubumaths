/**
 * Rewards system validation schemas
 */

import { z } from 'zod';

/**
 * Schema for awarding or removing gidouilles to/from a student
 * Supports both positive (add) and negative (remove) amounts
 */
export const awardGidouillesSchema = z.object({
	studentId: z.string().uuid('Invalid student ID'),
	amount: z
		.number()
		.int('Amount must be an integer')
		.min(-1000, 'Cannot remove more than 1000 gidouilles at once')
		.max(1000, 'Cannot award more than 1000 gidouilles at once')
		.finite('Amount must be a finite number')
});
