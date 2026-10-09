/**
 * `.aide` dans la vue Calcul — décision de David du 2026-10-09
 *
 * Avant : `.aide` affichait l'aide du MOTEUR, écrite pour le développeur, en
 * anglais (« Parse expression and display AST + LaTeX + custom »), avec
 * l'ancienne syntaxe (`.integrate expr[ ; variable] [a b]`) et des commandes
 * internes (parse, tree, hash, let, vars…).
 *
 * Après : une aide en français, pour un élève, avec la syntaxe par mots-clés
 * (`de … à`, `pour`, `en`, `ordre`, `dans`, `et`), un exemple qui MARCHE par
 * commande ; l'ancienne liste reste accessible par `.aide dev`, que l'aide
 * nomme sur sa dernière ligne.
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { runInput, type CalcSession } from '../calcul';
import { commandCatalog } from '../commands';
import { DEV_HELP_COMMAND, studentHelp } from '../help';

function session(): CalcSession {
	return { atelier: new Atelier(), engine: new WebReplEngine() };
}

/** Le texte que l'élève lit sous `.aide`. */
function helpText(input = '.aide'): string {
	const result = runInput(session(), input);
	expect(result.kind, input).toBe('commande');
	return result.kind === 'commande' ? result.output : '';
}

/** Les commandes réservées au développeur : aucune ne s'affiche dans `.aide`. */
const DEV_COMMANDS = [
	'parse',
	'analyser',
	'tree',
	'arbre',
	'latex',
	'custom',
	'texte',
	'normal',
	'forme-normale',
	'hash',
	'empreinte',
	'let',
	'poser',
	'vars',
	'valeurs',
	'unset',
	'oublier',
	'clear',
	'effacer',
	'def',
	'définir',
	"def'",
	'dérivée-de',
	'fns',
	'fonctions',
	'undef',
	'oublier-fonction',
	'inv',
	'réciproque',
	'auto',
	'unitmode',
	'mode-unités',
	'export',
	'exporter'
];

function escape(text: string): string {
	return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

describe('`.aide` : une aide en français, pour un élève', () => {
	it('est en français, sans les descriptions anglaises du moteur', () => {
		const text = helpText();

		expect(text).toContain('Commandes disponibles');
		expect(text).not.toMatch(/Parse expression|display AST|Show or set|Compute|Evaluate/);
		// L'ancienne syntaxe positionnelle a disparu
		expect(text).not.toContain('expr[ ; variable]');
	});

	it('montre la syntaxe par mots-clés, la virgule décimale et les listes', () => {
		const text = helpText();

		expect(text).toContain('.intégrer x^2 de 0 à 1');
		expect(text).toContain('.taylor sin(x) ordre 5 en 0');
		expect(text).toMatch(/\.évaluer x\^2 en x ?= ?3/);
		expect(text).toMatch(/\.résoudre .* dans /);
		expect(text).toContain('.équivalent (x+1)^2 et x^2+2x+1');
		expect(text).toContain('L = 1,5 ; 2 ; 3,5');
		expect(text).toMatch(/f\(x\) = /);
		expect(text).toMatch(/u\(n\+1\) = /);
		expect(text).toContain('.mode exact');
		expect(text).toContain('.mode décimal');
	});

	it('ne liste aucune commande de développeur', () => {
		const text = helpText();

		for (const command of DEV_COMMANDS) {
			expect(text, `.${command}`).not.toMatch(new RegExp(`(^|\\s)\\.${escape(command)}(\\s|$)`));
		}
	});

	it('nomme, sur sa dernière ligne, la commande qui liste les commandes de développeur', () => {
		const lines = helpText().trim().split('\n');

		expect(lines[lines.length - 1]).toContain(DEV_HELP_COMMAND);
		expect(DEV_HELP_COMMAND).toBe('.aide dev');
	});

	it('répond de même à ses raccourcis', () => {
		const expected = helpText('.aide');
		for (const alias of ['.help', '.h', '.?', '.aide']) {
			expect(helpText(alias), alias).toBe(expected);
		}
	});

	it('`.aide intégrer` : pas d’aide par commande, l’aide générale plutôt qu’un refus', () => {
		expect(helpText('.aide intégrer')).toBe(helpText('.aide'));
	});
});

describe('`.aide dev` : les commandes de développeur, toujours là', () => {
	it('affiche l’ancienne liste du moteur', () => {
		const text = helpText(DEV_HELP_COMMAND);

		expect(text).toContain('parse');
		expect(text).toContain('hash');
	});

	it('les commandes de développeur restent utilisables', () => {
		const result = runInput(session(), '.parse x+1');

		expect(result.kind).toBe('commande');
		expect(result.kind === 'commande' && result.output.trim()).not.toBe('');
	});
});

describe('chaque exemple de l’aide marche', () => {
	it('chaque exemple affiché, retapé, réussit', () => {
		const text = helpText();
		const entries = studentHelp(new WebReplEngine()).flatMap((section) => section.entries);
		expect(entries.length).toBeGreaterThan(20);

		for (const entry of entries) {
			// Ce que l'élève lit, c'est ce qu'il retape
			expect(text, entry.example).toContain(entry.example);

			const s = session();
			for (const [name, definition] of Object.entries(entry.listSetup ?? {})) {
				s.atelier.create({ kind: 'list', name, definition });
			}
			for (const line of entry.setup ?? []) {
				expect(runInput(s, line).kind, `${entry.example} (avant : ${line})`).not.toBe('refus');
			}
			const result = runInput(s, entry.example);
			expect(result.kind, entry.example).not.toBe('refus');
			expect(result.kind, entry.example).not.toBe('vide');
			if (result.kind === 'commande' || result.kind === 'calcul') {
				const empty = result.output.trim() === '' && result.latex === undefined;
				expect(empty, `« ${entry.example} » rend une ligne vide`).toBe(false);
			}
		}
	});

	it('toute commande du catalogue est soit dans l’aide, soit une commande de développeur', () => {
		const engine = new WebReplEngine();
		const shown = new Set(
			studentHelp(engine)
				.flatMap((section) => section.entries)
				.map((entry) => entry.command)
		);

		for (const command of commandCatalog(engine)) {
			// `.aide` elle-même : nommée en tête et en pied de l'aide
			if (shown.has(command.name) || command.name === 'help') continue;
			// `.exact` et `.décimal` : raccourcis de `.mode exact` / `.mode décimal`
			if (command.name === 'exact' || command.name === 'decimal') continue;
			expect(
				DEV_COMMANDS.includes(command.name) || DEV_COMMANDS.includes(command.french),
				`.${command.french} n’est ni dans l’aide ni une commande de développeur`
			).toBe(true);
		}
	});
});

describe('`.mode` répond en français', () => {
	const EXACT = 'Mode exact : les résultats restent exacts (fractions, racines).';
	const DECIMAL = 'Mode décimal : les résultats sont donnés en valeur approchée.';

	function outputs(...inputs: string[]): string[] {
		const s = session();
		return inputs.map((input) => {
			const result = runInput(s, input);
			return result.kind === 'commande' || result.kind === 'calcul'
				? result.output
				: `${result.kind}`;
		});
	}

	it('`.mode exact` / `.mode décimal` (et sans accent, et leurs raccourcis)', () => {
		expect(outputs('.mode décimal', '.mode exact', '.mode decimal')).toEqual([
			DECIMAL,
			EXACT,
			DECIMAL
		]);
		expect(outputs('.décimal', '.exact')).toEqual([DECIMAL, EXACT]);
	});

	it('change vraiment le mode', () => {
		expect(outputs('.mode décimal', '1/4')[1]).toContain('0,25');
	});

	it('`.mode` seul dit le mode actuel', () => {
		const [exact, , decimal] = outputs('.mode', '.mode décimal', '.mode');
		expect(exact).toMatch(/^Mode actuel : exact\./);
		expect(decimal).toMatch(/^Mode actuel : décimal\./);
		expect(exact).not.toMatch(/Current|mode set/i);
	});
});
