/**
 * Garde `\textcolor` hors `$` (chantier questions-2de, § 58-59, décision du 2026-11-02)
 *
 * Le rendu est jugé : un `\textcolor` entre `$` est une formule colorée (juste), hors `$`
 * l'élève lit le LaTeX brut (faux), y compris quand il n'apparaît qu'au tirage
 * (variable qui porte la couleur) ou dans le corrigé.
 */
import { describe, it, expect } from 'vitest';
import type { QuestionTemplate } from '$lib/questions/types';
import { findTextcolorOutsideMath, formatTextcolorReport } from '../textcolor-hors-maths';

function modele(statement: string, steps: string[] = [], extra: Record<string, unknown> = {}) {
	return {
		id: 't',
		title: 't',
		grades: ['2'],
		level: 1,
		status: 'draft',
		variations: [
			{
				// Une case choix : l'énoncé à juger reste du texte libre
				statement: `${statement}\n\n\`\`\`choix\n- oui\n- non\n\`\`\``,
				variables: [{ name: 'a', expression: '2..9' }],
				blanks: [{ expectedAnswer: '0' }],
				correction: { steps },
				...extra
			}
		]
	} as unknown as QuestionTemplate;
}

describe('findTextcolorOutsideMath', () => {
	it('nominal : couleur entre $ → aucun signalement, tirages comptés', () => {
		const report = findTextcolorOutsideMath(
			modele('Que vaut $\\textcolor{blue}{{{a}}}$ ?', ['$\\textcolor{red}{{{a}}}$']),
			10
		);
		expect(report).toEqual({ checked: 10, findings: [] });
		expect(formatTextcolorReport(report)).toContain('0 sur 10');
	});

	it('erreur : couleur hors $ dans l’énoncé → chaque tirage signalé', () => {
		const report = findTextcolorOutsideMath(modele('Que vaut \\textcolor{blue}{{{a}}} ?'), 5);
		expect(report.findings).toHaveLength(5);
		expect(report.findings[0]).toMatchObject({ variationIndex: 0, seed: 1 });
		expect(report.findings[0].excerpt.startsWith('\\textcolor{blue}')).toBe(true);
		expect(formatTextcolorReport(report)).toContain('5 tirage(s) sur 5');
	});

	it('erreur : couleur hors $ dans le corrigé seulement', () => {
		const report = findTextcolorOutsideMath(
			modele('Que vaut $a$ ?', ['On trouve \\textcolor{red}{{{a}}}.']),
			3
		);
		expect(report.findings).toHaveLength(3);
	});

	it('limite : texte en code en ligne → pas signalé (affiché comme du code, voulu)', () => {
		const report = findTextcolorOutsideMath(modele('La commande `\\textcolor` colore.'), 3);
		expect(report.findings).toEqual([]);
	});

	it('limite : couleur apportée par une variable texte, hors $', () => {
		const report = findTextcolorOutsideMath(
			modele('Que vaut {{c}} ?', [], {
				variables: [
					{ name: 'a', expression: '2..9' },
					{ name: 'c', expression: '"\\\\textcolor{blue}{3}"' }
				]
			}),
			2
		);
		expect(report.checked).toBe(2);
		expect(report.findings).toHaveLength(2);
	});

	it('erreur : couleur hors $ dans un choix ; entre $ → juste', () => {
		const choix = (contenu: string) =>
			findTextcolorOutsideMath(
				modele('Laquelle ?', [], {
					statement: `Laquelle ?\n\n\`\`\`choix\n- ${contenu}\n- non\n\`\`\``
				}),
				2
			).findings;
		expect(choix('\\textcolor{red}{2}')).toHaveLength(2);
		expect(choix('$\\textcolor{red}{2}$')).toEqual([]);
	});

	it('erreur : couleur hors $ dans une cellule de tableau ; entre $ → juste', () => {
		const cellule = (contenu: string) =>
			findTextcolorOutsideMath(modele(`| a | b |\n|---|---|\n| ${contenu} | 1 |`), 2).findings;
		expect(cellule('\\textcolor{red}{2}')).toHaveLength(2);
		expect(cellule('$\\textcolor{red}{2}$')).toEqual([]);
	});

	it('erreur : couleur hors $ dans le texte d’un lien', () => {
		const report = findTextcolorOutsideMath(modele('Voir [\\textcolor{red}{ici}](#x).'), 2);
		expect(report.findings).toHaveLength(2);
	});

	it('erreur : couleur hors $ dans un retour feedback', () => {
		const report = findTextcolorOutsideMath(
			modele('Que vaut $a$ ?', [], {
				correction: { feedback: { incorrect: 'Revois \\textcolor{red}{le signe}.' } }
			}),
			2
		);
		expect(report.findings).toHaveLength(2);
	});
});
