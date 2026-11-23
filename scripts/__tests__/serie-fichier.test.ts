import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
	controlerModeles,
	dureeTotale,
	ecrireIdSerie,
	lireSerie,
	versLigneSerie,
	type LigneModeleSerie,
	type SerieFichier
} from '../lib/serie-fichier';

const M1 = '00000001-0000-4000-8000-000000000000';
const M2 = '00000002-0000-4000-8000-000000000000';
const SERIE_ID = '0000000a-0000-4000-8000-000000000000';

function fichier(contenu: unknown): string {
	const chemin = join(mkdtempSync(join(tmpdir(), 'serie-')), 'serie.json');
	writeFileSync(chemin, typeof contenu === 'string' ? contenu : JSON.stringify(contenu));
	return chemin;
}

const SERIE = {
	title: 'Médiatrice',
	grade: '6',
	description: 'Série de démonstration',
	items: [
		{ modele: 'Définition', templateId: M1, quantity: 2, delay: 60 },
		{ templateId: M2, quantity: 1, delay: 0 }
	]
};

function serie(plus: Partial<SerieFichier> = {}): SerieFichier {
	return lireSerie(fichier({ ...SERIE, ...plus }));
}

function ligne(id: string, plus: Partial<LigneModeleSerie> = {}): LigneModeleSerie {
	return { id, title: `Modèle ${id.slice(7, 8)}`, status: 'published', grades: ['6'], ...plus };
}

describe('lireSerie', () => {
	it('lit une série valide, titre de relecture compris', () => {
		const s = serie();
		expect(s.items).toHaveLength(2);
		expect(s.items[0].modele).toBe('Définition');
		expect(s.id).toBeUndefined();
	});

	it('rend la ligne de base sans le titre de relecture', () => {
		expect(versLigneSerie(serie().items[0])).toEqual({ templateId: M1, quantity: 2, delay: 60 });
	});

	it('refuse un JSON abîmé', () => {
		expect(() => lireSerie(fichier('{ pas du json'))).toThrow(/illisible/);
	});

	it('refuse une série sans modèle', () => {
		expect(() => lireSerie(fichier({ ...SERIE, items: [] }))).toThrow(/Au moins un modèle/);
	});

	it('refuse un niveau inconnu, un identifiant de modèle invalide, une durée trop longue', () => {
		expect(() => lireSerie(fichier({ ...SERIE, grade: '42' }))).toThrow(/grade/);
		expect(() =>
			lireSerie(fichier({ ...SERIE, items: [{ templateId: 'abc', quantity: 1, delay: 30 }] }))
		).toThrow(/templateId/);
		expect(() =>
			lireSerie(fichier({ ...SERIE, items: [{ templateId: M1, quantity: 1, delay: 601 }] }))
		).toThrow(/delay/);
	});

	it('refuse un modèle présent deux fois', () => {
		const items = [
			{ templateId: M1, quantity: 1, delay: 30 },
			{ templateId: M1, quantity: 2, delay: 30 }
		];
		expect(() => lireSerie(fichier({ ...SERIE, items }))).toThrow(/deux fois/);
	});

	it('refuse une série de plus de 500 questions', () => {
		const items = Array.from({ length: 6 }, (_, i) => ({
			templateId: `0000000${i}-0000-4000-8000-00000000000${i}`,
			quantity: 99,
			delay: 30
		}));
		expect(() => lireSerie(fichier({ ...SERIE, items }))).toThrow(/trop longue/);
	});

	it('refuse une clé inconnue (faute de frappe)', () => {
		expect(() => lireSerie(fichier({ ...SERIE, titre: 'x' }))).toThrow(/refusé/);
	});
});

describe('controlerModeles', () => {
	it('ne refuse rien quand tout est publié et du bon niveau', () => {
		expect(controlerModeles(serie(), [ligne(M1), ligne(M2, { grades: ['5', '6'] })])).toEqual([]);
	});

	it('refuse un modèle introuvable, en citant son titre de relecture', () => {
		const refus = controlerModeles(serie(), [ligne(M2)]);
		expect(refus).toEqual([`« Définition » (${M1}) : modèle introuvable en base`]);
	});

	it('refuse un brouillon et un modèle d’un autre niveau', () => {
		const refus = controlerModeles(serie(), [
			ligne(M1, { status: 'draft' }),
			ligne(M2, { grades: ['5'] })
		]);
		expect(refus).toHaveLength(2);
		expect(refus[0]).toMatch(/pas publié \(draft\)/);
		expect(refus[1]).toMatch(/niveau 5, pas 6/);
	});

	it('refuse un modèle sans niveau', () => {
		expect(controlerModeles(serie(), [ligne(M1), ligne(M2, { grades: null })])[0]).toMatch(
			/niveau aucun/
		);
	});
});

describe('dureeTotale', () => {
	it('prend la durée de la ligne, ou celle du modèle quand elle vaut 0', () => {
		expect(dureeTotale(serie(), new Map([[M2, 240]]))).toBe(2 * 60 + 240);
	});
});

describe('ecrireIdSerie', () => {
	it("écrit l'id en tête sans toucher au reste", () => {
		const chemin = fichier(SERIE);
		ecrireIdSerie(chemin, SERIE_ID);
		const relu = JSON.parse(readFileSync(chemin, 'utf8')) as Record<string, unknown>;
		expect(Object.keys(relu)[0]).toBe('id');
		expect(relu).toEqual({ id: SERIE_ID, ...SERIE });
		expect(lireSerie(chemin).id).toBe(SERIE_ID);
	});
});

describe('lireSerie : lignes strictes', () => {
	it('refuse une clé inconnue dans une ligne', () => {
		const items = [{ templateId: M1, quantity: 1, delay: 30, quantite: 3 }];
		expect(() => lireSerie(fichier({ ...SERIE, items }))).toThrow(/refusé/);
	});
});
