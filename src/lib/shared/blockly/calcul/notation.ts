/**
 * Notation texte d'un programme de calcul : `résultat = nombre + 2 ; afficher résultat × 4`.
 *
 * C'est la forme écrite par l'auteur d'un modèle (`attendu:`, `départ:` du bloc ```calcul) et
 * la forme enregistrée de la réponse de l'élève : courte, lisible par le prof, rejouée par
 * l'interpréteur (ADR 0039) après conversion en état Blockly.
 *
 * Instructions : `afficher <calcul>`, `résultat = <calcul>` (ou `mettre résultat à <calcul>`),
 * `répéter n [ … ]` ; séparées par `;` ou un retour à la ligne. Calculs : nombres, `nombre`
 * (ou `nombre choisi`), `résultat`, `+ − × ÷` (aussi `- * / :`), parenthèses ; × et ÷ avant
 * + et −, de gauche à droite ; un signe − devant un nombre en fait un nombre négatif.
 * Lecture souple : accents, majuscules, espaces, virgule ou point décimal. Écriture canonique :
 * accents, virgule décimale, `−`, `×`, `÷`, parenthèses là seulement où le calcul les exige.
 *
 * Sans dépendance à Blockly : s'exécute aussi sous Node (correction).
 */

import {
	lirePilesCalcul,
	operationDe,
	premierBlocInconnuCalcul,
	type OperationCalcul
} from './interpreteur';
import { nombreDeTours, valeurNombre, type BlocLu } from '../lecture';
import { LONGUEUR_MAX_PROGRAMME, type EtatLu, type TexteLu } from '../tortue/notation';

// =============================================================================
// Types
// =============================================================================

type Jeton =
	| { type: '[' | ']' | ';' | '(' | ')' | '=' }
	| { type: 'op'; op: OperationCalcul }
	| { type: 'mot'; mot: string };

type Bloc = Record<string, unknown>;

// =============================================================================
// Constantes
// =============================================================================

/** Répétitions ou parenthèses imbriquées au plus. */
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

const ECRITURES: Record<OperationCalcul, string> = {
	ADD: '+',
	MINUS: '−',
	MULTIPLY: '×',
	DIVIDE: '÷'
};

const PRIORITES: Record<OperationCalcul, number> = { ADD: 1, MINUS: 1, MULTIPLY: 2, DIVIDE: 2 };

/** Priorité d'un nombre, d'un nom : rien ne l'entoure de parenthèses. */
const PRIORITE_ATOME = 3;

const EXEMPLE = 'afficher (nombre + 2) × 4';

// =============================================================================
// Des blocs vers le texte
// =============================================================================

/** Écriture sans exposant (`1e21`, `1e-7` ne se reliraient pas). */
const FORMAT_NOMBRE = new Intl.NumberFormat('en-US', {
	useGrouping: false,
	maximumFractionDigits: 20
});

export function ecrireNombreCalcul(n: number): string {
	return FORMAT_NOMBRE.format(n || 0)
		.replace('.', ',')
		.replace('-', '−');
}

/** Un calcul écrit, et sa priorité (pour les parenthèses du calcul qui l'entoure). */
function ecrireValeur(bloc: BlocLu | undefined): {
	texte: string;
	priorite: number;
	negatif: boolean;
} {
	if (!bloc) return { texte: '0', priorite: PRIORITE_ATOME, negatif: false };
	if (bloc.type === 'calcul_nombre_choisi')
		return { texte: 'nombre', priorite: PRIORITE_ATOME, negatif: false };
	if (bloc.type === 'calcul_resultat')
		return { texte: 'résultat', priorite: PRIORITE_ATOME, negatif: false };
	if (bloc.type === 'calcul_operation') {
		const op = operationDe(bloc);
		if (op === null) throw new TexteIllisible('Programme illisible.');
		const priorite = PRIORITES[op];
		const a = ecrireValeur(bloc.entrees.A);
		const b = ecrireValeur(bloc.entrees.B);
		// À gauche, une priorité plus faible ; à droite, plus faible ou égale (l'arbre est gardé :
		// `2 × (3 × 4)` reste tel quel) ; un nombre négatif, toujours
		const gauche = a.priorite < priorite || a.negatif ? `(${a.texte})` : a.texte;
		const droite = b.priorite <= priorite || b.negatif ? `(${b.texte})` : b.texte;
		return { texte: `${gauche} ${ECRITURES[op]} ${droite}`, priorite, negatif: false };
	}
	const n = valeurNombre(bloc);
	return { texte: ecrireNombreCalcul(n), priorite: PRIORITE_ATOME, negatif: n < 0 };
}

/** Nombre de tours d'une répétition, écrit (le champ, ou la valeur de l'entrée). */
function tours(bloc: BlocLu): number {
	// Seul `controls_repeat` est connu du calcul : le nombre de tours est son champ
	return nombreDeTours(bloc, () => 0);
}

function ecrirePile(bloc: BlocLu | undefined): string[] {
	const instructions: string[] = [];
	for (let courant = bloc; courant; courant = courant.suivant) {
		// Un bloc désactivé n'est pas exécuté, son contenu non plus
		if (!courant.actif) continue;
		if (courant.type === 'controls_repeat') {
			const contenu = ecrirePile(courant.entrees.DO);
			const corps = contenu.length > 0 ? ` ${contenu.join(' ; ')} ` : ' ';
			instructions.push(`répéter ${tours(courant)} [${corps}]`);
		} else if (courant.type === 'calcul_afficher') {
			instructions.push(`afficher ${ecrireValeur(courant.entrees.VALEUR).texte}`);
		} else if (courant.type === 'calcul_mettre_resultat') {
			instructions.push(`résultat = ${ecrireValeur(courant.entrees.VALEUR).texte}`);
		}
	}
	return instructions;
}

/**
 * Écrit en texte le programme d'un espace de travail Blockly, piles dans l'ordre d'exécution
 * (de haut en bas). Un bloc inconnu ou un état mal formé rendent une erreur.
 */
export function etatVersTexteCalcul(etat: unknown): TexteLu {
	let piles: BlocLu[];
	try {
		piles = lirePilesCalcul(etat);
	} catch {
		return { ok: false, message: 'Programme illisible.' };
	}
	if (piles.some((pile) => premierBlocInconnuCalcul(pile, 'instruction') !== null)) {
		return {
			ok: false,
			message: 'Ce programme utilise un bloc qui n’existe pas dans un programme de calcul.'
		};
	}
	try {
		return { ok: true, texte: piles.flatMap((pile) => ecrirePile(pile)).join(' ; ') };
	} catch {
		return { ok: false, message: 'Programme illisible.' };
	}
}

// =============================================================================
// Du texte vers les blocs
// =============================================================================

/** Minuscules, sans accents. */
function normaliser(mot: string): string {
	return mot
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '')
		.toLowerCase();
}

function decouper(texte: string): Jeton[] {
	const jetons: Jeton[] = [];
	const lignes = texte.replace(/\r\n?/g, '\n');
	for (const morceau of lignes.split(/(\[|\]|;|\n|\(|\)|=|\+|-|−|×|\*|÷|\/|:)|[^\S\n]+/)) {
		if (!morceau) continue;
		if (morceau === '\n') jetons.push({ type: ';' });
		else if (morceau in SYMBOLES) jetons.push({ type: 'op', op: SYMBOLES[morceau] });
		else if (['[', ']', ';', '(', ')', '='].includes(morceau)) {
			jetons.push({ type: morceau as '[' | ']' | ';' | '(' | ')' | '=' });
		} else jetons.push({ type: 'mot', mot: morceau });
	}
	return jetons;
}

class TexteIllisible extends Error {}

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

/** Relie une liste de blocs par `next` ; rend la tête de la pile. */
function chainer(blocs: Bloc[]): Bloc | undefined {
	for (let i = blocs.length - 2; i >= 0; i--) blocs[i].next = { block: blocs[i + 1] };
	return blocs[0];
}

/**
 * Lit un programme de calcul écrit en texte et le rend en état Blockly (une seule pile), prêt
 * pour `executerCalcul` ou pour être rechargé dans l'espace de travail. Texte vide : programme
 * vide.
 */
export function texteVersEtatCalcul(texte: string): EtatLu {
	if (texte.length > LONGUEUR_MAX_PROGRAMME) {
		return { ok: false, message: 'Programme trop long.' };
	}

	const jetons = decouper(texte);
	let position = 0;

	const mot = (k = 0): string | null => {
		const jeton = jetons[position + k];
		return jeton?.type === 'mot' ? normaliser(jeton.mot) : null;
	};

	/** Fin d'une instruction : `;`, `]`, ou la fin du texte. */
	const finInstruction = (): boolean => {
		const jeton = jetons[position];
		return jeton === undefined || jeton.type === ';' || jeton.type === ']';
	};

	/** Le texte d'origine, de `debut` à la position, pour les messages. */
	const cite = (debut: number): string =>
		jetons
			.slice(debut, position + 1)
			.map((j) => (j.type === 'mot' ? j.mot : j.type === 'op' ? ECRITURES[j.op] : j.type))
			.join(' ');

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

	function lireInstruction(profondeur: number): Bloc {
		const debut = position;
		if (mot() === 'afficher') {
			position++;
			if (finInstruction()) {
				throw new TexteIllisible(`Après « afficher », il faut un calcul (ex. ${EXEMPLE}).`);
			}
			return { type: 'calcul_afficher', inputs: { VALEUR: entree(lireCalculEntier(debut)) } };
		}
		if (mot() === 'resultat' && jetons[position + 1]?.type === '=') {
			position += 2;
			return {
				type: 'calcul_mettre_resultat',
				inputs: { VALEUR: entree(lireCalculEntier(debut)) }
			};
		}
		if (mot() === 'mettre' && mot(1) === 'resultat' && mot(2) === 'a') {
			position += 3;
			return {
				type: 'calcul_mettre_resultat',
				inputs: { VALEUR: entree(lireCalculEntier(debut)) }
			};
		}
		if (mot() === 'repeter') {
			position++;
			const ecrit =
				jetons[position]?.type === 'mot' ? (jetons[position] as { mot: string }).mot : '';
			const n = NOMBRE.test(ecrit) ? Number(ecrit.replace(',', '.')) : null;
			if (n === null || !Number.isInteger(n)) {
				throw new TexteIllisible(`« répéter ${ecrit} » : il faut un nombre entier de fois.`);
			}
			position++;
			if (jetons[position]?.type !== '[') {
				throw new TexteIllisible(`Après « répéter ${ecrit} », il faut des crochets [ … ].`);
			}
			if (profondeur + 1 > PROFONDEUR_MAX) {
				throw new TexteIllisible('Trop de répétitions imbriquées.');
			}
			position++;
			const contenu = chainer(lireSuite(profondeur + 1));
			position++; // le « ] » fermant
			return {
				type: 'controls_repeat',
				fields: { TIMES: n },
				...(contenu && { inputs: { DO: { block: contenu } } })
			};
		}
		// Le reste de l'instruction, pour le message
		while (!finInstruction()) position++;
		position--;
		throw new TexteIllisible(`Instruction inconnue : « ${cite(debut)} » (ex. ${EXEMPLE}).`);
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
		if (jeton.type === '(') {
			if (profondeur + 1 > PROFONDEUR_MAX)
				throw new TexteIllisible('Trop de parenthèses imbriquées.');
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
			const normal = normaliser(jeton.mot);
			if (NOMBRE.test(jeton.mot)) {
				position++;
				return nombreBloc(lireNombreFini(jeton.mot));
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
			throw new TexteIllisible(
				`« ${jeton.mot} » : dans un calcul, seulement des nombres, « nombre » et « résultat ».`
			);
		}
		throw new TexteIllisible('Calcul mal écrit : un nombre manque.');
	}

	function operation(op: OperationCalcul, a: Bloc, b: Bloc): Bloc {
		return { type: 'calcul_operation', fields: { OP: op }, inputs: { A: entree(a), B: entree(b) } };
	}

	try {
		const pile = chainer(lireSuite(0));
		const blocs = pile ? [{ ...pile, x: 20, y: 20 }] : [];
		return { ok: true, etat: { blocks: { languageVersion: 0, blocks: blocs } } };
	} catch (erreur) {
		const message = erreur instanceof TexteIllisible ? erreur.message : 'Programme illisible.';
		return { ok: false, message };
	}
}
