/**
 * Chaque page porte un titre de niveau 1.
 *
 * Le logo de l'en-tête et les noms d'espace ou de rubrique ne sont plus des <h1>
 * (#847, #854) : chaque page doit fournir le sien — dans son fichier, dans un
 * composant qu'elle importe (suivi sur quelques niveaux) ou dans un layout parent.
 *
 * Lecture du code, pas du rendu : un titre produit par un contenu dynamique n'est
 * pas vu. Les pages qui n'ont pas besoin de titre (redirections pures…) sont
 * listées dans SANS_TITRE avec leur raison.
 */
import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

const ROOT = process.cwd();
const ROUTES = join(ROOT, 'src', 'routes');
const LIB = join(ROOT, 'src', 'lib');
const PROFONDEUR = 3;

/** Pages sans titre propre, assumées — chemin relatif à src/routes → raison */
const SANS_TITRE: Record<string, string> = {
	'(protected)/dashboard/student/worksheets/exercice/[id]/+page.svelte':
		'page de résolution : le load redirige toujours, jamais rendue',
	'(protected)/dashboard/student/worksheets/fiche/[id]/+page.svelte':
		'page de résolution : le load redirige toujours, jamais rendue',
	'(protected)/dashboard/teacher/contenu/worksheets/exercice/[id]/+page.svelte':
		'page de résolution : le load redirige toujours, jamais rendue'
};

const H1 = /<h1[\s>]|level=\{1\}/;

function pages(dir: string): string[] {
	return readdirSync(dir).flatMap((name) => {
		const path = join(dir, name);
		if (statSync(path).isDirectory()) return name === '__tests__' ? [] : pages(path);
		return name === '+page.svelte' ? [path] : [];
	});
}

/** Composants .svelte importés par un fichier ($lib/… ou chemin relatif) */
function imports(file: string): string[] {
	const src = readFileSync(file, 'utf8');
	return [...src.matchAll(/from\s+['"]([^'"]+\.svelte)['"]/g)]
		.map(([, spec]) =>
			spec.startsWith('$lib/')
				? join(LIB, spec.slice(5))
				: spec.startsWith('.')
					? resolve(dirname(file), spec)
					: ''
		)
		.filter((p) => p && existsSync(p));
}

function hasH1(file: string, depth: number, seen = new Set<string>()): boolean {
	if (seen.has(file)) return false;
	seen.add(file);
	if (H1.test(readFileSync(file, 'utf8'))) return true;
	return depth > 0 && imports(file).some((f) => hasH1(f, depth - 1, seen));
}

/** Un layout parent (jusqu'à src/routes) fournit-il le h1 ? */
function layoutHasH1(page: string): boolean {
	for (let dir = dirname(page); dir.startsWith(ROUTES); dir = dirname(dir)) {
		const layout = join(dir, '+layout.svelte');
		if (existsSync(layout) && H1.test(readFileSync(layout, 'utf8'))) return true;
		if (dir === ROUTES) break;
	}
	return false;
}

describe('titre de niveau 1', () => {
	const all = pages(ROUTES);

	it('le relevé voit bien les pages', () => {
		expect(all.length).toBeGreaterThan(200);
	});

	it('chaque page porte un <h1> (page, composant importé ou layout)', () => {
		const sans = all
			.map((p) => relative(ROUTES, p))
			.filter((rel) => !(rel in SANS_TITRE))
			.filter((rel) => {
				const page = join(ROUTES, rel);
				return !hasH1(page, PROFONDEUR) && !layoutHasH1(page);
			});
		expect(sans).toEqual([]);
	});

	it('chaque exception existe encore', () => {
		const disparues = Object.keys(SANS_TITRE).filter((rel) => !existsSync(join(ROUTES, rel)));
		expect(disparues).toEqual([]);
	});
});
