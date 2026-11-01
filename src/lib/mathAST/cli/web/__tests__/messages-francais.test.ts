/**
 * Les messages d'erreur de la console de Calcul, en français (2026-10-12, « ok continue ») :
 * les parseurs répondaient « Unexpected token: EOF », « Unknown command: \foo »… La traduction
 * se fait à la sortie de la console (les parseurs et leurs tests gardent leurs messages).
 */

import { describe, it, expect } from 'vitest';
import { WebReplEngine } from '../web-repl-engine';

const ENGLISH =
	/\b(Unexpected|Expected|Unknown|Missing|Invalid|Cannot|Empty|Failed|Could not|Division by|Indeterminate|Consecutive|Parse error|Error \[|Mismatched|got)\b/;

function run(input: string) {
	return new WebReplEngine().execute(input);
}

describe('les erreurs de lecture courantes, en français', () => {
	it.each([
		['2+', /incomplète/],
		['sin(', /incomplète/],
		['(2+3', /Il manque « \) »/],
		['2+3)', /« \) » inattendu/],
		['2*/3', /« \/ » inattendu/],
		['2++3', /Deux signes à la suite/],
		['\\frac{1}', /dénominateur/],
		['\\foo', /Commande inconnue : \\foo/],
		['.unknown', /Commande inconnue : \.unknown/],
		['g(2)', /Fonction inconnue : g/],
		['1/0', /Division par zéro/],
		['\\left(2', /\\right/],
		['\\text{abc}', /« abc »/],
		['@zz{2}', /Couleur inconnue : zz/],
		['5[zz]', /Unité inconnue : zz/],
		['2+.5[m]', /zéro avant le point décimal : écris 0\.5/],
		['\\binom{2}', /\\binom/],
		['\\lim_{x} x', /\\to/],
		['log_(2)', /indice/],
		['\\begin{foo}', /Environnement inconnu : foo/],
		["f'(2)", /f'/],
		['2|x', /Valeur absolue non fermée/],
		['| 2 + 3', /Valeur absolue non fermée/],
		// V44 : restaient en anglais (2026-10-13)
		[
			'\\begin{matrix}1\\end{pmatrix}',
			/Environnements différents : \\begin\{matrix\} fermé par \\end\{pmatrix\}/
		],
		['\\left(2\\right]', /Il manque « \) » après \\right : « \] » trouvé/],
		['\\left 2', /\\left/]
	])('%s', (input, expected) => {
		const line = run(input);

		expect(line.success).toBe(false);
		expect(line.output).toMatch(expected);
		expect(line.output).not.toMatch(ENGLISH);
		expect(line.error?.message ?? '').not.toMatch(ENGLISH);
	});

	it('2+3) : ni la sortie ni le message n’ont d’en-tête anglais', () => {
		const line = run('2+3)');

		expect(`${line.output}\n${line.error?.message ?? ''}`).not.toMatch(ENGLISH);
	});

	it('un message inconnu de la table : une formule française, jamais l’anglais', () => {
		// « Expected delimiter after \\left, got 2 » n'est pas dans la table
		const line = run('\\left 2');

		expect(line.success).toBe(false);
		expect(line.output).not.toMatch(ENGLISH);
	});

	it('une réussite n’est pas touchée', () => {
		expect(run('2+3').output).toBe('5');
	});
});

// Revue : la traduction passait sur le HTML final (balises avalées, saisie recopiée réécrite)
// et la formule générique écrasait des messages déjà français ou leur consigne
describe('la traduction ne touche que le message', () => {
	it('2+3) : le message traduit', () => {
		expect(run('2+3)').output).toContain('« ) » inattendu ici');
	});

	// La sortie texte ne recopie pas la saisie (seul l'ancien HTML le faisait, retiré le
	// 2026-10-25) : on vérifie que les mots tapés ne changent pas la traduction
	it('x + Unknown) : les mots tapés ne changent pas la traduction', () => {
		expect(run('x + Unknown)').output).toBe('« ) » inattendu ici');
	});

	it('(2+3 : traduit aussi, avec ses guillemets', () => {
		expect(run('(2+3').output).toMatch(/Il manque « \) »/);
	});

	it('f(x : il manque « ) »', () => {
		expect(run('f(x').output).toMatch(/Il manque « \) »/);
	});

	it('un message déjà français n’est pas écrasé', () => {
		expect(run('Invalid(2)').output).toMatch(/Fonctions disponibles/);
	});

	it.each([
		['.mode zz', /exact/],
		['.taylor sin(x)', /Forme attendue/],
		['.def-deriv f 2x', /Commande inconnue/]
	])('%s : la consigne reste, en français', (input, expected) => {
		const line = run(input);
		// L'atelier lit `error.message` quand la sortie est vide (une commande)
		const shown = line.output || line.error?.message || '';

		expect(shown).toMatch(expected);
		expect(shown).not.toMatch(ENGLISH);
		expect(shown).not.toMatch(/\b(Use|Usage|Type \.help|Example)\b/);
	});

	it('.unknown : le même nom de commande dans la sortie et dans le message', () => {
		const line = run('.unknown');

		expect(line.output).toMatch(/Commande inconnue : \.unknown/);
		expect(line.error?.message).toMatch(/Commande inconnue : \.unknown/);
		expect(line.output).not.toMatch(/Hint|Type \.help/);
	});
});

// 2ᵉ revue : « Écriture non reconnue » là où rien n'était écrit, de l'anglais dans les consignes
describe('les commandes sans argument et les consignes', () => {
	const shown = (input: string) => {
		const line = run(input);
		return {
			message: line.error?.message ?? '',
			all: `${line.output}\n${line.error?.message ?? ''}`
		};
	};

	it.each(['.stats', '.stats a;b', '.simplify', '.integrate', '.solve', '.taylor sin(x)'])(
		'%s : ni « Écriture non reconnue », ni anglais',
		(input) => {
			const { message, all } = shown(input);

			expect(message).not.toMatch(/Écriture non reconnue/);
			expect(all).not.toMatch(ENGLISH);
			expect(all).not.toMatch(/\b(order|center|lower|upper|params|name)\b/);
		}
	);
});

// Même remarque : la sortie texte ne recopie pas la saisie
describe('des mots tapés qui ressemblent à un en-tête', () => {
	it.each(['Hint: 2)', 'Parse error: 2)'])('%s', (input) => {
		expect(run(input).output).toBe('« ) » inattendu ici');
	});
});

// V61 (2026-10-14) : les refus du moteur d'intégration remontaient en anglais
// (« Unable to factor denominator », « Technique tentée: partial-fractions »)
describe('les refus de .integrate, en français', () => {
	const INTEGRATION_ENGLISH =
		/\b(Unable|Not a|not supported|not yet|pattern detected|skeleton|integrator|partial-fractions|u-substitution|basic-rule|trig-substitution)\b/;

	it.each([
		'.integrate 1/(x^2+a^2+1)',
		'.integrate 1/(x^2+a^2+1) 0 1',
		'.integrate 3/(x^2+a^2+1) 0 1',
		'.integrate e^(x^2)',
		'.integrate 1/(x^3+a)'
	])('%s', (input) => {
		const line = run(input);
		const all = `${line.output}\n${line.error?.message ?? ''}`;

		expect(line.success).toBe(false);
		expect(all).not.toMatch(ENGLISH);
		expect(all).not.toMatch(INTEGRATION_ENGLISH);
	});
});

// V46 (2026-10-13) : une expression bien lue mais que `.variations` ne sait pas dériver
// répondait « Écriture non reconnue », qui fait croire à une faute de saisie
describe('.variations refuse sans accuser la saisie', () => {
	it.each(['.variations \\frac{1}{|x|-2}', '.variations |x^2-1|'])('%s', (input) => {
		const line = run(input);

		expect(line.success).toBe(false);
		expect(line.error?.message).toBe(
			'Je ne sais pas encore dériver cette fonction : son sens de variation n’est pas étudié'
		);
		expect(`${line.output}\n${line.error?.message ?? ''}`).not.toMatch(/non reconnue/);
	});
});
