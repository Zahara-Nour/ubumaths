import { describe, expect, it } from 'vitest';

import { parseMarkdown } from '../../parser/markdown-parser';
import { parseCalculContent } from '../../parser/calcul-parser';
import { hasMaskedValue } from '../../utils/masked-value';
import {
	calculAnswerVerdict,
	expectedCalculAnswer,
	readExpectedCalculAnswer
} from '../../utils/calcul-answer';
import { ESSAIS_PAR_DEFAUT } from '$lib/shared/blockly/calcul/jugement';

const BO = 'attendu: afficher (nombre + 2) × 4';

function messages(source: string): string {
	return parseCalculContent(source)
		.errors.map((e) => e.message)
		.join(' | ');
}

describe('parseCalculContent', () => {
	it('attendu seul : essais par défaut, pas de départ', () => {
		const node = parseCalculContent(BO);
		expect(node.errors).toEqual([]);
		expect(node.spec).toEqual({
			attendu: 'afficher (nombre + 2) × 4',
			essais: [...ESSAIS_PAR_DEFAUT],
			depart: null
		});
	});

	it('essais: et départ: lus', () => {
		const node = parseCalculContent(
			[BO, 'essais: -3 ; 0 ; 2,5', 'départ: afficher nombre + 1'].join('\n')
		);
		expect(node.errors).toEqual([]);
		expect(node.spec?.essais).toEqual([-3, 0, 2.5]);
		expect(node.spec?.depart).toBe('afficher nombre + 1');
		expect(parseCalculContent([BO, 'depart: afficher 1'].join('\n')).spec?.depart).toBe(
			'afficher 1'
		);
	});

	it('case: lue', () => {
		expect(parseCalculContent(['case: 2', BO].join('\n')).caseIndex).toBe(2);
	});

	it('attendu absent, vide, illisible, sans affichage ou en erreur sur un essai : refusé', () => {
		expect(messages('essais: 1')).toMatch(/il manque la ligne attendu:/);
		expect(messages('attendu:')).toMatch(/attendu: vide/);
		expect(messages('attendu: afficher (')).toMatch(/Ligne 1 : attendu: Calcul incomplet/);
		expect(messages('attendu: résultat = nombre')).toMatch(/n’affiche rien avec le nombre −3/);
		// Le défaut contient 0 : la division par nombre est refusée, pas avec d'autres essais
		expect(messages('attendu: afficher 12 ÷ nombre')).toMatch(
			/Avec le nombre 0 : Division par zéro/
		);
		expect(parseCalculContent('attendu: afficher 12 ÷ nombre\nessais: 1 ; 3').errors).toEqual([]);
	});

	it('essais: ou départ: illisibles, clés inconnues ou en double : erreur située', () => {
		expect(messages([BO, 'essais: 1 ; deux'].join('\n'))).toMatch(/Ligne 2 : essais: « deux »/);
		expect(messages([BO, 'départ: afficher ('].join('\n'))).toMatch(/Ligne 2 : départ:/);
		expect(messages([BO, 'couleur: rouge'].join('\n'))).toMatch(/clé « couleur » inconnue/);
		expect(messages([BO, BO].join('\n'))).toMatch(/déjà donnée/);
		expect(messages([BO, 'afficher 3'].join('\n'))).toMatch(/non comprise/);
	});

	it('énoncé masqué : attendu: ?, essais et départ gardés', () => {
		const node = parseCalculContent(
			['attendu: ?', 'essais: 1 ; 2', 'départ: afficher 0'].join('\n')
		);
		expect(node.errors).toEqual([]);
		expect(node.spec).toEqual({ attendu: null, essais: [1, 2], depart: 'afficher 0' });
	});

	it('`attendu: ?` est une valeur masquée', () => {
		expect(hasMaskedValue('attendu: ?')).toBe(true);
		expect(hasMaskedValue(BO)).toBe(false);
	});
});

describe('réponse attendue d’une case calcul', () => {
	it('essais et programme, relus', () => {
		const attendue = expectedCalculAnswer([-3, 0, 2.5], 'afficher (nombre + 2) × 4');
		expect(attendue).toBe('−3 ; 0 ; 2,5 | afficher (nombre + 2) × 4');
		expect(readExpectedCalculAnswer(attendue)).toEqual({
			essais: [-3, 0, 2.5],
			attendu: 'afficher (nombre + 2) × 4'
		});
		expect(readExpectedCalculAnswer('afficher 1')).toBeNull();
		expect(readExpectedCalculAnswer('deux | afficher 1')).toBeNull();
	});

	it('verdict', () => {
		const attendue = expectedCalculAnswer([...ESSAIS_PAR_DEFAUT], 'afficher (nombre + 2) × 4');
		expect(calculAnswerVerdict('afficher 4 × nombre + 8', attendue)).toEqual({ juste: true });
		expect(calculAnswerVerdict('afficher nombre + 2', attendue)).toEqual({ juste: false });
		expect(calculAnswerVerdict('afficher 1', 'illisible')).toEqual({ juste: false });
	});
});

describe('parseMarkdown — bloc ```calcul', () => {
	it('nœud calcul au premier niveau', () => {
		const doc = parseMarkdown(['Programme de calcul.', '', '```calcul', BO, '```'].join('\n'));
		expect(doc.children.map((c) => c.type)).toEqual(['paragraph', 'calcul']);
	});

	it('bloc non fermé : nœud en erreur, la suite n’est pas avalée', () => {
		const doc = parseMarkdown(['```calcul', BO, '', 'Fin.'].join('\n'));
		const calcul = doc.children.find((c) => c.type === 'calcul');
		expect(calcul && 'errors' in calcul && calcul.errors.at(-1)?.message).toMatch(/non fermé/);
		expect(doc.children.at(-1)?.type).toBe('paragraph');
	});
});
