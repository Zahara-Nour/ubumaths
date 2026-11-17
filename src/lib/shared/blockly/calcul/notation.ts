/**
 * Notation texte d'un programme de calcul : `mettre résultat à nombre + 2 ; afficher résultat × 4`.
 *
 * C'est la forme écrite par l'auteur d'un modèle (`attendu:`, `départ:` du bloc ```calcul) et
 * la forme enregistrée de la réponse de l'élève : courte, lisible par le prof, rejouée par
 * l'interpréteur (ADR 0039) après conversion en état Blockly.
 *
 * Instructions, séparées par `;` ou un retour à la ligne :
 * - 5e : `afficher <calcul>`, `résultat = <calcul>` (ou `mettre résultat à <calcul>`),
 *   `répéter n [ … ]` (n entier écrit) ;
 * - 4e : `mettre x à <calcul>` (ou `x = <calcul>`), `ajouter <calcul> à x`,
 *   `si <condition> alors [ … ]`, `si <condition> alors [ … ] sinon [ … ]`,
 *   `répéter <calcul> [ … ]` (nombre de tours calculé) ;
 * - 3e : `répéter jusqu’à <condition> [ … ]`.
 *
 * Calculs : nombres, `nombre` (ou `nombre choisi`), `résultat`, variables, `+ − × ÷` (aussi
 * `- * / :`), `reste de a par b` (a, b : un nombre, un nom ou un calcul entre parenthèses),
 * parenthèses ; × et ÷ avant + et −, de gauche à droite ; un signe − devant un nombre en fait un
 * nombre négatif. Conditions : `<calcul> <comparaison> <calcul>` (= ≠ < > ≤ ≥, aussi `!= <> <=
 * >=`), `non (…)`, `et` avant `ou`, parenthèses ; `faux` = condition vide.
 *
 * La notation lit les blocs de tous les niveaux ; le niveau d'une question est vérifié par
 * l'interpréteur (et `messageNiveau` pour l'auteur).
 *
 * Tortue de 4e / 3e (option `tortue`) : la même notation, avec en plus les instructions tortue
 * `avancer <calcul>`, `reculer <calcul>`, `tourner à droite <calcul>`, `tourner à gauche
 * <calcul>`, `lever le stylo`, `baisser le stylo` (ex. `tourner à gauche 360 ÷ n`) ; sans les
 * mots propres aux programmes de calcul (`afficher`, `nombre`, `résultat`, `reste de`), refusés en
 * les nommant, et des messages aux exemples de la tortue.
 *
 * Lecture souple : accents, majuscules, espaces, virgule ou point décimal. Écriture canonique :
 * `mettre … à …` (en 5e, `résultat = résultat × 3` se lirait comme une égalité), accents, virgule
 * décimale, `−`, `×`, `÷`, `≤`, `≥`, `≠`, `jusqu’à`, parenthèses là seulement où le calcul les
 * exige (et toujours après `non`). Un nom de variable garde sa première écriture.
 *
 * Sans dépendance à Blockly : s'exécute aussi sous Node (correction).
 */

import {
	comparaisonDe,
	lirePilesCalcul,
	niveauAdmet,
	niveauDuBloc,
	nomDeVariable,
	nomsDesVariables,
	normaliserMot,
	operationDe,
	premierBlocInconnuCalcul,
	siDuProgramme,
	tousLesBlocs,
	VARIABLES_MAX,
	verifierNomDeVariable,
	type Comparaison,
	type NiveauCalcul,
	type OperationCalcul
} from './interpreteur';
import { nombreDeTours, premierBlocInconnu, valeurNombre, type BlocLu } from '../lecture';
import { connusTortue } from '../tortue/interpreteur';
import { ecrireSansExposant, messageExposant } from '../nombres';
import { LONGUEUR_MAX_PROGRAMME, type EtatLu, type TexteLu } from '../tortue/notation';

// =============================================================================
// Types
// =============================================================================

type Jeton =
	| { type: '[' | ']' | ';' | '(' | ')' | '=' }
	| { type: 'op'; op: OperationCalcul }
	| { type: 'cmp'; op: Comparaison }
	| { type: 'mot'; mot: string };

type Bloc = Record<string, unknown>;

type Noms = ReadonlyMap<string, string>;

export interface OptionsNotation {
	/** Lire et écrire aussi les instructions tortue (tortue de 4e / 3e). */
	tortue?: boolean;
}

// =============================================================================
// Constantes
// =============================================================================

/** Répétitions, « si », conditions ou parenthèses imbriquées au plus. */
const PROFONDEUR_MAX = 50;

/** Nombre écrit, sans signe : entier ou décimal (virgule ou point). */
const NOMBRE = /^\d+(?:[.,]\d+)?$/;

const SYMBOLES: Record<string, OperationCalcul> = {
	'+': 'ADD',
	'-': 'MINUS',
	'−': 'MINUS',
	'×': 'MULTIPLY',
	'*': 'MULTIPLY',
	'÷': 'DIVIDE',
	'/': 'DIVIDE',
	':': 'DIVIDE'
};

/** Comparaisons écrites (`=` est un jeton à part : il sert aussi à `x = …`). */
const COMPARAISONS_ECRITES: Record<string, Comparaison> = {
	'<': 'LT',
	'<=': 'LTE',
	'≤': 'LTE',
	'>': 'GT',
	'>=': 'GTE',
	'≥': 'GTE',
	'!=': 'NEQ',
	'<>': 'NEQ',
	'≠': 'NEQ'
};

const ECRITURES: Record<OperationCalcul, string> = {
	ADD: '+',
	MINUS: '−',
	MULTIPLY: '×',
	DIVIDE: '÷'
};

const ECRITURES_COMPARAISON: Record<Comparaison, string> = {
	EQ: '=',
	NEQ: '≠',
	LT: '<',
	LTE: '≤',
	GT: '>',
	GTE: '≥'
};

const PRIORITES: Record<OperationCalcul, number> = { ADD: 1, MINUS: 1, MULTIPLY: 2, DIVIDE: 2 };

/** Priorité d'un nombre, d'un nom, d'une comparaison : rien ne l'entoure de parenthèses. */
const PRIORITE_ATOME = 3;

const PRIORITES_LOGIQUES = { OR: 1, AND: 2 } as const;

const EXEMPLE = 'afficher (nombre + 2) × 4';

const EXEMPLE_TORTUE = 'tourner à gauche 360 ÷ n';

/** Exemples d'un « si » et d'une comparaison, dans les messages (calcul, tortue). */
const EXEMPLES_SI = {
	calcul: 'si nombre > 0 alors [ afficher 1 ]',
	tortue: 'si n > 0 alors [ avancer 1 ]'
};
const EXEMPLES_COMPARAISON = { calcul: 'nombre > 0', tortue: 'n > 0' };

/** Instructions tortue à un calcul : mots normalisés → type de bloc et nom de l'entrée. */
const TORTUE_A_CALCUL: readonly { mots: string[]; type: string; entree: string }[] = [
	{ mots: ['avancer'], type: 'tortue_avancer', entree: 'VALEUR' },
	{ mots: ['reculer'], type: 'tortue_reculer', entree: 'VALEUR' },
	{ mots: ['tourner', 'a', 'droite'], type: 'tortue_droite', entree: 'ANGLE' },
	{ mots: ['tourner', 'a', 'gauche'], type: 'tortue_gauche', entree: 'ANGLE' }
];

/** Instructions tortue sans calcul. */
const TORTUE_SEULES: readonly { mots: string[]; type: string }[] = [
	{ mots: ['lever', 'le', 'stylo'], type: 'tortue_lever_stylo' },
	{ mots: ['baisser', 'le', 'stylo'], type: 'tortue_baisser_stylo' }
];

/** Écriture canonique des instructions tortue. */
const ECRITURES_TORTUE: Readonly<Record<string, string>> = {
	tortue_avancer: 'avancer',
	tortue_reculer: 'reculer',
	tortue_droite: 'tourner à droite',
	tortue_gauche: 'tourner à gauche',
	tortue_lever_stylo: 'lever le stylo',
	tortue_baisser_stylo: 'baisser le stylo'
};

/** Les mots du bloc, pour dire à l'auteur quel bloc dépasse le niveau. */
const NOMS_DES_BLOCS: Readonly<Record<string, string>> = {
	variables_set: 'mettre … à',
	math_change: 'ajouter … à',
	calcul_si: 'si … alors',
	calcul_si_sinon: 'si … alors … sinon',
	math_modulo: 'reste de … par',
	controls_repeat_ext: 'répéter (un nombre calculé de fois)',
	calcul_repeter_jusqua: 'répéter jusqu’à',
	logic_negate: 'non'
};

// =============================================================================
// Des blocs vers le texte
// =============================================================================

class TexteIllisible extends Error {}

/** Écriture sans exposant (`1e21`, `1e-7` ne se reliraient pas), signe moins typographique. */
export function ecrireNombreCalcul(n: number): string {
	return ecrireSansExposant(n).replace('-', '−');
}

interface Ecrit {
	texte: string;
	priorite: number;
	negatif: boolean;
}

/** Un calcul écrit, et sa priorité (pour les parenthèses du calcul qui l'entoure). */
function ecrireValeur(bloc: BlocLu | undefined, noms: Noms): Ecrit {
	const atome = (texte: string): Ecrit => ({ texte, priorite: PRIORITE_ATOME, negatif: false });
	if (!bloc) return atome('0');
	if (bloc.type === 'calcul_nombre_choisi') return atome('nombre');
	if (bloc.type === 'calcul_resultat') return atome('résultat');
	if (bloc.type === 'variables_get') return atome(nomDeVariable(bloc, noms));
	if (bloc.type === 'calcul_operation') {
		const op = operationDe(bloc);
		if (op === null) throw new TexteIllisible('Programme illisible.');
		const priorite = PRIORITES[op];
		const a = ecrireValeur(bloc.entrees.A, noms);
		const b = ecrireValeur(bloc.entrees.B, noms);
		// À gauche, une priorité plus faible ; à droite, plus faible ou égale (l'arbre est gardé :
		// `2 × (3 × 4)` reste tel quel) ; un nombre négatif, toujours
		const gauche = a.priorite < priorite || a.negatif ? `(${a.texte})` : a.texte;
		const droite = b.priorite <= priorite || b.negatif ? `(${b.texte})` : b.texte;
		return { texte: `${gauche} ${ECRITURES[op]} ${droite}`, priorite, negatif: false };
	}
	if (bloc.type === 'math_modulo') {
		const facteur = (e: Ecrit) => (e.priorite < PRIORITE_ATOME ? `(${e.texte})` : e.texte);
		const a = facteur(ecrireValeur(bloc.entrees.DIVIDEND, noms));
		const b = facteur(ecrireValeur(bloc.entrees.DIVISOR, noms));
		return atome(`reste de ${a} par ${b}`);
	}
	if (bloc.type !== 'math_number') throw new TexteIllisible('Programme illisible.');
	const n = valeurNombre(bloc);
	return { texte: ecrireNombreCalcul(n), priorite: PRIORITE_ATOME, negatif: n < 0 };
}

/** Une condition écrite, et sa priorité (`ou` 1, `et` 2, le reste 3). */
function ecrireCondition(
	bloc: BlocLu | undefined,
	noms: Noms
): { texte: string; priorite: number } {
	if (!bloc) return { texte: 'faux', priorite: PRIORITE_ATOME };
	if (bloc.type === 'logic_compare') {
		const op = comparaisonDe(bloc);
		if (op === null) throw new TexteIllisible('Programme illisible.');
		const a = ecrireValeur(bloc.entrees.A, noms).texte;
		const b = ecrireValeur(bloc.entrees.B, noms).texte;
		return { texte: `${a} ${ECRITURES_COMPARAISON[op]} ${b}`, priorite: PRIORITE_ATOME };
	}
	if (bloc.type === 'logic_operation') {
		const op = bloc.champs.OP;
		if (op !== 'AND' && op !== 'OR') throw new TexteIllisible('Programme illisible.');
		const priorite = PRIORITES_LOGIQUES[op];
		const a = ecrireCondition(bloc.entrees.A, noms);
		const b = ecrireCondition(bloc.entrees.B, noms);
		const gauche = a.priorite < priorite ? `(${a.texte})` : a.texte;
		const droite = b.priorite <= priorite ? `(${b.texte})` : b.texte;
		return { texte: `${gauche} ${op === 'AND' ? 'et' : 'ou'} ${droite}`, priorite };
	}
	if (bloc.type === 'logic_negate') {
		return {
			texte: `non (${ecrireCondition(bloc.entrees.BOOL, noms).texte})`,
			priorite: PRIORITE_ATOME
		};
	}
	throw new TexteIllisible('Programme illisible.');
}

/** Nombre de tours écrit d'un `controls_repeat` (son champ). */
function tours(bloc: BlocLu): number {
	return nombreDeTours(bloc, () => 0);
}

function ecrirePile(bloc: BlocLu | undefined, noms: Noms): string[] {
	const corps = (contenu: BlocLu | undefined): string => {
		const lignes = ecrirePile(contenu, noms);
		return lignes.length > 0 ? ` ${lignes.join(' ; ')} ` : ' ';
	};
	const valeur = (entree: BlocLu | undefined) => ecrireValeur(entree, noms).texte;
	const instructions: string[] = [];
	for (let courant = bloc; courant; courant = courant.suivant) {
		// Un bloc désactivé n'est pas exécuté, son contenu non plus
		if (!courant.actif) continue;
		const e = courant.entrees;
		switch (courant.type) {
			case 'controls_repeat':
				instructions.push(`répéter ${tours(courant)} [${corps(e.DO)}]`);
				break;
			case 'controls_repeat_ext':
				instructions.push(`répéter ${valeur(e.TIMES)} [${corps(e.DO)}]`);
				break;
			case 'calcul_repeter_jusqua':
				instructions.push(
					`répéter jusqu’à ${ecrireCondition(e.CONDITION, noms).texte} [${corps(e.DO)}]`
				);
				break;
			case 'calcul_afficher':
				instructions.push(`afficher ${valeur(e.VALEUR)}`);
				break;
			case 'calcul_mettre_resultat':
				instructions.push(`mettre résultat à ${valeur(e.VALEUR)}`);
				break;
			case 'variables_set':
				instructions.push(`mettre ${nomDeVariable(courant, noms)} à ${valeur(e.VALUE)}`);
				break;
			case 'math_change':
				instructions.push(`ajouter ${valeur(e.DELTA)} à ${nomDeVariable(courant, noms)}`);
				break;
			case 'calcul_si':
			case 'calcul_si_sinon': {
				const si = `si ${ecrireCondition(e.CONDITION, noms).texte} alors [${corps(e.ALORS)}]`;
				instructions.push(
					courant.type === 'calcul_si_sinon' ? `${si} sinon [${corps(e.SINON)}]` : si
				);
				break;
			}
			case 'tortue_avancer':
			case 'tortue_reculer':
				instructions.push(`${ECRITURES_TORTUE[courant.type]} ${valeur(e.VALEUR)}`);
				break;
			case 'tortue_droite':
			case 'tortue_gauche':
				instructions.push(`${ECRITURES_TORTUE[courant.type]} ${valeur(e.ANGLE)}`);
				break;
			case 'tortue_lever_stylo':
			case 'tortue_baisser_stylo':
				instructions.push(ECRITURES_TORTUE[courant.type]);
				break;
		}
	}
	return instructions;
}

/** Message pour le premier nom de variable refusé des piles ; null s'ils conviennent. */
function nomRefuse(piles: BlocLu[], noms: Noms): string | null {
	for (const pile of piles) {
		for (const bloc of tousLesBlocs(pile)) {
			if (bloc.champs.VAR === undefined) continue;
			const message = verifierNomDeVariable(nomDeVariable(bloc, noms));
			if (message) return message;
		}
	}
	return null;
}

/**
 * Écrit en texte le programme d'un espace de travail Blockly, piles dans l'ordre d'exécution
 * (de haut en bas). Un bloc inconnu, un nom de variable refusé ou un état mal formé rendent une
 * erreur.
 */
export function etatVersTexteCalcul(etat: unknown, options: OptionsNotation = {}): TexteLu {
	let piles: BlocLu[];
	let noms: Noms;
	try {
		piles = lirePilesCalcul(etat);
		noms = nomsDesVariables(etat);
	} catch {
		return { ok: false, message: 'Programme illisible.' };
	}
	const inconnu = (pile: BlocLu): boolean =>
		options.tortue
			? premierBlocInconnu(pile, 'instruction', connusTortue('3e')) !== null
			: premierBlocInconnuCalcul(pile, 'instruction') !== null;
	if (piles.some(inconnu)) {
		return {
			ok: false,
			message: options.tortue
				? 'Ce programme utilise un bloc que la tortue ne connaît pas.'
				: 'Ce programme utilise un bloc qui n’existe pas dans un programme de calcul.'
		};
	}
	try {
		const refuse = nomRefuse(piles, noms);
		if (refuse) return { ok: false, message: refuse };
		return { ok: true, texte: piles.flatMap((pile) => ecrirePile(pile, noms)).join(' ; ') };
	} catch {
		return { ok: false, message: 'Programme illisible.' };
	}
}

/**
 * Réécrit un programme en écriture canonique, pour le montrer à l'élève (corrigé) : un programme
 * illisible est rendu tel quel.
 */
export function reecrireCalcul(texte: string): string {
	const lu = texteVersEtatCalcul(texte);
	if (!lu.ok) return texte;
	const ecrit = etatVersTexteCalcul(lu.etat);
	return ecrit.ok ? ecrit.texte : texte;
}

/**
 * Conditions des « si » d'un programme écrit, dans l'ordre de `siDuProgramme` (celui de
 * `branchesNonParcourues`) ; vide si le programme ne se lit pas.
 */
export function conditionsDuProgramme(texte: string): string[] {
	const lu = texteVersEtatCalcul(texte);
	if (!lu.ok) return [];
	try {
		const noms = nomsDesVariables(lu.etat);
		return siDuProgramme(lirePilesCalcul(lu.etat)).map(
			(bloc) => ecrireCondition(bloc.entrees.CONDITION, noms).texte
		);
	} catch {
		return [];
	}
}

/**
 * Pour l'auteur : la première variable lue mais jamais mise (ni `mettre … à`, ni `ajouter … à`)
 * dans le programme écrit — presque toujours une faute de frappe (`afficher nombr + 2` : la
 * variable `nombr` vaudrait 0, revue #2716) ; null sinon, ou si le programme ne se lit pas.
 */
export function variableJamaisMise(texte: string, options: OptionsNotation = {}): string | null {
	const lu = texteVersEtatCalcul(texte, options);
	if (!lu.ok) return null;
	try {
		const noms = nomsDesVariables(lu.etat);
		const blocs = lirePilesCalcul(lu.etat).flatMap((pile) => [...tousLesBlocs(pile)]);
		const mises = new Set(
			blocs
				.filter((b) => b.type === 'variables_set' || b.type === 'math_change')
				.map((b) => normaliserMot(nomDeVariable(b, noms)))
		);
		const lue = blocs.find(
			(b) => b.type === 'variables_get' && !mises.has(normaliserMot(nomDeVariable(b, noms)))
		);
		return lue ? nomDeVariable(lue, noms) : null;
	} catch {
		return null;
	}
}

/**
 * Pour l'auteur : le bloc du programme écrit qui dépasse le niveau (celui du niveau le plus haut,
 * le premier à égalité), avec le niveau à demander ; null si le programme tient dans le niveau
 * ou ne se lit pas (son erreur est signalée ailleurs).
 */
export function messageNiveau(texte: string, niveau: NiveauCalcul): string | null {
	const lu = texteVersEtatCalcul(texte);
	if (!lu.ok) return null;
	let piles: BlocLu[];
	let noms: Noms;
	try {
		piles = lirePilesCalcul(lu.etat);
		noms = nomsDesVariables(lu.etat);
	} catch {
		return null;
	}
	let pire: { bloc: BlocLu; niveau: NiveauCalcul } | null = null;
	for (const pile of piles) {
		for (const bloc of tousLesBlocs(pile)) {
			const requis = niveauDuBloc(bloc.type);
			if (requis === null || niveauAdmet(niveau, requis)) continue;
			if (pire === null || !niveauAdmet(pire.niveau, requis)) pire = { bloc, niveau: requis };
		}
	}
	if (pire === null) return null;
	return messageBlocAuDessus(pire.bloc, pire.niveau, noms);
}

/**
 * Pour l'auteur : le bloc est d'un niveau au-dessus, `requis` (« « mettre … à » est un bloc de
 * 4e (ajouter niveau: 4e) »). Sert aussi à la tortue de 4e / 3e.
 */
export function messageBlocAuDessus(bloc: BlocLu, requis: string, noms: Noms): string {
	const conseil = `(ajouter niveau: ${requis})`;
	if (bloc.type === 'variables_get') {
		return `« ${nomDeVariable(bloc, noms)} » est une variable : un bloc de ${requis} ${conseil}`;
	}
	const operation = bloc.type === 'calcul_operation' ? operationDe(bloc) : null;
	const nom =
		bloc.type === 'logic_operation'
			? bloc.champs.OP === 'AND'
				? 'et'
				: 'ou'
			: bloc.type === 'logic_compare'
				? ECRITURES_COMPARAISON[comparaisonDe(bloc) ?? 'EQ']
				: operation !== null
					? ECRITURES[operation]
					: (NOMS_DES_BLOCS[bloc.type] ?? bloc.type);
	return `« ${nom} » est un bloc de ${requis} ${conseil}`;
}

// =============================================================================
// Du texte vers les blocs
// =============================================================================

function decouper(texte: string): Jeton[] {
	const jetons: Jeton[] = [];
	const lignes = texte.replace(/\r\n?/g, '\n');
	for (const morceau of lignes.split(
		/(\[|\]|;|\n|\(|\)|<=|>=|!=|<>|≤|≥|≠|<|>|=|\+|-|−|×|\*|÷|\/|:)|[^\S\n]+/
	)) {
		if (!morceau) continue;
		if (morceau === '\n') jetons.push({ type: ';' });
		else if (morceau in SYMBOLES) jetons.push({ type: 'op', op: SYMBOLES[morceau] });
		else if (morceau in COMPARAISONS_ECRITES) {
			jetons.push({ type: 'cmp', op: COMPARAISONS_ECRITES[morceau] });
		} else if (['[', ']', ';', '(', ')', '='].includes(morceau)) {
			jetons.push({ type: morceau as '[' | ']' | ';' | '(' | ')' | '=' });
		} else jetons.push({ type: 'mot', mot: morceau });
	}
	return jetons;
}

/** Nombre écrit ; trop grand pour être lu (Infinity), il est refusé, jamais lu 0. */
function lireNombreFini(mot: string): number {
	const n = Number(mot.replace(',', '.'));
	if (!Number.isFinite(n)) {
		throw new TexteIllisible(`« ${mot.slice(0, 20)}… » : nombre trop grand.`);
	}
	return n;
}

function nombreBloc(n: number): Bloc {
	return { type: 'math_number', fields: { NUM: n } };
}

/** Entrée valeur : un nombre en ombre ; un autre bloc posé sur une ombre 0 (l'élève l'enlève). */
function entree(bloc: Bloc): Bloc {
	return bloc.type === 'math_number' ? { shadow: bloc } : { shadow: nombreBloc(0), block: bloc };
}

/** Entrée posée seulement si elle a un bloc (condition vide, corps vide). */
function entreeBloc(nom: string, bloc: Bloc | null | undefined): Bloc {
	return bloc ? { [nom]: { block: bloc } } : {};
}

/** Relie une liste de blocs par `next` ; rend la tête de la pile. */
function chainer(blocs: Bloc[]): Bloc | undefined {
	for (let i = blocs.length - 2; i >= 0; i--) blocs[i].next = { block: blocs[i + 1] };
	return blocs[0];
}

/**
 * Lit un programme de calcul écrit en texte et le rend en état Blockly (une seule pile, et la
 * liste des variables s'il y en a), prêt pour `executerCalcul` ou pour être rechargé dans
 * l'espace de travail. Texte vide : programme vide.
 */
export function texteVersEtatCalcul(texte: string, options: OptionsNotation = {}): EtatLu {
	if (texte.length > LONGUEUR_MAX_PROGRAMME) {
		return { ok: false, message: 'Programme trop long.' };
	}

	const jetons = decouper(texte);
	let position = 0;
	/** Variables rencontrées : nom comparé → id et première écriture. */
	const variables = new Map<string, { id: string; name: string }>();

	const mot = (k = 0): string | null => {
		const jeton = jetons[position + k];
		return jeton?.type === 'mot' ? normaliserMot(jeton.mot) : null;
	};

	const motEcrit = (k = 0): string | null => {
		const jeton = jetons[position + k];
		return jeton?.type === 'mot' ? jeton.mot : null;
	};

	/** Fin d'une instruction : `;`, `]`, ou la fin du texte. */
	const finInstruction = (): boolean => {
		const jeton = jetons[position];
		return jeton === undefined || jeton.type === ';' || jeton.type === ']';
	};

	const domaine = options.tortue ? 'tortue' : 'calcul';

	/** Mot propre aux programmes de calcul, écrit dans un programme tortue. */
	const absentDeLaTortue = (ecrit: string): TexteIllisible =>
		new TexteIllisible(
			`« ${ecrit} » n’existe pas pour la tortue : dans un calcul, des nombres et des variables (ex. ${EXEMPLE_TORTUE}).`
		);

	const ecrireJeton = (j: Jeton): string =>
		j.type === 'mot'
			? j.mot
			: j.type === 'op'
				? ECRITURES[j.op]
				: j.type === 'cmp'
					? ECRITURES_COMPARAISON[j.op]
					: j.type;

	/** Le texte d'origine, de `debut` à `fin` inclus, pour les messages. */
	const cite = (debut: number, fin = position): string =>
		jetons
			.slice(debut, fin + 1)
			.map(ecrireJeton)
			.join(' ');

	/**
	 * Le nombre écrit à `i`, exposant compris : `1e-2` est découpé en `1e`, `-`, `2` par la
	 * lecture des opérations, et se recolle ici pour le message — seulement s'il est écrit d'un
	 * seul tenant (`avancer 1e − 2` cite « 1e », pas un nombre que l'élève n'a pas écrit).
	 */
	function exposantEcrit(i: number): string {
		const [a, b, c] = [jetons[i], jetons[i + 1], jetons[i + 2]];
		if (a?.type !== 'mot') return '';
		if (/e$/i.test(a.mot) && b?.type === 'op' && c?.type === 'mot') {
			const signes = b.op === 'ADD' ? ['+'] : b.op === 'MINUS' ? ['-', '−'] : [];
			const ecrit = signes.map((s) => `${a.mot}${s}${c.mot}`).find((e) => texte.includes(e));
			if (ecrit) return ecrit;
		}
		return a.mot;
	}

	/** Id de la variable nommée (créée à sa première écriture) ; nom refusé → erreur. */
	function variable(nom: string): string {
		// Tortue : `ajouter 1 à résultat` dit le même refus que `avancer résultat`
		const normal = normaliserMot(nom);
		if (options.tortue && normal === 'resultat') throw absentDeLaTortue('résultat');
		if (options.tortue && normal === 'nombre') throw absentDeLaTortue('nombre');
		const refus = verifierNomDeVariable(nom);
		if (refus) throw new TexteIllisible(refus);
		const cle = normaliserMot(nom);
		const connue = variables.get(cle);
		if (connue) return connue.id;
		if (variables.size >= VARIABLES_MAX) {
			throw new TexteIllisible(`${VARIABLES_MAX} variables au plus.`);
		}
		const id = `var_${variables.size + 1}`;
		variables.set(cle, { id, name: nom });
		return id;
	}

	function lireSuite(profondeur: number): Bloc[] {
		const blocs: Bloc[] = [];
		while (position < jetons.length) {
			const jeton = jetons[position];
			if (jeton.type === ';') {
				position++;
				continue;
			}
			if (jeton.type === ']') {
				if (profondeur === 0) throw new TexteIllisible('Crochet « ] » sans « [ » avant.');
				return blocs;
			}
			blocs.push(lireInstruction(profondeur));
		}
		if (profondeur > 0) throw new TexteIllisible('Crochet « [ » jamais refermé.');
		return blocs;
	}

	/** Un corps entre crochets, après `avant` ; rend la tête de sa pile. */
	function lireCorps(profondeur: number, avant: string): Bloc | undefined {
		if (jetons[position]?.type !== '[') {
			throw new TexteIllisible(`Après « ${avant} », il faut des crochets [ … ].`);
		}
		if (profondeur + 1 > PROFONDEUR_MAX) {
			throw new TexteIllisible('Trop de blocs imbriqués.');
		}
		position++;
		const contenu = chainer(lireSuite(profondeur + 1));
		position++; // le « ] » fermant
		return contenu;
	}

	/** `mettre <nom> à …` ou `<nom> = …` : la variable `résultat` (5e) ou une variable. */
	function mettre(nom: string, debut: number): Bloc {
		if (options.tortue && normaliserMot(nom) === 'resultat') throw absentDeLaTortue('résultat');
		const calcul = entree(lireCalculEntier(debut));
		if (normaliserMot(nom) === 'resultat') {
			return { type: 'calcul_mettre_resultat', inputs: { VALEUR: calcul } };
		}
		return {
			type: 'variables_set',
			fields: { VAR: { id: variable(nom) } },
			inputs: { VALUE: calcul }
		};
	}

	/** Les mots normalisés suivent-ils, à partir de la position ? */
	const suivent = (mots: readonly string[]): boolean => mots.every((m, k) => mot(k) === m);

	/** Instruction tortue (option `tortue`) ; null si ce n'en est pas une. */
	function lireInstructionTortue(debut: number): Bloc | null {
		for (const seule of TORTUE_SEULES) {
			if (!suivent(seule.mots)) continue;
			position += seule.mots.length;
			if (!finInstruction()) {
				throw new TexteIllisible(`« ${cite(debut)} » : instruction mal écrite.`);
			}
			return { type: seule.type };
		}
		for (const aCalcul of TORTUE_A_CALCUL) {
			if (!suivent(aCalcul.mots)) continue;
			position += aCalcul.mots.length;
			if (finInstruction()) {
				throw new TexteIllisible(
					`Après « ${ECRITURES_TORTUE[aCalcul.type]} », il faut un nombre ou un calcul (ex. ${EXEMPLE_TORTUE}).`
				);
			}
			return { type: aCalcul.type, inputs: { [aCalcul.entree]: entree(lireCalculEntier(debut)) } };
		}
		return null;
	}

	function lireInstruction(profondeur: number): Bloc {
		const debut = position;
		if (options.tortue) {
			const tortue = lireInstructionTortue(debut);
			if (tortue) return tortue;
		}
		if (mot() === 'afficher') {
			if (options.tortue) {
				throw new TexteIllisible(
					`« afficher » n’existe pas pour la tortue : elle avance, tourne et répète (ex. ${EXEMPLE_TORTUE}).`
				);
			}
			position++;
			if (finInstruction()) {
				throw new TexteIllisible(`Après « afficher », il faut un calcul (ex. ${EXEMPLE}).`);
			}
			return { type: 'calcul_afficher', inputs: { VALEUR: entree(lireCalculEntier(debut)) } };
		}
		if (mot() === 'mettre' && motEcrit(1) !== null && mot(2) === 'a') {
			const nom = motEcrit(1) as string;
			position += 3;
			return mettre(nom, debut);
		}
		if (motEcrit() !== null && jetons[position + 1]?.type === '=') {
			const nom = motEcrit() as string;
			position += 2;
			return mettre(nom, debut);
		}
		if (mot() === 'ajouter') {
			position++;
			const calcul = lireCalcul(0);
			const nom = mot() === 'a' ? motEcrit(1) : null;
			if (nom === null) {
				throw new TexteIllisible(
					'Après « ajouter … », il faut « à » et le nom d’une variable (ex. ajouter 1 à compteur).'
				);
			}
			position += 2;
			if (!finInstruction())
				throw new TexteIllisible(`« ${cite(debut)} » : instruction mal écrite.`);
			return {
				type: 'math_change',
				fields: { VAR: { id: variable(nom) } },
				inputs: { DELTA: entree(calcul) }
			};
		}
		if (mot() === 'si') {
			position++;
			const condition = lireCondition(0);
			if (mot() !== 'alors') {
				throw new TexteIllisible(
					`Après la condition, il faut « alors » (ex. ${EXEMPLES_SI[domaine]}).`
				);
			}
			position++;
			const alors = lireCorps(profondeur, 'alors');
			const commun = { ...entreeBloc('CONDITION', condition), ...entreeBloc('ALORS', alors) };
			if (mot() !== 'sinon') return { type: 'calcul_si', inputs: commun };
			position++;
			const sinon = lireCorps(profondeur, 'sinon');
			return { type: 'calcul_si_sinon', inputs: { ...commun, ...entreeBloc('SINON', sinon) } };
		}
		if (mot() === 'repeter') {
			position++;
			if (mot() === 'jusqua') {
				position++;
				const condition = lireCondition(0);
				const corps = lireCorps(profondeur, 'répéter jusqu’à …');
				return {
					type: 'calcul_repeter_jusqua',
					inputs: { ...entreeBloc('CONDITION', condition), ...entreeBloc('DO', corps) }
				};
			}
			const ecrit = motEcrit() ?? '';
			const n = NOMBRE.test(ecrit) ? Number(ecrit.replace(',', '.')) : null;
			// Un nombre entier écrit : le bloc de 5e, nombre de tours dans le bloc
			if (n !== null && Number.isInteger(n) && jetons[position + 1]?.type === '[') {
				position++;
				const corps = lireCorps(profondeur, `répéter ${ecrit}`);
				return {
					type: 'controls_repeat',
					fields: { TIMES: n },
					...(corps && { inputs: { DO: { block: corps } } })
				};
			}
			const jeton = jetons[position];
			if (finInstruction() || jeton?.type === '[') {
				throw new TexteIllisible(
					'Après « répéter », il faut un nombre de fois (ex. répéter 4 [ … ]).'
				);
			}
			// Sinon, un nombre de tours calculé (4e)
			const fois = lireCalcul(0);
			// Tortue : un nombre écrit non entier ou négatif est refusé, jamais arrondi en silence
			if (options.tortue && fois.type === 'math_number') {
				const n = Number((fois.fields as { NUM: number }).NUM);
				if (!Number.isInteger(n) || n < 0) {
					throw new TexteIllisible(
						`« répéter ${cite(debut + 1, position - 1)} » : il faut un nombre entier de fois.`
					);
				}
			}
			const corps = lireCorps(profondeur, `répéter ${cite(debut + 1, position - 1)}`);
			return {
				type: 'controls_repeat_ext',
				inputs: { TIMES: entree(fois), ...entreeBloc('DO', corps) }
			};
		}
		// Le reste de l'instruction, pour le message
		while (!finInstruction()) position++;
		position--;
		throw new TexteIllisible(
			`Instruction inconnue : « ${cite(debut)} » (ex. ${options.tortue ? EXEMPLE_TORTUE : EXEMPLE}).`
		);
	}

	/** Un calcul qui va jusqu'à la fin de l'instruction. */
	function lireCalculEntier(debut: number): Bloc {
		const bloc = lireCalcul(0);
		if (!finInstruction()) {
			const jeton = jetons[position];
			if (jeton.type === ')') throw new TexteIllisible('Parenthèse « ) » sans « ( » avant.');
			throw new TexteIllisible(`« ${cite(debut)} » : calcul mal écrit.`);
		}
		return bloc;
	}

	/** Somme ou différence de termes. */
	function lireCalcul(profondeur: number): Bloc {
		let gauche = lireTerme(profondeur);
		for (;;) {
			const jeton = jetons[position];
			if (jeton?.type !== 'op' || PRIORITES[jeton.op] !== 1) return gauche;
			position++;
			const droite = lireTerme(profondeur);
			gauche = operation(jeton.op, gauche, droite);
		}
	}

	/** Produit ou quotient de facteurs. */
	function lireTerme(profondeur: number): Bloc {
		let gauche = lireFacteur(profondeur);
		for (;;) {
			const jeton = jetons[position];
			if (jeton?.type !== 'op' || PRIORITES[jeton.op] !== 2) return gauche;
			position++;
			const droite = lireFacteur(profondeur);
			gauche = operation(jeton.op, gauche, droite);
		}
	}

	function lireFacteur(profondeur: number): Bloc {
		const jeton = jetons[position];
		if (jeton === undefined || jeton.type === ';' || jeton.type === ']') {
			throw new TexteIllisible('Calcul incomplet : il manque un nombre après l’opération.');
		}
		if (profondeur > PROFONDEUR_MAX) throw new TexteIllisible('Trop de parenthèses imbriquées.');
		if (jeton.type === '(') {
			position++;
			const dedans = lireCalcul(profondeur + 1);
			if (jetons[position]?.type !== ')')
				throw new TexteIllisible('Parenthèse « ( » jamais refermée.');
			position++;
			return dedans;
		}
		if (jeton.type === 'op' && jeton.op === 'MINUS') {
			const suivant = jetons[position + 1];
			if (suivant?.type === 'mot' && NOMBRE.test(suivant.mot)) {
				position += 2;
				return nombreBloc(-lireNombreFini(suivant.mot));
			}
			throw new TexteIllisible('Le signe « − » doit être suivi d’un nombre (écrire 0 − … sinon).');
		}
		if (jeton.type === 'mot') {
			const normal = normaliserMot(jeton.mot);
			if (NOMBRE.test(jeton.mot)) {
				position++;
				return nombreBloc(lireNombreFini(jeton.mot));
			}
			if (options.tortue && normal === 'nombre') throw absentDeLaTortue('nombre');
			if (options.tortue && normal === 'resultat') throw absentDeLaTortue('résultat');
			if (options.tortue && normal === 'reste' && mot(1) === 'de') {
				throw absentDeLaTortue('reste de');
			}
			if (normal === 'nombre') {
				position++;
				if (mot() === 'choisi') position++;
				return { type: 'calcul_nombre_choisi' };
			}
			if (normal === 'resultat') {
				position++;
				return { type: 'calcul_resultat' };
			}
			if (normal === 'reste' && mot(1) === 'de') {
				position += 2;
				const a = lireFacteur(profondeur + 1);
				if (mot() !== 'par') {
					throw new TexteIllisible(
						'Après « reste de … », il faut « par » (ex. reste de nombre par 2 ; un calcul se met entre parenthèses).'
					);
				}
				position++;
				const b = lireFacteur(profondeur + 1);
				return { type: 'math_modulo', inputs: { DIVIDEND: entree(a), DIVISOR: entree(b) } };
			}
			if (verifierNomDeVariable(jeton.mot) === null) {
				position++;
				return { type: 'variables_get', fields: { VAR: { id: variable(jeton.mot) } } };
			}
			const exposant = messageExposant(exposantEcrit(position));
			if (exposant) throw new TexteIllisible(exposant);
			throw new TexteIllisible(
				options.tortue
					? `« ${jeton.mot} » : dans un calcul, seulement des nombres et des variables.`
					: `« ${jeton.mot} » : dans un calcul, seulement des nombres, « nombre », « résultat » et des variables.`
			);
		}
		throw new TexteIllisible('Calcul mal écrit : un nombre manque.');
	}

	function operation(op: OperationCalcul, a: Bloc, b: Bloc): Bloc {
		return { type: 'calcul_operation', fields: { OP: op }, inputs: { A: entree(a), B: entree(b) } };
	}

	/** Conditions liées par `ou` ; null = condition vide (`faux`). */
	function lireCondition(profondeur: number): Bloc | null {
		let gauche = lireEt(profondeur);
		while (mot() === 'ou') {
			position++;
			gauche = logique('OR', gauche, lireEt(profondeur));
		}
		return gauche;
	}

	function lireEt(profondeur: number): Bloc | null {
		let gauche = lireNon(profondeur);
		while (mot() === 'et') {
			position++;
			gauche = logique('AND', gauche, lireNon(profondeur));
		}
		return gauche;
	}

	function lireNon(profondeur: number): Bloc | null {
		if (profondeur > PROFONDEUR_MAX) throw new TexteIllisible('Trop de conditions imbriquées.');
		const jeton = jetons[position];
		if (finInstruction() || jeton.type === '[' || mot() === 'alors') {
			throw new TexteIllisible(`Il manque une condition (ex. ${EXEMPLES_SI[domaine]}).`);
		}
		if (mot() === 'non') {
			position++;
			const dedans = lireNon(profondeur + 1);
			return { type: 'logic_negate', inputs: entreeBloc('BOOL', dedans) };
		}
		if (mot() === 'faux') {
			position++;
			return null;
		}
		if (jeton.type === '(') {
			// Une condition entre parenthèses, ou un calcul qui commence par une parenthèse
			// (`(nombre + 1) × 2 > 10`) : on essaie la condition, sinon on relit en calcul
			const avant = position;
			try {
				position++;
				const dedans = lireCondition(profondeur + 1);
				if (jetons[position]?.type === ')') {
					position++;
					return dedans;
				}
			} catch (erreur) {
				if (!(erreur instanceof TexteIllisible)) throw erreur;
			}
			position = avant;
		}
		return lireComparaison(profondeur);
	}

	function lireComparaison(profondeur: number): Bloc {
		const debut = position;
		const a = lireCalcul(profondeur);
		const jeton = jetons[position];
		const op: Comparaison | null =
			jeton?.type === 'cmp' ? jeton.op : jeton?.type === '=' ? 'EQ' : null;
		if (op === null) {
			throw new TexteIllisible(
				`« ${cite(debut, position - 1)} » : il faut une comparaison (ex. ${EXEMPLES_COMPARAISON[domaine]}).`
			);
		}
		position++;
		const b = lireCalcul(profondeur);
		return { type: 'logic_compare', fields: { OP: op }, inputs: { A: entree(a), B: entree(b) } };
	}

	function logique(op: 'AND' | 'OR', a: Bloc | null, b: Bloc | null): Bloc {
		return {
			type: 'logic_operation',
			fields: { OP: op },
			inputs: { ...entreeBloc('A', a), ...entreeBloc('B', b) }
		};
	}

	try {
		const pile = chainer(lireSuite(0));
		const blocs = pile ? [{ ...pile, x: 20, y: 20 }] : [];
		const declarees = [...variables.values()].map(({ name, id }) => ({ name, id }));
		return {
			ok: true,
			etat: {
				blocks: { languageVersion: 0, blocks: blocs },
				...(declarees.length > 0 && { variables: declarees })
			}
		};
	} catch (erreur) {
		const message = erreur instanceof TexteIllisible ? erreur.message : 'Programme illisible.';
		return { ok: false, message };
	}
}
