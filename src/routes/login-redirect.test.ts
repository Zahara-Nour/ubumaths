import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Regression test for: bare `/login` redirects/links produce a 404.
 *
 * The only login route is `/auth/login` (src/routes/(public)/auth/login). A
 * redirect or link to `/login` (no `/auth` prefix) matches no route → 404, so
 * the user never reaches the login page nor sees the error message carried in
 * the query string (e.g. `/login?error=...`).
 *
 * This guards the whole codebase against reintroducing a `/login` navigation
 * target. A runtime safety net also exists in `hooks.server.ts` (redirectHandle
 * maps `/login` → `/auth/login`) for external / bookmarked URLs.
 */

const SRC = join(process.cwd(), 'src');

// Navigation targets only (redirect / href / goto) — NOT path comparisons like
// `pathname === '/login'`, which are legitimate in the redirect handler.
const BARE_LOGIN = /(?:redirect\([^,]*,\s*|href\s*=\s*\{?\s*|goto\(\s*)['"]\/login(?=['"?#])/;

function walk(dir: string): string[] {
	const files: string[] = [];
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const full = join(dir, entry.name);
		if (entry.isDirectory()) files.push(...walk(full));
		else if (/\.(ts|svelte)$/.test(entry.name) && !entry.name.endsWith('.test.ts'))
			files.push(full);
	}
	return files;
}

describe('login route redirects', () => {
	it('ne cible jamais /login (route inexistante → 404), utiliser /auth/login', () => {
		const offenders: string[] = [];
		for (const file of walk(SRC)) {
			readFileSync(file, 'utf8')
				.split('\n')
				.forEach((line, i) => {
					if (line.includes('/auth/login')) return;
					if (BARE_LOGIN.test(line)) offenders.push(`${file.replace(SRC, 'src')}:${i + 1}`);
				});
		}
		expect(
			offenders,
			`Cibles /login (404) detectees — remplacer par /auth/login :\n${offenders.join('\n')}`
		).toEqual([]);
	});
});
