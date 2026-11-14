/**
 * Tortue : blocs, boîte à outils, interpréteur (ADR 0039) et segments.
 */

export { definirBlocsTortue, COULEUR_TORTUE } from './blocs';
export { TORTUE_TOOLBOX } from './toolbox';
export { imageAnimation, rythmeAnimation, DUREE_ETAPE_MS, PAUSE_DEPART_MS } from './animation';
export {
	executerTortue,
	messageErreurTortue,
	LIMITE_PAS,
	type EtapeTortue,
	type EtatTortue,
	type ErreurTortue,
	type ResultatTortue
} from './interpreteur';
export {
	normaliserSegments,
	memesTraces,
	memesFormes,
	sortDuCadre,
	DEMI_COTE_CADRE,
	type Point,
	type Segment
} from './segments';
export {
	etatVersTexte,
	texteVersEtat,
	LONGUEUR_MAX_PROGRAMME,
	type EtatProgramme,
	type EtatLu,
	type TexteLu
} from './notation';
export {
	jugerProgrammeTortue,
	lireProgrammeTortue,
	COMPARAISONS_TORTUE,
	type ComparaisonTortue,
	type ProgrammeLu,
	type VerdictTortue
} from './jugement';
