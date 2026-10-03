/**
 * Accents combinants « de symbole » dans un texte de figure
 * =========================================================
 *
 * `n⃗` = n + U+20D7 (flèche combinante). Ni la police du texte du PDF ni celles
 * de l'écran ne savent toujours la poser : carrés vides au PDF (typst.ts), carré
 * à l'écran selon la police. Le texte est donc découpé en morceaux : texte
 * simple, ou lettre surmontée d'un accent, que chaque sortie dessine elle-même
 * (mode math `arrow(n)` au PDF, flèche posée au-dessus de la lettre à l'écran).
 *
 * @module geometry-core/rendering/combining-accents
 */

export type CombiningAccent = 'arrow' | 'arrow.l' | 'arrow.l.r' | 'harpoon';

export type TextRun =
	| { kind: 'text'; text: string }
	| { kind: 'accent'; base: string; accent: CombiningAccent };

/** Accent combinant (U+20D0–U+20FF) → nom de l'accent (celui du mode math de Typst) */
const ACCENTS: Readonly<Record<string, CombiningAccent>> = {
	'⃗': 'arrow',
	'⃖': 'arrow.l',
	'⃡': 'arrow.l.r',
	'⃑': 'harpoon'
};

/** Glyphe de l'accent, posé au-dessus de la lettre à l'écran */
export const ACCENT_GLYPH: Readonly<Record<CombiningAccent, string>> = {
	arrow: '→',
	'arrow.l': '←',
	'arrow.l.r': '↔',
	harpoon: '⇀'
};

const COMBINING = /[⃐-⃿]/u;
const ACCENTED = /([\p{L}\p{N}])([⃗⃖⃡⃑])/gu;

export function hasCombiningAccent(text: string): boolean {
	return COMBINING.test(text);
}

/**
 * Découpe un texte en morceaux simples et lettres accentuées. Un accent
 * combinant isolé ou non pris en charge est ôté (sinon : carré vide).
 */
export function splitCombiningAccents(text: string): TextRun[] {
	const runs: TextRun[] = [];
	const pushText = (t: string) => {
		const clean = t.replace(/[⃐-⃿]/gu, '');
		if (clean) runs.push({ kind: 'text', text: clean });
	};
	let last = 0;
	for (const m of text.matchAll(ACCENTED)) {
		const index = m.index ?? 0;
		pushText(text.slice(last, index));
		runs.push({ kind: 'accent', base: m[1], accent: ACCENTS[m[2]] });
		last = index + m[0].length;
	}
	pushText(text.slice(last));
	return runs;
}
