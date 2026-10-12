/**
 * Le Tour du Royaume (`/royaume`) : le contenu de la page de présentation de Chiphre.
 *
 * Du texte et des liens seulement ; la page les met en scène. Deux sources :
 * - le lore : le Compendium (`docs/Chiphres/lore-pataphysique.md`, § II pour les Provinces) ;
 * - ce qu'on peut promettre : `docs/systeme/carte-des-fonctionnalites.md`.
 *
 * ⛔ Jamais « Mathres » sur une vitrine (`lore.ts`), rien du Collège, aucun chiffre en dur
 * (il périmerait), aucun nom de lieu que l'interface n'emploie pas ailleurs. Les élèves sont
 * tutoyés ; seuls les parents sont vouvoyés (décision de David, 2026-10-11).
 *
 * @module kingdom-tour/tour
 */

import type { RequiredForm, ValidationStatus } from '$lib/questions/types';
import { lore } from '$lib/config/lore';

// Types

/** Ce qui s'ouvre sans compte, ou seulement avec celui de l'élève */
export type Access = 'public' | 'account';

export interface TourLink {
	label: string;
	href: string;
}

export type ProvinceId =
	'nombrilie' | 'bedonstan' | 'yoyolande' | 'pifometrie' | 'glitchistan' | 'patatovie';

/** Un grand domaine du programme, vu comme une région du Royaume (Compendium § II) */
export interface Province {
	id: ProvinceId;
	name: string;
	domain: string;
	capital: string;
	governor: string;
	motto: string;
	/** Une ligne de paysage, tirée du « paysage canon » de la fiche */
	scenery: string;
	/** Les outils publics du site où l'on travaille ce domaine */
	tools: TourLink[];
}

export type PlaceId =
	| 'automaths'
	| 'atelier'
	| 'cabinet-noir'
	| 'games'
	| 'upsilon'
	| 'python'
	| 'glossary'
	| 'shtam'
	| 'almanach'
	| 'zygomatics';

/** Une fonctionnalité publique, sous son nom réel dans l'interface */
export interface Place {
	id: PlaceId;
	title: string;
	/** La ligne de décor */
	tagline: string;
	description: string;
	href: string;
	/** Mise en avant (grande carte) */
	featured?: boolean;
}

export type StrengthId =
	'steps' | 'two-corrections' | 'clickable-words' | 'spaced-review' | 'tutor' | 'printable';

/** Un point fort, que le code prouve (voir la carte des fonctionnalités) */
export interface Strength {
	id: StrengthId;
	title: string;
	text: string;
	access: Access;
}

export interface FormDemoAnswer {
	/** Ce que l'élève écrit, en LaTeX : c'est cela que le test fait corriger */
	latex: string;
	/** La même réponse, écrite pour l'affichage (sans moteur de rendu) */
	display: string;
	status: ValidationStatus;
	verdict: string;
	points: string;
	/** La remarque du correcteur, telle que l'élève la lit */
	remark: string;
}

export interface FormDemo {
	prompt: string;
	/** Expression à factoriser, pour l'affichage */
	expression: string;
	expected: string;
	requiredForm: RequiredForm;
	answers: FormDemoAnswer[];
}

// Constantes

export const TOUR_PATH = '/royaume';

/** Ordre et contenu du Compendium, § II (tableau du Royaume, fiches des Provinces) */
export const PROVINCES: Province[] = [
	{
		id: 'nombrilie',
		name: 'Nombrilie',
		domain: 'Nombres et calculs',
		capital: 'Empoche-les-Bains',
		governor: 'Mère Ubu',
		motto: 'Patron, la soustraction !',
		scenery:
			'Une station thermale de 1880. Sur la place principale, une grande gidouille de bronze.',
		tools: [{ label: 'Automaths et sa Course aux nombres', href: '/automaths' }]
	},
	{
		id: 'bedonstan',
		name: 'Bedonstan',
		domain: 'Géométrie',
		capital: 'Lobatchevsk',
		governor: 'Professeur Achras',
		motto: 'La route est droite, mais la courbe est forte',
		scenery:
			'Des steppes semées de polyèdres de pierre. À Lobatchevsk, un triangle bien élevé a moins de 180 degrés.',
		tools: []
	},
	{
		id: 'yoyolande',
		name: 'Yoyolande',
		domain: 'Fonctions',
		capital: 'Sinusborg',
		governor: 'Bougrelas',
		motto: 'Plus ça monte, moins ça descend',
		scenery: 'Un port aux toits en sinusoïdes, où le phare balaie la mer en oscillant.',
		tools: [{ label: 'Le Graphe de l’Atelier', href: '/grapheur' }]
	},
	{
		id: 'pifometrie',
		name: 'Pifométrie',
		domain: 'Probabilités et statistiques',
		capital: 'Bonneteau-sur-Vistule',
		governor: 'Cheval à Phynances',
		motto: 'Jamais trois sans deux',
		scenery:
			'Une ville-tripot sur la Vistule. Le Cheval à Phynances hennit à chaque numéro qui sort.',
		tools: [{ label: 'L’Atelier, vue Données', href: '/atelier' }]
	},
	{
		id: 'glitchistan',
		name: 'Glitchistan',
		domain: 'Algorithmique',
		capital: 'Turingrad',
		governor: 'Bosse-de-Nage',
		motto: 'Aux grands maux les grands Reset !',
		scenery:
			'Briques en pixels et machines à vapeur. Au centre de Turingrad, une machine de Turing géante bat la mesure.',
		tools: [
			{ label: 'Python', href: '/python' },
			{ label: 'Le Cabinet Noir de Turingrad', href: '/chiffrement' }
		]
	},
	{
		id: 'patatovie',
		name: 'Patatovie',
		domain: 'Logique et ensembles',
		capital: 'Cracovenn',
		governor: 'Docteur Faustroll',
		motto: 'L’infini n’en finit pas d’en finir, surtout vers la fin',
		scenery:
			'Cracovenn est bâtie en enceintes qui se chevauchent : un diagramme de Venn habitable.',
		tools: [{ label: 'Le Démineur, pure déduction', href: '/games/minesweeper' }]
	}
];

/** Les fonctionnalités publiques (carte des fonctionnalités, « Sans compte ») */
export const PLACES: Place[] = [
	{
		id: 'automaths',
		title: 'Automaths',
		tagline: 'Des Corvées à la chaîne, et pas une de trop.',
		description:
			'Choisis tes questions, puis lance la série : en classe, en entraînement, en Course aux nombres ou en Flash-cards.',
		href: '/automaths',
		featured: true
	},
	{
		id: 'atelier',
		title: 'L’Atelier',
		tagline: 'On y démonte les calculs, pièce par pièce.',
		description:
			'Calcul formel en français avec ses étapes, grapheur, statistiques et probabilités. Rien ne quitte ton navigateur.',
		href: '/atelier',
		featured: true
	},
	{
		id: 'cabinet-noir',
		title: 'Le Cabinet Noir de Turingrad',
		tagline: 'Le bureau où l’on cache les messages, et où l’on perce ceux des autres.',
		description:
			'Chiffre, déchiffre, décrypte, de César à RSA, chaque calcul détaillé. Puis perce les Dépêches du Czar, une à une.',
		href: '/chiffrement',
		featured: true
	},
	{
		id: 'games',
		title: 'Les Jeux',
		tagline: 'On joue, et on calcule sans s’en apercevoir.',
		description: 'Trio, Mathémo, Démineur et 2048.',
		href: '/games'
	},
	{
		id: 'upsilon',
		title: 'Upsilon',
		tagline: 'La calculatrice graphique, sans le cartable.',
		description: 'Une calculatrice graphique complète, dans ton navigateur.',
		href: '/upsilon'
	},
	{
		id: 'python',
		title: 'Python',
		tagline: 'Les machines du Glitchistan, à ta portée.',
		description:
			'Écris du Python sans rien installer, puis suis ton programme pas à pas : variables, mémoire, appels.',
		href: '/python'
	},
	{
		id: 'glossary',
		title: 'Le Glossaire',
		tagline: 'Les mots des maths, expliqués à ta hauteur.',
		description:
			'Des définitions écrites pour chaque niveau. Depuis un énoncé, un clic sur le mot suffit.',
		href: '/glossaire'
	},
	{
		id: 'shtam',
		title: 'Le Shtam',
		tagline: 'La gazette du Royaume. Toutes ses nouvelles sont fausses.',
		description:
			'Chaque article se termine par « Le vrai du faux » : ce qui, dans l’histoire, est vraiment arrivé.',
		href: '/shtam'
	},
	{
		id: 'almanach',
		title: 'L’Almanach des Chiphres',
		tagline: 'Sept mois de cinquante-deux jours, et une Cloche pour finir l’année.',
		description: 'Le calendrier du Royaume. Quel jour es-tu né, en Ère du Royaume ?',
		href: '/almanach'
	},
	{
		id: 'zygomatics',
		title: 'Zygomatics',
		tagline: 'Les presque évaluations.',
		description: 'Des évaluations pour rire, à imprimer et à ne surtout pas rendre.',
		href: '/presques-evaluations'
	}
];

/** Les points forts, prouvés par le code (carte des fonctionnalités, « Points forts ») */
export const STRENGTHS: Strength[] = [
	{
		id: 'steps',
		title: 'Les étapes, en français',
		text: 'L’Atelier ne donne pas qu’un résultat : il montre comment il résout, dérive ou simplifie, étape par étape.',
		access: 'public'
	},
	{
		id: 'two-corrections',
		title: 'Une correction, puis le détail',
		text: 'D’abord l’essentiel. Le détail, si tu le demandes. À l’écran comme sur la fiche imprimée.',
		access: 'public'
	},
	{
		id: 'clickable-words',
		title: 'Des mots qui s’ouvrent',
		text: 'Un mot de l’énoncé t’échappe ? Clique dessus : sa définition s’ouvre, écrite pour ton niveau.',
		access: 'public'
	},
	{
		id: 'printable',
		title: 'Des Corvées à imprimer',
		text: 'Un exercice partagé s’exporte en PDF, avec de nouvelles valeurs à chaque tirage.',
		access: 'public'
	},
	{
		id: 'spaced-review',
		title: 'Réviser au bon moment',
		text: 'Chiphre te repose une question juste avant que tu l’oublies, et jamais tout à fait la même.',
		access: 'account'
	},
	{
		id: 'tutor',
		title: 'Père Ubu, tuteur',
		text: 'Il ne te donne pas la réponse : il t’aide à la trouver. À sa manière, qui est royale.',
		access: 'account'
	}
];

/**
 * Le cas réel #553 (« Factorise z² − 14z + 49 », décision de David), écrit en x.
 * Le test `form-demo.test.ts` fait corriger chaque réponse par le vrai correcteur, et
 * vérifie que les remarques recopiées ici sont bien les siennes : les importer tirerait
 * tout le moteur de calcul dans la page.
 */
export const FORM_DEMO: FormDemo = {
	prompt: 'Factorise',
	expression: 'x² − 14x + 49',
	expected: '(x-7)^2',
	requiredForm: { pattern: '(u-v)^2', acceptable: 'u*v' },
	answers: [
		{
			latex: '(x-7)^2',
			display: '(x − 7)²',
			status: 'correct',
			verdict: lore.feedback.correct,
			points: '1 point',
			remark: 'Factorisé, et sous la forme d’un carré.'
		},
		{
			latex: '(x-7)(x-7)',
			display: '(x − 7)(x − 7)',
			status: 'unoptimal_form',
			verdict: 'Perfectible',
			points: '½ point',
			remark: 'La réponse est juste, mais pas écrite sous la forme demandée.'
		},
		{
			latex: 'x^2-14x+49',
			display: 'x² − 14x + 49',
			status: 'bad_form',
			verdict: 'Forme refusée',
			points: '0 point',
			remark: 'La réponse ne respecte pas la forme demandée.'
		},
		{
			latex: '(x+7)^2',
			display: '(x + 7)²',
			status: 'incorrect',
			verdict: lore.feedback.wrong,
			points: '0 point',
			remark: 'La valeur passe avant la forme : (x + 7)² ne vaut pas x² − 14x + 49.'
		}
	]
};

/** Les deux portes de l'ouverture */
export const HERO_CALLS: TourLink[] = [
	{ label: 'Commencer la visite', href: '#provinces' },
	{ label: 'J’ai un code de classe', href: '/auth/register' }
];

/** Les trois portes de la fin */
export const FINAL_CALLS: TourLink[] = [
	{ label: 'Essayer sans compte', href: '/automaths' },
	{ label: 'J’ai un code de classe', href: '/auth/register' },
	{ label: 'Me connecter', href: '/auth/login' }
];

/** L'encart des parents renvoie au manifeste et à la page des données personnelles */
export const PARENT_LINKS: TourLink[] = [
	{ label: 'Chiphre, c’est quoi ?', href: '/a-propos' },
	{ label: 'Vos données personnelles', href: '/legal/confidentialite' }
];

/**
 * Ce que l'encart des parents peut affirmer : chaque ligne est prouvée dans la carte des
 * fonctionnalités. ⛔ Pas « tout reste en Europe » (le tuteur passe par les USA), pas de
 * suivi « accessible aux parents » (il n'existe pas).
 */
export const PARENT_FACTS: string[] = [
	'La base de données est hébergée à Paris.',
	'Aucune publicité.',
	'Seuls les cookies strictement nécessaires.',
	'Un consentement parental, géré par le professeur, pour les élèves qui en ont besoin.',
	'Les données d’un compte peuvent être exportées ou supprimées.'
];
