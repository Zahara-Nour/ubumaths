/**
 * Balises HTML et marques `[°…°]` de TinyMath dans les énoncés et corrections
 * ============================================================================
 *
 * `<b>chiffre des unités</b>` s'affichait avec ses balises (#8, #217…) ; `[°7/9°]`
 * (« afficher mis en forme ») restait brut (#287, #586).
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { convertLegacyMarkup } from '../syntax-converter';
import { transformQuestion } from '../question-transformer';
import type { QuestionWithMigration } from '../old-question-types';

const questions = JSON.parse(
	readFileSync(resolve(process.cwd(), '.claude/old-questions.json'), 'utf-8')
) as QuestionWithMigration[];

describe('convertLegacyMarkup', () => {
	it.each([
		['Mon <b>chiffre des unités</b> est', 'Mon **chiffre des unités** est'],
		['<strong>gras</strong> et <i>penché</i> et <em>aussi</em>', '**gras** et *penché* et *aussi*'],
		['ligne 1<br>ligne 2<br/>ligne 3', 'ligne 1\n\nligne 2\n\nligne 3'],
		['car $[°7/9°]$ est positif', 'car $7/9$ est positif'],
		['sans balise', 'sans balise']
	])('%s', (input, expected) => {
		expect(convertLegacyMarkup(input)).toBe(expected);
	});
});

describe('conversion des questions', () => {
	it('#8 : plus de balise <b> dans l’énoncé', () => {
		const json = JSON.stringify(transformQuestion(questions[8], 8).template);
		expect(json).not.toMatch(/<\/?b>/);
		expect(json).toContain('**chiffre des unités**');
	});

	it('#586 : plus de [°…°] dans la correction', () => {
		expect(JSON.stringify(transformQuestion(questions[586], 586).template)).not.toContain('[°');
	});

	it('#364 : l’aide HTML n’est pas recopiée dans la consigne', () => {
		const result = transformQuestion(questions[364], 364);
		expect(result.template?.exerciseInstruction).toBeUndefined();
		expect(result.warnings?.join(' ')).toContain('aide');
	});
});
