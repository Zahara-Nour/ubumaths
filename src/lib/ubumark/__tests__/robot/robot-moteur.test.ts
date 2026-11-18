/**
 * Moteur du robot (chantier `suite-fleches`) : lecture et écriture d'un code, déplacement sur
 * le quadrillage, code le plus court.
 */

import { describe, it, expect } from 'vitest';
import {
	ecrireCode,
	lireCode,
	plusCourtCode,
	simuler,
	virages
} from '#lib/ubumark/utils/robot-moteur.ts';
import type { RobotScene } from '#lib/ubumark/types/robot.ts';

const FLECHES: RobotScene = {
	colonnes: 8,
	lignes: 5,
	codage: 'flèches',
	depart: { col: 2, ligne: 1 },
	sens: null,
	arrivee: { col: 6, ligne: 4 },
	interdites: []
};

const RELATIF: RobotScene = { ...FLECHES, codage: 'avance-pivote', sens: 'droite' };

function lu(texte: string, scene: RobotScene) {
	const r = lireCode(texte, scene.codage);
	if (!r.ok) throw new Error(r.message);
	return r.instructions;
}

describe('lireCode / ecrireCode', () => {
	it('flèches séparées par des espaces ou des virgules', () => {
		expect(lu('→ → ↑', FLECHES)).toEqual([
			{ kind: 'flèche', sens: 'droite' },
			{ kind: 'flèche', sens: 'droite' },
			{ kind: 'flèche', sens: 'haut' }
		]);
		expect(lu('←,↓', FLECHES)).toEqual([
			{ kind: 'flèche', sens: 'gauche' },
			{ kind: 'flèche', sens: 'bas' }
		]);
	});

	it('avance-pivote', () => {
		expect(lu('avance de 4, pivote à gauche, avance de 3, pivote à droite', RELATIF)).toEqual([
			{ kind: 'avance', pas: 4 },
			{ kind: 'pivote', cote: 'gauche' },
			{ kind: 'avance', pas: 3 },
			{ kind: 'pivote', cote: 'droite' }
		]);
	});

	it('aller-retour', () => {
		for (const [texte, scene] of [
			['→ → ↑ ← ↓', FLECHES],
			['avance de 4, pivote à gauche, avance de 3', RELATIF]
		] as const) {
			expect(ecrireCode(lu(texte, scene), scene.codage)).toBe(texte);
		}
	});

	it('saisie au clavier : flèches collées, « a » sans accent, NFD, point final', () => {
		expect(lu('→→↑', FLECHES)).toHaveLength(3);
		expect(lu('pivote a gauche, Avance de 2.', RELATIF)).toEqual([
			{ kind: 'pivote', cote: 'gauche' },
			{ kind: 'avance', pas: 2 }
		]);
		expect(lu('pivote à gauche'.normalize('NFD'), RELATIF)).toEqual([
			{ kind: 'pivote', cote: 'gauche' }
		]);
	});

	it('code vide : aucune instruction', () => {
		expect(lu('', FLECHES)).toEqual([]);
		expect(lu('  ', RELATIF)).toEqual([]);
	});

	it('instruction inconnue ou d’un autre codage : refusée', () => {
		expect(lireCode('→ x', 'flèches')).toEqual({
			ok: false,
			message: 'Instruction inconnue : « x ».'
		});
		expect(lireCode('avance de 2', 'flèches').ok).toBe(false);
		expect(lireCode('→', 'avance-pivote').ok).toBe(false);
		expect(lireCode('avance de 0', 'avance-pivote').ok).toBe(false);
		expect(lireCode('avance de 10', 'avance-pivote').ok).toBe(false);
	});

	it('plus de 15 instructions : refusé', () => {
		expect(lireCode(Array(15).fill('→').join(' '), 'flèches').ok).toBe(true);
		expect(lireCode(Array(16).fill('→').join(' '), 'flèches')).toEqual({
			ok: false,
			message: '15 instructions au plus.'
		});
	});
});

describe('simuler', () => {
	it('flèches : arrive sur la case verte', () => {
		const r = simuler(FLECHES, lu('→ → → → ↑ ↑ ↑', FLECHES));
		expect(r.fin).toBe('arrivée');
		expect(r.chemin[0]).toEqual({ col: 2, ligne: 1 });
		expect(r.chemin.at(-1)).toEqual({ col: 6, ligne: 4 });
		expect(r.chemin).toHaveLength(8);
	});

	it('avance-pivote : pivote à gauche depuis la droite = vers le haut', () => {
		const r = simuler(RELATIF, lu('avance de 4, pivote à gauche, avance de 3', RELATIF));
		expect(r.fin).toBe('arrivée');
		expect(r.sens).toBe('haut');
	});

	it('passe sur l’arrivée puis repart : ailleurs', () => {
		const r = simuler(FLECHES, lu('→ → → → ↑ ↑ ↑ ↑', FLECHES));
		expect(r.fin).toBe('ailleurs');
		expect(r.chemin.at(-1)).toEqual({ col: 6, ligne: 5 });
	});

	it('sort du quadrillage : arrêt à la dernière case, la case hors du quadrillage notée', () => {
		const r = simuler(FLECHES, lu('↓ → →', FLECHES));
		expect(r.fin).toBe('sortie');
		expect(r.chemin).toEqual([{ col: 2, ligne: 1 }]);
		expect(r.bute).toEqual({ col: 2, ligne: 0 });
	});

	it('avance de 3 coupée par le bord : arrêt avant le bord', () => {
		const scene: RobotScene = { ...RELATIF, depart: { col: 6, ligne: 1 } };
		const r = simuler(scene, lu('avance de 3', scene));
		expect(r.fin).toBe('sortie');
		expect(r.chemin.at(-1)).toEqual({ col: 8, ligne: 1 });
		expect(r.bute).toEqual({ col: 9, ligne: 1 });
	});

	it('entre dans une case grise : interdite', () => {
		const scene: RobotScene = { ...FLECHES, interdites: [{ col: 4, ligne: 1 }] };
		const r = simuler(scene, lu('→ → →', scene));
		expect(r.fin).toBe('interdite');
		expect(r.chemin.at(-1)).toEqual({ col: 3, ligne: 1 });
		expect(r.bute).toEqual({ col: 4, ligne: 1 });
	});

	it('code vide : ailleurs (le robot reste au départ)', () => {
		expect(simuler(FLECHES, []).fin).toBe('ailleurs');
	});
});

describe('virages', () => {
	it('flèches : changements de sens entre deux flèches', () => {
		expect(virages(lu('→ → ↑ ↑ →', FLECHES))).toBe(2);
		expect(virages(lu('↑', FLECHES))).toBe(0);
	});

	it('avance-pivote : chaque « pivote »', () => {
		expect(virages(lu('pivote à gauche, pivote à gauche, avance de 2', RELATIF))).toBe(2);
	});
});

describe('plusCourtCode', () => {
	it('flèches : 7 flèches, un seul virage', () => {
		const code = plusCourtCode(FLECHES);
		expect(code).not.toBeNull();
		expect(code).toHaveLength(7);
		expect(virages(code!)).toBe(1);
		expect(simuler(FLECHES, code!).fin).toBe('arrivée');
	});

	it('avance-pivote : avance, pivote, avance', () => {
		expect(ecrireCode(plusCourtCode(RELATIF)!, 'avance-pivote')).toBe(
			'avance de 4, pivote à gauche, avance de 3'
		);
	});

	it('avance-pivote, robot dos à l’arrivée : demi-tour compté', () => {
		const scene: RobotScene = {
			...RELATIF,
			sens: 'gauche',
			depart: { col: 2, ligne: 1 },
			arrivee: { col: 5, ligne: 1 }
		};
		expect(ecrireCode(plusCourtCode(scene)!, 'avance-pivote')).toMatch(
			/^pivote à (gauche|droite), pivote à \1, avance de 3$/
		);
	});

	it('contourne les cases grises', () => {
		const scene: RobotScene = {
			...FLECHES,
			depart: { col: 1, ligne: 1 },
			arrivee: { col: 5, ligne: 1 },
			interdites: [
				{ col: 3, ligne: 1 },
				{ col: 3, ligne: 2 }
			]
		};
		const code = plusCourtCode(scene)!;
		expect(code).toHaveLength(8);
		expect(simuler(scene, code).fin).toBe('arrivée');
	});

	it('arrivée enfermée : aucun code', () => {
		const scene: RobotScene = {
			...FLECHES,
			depart: { col: 1, ligne: 1 },
			arrivee: { col: 8, ligne: 5 },
			interdites: [
				{ col: 7, ligne: 5 },
				{ col: 8, ligne: 4 }
			]
		};
		expect(plusCourtCode(scene)).toBeNull();
	});

	it('plus de 15 instructions nécessaires : aucun code', () => {
		const scene: RobotScene = {
			...FLECHES,
			colonnes: 12,
			lignes: 12,
			depart: { col: 1, ligne: 1 },
			arrivee: { col: 12, ligne: 12 }
		};
		expect(plusCourtCode(scene)).toBeNull();
		// En avance-pivote, avance de 9 + avance de 2 : 5 instructions suffisent
		// En avance-pivote, avance de 9 + avance de 2 : 5 instructions suffisent, la plus grande d'abord
		expect(
			ecrireCode(
				plusCourtCode({ ...scene, codage: 'avance-pivote', sens: 'droite' })!,
				'avance-pivote'
			)
		).toBe('avance de 9, avance de 2, pivote à gauche, avance de 9, avance de 2');
	});

	it('plus de 4 virages nécessaires : aucun code', () => {
		// Couloir en zigzag, 7 × 3 : ↑↑ →→ ↓↓ →→ ↑↑ →→ = 12 flèches, 5 virages
		const scene: RobotScene = {
			colonnes: 7,
			lignes: 3,
			codage: 'flèches',
			depart: { col: 1, ligne: 1 },
			sens: null,
			arrivee: { col: 7, ligne: 3 },
			interdites: [
				{ col: 2, ligne: 1 },
				{ col: 2, ligne: 2 },
				{ col: 4, ligne: 2 },
				{ col: 4, ligne: 3 },
				{ col: 6, ligne: 1 },
				{ col: 6, ligne: 2 }
			]
		};
		expect(plusCourtCode(scene)).toBeNull();
		// Sans le dernier mur : ↑↑ →→ ↓↓ →→→→ ↑↑ = 12 flèches, 4 virages
		const ouvert = { ...scene, interdites: scene.interdites.slice(0, 4) };
		expect(virages(plusCourtCode(ouvert)!)).toBe(4);
	});

	it('couloir de 16 flèches : aucun code', () => {
		// Couloir en zigzag : chaque passage oblige à tourner
		const scene: RobotScene = {
			colonnes: 5,
			lignes: 5,
			codage: 'flèches',
			depart: { col: 1, ligne: 1 },
			sens: null,
			arrivee: { col: 5, ligne: 5 },
			interdites: [
				{ col: 2, ligne: 1 },
				{ col: 2, ligne: 2 },
				{ col: 2, ligne: 3 },
				{ col: 2, ligne: 4 },
				{ col: 4, ligne: 2 },
				{ col: 4, ligne: 3 },
				{ col: 4, ligne: 4 },
				{ col: 4, ligne: 5 }
			]
		};
		// Chemin : ↑↑↑↑ →→ ↓↓↓↓ →→ ↑↑↑↑ = 16 flèches, 4 virages : trop long
		expect(plusCourtCode(scene)).toBeNull();
	});
});
