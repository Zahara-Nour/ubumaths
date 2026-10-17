/**
 * Les trois vues de présentation : des liens qui mènent quelque part, le bon registre
 * (élèves tutoyés, parents et professeurs vouvoyés), et sur l'argent, seulement ce qui
 * restera vrai quand le site sera payant hors des classes de son créateur (décision de
 * David, 2026-10-11).
 */
import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { AUDIENCES } from '../audiences';
import {
	AUDIENCE_VIEWS,
	PARENT_VIEW,
	STUDENT_VIEW,
	TEACHER_VIEW,
	type AudienceView
} from '../views';

// Constantes

const routes = join(process.cwd(), 'src', 'routes');
const VIEWS = Object.values(AUDIENCE_VIEWS);

// Functions

function publicPageExists(href: string): boolean {
	const path = href.split(/[?#]/)[0];
	const segments = path === '/' ? [] : path.slice(1).split('/');
	return existsSync(join(routes, '(public)', ...segments, '+page.svelte'));
}

/** Tous les liens d'une vue (cartes, liens des blocs, portes d'entrée) */
function links(view: AudienceView): string[] {
	return [
		...view.blocks.flatMap((b) => (b.items ?? []).flatMap((i) => (i.href ? [i.href] : []))),
		...view.blocks.flatMap((b) => (b.links ?? []).map((l) => l.href)),
		...view.calls.map((c) => c.href)
	];
}

/** Tout le texte d'une vue */
function text(view: AudienceView): string {
	return [
		view.kicker,
		view.title,
		view.lede,
		view.seoDescription,
		...view.blocks.flatMap((b) => [
			b.title,
			b.text ?? '',
			...(b.facts ?? []),
			...(b.items ?? []).flatMap((i) => [i.title, i.text])
		])
	].join('\n');
}

describe('les trois vues', () => {
	it('une vue par public, chacune à l’adresse de la roue, et la page existe', () => {
		for (const audience of AUDIENCES) {
			expect(AUDIENCE_VIEWS[audience.id].id).toBe(audience.id);
			expect(publicPageExists(audience.href), audience.href).toBe(true);
		}
	});

	it.each(VIEWS.map((v) => [v.id, v] as const))(
		'%s : chaque lien mène à une page publique qui existe (ou à une adresse e-mail)',
		(_, view) => {
			const broken = links(view).filter((h) => !h.startsWith('mailto:') && !publicPageExists(h));
			expect(broken).toEqual([]);
		}
	);

	it.each(VIEWS.map((v) => [v.id, v] as const))(
		'%s : annonce le niveau, du CM1 à la Terminale',
		(_, view) => {
			expect(text(view)).toMatch(/CM1 à la Terminale/);
		}
	);
});

describe('le registre', () => {
	it('les élèves sont tutoyés', () => {
		expect(text(STUDENT_VIEW)).toMatch(/\b(tu|ton|ta|tes|te)\b/i);
		expect(text(STUDENT_VIEW)).not.toMatch(/\bvous\b/i);
	});

	it.each([
		['parents', PARENT_VIEW],
		['professeurs', TEACHER_VIEW]
	])('les %s sont vouvoyés', (_, view) => {
		expect(text(view)).not.toMatch(/\b(tu|ton|ta|tes|toi)\b/i);
	});
});

describe('l’argent : ce qui restera vrai', () => {
	it.each(VIEWS.map((v) => [v.id, v] as const))(
		'%s : jamais « gratuit » sans dire pour qui, ni « pour toujours »',
		(_, view) => {
			const sentences = text(view).split(/(?<=[.!?])\s+|\n/);
			const bare = sentences.filter(
				(s) => /gratuit/i.test(s) && !/élèves des classes de son créateur/.test(s)
			);
			expect(bare).toEqual([]);
			expect(text(view)).not.toMatch(
				/pour toujours|toujours gratuit|tout est (accessible|gratuit)/i
			);
		}
	);

	it('les parents lisent que tout est gratuit pour les élèves des classes de son créateur', () => {
		expect(text(PARENT_VIEW)).toMatch(
			/Pour les élèves des classes de son créateur, Chiphre est entièrement gratuit/
		);
	});

	it('le suivi des parents est dit franchement : pas de compte parent', () => {
		expect(text(PARENT_VIEW)).toMatch(/pas de compte parent/i);
		expect(text(PARENT_VIEW)).toMatch(/cahier de textes/);
	});

	it('le tuteur hors d’Europe est dit aux parents (pas de « tout reste en Europe »)', () => {
		expect(text(PARENT_VIEW)).toMatch(/États-Unis/);
		expect(text(PARENT_VIEW)).not.toMatch(/tout reste en Europe/i);
	});
});
