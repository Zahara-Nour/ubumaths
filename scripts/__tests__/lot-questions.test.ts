import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
	apparierLot,
	lireLot,
	idsDuLot,
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

	it('refuse un fichier qui porte encore thème, domaine ou sous-domaine', () => {
		const dossier = mkdtempSync(join(tmpdir(), 'lot-theme-'));
		writeFileSync(join(dossier, '01.json'), JSON.stringify({ title: 'x', theme: 'Entiers' }));
		expect(() => lireLot(dossier)).toThrow(/champ « theme » abandonné/);
	});
});

describe('apparierLot', () => {
	const lot = lireLot(FIXTURES).slice(0, 3);
	const ID0 = '00000000-0000-4000-8000-000000000000';

	it('apparie chaque fichier à la ligne de son id, quel que soit l’ordre des lignes', () => {
		const r = apparierLot(lot, [ligne(lot, 2), ligne(lot, 0), ligne(lot, 1)], { statut: 'draft' });
		expect(r.ok).toBe(true);
		if (!r.ok) return;
		expect(r.paires.map((p) => [p.fichier, p.ligne.id.slice(0, 8)])).toEqual([
			['01-construis-le-nombre.json', '00000000'],
			['02-rends-la-monnaie.json', '00000001'],
			['03-qui-a-le-plus.json', '00000002']
		]);
	});

	it('seul l’id désigne la ligne : un homonyme de même titre et même niveau est ignoré', () => {
		const homonyme = ligne(lot, 0, { id: 'homonyme' });
		const r = apparierLot(lot, [homonyme, ligne(lot, 0), ligne(lot, 1), ligne(lot, 2)]);
		expect(r.ok && r.paires[0].ligne.id).toBe(ID0);
	});

	it('refuse un fichier sans id (modèle pas encore créé)', () => {
		const sansId = [{ ...lot[0], modele: { ...lot[0].modele, id: undefined } }];
		expect(apparierLot(sansId, [ligne(lot, 0)])).toEqual({
			ok: false,
			erreurs: [
				'01-construis-le-nombre.json : « Construis le nombre » sans id — le créer d’abord (create-questions --publier écrit son id)'
			]
		});
	});

	it('tout ou rien : un id absent de la base fait échouer le lot entier', () => {
		const r = apparierLot(lot, [ligne(lot, 0), ligne(lot, 2)], { statut: 'draft' });
		expect(r).toEqual({
			ok: false,
			erreurs: ['02-rends-la-monnaie.json : id 00000001 absent de la base']
		});
	});

	it('titre ou niveau qui ne concordent plus : le message dit ce qui diffère', () => {
		const r = apparierLot(lot, [
			ligne(lot, 0, { title: 'Autre titre', level: 3 }),
			ligne(lot, 1),
			ligne(lot, 2)
		]);
		expect(r).toEqual({
			ok: false,
			erreurs: [
				'01-construis-le-nombre.json : titre « Autre titre » en base, « Construis le nombre » dans le fichier, niveau « 3 » en base, « 1 » dans le fichier (00000000)'
			]
		});
	});

	it('niveau hors de la clé : un ancien lot renuméroté en base est retrouvé', () => {
		const renumerote = [ligne(lot, 0, { level: 4 }), ligne(lot, 1), ligne(lot, 2)];
		expect(apparierLot(lot, renumerote).ok).toBe(false);
		expect(apparierLot(lot, renumerote, { niveau: false }).ok).toBe(true);
	});

	it('refuse un modèle déjà publié quand un brouillon est attendu', () => {
		const r = apparierLot(
			lot,
			[ligne(lot, 0), ligne(lot, 1, { status: 'published' }), ligne(lot, 2)],
			{ statut: 'draft' }
		);
		expect(r).toEqual({
			ok: false,
			erreurs: [
				'02-rends-la-monnaie.json : « Rends la monnaie » (00000001) est « published », attendu « draft »'
			]
		});
	});

	it('sans statut attendu, accepte tout statut (page à cocher d’un lot déjà publié)', () => {
		const r = apparierLot(lot, [
			ligne(lot, 0, { status: 'published' }),
			ligne(lot, 1),
			ligne(lot, 2)
		]);
		expect(r.ok).toBe(true);
	});

	it('deux fichiers du même id ne prennent pas la même ligne', () => {
		const double = [lot[0], { ...lot[0], fichier: '09-copie.json' }];
		expect(apparierLot(double, [ligne(lot, 0)])).toEqual({
			ok: false,
			erreurs: ['09-copie.json : même modèle en base que 01-construis-le-nombre.json (00000000)']
		});
	});

	it('idsDuLot donne chaque id une fois, sans les fichiers qui n’en portent pas', () => {
		const sansId = { ...lot[1], modele: { ...lot[1].modele, id: undefined } };
		expect(idsDuLot([...lot, lot[0], sansId])).toEqual([
			ID0,
			'00000001-0000-4000-8000-000000000000',
			'00000002-0000-4000-8000-000000000000'
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
