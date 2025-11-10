import { z } from 'zod';

/**
 * Validation schema for restricting a user (mute, timeout, ban)
 */
export const restrictUserSchema = z
	.object({
		userId: z.string().uuid('User ID must be a valid UUID'),
		scopeType: z.enum(['conversation', 'global'], {
			errorMap: () => ({ message: 'Scope type must be conversation or global' })
		}),
		scopeId: z.string().uuid('Scope ID must be a valid UUID').nullable(),
		restrictionType: z.enum(['mute', 'timeout', 'ban'], {
			errorMap: () => ({ message: 'Restriction type must be mute, timeout, or ban' })
		}),
		reason: z
			.string()
			.min(5, 'Reason must be at least 5 characters')
			.max(500, 'Reason cannot exceed 500 characters'),
		expiresAt: z.string().datetime({ message: 'Invalid expiration date' }).nullable()
	})
	.refine((data) => (data.scopeType === 'global' ? data.scopeId === null : data.scopeId !== null), {
		message: 'Global scope must have no scopeId, conversation scope must have scopeId'
	});

/**
 * Validation schema for unrestricting a user
 */
export const unrestrictUserSchema = z.object({
	restrictionId: z.string().uuid('Restriction ID must be a valid UUID')
});

/**
 * Validation schema for deleting a message
 */
export const deleteMessageSchema = z.object({
	reason: z
		.string()
		.min(5, 'Reason must be at least 5 characters')
		.max(500, 'Reason cannot exceed 500 characters')
});

/**
 * Type inference for TypeScript
 */
export type RestrictUserInput = z.infer<typeof restrictUserSchema>;
export type UnrestrictUserInput = z.infer<typeof unrestrictUserSchema>;
export type DeleteMessageInput = z.infer<typeof deleteMessageSchema>;
