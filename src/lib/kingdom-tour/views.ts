/**
 * Les trois vues de présentation, une par public : élèves (`/eleves`), parents (`/parents`),
 * professeurs (`/professeurs`). La roue des publics y mène (décisions de David, 2026-10-11 ;
 * journal `docs/wip/roue-des-publics-progress.md`).
 *
 * Peu de texte : des phrases directes. Ce qu'on promet est prouvé dans
 * `docs/systeme/carte-des-fonctionnalites.md`. Pour l'argent, seulement ce qui restera vrai
 * quand le site sera payant hors de ses classes : jamais « gratuit » seul, ni « pour toujours ».
 * Élèves tutoyés, parents et professeurs vouvoyés.
 *
 * @module kingdom-tour/views
 */

import type { AudienceId } from './audiences';
import { PARENT_FACTS, PLACES, type PlaceId, type TourLink } from './tour';

// Types

/** L'icône d'un élément, choisie par la page (lucide) */
export type ViewIcon =
	PlaceId | 'cabinet' | 'tutor' | 'review' | 'rewards' | 'steps' | 'words' | 'printable';

export interface ViewItem {
	icon: ViewIcon;
	title: string;
	text: string;
	href?: string;
}

export interface ViewBlock {
	id: string;
	title: string;
	text?: string;
	items?: ViewItem[];
	/** Une liste de faits, cochés */
	facts?: string[];
	/** Une démonstration en direct, reprise du Tour du Royaume */
	demo?: 'form' | 'cipher';
	links?: TourLink[];
}

export interface AudienceView {
	id: AudienceId;
	seoTitle: string;
	seoDescription: string;
	kicker: string;
	title: string;
	lede: string;
	blocks: ViewBlock[];
	calls: TourLink[];
}

// Constantes

/** Reprise du manifeste `/a-propos` (« Qui est derrière », décision de David) */
const AUTHOR =
	'Chiphre est créé par un enseignant agrégé de mathématiques et ingénieur en informatique, passionné de littérature et d’illusionnisme.';

const CONTACT: TourLink = { label: 'contact@chiph.re', href: 'mailto:contact@chiph.re' };
/** L'accueil de la vitrine, un lien par page de public (chantier demo-debug, PR 7) */
const DEMO: TourLink = { label: 'Voir Chiphre en action', href: '/demo' };

/** Un lieu public, sous son nom et sa description du Tour du Royaume */
function place(id: PlaceId, text?: string): ViewItem {
	const found = PLACES.find((p) => p.id === id);
	if (!found) throw new Error(`Lieu inconnu : ${id}`);
	return { icon: id, title: found.title, text: text ?? found.description, href: found.href };
}

export const STUDENT_VIEW: AudienceView = {
	id: 'student',
	seoTitle: 'Pour les élèves — Chiphre',
	seoDescription:
		'Chiphre pour les élèves, du CM1 à la Terminale : Automaths, l’Atelier, le Cabinet Noir et des jeux, sans compte. Avec ton code de classe : ton Cabinet, Père Ubu tuteur, des révisions au bon moment.',
	kicker: 'Pour les élèves',
	title: 'Bienvenue dans le Royaume, Galopin !',
	lede: 'Ici, les maths se cachent dans le royaume du Père Ubu. Du CM1 à la Terminale. Entre tout de suite.',
	blocks: [
		{
			id: 'sans-compte',
			title: 'Sans compte, tout de suite',
			items: [place('automaths'), place('atelier'), place('cabinet-noir'), place('games')],
			links: [DEMO]
		},
		{
			id: 'essai',
			title: 'Un essai ?',
			text: 'Écris un message : le chiffre de César le brouille. Puis déchiffre-le.',
			demo: 'cipher'
		},
		{
			id: 'avec-compte',
			title: 'Avec ton code de classe',
			items: [
				{
					icon: 'cabinet',
					title: 'Ton Cabinet',
					text: 'Tes cours, ta progression, ton travail et le cahier de textes.'
				},
				{
					icon: 'tutor',
					title: 'Père Ubu, tuteur',
					text: 'Il ne te donne pas la réponse : il t’aide à la trouver.'
				},
				{
					icon: 'review',
					title: 'Réviser au bon moment',
					text: 'Une question revient juste avant que tu l’oublies, jamais tout à fait la même.'
				},
				{
					icon: 'rewards',
					title: 'Gidouilles, énigmes, tournois',
					text: 'Gagne des gidouilles, résous des énigmes, défie les autres au Démineur.'
				}
			]
		},
		{
			id: 'royaume',
			title: 'Le Royaume en détail',
			text: 'Six Provinces, leurs capitales et leurs gouverneurs : fais le tour du Royaume.',
			links: [{ label: 'Faire le Tour du Royaume', href: '/royaume' }]
		}
	],
	calls: [
		{ label: 'J’ai un code de classe', href: '/auth/register' },
		{ label: 'Me connecter', href: '/auth/login' }
	]
};

export const PARENT_VIEW: AudienceView = {
	id: 'parent',
	seoTitle: 'Pour les parents — Chiphre',
	seoDescription:
		'Chiphre pour les parents : des mathématiques rigoureuses du CM1 à la Terminale, créées par un enseignant agrégé. Sans publicité, base de données hébergée à Paris.',
	kicker: 'Pour les parents',
	title: 'Des maths sérieuses, dans un monde absurde',
	lede: 'Du CM1 à la Terminale. Le décor est une farce ; les mathématiques suivent les programmes officiels.',
	blocks: [
		{
			id: 'qui',
			title: 'Qui est derrière',
			text: AUTHOR,
			links: [{ label: 'Chiphre, c’est quoi ?', href: '/a-propos' }]
		},
		{
			id: 'travail',
			title: 'Ce que votre enfant y fait',
			items: [
				{
					icon: 'steps',
					title: 'Des corrections pas à pas',
					text: 'D’abord l’essentiel, puis le détail s’il le demande.'
				},
				{
					icon: 'words',
					title: 'Des mots qui s’ouvrent',
					text: 'Un mot de l’énoncé lui échappe : un clic, et sa définition s’affiche, à son niveau.'
				},
				{
					icon: 'review',
					title: 'Réviser au bon moment',
					text: 'Une question revient juste avant qu’il l’oublie.'
				}
			],
			links: [DEMO]
		},
		{
			id: 'forme',
			title: 'La forme compte',
			text: 'Le correcteur regarde la valeur et la façon d’écrire. Essayez : quatre réponses, quatre verdicts.',
			demo: 'form'
		},
		{
			id: 'donnees',
			title: 'Ses données',
			facts: [
				...PARENT_FACTS,
				'Les échanges avec le tuteur Père Ubu (une IA) passent par un prestataire aux États-Unis.'
			],
			links: [{ label: 'Vos données personnelles', href: '/legal/confidentialite' }]
		},
		{
			id: 'suivi',
			title: 'Suivre son travail',
			text: 'Il n’y a pas de compte parent. Le professeur peut vous donner le lien du cahier de textes de la classe : séances et devoirs, sans compte.'
		},
		{
			id: 'prix',
			title: 'Combien ça coûte',
			text: 'Pour les élèves des classes de son créateur, Chiphre est entièrement gratuit. Sans publicité.'
		}
	],
	calls: [{ label: 'Qui édite Chiphre', href: '/legal/mentions-legales' }, CONTACT]
};

export const TEACHER_VIEW: AudienceView = {
	id: 'teacher',
	seoTitle: 'Pour les professeurs — Chiphre',
	seoDescription:
		'Chiphre pour les professeurs de mathématiques : Automaths en classe, l’Atelier, le Cabinet Noir, Upsilon, Python. En accès libre, sans compte, sans publicité.',
	kicker: 'Pour les professeurs',
	title: 'Des outils de mathématiques, prêts pour la classe',
	lede: 'Du CM1 à la Terminale. Sans publicité.',
	blocks: [
		{
			id: 'libre',
			title: 'En accès libre, sans compte',
			items: [
				place(
					'automaths',
					'Choisissez vos questions, puis projetez la série en mode « En classe ».'
				),
				// Les descriptions du Tour tutoient l'élève : ici, on vouvoie
				place(
					'atelier',
					'Calcul formel en français qui montre ses étapes, grapheur, statistiques et probabilités. Rien ne quitte le navigateur.'
				),
				place(
					'cabinet-noir',
					'Le chiffrement, de César à RSA, chaque calcul détaillé ; puis les Dépêches du Czar à percer.'
				),
				place('upsilon', 'Une calculatrice graphique complète, dans le navigateur.'),
				place(
					'python',
					'Python sans rien installer, puis le programme pas à pas : variables, mémoire, appels.'
				),
				place('zygomatics', 'Des évaluations pour rire, à imprimer et à ne surtout pas rendre.')
			]
		},
		{
			id: 'forme',
			title: 'La forme compte',
			text: 'Le correcteur regarde la valeur et la forme : une réponse juste mais mal écrite n’a pas tous les points.',
			demo: 'form'
		},
		{
			id: 'fiches',
			title: 'Sur papier aussi',
			items: [
				{
					icon: 'printable',
					title: 'Des exercices à imprimer',
					text: 'Un exercice partagé s’exporte en PDF, avec de nouvelles valeurs à chaque tirage.'
				}
			]
		},
		{
			id: 'contact',
			title: 'Une question ?',
			text: AUTHOR,
			links: [CONTACT]
		}
	],
	calls: [
		{ label: 'Essayer Automaths', href: '/automaths' },
		{ label: 'Ouvrir l’Atelier', href: '/atelier' },
		{ label: 'Voir les démonstrations', href: '/demo' }
	]
};

export const AUDIENCE_VIEWS: Record<AudienceId, AudienceView> = {
	student: STUDENT_VIEW,
	parent: PARENT_VIEW,
	teacher: TEACHER_VIEW
};
