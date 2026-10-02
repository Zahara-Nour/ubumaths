import { describe, expect, it } from 'vitest';
import { splitCorrectionDetail } from '../correction-detail';

/**
 * Correction concise / détaillée (ADR 0017, spécification D1–D6) : une
 * transformation de texte AVANT le rendu produit les deux versions.
 */

describe('splitCorrectionDetail — D4 sans marqueur', () => {
	it('versions identiques, pas de détail, pas d’erreur', () => {
		const md = 'On calcule $2 + 3 = 5$.\n\n$$\\begin{align} a &= b \\\\ &= c \\end{align}$$';
		const r = splitCorrectionDetail(md);
		expect(r.concise).toBe(md);
		expect(r.detailed).toBe(md);
		expect(r.hasDetails).toBe(false);
		expect(r.conciseEmpty).toBe(false);
		expect(r.errors).toEqual([]);
	});

	it('chaîne vide : tout vide, rien à signaler', () => {
		const r = splitCorrectionDetail('');
		expect(r).toEqual({
			concise: '',
			detailed: '',
			hasDetails: false,
			conciseEmpty: false,
			errors: []
		});
	});
});

describe('splitCorrectionDetail — \\detail{…} (D1, D2)', () => {
	it('dans $…$ : retiré en concis, enveloppe retirée en détaillé', () => {
		const r = splitCorrectionDetail('$x = 2 + 3 \\detail{= 4 + 1} = 5$');
		expect(r.concise).toBe('$x = 2 + 3  = 5$');
		expect(r.detailed).toBe('$x = 2 + 3 = 4 + 1 = 5$');
		expect(r.hasDetails).toBe(true);
		expect(r.errors).toEqual([]);
	});

	it('accolades imbriquées respectées', () => {
		const r = splitCorrectionDetail('$$a \\detail{= \\dfrac{1}{2} \\times {2}} = 1$$');
		expect(r.detailed).toBe('$$a = \\dfrac{1}{2} \\times {2} = 1$$');
		expect(r.concise).toBe('$$a  = 1$$');
	});

	it('cas réel : rangée entière d’un align sur une seule ligne', () => {
		const md =
			'$$\\begin{align} 9 \\times a &= 10 \\times a - a \\\\ \\detail{&= 90 - 9 \\\\} &= 81 \\end{align}$$';
		const r = splitCorrectionDetail(md);
		expect(r.detailed).toBe(
			'$$\\begin{align} 9 \\times a &= 10 \\times a - a \\\\ &= 90 - 9 \\\\ &= 81 \\end{align}$$'
		);
		expect(r.concise).toBe(
			'$$\\begin{align} 9 \\times a &= 10 \\times a - a \\\\  &= 81 \\end{align}$$'
		);
		expect(r.errors).toEqual([]);
	});

	it('align sur plusieurs lignes : plusieurs rangées en détail', () => {
		const md = [
			'$$\\begin{align}',
			'A &= (x+1)^2 \\\\',
			'\\detail{&= x^2 + 2 \\times x \\times 1 + 1^2 \\\\}',
			'&= x^2 + 2x + 1',
			'\\end{align}$$'
		].join('\n');
		const r = splitCorrectionDetail(md);
		expect(r.detailed).toContain('&= x^2 + 2 \\times x \\times 1 + 1^2 \\\\\n&= x^2 + 2x + 1');
		expect(r.concise).not.toContain('1^2');
		expect(r.concise).toContain('A &= (x+1)^2 \\\\');
		expect(r.concise).toContain('&= x^2 + 2x + 1');
	});

	it('\\{ et \\} échappés ne comptent pas', () => {
		const r = splitCorrectionDetail('$S = \\detail{\\{1 ; 2\\} \\cup} \\{3\\}$');
		expect(r.detailed).toBe('$S = \\{1 ; 2\\} \\cup \\{3\\}$');
		expect(r.concise).toBe('$S =  \\{3\\}$');
		expect(r.errors).toEqual([]);
	});

	it('détail en dernière rangée : pas de rangée vide laissée en concis', () => {
		const r = splitCorrectionDetail('$$\\begin{align} a &= b \\\\ \\detail{&= c} \\end{align}$$');
		expect(r.concise).toBe('$$\\begin{align} a &= b \\end{align}$$');
	});

	it('formule entièrement en détail : les délimiteurs disparaissent avec elle', () => {
		const r = splitCorrectionDetail('Donc $\\detail{a = 2}$ et $b = 3$.');
		expect(r.detailed).toBe('Donc $a = 2$ et $b = 3$.');
		expect(r.concise).not.toContain('$$');
		expect(r.concise).toContain('$b = 3$');
	});

	it('marqueurs multiples', () => {
		const r = splitCorrectionDetail('$a \\detail{= b} = c$ puis $d \\detail{= e} = f$');
		expect(r.detailed).toBe('$a = b = c$ puis $d = e = f$');
		expect(r.concise).toBe('$a  = c$ puis $d  = f$');
	});

	it('\\details ou \\detailed ne sont pas des marqueurs', () => {
		const md = '$\\detailed{x}$';
		const r = splitCorrectionDetail(md);
		expect(r.hasDetails).toBe(false);
		expect(r.detailed).toBe(md);
	});
});

describe('splitCorrectionDetail — D3 variables {{…}} intactes', () => {
	it('avant résolution : {{a}} dans et hors du détail', () => {
		const r = splitCorrectionDetail('$x = {{a}} \\detail{= {{b}} + {{c}}} = {{d}}$');
		expect(r.detailed).toBe('$x = {{a}} = {{b}} + {{c}} = {{d}}$');
		expect(r.concise).toBe('$x = {{a}}  = {{d}}$');
		expect(r.errors).toEqual([]);
	});

	it('variable collée à l’accolade fermante', () => {
		const r = splitCorrectionDetail('$\\detail{x = {{a}}}$ et $y$');
		expect(r.detailed).toBe('$x = {{a}}$ et $y$');
		expect(r.errors).toEqual([]);
	});

	it('après résolution : même résultat avec les valeurs', () => {
		const r = splitCorrectionDetail('$x = 4 \\detail{= 1 + 3} = 4$');
		expect(r.detailed).toBe('$x = 4 = 1 + 3 = 4$');
		expect(r.concise).toBe('$x = 4  = 4$');
	});
});

describe('splitCorrectionDetail — encadrés > [!type] (D1)', () => {
	it('> [!rappel] : bloc entier retiré en concis, gardé en détaillé', () => {
		const md =
			'On développe.\n\n> [!rappel] $(a+b)^2 = a^2 + 2ab + b^2$\n> pour tous réels.\n\nDonc $A = x^2$.';
		const r = splitCorrectionDetail(md);
		expect(r.detailed).toBe(md);
		expect(r.concise).toBe('On développe.\n\nDonc $A = x^2$.');
		expect(r.hasDetails).toBe(true);
	});

	it('méthode accentuée, sans accent, en majuscules', () => {
		for (const word of ['méthode', 'methode', 'Méthode', 'METHODE']) {
			const r = splitCorrectionDetail(`> [!${word}]\n> On isole $x$.\n\n$x = 2$`);
			expect(r.concise, word).toBe('$x = 2$');
			expect(r.errors, word).toEqual([]);
		}
	});

	it('> [!attention] retiré en concis', () => {
		const r = splitCorrectionDetail('$x = 2$\n\n> [!attention] Ne pas oublier le signe.');
		expect(r.concise).toBe('$x = 2$');
		expect(r.detailed).toContain('[!attention]');
	});

	it('une citation ordinaire reste dans les deux versions', () => {
		const md = '> Une citation.\n\n$x = 2$';
		const r = splitCorrectionDetail(md);
		expect(r.concise).toBe(md);
		expect(r.hasDetails).toBe(false);
	});
});

describe('splitCorrectionDetail — détails en ligne [texte]{.type} (D1)', () => {
	it('{.rappel} retiré en concis, gardé tel quel en détaillé', () => {
		const md = 'On factorise [car $a^2 - b^2 = (a-b)(a+b)$]{.rappel} et on conclut.';
		const r = splitCorrectionDetail(md);
		expect(r.detailed).toBe(md);
		expect(r.concise).toBe('On factorise et on conclut.');
		expect(r.hasDetails).toBe(true);
	});

	it('les quatre types, accentués ou non', () => {
		for (const word of ['rappel', 'méthode', 'methode', 'attention', 'calcul']) {
			const r = splitCorrectionDetail(`A [x]{.${word}} B`);
			expect(r.concise, word).toBe('A B');
			expect(r.errors, word).toEqual([]);
		}
	});

	it('un lien markdown n’est pas un détail', () => {
		const md = 'Voir [le cours](https://exemple.fr).';
		expect(splitCorrectionDetail(md).hasDetails).toBe(false);
	});
});

describe('splitCorrectionDetail — D5 marqueurs mal formés', () => {
	it('accolade non fermée : jamais d’exception, message d’auteur, concis = détaillé', () => {
		const r = splitCorrectionDetail('$a \\detail{= b + c$ et $\\detail{= d}$');
		expect(r.errors.length).toBeGreaterThan(0);
		expect(r.errors[0]).toMatch(/non fermé/);
		expect(r.hasDetails).toBe(false);
		expect(r.concise).toBe(r.detailed);
		// Le marqueur cassé ne laisse pas son \detail{ à l'élève
		expect(r.detailed).not.toContain('\\detail{');
	});

	it('\\detail{} vide signalé', () => {
		const r = splitCorrectionDetail('$a \\detail{} = b$');
		expect(r.errors[0]).toMatch(/vide/);
		expect(r.concise).toBe(r.detailed);
	});

	it('type d’encadré inconnu signalé, bloc gardé en citation', () => {
		const md = '> [!truc] Quelque chose.\n\n$x = 2$';
		const r = splitCorrectionDetail(md);
		expect(r.errors[0]).toMatch(/truc/);
		expect(r.detailed).toBe(md);
		expect(r.concise).toBe(md);
	});

	it('type en ligne inconnu signalé', () => {
		const r = splitCorrectionDetail('A [x]{.truc} B');
		expect(r.errors[0]).toMatch(/truc/);
		expect(r.concise).toBe('A [x]{.truc} B');
	});

	it('une erreur annule tout le concis, même avec d’autres marqueurs corrects', () => {
		const r = splitCorrectionDetail('$a \\detail{= b} = c$\n\n> [!truc] x');
		expect(r.concise).toBe(r.detailed);
		expect(r.detailed).toContain('$a = b = c$');
	});
});

describe('splitCorrectionDetail — D6 tout est détail', () => {
	it('version concise vide signalée', () => {
		const r = splitCorrectionDetail('> [!méthode] On isole $x$.\n\n$\\detail{x = 2}$');
		expect(r.hasDetails).toBe(true);
		expect(r.conciseEmpty).toBe(true);
		expect(r.concise.trim()).toBe('');
	});

	it('version concise non vide : conciseEmpty faux', () => {
		const r = splitCorrectionDetail('$x \\detail{= 1 + 1} = 2$');
		expect(r.conciseEmpty).toBe(false);
	});
});

describe('splitCorrectionDetail — blocs de code', () => {
	it('un marqueur dans un bloc de code n’est pas touché', () => {
		const md = '```\n\\detail{x}\n> [!rappel] y\n```';
		const r = splitCorrectionDetail(md);
		expect(r.hasDetails).toBe(false);
		expect(r.concise).toBe(md);
	});

	it("concis : pas d'espace laissée devant la ponctuation à la place d'un détail en ligne", () => {
		const r = splitCorrectionDetail('Donc $x = 3$ [car on divise par 2]{.rappel}.');
		expect(r.concise).toBe('Donc $x = 3$.');
		expect(splitCorrectionDetail('a [b]{.rappel} c').concise).toBe('a c');
		expect(splitCorrectionDetail('a [b]{.rappel}').concise).toBe('a');
	});
});
