/**
 * Zod validation schemas for Python playground settings
 */
import { z } from 'zod';

/** Valid editor theme values */
export const editorThemeSchema = z.enum([
	'default',
	'oneDark',
	'dracula',
	'github',
	'githubDark',
	'nord',
	'solarizedLight',
	'solarizedDark',
	'material',
	'materialDark',
	'vscode',
	'vscodeDark'
]);

/** Python settings validation schema */
export const pythonSettingsSchema = z.object({
	editorTheme: editorThemeSchema,
	fontSize: z.number().int().min(10).max(24),
	showPedagogicErrors: z.boolean()
});

/** Type inferred from schema */
export type PythonSettings = z.infer<typeof pythonSettingsSchema>;
