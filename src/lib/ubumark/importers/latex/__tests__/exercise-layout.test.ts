/**
 * Défauts relevés sur un vrai fichier d'exercices (entraînement second degré, 1ère) :
 * 1. commandes de mise en page dans une liste (`\setlength{\itemsep}{3mm}`) ;
 * 2. formule centrée et liste collées au paragraphe (pas de ligne vide) ;
 * 3. `\[ \begin{array} … \end{array} \]` de formules laissé en LaTeX brut.
 *
 * On passe par le même chemin que la page admin : `splitStatementAndSolution`
 * puis `transpileLatexToMarkdown(split.statement)`.
 */
import { describe, it, expect } from 'vitest';
import { transpileLatexToMarkdown } from '../transpiler';
import { splitStatementAndSolution } from '../splitter';
import { parseMarkdown } from '$lib/ubumark';

function transpile(latex: string): string {
	const split = splitStatementAndSolution(latex);
	return transpileLatexToMarkdown(split.statement).markdown;
}

describe('Défaut 1 — commandes de mise en page ignorées', () => {
	it('ignore \\setlength{\\itemsep} placé dans une liste enumerate', () => {
		const input = `Pour chacune :
\\begin{enumerate}
    \\setlength{\\itemsep}{3mm}
    \\item Premier.
    \\item Second.
\\end{enumerate}`;
		expect(transpile(input)).toBe('Pour chacune :\n\n1. Premier.\n2. Second.\n');
	});

	it('ignore \\addtolength{\\itemsep} placé dans une liste itemize', () => {
		const input = `\\begin{itemize}
\\addtolength{\\itemsep}{-1mm}
\\item Un.
\\item Deux.
\\end{itemize}`;
		expect(transpile(input)).toBe('- Un.\n- Deux.\n');
	});

	it('ignore \\setlength et \\addtolength hors liste (pas de commentaire HTML)', () => {
		const input = `\\setlength{\\parskip}{2mm}Texte \\addtolength{\\parskip}{1mm}suite \\medskip fin`;
		expect(transpile(input)).toBe('Texte suite fin\n');
	});

	it('ne confond pas une commande commençant par \\item avec \\item (\\itemsep seul)', () => {
		const input = `\\begin{enumerate}
\\itemsep=2mm
\\item A.
\\end{enumerate}`;
		expect(transpile(input)).toBe('1. A.\n');
	});
});

describe('Défaut 2 — formules centrées et listes en blocs séparés', () => {
	it('sépare une formule \\[…\\] du texte par une ligne vide avant et après', () => {
		const input = `Donner les coefficients $a$ dans l'écriture $ax^2+bx+c$.
\\[
A(x)=3x^2-5x+2
\\]
Puis conclure.`;
		expect(transpile(input)).toBe(
			"Donner les coefficients ~a~ dans l'écriture ~ax^2+bx+c~.\n\n~~A(x)=3x^2-5x+2~~\n\nPuis conclure.\n"
		);
	});

	it('sépare une formule $$…$$ en milieu de phrase', () => {
		expect(transpile('Soit $$x=1$$ donc.')).toBe('Soit\n\n~~x=1~~\n\ndonc.\n');
	});

	it('sépare un environnement equation* du texte', () => {
		const input = `On pose
\\begin{equation*}
f(x)=x^2
\\end{equation*}
et on étudie f.`;
		expect(transpile(input)).toBe('On pose\n\n~~f(x)=x^2~~\n\net on étudie f.\n');
	});

	it('sépare une liste enumerate collée au paragraphe, avant et après', () => {
		const input = `Les trois questions suivantes sont indépendantes.
\\begin{enumerate}
\\item Un.
\\item Deux.
\\end{enumerate}
Fin.`;
		expect(transpile(input)).toBe(
			'Les trois questions suivantes sont indépendantes.\n\n1. Un.\n2. Deux.\n\nFin.\n'
		);
	});

	it('sépare une liste itemize collée au paragraphe', () => {
		const input = `Voici :
\\begin{itemize}
\\item a
\\end{itemize}
Suite.`;
		expect(transpile(input)).toBe('Voici :\n\n- a\n\nSuite.\n');
	});
});

describe('Défaut 3 — grilles de formules array → listes', () => {
	it('transforme un array ll de formules en liste à puces, ligne par ligne', () => {
		const input = `\\[
\\begin{array}{ll}
A(x)=3x^2-5x+2 & B(x)=-2x^2+7 \\\\[3mm]
C(x)=x^2-9x & D(x)=-x^2+4x-1
\\end{array}
\\]`;
		expect(transpile(input)).toBe(
			'- ~A(x)=3x^2-5x+2~\n- ~B(x)=-2x^2+7~\n- ~C(x)=x^2-9x~\n- ~D(x)=-x^2+4x-1~\n'
		);
	});

	it('ignore les cellules vides et retire la ponctuation finale', () => {
		const input = `Soient
\\[
\\begin{array}{lll}
A=x+1, & & B=2x. \\\\
C=3x &
\\end{array}
\\]
Calculer.`;
		expect(transpile(input)).toBe('Soient\n\n- ~A=x+1~\n- ~B=2x~\n- ~C=3x~\n\nCalculer.\n');
	});

	it('produit une liste numérotée sans étiquette si toutes les cellules sont \\text{a. }, \\text{b. }…', () => {
		const input = `\\[
\\begin{array}{ll}
\\text{a. } x^2-7x+12=0 & \\text{b. } 2x^2+x-1=0 \\\\
\\text{c. } x^2=4 & \\text{d. } x^2+1=0
\\end{array}
\\]`;
		expect(transpile(input)).toBe('1. ~x^2-7x+12=0~\n2. ~2x^2+x-1=0~\n3. ~x^2=4~\n4. ~x^2+1=0~\n');
	});

	it('transforme des formules séparées par \\qquad en liste à puces', () => {
		const input = `\\[ E(x)=3x^2-12x \\qquad\\qquad F(x)=5x^2-20. \\]`;
		expect(transpile(input)).toBe('- ~E(x)=3x^2-12x~\n- ~F(x)=5x^2-20~\n');
	});

	it('laisse inchangé un array tableau avec \\hline', () => {
		const input = `\\[
\\begin{array}{|c|c|}
\\hline
x & 1 \\\\
\\hline
\\end{array}
\\]`;
		const md = transpile(input);
		expect(md).toContain('\\begin{array}{|c|c|}');
		expect(md).toContain('\\hline');
		expect(md).not.toMatch(/^- /m);
	});

	it('laisse inchangé un array inclus dans une formule plus large (système)', () => {
		const input = `\\[
\\left\\{\\begin{array}{l}
x+y=2 \\\\
x-y=0
\\end{array}\\right.
\\]`;
		const md = transpile(input);
		expect(md).toContain('\\left\\{\\begin{array}{l}');
		expect(md).not.toMatch(/^- /m);
	});

	it('ne découpe pas « x=2 \\quad\\text{ou}\\quad x=3 » en liste', () => {
		const md = transpile('\\[ x=2 \\quad \\text{ou} \\quad x=3 \\]');
		expect(md).not.toMatch(/^- /m);
	});
});

/**
 * Blocs DANS un item : la structure lue par le parseur de l'écran, pas le texte.
 * Garde de structure (liste d'un seul tenant, paragraphes distincts). NB : le
 * parseur ubumark fait de chaque ligne de suite un paragraphe, avec ou sans
 * ligne vide — ces tests ne départagent donc pas les deux écritures.
 */
describe('Blocs à l’intérieur d’un item de liste', () => {
	type Node = { type: string; items?: Node[]; children?: Node[] };
	const topLists = (md: string) =>
		(parseMarkdown(md) as unknown as { children: Node[] }).children.filter(
			(n) => n.type === 'list'
		);

	it('garde deux paragraphes d’un même item séparés, dans une seule liste', () => {
		const input = `\\begin{enumerate}
    \\item Une fonction $f$ vérifie $f(0)=-20$.

    Déterminer $f(x)$.
    \\item Une fonction $g$ vérifie $g(1)=4$.

    Déterminer $g(x)$.
\\end{enumerate}`;
		const lists = topLists(transpile(input));
		expect(lists).toHaveLength(1);
		expect(lists[0].items).toHaveLength(2);
		const firstItem = lists[0].items![0].children!.filter((c) => c.type === 'paragraph');
		expect(firstItem).toHaveLength(2);
	});

	it('garde une formule centrée dans son item sans couper la liste', () => {
		const input = `\\begin{enumerate}
    \\item On pose
    \\[
    f(x)=2(x-3)^2-8.
    \\]
    \\item Développer $f(x)$.
\\end{enumerate}`;
		const lists = topLists(transpile(input));
		expect(lists).toHaveLength(1);
		expect(lists[0].items).toHaveLength(2);
	});
});
