/**
 * Exemples du glossaire, chantier « seo » : copie figée des 14 exemples posés le 2026-11-21
 * (validés par David) par la migration 20261121221131_glossaire_exemples_seo_contenu.
 *
 * Le jeu de référence est figé (docs/systeme/dictionnaire.md, « Comment étendre ») : les
 * tests qui comparent la base à REFERENCE_DICTIONARY appliquent ce changement par
 * `withSeoExamples`.
 */

import type { MathTerm } from '#lib/dictionary/model.ts';

export interface SeoExample {
	/** Adresse de la page (`/glossaire/<slug>`) */
	slug: string;
	term: string;
	sense?: string;
	content: string;
}

export const SEO_EXAMPLES_2026_11_21: readonly SeoExample[] = [
	{
		slug: 'strictement-positif',
		term: 'strictement positif',
		content:
			"La longueur d'un côté d'un triangle est un nombre strictement positif : elle ne peut être ni négative ni nulle. Pour dire que $x$ est strictement positif, on écrit $x > 0$."
	},
	{
		slug: 'partage-proportionnel',
		term: 'partage proportionnel',
		content:
			'Trois amis repeignent une clôture : ils travaillent $2$ h, $3$ h et $5$ h, soit $10$ h en tout. Ils partagent $400$ € proportionnellement à leurs heures : une heure vaut $400 \\div 10 = 40$ €, et ils reçoivent $80$ €, $120$ € et $200$ €.'
	},
	{
		slug: 'concourantes',
		term: 'concourantes',
		content:
			"Les rayons d'une roue de vélo sont portés par des droites concourantes : elles passent toutes par le centre de la roue. Trois droites qui dessinent un triangle ne sont pas concourantes : elles se coupent deux à deux, en trois points différents."
	},
	{
		slug: 'representant-vecteur',
		term: 'représentant',
		sense: 'vecteur',
		content:
			'Dans un repère, la flèche de $A(1 ; 1)$ à $B(4 ; 3)$ et celle de $C(0 ; -2)$ à $D(3 ; 0)$ avancent toutes les deux de $3$ unités et montent de $2$ unités : ce sont deux représentants du même vecteur, et $\\overrightarrow{AB} = \\overrightarrow{CD}$.'
	},
	{
		slug: 'nombre-non-decimal',
		term: 'nombre non décimal',
		content:
			"$\\frac{1}{4} = 0{,}25$ est un nombre décimal : son écriture à virgule s'arrête. $\\frac{2}{3} = 0{,}666\\ldots$ et $\\frac{1}{7} = 0{,}142857\\ldots$ sont des nombres non décimaux, tout comme le nombre $\\pi$."
	},
	{
		slug: 'compris-entre',
		term: 'compris entre',
		content:
			"$7$ est compris entre $5$ et $10$. $12$ n'est pas compris entre $5$ et $10$ : il est plus grand que $10$."
	},
	{
		slug: 'tirage-sans-remise',
		term: 'tirage sans remise',
		content:
			"Une urne contient $3$ boules rouges et $2$ boules bleues. On tire deux boules sans remise : la probabilité d'obtenir deux rouges est $\\frac{3}{5} \\times \\frac{2}{4} = \\frac{3}{10}$."
	},
	{
		slug: 'tirage-avec-remise',
		term: 'tirage avec remise',
		content:
			"Une urne contient $3$ boules rouges et $2$ boules bleues. On tire deux boules avec remise : la probabilité d'obtenir deux rouges est $\\frac{3}{5} \\times \\frac{3}{5} = \\frac{9}{25}$. Si on répète $n$ tirages avec remise, le nombre de boules rouges obtenues suit la loi binomiale de paramètres $n$ et $\\frac{3}{5}$."
	},
	{
		slug: 'nombre-mixte',
		term: 'nombre mixte',
		content:
			"$\\frac{7}{2} = 3 + \\frac{1}{2}$ : dans $7$ demis, il y a $3$ unités et il reste $1$ demi. Dans la vie courante, $1$ heure et quart, c'est $1 + \\frac{1}{4}$ heure, soit $\\frac{5}{4}$ d'heure."
	},
	{
		slug: 'successeur',
		term: 'successeur',
		content:
			"Le successeur de $99$ est $100$ ; celui de $-3$ est $-2$. Le nombre entier qui vient juste avant s'appelle le prédécesseur : celui de $7$ est $6$, celui de $n$ est $n - 1$."
	},
	{
		slug: 'disjoints',
		term: 'disjoints',
		content:
			'On lance un dé. $A = \\{1 ; 3 ; 5\\}$ et $B = \\{2 ; 4\\}$ sont disjoints, donc $P(A \\cup B) = P(A) + P(B) = \\frac{3}{6} + \\frac{2}{6} = \\frac{5}{6}$. En revanche, $A$ et $C = \\{3 ; 6\\}$ ne sont pas disjoints : $A \\cap C = \\{3\\}$.'
	},
	{
		slug: 'distance-a-zero',
		term: 'distance à zéro',
		content:
			'La distance à zéro de $-7{,}5$ est $7{,}5$ ; celle de $0$ est $0$. Deux nombres opposés, comme $-4$ et $4$, ont la même distance à zéro. De deux nombres négatifs, le plus petit est celui qui a la plus grande distance à zéro : $-9 < -2$.'
	},
	{
		slug: 'peu-probable',
		term: 'peu probable',
		content:
			"Obtenir $6$ dix fois de suite en lançant un dé est peu probable, mais pas impossible. Obtenir pile en lançant une pièce n'est pas peu probable : on a une chance sur deux."
	},
	{
		slug: 'angle-nul',
		term: 'angle nul',
		content:
			"À midi, les deux aiguilles d'une horloge sont l'une sur l'autre : elles forment un angle nul. À ne pas confondre avec l'angle plein, qui mesure $360°$ : ses côtés sont aussi confondus, mais on a fait un tour complet."
	}
];

/** Les entrées attendues après la migration : chaque terme visé porte son exemple, à son niveau. */
export function withSeoExamples(entries: readonly MathTerm[]): MathTerm[] {
	return entries.map((entry) => {
		const example = SEO_EXAMPLES_2026_11_21.find(
			(e) => e.term === entry.term && e.sense === entry.sense && !entry.derivedFrom
		);
		return example
			? { ...entry, exemples: { items: [{ grade: entry.grade, content: example.content }] } }
			: entry;
	});
}
