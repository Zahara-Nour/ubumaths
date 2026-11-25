/**
 * `pnpm prevenir` : ce qui se décide sans réseau
 * ==============================================
 *
 * Options, texte du message, nom de la session, doublons. L'envoi est dans
 * `index.ts`. Tests : `scripts/__tests__/prevenir.test.ts`.
 *
 * Le canal (ntfy.sh) est un service extérieur : le message ne porte que le nom
 * de la session et une formule fixe. Ni le lien, ni le texte d'une question,
 * ni chemin, ni adresse.
 */

import { basename } from 'node:path';

// Types

export type Mot = 'lien' | 'question' | 'geste';

export interface PrevenirOptions {
	mot: Mot;
	/** Phrase libre de `geste`, `null` pour les deux autres mots */
	phrase: string | null;
	/** Nom imposé par `--session` (tâche planifiée, session sans nom) */
	session: string | null;
	/** `--essai` : montrer le message sans l'envoyer */
	essai: boolean;
}

/** Message envoyé → date du dernier envoi (millisecondes). */
export type Envois = Record<string, number>;

export class PrevenirError extends Error {}

// Constantes

export const MOTS: readonly Mot[] = ['lien', 'question', 'geste'];
export const DELAI_DOUBLON_MS = 10 * 60 * 1000;
export const PHRASE_MAX = 80;
const SESSION_MAX = 60;
const DEPOT_PRINCIPAL = 'ubumaths';
const PREFIXE_WORKTREE = 'ubumaths-wt-';

const USAGE = [
	'Usage : pnpm prevenir <lien | question | geste "courte phrase"> [--session <nom>] [--essai]',
	'  lien      un lien est prêt à essayer',
	'  question  une question attend la réponse de David',
	'  geste     autre chose à faire par David, dit en une courte phrase'
].join('\n');

/** Un chemin (`/`, `\`), une adresse (`@`, `://`) ou un nom à point (`journal.md`, `exemple.test`). */
const CHEMIN_OU_ADRESSE = /[/\\@]|\S\.[a-z]{2,}/i;

// Functions

function estUnMot(texte: string): texte is Mot {
	return (MOTS as readonly string[]).includes(texte);
}

function verifierPhrase(brute: string): string {
	const phrase = brute.trim();
	if (phrase === '') throw new PrevenirError(`« geste » demande une courte phrase.\n${USAGE}`);
	if (/[\r\n]/.test(phrase)) throw new PrevenirError('La phrase tient sur une seule ligne.');
	if (phrase.length > PHRASE_MAX) {
		throw new PrevenirError(`La phrase fait au plus ${PHRASE_MAX} caractères.`);
	}
	if (CHEMIN_OU_ADRESSE.test(phrase)) {
		throw new PrevenirError(
			'Ni chemin ni adresse dans la phrase : la notification passe par un service extérieur.'
		);
	}
	return phrase;
}

function verifierSession(brute: string): string {
	const nom = brute.trim();
	if (nom === '' || nom.length > SESSION_MAX || /[\r\n]/.test(nom) || /[/\\@]/.test(nom)) {
		throw new PrevenirError(
			`Nom de session refusé : ${SESSION_MAX} caractères au plus, sans chemin ni adresse.`
		);
	}
	return nom;
}

export function parseArgs(argv: string[]): PrevenirOptions {
	const libres: string[] = [];
	let session: string | null = null;
	let essai = false;
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg === '--essai') essai = true;
		else if (arg === '--session') {
			const valeur = argv[++i];
			if (valeur === undefined) throw new PrevenirError(`--session demande un nom.\n${USAGE}`);
			session = verifierSession(valeur);
		} else if (arg.startsWith('--')) throw new PrevenirError(`Option inconnue : ${arg}\n${USAGE}`);
		else libres.push(arg);
	}
	const [mot, ...reste] = libres;
	if (mot === undefined || !estUnMot(mot)) {
		throw new PrevenirError(`Mot attendu : ${MOTS.join(', ')}.\n${USAGE}`);
	}
	if (mot === 'geste') {
		return { mot, phrase: verifierPhrase(reste.join(' ')), session, essai };
	}
	if (reste.length > 0) {
		throw new PrevenirError(
			`« ${mot} » ne prend pas de texte : le message dit seulement qu'il attend, David le lit dans la session.`
		);
	}
	return { mot, phrase: null, session, essai };
}

export function message(mot: Mot, session: string, phrase: string | null): string {
	const tete = `Session « ${session} » : `;
	if (mot === 'lien') return `${tete}un lien est prêt à essayer.`;
	if (mot === 'question') return `${tete}une question attend ta réponse.`;
	return `${tete}${(phrase ?? '').replace(/\.$/, '')}.`;
}

/** Le dernier `/rename` de la session, lu dans son transcript. */
export function titreDuTranscript(contenu: string): string | null {
	const titres = [...contenu.matchAll(/"customTitle":"((?:[^"\\]|\\.)*)"/g)];
	const dernier = titres.at(-1);
	if (dernier === undefined) return null;
	try {
		const titre: unknown = JSON.parse(`"${dernier[1]}"`);
		return typeof titre === 'string' && titre.trim() !== '' ? titre.trim() : null;
	} catch {
		return null;
	}
}

/**
 * `--session`, sinon le `/rename`, sinon le sujet du worktree. Jamais le nom du
 * dépôt principal : le message ne porte pas de nom de projet.
 */
export function nomDeSession(source: {
	explicite: string | null;
	titre: string | null;
	dossier: string;
}): string {
	if (source.explicite !== null) return verifierSession(source.explicite);
	if (source.titre !== null) return verifierSession(source.titre);
	const dossier = basename(source.dossier);
	if (dossier.startsWith(PREFIXE_WORKTREE)) return dossier.slice(PREFIXE_WORKTREE.length);
	return dossier === DEPOT_PRINCIPAL || dossier === '' ? 'sans nom' : dossier;
}

export function lireEnvois(contenu: string): Envois {
	let brut: unknown;
	try {
		brut = JSON.parse(contenu);
	} catch {
		return {};
	}
	if (typeof brut !== 'object' || brut === null || Array.isArray(brut)) return {};
	const envois: Envois = {};
	for (const [cle, valeur] of Object.entries(brut)) {
		if (typeof valeur === 'number' && Number.isFinite(valeur)) envois[cle] = valeur;
	}
	return envois;
}

export function dejaEnvoye(envois: Envois, texte: string, maintenant: number): boolean {
	const dernier = envois[texte];
	return dernier !== undefined && maintenant - dernier < DELAI_DOUBLON_MS;
}

/** Note l'envoi et oublie ceux qui ne peuvent plus être des doublons. */
export function noterEnvoi(envois: Envois, texte: string, maintenant: number): Envois {
	const gardes: Envois = {};
	for (const [cle, date] of Object.entries(envois)) {
		if (maintenant - date < DELAI_DOUBLON_MS) gardes[cle] = date;
	}
	gardes[texte] = maintenant;
	return gardes;
}
