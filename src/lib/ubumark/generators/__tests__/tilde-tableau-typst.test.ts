/**
 * Formule `~…~` dans une cellule de tableau, au PDF (écart V10, 2026-10-10)
 *
 * Défaut : une cellule ne reconnaissait que `$…$` ; `~x^2+1~` s'imprimait en
 * clair. Une formule `~…~` en cellule doit sortir comme dans un paragraphe.
 * Les `~` d'espace insécable À L'INTÉRIEUR de `$…$` (durées : `1~\unit{h}`,
 * contenu réel publié) ne sont pas des formules : sortie inchangée.
 */
import { describe, it, expect } from 'vitest';
import { parseMarkdown } from '$lib/ubumark';
import { generateTypst, processTableCellContent } from '../typst-generator';

const body = (md: string, language?: string) =>
	(generateTypst(parseMarkdown(md), { includeSetup: false, language }).split(
		'// ubumark: fin de l’en-tête'
	)[1] ?? '') as string;

/** La formule Typst produite par un PARAGRAPHE pour `~expr~` */
function paragraphMath(expression: string, language?: string): string {
	const match = /\$[^$]+\$/.exec(body(`~${expression}~`, language));
	if (!match) throw new Error(`pas de formule pour ${expression}`);
	return match[0];
}

describe('formule ~…~ dans une cellule de tableau (PDF)', () => {
	it.each(['x^2+1', '3[m]', '1/2', 'sqrt(2)'])('`~%s~` sort comme dans un paragraphe', (expr) => {
		const sortie = body(`| a |\n| --- |\n| ~${expr}~ |`);
		expect(sortie).toContain(`[${paragraphMath(expr)}]`);
		expect(sortie).not.toContain('~');
	});

	it('texte et formule mêlés dans une cellule', () => {
		expect(processTableCellContent('environ ~3[m]~ de haut')).toBe(
			`environ ${paragraphMath('3[m]')} de haut`
		);
	});

	it('nombres selon la langue (anglais : point)', () => {
		expect(processTableCellContent('~0.5~', 'en')).toBe(paragraphMath('0.5', 'en'));
	});

	it('`~` d’espace insécable dans `$…$` : inchangé (durées publiées)', () => {
		expect(processTableCellContent('${{a}}~\\unit{h}$')).toBe('$a thin upright("h")$');
		expect(processTableCellContent('$1~\\unit{h}~30~\\unit{min}$')).toBe(
			'$1 thin upright("h") 30 thin upright("min")$'
		);
	});

	it('`\\~` échappé : reste du texte', () => {
		expect(processTableCellContent('a \\~ b')).toBe('a \\\\~ b');
	});
});
