/**
 * Guides calculatrices : les types du contenu.
 *
 * Une tâche (« Écrire une fraction ») est commune à tous les modèles ; chaque modèle
 * dit comment la faire chez lui (une séquence). Journal du chantier :
 * docs/wip/guides-calculatrices-progress.md.
 */

import type { GuideGrade } from './levels';

// ===== Tâches =====

/**
 * Ce que le programme attend de la calculatrice pour cette tâche :
 * - `programme` : le programme la demande (outil cité ou calcul numérique attendu) ;
 * - `verifier` : le programme attend une méthode algébrique, graphique ou au tableur,
 *   la calculatrice sert à contrôler ;
 * - `pratique` : usage de la machine ou règle d'examen, hors programme.
 */
export type TaskStatus = 'programme' | 'verifier' | 'pratique';

export interface CalculatorTask {
	/** Identifiant stable (référencé par les séquences des modèles et par la relecture) */
	id: string;
	/** Niveau où la tâche apparaît ; elle reste dans les « Rappels » des niveaux suivants */
	grade: GuideGrade;
	title: string;
	status: TaskStatus;
	/** Codes des points de programme qui la justifient (seeds de l'arbre des notions) */
	boRefs: readonly string[];
	/** Tâche facultative (ex. programmation par blocs sur la fx-92+) */
	optional?: boolean;
}

// ===== Séquences d'un modèle =====

/** D'où vient une séquence : la relecture doit pouvoir remonter à la source. */
export type SourceKind = 'doc' | 'notes-de-version' | 'code-source' | 'tiers';

export interface SequenceSource {
	kind: SourceKind;
	url: string;
	/** Paragraphe, fichier ou ligne précise */
	detail?: string;
}

/**
 * Une étape est du texte où les touches s'écrivent `[[id]]` (id déclaré dans
 * `CalculatorModel.keys`) ; le reste est affiché tel quel.
 * Exemple : « Appuie sur [[shift]] puis [[del]] ».
 */
export type Step = string;

export interface TaskSequence {
	taskId: string;
	/** Application à ouvrir (« Calculs », « Grapheur »…), absente si la tâche se fait partout */
	app?: string;
	/** Les étapes ; pour une tâche sans fonction dédiée : le moyen de contourner */
	steps: readonly Step[];
	/** Le modèle n'a pas de fonction dédiée : la page le dit avant le contournement */
	noDedicatedFunction?: boolean;
	/** Version du système à partir de laquelle la séquence marche (« 26 ») */
	sinceVersion?: string;
	/** Une remarque pour l'élève, d'une ligne */
	note?: string;
	sources: readonly SequenceSource[];
	/**
	 * Relue par David sur la vraie machine. Une séquence non relue est invisible en
	 * production (phase 0, point 8) : mieux vaut un trou qu'une erreur recopiée.
	 */
	verifiedOnDevice: boolean;
	/**
	 * Date ISO de la vérification au simulateur officiel (Epsilon compilé), absente si la
	 * séquence n'a pas pu y être rejouée. Ne remplace pas `verifiedOnDevice`.
	 */
	checkedInSimulator?: string;
}

/** Un piège propre au modèle (`80+20%` = 96 sur NumWorks). */
export interface Pitfall {
	id: string;
	/** Niveau à partir duquel le piège est montré */
	grade: GuideGrade;
	title: string;
	explanation: string;
	sources: readonly SequenceSource[];
	verifiedOnDevice: boolean;
	/** Date ISO de la vérification au simulateur officiel, absente si non rejoué */
	checkedInSimulator?: string;
}

export type ModelFamily = 'college' | 'lycee';

export interface CalculatorModel {
	/** Segment d'adresse : /calculatrices/<slug>/<niveau> */
	slug: string;
	name: string;
	family: ModelFamily;
	/** Niveaux pour lesquels le modèle a un guide */
	grades: readonly GuideGrade[];
	/** Version du système décrite (« 26 » pour NumWorks Epsilon v26) */
	systemVersion?: string;
	/** Touches : id utilisé dans `[[id]]` → libellé affiché sur la touche dessinée */
	keys: Readonly<Record<string, string>>;
	sequences: readonly TaskSequence[];
	pitfalls: readonly Pitfall[];
}
