import { describe, expect, it } from 'vitest';

import { executerCalcul, LIMITE_PAS_CALCUL, messageErreurCalcul } from '../interpreteur';

// Blocs sérialisés comme les rend `Blockly.serialization.workspaces.save`.

type Bloc = Record<string, unknown>;

function nombre(n: number): Bloc {
	return { type: 'math_number', fields: { NUM: n } };
}

const choisi: Bloc = { type: 'calcul_nombre_choisi' };
const resultat: Bloc = { type: 'calcul_resultat' };

function entree(valeur: Bloc | undefined) {
	if (valeur === undefined) return {};
	return valeur.type === 'math_number' ? { shadow: valeur } : { block: valeur };
}

function op(OP: string, a: Bloc | undefined, b: Bloc | undefined): Bloc {
	return { type: 'calcul_operation', fields: { OP }, inputs: { A: entree(a), B: entree(b) } };
}

function afficher(valeur?: Bloc): Bloc {
	return { type: 'calcul_afficher', inputs: { VALEUR: entree(valeur) } };
}

function mettre(valeur: Bloc): Bloc {
	return { type: 'calcul_mettre_resultat', inputs: { VALEUR: entree(valeur) } };
}

function repeter(n: number, corps: Bloc[]): Bloc {
	const pile = enchainer(corps);
	return {
		type: 'controls_repeat',
		fields: { TIMES: n },
		...(pile && { inputs: { DO: { block: pile } } })
	};
}

function enchainer(blocs: Bloc[]): Bloc | undefined {
	for (let i = blocs.length - 2; i >= 0; i--) blocs[i].next = { block: blocs[i + 1] };
	return blocs[0];
}

function espace(...piles: Bloc[]) {
	return { blocks: { languageVersion: 0, blocks: piles } };
}

function programme(...blocs: Bloc[]) {
	const pile = enchainer(blocs);
	return espace(...(pile ? [pile] : []));
}

describe('executerCalcul', () => {
	it('programme de calcul du BO : (nombre + 2) × 4', () => {
		const etat = programme(afficher(op('MULTIPLY', op('ADD', choisi, nombre(2)), nombre(4))));
		expect(executerCalcul(etat, 3)).toMatchObject({ ok: true, affichages: [20] });
		expect(executerCalcul(etat, -2)).toMatchObject({ ok: true, affichages: [0] });
	});

	it('étape par étape avec la variable résultat', () => {
		const etat = programme(
			mettre(op('ADD', choisi, nombre(2))),
			mettre(op('MULTIPLY', resultat, nombre(4))),
			mettre(op('MINUS', resultat, nombre(3))),
			afficher(resultat)
		);
		expect(executerCalcul(etat, 1)).toMatchObject({ ok: true, affichages: [9] });
	});

	it('les quatre opérations', () => {
		const etat = programme(
			afficher(op('ADD', nombre(7), nombre(2))),
			afficher(op('MINUS', nombre(7), nombre(2))),
			afficher(op('MULTIPLY', nombre(7), nombre(2))),
			afficher(op('DIVIDE', nombre(7), nombre(2)))
		);
		expect(executerCalcul(etat, 0).affichages).toEqual([9, 5, 14, 3.5]);
	});

	it('résultat vaut 0 avant d’être mis', () => {
		expect(executerCalcul(programme(afficher(resultat)), 5).affichages).toEqual([0]);
	});

	it('une entrée vide vaut 0', () => {
		expect(executerCalcul(programme(afficher(op('ADD', choisi, undefined))), 5).affichages).toEqual(
			[5]
		);
		expect(executerCalcul(programme(afficher()), 5).affichages).toEqual([0]);
	});

	it('répéter n fois', () => {
		const etat = programme(
			mettre(choisi),
			repeter(3, [mettre(op('MULTIPLY', resultat, nombre(2)))]),
			afficher(resultat)
		);
		expect(executerCalcul(etat, 5).affichages).toEqual([40]);
	});

	it('plusieurs affichages, dans l’ordre', () => {
		const etat = programme(
			repeter(3, [mettre(op('ADD', resultat, nombre(1))), afficher(resultat)])
		);
		expect(executerCalcul(etat, 0).affichages).toEqual([1, 2, 3]);
	});

	it('programme vide : rien d’affiché', () => {
		expect(executerCalcul(espace(), 4)).toMatchObject({ ok: true, affichages: [] });
	});

	it('un calcul posé seul ne fait rien', () => {
		expect(executerCalcul(espace(op('ADD', choisi, nombre(1))), 4)).toMatchObject({
			ok: true,
			affichages: []
		});
	});

	it('piles exécutées de haut en bas', () => {
		const haut = { ...afficher(nombre(1)), y: 10 };
		const bas = { ...afficher(nombre(2)), y: 200 };
		expect(executerCalcul(espace(bas, haut), 0).affichages).toEqual([1, 2]);
	});

	it('un bloc désactivé n’est pas exécuté', () => {
		const etat = programme({ ...afficher(nombre(1)), enabled: false }, afficher(nombre(2)));
		expect(executerCalcul(etat, 0).affichages).toEqual([2]);
	});

	it('division par zéro : erreur, avec les affichages d’avant', () => {
		const etat = programme(afficher(nombre(1)), afficher(op('DIVIDE', nombre(1), choisi)));
		const r = executerCalcul(etat, 0);
		expect(r).toMatchObject({ ok: false, erreur: { type: 'division-par-zero' }, affichages: [1] });
		expect(messageErreurCalcul({ type: 'division-par-zero' })).toMatch(/division par zéro/i);
	});

	it('nombre trop grand : erreur', () => {
		const etat = programme(
			mettre(nombre(10)),
			repeter(400, [mettre(op('MULTIPLY', resultat, resultat))]),
			afficher(resultat)
		);
		expect(executerCalcul(etat, 0)).toMatchObject({
			ok: false,
			erreur: { type: 'nombre-trop-grand' }
		});
	});

	it('boucle trop longue : arrêtée', () => {
		const etat = programme(repeter(1e12, []));
		const r = executerCalcul(etat, 0);
		expect(r).toMatchObject({ ok: false, erreur: { type: 'trop-long' } });
		expect(r.pas).toBe(LIMITE_PAS_CALCUL);
	});

	it('bloc inconnu refusé, même dans une entrée', () => {
		expect(executerCalcul(programme({ type: 'tortue_avancer' }), 0)).toMatchObject({
			ok: false,
			erreur: { type: 'bloc-inconnu', typeBloc: 'tortue_avancer' }
		});
		const puissance = programme(afficher({ type: 'math_arithmetic', fields: { OP: 'POWER' } }));
		expect(executerCalcul(puissance, 0)).toMatchObject({
			ok: false,
			erreur: { type: 'bloc-inconnu', typeBloc: 'math_arithmetic' }
		});
	});

	it('opération inconnue : programme illisible', () => {
		expect(executerCalcul(programme(afficher(op('POWER', nombre(2), nombre(3)))), 0)).toMatchObject(
			{
				ok: false,
				erreur: { type: 'programme-illisible' }
			}
		);
	});

	it('état mal formé : programme illisible, sans lever', () => {
		for (const etat of [null, 3, { blocks: 'x' }, { blocks: { blocks: [{ pas: 'de type' }] } }]) {
			expect(executerCalcul(etat, 0)).toMatchObject({
				ok: false,
				erreur: { type: 'programme-illisible' }
			});
		}
	});
});
