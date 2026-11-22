/**
 * Images du contenu copiées par `pnpm db:seed-riche` (journal seed-complet § 13).
 * Sans réseau ni base : les règles seules.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
	COMPARTIMENTS_COPIES,
	COMPARTIMENTS_JAMAIS,
	cheminLocal,
	fichiersATelecharger,
	reecrireAdresses
} from '../db-seed-riche/images';

const PROD = 'https://projet-fictif.supabase.co';
const LOCAL = 'http://127.0.0.1:54321';
const img = (base: string, compartiment: string, chemin: string) =>
	`${base}/storage/v1/object/public/${compartiment}/${chemin}`;

/** Compartiments créés par le dépôt : `supabase/seed.sql` et les migrations. */
function compartimentsDuDepot(): string[] {
	const sources = [
		readFileSync('supabase/seed.sql', 'utf8'),
		...readdirSync('supabase/migrations')
			.filter((f) => f.endsWith('.sql'))
			.map((f) => readFileSync(join('supabase/migrations', f), 'utf8'))
	];
	const ids = new Set<string>();
	for (const texte of sources) {
		for (const bloc of texte.matchAll(/insert into "?storage"?\."?buckets"?[^;]*;/gi)) {
			// Première valeur de chaque ligne de VALUES : l'identifiant du compartiment
			for (const m of bloc[0].matchAll(/\(\s*'([a-z0-9-]+)'/g)) ids.add(m[1]);
		}
	}
	return [...ids].sort();
}

describe('classement des compartiments', () => {
	it('chaque compartiment du dépôt est copié ou jamais lu, et un seul des deux', () => {
		const depot = compartimentsDuDepot();
		expect(depot.length).toBeGreaterThanOrEqual(8);
		const classes = [...COMPARTIMENTS_COPIES, ...COMPARTIMENTS_JAMAIS];
		expect(new Set(classes).size).toBe(classes.length);
		expect(depot.filter((c) => !classes.includes(c))).toEqual([]);
	});

	it('aucun fichier d’élève ni capture n’est copié', () => {
		for (const c of ['message-attachments', 'chat-attachments', 'bug-report-screenshots']) {
			expect(COMPARTIMENTS_COPIES).not.toContain(c);
		}
	});
});

describe('fichiersATelecharger', () => {
	const prod = [
		{ chemin: 'a.png', taille: 10 },
		{ chemin: 'dossier/b.webp', taille: 20 },
		{ chemin: 'c.png', taille: 30 }
	];

	it('base locale vide : tout', () => {
		expect(fichiersATelecharger(prod, [])).toEqual(prod);
	});

	it('relance : rien de ce qui est déjà là avec la même taille', () => {
		expect(fichiersATelecharger(prod, prod)).toEqual([]);
	});

	it('taille inconnue d’un côté ou de l’autre : téléchargé', () => {
		expect(
			fichiersATelecharger([{ chemin: 'a.png', taille: -1 }], [{ chemin: 'a.png', taille: -1 }])
		).toHaveLength(1);
		expect(
			fichiersATelecharger([{ chemin: 'a.png', taille: 10 }], [{ chemin: 'a.png', taille: -1 }])
		).toHaveLength(1);
	});

	it('taille différente : retéléchargé ; absent : téléchargé', () => {
		const local = [
			{ chemin: 'a.png', taille: 10 },
			{ chemin: 'dossier/b.webp', taille: 19 }
		];
		expect(fichiersATelecharger(prod, local).map((f) => f.chemin)).toEqual([
			'dossier/b.webp',
			'c.png'
		]);
	});
});

describe('reecrireAdresses', () => {
	it('remplace l’adresse de la prod dans un texte (markdown d’un exercice)', () => {
		const texte = `Voir ![figure](${img(PROD, 'exercise-images', 'x/fig.png')}) puis ![b](${img(PROD, 'exercise-images', 'y.png')}).`;
		expect(reecrireAdresses(texte, PROD, LOCAL)).toBe(
			`Voir ![figure](${img(LOCAL, 'exercise-images', 'x/fig.png')}) puis ![b](${img(LOCAL, 'exercise-images', 'y.png')}).`
		);
	});

	it('descend dans les objets et tableaux (jsonb), sans modifier l’original', () => {
		const ligne = {
			id: 'e1',
			contenu: { blocs: [{ src: img(PROD, 'vip-card-images', 'carte@1x.webp') }] },
			n: 3,
			vide: null
		};
		const copie = reecrireAdresses(ligne, PROD, LOCAL);
		expect(copie).toEqual({
			id: 'e1',
			contenu: { blocs: [{ src: img(LOCAL, 'vip-card-images', 'carte@1x.webp') }] },
			n: 3,
			vide: null
		});
		expect(ligne.contenu.blocs[0].src).toBe(img(PROD, 'vip-card-images', 'carte@1x.webp'));
	});

	it('laisse un compartiment non copié et un autre hôte tels quels', () => {
		const piece = img(PROD, 'message-attachments', 'p.pdf');
		const ailleurs = img('https://autre.example.test', 'exercise-images', 'a.png');
		expect(reecrireAdresses(piece, PROD, LOCAL)).toBe(piece);
		expect(reecrireAdresses(ailleurs, PROD, LOCAL)).toBe(ailleurs);
	});

	it('accepte une adresse source terminée par une barre', () => {
		expect(reecrireAdresses(img(PROD, 'question-images', 'q.png'), `${PROD}/`, LOCAL)).toBe(
			img(LOCAL, 'question-images', 'q.png')
		);
	});

	it('laisse les dates et nombres intacts', () => {
		const d = new Date('2026-01-01T00:00:00Z');
		expect(reecrireAdresses({ d, n: 1 }, PROD, LOCAL)).toEqual({ d, n: 1 });
	});
});

describe('cheminLocal', () => {
	const PROF_PROD = 'aaaaaaaa-0000-4000-8000-000000000001';
	const ELEVE_PROD = 'aaaaaaaa-0000-4000-8000-000000000002';
	const PROF_LOCAL = '11111111-1111-4111-8111-111111111111';
	const correspondance = new Map([[PROF_PROD, PROF_LOCAL]]);
	const interdits = { ids: [PROF_PROD, ELEVE_PROD], noms: [] };

	it('dossier du prof de la prod → dossier du prof local', () => {
		expect(cheminLocal(`${PROF_PROD}/fig-1.png`, correspondance, interdits)).toBe(
			`${PROF_LOCAL}/fig-1.png`
		);
	});

	it('chemin sans identifiant : inchangé', () => {
		expect(cheminLocal('super-bonus@0.5x.webp', correspondance, interdits)).toBe(
			'super-bonus@0.5x.webp'
		);
	});

	it('identifiant inconnu des profils (compte supprimé) : jamais copié', () => {
		expect(
			cheminLocal('bbbbbbbb-0000-4000-8000-000000000009/x.png', correspondance, interdits)
		).toBeNull();
	});

	it('un « @ » de nom de fichier n’est pas une adresse : copié', () => {
		expect(cheminLocal('logo@hd.webp', correspondance, interdits)).toBe('logo@hd.webp');
	});

	it('dossier d’un autre utilisateur de la prod : jamais copié', () => {
		expect(cheminLocal(`${ELEVE_PROD}/photo.png`, correspondance, interdits)).toBeNull();
	});
});
