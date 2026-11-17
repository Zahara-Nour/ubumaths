/**
 * Interpréteur des programmes de calcul en blocs (5e, 4e, 3e ; ADR 0039) : parcourt l'état
 * sérialisé d'un espace de travail Blockly et applique chaque bloc connu, pour un nombre de
 * départ donné (« nombre choisi »). Aucun code n'est généré ni évalué : un bloc inconnu, ou
 * au-dessus du niveau demandé, est refusé.
 *
 * Blocs par niveau (`NIVEAU_DES_BLOCS`) :
 * - 5e : `calcul_nombre_choisi` (le nombre de départ, lu seulement), `math_number`,
 *   `calcul_operation` (+ − × ÷), `calcul_resultat` (variable unique, 0 au départ),
 *   `calcul_mettre_resultat`, `calcul_afficher`, `controls_repeat` (nombre de tours écrit) ;
 * - 4e : variables créées par l'élève (`variables_set`, `variables_get`, `math_change`), « si »
 *   (`calcul_si`, `calcul_si_sinon`), comparaisons (`logic_compare`), reste de la division
 *   (`math_modulo`), répétition à nombre de tours calculé (`controls_repeat_ext`, arrondi) ;
 * - 3e : ET / OU (`logic_operation`), NON (`logic_negate`), « répéter jusqu'à »
 *   (`calcul_repeter_jusqua`).
 *
 * Une variable jamais mise vaut 0 ; une condition vide est fausse ; l'égalité se juge à la marge
 * du jugement (0,1 + 0,2 = 0,3).
 *
 * Sans dépendance à Blockly : s'exécute aussi bien dans le navigateur que sous Node (correction).
 */

import {
	estObjet,
	lirePiles as lirePilesDe,
	nombreDeTours as nombreDeToursDe,
	premierBlocInconnu as premierBlocInconnuDe,
	ProgrammeIllisible,
	valeurNombre,
	type BlocLu,
	type BlocsConnus
} from '../lecture';

// =============================================================================
// Types
// =============================================================================

export type OperationCalcul = 'ADD' | 'MINUS' | 'MULTIPLY' | 'DIVIDE';

export type NiveauCalcul = '5e' | '4e' | '3e';

export type Comparaison = 'EQ' | 'NEQ' | 'LT' | 'LTE' | 'GT' | 'GTE';

export type ErreurCalcul =
	| { type: 'bloc-inconnu'; typeBloc: string }
	| { type: 'trop-long' }
	| { type: 'division-par-zero' }
	| { type: 'nombre-trop-grand' }
	| { type: 'programme-illisible' }
	| { type: 'nom-de-variable'; nom: string }
	| { type: 'trop-de-variables' };

/** Erreurs de la lecture d'un programme, avant son exécution (`preparerProgramme`). */
export type ErreurDeLecture = Extract<
	ErreurCalcul,
	{ type: 'bloc-inconnu' | 'programme-illisible' | 'nom-de-variable' | 'trop-de-variables' }
>;

interface Sortie {
	/** Nombres affichés, dans l'ordre. */
	affichages: number[];
	pas: number;
}

export type ResultatCalcul = ({ ok: true } | { ok: false; erreur: ErreurCalcul }) & Sortie;

/** Appelé à chaque « si » exécuté, avec la valeur de sa condition. */
type SurCondition = (bloc: BlocLu, valeur: boolean) => void;

// =============================================================================
// Constantes
// =============================================================================

/** Nombre maximal de pas (blocs exécutés, tours de boucle, opérations) avant l'arrêt. */
export const LIMITE_PAS_CALCUL = 10_000;

export const NIVEAUX_CALCUL: readonly NiveauCalcul[] = ['5e', '4e', '3e'];

export const OPERATIONS_CALCUL: readonly OperationCalcul[] = ['ADD', 'MINUS', 'MULTIPLY', 'DIVIDE'];

export const COMPARAISONS: readonly Comparaison[] = ['EQ', 'NEQ', 'LT', 'LTE', 'GT', 'GTE'];

/** Variables différentes au plus dans un programme. */
export const VARIABLES_MAX = 20;

/** Longueur maximale d'un nom de variable. */
export const LONGUEUR_NOM_MAX = 20;

/** Lettres, chiffres, `_` ; commence par une lettre ou `_`. */
const NOM_VALIDE = /^[\p{L}_][\p{L}\p{N}_]*$/u;

/** Mots du langage (sans accents, minuscules) : jamais des noms de variables. */
const MOTS_RESERVES: ReadonlySet<string> = new Set([
	'nombre',
	'choisi',
	'resultat',
	'afficher',
	'mettre',
	'ajouter',
	'si',
	'alors',
	'sinon',
	'et',
	'ou',
	'non',
	'repeter',
	'jusqua',
	'reste',
	'de',
	'par',
	'vrai',
	'faux'
]);

/** Niveau où chaque bloc apparaît ; un niveau admet aussi les blocs des niveaux d'avant. */
const NIVEAU_DES_BLOCS: Readonly<Record<string, NiveauCalcul>> = {
	calcul_afficher: '5e',
	calcul_mettre_resultat: '5e',
	controls_repeat: '5e',
	math_number: '5e',
	calcul_nombre_choisi: '5e',
	calcul_resultat: '5e',
	calcul_operation: '5e',
	variables_set: '4e',
	variables_get: '4e',
	math_change: '4e',
	calcul_si: '4e',
	calcul_si_sinon: '4e',
	logic_compare: '4e',
	math_modulo: '4e',
	controls_repeat_ext: '4e',
	logic_operation: '3e',
	logic_negate: '3e',
	calcul_repeter_jusqua: '3e'
};

/** Blocs d'instruction (les autres sont des valeurs : nombres et conditions). */
const INSTRUCTIONS: ReadonlySet<string> = new Set([
	'calcul_afficher',
	'calcul_mettre_resultat',
	'controls_repeat',
	'variables_set',
	'math_change',
	'calcul_si',
	'calcul_si_sinon',
	'controls_repeat_ext',
	'calcul_repeter_jusqua'
]);

const BLOCS_SI: ReadonlySet<string> = new Set(['calcul_si', 'calcul_si_sinon']);

/** Corps d'instructions d'un bloc, dans l'ordre d'écriture. */
const CORPS = ['ALORS', 'SINON', 'DO'] as const;

const VALEURS: ReadonlySet<string> = new Set(
	Object.keys(NIVEAU_DES_BLOCS).filter((type) => !INSTRUCTIONS.has(type))
);

/** Marge relative de l'égalité : 0,1 + 0,2 = 0,3, mais 0,3001 ≠ 0,3. */
const MARGE = 1e-9;

/**
 * Marge absolue, pour comparer à 0 : 0,1 + 0,2 − 0,3 (≈ 5e-17) vaut 0, mais 0,00000000001
 * ne vaut pas 0 (une marge relative bornée par 1 l'acceptait, revue PR 5a).
 */
const MARGE_ZERO = 1e-12;

const MESSAGES: Record<Exclude<ErreurCalcul['type'], 'nom-de-variable'>, string> = {
	'bloc-inconnu': 'Ce bloc n’est pas pris en charge dans un programme de calcul.',
	'trop-long': `Programme arrêté après ${LIMITE_PAS_CALCUL.toLocaleString('fr-FR')} pas : il est trop long, ou ne s’arrête pas.`,
	'division-par-zero': 'Division par zéro : on ne peut pas diviser par 0.',
	'nombre-trop-grand': 'Un nombre est devenu trop grand pour être calculé.',
	'programme-illisible': 'Programme illisible.',
	'trop-de-variables': `${VARIABLES_MAX} variables au plus.`
};

// =============================================================================
// Fonctions — niveaux, noms, égalité
// =============================================================================

/** Niveau où le bloc apparaît ; null pour un bloc inconnu des programmes de calcul. */
export function niveauDuBloc(type: string): NiveauCalcul | null {
	return NIVEAU_DES_BLOCS[type] ?? null;
}

/** Le niveau `a` admet-il les blocs du niveau `b` ? */
export function niveauAdmet(a: NiveauCalcul, b: NiveauCalcul): boolean {
	return NIVEAUX_CALCUL.indexOf(b) <= NIVEAUX_CALCUL.indexOf(a);
}

function connusAuNiveau(niveau: NiveauCalcul): BlocsConnus {
	const admis = Object.keys(NIVEAU_DES_BLOCS).filter((type) =>
		niveauAdmet(niveau, NIVEAU_DES_BLOCS[type])
	);
	return {
		instructions: new Set(admis.filter((type) => INSTRUCTIONS.has(type))),
		valeurs: new Set(admis.filter((type) => !INSTRUCTIONS.has(type)))
	};
}

/** Minuscules, sans accents ni apostrophe : la forme comparée des mots (`jusqu’à` → `jusqua`). */
export function normaliserMot(mot: string): string {
	return mot
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '')
		.replace(/['’]/g, '')
		.toLowerCase();
}

/** Message si le nom ne peut pas servir de variable ; null s'il convient. */
export function verifierNomDeVariable(nom: string): string | null {
	if ([...nom].length > LONGUEUR_NOM_MAX) {
		return `« ${[...nom].slice(0, LONGUEUR_NOM_MAX).join('')}… » : un nom de variable a ${LONGUEUR_NOM_MAX} caractères au plus.`;
	}
	if (!NOM_VALIDE.test(nom)) {
		return `« ${nom} » : un nom de variable s’écrit avec des lettres et des chiffres, en commençant par une lettre.`;
	}
	if (MOTS_RESERVES.has(normaliserMot(nom))) {
		return `« ${nom} » est un mot du programme : il ne peut pas servir de nom de variable.`;
	}
	return null;
}

/**
 * Message si un nouveau nom de variable (créé ou renommé par l'élève) est refusé ; null s'il
 * convient. En plus de `verifierNomDeVariable` : un nom qui ne diffère d'une variable existante
 * que par les accents ou les majuscules (`Côté` et `cote`) est refusé, car l'interpréteur les
 * confond alors que Blockly les distingue (revue #2716).
 */
export function refusDeNouveauNom(nom: string, autres: readonly string[]): string | null {
	const message = verifierNomDeVariable(nom);
	if (message) return message;
	const cle = normaliserMot(nom);
	const pareil = autres.find((autre) => normaliserMot(autre) === cle);
	if (pareil !== undefined) {
		return `« ${nom} » ressemble trop à la variable « ${pareil} » : choisis un autre nom.`;
	}
	return null;
}

/** Égalité des programmes de calcul : à une très petite marge (0,1 + 0,2 = 0,3). */
export function egauxCalcul(a: number, b: number): boolean {
	const ecart = Math.abs(a - b);
	return ecart <= MARGE_ZERO || ecart <= MARGE * Math.max(Math.abs(a), Math.abs(b));
}

export function messageErreurCalcul(erreur: ErreurCalcul): string {
	if (erreur.type === 'nom-de-variable') {
		return verifierNomDeVariable(erreur.nom) ?? `« ${erreur.nom} » : nom de variable refusé.`;
	}
	return MESSAGES[erreur.type];
}

// =============================================================================
// Fonctions — lecture
// =============================================================================

/** Piles de l'espace de travail, de haut en bas ; un calcul ou une condition posés seuls sont ignorés. */
export function lirePilesCalcul(etat: unknown): BlocLu[] {
	return lirePilesDe(etat, VALEURS);
}

/**
 * Premier bloc inconnu d'une pile au niveau donné (instruction ou valeur), blocs désactivés
 * compris ; sans niveau, tous les blocs des programmes de calcul sont connus.
 */
export function premierBlocInconnuCalcul(
	bloc: BlocLu | undefined,
	attendu: 'instruction' | 'valeur',
	niveau: NiveauCalcul = '3e'
): string | null {
	return premierBlocInconnuDe(bloc, attendu, connusAuNiveau(niveau));
}

/** Opération d'un bloc `calcul_operation` ; null si le champ est inconnu. */
export function operationDe(bloc: BlocLu): OperationCalcul | null {
	return OPERATIONS_CALCUL.find((op) => op === bloc.champs.OP) ?? null;
}

/** Comparaison d'un bloc `logic_compare` ; null si le champ est inconnu. */
export function comparaisonDe(bloc: BlocLu): Comparaison | null {
	return COMPARAISONS.find((op) => op === bloc.champs.OP) ?? null;
}

/**
 * Variables déclarées de l'état (`variables: [{ name, id }]`, comme les sauve Blockly) : id → nom.
 * Lève `ProgrammeIllisible` si la liste est mal formée.
 */
export function nomsDesVariables(etat: unknown): Map<string, string> {
	const noms = new Map<string, string>();
	if (!estObjet(etat) || etat.variables === undefined) return noms;
	if (!Array.isArray(etat.variables)) throw new ProgrammeIllisible();
	for (const variable of etat.variables) {
		if (
			!estObjet(variable) ||
			typeof variable.id !== 'string' ||
			typeof variable.name !== 'string'
		) {
			throw new ProgrammeIllisible();
		}
		noms.set(variable.id, variable.name);
	}
	return noms;
}

/** Nom de la variable d'un bloc (champ `VAR: { id }`) ; lève `ProgrammeIllisible` si inconnue. */
export function nomDeVariable(bloc: BlocLu, noms: ReadonlyMap<string, string>): string {
	const champ = bloc.champs.VAR;
	const nom = estObjet(champ) && typeof champ.id === 'string' ? noms.get(champ.id) : undefined;
	if (nom === undefined) throw new ProgrammeIllisible();
	return nom;
}

/** Tous les blocs d'une pile et de ses entrées, désactivés compris (parcours préfixe). */
export function* tousLesBlocs(bloc: BlocLu | undefined): Generator<BlocLu> {
	for (let courant = bloc; courant; courant = courant.suivant) {
		yield courant;
		for (const entree of Object.values(courant.entrees)) yield* tousLesBlocs(entree);
	}
}

/**
 * Erreur des noms de variables des piles (nom refusé, trop de variables) ; null s'ils
 * conviennent. Lève `ProgrammeIllisible` pour une variable inconnue.
 */
function erreurDesVariables(
	piles: BlocLu[],
	noms: ReadonlyMap<string, string>
): ErreurDeLecture | null {
	const vus = new Set<string>();
	for (const pile of piles) {
		for (const bloc of tousLesBlocs(pile)) {
			if (bloc.champs.VAR === undefined) continue;
			const nom = nomDeVariable(bloc, noms);
			if (verifierNomDeVariable(nom) !== null) return { type: 'nom-de-variable', nom };
			vus.add(normaliserMot(nom));
			if (vus.size > VARIABLES_MAX) return { type: 'trop-de-variables' };
		}
	}
	return null;
}

/** Les blocs « si » exécutables des piles, dans l'ordre du programme (blocs désactivés exclus). */
export function siDuProgramme(piles: readonly BlocLu[]): BlocLu[] {
	const trouves: BlocLu[] = [];
	const parcourir = (bloc: BlocLu | undefined): void => {
		for (let courant = bloc; courant; courant = courant.suivant) {
			if (!courant.actif) continue;
			if (BLOCS_SI.has(courant.type)) trouves.push(courant);
			for (const nom of CORPS) parcourir(courant.entrees[nom]);
		}
	};
	for (const pile of piles) parcourir(pile);
	return trouves;
}

// =============================================================================
// Fonctions — exécution
// =============================================================================

/** Arrêt du moteur : trop de pas (programme trop long, ou sans fin). */
export class TropLong extends Error {}
/** Arrêt du moteur : division par 0 (÷ ou reste). */
export class DivisionParZero extends Error {}
/** Arrêt du moteur : un nombre devenu infini. */
export class TropGrand extends Error {}

/** Ce que le moteur prête aux blocs propres à un domaine (programme de calcul, tortue). */
export interface OutilsMoteur {
	/** Valeur d'une entrée ; une entrée vide vaut 0. */
	evaluer(bloc: BlocLu | undefined): number;
	compterUnPas(): void;
}

/**
 * Blocs propres à un domaine, en plus des blocs communs que le moteur exécute lui-même :
 * nombres, variables (`variables_set`, `variables_get`, `math_change`), opérations, reste,
 * comparaisons, ET / OU / NON, « si », répétitions.
 */
export interface DomaineMoteur {
	/** Valeur d'un bloc du domaine ; undefined : bloc inconnu. */
	valeur?(bloc: BlocLu, outils: OutilsMoteur): number | undefined;
	/** Exécute une instruction du domaine (son pas est déjà compté) ; false : inconnue. */
	instruction?(bloc: BlocLu, outils: OutilsMoteur): boolean;
	/**
	 * Nombre de tours d'une répétition à nombre calculé (`controls_repeat_ext`), à partir de la
	 * valeur de son entrée ; par défaut, l'entier le plus proche, jamais négatif.
	 */
	toursCalcules?(valeur: number): number;
	surCondition?: SurCondition;
}

export interface Moteur {
	/** Exécute une pile ; lève `TropLong`, `DivisionParZero`, `TropGrand` ou `ProgrammeIllisible`. */
	executerPile(bloc: BlocLu | undefined): void;
	/** Pas comptés jusqu'ici. */
	pas(): number;
}

type Prepare =
	{ ok: true; piles: BlocLu[]; noms: Map<string, string> } | { ok: false; erreur: ErreurDeLecture };

/**
 * Lit et vérifie l'état : forme, blocs connus (`connus`), noms de variables. Les piles qui
 * commencent par un bloc de `ignorees` (un calcul posé seul) sont ignorées.
 */
export function preparerProgramme(
	etat: unknown,
	ignorees: ReadonlySet<string>,
	connus: BlocsConnus
): Prepare {
	try {
		const piles = lirePilesDe(etat, ignorees);
		for (const pile of piles) {
			const inconnu = premierBlocInconnuDe(pile, 'instruction', connus);
			if (inconnu) return { ok: false, erreur: { type: 'bloc-inconnu', typeBloc: inconnu } };
		}
		const noms = nomsDesVariables(etat);
		const erreur = erreurDesVariables(piles, noms);
		if (erreur) return { ok: false, erreur };
		return { ok: true, piles, noms };
	} catch {
		return { ok: false, erreur: { type: 'programme-illisible' } };
	}
}

/** Lit et vérifie un programme de calcul au niveau donné. */
function preparer(etat: unknown, niveau: NiveauCalcul): Prepare {
	return preparerProgramme(etat, VALEURS, connusAuNiveau(niveau));
}

/**
 * Moteur d'exécution des blocs communs aux programmes de calcul et à la tortue (ADR 0039) :
 * variables (une variable jamais mise vaut 0), calculs, conditions, « si », répétitions. Les
 * blocs propres au domaine lui sont confiés (`domaine`). Chaque bloc exécuté, chaque tour de
 * boucle et chaque opération comptent un pas ; au-delà de `limitePas`, `TropLong`.
 */
export function creerMoteur(
	noms: ReadonlyMap<string, string>,
	domaine: DomaineMoteur,
	limitePas: number = LIMITE_PAS_CALCUL
): Moteur {
	const variables = new Map<string, number>();
	let pas = 0;

	function compterUnPas(): void {
		if (pas >= limitePas) throw new TropLong();
		pas++;
	}

	function fini(n: number): number {
		if (!Number.isFinite(n)) throw new TropGrand();
		// −0 s'affiche 0
		return n === 0 ? 0 : n;
	}

	const cle = (bloc: BlocLu): string => normaliserMot(nomDeVariable(bloc, noms));

	const outils: OutilsMoteur = { evaluer, compterUnPas };

	function evaluer(bloc: BlocLu | undefined): number {
		// Une entrée vide vaut 0, comme dans le code généré
		if (!bloc) return 0;
		switch (bloc.type) {
			case 'math_number':
				return valeurNombre(bloc);
			case 'variables_get':
				return variables.get(cle(bloc)) ?? 0;
			case 'calcul_operation': {
				const op = operationDe(bloc);
				if (op === null) throw new ProgrammeIllisible();
				// Une opération compte un pas : un long calcul répété reste borné (revue PR 5a)
				compterUnPas();
				const a = evaluer(bloc.entrees.A);
				const b = evaluer(bloc.entrees.B);
				if (op === 'ADD') return fini(a + b);
				if (op === 'MINUS') return fini(a - b);
				if (op === 'MULTIPLY') return fini(a * b);
				if (b === 0) throw new DivisionParZero();
				return fini(a / b);
			}
			case 'math_modulo': {
				compterUnPas();
				const a = evaluer(bloc.entrees.DIVIDEND);
				const b = Math.abs(evaluer(bloc.entrees.DIVISOR));
				if (b === 0) throw new DivisionParZero();
				// Reste euclidien : jamais négatif (le reste de −7 par 3 est 2)
				return fini(Math.max(0, a - b * Math.floor(a / b)));
			}
		}
		const propre = domaine.valeur?.(bloc, outils);
		if (propre !== undefined) return propre;
		// Une condition à la place d'un nombre, ou un bloc inconnu
		throw new ProgrammeIllisible();
	}

	function condition(bloc: BlocLu | undefined): boolean {
		// Une condition vide est fausse
		if (!bloc) return false;
		switch (bloc.type) {
			case 'logic_compare': {
				const op = comparaisonDe(bloc);
				if (op === null) throw new ProgrammeIllisible();
				compterUnPas();
				const a = evaluer(bloc.entrees.A);
				const b = evaluer(bloc.entrees.B);
				const egal = egauxCalcul(a, b);
				if (op === 'EQ') return egal;
				if (op === 'NEQ') return !egal;
				if (op === 'LT') return a < b && !egal;
				if (op === 'LTE') return a < b || egal;
				if (op === 'GT') return a > b && !egal;
				return a > b || egal;
			}
			case 'logic_operation': {
				const op = bloc.champs.OP;
				if (op !== 'AND' && op !== 'OR') throw new ProgrammeIllisible();
				compterUnPas();
				// Évaluation courte, comme le code généré : `x ≠ 0 et 1 ÷ x > 2` ne divise pas par 0
				if (op === 'AND') return condition(bloc.entrees.A) && condition(bloc.entrees.B);
				return condition(bloc.entrees.A) || condition(bloc.entrees.B);
			}
			case 'logic_negate':
				compterUnPas();
				return !condition(bloc.entrees.BOOL);
		}
		// Un nombre à la place d'une condition, ou un bloc inconnu
		throw new ProgrammeIllisible();
	}

	function repeter(tours: number, corps: BlocLu | undefined): void {
		for (let i = 0; i < tours; i++) {
			// Un tour compte même vide : « répéter 10¹² fois (rien) » s'arrête
			compterUnPas();
			executerPile(corps);
		}
	}

	function executerPile(bloc: BlocLu | undefined): void {
		for (let courant = bloc; courant; courant = courant.suivant) {
			if (!courant.actif) continue;
			compterUnPas();
			switch (courant.type) {
				case 'variables_set':
					variables.set(cle(courant), evaluer(courant.entrees.VALUE));
					break;
				case 'math_change': {
					const nom = cle(courant);
					variables.set(nom, fini((variables.get(nom) ?? 0) + evaluer(courant.entrees.DELTA)));
					break;
				}
				case 'calcul_si':
				case 'calcul_si_sinon': {
					const vrai = condition(courant.entrees.CONDITION);
					domaine.surCondition?.(courant, vrai);
					if (vrai) executerPile(courant.entrees.ALORS);
					else if (courant.type === 'calcul_si_sinon') executerPile(courant.entrees.SINON);
					break;
				}
				case 'controls_repeat':
					repeter(nombreDeToursDe(courant, evaluer), courant.entrees.DO);
					break;
				case 'controls_repeat_ext': {
					const valeur = evaluer(courant.entrees.TIMES);
					const tours = domaine.toursCalcules
						? domaine.toursCalcules(valeur)
						: // Nombre de tours calculé : arrondi à l'entier le plus proche, jamais négatif
							Math.max(0, Math.round(valeur));
					repeter(tours, courant.entrees.DO);
					break;
				}
				case 'calcul_repeter_jusqua':
					for (;;) {
						// Un tour compte même vide : une boucle sans fin s'arrête
						compterUnPas();
						if (condition(courant.entrees.CONDITION)) break;
						executerPile(courant.entrees.DO);
					}
					break;
				default:
					if (!domaine.instruction?.(courant, outils)) throw new ProgrammeIllisible();
			}
		}
	}

	return { executerPile, pas: () => pas };
}

/** Exécute des piles déjà vérifiées. Ne lève jamais. */
function executer(
	piles: BlocLu[],
	noms: ReadonlyMap<string, string>,
	nombre: number,
	surCondition?: SurCondition
): ResultatCalcul {
	const affichages: number[] = [];
	let resultat = 0;

	const moteur = creerMoteur(noms, {
		valeur(bloc) {
			if (bloc.type === 'calcul_nombre_choisi') return nombre;
			if (bloc.type === 'calcul_resultat') return resultat;
			return undefined;
		},
		instruction(bloc, { evaluer }) {
			if (bloc.type === 'calcul_afficher') {
				affichages.push(evaluer(bloc.entrees.VALEUR));
				return true;
			}
			if (bloc.type === 'calcul_mettre_resultat') {
				resultat = evaluer(bloc.entrees.VALEUR);
				return true;
			}
			return false;
		},
		surCondition
	});

	try {
		for (const pile of piles) moteur.executerPile(pile);
	} catch (erreur) {
		const type =
			erreur instanceof TropLong
				? 'trop-long'
				: erreur instanceof DivisionParZero
					? 'division-par-zero'
					: erreur instanceof TropGrand
						? 'nombre-trop-grand'
						: 'programme-illisible';
		return { ok: false, erreur: { type }, affichages, pas: moteur.pas() };
	}

	return { ok: true, affichages, pas: moteur.pas() };
}

/**
 * Exécute un programme de calcul à partir d'un nombre, avec les blocs du niveau donné (5e par
 * défaut). Ne lève jamais : un état mal formé, un bloc inconnu ou au-dessus du niveau, un nom de
 * variable refusé, une division par zéro ou un programme trop long rendent une erreur (avec les
 * affichages déjà faits).
 */
export function executerCalcul(
	etat: unknown,
	nombre: number,
	niveau: NiveauCalcul = '5e'
): ResultatCalcul {
	const prepare = preparer(etat, niveau);
	if (!prepare.ok) return { ok: false, erreur: prepare.erreur, affichages: [], pas: 0 };
	return executer(prepare.piles, prepare.noms, nombre);
}

/**
 * Contrôle d'un programme de référence : chaque « si » doit être vrai au moins une fois et faux
 * au moins une fois sur les essais, sinon l'élève qui oublie une branche serait jugé juste. Rend
 * le premier « si » en défaut (rang dans `siDuProgramme`), ou null. Un programme qui ne se lit
 * pas rend null (son erreur est signalée ailleurs).
 */
export function branchesNonParcourues(
	etat: unknown,
	essais: readonly number[],
	niveau: NiveauCalcul
): { index: number; jamais: 'vrai' | 'faux' } | null {
	const prepare = preparer(etat, niveau);
	if (!prepare.ok) return null;
	const si = siDuProgramme(prepare.piles);
	const vus = si.map(() => ({ vrai: false, faux: false }));
	const rang = new Map(si.map((bloc, i) => [bloc, i]));
	for (const essai of essais) {
		executer(prepare.piles, prepare.noms, essai, (bloc, valeur) => {
			const i = rang.get(bloc);
			if (i !== undefined) vus[i][valeur ? 'vrai' : 'faux'] = true;
		});
	}
	for (let i = 0; i < vus.length; i++) {
		if (!vus[i].vrai) return { index: i, jamais: 'vrai' };
		if (!vus[i].faux) return { index: i, jamais: 'faux' };
	}
	return null;
}
