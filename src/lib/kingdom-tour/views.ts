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
import { PLACES, type PlaceId, type TourLink } from './tour';

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

/** Une question fréquente : repliée sur la page, reprise dans les données structurées */
export interface FaqEntry {
	question: string;
	answer: string;
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
	/** Les questions fréquentes, en bas de la page */
	faq?: FaqEntry[];
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
	seoTitle: 'Pour les élèves | Chiphre',
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

/**
 * Revue de la page point par point, du point de vue du parent (chantier presentation-parents,
 * décisions de David du 2026-11-15 au 2026-11-17) : sur la page, ce qui fait venir ; dans la
 * FAQ, ce qui rassure. Chaque phrase est prouvée par une doc de `docs/systeme/`.
 */
export const PARENT_VIEW: AudienceView = {
	id: 'parent',
	seoTitle: 'Pour les parents | Chiphre',
	seoDescription:
		'Chiphre pour les parents : des mathématiques rigoureuses du CM1 à la Terminale, créées par un enseignant agrégé. Sans publicité, base de données hébergée à Paris.',
	kicker: 'Pour les parents',
	title: 'Des maths sérieuses, dans un monde fantaisiste',
	lede: 'Votre enfant s’entraîne, se trompe, comprend pourquoi, et recommence. Du CM1 à la Terminale, selon les programmes de l’Éducation nationale.',
	blocks: [
		{
			id: 'qui',
			title: 'Qui est derrière',
			text: 'Chiphre est conçu par un professeur de mathématiques qui s’en sert chaque jour avec ses élèves. Agrégé de mathématiques, il est aussi ingénieur en informatique.',
			links: [{ label: 'Chiphre, c’est quoi ?', href: '/a-propos' }]
		},
		{
			id: 'travail',
			title: 'Ce que votre enfant y fait',
			text: 'Quand il se trompe, la correction lui montre d’abord l’essentiel, puis le détail s’il le demande. Un mot de l’énoncé lui échappe ? Un clic, et sa définition s’affiche, à son niveau. S’il bloque, Père Ubu, le tuteur, l’aide à trouver sans lui donner la réponse. Et une question réussie revient juste avant qu’il l’oublie, jamais tout à fait la même.',
			links: [DEMO]
		},
		{
			// Carnet de liaison : ADR 0040, docs/systeme/carnet-de-liaison.md
			id: 'suivi',
			title: 'Suivre son travail',
			text: 'Si son professeur l’active pour la classe, vous recevez par courriel le lien de son carnet de liaison : une page à vous, sans compte, qui montre s’il travaille régulièrement, s’il est à jour dans ses révisions et quelles évaluations il a faites, sans les notes. Vous y trouvez aussi le cahier de textes et le cours de la classe. Chiphre ne vous écrit que si quelque chose ne va pas, une fois par semaine au plus, et, s’il y a de quoi, une bonne nouvelle par trimestre. Votre enfant voit la même page que vous.',
			links: [{ label: 'J’ai perdu mon lien', href: '/carnet/lien-perdu' }]
		},
		{
			// L'inscription par le parent exige un code de classe (/auth/register/parent)
			id: 'prix',
			title: 'L’inscrire, et combien ça coûte',
			text: 'Si son professeur utilise Chiphre, il vous donne un code de classe : avec lui, vous inscrivez votre enfant en deux minutes. Pour les élèves des classes de son créateur, Chiphre est entièrement gratuit. Sans publicité. Pour des cours particuliers, écrivez-nous.',
			links: [
				{ label: 'J’inscris mon enfant', href: '/auth/register/parent' },
				{ label: 'Nous écrire', href: CONTACT.href }
			]
		}
	],
	faq: [
		{
			// Frontière d'école : docs/systeme/messagerie-et-moderation.md ; « borné au groupe »
			// d'Akadada pas encore codé, la phrase reste exacte (décision du 2026-11-17)
			question: 'À qui mon enfant peut-il parler ?',
			answer:
				'Votre enfant n’échange qu’avec des élèves de son école, et seulement par le chat : celui de sa classe, ou à deux avec un camarade qui a accepté son amitié. Seul son professeur peut lui écrire en privé. Un message déplacé se signale d’un clic ; le professeur peut le supprimer et retirer à un élève le droit d’écrire. Jusqu’à la 2de, tant que vous n’avez pas donné votre accord, il ne peut écrire à personne.'
		},
		{
			// docs/systeme/tuteur-ia.md § Données personnelles
			question: 'Le tuteur est une intelligence artificielle : que reçoit-elle ?',
			answer:
				'Père Ubu, le tuteur, guide votre enfant vers la réponse sans la lui donner, et le nombre de messages est limité. Ses messages partent chez un prestataire aux États-Unis (Groq), avec l’énoncé de l’exercice ; Chiphre n’y joint ni son nom, ni son courriel, ni l’identifiant de son compte. Un rappel, sous la zone de saisie, lui demande de ne donner aucune information personnelle.'
		},
		{
			// PARENT_FACTS (tour.ts) ; docs/systeme/conformite/consentement-parental.md
			question: 'Que deviennent ses données ?',
			answer:
				'La base de données de Chiphre est hébergée à Paris. Le site n’affiche aucune publicité et ne dépose que les cookies strictement nécessaires. Jusqu’à la 2de, votre accord est demandé : vous le donnez par un lien reçu par courriel. Depuis son compte, on peut télécharger toutes ses données ou supprimer le compte.',
			links: [{ label: 'Vos données personnelles', href: '/legal/confidentialite' }]
		},
		{
			// docs/systeme/jeux-et-economie.md ; jamais d'argent réel (décision durable)
			question: 'Les jeux ne vont-ils pas le distraire ?',
			answer:
				'Les jeux du Royaume sont de nature mathématique ou logique. Avec ses révisions du jour, ils lui rapportent des gidouilles, la monnaie du Royaume, qu’il dépense en petits privilèges que son professeur lui accorde en classe, ou pour décorer son personnage. Les gidouilles ne s’achètent pas avec de l’argent réel.'
		}
	],
	calls: [{ label: 'Qui édite Chiphre', href: '/legal/mentions-legales' }, CONTACT]
};

export const TEACHER_VIEW: AudienceView = {
	id: 'teacher',
	seoTitle: 'Pour les professeurs | Chiphre',
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

// Functions

/** Les données structurées schema.org d'une FAQ (questions et réponses en texte brut) */
export function faqJsonLd(faq: FaqEntry[]) {
	return {
		'@context': 'https://schema.org',
		'@type': 'FAQPage',
		mainEntity: faq.map((entry) => ({
			'@type': 'Question',
			name: entry.question,
			acceptedAnswer: { '@type': 'Answer', text: entry.answer }
		}))
	};
}
