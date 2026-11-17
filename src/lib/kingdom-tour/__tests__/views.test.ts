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
	faqJsonLd,
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
		...(view.faq ?? []).flatMap((f) => (f.links ?? []).map((l) => l.href)),
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
		]),
		...(view.faq ?? []).flatMap((f) => [f.question, f.answer])
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

// Phase 7 du chantier demo-debug (David suit la recommandation, 2026-10-25) : un seul lien
// vers l'accueil de la vitrine, par page de public
describe('la vitrine', () => {
	it.each(VIEWS.map((v) => [v.id, v] as const))('%s : un lien, un seul, vers /demo', (_, view) => {
		expect(links(view).filter((h) => h.startsWith('/demo'))).toEqual(['/demo']);
	});

	it('les professeurs l’ont en 3ᵉ bouton d’appel', () => {
		expect(TEACHER_VIEW.calls.map((c) => c.href)).toEqual(['/automaths', '/atelier', '/demo']);
	});
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

	it('le suivi des parents : le carnet de liaison, sans compte, sans les notes', () => {
		expect(text(PARENT_VIEW)).toMatch(/carnet de liaison/);
		expect(text(PARENT_VIEW)).toMatch(/sans compte/);
		expect(text(PARENT_VIEW)).toMatch(/sans les notes/);
		expect(text(PARENT_VIEW)).toMatch(/cahier de textes/);
	});

	it('le tuteur hors d’Europe est dit aux parents (pas de « tout reste en Europe »)', () => {
		expect(text(PARENT_VIEW)).toMatch(/États-Unis \(Groq\)/);
		expect(text(PARENT_VIEW)).not.toMatch(/tout reste en Europe/i);
	});
});

// Revue de /parents point par point (chantier presentation-parents, décisions de David du
// 2026-11-15 au 2026-11-17)
describe('la page des parents', () => {
	it('titre et chapô : un monde fantaisiste, une phrase sur l’enfant', () => {
		expect(PARENT_VIEW.title).toBe('Des maths sérieuses, dans un monde fantaisiste');
		expect(PARENT_VIEW.lede).toBe(
			'Votre enfant s’entraîne, se trompe, comprend pourquoi, et recommence. Du CM1 à la Terminale, selon les programmes de l’Éducation nationale.'
		);
	});

	it('quatre blocs, dans l’ordre ; plus de démonstration « La forme compte »', () => {
		expect(PARENT_VIEW.blocks.map((b) => b.id)).toEqual(['qui', 'travail', 'suivi', 'prix']);
		expect(PARENT_VIEW.blocks.some((b) => b.demo)).toBe(false);
	});

	it('qui est derrière : le professeur, sans ses passions', () => {
		const qui = PARENT_VIEW.blocks.find((b) => b.id === 'qui');
		expect(qui?.text).toBe(
			'Chiphre est conçu par un professeur de mathématiques qui s’en sert chaque jour avec ses élèves. Agrégé de mathématiques, il est aussi ingénieur en informatique.'
		);
	});

	it('ce que votre enfant y fait : un paragraphe, plus de cartes', () => {
		const travail = PARENT_VIEW.blocks.find((b) => b.id === 'travail');
		expect(travail?.items).toBeUndefined();
		expect(travail?.text).toMatch(/^Quand il se trompe, la correction lui montre d’abord/);
		expect(travail?.text).toMatch(/Père Ubu, le tuteur, l’aide à trouver sans lui donner/);
	});

	it('les liens : le carnet perdu, l’inscription par le parent, nous écrire', () => {
		expect(links(PARENT_VIEW)).toEqual(
			expect.arrayContaining([
				'/carnet/lien-perdu',
				'/auth/register/parent',
				'mailto:contact@chiph.re'
			])
		);
	});

	it('l’inscription : avec le code de classe du professeur ; cours particuliers : nous écrire', () => {
		const prix = PARENT_VIEW.blocks.find((b) => b.id === 'prix');
		expect(prix?.title).toBe('L’inscrire, et combien ça coûte');
		expect(prix?.text).toMatch(/code de classe/);
		expect(prix?.text).toMatch(/Sans publicité\./);
		expect(prix?.text).toMatch(/Pour des cours particuliers, écrivez-nous\./);
	});

	it('la FAQ : quatre questions, dans l’ordre', () => {
		expect((PARENT_VIEW.faq ?? []).map((f) => f.question)).toEqual([
			'À qui mon enfant peut-il parler ?',
			'Le tuteur est une intelligence artificielle : que reçoit-elle ?',
			'Que deviennent ses données ?',
			'Les jeux ne vont-ils pas le distraire ?'
		]);
	});

	it('des questions toutes différentes, et des liens distincts dans chaque réponse (clés du rendu)', () => {
		const questions = (PARENT_VIEW.faq ?? []).map((f) => f.question);
		expect(new Set(questions).size).toBe(questions.length);
		for (const entry of PARENT_VIEW.faq ?? []) {
			const hrefs = (entry.links ?? []).map((l) => l.href);
			expect(new Set(hrefs).size, entry.question).toBe(hrefs.length);
		}
	});

	it('les gidouilles ne s’achètent pas avec de l’argent réel', () => {
		expect(text(PARENT_VIEW)).toMatch(/Les gidouilles ne s’achètent pas avec de l’argent réel\./);
	});

	it('les autres publics n’ont pas de FAQ', () => {
		expect(STUDENT_VIEW.faq).toBeUndefined();
		expect(TEACHER_VIEW.faq).toBeUndefined();
	});
});

describe('faqJsonLd', () => {
	it('une FAQPage schema.org, une question par entrée, la réponse en texte', () => {
		const faq = PARENT_VIEW.faq ?? [];
		const data = faqJsonLd(faq);
		expect(data['@context']).toBe('https://schema.org');
		expect(data['@type']).toBe('FAQPage');
		expect(data.mainEntity).toEqual(
			faq.map((f) => ({
				'@type': 'Question',
				name: f.question,
				acceptedAnswer: { '@type': 'Answer', text: f.answer }
			}))
		);
	});
});
