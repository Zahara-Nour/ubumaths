/**
 * Pages de la vitrine publique `/demo` (chantier demo-debug, PR 7).
 *
 * Une seule liste nourrit l'accueil `/demo` (ses cartes, dans cet ordre), le sitemap et la
 * `<title>` et la `meta description` de chaque vitrine (`demoSeo`, passé à `SeoHead`). Le test `demo-pages.test.ts` exige une entrée par
 * dossier de `src/routes/(public)/demo/`.
 *
 * @module lib/seo/demo-pages
 */

// Types

export type DemoPath =
	| '/demo/questions'
	| '/demo/corriges'
	| '/demo/diaporama'
	| '/demo/geometrie'
	| '/demo/cercle-trigo'
	| '/demo/editeur'
	| '/demo/lexique'
	| '/demo/cartes'
	| '/demo/structure';

export interface DemoPage {
	path: DemoPath;
	/** Titre de la carte, et du `<title>` de la vitrine (`demoSeo`) */
	title: string;
	/** Ce qu'on y voit, en une phrase : carte de l'accueil et `meta description` */
	description: string;
}

// Constantes

export const DEMO_HUB = {
	path: '/demo',
	title: 'Démonstrations',
	description:
		'Chiphre en action, sans compte : les questions, les corrigés, le diaporama, les figures de géométrie et les autres outils de la plateforme.'
} as const;

/** Du plus parlant au plus technique (ordre validé par David le 2026-10-25) */
export const DEMO_PAGES: DemoPage[] = [
	{
		path: '/demo/questions',
		title: 'Les questions',
		description:
			'La même série de questions projetée en classe, en entraînement, en flash-cards, en course aux nombres et en révisions espacées.'
	},
	{
		path: '/demo/corriges',
		title: 'Les corrigés des fiches',
		description:
			'Chaque fiche d’exercices s’imprime avec son corrigé, écrit comme à la main au tableau.'
	},
	{
		path: '/demo/diaporama',
		title: 'Le diaporama',
		description:
			'Un cours en diapositives : formules, figures, code Python et questions minutées, avec de quoi écrire par-dessus.'
	},
	{
		path: '/demo/geometrie',
		title: 'Figures de géométrie',
		description:
			'Des figures écrites en quelques lignes, à manipuler : on déplace les points, on fait glisser les curseurs.'
	},
	{
		path: '/demo/cercle-trigo',
		title: 'Le cercle trigonométrique',
		description:
			'Un cercle qui se dessine tout seul : valeurs remarquables, solutions d’équations et d’inéquations.'
	},
	{
		path: '/demo/editeur',
		title: 'L’éditeur de texte',
		description:
			'Un seul éditeur, formules comprises, pour un message, une séance du cahier de texte ou un énoncé d’exercice.'
	},
	{
		path: '/demo/lexique',
		title: 'Le lexique',
		description:
			'Les mots de l’énoncé ont leur fiche : un toucher l’ouvre, sans quitter l’exercice.'
	},
	{
		path: '/demo/cartes',
		title: 'Les cartes VIP',
		description:
			'Les cartes que gagnent les élèves : chacune donne un privilège en classe, plus elle est rare, plus son reflet est riche.'
	},
	{
		path: '/demo/structure',
		title: 'La structure d’une expression',
		description:
			'Sous le pointeur, une partie de l’expression s’encadre et se lit en français ; on peut la déplacer.'
	}
];

// Functions

/** L'entrée d'une vitrine (lève si le chemin n'est pas dans la liste) */
export function demoPage(path: DemoPath): DemoPage {
	const found = DEMO_PAGES.find((p) => p.path === path);
	if (!found) throw new Error(`Vitrine inconnue : ${path}`);
	return found;
}

/** Les props de `SeoHead` d'une vitrine : `<SeoHead {...demoSeo('/demo/…')} />` */
export function demoSeo(path: DemoPath): { title: string; description: string } {
	const { title, description } = demoPage(path);
	return { title: `${title} — Chiphre`, description };
}
