/**
 * Rewards system validation schemas
 */

import { z } from 'zod';

/**
 * Schema for awarding gidouilles to a student
 */
export const awardGidouillesSchema = z.object({
	studentId: z.string().uuid('Invalid student ID'),
	amount: z
		.number()
		.int('Amount must be an integer')
		.positive('Amount must be positive')
		.max(1000, 'Cannot award more than 1000 gidouilles at once')
		.finite('Amount must be a finite number')
});
