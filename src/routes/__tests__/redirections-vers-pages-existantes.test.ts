/**
 * Toute redirection écrite en dur dans le code mène à une page qui existe.
 *
 * Régression (2026-10-05) : onze `redirect(303, '/auth/login')` renvoyaient vers
 * une page inexistante — la connexion est `/auth/login`. Sur quatre pages
 * publiques, un visiteur non connecté tombait sur une 404. Les tests de ces
 * pages attendaient `/auth/login` : ils enregistraient le bug au lieu de le voir.
 */
import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const ROUTES = join(ROOT, 'src', 'routes');

/** Fichiers source (hors tests) qui peuvent rediriger */
function sourceFiles(dir: string): string[] {
	return readdirSync(dir).flatMap((name) => {
		const path = join(dir, name);
		if (statSync(path).isDirectory()) return name === '__tests__' ? [] : sourceFiles(path);
		return /\.(ts|svelte)$/.test(name) && !name.endsWith('.test.ts') ? [path] : [];
	});
}

/** Chemins d'URL servis par les routes : groupes `(x)` retirés, `[param]` gardé comme joker */
function routePatterns(): RegExp[] {
	const patterns: RegExp[] = [];
	const walk = (dir: string, segments: string[]) => {
		for (const name of readdirSync(dir)) {
			const path = join(dir, name);
			if (statSync(path).isDirectory()) {
				walk(path, /^\(.*\)$/.test(name) ? segments : [...segments, name]);
			} else if (/^\+(page\.svelte|server\.ts)$/.test(name)) {
				const regex = segments
					.map((s) => (/^\[\.\.\..*\]$/.test(s) ? '.*' : /^\[.*\]$/.test(s) ? '[^/]+' : s))
					.join('/');
				patterns.push(new RegExp(`^/${regex}/?$`));
			}
		}
	};
	walk(ROUTES, []);
	return patterns;
}

/** Cibles littérales de `redirect(3xx, '/...')` */
function literalTargets(): { file: string; target: string }[] {
	const found: { file: string; target: string }[] = [];
	const re = /redirect\(\s*30\d\s*,\s*['"`](\/[^'"`$?#]*)/g;
	for (const file of sourceFiles(join(ROOT, 'src'))) {
		for (const m of readFileSync(file, 'utf8').matchAll(re)) {
			found.push({ file: relative(ROOT, file), target: m[1] });
		}
	}
	return found;
}

describe('redirections', () => {
	const patterns = routePatterns();
	const targets = literalTargets();

	it('le relevé voit bien les redirections du code', () => {
		expect(targets.length).toBeGreaterThan(20);
		expect(targets.some((t) => t.target === '/auth/login')).toBe(true);
	});

	it('chaque cible écrite en dur correspond à une route existante', () => {
		const orphelines = targets
			.filter(({ target }) => !patterns.some((p) => p.test(target)))
			.map(({ file, target }) => `${target}  ←  ${file}`);
		expect(orphelines).toEqual([]);
	});

	it('la connexion vit bien à /auth/login', () => {
		expect(existsSync(join(ROUTES, '(public)', 'auth', 'login', '+page.svelte'))).toBe(true);
	});
});
