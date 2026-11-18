/**
 * Fiche du catalogue du bloc ```robot : ce que disent ses explications est vrai (le code
 * cité juste ou faux, rejoué sur la scène de l'exemple).
 */
import { describe, it, expect } from 'vitest';
import { robotEntry } from '#lib/block-catalog/robot.ts';
import { parseRobotContent } from '#lib/ubumark/parser/robot-parser.ts';
import { robotAnswerVerdict, expectedRobotAnswer } from '#lib/ubumark/utils/robot-answer.ts';

/** Verdict d'un code sur la scène d'un exemple du catalogue */
function verdict(titre: string, code: string) {
	const exemple = robotEntry.examples.find((e) => e.title === titre);
	if (!exemple) throw new Error(titre);
	const node = parseRobotContent(exemple.source.split('\n').slice(1, -1).join('\n'));
	if (!node.spec?.solution) throw new Error(`${titre} : pas une question`);
	return robotAnswerVerdict(code, expectedRobotAnswer(node.spec, node.spec.solution));
}

describe('catalogue du robot : les codes cités', () => {
	it('flèches : le mur oblige à monter avant de passer', () => {
		expect(verdict('Coder avec des flèches', '→ → → → ↑ ↑ ↑').juste).toBe(false);
		expect(verdict('Coder avec des flèches', '↑ ↑ ↑ → → → →').juste).toBe(true);
		expect(verdict('Coder avec des flèches', '↑ ↑ → → → → ↑').juste).toBe(true);
	});

	it('avance-pivote : le code cité est juste', () => {
		expect(verdict('Avancer et pivoter', 'avance de 3, pivote à droite, avance de 4').juste).toBe(
			true
		);
	});
});
