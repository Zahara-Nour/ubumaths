/**
 * LaTeX compilation validation schemas
 */

import { z } from 'zod';

/**
 * Schema for LaTeX compilation request
 */
export const compileLatexSchema = z.object({
	latex: z
		.string()
		.min(1, 'Code LaTeX requis')
		.max(50000, 'Code LaTeX trop long (max 50000 caractères)'),
	format: z.enum(['svg', 'png', 'pdf']).default('svg'),
	fontSize: z.number().int().positive().min(8).max(72).optional().default(12),
	displayMode: z.boolean().default(false)
});
