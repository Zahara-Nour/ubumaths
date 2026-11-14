/**
 * Notation texte d'un programme tortue : `répéter 4 [ avancer 3 ; tourner à droite 90 ]`.
 *
 * C'est la forme écrite par l'auteur d'un modèle (`attendu:` du bloc ```tortue) et la forme
 * enregistrée de la réponse de l'élève : courte (une réponse fait au plus 2 000 caractères),
 * lisible par le prof, rejouée par l'interpréteur (ADR 0039) après conversion en état Blockly.
 *
 * Instructions : `avancer n`, `reculer n`, `tourner à droite n`, `tourner à gauche n`,
 * `lever le stylo`, `baisser le stylo`, `répéter n [ … ]` ; séparées par `;` ou un retour à la
 * ligne. Lecture souple : accents, majuscules, espaces, virgule ou point décimal. Écriture
 * canonique : accents, virgule décimale, ` ; ` entre les instructions, `[ … ]` espacés.
 *
 * Sans dépendance à Blockly : s'exécute aussi sous Node (correction).
 */

import { lirePiles, nombreDeTours, premierBlocInconnu, valeur, type BlocLu } from './interpreteur';

// =============================================================================
// Types
// =============================================================================

export type TexteLu = { ok: true; texte: string } | { ok: false; message: string };

/** État sérialisé d'un espace de travail Blockly, tel que `executerTortue` le lit. */
export interface EtatProgramme {
	blocks: { languageVersion: 0; blocks: Record<string, unknown>[] };
}

export type EtatLu = { ok: true; etat: EtatProgramme } | { ok: false; message: string };

type Jeton = { type: '[' | ']' | ';' } | { type: 'mot'; mot: string };

// =============================================================================
// Constantes
// =============================================================================

/** Longueur maximale d'un programme écrit (celle d'une réponse, `MAX_ANSWER_LENGTH`). */
export const LONGUEUR_MAX_PROGRAMME = 2_000;

/** Répétitions imbriquées au plus. */
const PROFONDEUR_MAX = 50;

/** Nombre écrit : entier ou décimal (virgule ou point), signe et exposant admis. */
const NOMBRE = /^-?\d+(?:[.,]\d+)?(?:e[+-]?\d+)?$/i;

/** Instructions sans nombre, forme normalisée → type de bloc. */
const INSTRUCTIONS_SEULES: Record<string, string> = {
	'lever le stylo': 'tortue_lever_stylo',
	'baisser le stylo': 'tortue_baisser_stylo'
};

/** Instructions suivies d'un nombre : forme normalisée → type de bloc et nom de l'entrée. */
const INSTRUCTIONS_A_NOMBRE: Record<string, { type: string; entree: string }> = {
	avancer: { type: 'tortue_avancer', entree: 'VALEUR' },
	reculer: { type: 'tortue_reculer', entree: 'VALEUR' },
	'tourner a droite': { type: 'tortue_droite', entree: 'ANGLE' },
	'tourner a gauche': { type: 'tortue_gauche', entree: 'ANGLE' }
};

/** Écriture canonique de chaque bloc d'instruction. */
const ECRITURES: Record<string, string> = {
	tortue_avancer: 'avancer',
	tortue_reculer: 'reculer',
	tortue_droite: 'tourner à droite',
	tortue_gauche: 'tourner à gauche',
	tortue_lever_stylo: 'lever le stylo',
	tortue_baisser_stylo: 'baisser le stylo'
};

// =============================================================================
// Des blocs vers le texte
// =============================================================================

function ecrireNombre(nombre: number): string {
	return String(nombre || 0).replace('.', ',');
}

function ecrirePile(bloc: BlocLu | undefined): string[] {
	const instructions: string[] = [];
	for (let courant = bloc; courant; courant = courant.suivant) {
		// Un bloc désactivé n'est pas exécuté, son contenu non plus
		if (!courant.actif) continue;
		if (courant.type === 'controls_repeat' || courant.type === 'controls_repeat_ext') {
			const contenu = ecrirePile(courant.entrees.DO);
			const corps = contenu.length > 0 ? ` ${contenu.join(' ; ')} ` : ' ';
			instructions.push(`répéter ${nombreDeTours(courant)} [${corps}]`);
		} else if (courant.type === 'tortue_avancer' || courant.type === 'tortue_reculer') {
			instructions.push(
				`${ECRITURES[courant.type]} ${ecrireNombre(valeur(courant.entrees.VALEUR))}`
			);
		} else if (courant.type === 'tortue_droite' || courant.type === 'tortue_gauche') {
			instructions.push(
				`${ECRITURES[courant.type]} ${ecrireNombre(valeur(courant.entrees.ANGLE))}`
			);
		} else {
			instructions.push(ECRITURES[courant.type]);
		}
	}
	return instructions;
}

/**
 * Écrit en texte le programme d'un espace de travail Blockly, piles dans l'ordre d'exécution
 * (de haut en bas). Un bloc inconnu de la tortue ou un état mal formé rendent une erreur.
 */
export function etatVersTexte(etat: unknown): TexteLu {
	let piles: BlocLu[];
	try {
		piles = lirePiles(etat);
	} catch {
		return { ok: false, message: 'Programme illisible.' };
	}
	if (piles.some((pile) => premierBlocInconnu(pile, 'instruction') !== null)) {
		return { ok: false, message: 'Ce programme utilise un bloc que la tortue ne connaît pas.' };
	}
	return { ok: true, texte: piles.flatMap((pile) => ecrirePile(pile)).join(' ; ') };
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
	for (const morceau of texte.split(/(\[|\]|;|\n)|\s+/)) {
		if (!morceau) continue;
		if (morceau === '[' || morceau === ']' || morceau === ';') jetons.push({ type: morceau });
		else if (morceau === '\n') jetons.push({ type: ';' });
		else jetons.push({ type: 'mot', mot: morceau });
	}
	return jetons;
}

function lireNombre(mot: string | undefined): number | null {
	if (mot === undefined || !NOMBRE.test(mot)) return null;
	const nombre = Number(mot.replace(',', '.'));
	return Number.isFinite(nombre) ? nombre : null;
}

class TexteIllisible extends Error {}

function nombreBloc(valeurNombre: number) {
	return { shadow: { type: 'math_number', fields: { NUM: valeurNombre } } };
}

/** Relie une liste de blocs par `next` ; rend la tête de la pile. */
function chainer(blocs: Record<string, unknown>[]): Record<string, unknown> | undefined {
	for (let i = blocs.length - 2; i >= 0; i--) blocs[i].next = { block: blocs[i + 1] };
	return blocs[0];
}

/**
 * Lit un programme écrit en texte et le rend en état Blockly (une seule pile), prêt pour
 * `executerTortue` ou pour être rechargé dans l'espace de travail. Texte vide : programme vide.
 */
export function texteVersEtat(texte: string): EtatLu {
	if (texte.length > LONGUEUR_MAX_PROGRAMME) {
		return { ok: false, message: 'Programme trop long.' };
	}

	const jetons = decouper(texte);
	let position = 0;

	/** Lit une suite d'instructions jusqu'à `]` (dans une répétition) ou la fin. */
	function lireSuite(profondeur: number): Record<string, unknown>[] {
		const blocs: Record<string, unknown>[] = [];
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
			if (jeton.type === '[') throw new TexteIllisible('Crochet « [ » sans « répéter » avant.');
			blocs.push(lireInstruction(profondeur));
		}
		if (profondeur > 0) throw new TexteIllisible('Crochet « [ » jamais refermé.');
		return blocs;
	}

	function lireInstruction(profondeur: number): Record<string, unknown> {
		const mots: string[] = [];
		while (position < jetons.length) {
			const jeton = jetons[position];
			if (jeton.type !== 'mot') break;
			mots.push(jeton.mot);
			position++;
		}
		const ecrit = mots.join(' ');
		const normalises = mots.map(normaliser);
		const sansNombre = normalises.slice(0, -1).join(' ');
		const nombre = lireNombre(normalises.at(-1));

		const seule = INSTRUCTIONS_SEULES[normalises.join(' ')];
		if (seule) return { type: seule };

		const aNombre = INSTRUCTIONS_A_NOMBRE[sansNombre];
		if (aNombre && nombre !== null) {
			return { type: aNombre.type, inputs: { [aNombre.entree]: nombreBloc(nombre) } };
		}

		if (sansNombre === 'repeter' && nombre !== null) {
			if (!Number.isInteger(nombre) || nombre < 0) {
				throw new TexteIllisible(`« ${ecrit} » : il faut un nombre entier de fois.`);
			}
			if (jetons[position]?.type !== '[') {
				throw new TexteIllisible(`Après « ${ecrit} », il faut des crochets [ … ].`);
			}
			if (profondeur + 1 > PROFONDEUR_MAX) {
				throw new TexteIllisible('Trop de répétitions imbriquées.');
			}
			position++;
			const contenu = chainer(lireSuite(profondeur + 1));
			position++; // le « ] » fermant
			return {
				type: 'controls_repeat',
				fields: { TIMES: nombre },
				...(contenu && { inputs: { DO: { block: contenu } } })
			};
		}

		throw new TexteIllisible(`Instruction inconnue : « ${ecrit} ».`);
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
