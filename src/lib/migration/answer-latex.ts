/**
 * Réponse attendue écrite `p/q` → LaTeX
 * =====================================
 *
 * Le correcteur lit la réponse attendue en LaTeX : `{{a}}/{{b}}` y est une division
 * « en ligne », et la saisie MathLive `\frac{5}{3}` de l'élève était refusée pour
 * mauvaise forme. Une réponse convertie qui contient une barre de fraction HORS des
 * marqueurs `{{…}}` est donc réécrite en LaTeX (`\dfrac{{{a}}}{{{b}}}`).
 *
 * Les marqueurs sont protégés par des lettres majuscules le temps de la conversion
 * (syntaxe maison → mathAST → LaTeX), puis remis à leur place.
 */

import { parseCustom } from '$lib/mathAST/parser/custom';
import { toLatex } from '$lib/mathAST/latex-generator';

// Lettres de remplacement : absentes des commandes LaTeX produites (`\exponentialE` a un E)
const PLACEHOLDER_LETTERS = ['Q', 'W', 'Z', 'K', 'J', 'V', 'Y', 'X', 'U', 'G'];

/** Découpe les marqueurs `{{…}}` (imbrications comprises) ; `{{{x}}}` = groupe + marqueur */
function extractMarkers(answer: string): { text: string; markers: string[] } | null {
	const markers: string[] = [];
	let text = '';
	let i = 0;
	while (i < answer.length) {
		const startsMarker =
			answer.startsWith('{{', i) && !(answer.startsWith('{{{', i) && answer[i + 3] !== '{');
		if (!startsMarker) {
			text += answer[i];
			i++;
			continue;
		}
		let depth = 0;
		let end = i;
		for (; end < answer.length; end++) {
			if (answer[end] === '{') depth++;
			else if (answer[end] === '}') depth--;
			if (depth === 0) break;
		}
		if (depth !== 0) return null; // accolades déséquilibrées
		markers.push(answer.slice(i, end + 1));
		text += `\u0000${markers.length - 1}\u0000`;
		i = end + 1;
	}
	return { text, markers };
}

/**
 * `{{a}}/{{b}}` → `\dfrac{{{a}}}{{{b}}}`. Toute réponse sans barre hors marqueurs, ou qui
 * ne se lit pas en syntaxe maison, est rendue telle quelle.
 */
export function slashFractionsToLatex(answer: string): string {
	const extracted = extractMarkers(answer);
	if (!extracted || !extracted.text.includes('/')) return answer;
	const { text, markers } = extracted;
	// Réponse en mots ou avec unité (`… de la tarte`, `… cm`) : pas une formule à convertir
	if (/[a-zA-Z]{2,}/.test(text.replace(/(?:sqrt|ln|exp|log|sin|cos|tan)\(/g, '('))) return answer;

	const free = PLACEHOLDER_LETTERS.filter((letter) => !text.includes(letter));
	if (markers.length > free.length) return answer;
	const withLetters = text.replace(/\u0000(\d+)\u0000/g, (_m, n: string) => free[Number(n)]);

	let latex: string;
	try {
		latex = toLatex(parseCustom(withLetters));
	} catch {
		return answer;
	}

	markers.forEach((marker, n) => {
		const letter = free[n];
		// En exposant ou en indice, le marqueur garde ses accolades (`3^{12}`, pas `3^12`)
		latex = latex.replace(
			new RegExp(`([\\^_])${letter}(?![a-zA-Z])`, 'g'),
			(_m, script: string) => `${script}{${marker}}`
		);
		latex = latex.replace(new RegExp(`(?<![\\\\a-zA-Z])${letter}(?![a-zA-Z])`, 'g'), () => marker);
	});
	return latex;
}
