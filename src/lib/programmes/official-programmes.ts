/**
 * Programmes officiels (BO) par niveau
 * ====================================
 * Le texte officiel de chaque niveau : un PDF servi depuis `static/programmes/`
 * et, quand elle existe, sa transcription ubumark (lue côté serveur par
 * `$lib/server/programmes/transcriptions`).
 *
 * Les cycles 2, 3 et 4 n'ont qu'un PDF pour trois niveaux, rangé par domaine
 * puis par niveau : aucune page n'est « celle » d'un niveau, le PDF s'ouvre
 * au sommaire. La transcription, elle, est découpée par niveau : les parties
 * communes du cycle, puis, dans chaque domaine, son introduction commune et
 * la partie du niveau (un dossier `cycle-N/` par cycle).
 *
 * @module programmes/official-programmes
 */

import type { GradeCode } from '$lib/types/grades';

// Types

export interface OfficialProgramme {
	/** Titre du texte officiel, tel que le BO l'écrit */
	title: string;
	/** Adresse du PDF (fichier de `static/programmes/`) */
	pdfUrl: string;
	/**
	 * Transcriptions ubumark à mettre bout à bout, dans l'ordre (chemins sans
	 * `.md` sous `src/lib/server/programmes/transcriptions/`, ex. `cycle-4/5-nombres`)
	 */
	transcription: readonly string[];
}

// Constantes

const CYCLE_2 = 'Programme de mathématiques du cycle 2';
const CYCLE_3 = 'Programme de mathématiques pour le cycle 3';
const CYCLE_4 = 'Programme de mathématiques pour le cycle 4';

/** Les domaines de chaque cycle, dans l'ordre du BO */
const CYCLE_DOMAINS = {
	2: ['nombres', 'grandeurs', 'espace', 'donnees'],
	3: ['nombres', 'grandeurs', 'espace', 'donnees', 'proportionnalite', 'informatique'],
	4: ['nombres', 'espace', 'donnees', 'fonctions', 'informatique']
} as const;

/** Le programme de chaque niveau ; `null` : pas de mathématiques à ce niveau */
export const OFFICIAL_PROGRAMMES: Record<GradeCode, OfficialProgramme | null> = {
	CP: {
		title: CYCLE_2,
		pdfUrl: '/programmes/cycle-2.pdf',
		transcription: cycleTranscription(2, 'CP')
	},
	CE1: {
		title: CYCLE_2,
		pdfUrl: '/programmes/cycle-2.pdf',
		transcription: cycleTranscription(2, 'CE1')
	},
	CE2: {
		title: CYCLE_2,
		pdfUrl: '/programmes/cycle-2.pdf',
		transcription: cycleTranscription(2, 'CE2')
	},
	CM1: {
		title: CYCLE_3,
		pdfUrl: '/programmes/cycle-3.pdf',
		transcription: cycleTranscription(3, 'CM1')
	},
	CM2: {
		title: CYCLE_3,
		pdfUrl: '/programmes/cycle-3.pdf',
		transcription: cycleTranscription(3, 'CM2')
	},
	'6': {
		title: CYCLE_3,
		pdfUrl: '/programmes/cycle-3.pdf',
		transcription: cycleTranscription(3, '6')
	},
	'5': {
		title: CYCLE_4,
		pdfUrl: '/programmes/cycle-4.pdf',
		transcription: cycleTranscription(4, '5')
	},
	'4': {
		title: CYCLE_4,
		pdfUrl: '/programmes/cycle-4.pdf',
		transcription: cycleTranscription(4, '4')
	},
	'3': {
		title: CYCLE_4,
		pdfUrl: '/programmes/cycle-4.pdf',
		transcription: cycleTranscription(4, '3')
	},
	'2': {
		title: 'Programme de mathématiques de la classe de seconde générale et technologique',
		pdfUrl: '/programmes/2de.pdf',
		transcription: ['2']
	},
	'1_GEN': {
		title:
			"Programme de mathématiques intégré à l'enseignement scientifique en classe de première générale",
		pdfUrl: '/programmes/1re-enseignement-scientifique.pdf',
		transcription: ['1_GEN']
	},
	T_GEN: null,
	'1_SPE': {
		title:
			"Programme d'enseignement de spécialité de mathématiques de la classe de première de la voie générale",
		pdfUrl: '/programmes/1re-specialite.pdf',
		transcription: ['1_SPE']
	},
	T_SPE: {
		title:
			"Programme de l'enseignement de spécialité de mathématiques de la classe terminale de la voie générale",
		pdfUrl: '/programmes/terminale-specialite.pdf',
		transcription: ['T_SPE']
	},
	T_EXP: {
		title:
			"Programme de l'enseignement optionnel de mathématiques expertes de la classe terminale de la voie générale",
		pdfUrl: '/programmes/terminale-expertes.pdf',
		transcription: ['T_EXP']
	},
	T_COMP: {
		title:
			"Programme de l'enseignement optionnel de mathématiques complémentaires de la classe terminale de la voie générale",
		pdfUrl: '/programmes/terminale-complementaires.pdf',
		transcription: ['T_COMP']
	},
	'1_TECHNO': {
		title:
			"Programme d'enseignement de mathématiques de la classe de première de la voie technologique",
		pdfUrl: '/programmes/1re-technologique.pdf',
		transcription: ['1_TECHNO']
	},
	T_TECHNO: {
		title:
			"Programme d'enseignement de mathématiques de la classe terminale de la voie technologique",
		pdfUrl: '/programmes/terminale-technologique.pdf',
		transcription: ['T_TECHNO']
	}
};

// Functions

/**
 * Les morceaux d'un niveau de cycle : les parties communes du cycle, puis,
 * domaine par domaine, son introduction (commune) et la partie du niveau
 */
function cycleTranscription(cycle: 2 | 3 | 4, grade: string): string[] {
	const dir = `cycle-${cycle}`;
	return [
		`${dir}/commun`,
		...CYCLE_DOMAINS[cycle].flatMap((domain) => [`${dir}/${domain}`, `${dir}/${grade}-${domain}`])
	];
}
