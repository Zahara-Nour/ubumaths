/**
 * Éditeur de cases : lire, réécrire et ajouter une case choix dans l'énoncé
 * (chantier figure-et-choix, PR 1b, phase 0 validée par David le 2026-10-26).
 *
 * L'énoncé fait foi : la carte « Case N : choix » lit son bloc ```choix et le
 * réécrit à sa place, sans toucher au reste du texte ; la bonne réponse est
 * portée par la case (`"1"`, `"0;2"`, indices d'origine).
 */
import { describe, it, expect } from 'vitest';
import {
	appendChoiceCase,
	choiceIndexesAfterRemoval,
	readCheckedChoices,
	readChoiceCase,
	statementCaseKinds,
	writeChoiceCase,
	withBlockCases
} from '../choice-case-editor';
import { assignBlankIndices } from '../generator/assign-blank-indices';

const STATEMENT = [
	'Calcule $3 + 4 = ?$.',
	'',
	'```choix',
	'melanger: non',
	'- Oui',
	'- Non',
	'```',
	'',
	'Écris le mot : [_]',
	'',
	'```choix',
	'plusieurs: oui',
	'- $2$',
	'- $3$',
	'- $4$',
	'```',
	'',
	'Fin.'
].join('\n');

describe('statementCaseKinds — genre de chaque case, dans l’ordre du générateur', () => {
	it('formule, choix, texte, choix', () => {
		expect(statementCaseKinds(STATEMENT)).toEqual(['math', 'choice', 'text', 'choice']);
	});

	it('énoncé vide : aucune case', () => {
		expect(statementCaseKinds('')).toEqual([]);
	});

	it('un ```choix dans un bloc de code n’est pas une case', () => {
		const statement = '````\n```choix\n- a\n- b\n```\n````\n\n$x = ?$';
		expect(statementCaseKinds(statement)).toEqual(['math']);
	});
});

describe('readChoiceCase — le n-ième bloc choix de l’énoncé', () => {
	it('réglages et choix dans l’ordre écrit', () => {
		expect(readChoiceCase(STATEMENT, 0)).toMatchObject({
			multiple: false,
			shuffle: false,
			choices: ['Oui', 'Non'],
			errors: [],
			rewritable: true
		});
		expect(readChoiceCase(STATEMENT, 1)).toMatchObject({
			multiple: true,
			shuffle: true,
			choices: ['$2$', '$3$', '$4$']
		});
	});

	it('bloc absent : null', () => {
		expect(readChoiceCase(STATEMENT, 2)).toBeNull();
	});

	it('bloc mal écrit (réglage inconnu) : messages, pas réécrivable', () => {
		const block = readChoiceCase('```choix\nordre: non\n- a\n- b\n```', 0);
		expect(block?.rewritable).toBe(false);
		expect(block?.errors.join(' ')).toContain('ordre');
	});

	it('bloc non fermé : pas réécrivable (la suite de l’énoncé serait avalée)', () => {
		const block = readChoiceCase('```choix\n- a\n- b', 0);
		expect(block?.rewritable).toBe(false);
	});

	it('choix vides (bloc tout juste ajouté) : réécrivable', () => {
		const block = readChoiceCase('```choix\n-\n-\n```', 0);
		expect(block?.choices).toEqual(['', '']);
		expect(block?.rewritable).toBe(true);
	});
});

describe('writeChoiceCase — réécrit un bloc, le reste du texte à l’octet près', () => {
	it('modifie le second bloc seulement', () => {
		const next = writeChoiceCase(STATEMENT, 1, {
			multiple: false,
			shuffle: true,
			choices: ['$2$', '$5$']
		});
		const expected = STATEMENT.replace(
			'```choix\nplusieurs: oui\n- $2$\n- $3$\n- $4$\n```',
			'```choix\n- $2$\n- $5$\n```'
		);
		expect(next).toBe(expected);
	});

	it('`melanger: non` écrit seulement si on ne mélange pas', () => {
		const next = writeChoiceCase(STATEMENT, 0, {
			multiple: false,
			shuffle: true,
			choices: ['Oui', 'Non']
		});
		expect(next).toContain('```choix\n- Oui\n- Non\n```');
	});

	it('choix sur plusieurs lignes avec un bloc : clôture ```` et suite en retrait', () => {
		const choice = 'Celle-ci :\n```horloge\nheure: 3:00\n```';
		const next = writeChoiceCase('Quelle horloge ?\n\n```choix\n- a\n- b\n```', 0, {
			multiple: false,
			shuffle: true,
			choices: [choice, 'b']
		});
		expect(next).toBe(
			'Quelle horloge ?\n\n````choix\n- Celle-ci :\n  ```horloge\n  heure: 3:00\n  ```\n- b\n````'
		);
		expect(readChoiceCase(next, 0)?.choices).toEqual([choice, 'b']);
	});

	it('bloc absent : énoncé inchangé', () => {
		const next = writeChoiceCase(STATEMENT, 5, { multiple: false, shuffle: true, choices: ['a'] });
		expect(next).toBe(STATEMENT);
	});

	it('ignore un ```choix pris dans un bloc de code (même repérage que le générateur)', () => {
		const statement = '````\n```choix\n- x\n- y\n```\n````\n\n```choix\n- a\n- b\n```';
		const next = writeChoiceCase(statement, 0, {
			multiple: false,
			shuffle: true,
			choices: ['a', 'c']
		});
		expect(next).toBe('````\n```choix\n- x\n- y\n```\n````\n\n```choix\n- a\n- c\n```');
	});
});

describe('appendChoiceCase — ajout en fin d’énoncé : la case tombe en dernier', () => {
	it('après le texte, séparé par une ligne vide', () => {
		const next = appendChoiceCase('Vrai ou faux ?\n', {
			multiple: false,
			shuffle: false,
			choices: ['Vrai', 'Faux']
		});
		expect(next).toBe('Vrai ou faux ?\n\n```choix\nmelanger: non\n- Vrai\n- Faux\n```');
	});

	it('énoncé vide : le bloc seul', () => {
		expect(appendChoiceCase('', { multiple: false, shuffle: true, choices: ['', ''] })).toBe(
			'```choix\n-\n-\n```'
		);
	});

	it('la nouvelle case est la dernière, et le générateur la lit', () => {
		const next = appendChoiceCase(STATEMENT, {
			multiple: false,
			shuffle: true,
			choices: ['a', 'b']
		});
		expect(statementCaseKinds(next)).toEqual(['math', 'choice', 'text', 'choice', 'choice']);
		expect(assignBlankIndices(next).choiceErrors ?? []).toEqual([]);
	});
});

describe('readCheckedChoices — bonne réponse de la case, cochée dans la carte', () => {
	it('indices lisibles et dans les choix', () => {
		expect(readCheckedChoices('1', 3)).toEqual([1]);
		expect(readCheckedChoices('2;0', 3)).toEqual([0, 2]);
		expect(readCheckedChoices('', 3)).toEqual([]);
		expect(readCheckedChoices('  ', 3)).toEqual([]);
	});

	it('réponse calculée ou hors des choix : null (champ de texte)', () => {
		expect(readCheckedChoices('{{eval:{{a}}-1}}', 3)).toBeNull();
		expect(readCheckedChoices('3', 3)).toBeNull();
	});
});

describe('choiceIndexesAfterRemoval — un choix supprimé décale les suivants', () => {
	it('retire le choix supprimé, décale les indices au-delà', () => {
		expect(choiceIndexesAfterRemoval([0, 2, 3], 2)).toEqual([0, 2]);
		expect(choiceIndexesAfterRemoval([1], 0)).toEqual([0]);
		expect(choiceIndexesAfterRemoval([1], 1)).toEqual([]);
	});
});

describe('readChoiceCase — `case:` écrit à la main', () => {
	it('pas réécrivable : la réécriture perdrait le réglage', () => {
		expect(readChoiceCase('```choix\ncase: 2\n- a\n- b\n```', 0)?.rewritable).toBe(false);
	});
});

describe('withBlockCases : cases des blocs omises de blanks[], remises à leur rang', () => {
	const FIGURE = '```figure-de-travail\nfenetre: 0 ; 10 ; 0 ; 6\n---\nA = point(1, 1)\n```';
	const OPERATION = '```operation\n12 + 7\ncases: résultat\n```';

	it('figure de travail puis choix, une entrée : elle revient au choix', () => {
		const statement = `${FIGURE}\n\n\`\`\`choix\n- Oui\n- Non\n\`\`\``;
		expect(withBlockCases(['1'], statement, () => '')).toEqual(['', '1']);
	});

	it('opération puis [_], une entrée : elle revient au trou', () => {
		expect(withBlockCases(['5'], `${OPERATION}\n\nEt [_]`, () => '')).toEqual(['', '5']);
	});

	it('liste déjà complète, ou sans bloc, ou d’une autre longueur : rien', () => {
		const statement = `${FIGURE}\n\nEt [_]`;
		expect(withBlockCases(['', 'x'], statement, () => '')).toBeNull();
		expect(withBlockCases(['x'], 'Et [_]', () => '')).toBeNull();
		expect(withBlockCases([], `${statement} et [_]`, () => '')).toBeNull();
	});
});
