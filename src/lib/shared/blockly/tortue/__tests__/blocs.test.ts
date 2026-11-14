import * as Blockly from 'blockly';
import 'blockly/blocks';
import { javascriptGenerator } from 'blockly/javascript';
import { pythonGenerator } from 'blockly/python';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { definirBlocsTortue } from '../blocs';
import { executerTortue } from '../interpreteur';
import { TORTUE_TOOLBOX } from '../toolbox';

// Un carré de côté 2, posé dans un vrai espace de travail Blockly (sans interface) puis
// sérialisé : l'interpréteur doit lire exactement ce que Blockly enregistre.
const CARRE = {
	blocks: {
		languageVersion: 0,
		blocks: [
			{
				type: 'controls_repeat_ext',
				x: 10,
				y: 10,
				inputs: {
					TIMES: { shadow: { type: 'math_number', fields: { NUM: 4 } } },
					DO: {
						block: {
							type: 'tortue_avancer',
							inputs: { VALEUR: { shadow: { type: 'math_number', fields: { NUM: 2 } } } },
							next: {
								block: {
									type: 'tortue_gauche',
									inputs: { ANGLE: { shadow: { type: 'math_number', fields: { NUM: 90 } } } }
								}
							}
						}
					}
				}
			}
		]
	}
};

let espace: Blockly.Workspace;

beforeAll(() => {
	definirBlocsTortue();
});

afterEach(() => {
	espace?.dispose();
});

function charger(etat: object): Blockly.Workspace {
	espace = new Blockly.Workspace();
	Blockly.serialization.workspaces.load(etat, espace);
	return espace;
}

describe('blocs tortue dans Blockly', () => {
	it('chargés puis sérialisés par Blockly : l’interpréteur trace le carré', () => {
		const sauvegarde = Blockly.serialization.workspaces.save(charger(CARRE));
		const resultat = executerTortue(sauvegarde);
		expect(resultat.ok).toBe(true);
		expect(resultat.segments).toHaveLength(4);
		expect(resultat.tortue).toMatchObject({ x: 0, y: 0, cap: 0 });
	});

	it('bloc désactivé dans Blockly : ignoré par l’interpréteur', () => {
		const ws = charger(CARRE);
		ws.getAllBlocks(false)
			.find((bloc) => bloc.type === 'tortue_gauche')
			?.setDisabledReason(true, 'MANUALLY_DISABLED');
		const resultat = executerTortue(Blockly.serialization.workspaces.save(ws));
		// Sans le virage, la tortue avance quatre fois tout droit
		expect(resultat.tortue).toMatchObject({ x: 8, y: 0 });
	});

	it('aperçu JavaScript et Python', () => {
		const ws = charger(CARRE);
		expect(javascriptGenerator.workspaceToCode(ws)).toContain('avancer(2);');
		const python = pythonGenerator.workspaceToCode(ws);
		expect(python).toContain('from turtle import *');
		expect(python).toContain('forward(2)');
		expect(python).toContain('left(90)');
	});

	it('chaque bloc de la boîte à outils est exécutable par l’interpréteur', () => {
		const types = TORTUE_TOOLBOX.contents.flatMap((categorie) =>
			categorie.contents.map((entree) => entree.type)
		);
		for (const type of types) {
			expect(Blockly.Blocks[type], type).toBeDefined();
			const bloc =
				type === 'math_number'
					? { type: 'tortue_avancer', inputs: { VALEUR: { block: { type } } } }
					: { type };
			const resultat = executerTortue({ blocks: { blocks: [bloc] } });
			expect(resultat.ok, type).toBe(true);
		}
	});
});
