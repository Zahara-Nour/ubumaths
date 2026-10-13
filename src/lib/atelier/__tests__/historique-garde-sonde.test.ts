/**
 * Sonde de la liste blanche (`safe-latex.ts`) contre MathLive LUI-MÊME.
 *
 * La liste blanche ne vaut que si aucune de ses commandes ne recopie un
 * argument dans un ATTRIBUT HTML : chaque commande et chaque environnement
 * permis est composé ici par `convertLatexToMarkup` (le chemin de `CalculView`)
 * avec des arguments piégés, et le balisage rendu est fouillé.
 */

import { describe, it, expect } from 'vitest';
import { convertLatexToMarkup } from 'mathlive';
import { ENVIRONMENTS, MATH_COMMANDS, isSafeLatex } from '../safe-latex';

/** Une marque, et du CSS qui la porterait dans un `style` s'il passait. */
const TRAP = 'zzevil;background:url(zzevil)';

/** Les valeurs d'attributs du balisage rendu. */
function attributeValues(markup: string): string[] {
	return [...markup.matchAll(/\s([\w:-]+)="([^"]*)"/g)].map(
		([, name, value]) => `${name}=${value}`
	);
}

function render(latex: string): string {
	try {
		return convertLatexToMarkup(latex, { defaultMode: 'inline-math' });
	} catch {
		return '';
	}
}

describe('aucune commande permise ne recopie un argument dans un attribut', () => {
	// Les formes d’arguments de `\htmlStyle`, `\htmlData`, `\href`, `\enclose`, `\bbox`
	const shapes = (command: string) => [
		`\\${command}{${TRAP}}{${TRAP}}`,
		`\\${command}[${TRAP}]{${TRAP}}{${TRAP}}`,
		`\\${command}{k=zzevil}{x}`,
		`\\${command}{https://zzevil.example}{x}`,
		`\\${command}{box}[${TRAP}]{x}`,
		`\\${command} ${TRAP}`
	];

	it.each([...MATH_COMMANDS])('\\%s', (command) => {
		for (const latex of shapes(command)) {
			const markup = render(latex);
			const attributes = attributeValues(markup);
			expect(attributes.filter((a) => a.includes('zzevil'))).toEqual([]);
			// Ni lien, ni identifiant, ni donnée, ni image : rien qui sorte de la page
			expect(attributes.filter((a) => /^(href|id|data-[\w-]*|src)=/.test(a))).toEqual([]);
		}
	});

	it.each([...ENVIRONMENTS])('\\begin{%s}', (environment) => {
		const latex = `\\begin{${environment}}{${TRAP}}${TRAP} & ${TRAP} \\\\ x\\end{${environment}}`;
		expect(isSafeLatex(latex)).toBe(true);

		const attributes = attributeValues(render(latex));

		expect(attributes.filter((a) => a.includes('zzevil'))).toEqual([]);
	});
});
