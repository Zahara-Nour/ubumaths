import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
	apparierLot,
	lireLot,
	titresDuLot,
	valeurArgument,
	type LigneModele
} from '../lib/lot-questions';

const FIXTURES = 'tests/fixtures/lot-questions';

function ligne(
	lot: ReturnType<typeof lireLot>,
	i: number,
	plus: Partial<LigneModele> = {}
): LigneModele {
	const m = lot[i].modele;
	return {
		id: `0000000${i}-0000-4000-8000-000000000000`,
		title: m.title,
		theme: m.theme,
		domain: m.domain,
		subdomain: m.subdomain ?? null,
		level: m.level,
		status: 'draft',
		...plus
	};
}

describe('lireLot', () => {
	it('lit les modèles du dossier dans l’ordre des fichiers', () => {
		const lot = lireLot(FIXTURES);
		expect(lot.map((m) => m.fichier)).toEqual([
			'01-construis-le-nombre.json',
			'02-rends-la-monnaie.json',
			'03-qui-a-le-plus.json',
			'04-lire-l-heure.json',
			'05-ajouter-1-ou-2.json',
			'06-quelle-forme.json',
			'07-addition-posee.json'
		]);
		expect(lot[0].modele.title).toBe('Construis le nombre');
	});

	it('refuse un dossier sans modèle', () => {
		const vide = mkdtempSync(join(tmpdir(), 'lot-vide-'));
		expect(() => lireLot(vide)).toThrow(/aucun fichier \.json/);
	});

	it('refuse un fichier qui porte encore le champ « points »', () => {
		const dossier = mkdtempSync(join(tmpdir(), 'lot-points-'));
		writeFileSync(join(dossier, '01.json'), JSON.stringify({ title: 'x', points: ['CP-001'] }));
		expect(() => lireLot(dossier)).toThrow(/champ « points » abandonné/);
	});
});

describe('apparierLot', () => {
	const lot = lireLot(FIXTURES).slice(0, 3);

	it('apparie chaque fichier à sa ligne, quel que soit l’ordre des lignes', () => {
		const r = apparierLot(lot, [ligne(lot, 2), ligne(lot, 0), ligne(lot, 1)], { statut: 'draft' });
		expect(r.ok).toBe(true);
		if (!r.ok) return;
		expect(r.paires.map((p) => [p.fichier, p.ligne.id.slice(0, 8)])).toEqual([
			['01-construis-le-nombre.json', '00000000'],
			['02-rends-la-monnaie.json', '00000001'],
			['03-qui-a-le-plus.json', '00000002']
		]);
	});

	it('ignore un modèle de même titre mais d’un autre niveau ou d’un autre domaine', () => {
		const autres = [
			ligne(lot, 0, { id: 'autre-niveau', level: 9, status: 'published' }),
			ligne(lot, 0, { id: 'autre-domaine', domain: 'Ailleurs', status: 'published' })
		];
		const r = apparierLot(lot, [...autres, ligne(lot, 0), ligne(lot, 1), ligne(lot, 2)], {
			statut: 'draft'
		});
		expect(r.ok).toBe(true);
	});

	it('tout ou rien : un modèle absent fait échouer le lot entier', () => {
		const r = apparierLot(lot, [ligne(lot, 0), ligne(lot, 2)], { statut: 'draft' });
		expect(r).toEqual({
			ok: false,
			erreurs: ['02-rends-la-monnaie.json : « Rends la monnaie » absent de la base']
		});
	});

	it('modèle absent mais même titre en base : le message dit ce qui diffère', () => {
		const r = apparierLot(lot, [
			ligne(lot, 0, { subdomain: 'Compter', level: 3 }),
			ligne(lot, 1),
			ligne(lot, 2)
		]);
		expect(r).toEqual({
			ok: false,
			erreurs: [
				'01-construis-le-nombre.json : « Construis le nombre » absent de la base ; même titre, sous-domaine « Compter » en base, « Dénombrer » dans le fichier, niveau « 3 » en base, « 1 » dans le fichier (00000000)'
			]
		});
	});

	it('refuse un modèle en double en base', () => {
		const r = apparierLot(lot, [
			ligne(lot, 0),
			ligne(lot, 0, { id: 'double' }),
			ligne(lot, 1),
			ligne(lot, 2)
		]);
		expect(r.ok).toBe(false);
		if (r.ok) return;
		expect(r.erreurs).toEqual([
			'01-construis-le-nombre.json : 2 modèles « Construis le nombre » en base'
		]);
	});

	it('refuse un modèle déjà publié quand un brouillon est attendu', () => {
		const r = apparierLot(
			lot,
			[ligne(lot, 0), ligne(lot, 1, { status: 'published' }), ligne(lot, 2)],
			{ statut: 'draft' }
		);
		expect(r.ok).toBe(false);
		if (r.ok) return;
		expect(r.erreurs).toEqual([
			'02-rends-la-monnaie.json : « Rends la monnaie » (00000001) est « published », attendu « draft »'
		]);
	});

	it('sans statut attendu, accepte tout statut (page à cocher d’un lot déjà publié)', () => {
		const r = apparierLot(lot, [
			ligne(lot, 0, { status: 'published' }),
			ligne(lot, 1),
			ligne(lot, 2)
		]);
		expect(r.ok).toBe(true);
	});

	it('niveau hors de la clé : un ancien lot renuméroté en base est retrouvé', () => {
		const renumerote = [ligne(lot, 0, { level: 4 }), ligne(lot, 1), ligne(lot, 2)];
		expect(apparierLot(lot, renumerote).ok).toBe(false);
		expect(apparierLot(lot, renumerote, { niveau: false }).ok).toBe(true);
	});

	it('niveau hors de la clé : un homonyme d’un autre niveau est départagé par le niveau', () => {
		// « Comparer deux nombres décimaux » : CM1 (niveau 2, publié) et 6e (niveau 3, brouillon)
		const homonymes = [
			ligne(lot, 0, { id: 'autre-niveau', level: 9, status: 'published' }),
			ligne(lot, 0),
			ligne(lot, 1),
			ligne(lot, 2)
		];
		const r = apparierLot(lot, homonymes, { niveau: false });
		expect(r.ok).toBe(true);
		if (!r.ok) return;
		expect(r.paires[0].ligne.id).toBe('00000000-0000-4000-8000-000000000000');
		// Le départage est rendu : un ancien lot renuméroté prendrait l'homonyme sans le dire
		expect(r.paires[0].ecartes?.map((l) => l.id)).toEqual(['autre-niveau']);
		expect(r.paires[1].ecartes).toBeUndefined();
	});

	it('niveau hors de la clé : deux homonymes dont aucun n’a le niveau du fichier restent ambigus', () => {
		const r = apparierLot(
			lot,
			[
				ligne(lot, 0, { id: 'a', level: 8 }),
				ligne(lot, 0, { id: 'b', level: 9 }),
				ligne(lot, 1),
				ligne(lot, 2)
			],
			{ niveau: false }
		);
		expect(r.ok).toBe(false);
		if (r.ok) return;
		expect(r.erreurs).toEqual([
			'01-construis-le-nombre.json : 2 modèles « Construis le nombre » en base'
		]);
	});

	it('un modèle sans sous-domaine se compare à une ligne au sous-domaine null', () => {
		const sans = [{ ...lot[0], modele: { ...lot[0].modele, subdomain: undefined } }];
		expect(apparierLot(sans, [ligne(sans, 0)]).ok).toBe(true);
		expect(apparierLot(sans, [ligne(sans, 0, { subdomain: 'Dénombrer' })]).ok).toBe(false);
	});

	it('deux fichiers de même clé ne prennent pas la même ligne', () => {
		const double = [lot[0], { ...lot[0], fichier: '09-copie.json' }];
		const r = apparierLot(double, [ligne(lot, 0)]);
		expect(r).toEqual({
			ok: false,
			erreurs: ['09-copie.json : même modèle en base que 01-construis-le-nombre.json (00000000)']
		});
	});

	it('titresDuLot donne chaque titre une fois', () => {
		const doublon = [...lot, lot[0]];
		expect(titresDuLot(doublon)).toEqual([
			'Construis le nombre',
			'Rends la monnaie',
			"Qui a le plus d'argent ?"
		]);
	});
});

describe('valeurArgument', () => {
	const argv = ['node', 'script', '--dir', 'scripts/questions/cp-c', '--publier'];

	it('rend la valeur qui suit l’option', () => {
		expect(valeurArgument(argv, '--dir')).toBe('scripts/questions/cp-c');
	});

	it('option absente, sans valeur, ou suivie d’une autre option : rien', () => {
		expect(valeurArgument(argv, '--titre')).toBeUndefined();
		expect(valeurArgument(argv, '--publier')).toBeUndefined();
		expect(valeurArgument(['--dir', '--publier'], '--dir')).toBeUndefined();
	});
});
