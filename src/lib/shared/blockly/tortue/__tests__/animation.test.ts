import { describe, expect, it } from 'vitest';

import { DUREE_ETAPE_MS, imageAnimation } from '../animation';
import { executerTortue, LIMITE_PAS } from '../interpreteur';

// Même forme que dans interpreteur.test.ts : blocs sérialisés comme les rend Blockly.

type Bloc = Record<string, unknown>;

function nombre(n: number): Bloc {
	return { type: 'math_number', fields: { NUM: n } };
}

function avancer(n: number): Bloc {
	return { type: 'tortue_avancer', inputs: { VALEUR: { shadow: nombre(n) } } };
}

function gauche(n: number): Bloc {
	return { type: 'tortue_gauche', inputs: { ANGLE: { shadow: nombre(n) } } };
}

function repeter(n: number, corps: Bloc[]): Bloc {
	return {
		type: 'controls_repeat',
		fields: { TIMES: n },
		inputs: { DO: { block: enchainer(corps) } }
	};
}

function enchainer(blocs: Bloc[]): Bloc | undefined {
	let suivant: Bloc | undefined;
	for (let i = blocs.length - 1; i >= 0; i--) {
		suivant = suivant ? { ...blocs[i], next: { block: suivant } } : { ...blocs[i] };
	}
	return suivant;
}

function espace(...blocs: Bloc[]): unknown {
	return { blocks: { languageVersion: 0, blocks: [{ ...enchainer(blocs), x: 0, y: 0 }] } };
}

const DEPART = { x: 0, y: 0, cap: 0, styloBaisse: true };

describe('étapes de l’interpréteur', () => {
	it('carré : une étape par déplacement et par virage, pas pour la boucle', () => {
		const resultat = executerTortue(espace(repeter(4, [avancer(3), gauche(90)])));
		expect(resultat.etapes).toHaveLength(8);
		expect(resultat.etapes[0]).toEqual({ tortue: { ...DEPART, x: 3 }, segments: 1 });
		expect(resultat.etapes[1]).toEqual({ tortue: { ...DEPART, x: 3, cap: 90 }, segments: 1 });
		expect(resultat.etapes.at(-1)).toEqual({ tortue: resultat.tortue, segments: 4 });
	});

	it('stylo levé : la tortue bouge, aucun segment de plus', () => {
		const resultat = executerTortue(
			espace({ type: 'tortue_lever_stylo' }, avancer(2), { type: 'tortue_baisser_stylo' })
		);
		expect(resultat.etapes.map((e) => e.segments)).toEqual([0, 0, 0]);
		expect(resultat.etapes[1].tortue).toMatchObject({ x: 2, styloBaisse: false });
		expect(resultat.etapes[2].tortue.styloBaisse).toBe(true);
	});

	it('les étapes enregistrées ne bougent plus quand la tortue continue', () => {
		const resultat = executerTortue(espace(avancer(1), avancer(1)));
		expect(resultat.etapes[0].tortue.x).toBe(1);
		expect(resultat.etapes[1].tortue.x).toBe(2);
	});

	it('programme vide ou bloc inconnu : aucune étape', () => {
		expect(executerTortue({}).etapes).toEqual([]);
		expect(executerTortue(espace(avancer(1), { type: 'variables_set' })).etapes).toEqual([]);
	});

	it('trop de pas : les étapes s’arrêtent avec le tracé partiel', () => {
		const resultat = executerTortue(espace(repeter(LIMITE_PAS, [avancer(1), gauche(90)])));
		expect(resultat.ok).toBe(false);
		expect(resultat.etapes.at(-1)).toEqual({
			tortue: resultat.tortue,
			segments: resultat.segments.length
		});
	});
});

describe('étapes : arrêt trop-loin', () => {
	it('la dernière étape est la tortue d’avant le pas refusé', () => {
		const resultat = executerTortue(espace(avancer(2), avancer(2_000_000)));
		expect(resultat.ok).toBe(false);
		expect(resultat.etapes).toEqual([{ tortue: { ...DEPART, x: 2 }, segments: 1 }]);
		expect(resultat.etapes.at(-1)?.tortue).toEqual(resultat.tortue);
	});
});

describe('imageAnimation', () => {
	const carre = executerTortue(espace(repeter(4, [avancer(3), gauche(90)])));

	it('avant la première étape : quadrillage vide, tortue au départ', () => {
		expect(imageAnimation(carre, -1)).toEqual({ segments: [], tortue: DEPART });
	});

	it('au milieu : les segments déjà tracés et la tortue de l’étape', () => {
		const image = imageAnimation(carre, 2);
		expect(image.segments).toEqual(carre.segments.slice(0, 2));
		expect(image.tortue).toEqual({ ...DEPART, x: 3, y: 3, cap: 90 });
	});

	it('à la dernière étape et au-delà : le tracé complet', () => {
		const fin = { segments: carre.segments, tortue: carre.tortue };
		expect(imageAnimation(carre, 7)).toEqual(fin);
		expect(imageAnimation(carre, 100)).toEqual(fin);
	});

	it('sans étape : le résultat tel quel', () => {
		const vide = executerTortue({});
		expect(imageAnimation(vide, 0)).toEqual({ segments: [], tortue: DEPART });
	});

	it('vitesse fixe, environ 0,3 s par étape', () => {
		expect(DUREE_ETAPE_MS).toBe(300);
	});
});
