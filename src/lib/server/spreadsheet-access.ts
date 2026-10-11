/**
 * Garde unique du tableur (pages `/spreadsheet` et API `/api/spreadsheets`).
 *
 * Élèves et prof (décision du 2026-10-12, écart V3) ; le compte admin n'en a
 * pas l'usage. La garde ne règle que le rôle : chacun ne lit et n'écrit que ses
 * tableurs, ce que garantit la RLS de `spreadsheets` (`auth.uid() = user_id`).
 */

import { requireRoles, type AuthResult } from '$lib/server/middleware/auth';

export function requireSpreadsheetUser(locals: App.Locals): Promise<AuthResult> {
	return requireRoles(locals, ['student', 'teacher']);
}
