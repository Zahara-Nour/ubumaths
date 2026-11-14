import { describe, expect, it } from 'vitest';

import { executerTortue, LIMITE_PAS, messageErreurTortue } from '../interpreteur';

// Blocs sérialisés comme les rend `Blockly.serialization.workspaces.save` : un bloc
// `next` porte le suivant, une entrée valeur porte un bloc ou une ombre (shadow).

type Bloc = Record<string, unknown>;

function nombre(n: number): Bloc {
	return { type: 'math_number', fields: { NUM: n } };
}

function avancer(n: number): Bloc {
	return { type: 'tortue_avancer', inputs: { VALEUR: { shadow: nombre(n) } } };
}

function reculer(n: number): Bloc {
	return { type: 'tortue_reculer', inputs: { VALEUR: { shadow: nombre(n) } } };
}

function gauche(n: number): Bloc {
	return { type: 'tortue_gauche', inputs: { ANGLE: { shadow: nombre(n) } } };
}

function droite(n: number): Bloc {
	return { type: 'tortue_droite', inputs: { ANGLE: { shadow: nombre(n) } } };
}

function repeter(n: number, corps: Bloc[]): Bloc {
	const inputs: Record<string, unknown> = { TIMES: { shadow: nombre(n) } };
	const pile = enchainer(corps);
	if (pile) inputs.DO = { block: pile };
	return { type: 'controls_repeat_ext', inputs };
}

/** Enchaîne des blocs par `next`, comme une pile de Blockly. */
function enchainer(blocs: Bloc[]): Bloc | undefined {
	let suivant: Bloc | undefined;
	for (let i = blocs.length - 1; i >= 0; i--) {
		suivant = suivant ? { ...blocs[i], next: { block: suivant } } : { ...blocs[i] };
	}
	return suivant;
}

function espace(...piles: Bloc[][]): unknown {
	return {
		blocks: {
			languageVersion: 0,
			blocks: piles.map((pile, i) => ({ ...enchainer(pile), x: 0, y: i * 100 }))
		}
	};
}

describe('executerTortue — nominal', () => {
	it('carré de côté 3 : quatre segments, la tortue revient au départ', () => {
		const resultat = executerTortue(espace([repeter(4, [avancer(3), gauche(90)])]));
		expect(resultat.ok).toBe(true);
		expect(resultat.segments).toEqual([
			{ de: { x: 0, y: 0 }, a: { x: 3, y: 0 } },
			{ de: { x: 3, y: 0 }, a: { x: 3, y: 3 } },
			{ de: { x: 3, y: 3 }, a: { x: 0, y: 3 } },
			{ de: { x: 0, y: 3 }, a: { x: 0, y: 0 } }
		]);
		expect(resultat.tortue).toEqual({ x: 0, y: 0, cap: 0, styloBaisse: true });
	});

	it('départ : au centre, vers la droite ; tourner à droite descend', () => {
		const resultat = executerTortue(espace([droite(90), avancer(2)]));
		expect(resultat.segments).toEqual([{ de: { x: 0, y: 0 }, a: { x: 0, y: -2 } }]);
		expect(resultat.tortue.cap).toBe(270);
	});

	it('reculer trace vers l’arrière sans changer le cap', () => {
		const resultat = executerTortue(espace([reculer(2)]));
		expect(resultat.segments).toEqual([{ de: { x: 0, y: 0 }, a: { x: -2, y: 0 } }]);
		expect(resultat.tortue.cap).toBe(0);
	});

	it('stylo levé : la tortue se déplace sans tracer, puis retrace une fois baissé', () => {
		const resultat = executerTortue(
			espace([
				avancer(1),
				{ type: 'tortue_lever_stylo' },
				avancer(2),
				{ type: 'tortue_baisser_stylo' },
				avancer(1)
			])
		);
		expect(resultat.segments).toEqual([
			{ de: { x: 0, y: 0 }, a: { x: 1, y: 0 } },
			{ de: { x: 3, y: 0 }, a: { x: 4, y: 0 } }
		]);
	});

	it('angle quelconque : arrondis nettoyés (pas de 2.9999999999)', () => {
		const resultat = executerTortue(espace([repeter(3, [avancer(2), gauche(120)])]));
		expect(resultat.tortue.x).toBe(0);
		expect(resultat.tortue.y).toBe(0);
		expect(resultat.segments[0]).toEqual({ de: { x: 0, y: 0 }, a: { x: 2, y: 0 } });
		expect(resultat.segments[1].a.x).toBe(1);
	});

	it('angles négatifs et au-delà d’un tour : cap ramené entre 0 et 360', () => {
		expect(executerTortue(espace([gauche(-90)])).tortue.cap).toBe(270);
		expect(executerTortue(espace([gauche(450)])).tortue.cap).toBe(90);
	});

	it('le bloc posé (block) l’emporte sur l’ombre (shadow)', () => {
		const bloc: Bloc = {
			type: 'tortue_avancer',
			inputs: { VALEUR: { shadow: nombre(1), block: nombre(5) } }
		};
		expect(executerTortue(espace([bloc])).tortue.x).toBe(5);
	});

	it('plusieurs piles : exécutées de haut en bas, comme l’aperçu du code', () => {
		const etat = {
			blocks: {
				languageVersion: 0,
				blocks: [
					{ ...avancer(1), x: 0, y: 200 },
					{ ...gauche(90), x: 0, y: 10 }
				]
			}
		};
		expect(executerTortue(etat).segments).toEqual([{ de: { x: 0, y: 0 }, a: { x: 0, y: 1 } }]);
	});

	it('un bloc désactivé est ignoré', () => {
		const resultat = executerTortue(
			espace([{ ...avancer(4), disabledReasons: ['MANUALLY_DISABLED'] }, avancer(1)])
		);
		expect(resultat.tortue.x).toBe(1);
	});

	it('répéter (bloc à champ) : le nombre est lu dans le champ TIMES', () => {
		const bloc: Bloc = {
			type: 'controls_repeat',
			fields: { TIMES: 3 },
			inputs: { DO: { block: avancer(1) } }
		};
		expect(executerTortue(espace([bloc])).tortue.x).toBe(3);
	});
});

describe('executerTortue — limites', () => {
	it('programme vide : rien, sans erreur', () => {
		expect(executerTortue({})).toEqual({
			ok: true,
			segments: [],
			tortue: { x: 0, y: 0, cap: 0, styloBaisse: true },
			pas: 0
		});
		expect(executerTortue(espace()).ok).toBe(true);
	});

	it('répétitions négatives : comptent pour 0', () => {
		const resultat = executerTortue(espace([repeter(-3, [avancer(1)])]));
		expect(resultat.ok).toBe(true);
		expect(resultat.segments).toEqual([]);
	});

	it('avancer de 0 : aucun segment', () => {
		expect(executerTortue(espace([avancer(0)])).segments).toEqual([]);
	});

	it('entrée vide (aucun nombre) : vaut 0, comme dans le code généré', () => {
		expect(executerTortue(espace([{ type: 'tortue_avancer' }])).segments).toEqual([]);
	});
});

describe('executerTortue — erreurs', () => {
	it('bloc inconnu : refusé, rien n’est tracé, même ce qui le précède', () => {
		const resultat = executerTortue(
			espace([avancer(2), { type: 'text_print', inputs: {} }, avancer(1)])
		);
		expect(resultat).toMatchObject({
			ok: false,
			erreur: { type: 'bloc-inconnu', typeBloc: 'text_print' },
			segments: [],
			pas: 0
		});
		if (!resultat.ok) {
			expect(messageErreurTortue(resultat.erreur)).toBe(
				'Ce bloc n’est pas pris en charge par la tortue.'
			);
		}
	});

	it('bloc inconnu caché dans une entrée valeur : refusé aussi', () => {
		const bloc: Bloc = {
			type: 'tortue_avancer',
			inputs: { VALEUR: { block: { type: 'math_arithmetic', fields: { OP: 'ADD' } } } }
		};
		expect(executerTortue(espace([bloc]))).toMatchObject({
			ok: false,
			erreur: { type: 'bloc-inconnu', typeBloc: 'math_arithmetic' }
		});
	});

	it('trop de pas : arrêt à la limite, tracé partiel gardé', () => {
		const resultat = executerTortue(espace([repeter(1_000_000, [avancer(1), gauche(90)])]));
		expect(resultat.ok).toBe(false);
		expect(resultat.pas).toBe(LIMITE_PAS);
		expect(resultat.segments.length).toBeGreaterThan(0);
		if (!resultat.ok) {
			expect(resultat.erreur).toEqual({ type: 'trop-long' });
			expect(messageErreurTortue(resultat.erreur)).toMatch(/10\s000/);
		}
	});

	it('une boucle vide immense s’arrête aussi', () => {
		const resultat = executerTortue(espace([repeter(1e12, [])]));
		expect(resultat).toMatchObject({ ok: false, erreur: { type: 'trop-long' } });
	});

	it('état illisible : refusé sans exception', () => {
		for (const etat of [
			null,
			42,
			'abc',
			{ blocks: { blocks: 'x' } },
			{ blocks: { blocks: [7] } }
		]) {
			expect(executerTortue(etat)).toMatchObject({
				ok: false,
				erreur: { type: 'programme-illisible' }
			});
		}
	});
});
