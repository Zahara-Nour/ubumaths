/**
 * Tortue de 4e / 3e dans Blockly (chantier `tortue-variables`, PR B) : chaque bloc proposé par
 * la boîte à outils d'un niveau est admis à ce niveau (ADR 0039), et ce que Blockly enregistre
 * est lu par l'interpréteur et la notation du niveau.
 */
import * as Blockly from 'blockly';
import 'blockly/blocks';
import * as BlocklyFr from 'blockly/msg/fr';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { definirBlocsCalcul, francaiserBlocsCalcul } from '../../calcul/blocs';
import { definirBlocsTortue } from '../blocs';
import {
	executerTortue,
	niveauDuBlocTortue,
	niveauTortueAdmet,
	NIVEAUX_TORTUE,
	type NiveauTortue
} from '../interpreteur';
import { etatVersTexteTortue, texteVersEtatTortue } from '../niveaux';
import { TORTUE_TOOLBOX, toolboxTortue } from '../toolbox';

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

function categories(niveau: NiveauTortue): readonly EntreeBoite[] {
	return toolboxTortue(niveau).contents as readonly EntreeBoite[];
}

/** Blocs de la catégorie dynamique des variables de Blockly (« Créer une variable… »). */
const BLOCS_VARIABLES = ['variables_set', 'math_change', 'variables_get'];

let espace: Blockly.Workspace | null = null;

/** Programme écrit au niveau → espace de travail Blockly → état enregistré par Blockly. */
function parBlockly(texte: string, niveau: NiveauTortue): object {
	const lu = texteVersEtatTortue(texte, niveau);
	if (!lu.ok) throw new Error(lu.message);
	espace = new Blockly.Workspace();
	Blockly.serialization.workspaces.load(lu.etat, espace);
	return Blockly.serialization.workspaces.save(espace);
}

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
	definirBlocsTortue();
});

afterEach(() => {
	espace?.dispose();
	espace = null;
});

// =============================================================================
// Boîtes à outils
// =============================================================================

describe('boîtes à outils de la tortue par niveau', () => {
	it('sans niveau : la boîte à outils d’avant, inchangée', () => {
		expect(toolboxTortue('base')).toEqual(TORTUE_TOOLBOX);
	});

	for (const niveau of NIVEAUX_TORTUE) {
		it(`${niveau} : chaque bloc proposé est défini et admis au niveau`, () => {
			const types = typesDe(categories(niveau));
			// La catégorie des variables est remplie par Blockly : ses blocs aussi doivent être admis
			if (categories(niveau).some((c) => c.custom === 'VARIABLE')) types.push(...BLOCS_VARIABLES);
			for (const type of types) {
				expect(Blockly.Blocks[type], type).toBeDefined();
				const requis = niveauDuBlocTortue(type);
				expect(requis, type).not.toBeNull();
				expect(niveauTortueAdmet(niveau, requis as NiveauTortue), type).toBe(true);
			}
		});
	}

	it('4e : variables, + − × ÷, répétition calculée ; ni « si » ni conditions', () => {
		const types = typesDe(categories('4e'));
		for (const type of ['tortue_avancer', 'calcul_operation', 'controls_repeat_ext']) {
			expect(types, type).toContain(type);
		}
		expect(categories('4e').some((c) => c.custom === 'VARIABLE')).toBe(true);
		for (const type of ['calcul_si', 'logic_compare', 'calcul_repeter_jusqua']) {
			expect(types, type).not.toContain(type);
		}
	});

	it('3e : « si / sinon », comparaisons, et / ou / non, « répéter jusqu’à » en plus', () => {
		const types = typesDe(categories('3e'));
		for (const type of [
			'calcul_si',
			'calcul_si_sinon',
			'logic_compare',
			'logic_operation',
			'logic_negate',
			'calcul_repeter_jusqua'
		]) {
			expect(types, type).toContain(type);
		}
	});

	it('jamais les blocs propres au programme de calcul', () => {
		for (const niveau of NIVEAUX_TORTUE) {
			const types = typesDe(categories(niveau));
			for (const type of [
				'calcul_afficher',
				'calcul_nombre_choisi',
				'calcul_resultat',
				'math_modulo'
			]) {
				expect(types, `${niveau} ${type}`).not.toContain(type);
			}
		}
	});
});

// =============================================================================
// Ce que Blockly enregistre
// =============================================================================

describe('programmes de 4e / 3e passés par Blockly', () => {
	it('4e : l’hexagone, lu par l’interpréteur et réécrit à l’identique', () => {
		const hexagone = 'mettre n à 6 ; répéter n [ avancer 3 ; tourner à gauche 360 ÷ n ]';
		const etat = parBlockly(hexagone, '4e');
		const resultat = executerTortue(etat, '4e');
		expect(resultat.ok).toBe(true);
		expect(resultat.segments).toHaveLength(6);
		expect(etatVersTexteTortue(etat, '4e')).toEqual({ ok: true, texte: hexagone });
	});

	it('4e : la spirale (ajouter 1 à côté)', () => {
		const spirale =
			'mettre côté à 1 ; répéter 4 [ avancer côté ; tourner à gauche 90 ; ajouter 1 à côté ]';
		const etat = parBlockly(spirale, '4e');
		expect(executerTortue(etat, '4e').segments).toHaveLength(4);
		expect(etatVersTexteTortue(etat, '4e')).toEqual({ ok: true, texte: spirale });
	});

	it('3e : si / sinon et répéter jusqu’à', () => {
		const programme =
			'mettre i à 0 ; répéter jusqu’à i = 4 [ si i < 2 alors [ avancer 1 ] sinon [ avancer 2 ] ; tourner à gauche 90 ; ajouter 1 à i ]';
		const etat = parBlockly(programme, '3e');
		expect(executerTortue(etat, '3e').segments).toHaveLength(4);
		expect(etatVersTexteTortue(etat, '3e')).toEqual({ ok: true, texte: programme });
	});
});
