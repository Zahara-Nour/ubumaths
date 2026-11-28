/**
 * Base locale remplie, chantier `seed-complet`, PR 4 — échanges et famille des élèves fictifs.
 *
 * Fonction pure et déterministe (graine fixe), comme `jeux.ts` : elle ne touche ni réseau ni
 * base, `index.ts` insère ce qu'elle rend. Tests : scripts/__tests__/db-seed-echanges.test.ts.
 * Phase 0 validée par David le 2026-11-22 (docs/wip/seed-complet-progress.md § 11).
 *
 * Ce qu'elle invente : messagerie du prof, réactions et modération de la discussion de classe,
 * conversations avec le tuteur (réponses écrites à l'avance, aucun appel à l'IA), annonces du prof,
 * marché des cartes VIP, consentements parentaux, carnet de liaison d'une classe (faux parents en
 * `@example.test`, rien n'est envoyé), élèves en attente d'activation, cahier de texte, liens de
 * partage, tableau de tâches du prof, signalements de bug.
 *
 * Mêmes règles que l'appli, recopiées :
 * - message privé (`send_private_message`) : un message sans parent est sa propre racine de fil, un
 *   message répondu reprend la racine de son parent ; une ligne de boîte par destinataire ; le texte
 *   brut est celui du document. Pas la fonction elle-même : elle date tout de `now()`, et la boîte
 *   d'un mois de messages arriverait à la même seconde ;
 * - empreintes du carnet : sha256 en hexadécimal de l'adresse normalisée (`hashParentEmail`) et
 *   des jetons (`hashCarnetToken`).
 *
 * Écrit par la base, pas ici : l'accord d'un consentement (`grant_parental_consent`, appelée par
 * `index.ts` sur les demandes de `consentementsAccordes`), les échanges entre amis conclus
 * (`execute_trade`, qui déplace les cartes), le nombre de messages d'une conversation du tuteur et
 * celui des propositions d'une annonce (déclencheurs), l'index de recherche des messages.
 *
 * Cas toujours présents : l'élève « absent » (le dernier de la première classe) n'a ni tuteur, ni
 * annonce, ni message, sauf celui que le prof envoie à toute sa classe ; l'élève hors classe n'a
 * rien, pas même une demande de consentement ; un message de la discussion est signalé en attente ;
 * un élève est restreint dans la discussion ; une demande de consentement est échue.
 *
 * Écrits par les déclencheurs, donc à l'heure du seed : la date de mise à jour d'une conversation
 * du tuteur (le compteur de messages la touche), la date de fin d'un échange conclu, la révocation
 * du lien de l'élève qui a arrêté le carnet. Aucune page ne les lit.
 */

import { createHash } from 'node:crypto';

/** Début de tous les identifiants inventés ici : le seed les retrouve pour les effacer. */
export const PREFIXE_ECHANGES = '5eed5c03';

/**
 * Tables effacées par préfixe au début de chaque passage (`index.ts`). Les autres tables écrites
 * partent avec leur parent, par suppression en cascade (test : chaque table écrite est l'une ou
 * l'autre).
 */
export const NETTOYAGE_ECHANGES: readonly string[] = [
	'marketplace_trades',
	'marketplace_locked_cards',
	'marketplace_listings',
	'marketplace_config',
	'private_messages',
	'message_drafts',
	'message_reactions',
	'message_reports',
	'user_restrictions',
	'moderation_logs',
	'tutor_conversations',
	'notifications',
	'parent_notifications',
	'parent_contacts',
	'parental_consents',
	'pending_students',
	'class_journal_entries',
	'class_course_share_tokens',
	'class_journal_share_tokens',
	'exercise_share_tokens',
	'kanban_boards',
	'bug_reports'
];

export interface ContexteEchanges {
	prof: string;
	admin: string;
	/** Classes actives, les plus remplies d'abord (comme `jeux.ts`). */
	classes: { id: string; eleves: string[]; ecole: string | null; niveau: string | null }[];
	horsClasse: string;
	maintenant: Date;
	graine: number;
	/** Discussion de classe inventée par `activite.ts`. */
	discussion: {
		conversation: string;
		messages: { id: string; auteur: string; date: string }[];
	} | null;
	/** Cartes VIP libres (ni utilisées, ni en demande d'activation) en main de chaque élève. */
	mains: { eleve: string; cartes: { instance: string; modele: string }[] }[];
	/** Amitiés acceptées. */
	amis: [string, string][];
	/** Élèves soumis au consentement parental. */
	soumisAuConsentement: string[];
	/** Points vivants du programme, par classe. */
	points: Record<string, string[]>;
	exercices: string[];
	/**
	 * Tirage des jetons des liens de partage. `index.ts` passe un tirage cryptographique : tirés de la
	 * graine, publique, ils se recalculeraient depuis le dépôt. Absent (tests) : tirés de la graine.
	 */
	jetonDePartage?: () => string;
}

type Lignes = Record<string, unknown>[];

const JOUR = 86_400_000;
const HEURE = 3_600_000;
const MINUTE = 60_000;

/** Alphabet des liens de partage (`generateShareTokenString`). */
export const CARACTERES_LIEN = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Fils de la messagerie : [objet, message de l'élève, réponse du prof (ou rien)]. */
const FILS_ELEVE: [string, string, string | null][] = [
	[
		'Exercice 3 de la fiche',
		"Bonjour, je n'ai pas compris l'exercice 3 : il faut développer ou factoriser ?",
		'Il faut factoriser : cherche d’abord le facteur commun aux deux termes.'
	],
	[
		'Absence de jeudi',
		"Bonjour, j'étais absent jeudi. Qu'est-ce que je dois rattraper ?",
		'Tout est dans le cahier de texte, et la fiche est dans tes devoirs.'
	],
	['Merci', "Merci pour la correction du contrôle, j'ai compris mes erreurs.", null],
	[
		'Question sur les fractions',
		'Est-ce que 4/6 et 2/3 sont vraiment égales ?',
		'Oui : divise le numérateur et le dénominateur de 4/6 par 2.'
	]
];

/** Messages du prof à un élève, et la réponse de l'élève. */
const FILS_PROF: [string, string, string | null][] = [
	[
		'Interrogation de mardi',
		'Pense à revoir les fractions pour l’interrogation de mardi.',
		"D'accord, merci !"
	],
	['Bravo', 'Très beau travail sur la dernière fiche, continue comme ça.', null]
];

const MESSAGE_CLASSE: [string, string] = [
	'Sortie au planétarium',
	'La sortie au planétarium aura lieu vendredi : pensez à rapporter l’autorisation signée.'
];

/** Conversations avec le tuteur : sujet, énoncé, puis paires [question de l'élève, réponse]. */
const TUTEUR: { sujet: string; enonce: string; echanges: [string, string][] }[] = [
	{
		sujet: 'équations',
		enonce: 'Résoudre 3x + 5 = 20.',
		echanges: [
			['Je ne sais pas par où commencer.', 'Que faut-il faire pour que x reste seul d’un côté ?'],
			['Enlever 5 des deux côtés ?', 'Exactement. Qu’obtiens-tu alors ?'],
			['3x = 15, donc x = 5.', 'Bravo ! Vérifie : 3 × 5 + 5 fait bien 20.']
		]
	},
	{
		sujet: 'fractions',
		enonce: 'Calculer 2/3 + 1/4.',
		echanges: [
			['On additionne les numérateurs ?', 'Pas encore : les dénominateurs sont-ils les mêmes ?'],
			['Non, 3 et 4.', 'Cherche un multiple commun à 3 et 4, puis réécris chaque fraction.'],
			['12 ! Donc 8/12 + 3/12 = 11/12.', 'C’est juste.']
		]
	},
	{
		sujet: 'pourcentages',
		enonce: 'Un pull à 40 € est soldé à −25 %. Quel est son nouveau prix ?',
		echanges: [
			['25 % de 40, c’est combien ?', 'Commence par 10 % de 40 : que vaut-il ?'],
			['4, donc 25 % c’est 10.', 'Oui. Et le nouveau prix ?'],
			['30 €.', 'Parfait.']
		]
	}
];

const METHODES_TUTEUR = ['socratic', 'decomposition', 'worked_example', 'formula_reminder'];

const ANNONCES: { titre: string; message: string; type: string; priorite: string }[] = [
	{
		titre: 'Contrôle de mardi',
		message: 'Le contrôle porte sur les chapitres 3 et 4. Révisez avec les fiches de révision.',
		type: 'reminder',
		priorite: 'important'
	},
	{
		titre: 'Nouvelle fiche disponible',
		message: 'Une fiche sur les fractions vous attend dans vos devoirs.',
		type: 'info',
		priorite: 'normal'
	},
	{
		titre: 'Tournoi de démineur',
		message: 'Le tournoi de la classe est ouvert jusqu’à la fin du mois. Bonne chance !',
		type: 'announcement',
		priorite: 'normal'
	}
];

const SEANCES: { contenu: string; devoir: string | null }[] = [
	{
		contenu: 'Activité d’introduction, puis cours : définition et premiers exemples.',
		devoir: null
	},
	{
		contenu: 'Correction des exercices, puis méthode : comment rédiger une solution.',
		devoir: 'Exercices 12 et 13 page 54.'
	},
	{ contenu: 'Travail en groupes sur un problème ouvert.', devoir: null },
	{
		contenu: 'Cours : propriétés et démonstration. Exercices d’application.',
		devoir: 'Apprendre le cours et faire la fiche d’entraînement.'
	},
	{ contenu: 'Interrogation de 20 minutes, puis début du chapitre suivant.', devoir: null },
	{
		contenu: 'Exercices de synthèse, préparation du contrôle.',
		devoir: 'Réviser le chapitre pour le contrôle.'
	}
];

const TACHES: {
	titre: string;
	colonne: number;
	etiquette: number | null;
	echeance: number | null;
}[] = [
	{ titre: 'Corriger les copies de la classe', colonne: 0, etiquette: 0, echeance: 3 },
	{ titre: 'Préparer le contrôle du chapitre 4', colonne: 0, etiquette: 2, echeance: 6 },
	{ titre: 'Photocopier la fiche de révision', colonne: 0, etiquette: 2, echeance: 1 },
	{ titre: 'Réunion parents-professeurs', colonne: 0, etiquette: 1, echeance: 10 },
	{ titre: 'Saisir les notes du trimestre', colonne: 1, etiquette: 0, echeance: 5 },
	{ titre: 'Préparer la sortie au planétarium', colonne: 1, etiquette: 1, echeance: 4 },
	{ titre: 'Relire les fiches de 6e', colonne: 1, etiquette: 2, echeance: null },
	{ titre: 'Rendre les copies de l’interrogation', colonne: 2, etiquette: 0, echeance: null },
	{ titre: 'Conseil pédagogique', colonne: 2, etiquette: 1, echeance: null },
	{ titre: 'Mettre à jour le cahier de texte', colonne: 2, etiquette: null, echeance: null }
];

const BUGS: {
	categorie: string;
	gravite: string;
	titre: string;
	description: string;
	etat: string;
	page: string;
	parLeProf?: boolean;
}[] = [
	{
		categorie: 'bug',
		gravite: 'medium',
		titre: 'Le bouton Valider ne répond pas',
		description:
			'Sur la fiche de fractions, le bouton Valider ne fait rien quand je clique dessus.',
		etat: 'pending',
		page: '/dashboard/student/worksheets'
	},
	{
		categorie: 'content',
		gravite: 'low',
		titre: 'Faute dans un énoncé',
		description: 'Dans la question 4, il est écrit « les nombre » au lieu de « les nombres ».',
		etat: 'resolved',
		page: '/dashboard/student/work'
	},
	{
		categorie: 'ux',
		gravite: 'low',
		titre: 'Texte trop petit sur téléphone',
		description: 'Sur mon téléphone, les consignes des exercices sont difficiles à lire.',
		etat: 'acknowledged',
		page: '/dashboard/student'
	},
	{
		categorie: 'bug',
		gravite: 'high',
		titre: 'Page blanche au démineur',
		description: 'Quand je lance une partie experte, la page devient blanche et je dois recharger.',
		etat: 'in_progress',
		page: '/dashboard/student/minesweeper'
	},
	{
		categorie: 'feature',
		gravite: 'low',
		titre: 'Pouvoir changer la couleur du Palotin',
		description: 'Ce serait bien de pouvoir choisir la couleur de mon Palotin dans la chatterie.',
		etat: 'wont_fix',
		page: '/dashboard/student/chatterie'
	},
	{
		categorie: 'bug',
		gravite: 'medium',
		titre: 'Le bouton Valider ne marche pas',
		description: 'Le bouton Valider de la fiche ne fait rien, comme l’a déjà signalé un camarade.',
		etat: 'duplicate',
		page: '/dashboard/student/worksheets'
	},
	{
		categorie: 'bug',
		gravite: 'medium',
		titre: 'Export de la fiche en PDF incomplet',
		description:
			'La dernière page de la fiche exportée en PDF n’affiche pas la figure de l’exercice 5.',
		etat: 'pending',
		page: '/dashboard/teacher/series',
		parLeProf: true
	},
	{
		categorie: 'other',
		gravite: 'low',
		titre: 'Question sur les Gidouilles',
		description: 'Je ne comprends pas pourquoi mon nombre de Gidouilles a baissé cette semaine.',
		etat: 'resolved',
		page: '/dashboard/student/inventory'
	},
	{
		categorie: 'ux',
		gravite: 'medium',
		titre: 'Liste des élèves trop longue à charger',
		description: 'La liste des élèves de la classe met plusieurs secondes à s’afficher le matin.',
		etat: 'acknowledged',
		page: '/dashboard/teacher/students',
		parLeProf: true
	},
	{
		categorie: 'content',
		gravite: 'medium',
		titre: 'Réponse refusée alors qu’elle est juste',
		description:
			'J’ai répondu 0,5 et la correction attendait 1/2 : ma réponse a été comptée fausse.',
		etat: 'pending',
		page: '/dashboard/student/work'
	}
];

function aleatoire(graine: number): () => number {
	let a = graine >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/** Empreinte du carnet : sha256 en hexadécimal (`hashParentEmail`, `hashCarnetToken`). */
export function empreinte(texte: string): string {
	return createHash('sha256').update(texte).digest('hex');
}

/** Document de l'éditeur de messages (un paragraphe) et son texte brut. */
export function documentTexte(texte: string) {
	return {
		content: {
			type: 'doc',
			content: [{ type: 'paragraph', content: [{ type: 'text', text: texte }] }]
		},
		plain_text: texte
	};
}

/** Date AAAA-MM-JJ (UTC) d'un instant. */
function jour(ms: number): string {
	return new Date(ms).toISOString().slice(0, 10);
}

/** Les jours de classe (lundi à vendredi) avant `ms`, du plus ancien au plus récent. */
export function joursDeClasse(ms: number, nombre: number, ecart: number): number[] {
	const jours: number[] = [];
	let t = ms - JOUR;
	while (jours.length < nombre) {
		const j = new Date(t).getUTCDay();
		if (j !== 0 && j !== 6) {
			jours.unshift(t);
			t -= ecart * JOUR;
		} else {
			t -= JOUR;
		}
	}
	return jours;
}

/** Complète chaque ligne des colonnes des autres lignes : `defauts`, sinon `null`. */
export function uniformiser(lignes: Lignes, defauts: Record<string, unknown>) {
	const colonnes = new Set(lignes.flatMap((l) => Object.keys(l)));
	for (const l of lignes) {
		for (const col of colonnes) if (!(col in l)) l[col] = col in defauts ? defauts[col] : null;
	}
}

export function planEchanges(c: ContexteEchanges) {
	const r = aleatoire(c.graine);
	const uuid = () =>
		`${PREFIXE_ECHANGES}-xxxx-4xxx-8xxx-xxxxxxxxxxxx`.replace(/x/g, () =>
			Math.floor(r() * 16).toString(16)
		);
	const entier = (min: number, max: number) => min + Math.floor(r() * (max - min + 1));
	const choisir = <T>(liste: readonly T[]) => liste[Math.floor(r() * liste.length)];
	const iso = (ms: number) => new Date(ms).toISOString();
	const lien = (longueur = 32) =>
		Array.from({ length: longueur }, () => choisir([...CARACTERES_LIEN])).join('');
	const jetonDePartage = c.jetonDePartage ?? (() => lien());
	const t0 = c.maintenant.getTime();

	const premiere = c.classes[0]?.eleves ?? [];
	const absent = premiere.length > 1 ? premiere.at(-1) : undefined;
	const classeDe = new Map<string, (typeof c.classes)[number]>();
	for (const k of c.classes) for (const e of k.eleves) classeDe.set(e, k);
	const actifs = c.classes.flatMap((k) => k.eleves).filter((e) => e !== absent);

	// --- Messagerie du prof ------------------------------------------------------------------------
	const messagesPrives: Lignes = [];
	const boites: Lignes = [];
	const envoyer = (p: {
		de: string;
		a: string[];
		objet: string;
		texte: string;
		quand: number;
		parent?: { id: string; racine: string };
		classe?: string;
		lu?: boolean;
		archive?: boolean;
	}) => {
		const id = uuid();
		messagesPrives.push({
			id,
			sender_id: p.de,
			subject: p.objet,
			...documentTexte(p.texte),
			parent_message_id: p.parent?.id ?? null,
			thread_root_id: p.parent?.racine ?? id,
			is_group_message: p.classe !== undefined,
			class_id: p.classe ?? null,
			recipient_count: p.a.length,
			sent_at: iso(p.quand)
		});
		for (const destinataire of p.a) {
			boites.push({
				id: uuid(),
				message_id: id,
				recipient_id: destinataire,
				status: p.archive ? 'archived' : 'inbox',
				read_at: p.lu ? iso(p.quand + entier(10, 600) * MINUTE) : null,
				received_at: iso(p.quand)
			});
		}
		return { id, racine: p.parent?.racine ?? id };
	};
	const correspondants = actifs.filter((_, i) => i % 3 === 0);
	correspondants.forEach((eleve, i) => {
		const [objet, question, reponse] = FILS_ELEVE[i % FILS_ELEVE.length];
		const quand = t0 - entier(2, 20) * JOUR - entier(0, 8) * HEURE;
		// Le prof a lu tous les messages, sauf le dernier arrivé.
		const premier = envoyer({
			de: eleve,
			a: [c.prof],
			objet,
			texte: question,
			quand,
			lu: i !== correspondants.length - 1,
			archive: i === 2
		});
		if (reponse) {
			envoyer({
				de: c.prof,
				a: [eleve],
				objet: `Re: ${objet}`,
				texte: reponse,
				quand: quand + entier(1, 20) * HEURE,
				parent: premier,
				lu: r() < 0.7
			});
		}
	});
	FILS_PROF.forEach(([objet, texte, reponse], i) => {
		const eleve = actifs[(i * 5 + 1) % Math.max(actifs.length, 1)];
		if (!eleve) return;
		const quand = t0 - entier(3, 12) * JOUR;
		const premier = envoyer({ de: c.prof, a: [eleve], objet, texte, quand, lu: true });
		if (reponse) {
			envoyer({
				de: eleve,
				a: [c.prof],
				objet: `Re: ${objet}`,
				texte: reponse,
				quand: quand + entier(2, 30) * HEURE,
				parent: premier,
				lu: true
			});
		}
	});
	if (c.classes[0] && premiere.length > 0) {
		envoyer({
			de: c.prof,
			a: premiere,
			objet: MESSAGE_CLASSE[0],
			texte: MESSAGE_CLASSE[1],
			quand: t0 - 4 * JOUR,
			classe: c.classes[0].id,
			lu: r() < 0.5
		});
	}
	const brouillons: Lignes = actifs[0]
		? [
				{
					id: uuid(),
					author_id: c.prof,
					subject: 'Conseil de classe',
					content: documentTexte('Bonjour, le conseil de classe aura lieu le').content,
					recipient_ids: [actifs[0]],
					is_group_message: false,
					created_at: iso(t0 - 2 * HEURE),
					updated_at: iso(t0 - HEURE),
					last_autosave_at: iso(t0 - HEURE)
				}
			]
		: [];

	// --- Discussion de classe : réactions et modération ---------------------------------------------
	const reactions: Lignes = [];
	const signalementsMessages: Lignes = [];
	const restrictions: Lignes = [];
	const moderation: Lignes = [];
	const d = c.discussion;
	if (d) {
		const membres = [c.prof, ...premiere.filter((e) => e !== absent)];
		for (const m of d.messages) {
			const vus = new Set<string>();
			for (let n = entier(0, 3); n > 0; n--) {
				const qui = choisir(membres);
				const emoji = choisir(['👍', '❤️', '😂', '🎉', '🤔']);
				if (qui === m.auteur || vus.has(`${qui}${emoji}`)) continue;
				vus.add(`${qui}${emoji}`);
				reactions.push({
					id: uuid(),
					message_id: m.id,
					user_id: qui,
					emoji,
					// Après le message, jamais après maintenant.
					created_at: iso(Math.min(Date.parse(m.date) + entier(1, 600) * MINUTE, t0 - MINUTE))
				});
			}
		}
		const desEleves = d.messages.filter((m) => m.auteur !== c.prof);
		const temoin = (auteur: string) => premiere.find((e) => e !== auteur && e !== absent);
		// Un signalement en attente du prof, un traité (il a mis l'auteur en pause).
		const [enAttente, traite] = [desEleves[0], desEleves[1]];
		if (enAttente && temoin(enAttente.auteur)) {
			signalementsMessages.push({
				id: uuid(),
				message_id: enAttente.id,
				reported_by: temoin(enAttente.auteur),
				reason: 'inappropriate',
				details: 'Ce message se moque d’un camarade.',
				status: 'pending',
				created_at: iso(Math.min(Date.parse(enAttente.date) + 3 * HEURE, t0 - HEURE))
			});
		}
		if (traite && temoin(traite.auteur)) {
			// Signalé deux heures après le message, traité trois heures plus tard.
			const signale = Math.min(Date.parse(traite.date) + 2 * HEURE, t0 - 8 * HEURE);
			const id = uuid();
			signalementsMessages.push({
				id,
				message_id: traite.id,
				reported_by: temoin(traite.auteur),
				reason: 'spam',
				details: 'Le même message envoyé plusieurs fois.',
				status: 'actioned',
				reviewed_by: c.prof,
				reviewed_at: iso(signale + 3 * HEURE),
				review_notes: 'Rappel des règles de la discussion.',
				created_at: iso(signale)
			});
			moderation.push({
				id: uuid(),
				moderator_id: c.prof,
				action: 'review_report',
				target_type: 'report',
				target_id: id,
				reason: 'Rappel des règles de la discussion.',
				metadata: { status: 'actioned' },
				created_at: iso(signale + 3 * HEURE)
			});
			// Pause finie : une heure, le jour du signalement.
			restrictions.push({
				id: uuid(),
				user_id: traite.auteur,
				scope_type: 'conversation',
				scope_id: d.conversation,
				restriction_type: 'timeout',
				reason: 'Messages répétés dans la discussion.',
				restricted_by: c.prof,
				expires_at: iso(signale + 4 * HEURE),
				created_at: iso(signale + 3 * HEURE)
			});
			moderation.push({
				id: uuid(),
				moderator_id: c.prof,
				action: 'timeout_user',
				target_type: 'user',
				target_id: traite.auteur,
				reason: 'Messages répétés dans la discussion.',
				metadata: { conversation_id: d.conversation, duration_minutes: 60 },
				created_at: iso(signale + 3 * HEURE)
			});
		}
		// Un élève muet dans la discussion jusqu'à demain.
		const muet = premiere.find(
			(e) => e !== absent && e !== traite?.auteur && e !== enAttente?.auteur && e !== premiere[0]
		);
		if (muet) {
			restrictions.push({
				id: uuid(),
				user_id: muet,
				scope_type: 'conversation',
				scope_id: d.conversation,
				restriction_type: 'mute',
				reason: 'Hors sujet à plusieurs reprises.',
				restricted_by: c.prof,
				expires_at: iso(t0 + JOUR),
				created_at: iso(t0 - 3 * HEURE)
			});
			moderation.push({
				id: uuid(),
				moderator_id: c.prof,
				action: 'mute_user',
				target_type: 'user',
				target_id: muet,
				reason: 'Hors sujet à plusieurs reprises.',
				metadata: { conversation_id: d.conversation },
				created_at: iso(t0 - 3 * HEURE)
			});
		}
	}

	// --- Tuteur ------------------------------------------------------------------------------------
	const tuteurConversations: Lignes = [];
	const tuteurMessages: Lignes = [];
	for (const eleve of actifs.filter((_, i) => i % 2 === 0)) {
		for (let n = entier(1, 3); n > 0; n--) {
			const modele = choisir(TUTEUR);
			const debut = t0 - entier(1, 25) * JOUR - entier(0, 10) * HEURE;
			const id = uuid();
			let t = debut;
			let niveauMax = 0;
			for (const [question, reponse] of modele.echanges) {
				t += entier(1, 4) * MINUTE;
				tuteurMessages.push({
					id: uuid(),
					conversation_id: id,
					role: 'user',
					content: question,
					created_at: iso(t)
				});
				const niveau = entier(1, 3);
				niveauMax = Math.max(niveauMax, niveau);
				t += entier(5, 20) * 1000;
				tuteurMessages.push({
					id: uuid(),
					conversation_id: id,
					role: 'assistant',
					content: reponse,
					help_level: niveau,
					help_method_used: choisir(METHODES_TUTEUR),
					cheat_detected: false,
					created_at: iso(t)
				});
			}
			// Le nombre de messages : compté par le déclencheur des messages.
			tuteurConversations.push({
				id,
				student_id: eleve,
				class_id: classeDe.get(eleve)?.id ?? null,
				exercise_statement: modele.enonce,
				exercise_topic: modele.sujet,
				started_at: iso(debut),
				ended_at: iso(t + MINUTE),
				message_count: 0,
				max_help_level_reached: niveauMax,
				effort_score: entier(40, 95),
				topics_covered: [modele.sujet],
				is_active: false,
				created_at: iso(debut)
			});
		}
	}

	// --- Annonces du prof ---------------------------------------------------------------------------
	const notifications: Lignes = [];
	const lecturesNotifications: Lignes = [];
	c.classes.forEach((k, ik) => {
		ANNONCES.slice(0, ik === 0 ? 3 : 2).forEach((a, ia) => {
			const quand = t0 - (ia * 4 + entier(1, 3)) * JOUR;
			const id = uuid();
			notifications.push({
				id,
				created_by: c.prof,
				title: a.titre,
				message: a.message,
				type: a.type,
				priority: a.priorite,
				target_type: 'classes',
				target_class_ids: [k.id],
				is_system: false,
				created_at: iso(quand)
			});
			for (const e of k.eleves.filter((x) => x !== absent && r() < 0.6)) {
				const lu = quand + entier(1, 48) * HEURE;
				lecturesNotifications.push({
					id: uuid(),
					notification_id: id,
					user_id: e,
					read_at: iso(lu),
					created_at: iso(lu)
				});
			}
		});
	});

	// --- Marché des cartes VIP ----------------------------------------------------------------------
	const marcheReglages: Lignes = c.classes.map((k) => ({
		id: uuid(),
		class_id: k.id,
		enabled_globally: false,
		enabled_for_class: true,
		max_listings_per_student: 5,
		max_trades_per_day: 10,
		listing_duration_days: 7,
		updated_by: c.prof
	}));
	const annonces: Lignes = [];
	const propositions: Lignes = [];
	const echanges: Lignes = [];
	const cartesBloquees: Lignes = [];
	const discussionsEchange: Lignes = [];
	/** Échanges entre amis à conclure par `execute_trade` (au nom de l'initiateur). */
	const echangesAConclure: { echange: string; initiateur: string }[] = [];
	/** Propositions acceptées ensuite par `accept_proposal_atomic` (au nom du vendeur). */
	const propositionsAAccepter: { proposition: string; vendeur: string }[] = [];
	const libres = new Map(c.mains.map((m) => [m.eleve, [...m.cartes]]));
	const prendre = (eleve: string) => libres.get(eleve)?.shift();
	const bloquer = (
		eleve: string,
		instance: string,
		pour: 'listing' | 'trade',
		entite: string,
		quand: number
	) =>
		cartesBloquees.push({
			id: uuid(),
			student_id: eleve,
			card_instance_id: instance,
			locked_for: pour,
			locked_entity_id: entite,
			locked_at: iso(quand)
		});
	const offre = (
		de: { cartes: string[]; gidouilles: number },
		a: { cartes: string[]; gidouilles: number }
	) => ({
		from_initiator: { cards: de.cartes, gidouilles: de.gidouilles },
		from_partner: { cards: a.cartes, gidouilles: a.gidouilles }
	});

	// Échanges entre amis d'abord : ils prennent leurs cartes avant les annonces. Le premier, une
	// carte contre une carte, est conclu par `execute_trade` ; le second, une carte contre des
	// Gidouilles, négocie encore, carte bloquée. Une paire n'échange que si ceux qui donnent une
	// carte en ont encore une libre à ce moment-là.
	const aDesCartes = (e: string) => (libres.get(e)?.length ?? 0) > 0;
	const conclu = c.amis.find(([a, b]) => aDesCartes(a) && aDesCartes(b));
	const paires: [string, string, boolean][] = [];
	if (conclu) paires.push([conclu[0], conclu[1], true]);
	// L'échange en cours : une autre paire d'abord, sinon la même (elle peut échanger deux fois).
	const restes = (p: [string, string]) => {
		const sansConclu = (e: string) =>
			(libres.get(e)?.length ?? 0) - (conclu && conclu.includes(e) ? 1 : 0) > 0;
		return sansConclu(p[0]) ? p : sansConclu(p[1]) ? ([p[1], p[0]] as [string, string]) : null;
	};
	const autres = [...c.amis].sort((x, y) => Number(x === conclu) - Number(y === conclu));
	const enCours = autres.map(restes).find((p) => p !== null);
	if (enCours) paires.push([enCours[0], enCours[1], false]);
	paires.forEach(([a, b, valide], i) => {
		const carteA = prendre(a);
		const carteB = valide ? prendre(b) : undefined;
		if (!carteA || (valide && !carteB)) return;
		const debut = t0 - (3 - i * 2) * JOUR;
		const id = uuid();
		echanges.push({
			id,
			trade_type: 'friend',
			status: 'negotiating',
			initiator_id: a,
			partner_id: b,
			current_offer: offre(
				{ cartes: [carteA.instance], gidouilles: 0 },
				carteB ? { cartes: [carteB.instance], gidouilles: 0 } : { cartes: [], gidouilles: 5 }
			),
			last_offer_by: a,
			validated_by_initiator: valide,
			validated_by_partner: valide,
			validated_at: valide ? iso(debut + HEURE) : null,
			confirmation_started_at: valide ? iso(debut + HEURE) : null,
			confirmed_by_initiator: valide,
			confirmed_by_partner: valide,
			created_at: iso(debut)
		});
		if (valide) {
			echangesAConclure.push({ echange: id, initiateur: a });
		} else {
			bloquer(a, carteA.instance, 'trade', id, debut);
		}
		discussionsEchange.push(
			{
				id: uuid(),
				trade_id: id,
				sender_id: a,
				message: valide ? 'Ma carte contre la tienne ?' : 'Ma carte contre 5 Gidouilles ?',
				created_at: iso(debut + 5 * MINUTE)
			},
			{
				id: uuid(),
				trade_id: id,
				sender_id: b,
				message: valide ? 'Ok, ça marche !' : 'Je réfléchis, je te dis ce soir.',
				created_at: iso(debut + 30 * MINUTE)
			}
		);
	});

	for (const k of c.classes) {
		if (!k.ecole) continue;
		const vendeurs = k.eleves.filter((e) => e !== absent && (libres.get(e)?.length ?? 0) > 0);
		vendeurs.slice(0, 4).forEach((vendeur, i) => {
			const carte = prendre(vendeur);
			if (!carte) return;
			const quand = t0 - entier(1, 4) * JOUR;
			const id = uuid();
			// La première annonce de la classe trouve preneur : sa proposition est acceptée ensuite par
			// la fonction de l'appli (`accept_proposal_atomic`), qui conclut l'échange et déplace la carte.
			const conclue = i === 0;
			annonces.push({
				id,
				creator_id: vendeur,
				school_id: k.ecole,
				listing_type: 'sell',
				status: 'active',
				offered_card_ids: [carte.instance],
				wanted_gidouilles: entier(3, 15),
				max_proposals: 10,
				proposal_count: 0,
				view_count: entier(0, 12),
				created_at: iso(quand),
				expires_at: iso(quand + 7 * JOUR)
			});
			bloquer(vendeur, carte.instance, 'listing', id, quand);
			const acheteurs = k.eleves.filter((e) => e !== vendeur && e !== absent);
			const nbPropositions = conclue ? 1 : entier(0, 2);
			for (let n = 0; n < nbPropositions && n < acheteurs.length; n++) {
				const acheteur = acheteurs[(i + n * 3) % acheteurs.length];
				if (propositions.some((p) => p.listing_id === id && p.proposer_id === acheteur)) continue;
				const proposition = uuid();
				propositions.push({
					id: proposition,
					listing_id: id,
					proposer_id: acheteur,
					status: 'pending',
					offered_gidouilles: entier(3, 15),
					message: 'Je te propose des Gidouilles.',
					created_at: iso(quand + HEURE)
				});
				if (conclue) propositionsAAccepter.push({ proposition, vendeur });
			}
		});
		// Une demande : un élève cherche un modèle de carte, contre des Gidouilles.
		const chercheur = k.eleves.find(
			(e) => e !== absent && !annonces.some((a) => a.creator_id === e)
		);
		const modeleVoulu = c.mains.find((m) => m.cartes.length > 0)?.cartes[0]?.modele;
		if (chercheur && modeleVoulu) {
			const quand = t0 - entier(1, 3) * JOUR;
			annonces.push({
				id: uuid(),
				creator_id: chercheur,
				school_id: k.ecole,
				listing_type: 'buy',
				status: 'active',
				offered_gidouilles: 10,
				wanted_card_template_ids: [modeleVoulu],
				max_proposals: 10,
				proposal_count: 0,
				view_count: entier(0, 6),
				created_at: iso(quand),
				expires_at: iso(quand + 7 * JOUR)
			});
		}
		// Une annonce échue, sans carte bloquée (le déblocage suit l'échéance).
		const ancien = vendeurs[4] ?? vendeurs[0];
		const carteEchue = ancien ? libres.get(ancien)?.[0] : undefined;
		if (ancien && carteEchue) {
			const quand = t0 - 12 * JOUR;
			annonces.push({
				id: uuid(),
				creator_id: ancien,
				school_id: k.ecole,
				listing_type: 'sell',
				status: 'expired',
				offered_card_ids: [carteEchue.instance],
				wanted_gidouilles: 20,
				max_proposals: 10,
				proposal_count: 0,
				view_count: 2,
				created_at: iso(quand),
				expires_at: iso(quand + 7 * JOUR)
			});
		}
	}

	// --- Consentements parentaux --------------------------------------------------------------------
	const consentements: Lignes = [];
	const consentementsAccordes: { jeton: string; ip: string }[] = [];
	c.soumisAuConsentement
		.filter((e) => e !== c.horsClasse)
		.forEach((eleve, i) => {
			const nn = eleve.slice(-2);
			const jeton = uuid();
			const envoye = t0 - entier(2, 20) * JOUR;
			const etat = i % 3; // 0 : en attente, 1 : accordé, 2 : échu
			consentements.push({
				id: uuid(),
				student_id: eleve,
				parent_email: `parent.eleve${nn}@example.test`,
				parent_name: `Parent de l’élève ${nn}`,
				status: etat === 2 ? 'expired' : 'pending',
				consent_token: jeton,
				created_at: iso(envoye),
				expires_at: iso(etat === 2 ? t0 - JOUR : envoye + 30 * JOUR),
				last_email_sent_at: iso(envoye),
				email_count: etat === 0 ? 2 : 1
			});
			// Adresse de documentation (RFC 5737) : la preuve d'un accord est fictive.
			if (etat === 1) consentementsAccordes.push({ jeton, ip: `192.0.2.${10 + i}` });
		});

	// --- Carnet de liaison de la première classe -----------------------------------------------------
	const carnetReglages: Lignes = [];
	const parents: Lignes = [];
	const liensParents: Lignes = [];
	const envoisParents: Lignes = [];
	const retraitsCarnet: Lignes = [];
	if (c.classes[0] && premiere.length > 0) {
		carnetReglages.push({
			class_id: c.classes[0].id,
			enabled: true,
			evaluation_missed_alert: true,
			overdue_reviews_days: 7,
			inactivity_days: 14,
			quarterly_message: true,
			updated_by: c.prof
		});
		const familles = premiere.filter((e) => e !== absent).slice(0, 7);
		// Les derniers : un parent a refusé, un autre n'a pas encore confirmé ; les autres ont
		// confirmé (trois au moins dès cinq élèves).
		const etatParent = (i: number) =>
			familles.length >= 3 && i === familles.length - 1
				? 'refused'
				: familles.length >= 3 && i === familles.length - 2
					? 'pending'
					: 'confirmed';
		familles.forEach((eleve, i) => {
			const nn = eleve.slice(-2);
			const email = `parent.eleve${nn}@example.test`;
			const cree = t0 - entier(15, 30) * JOUR;
			const statut = etatParent(i);
			const id = uuid();
			parents.push({
				id,
				student_id: eleve,
				email: statut === 'refused' ? null : email,
				email_hash: empreinte(email),
				status: statut,
				source: i % 2 === 0 ? 'teacher' : 'student',
				// Comme l'appli : l'auteur est celui qui a saisi l'adresse (le prof ou l'élève).
				created_by: i % 2 === 0 ? c.prof : eleve,
				confirm_token_hash: statut === 'pending' ? empreinte(lien()) : null,
				confirm_expires_at: statut === 'pending' ? iso(t0 + 5 * JOUR) : null,
				confirm_sent_count: 1,
				confirm_last_sent_at: iso(cree),
				confirmed_at: statut === 'confirmed' ? iso(cree + entier(1, 48) * HEURE) : null,
				created_at: iso(cree)
			});
			envoisParents.push({
				id: uuid(),
				student_id: eleve,
				contact_id: id,
				kind: 'confirmation',
				status: 'sent',
				created_at: iso(cree)
			});
			if (statut !== 'confirmed') return;
			liensParents.push({
				id: uuid(),
				contact_id: id,
				token_hash: empreinte(lien()),
				expires_at: iso(t0 + 90 * JOUR),
				access_count: entier(0, 6),
				last_accessed_at: r() < 0.6 ? iso(t0 - entier(1, 10) * JOUR) : null,
				created_at: iso(cree + 2 * JOUR)
			});
			envoisParents.push({
				id: uuid(),
				student_id: eleve,
				contact_id: id,
				kind: 'link',
				status: 'sent',
				created_at: iso(cree + 2 * JOUR)
			});
			if (i === 1) {
				envoisParents.push({
					id: uuid(),
					student_id: eleve,
					contact_id: id,
					kind: 'exception',
					reasons: ['evaluation_missed', 'inactivity'],
					status: 'sent',
					access_token_hash: empreinte(lien()),
					created_at: iso(t0 - 3 * JOUR)
				});
			}
			if (i === 2) {
				envoisParents.push({
					id: uuid(),
					student_id: eleve,
					contact_id: id,
					kind: 'quarterly',
					status: 'sent',
					access_token_hash: empreinte(lien()),
					created_at: iso(t0 - 8 * JOUR)
				});
			}
		});
		// Un élève a arrêté les envois à ses parents : le dernier dont le parent a confirmé.
		const retire = familles.filter((_, i) => etatParent(i) === 'confirmed').at(-1);
		if (retire) {
			retraitsCarnet.push({
				student_id: retire,
				stopped_at: iso(t0 - 6 * JOUR),
				stopped_by: retire
			});
		}
	}

	// --- Élèves en attente d'activation (page d'import de l'admin) -------------------------------------
	const enAttente: Lignes = [];
	const classeAttente = c.classes[0];
	for (let n = 1; n <= 3 && classeAttente; n++) {
		enAttente.push({
			id: uuid(),
			email: `attente0${n}@local.test`,
			firstname: 'Élève',
			lastname: `en attente ${n}`,
			grade: classeAttente.niveau,
			school_id: classeAttente.ecole,
			class_ids: [classeAttente.id],
			parent_email: n === 1 ? `parent.attente0${n}@example.test` : null,
			is_activated: false,
			created_at: iso(t0 - n * JOUR)
		});
	}

	// --- Cahier de texte ----------------------------------------------------------------------------
	const seances: Lignes = [];
	const devoirs: Lignes = [];
	const pointsSeances: Lignes = [];
	const activitesSeances: Lignes = [];
	c.classes.forEach((k, ik) => {
		const jours = joursDeClasse(t0, ik === 0 ? 6 : 4, 3);
		const pointsClasse = c.points[k.id] ?? [];
		jours.forEach((ms, i) => {
			const modele = SEANCES[i % SEANCES.length];
			const id = uuid();
			seances.push({
				id,
				class_id: k.id,
				entry_date: jour(ms),
				lesson_content: modele.contenu,
				is_published: true,
				created_at: iso(ms + 17 * HEURE),
				updated_at: iso(ms + 17 * HEURE)
			});
			const derniere = i === jours.length - 1;
			const devoir = derniere
				? 'Fiche de révision à finir pour la semaine prochaine.'
				: modele.devoir;
			if (devoir) {
				devoirs.push({
					id: uuid(),
					entry_id: id,
					content: devoir,
					// Le devoir de la dernière séance est à rendre la semaine prochaine.
					due_date: jour(derniere ? t0 + 7 * JOUR : ms + 3 * JOUR),
					display_order: 0,
					created_at: iso(ms + 17 * HEURE)
				});
			}
			for (const p of new Set([pointsClasse[i * 2], pointsClasse[i * 2 + 1]].filter(Boolean))) {
				pointsSeances.push({
					id: uuid(),
					entry_id: id,
					point_id: p,
					source: 'manual',
					created_at: iso(ms + 17 * HEURE)
				});
			}
			const exercice = c.exercices[i % Math.max(c.exercices.length, 1)];
			activitesSeances.push(
				exercice && i % 2 === 1
					? {
							id: uuid(),
							entry_id: id,
							kind: 'exercise',
							exercise_id: exercice,
							display_order: 0,
							created_at: iso(ms + 17 * HEURE)
						}
					: {
							id: uuid(),
							entry_id: id,
							kind: 'course',
							label: 'Cours au tableau',
							display_order: 0,
							created_at: iso(ms + 17 * HEURE)
						}
			);
		});
	});

	// --- Liens de partage ---------------------------------------------------------------------------
	const finAnnee = t0 + 200 * JOUR;
	const liensCours: Lignes = c.classes.map((k) => ({
		id: uuid(),
		class_id: k.id,
		token: jetonDePartage(),
		is_active: true,
		expires_at: iso(finAnnee),
		access_count: entier(0, 20),
		created_at: iso(t0 - 20 * JOUR),
		created_by: c.prof
	}));
	const liensCahier: Lignes = c.classes.map((k) => ({
		id: uuid(),
		class_id: k.id,
		token: jetonDePartage(),
		is_active: true,
		expires_at: iso(finAnnee),
		access_count: entier(0, 20),
		created_at: iso(t0 - 20 * JOUR),
		created_by: c.prof
	}));
	const liensExercice: Lignes = c.exercices.slice(0, 2).map((exercice, i) => ({
		id: uuid(),
		exercise_id: exercice,
		token: jetonDePartage(),
		created_by: c.prof,
		is_active: true,
		// Le second a expiré : la page publique doit le refuser.
		expires_at: iso(i === 0 ? t0 + 30 * JOUR : t0 - 2 * JOUR),
		access_count: entier(0, 8),
		created_at: iso(t0 - 15 * JOUR)
	}));

	// --- Tableau de tâches du prof -------------------------------------------------------------------
	const tableau = uuid();
	const tableaux: Lignes = [
		{
			id: tableau,
			owner_id: c.prof,
			title: 'Organisation de la classe',
			created_at: iso(t0 - 30 * JOUR)
		}
	];
	const colonnes: Lignes = ['À faire', 'En cours', 'Fait'].map((titre, i) => ({
		id: uuid(),
		board_id: tableau,
		title: titre,
		position: i + 1,
		created_at: iso(t0 - 30 * JOUR)
	}));
	const etiquettes: Lignes = [
		['Copies', 'red'],
		['Réunion', 'blue'],
		['Préparation', 'green']
	].map(([nom, couleur]) => ({
		id: uuid(),
		board_id: tableau,
		name: nom,
		color: couleur,
		created_at: iso(t0 - 30 * JOUR)
	}));
	const cartesTaches: Lignes = [];
	const etiquettesCartes: Lignes = [];
	TACHES.forEach((t, i) => {
		const id = uuid();
		cartesTaches.push({
			id,
			column_id: colonnes[t.colonne].id,
			title: t.titre,
			position: i + 1,
			due_date: t.echeance === null ? null : iso(t0 + t.echeance * JOUR),
			created_at: iso(t0 - entier(2, 25) * JOUR)
		});
		if (t.etiquette !== null) {
			etiquettesCartes.push({ card_id: id, tag_id: etiquettes[t.etiquette].id });
		}
	});

	// --- Signalements de bug -------------------------------------------------------------------------
	const bugs: Lignes = [];
	const signaleurs = actifs.filter((_, i) => i % 4 === 1);
	BUGS.forEach((b, i) => {
		const auteur = b.parLeProf ? c.prof : signaleurs[i % Math.max(signaleurs.length, 1)];
		if (!auteur) return;
		const cree = t0 - entier(1, 20) * JOUR;
		const traite = b.etat === 'resolved' || b.etat === 'wont_fix' || b.etat === 'duplicate';
		bugs.push({
			id: uuid(),
			user_id: auteur,
			category: b.categorie,
			severity: b.gravite,
			title: b.titre,
			description: b.description,
			page_url: `http://localhost:5173${b.page}`,
			user_agent: 'Mozilla/5.0 (base locale fictive)',
			viewport_size: '1280x800',
			status: b.etat,
			resolution_notes: traite ? 'Traité en local (données fictives).' : null,
			resolved_by: traite ? c.admin : null,
			resolved_at: traite ? iso(cree + 2 * JOUR) : null,
			auto_generated: false,
			created_at: iso(cree),
			updated_at: iso(traite ? cree + 2 * JOUR : cree)
		});
	});

	// Toutes les lignes d'une table ont les mêmes colonnes (`ajouter` prend celles de la première) :
	// une colonne absente d'une ligne prend la valeur par défaut de la table, ou rien.
	uniformiser(annonces, {
		offered_card_ids: [],
		offered_gidouilles: 0,
		wanted_card_template_ids: [],
		wanted_gidouilles: 0
	});
	uniformiser(echanges, {
		validated_by_initiator: false,
		validated_by_partner: false,
		confirmed_by_initiator: false,
		confirmed_by_partner: false
	});
	uniformiser(tuteurMessages, { cheat_detected: false });
	// `reasons` : non nul, vide par défaut.
	uniformiser(envoisParents, { reasons: [] });
	for (const lignes of [signalementsMessages, activitesSeances, discussionsEchange]) {
		uniformiser(lignes, {});
	}

	return {
		messagesPrives,
		boites,
		brouillons,
		reactions,
		signalementsMessages,
		restrictions,
		moderation,
		tuteurConversations,
		tuteurMessages,
		notifications,
		lecturesNotifications,
		annonces,
		propositions,
		echanges,
		cartesBloquees,
		discussionsEchange,
		consentements,
		parents,
		liensParents,
		envoisParents,
		retraitsCarnet,
		enAttente,
		seances,
		devoirs,
		pointsSeances,
		activitesSeances,
		liensCours,
		liensCahier,
		liensExercice,
		tableaux,
		colonnes,
		etiquettes,
		cartesTaches,
		etiquettesCartes,
		bugs,
		/** Réglages ajoutés à ceux copiés : écrits par `insert … on conflict (class_id)` dans `index.ts`. */
		marcheReglages,
		carnetReglages,
		/** Demandes accordées ensuite par `grant_parental_consent`. */
		consentementsAccordes,
		/** Échanges entre amis conclus ensuite par `execute_trade`. */
		echangesAConclure,
		/** Propositions acceptées ensuite par `accept_proposal_atomic` : vente conclue, carte déplacée. */
		propositionsAAccepter
	};
}

export type PlanEchanges = ReturnType<typeof planEchanges>;

type PartieEcrite = Exclude<
	keyof PlanEchanges,
	| 'marcheReglages'
	| 'carnetReglages'
	| 'consentementsAccordes'
	| 'echangesAConclure'
	| 'propositionsAAccepter'
>;

/**
 * Où va chaque partie du plan, dans l'ordre d'écriture (une table avant celles qui la désignent).
 * Les réglages (marché, carnet), les accords et les échanges conclus n'y sont pas : `index.ts` les
 * écrit à part.
 */
export const ECRITURE_ECHANGES: readonly {
	partie: PartieEcrite;
	table: string;
	/** Colonnes d'une clé unique de la table (hors `id`) : le plan n'y met jamais deux fois la même. */
	unique?: readonly string[];
	/** Colonnes de type tableau Postgres (le reste des objets part en JSON). */
	tableaux?: readonly string[];
}[] = [
	{ partie: 'messagesPrives', table: 'private_messages' },
	{ partie: 'boites', table: 'message_inbox', unique: ['message_id', 'recipient_id'] },
	{ partie: 'brouillons', table: 'message_drafts', tableaux: ['recipient_ids'] },
	{ partie: 'reactions', table: 'message_reactions', unique: ['message_id', 'user_id', 'emoji'] },
	{
		partie: 'signalementsMessages',
		table: 'message_reports',
		unique: ['message_id', 'reported_by']
	},
	{
		partie: 'restrictions',
		table: 'user_restrictions',
		unique: ['user_id', 'scope_type', 'scope_id', 'restriction_type']
	},
	{ partie: 'moderation', table: 'moderation_logs' },
	{ partie: 'tuteurConversations', table: 'tutor_conversations', tableaux: ['topics_covered'] },
	{ partie: 'tuteurMessages', table: 'tutor_messages' },
	{ partie: 'notifications', table: 'notifications', tableaux: ['target_class_ids'] },
	{
		partie: 'lecturesNotifications',
		table: 'notification_reads',
		unique: ['notification_id', 'user_id']
	},
	{
		partie: 'annonces',
		table: 'marketplace_listings',
		tableaux: ['offered_card_ids', 'wanted_card_template_ids']
	},
	{
		partie: 'propositions',
		table: 'marketplace_proposals',
		unique: ['listing_id', 'proposer_id'],
		tableaux: ['offered_card_ids']
	},
	{ partie: 'echanges', table: 'marketplace_trades' },
	{ partie: 'cartesBloquees', table: 'marketplace_locked_cards', unique: ['card_instance_id'] },
	{ partie: 'discussionsEchange', table: 'marketplace_chat_messages' },
	{ partie: 'consentements', table: 'parental_consents', unique: ['consent_token'] },
	{ partie: 'parents', table: 'parent_contacts', unique: ['student_id', 'email_hash'] },
	{ partie: 'liensParents', table: 'parent_carnet_links', unique: ['token_hash'] },
	{ partie: 'envoisParents', table: 'parent_notifications', tableaux: ['reasons'] },
	{ partie: 'retraitsCarnet', table: 'student_carnet_opt_outs', unique: ['student_id'] },
	{ partie: 'enAttente', table: 'pending_students', unique: ['email'], tableaux: ['class_ids'] },
	{ partie: 'seances', table: 'class_journal_entries', unique: ['class_id', 'entry_date'] },
	{ partie: 'devoirs', table: 'journal_entry_homework' },
	{ partie: 'pointsSeances', table: 'journal_entry_points', unique: ['entry_id', 'point_id'] },
	{ partie: 'activitesSeances', table: 'journal_entry_activities' },
	{ partie: 'liensCours', table: 'class_course_share_tokens', unique: ['token'] },
	{ partie: 'liensCahier', table: 'class_journal_share_tokens', unique: ['token'] },
	{ partie: 'liensExercice', table: 'exercise_share_tokens', unique: ['token'] },
	{ partie: 'tableaux', table: 'kanban_boards' },
	{ partie: 'colonnes', table: 'kanban_columns' },
	{ partie: 'etiquettes', table: 'kanban_tags', unique: ['board_id', 'name'] },
	{ partie: 'cartesTaches', table: 'kanban_cards' },
	{ partie: 'etiquettesCartes', table: 'kanban_card_tags', unique: ['card_id', 'tag_id'] },
	{ partie: 'bugs', table: 'bug_reports' }
];
