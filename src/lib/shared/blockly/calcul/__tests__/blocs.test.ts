/**
 * Blocs Blockly des programmes de calcul, 5e / 4e / 3e (chantier `docs/archive/wip/blockly-progress.md`,
 * piste 4e / 3e, PR B) : chaque bloc proposé par la boîte à outils d'un niveau est admis à ce
 * niveau, et ce que Blockly enregistre est lu par l'interpréteur et la notation.
 */
import * as Blockly from 'blockly';
import 'blockly/blocks';
import * as BlocklyFr from 'blockly/msg/fr';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { definirBlocsCalcul, francaiserBlocsCalcul, surveillerNomsDeVariables } from '../blocs';
import {
	executerCalcul,
	niveauAdmet,
	niveauDuBloc,
	refusDeNouveauNom,
	type NiveauCalcul
} from '../interpreteur';
import { etatVersTexteCalcul, texteVersEtatCalcul } from '../notation';
import { CALCUL_TOOLBOX, toolboxCalcul } from '../toolbox';

// =============================================================================
// Outils
// =============================================================================

interface EntreeBoite {
	kind: string;
	type?: string;
	custom?: string;
	contents?: readonly EntreeBoite[];
	inputs?: Record<string, { block?: EntreeBoite; shadow?: EntreeBoite }>;
}

/** Types de blocs d'une boîte à outils, blocs posés dans les entrées compris. */
function typesDe(entrees: readonly EntreeBoite[]): string[] {
	const types: string[] = [];
	const bloc = (b: EntreeBoite): void => {
		if (b.type) types.push(b.type);
		for (const entree of Object.values(b.inputs ?? {})) {
			if (entree.block) bloc(entree.block);
			if (entree.shadow) bloc(entree.shadow);
		}
	};
	for (const entree of entrees) {
		if (entree.contents) types.push(...typesDe(entree.contents));
		else bloc(entree);
	}
	return types;
}

function categories(niveau: NiveauCalcul): readonly EntreeBoite[] {
	return toolboxCalcul(niveau).contents as readonly EntreeBoite[];
}

let espace: Blockly.Workspace | null = null;

/** Programme écrit → espace de travail Blockly → état enregistré par Blockly. */
function parBlockly(texte: string): object {
	const lu = texteVersEtatCalcul(texte);
	if (!lu.ok) throw new Error(lu.message);
	espace = new Blockly.Workspace();
	Blockly.serialization.workspaces.load(lu.etat, espace);
	return Blockly.serialization.workspaces.save(espace);
}

/** Les événements de Blockly partent au tour suivant. */
const tourSuivant = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeAll(() => {
	Blockly.setLocale(
		Object.fromEntries(
			Object.entries(BlocklyFr).filter(
				(entree): entree is [string, string] => typeof entree[1] === 'string'
			)
		)
	);
	francaiserBlocsCalcul();
	definirBlocsCalcul();
});

afterEach(() => {
	espace?.dispose();
	espace = null;
});

// =============================================================================
// Boîtes à outils
// =============================================================================

describe('boîtes à outils par niveau', () => {
	it('5e : la boîte à outils d’avant, inchangée', () => {
		expect(toolboxCalcul('5e')).toEqual(CALCUL_TOOLBOX);
		expect(typesDe(categories('5e'))).toContain('calcul_mettre_resultat');
	});

	for (const niveau of ['5e', '4e', '3e'] as const) {
		it(`${niveau} : chaque bloc proposé est défini et admis au niveau`, () => {
			for (const type of typesDe(categories(niveau))) {
				expect(Blockly.Blocks[type], type).toBeDefined();
				const requis = niveauDuBloc(type);
				expect(requis, type).not.toBeNull();
				expect(niveauAdmet(niveau, requis as NiveauCalcul), type).toBe(true);
			}
		});
	}

	it('4e : variables de l’élève, « si », comparaisons, reste, répétition calculée ; pas résultat', () => {
		const types = typesDe(categories('4e'));
		for (const type of [
			'calcul_si',
			'calcul_si_sinon',
			'logic_compare',
			'math_modulo',
			'controls_repeat_ext'
		]) {
			expect(types, type).toContain(type);
		}
		expect(types).not.toContain('calcul_resultat');
		expect(types).not.toContain('calcul_mettre_resultat');
		expect(types).not.toContain('logic_operation');
		expect(types).not.toContain('calcul_repeter_jusqua');
		expect(categories('4e').some((c) => c.custom === 'VARIABLE')).toBe(true);
	});

	it('3e : et / ou, non, « répéter jusqu’à » en plus', () => {
		const types = typesDe(categories('3e'));
		for (const type of ['logic_operation', 'logic_negate', 'calcul_repeter_jusqua', 'calcul_si']) {
			expect(types, type).toContain(type);
		}
		expect(categories('3e').some((c) => c.custom === 'VARIABLE')).toBe(true);
	});
});

// =============================================================================
// Blocs dans Blockly
// =============================================================================

describe('blocs 4e / 3e dans Blockly', () => {
	it('nominal de la phase 0 : 7 → 4, 3 → 6', () => {
		const etat = parBlockly(
			'mettre x à nombre × 2 ; si x > 10 alors [ afficher x − 10 ] sinon [ afficher x ]'
		);
		expect(executerCalcul(etat, 7, '4e').affichages).toEqual([4]);
		expect(executerCalcul(etat, 3, '4e').affichages).toEqual([6]);
	});

	it('enregistrés par Blockly, réécrits à l’identique', () => {
		for (const texte of [
			'mettre x à nombre × 2 ; si x > 10 alors [ afficher x − 10 ] sinon [ afficher x ]',
			'mettre n à 0 ; répéter nombre [ ajouter 1 à n ] ; afficher n',
			'si reste de nombre par 2 = 0 alors [ afficher 1 ]',
			'mettre x à nombre ; répéter jusqu’à x > 100 [ mettre x à x × 2 ] ; afficher x',
			'si nombre > 0 et non (nombre > 10) alors [ afficher 1 ] sinon [ afficher 0 ]'
		]) {
			const relu = etatVersTexteCalcul(parBlockly(texte));
			expect(relu.ok, texte).toBe(true);
			if (relu.ok) expect(relu.texte).toBe(texte);
		}
	});

	it('textes des blocs en français, comme la notation', () => {
		parBlockly(
			'mettre x à 3 ; ajouter 1 à x ; si reste de x par 2 = 0 alors [ afficher x ] ; répéter jusqu’à x > 5 [ ajouter 1 à x ]'
		);
		const textes = (espace as Blockly.Workspace).getAllBlocks(true).map((bloc) => bloc.toString());
		expect(textes).toContain('mettre x à 3');
		expect(textes).toContain('ajouter 1 à x');
		expect(textes.some((t) => t.startsWith('reste de la division de x par 2'))).toBe(true);
		expect(textes.some((t) => t.startsWith('si '))).toBe(true);
		expect(textes.some((t) => t.startsWith('répéter jusqu’à'))).toBe(true);
	});
});

// =============================================================================
// Noms de variables
// =============================================================================

describe('noms de variables à la création', () => {
	it('refusDeNouveauNom : mot du langage, nom mal écrit, nom qui ne diffère que par les accents', () => {
		expect(refusDeNouveauNom('prix', ['cote'])).toBeNull();
		expect(refusDeNouveauNom('Côté', ['cote'])).toContain('cote');
		expect(refusDeNouveauNom('COTE', ['côté'])).toContain('côté');
		expect(refusDeNouveauNom('résultat', [])).toContain('mot du programme');
		expect(refusDeNouveauNom('2x', [])).not.toBeNull();
	});

	it('variable créée qui ne diffère d’une autre que par les accents : retirée, message', async () => {
		espace = new Blockly.Workspace();
		const refus: string[] = [];
		surveillerNomsDeVariables(espace, (message) => {
			if (message) refus.push(message);
		});
		const variables = espace.getVariableMap();
		variables.createVariable('cote');
		await tourSuivant();
		expect(refus).toEqual([]);
		variables.createVariable('Côté');
		await tourSuivant();
		expect(variables.getAllVariables().map((v) => v.getName())).toEqual(['cote']);
		expect(refus).toHaveLength(1);
		expect(refus[0]).toContain('cote');
	});

	it('deux créations avant les événements : la seconde est refusée, pas la première', async () => {
		espace = new Blockly.Workspace();
		const refus: string[] = [];
		surveillerNomsDeVariables(espace, (message) => {
			if (message) refus.push(message);
		});
		const variables = espace.getVariableMap();
		variables.createVariable('cote');
		variables.createVariable('Côté');
		await tourSuivant();
		expect(variables.getAllVariables().map((v) => v.getName())).toEqual(['cote']);
		expect(refus).toHaveLength(1);
	});

	it('variable créée avec un mot du langage : retirée, message', async () => {
		espace = new Blockly.Workspace();
		const refus: string[] = [];
		surveillerNomsDeVariables(espace, (message) => {
			if (message) refus.push(message);
		});
		espace.getVariableMap().createVariable('si');
		await tourSuivant();
		expect(espace.getVariableMap().getAllVariables()).toEqual([]);
		expect(refus[0]).toContain('mot du programme');
	});

	it('après un nom refusé, annuler revient en arrière (pas bloqué sur le refus)', async () => {
		espace = new Blockly.Workspace();
		surveillerNomsDeVariables(espace, () => {});
		const variables = espace.getVariableMap();
		variables.createVariable('x');
		await tourSuivant();
		variables.createVariable('si');
		await tourSuivant();
		const prix = variables.createVariable('prix');
		await tourSuivant();
		variables.renameVariable(prix, 'Si');
		await tourSuivant();
		const noms = () =>
			variables
				.getAllVariables()
				.map((v) => v.getName())
				.sort();
		expect(noms()).toEqual(['prix', 'x']);
		// Deux annulations : prix, puis x ; les refus n'y laissent rien
		espace.undo(false);
		await tourSuivant();
		expect(noms()).toEqual(['x']);
		espace.undo(false);
		await tourSuivant();
		expect(noms()).toEqual([]);
	});

	it('variable renommée en un nom refusé : l’ancien nom revient, message', async () => {
		espace = new Blockly.Workspace();
		const refus: string[] = [];
		surveillerNomsDeVariables(espace, (message) => {
			if (message) refus.push(message);
		});
		const variables = espace.getVariableMap();
		variables.createVariable('cote');
		const prix = variables.createVariable('prix');
		await tourSuivant();
		variables.renameVariable(prix, 'Côté');
		await tourSuivant();
		expect(
			variables
				.getAllVariables()
				.map((v) => v.getName())
				.sort()
		).toEqual(['cote', 'prix']);
		expect(refus).toHaveLength(1);
	});
});
