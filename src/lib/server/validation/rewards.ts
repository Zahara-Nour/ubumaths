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
	classId: z.string().uuid('Invalid class ID'), // Required for history tracking
	amount: z
		.number()
		.int('Amount must be an integer')
		.min(-1000, 'Cannot remove more than 1000 gidouilles at once')
		.max(1000, 'Cannot award more than 1000 gidouilles at once')
		.finite('Amount must be a finite number')
});

/**
 * Schema for awarding or removing bonus to/from a student
 * Supports both positive (add) and negative (remove) deltas
 */
export const awardBonusSchema = z.object({
	studentId: z.string().uuid('Invalid student ID'),
	classId: z.string().uuid('Invalid class ID'), // Required for history tracking
	delta: z
		.number()
		.int('Delta must be an integer')
		.min(-1000, 'Cannot remove more than 1000 bonus at once')
		.max(1000, 'Cannot award more than 1000 bonus at once')
		.finite('Delta must be a finite number')
});
