/**
 * Lecture commune des programmes en blocs (ADR 0039) : l'état sérialisé d'un espace de travail
 * Blockly (`Blockly.serialization.workspaces.save`) devient un arbre de blocs vérifié, que
 * l'interpréteur de la tortue et celui des programmes de calcul parcourent ensuite.
 *
 * Sans dépendance à Blockly : s'exécute aussi bien dans le navigateur que sous Node (correction).
 */

// =============================================================================
// Types
// =============================================================================

/** Bloc sérialisé, après vérification de forme. */
export interface BlocLu {
	type: string;
	actif: boolean;
	champs: Record<string, unknown>;
	/** Entrées valeur ou instructions : le bloc posé, sinon l'ombre. */
	entrees: Record<string, BlocLu | undefined>;
	suivant: BlocLu | undefined;
	x: number;
	y: number;
}

/** Blocs qu'un interpréteur sait exécuter. */
export interface BlocsConnus {
	instructions: ReadonlySet<string>;
	valeurs: ReadonlySet<string>;
}

// =============================================================================
// Constantes
// =============================================================================

/** Imbrication maximale (entrées dans des entrées) : protège la pile d'appels. */
const IMBRICATION_MAX = 1_000;

/** Entrées qui portent des instructions (le corps d'une répétition) ; les autres, des valeurs. */
const ENTREES_INSTRUCTIONS: ReadonlySet<string> = new Set(['DO']);

// =============================================================================
// Fonctions
// =============================================================================

export function estObjet(valeur: unknown): valeur is Record<string, unknown> {
	return typeof valeur === 'object' && valeur !== null && !Array.isArray(valeur);
}

export class ProgrammeIllisible extends Error {}

/**
 * Lit une pile sérialisée (un bloc et ses suivants, par `next`) ; lève `ProgrammeIllisible` si
 * la forme est fausse. Les suivants sont lus en boucle : seule l'imbrication fait récursion.
 */
function lirePile(brut: unknown, imbrication: number): BlocLu {
	const blocs: BlocLu[] = [];
	let courant: unknown = brut;
	while (courant !== undefined) {
		const { bloc, suivant } = lireBloc(courant, imbrication);
		blocs.push(bloc);
		courant = suivant;
	}
	for (let i = 0; i < blocs.length - 1; i++) blocs[i].suivant = blocs[i + 1];
	return blocs[0];
}

/** Lit un bloc et ses entrées ; rend aussi le bloc suivant, encore brut. */
function lireBloc(brut: unknown, imbrication: number): { bloc: BlocLu; suivant: unknown } {
	if (!estObjet(brut) || typeof brut.type !== 'string' || imbrication > IMBRICATION_MAX) {
		throw new ProgrammeIllisible();
	}

	const entrees: Record<string, BlocLu | undefined> = {};
	if (brut.inputs !== undefined) {
		if (!estObjet(brut.inputs)) throw new ProgrammeIllisible();
		for (const [nom, entree] of Object.entries(brut.inputs)) {
			if (!estObjet(entree)) throw new ProgrammeIllisible();
			const contenu = entree.block ?? entree.shadow;
			entrees[nom] = contenu === undefined ? undefined : lirePile(contenu, imbrication + 1);
		}
	}

	let suivant: unknown;
	if (brut.next !== undefined) {
		if (!estObjet(brut.next)) throw new ProgrammeIllisible();
		suivant = brut.next.block;
	}

	const desactive =
		brut.enabled === false ||
		(Array.isArray(brut.disabledReasons) && brut.disabledReasons.length > 0);

	const bloc: BlocLu = {
		type: brut.type,
		actif: !desactive,
		champs: estObjet(brut.fields) ? brut.fields : {},
		entrees,
		suivant: undefined,
		x: typeof brut.x === 'number' ? brut.x : 0,
		y: typeof brut.y === 'number' ? brut.y : 0
	};
	return { bloc, suivant };
}

/**
 * Lit les piles de l'espace de travail, triées de haut en bas (puis de gauche à droite) ; lève
 * `ProgrammeIllisible` si la forme est fausse. Une pile qui commence par un bloc valeur (un
 * nombre, un calcul posé seul) ne fait rien : ignorée, comme une pile vide.
 */
export function lirePiles(etat: unknown, valeurs: ReadonlySet<string>): BlocLu[] {
	if (!estObjet(etat)) throw new ProgrammeIllisible();
	if (etat.blocks === undefined) return [];
	if (!estObjet(etat.blocks)) throw new ProgrammeIllisible();
	const blocs = etat.blocks.blocks;
	if (blocs === undefined) return [];
	if (!Array.isArray(blocs)) throw new ProgrammeIllisible();
	return blocs
		.map((bloc) => lirePile(bloc, 0))
		.filter((pile) => !valeurs.has(pile.type))
		.sort((a, b) => a.y - b.y || a.x - b.x);
}

/** Premier bloc inconnu (instruction ou valeur) d'une pile, blocs désactivés compris. */
export function premierBlocInconnu(
	bloc: BlocLu | undefined,
	attendu: 'instruction' | 'valeur',
	connus: BlocsConnus
): string | null {
	for (let courant = bloc; courant; courant = courant.suivant) {
		const ensemble = attendu === 'instruction' ? connus.instructions : connus.valeurs;
		if (!ensemble.has(courant.type)) return courant.type;
		for (const [nom, entree] of Object.entries(courant.entrees)) {
			const inconnu = premierBlocInconnu(
				entree,
				ENTREES_INSTRUCTIONS.has(nom) ? 'instruction' : 'valeur',
				connus
			);
			if (inconnu) return inconnu;
		}
		if (attendu === 'valeur') return null;
	}
	return null;
}

/** Valeur d'un nombre (`math_number`) ; un champ illisible vaut 0, comme dans le code généré. */
export function valeurNombre(bloc: BlocLu): number {
	const nombre = Number(bloc.champs.NUM);
	return Number.isFinite(nombre) ? nombre : 0;
}

/** Nombre de tours d'une répétition : entier inférieur, jamais négatif. */
export function nombreDeTours(
	bloc: BlocLu,
	valeur: (entree: BlocLu | undefined) => number
): number {
	const brut =
		bloc.type === 'controls_repeat' ? Number(bloc.champs.TIMES) : valeur(bloc.entrees.TIMES);
	return Number.isFinite(brut) ? Math.max(0, Math.floor(brut)) : 0;
}
