/**
 * `pnpm outils` : réserver les lots d'outils manquants et ouvrir leurs sessions
 * ============================================================================
 *
 * Gardé ici :
 * - seules les lignes du tableau dont la 1re cellule est un nom de lot sont lues ;
 * - au plus MAX_EN_COURS lots en cours, un seul lot mathAST ;
 * - un lot nommé pris, en cours, fait ou qui attend est refusé, jamais remplacé ;
 * - sans nom : les premiers lots libres dans l'ordre du fichier ;
 * - la réservation remplit « Pris par » et la ligne `status:`, rien d'autre ;
 * - la commande de session ne laisse rien interpréter au shell.
 */

import { describe, expect, it } from 'vitest';
import {
	MAX_EN_COURS,
	OutilsError,
	choisir,
	commandeDeSession,
	lireLots,
	messageDeCommit,
	parseArgs,
	reserver
} from '../outils/logique';

function fichier(lignes: string[]): string {
	return [
		'---',
		'title: Lots',
		'status: lots écrits le 2026-11-28 ; aucun en cours',
		'---',
		'',
		'| Lot | Outils | Module | Pris par | Notes |',
		'| --- | --- | --- | --- | --- |',
		...lignes
	].join('\n');
}

const LIBRES = fichier([
	'| `a` | 1 | figure |  |  |',
	'| `b` | 2 | mathAST (équivalence) |  |  |',
	'| `c` | 3 | mathAST |  |  |',
	'| `d` | 4 | bloc |  | attend la fin de x |',
	'| `e` | 5 | bloc |  |  |',
	'| `f` | 6 | bloc |  |  |',
	'| `g` | 7 | bloc |  |  |',
	'| `h` | 8 | bloc |  |  |'
]);

describe('lireLots', () => {
	it('lit les lots, leur état, mathAST et « attend »', () => {
		const lots = lireLots(
			fichier([
				'| `a` | 1 | figure |  |  |',
				'| `b` | 2 | mathAST | outil-b (2026-11-28) |  |',
				'| `c` | 3 | bloc | fait (#12, 2026-11-29) | attend rien |'
			])
		);
		expect(lots.map((l) => [l.nom, l.etat, l.mathast])).toEqual([
			['a', 'libre', false],
			['b', 'en-cours', true],
			['c', 'fait', false]
		]);
		expect(lots[2].attend).toBe(true);
	});

	it("ignore l'en-tête et le séparateur", () => {
		expect(lireLots(LIBRES)).toHaveLength(8);
	});

	it('un fichier sans lot est une erreur', () => {
		expect(() => lireLots('rien')).toThrow(OutilsError);
	});
});

describe('choisir', () => {
	it(`sans nom : les premiers libres, ${MAX_EN_COURS} au plus, un seul mathAST, sans « attend »`, () => {
		const { pris, refus } = choisir(lireLots(LIBRES), []);
		expect(pris.map((l) => l.nom)).toEqual(['a', 'b', 'e', 'f', 'g']);
		expect(refus.map((r) => r.nom)).toEqual(['c', 'd']);
	});

	it('compte les lots déjà en cours', () => {
		const lots = lireLots(
			fichier([
				'| `a` | 1 | x | outil-a (2026-11-28) |  |',
				'| `b` | 2 | x | outil-b (2026-11-28) |  |',
				'| `c` | 3 | x | outil-c (2026-11-28) |  |',
				'| `d` | 4 | x | outil-d (2026-11-28) |  |',
				'| `e` | 5 | x |  |  |',
				'| `f` | 6 | x |  |  |'
			])
		);
		expect(choisir(lots, []).pris.map((l) => l.nom)).toEqual(['e']);
	});

	it('un mathAST en cours bloque les autres', () => {
		const lots = lireLots(
			fichier(['| `a` | 1 | mathAST | outil-a (2026-11-28) |  |', '| `b` | 2 | mathAST |  |  |'])
		);
		expect(choisir(lots, ['b']).refus).toEqual([
			{ nom: 'b', raison: 'un autre lot mathAST est en cours' }
		]);
	});

	it('un lot nommé refusé ne se remplace pas', () => {
		const { pris, refus } = choisir(lireLots(LIBRES), ['d', 'zz', 'e']);
		expect(pris.map((l) => l.nom)).toEqual(['e']);
		expect(refus.map((r) => r.nom)).toEqual(['d', 'zz']);
	});
});

describe('reserver', () => {
	it('remplit « Pris par » et la ligne status:', () => {
		const lots = lireLots(LIBRES);
		const apres = reserver(LIBRES, [lots[0], lots[4]], '2026-11-30');
		const relus = lireLots(apres);
		expect(relus[0].prisPar).toBe('outil-a (2026-11-30)');
		expect(relus[4].prisPar).toBe('outil-e (2026-11-30)');
		expect(relus.filter((l) => l.etat === 'en-cours')).toHaveLength(2);
		expect(apres).toContain('status: lots écrits le 2026-11-28 ; en cours : a, e');
		expect(relus[3].notes).toBe('attend la fin de x');
	});

	it('message de commit', () => {
		const lots = lireLots(LIBRES);
		expect(messageDeCommit([lots[0]])).toBe('docs(wip): outils-lots, lot a pris');
		expect(messageDeCommit([lots[0], lots[1]])).toBe('docs(wip): outils-lots, lots a, b pris');
	});
});

describe('parseArgs', () => {
	it('liste, lancer, reserver', () => {
		expect(parseArgs([])).toEqual({ action: 'liste' });
		expect(parseArgs(['lancer', 'a', 'b', '--essai'])).toEqual({
			action: 'lancer',
			lots: ['a', 'b'],
			essai: true
		});
		expect(parseArgs(['reserver', 'a'])).toEqual({ action: 'reserver', lot: 'a', essai: false });
	});

	it('refuse le reste', () => {
		expect(() => parseArgs(['lancer', 'A;rm'])).toThrow(/invalide/);
		expect(() => parseArgs(['reserver'])).toThrow(/un seul lot/);
		expect(() => parseArgs(['lancer', '--force'])).toThrow(/inconnue/);
		expect(() => parseArgs(['partir'])).toThrow(/inconnu/);
		expect(() => parseArgs(['lancer', 'a', 'a'])).toThrow(/deux fois/);
	});
});

describe('commandeDeSession', () => {
	it('installe dans le worktree, lance Claude depuis le dépôt principal, chemins cités', () => {
		expect(commandeDeSession('equerre-uni', "/d/ubu's", '/d/wt')).toBe(
			"cd '/d/wt' && pnpm install --prefer-offline && cd '/d/ubu'\\''s' && " +
				"exec claude '/prendre-outil equerre-uni' -n 'outil-equerre-uni' --remote-control 'outil-equerre-uni'"
		);
	});
});
