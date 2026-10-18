/**
 * Races des Mathoux — les chats du Docteur Faustroll.
 *
 * Une race par branche de l'arbre des notions (19 branches). Les noms sont provisoires.
 * Palette : celle du Chat Noir de Steinlen (docs/Chiphres/lore-pataphysique.md, § XI)
 * — rouge hsl(15,75%,50%), jaune hsl(40,70%,75%), noir hsl(220,30%,10%), crème hsl(40,30%,90%) —
 * complétée de teintes de pelage crédibles.
 *
 * Chaque race combine une couleur et un motif distincts : elle doit rester reconnaissable
 * à 48 px, quand le motif se réduit à quelques taches de couleur.
 */

export type MathouStage = 'chaton' | 'matou' | 'grand_matou';

export const MATHOU_STAGES: readonly MathouStage[] = ['chaton', 'matou', 'grand_matou'];

export type MathouPattern =
	| 'uni'
	| 'tigre'
	| 'tachete'
	| 'bicolore'
	| 'smoking'
	| 'ecaille'
	| 'tricolore'
	| 'pointes'
	| 'van'
	| 'masque'
	| 'chaussettes'
	| 'marbre'
	| 'fume'
	| 'gidouille'
	| 'arlequin'
	| 'plastron'
	| 'etoile';

export interface MathouRace {
	/** Nom de race affichable (provisoire) */
	name: string;
	/** Couleur principale du pelage */
	primary: string;
	/** Couleur du motif */
	secondary: string;
	/** Troisième couleur (écaille, tricolore), sinon absente */
	tertiary?: string;
	pattern: MathouPattern;
	/** Couleur de l'iris */
	eyes: string;
}

// Palette du Chat Noir de Steinlen
export const CHAT_NOIR = {
	rouge: 'hsl(15, 75%, 50%)',
	jaune: 'hsl(40, 70%, 75%)',
	noir: 'hsl(220, 30%, 10%)',
	creme: 'hsl(40, 30%, 90%)'
} as const;

// Teintes de pelage complémentaires
const FUR = {
	noir: 'hsl(220, 25%, 17%)',
	blanc: 'hsl(40, 35%, 96%)',
	roux: 'hsl(24, 78%, 54%)',
	rouxFonce: 'hsl(15, 75%, 40%)',
	gris: 'hsl(215, 14%, 58%)',
	grisFonce: 'hsl(215, 18%, 36%)',
	chocolat: 'hsl(20, 38%, 30%)',
	cannelle: 'hsl(26, 48%, 47%)',
	sable: 'hsl(36, 45%, 66%)',
	lilas: 'hsl(265, 10%, 72%)',
	fauve: 'hsl(34, 62%, 56%)'
} as const;

// Couleurs d'yeux
const EYES = {
	ambre: 'hsl(42, 95%, 55%)',
	vert: 'hsl(95, 55%, 50%)',
	bleu: 'hsl(205, 80%, 60%)',
	cuivre: 'hsl(25, 85%, 52%)',
	noisette: 'hsl(60, 60%, 48%)'
} as const;

export const MATHOU_RACES: readonly MathouRace[] = [
	{
		name: 'Chat Noir de Steinlen',
		primary: FUR.noir,
		secondary: CHAT_NOIR.noir,
		pattern: 'uni',
		eyes: EYES.ambre
	},
	{
		name: 'Roux du Clinamen',
		primary: FUR.roux,
		secondary: FUR.rouxFonce,
		pattern: 'tigre',
		eyes: EYES.vert
	},
	{
		name: 'Smoking de Faustroll',
		primary: FUR.noir,
		secondary: FUR.blanc,
		pattern: 'smoking',
		eyes: EYES.vert
	},
	{
		name: 'Siamois de la Chandelle Verte',
		primary: CHAT_NOIR.creme,
		secondary: FUR.chocolat,
		pattern: 'pointes',
		eyes: EYES.bleu
	},
	{
		name: 'Gidouillard de Patatovie',
		primary: CHAT_NOIR.jaune,
		secondary: CHAT_NOIR.rouge,
		pattern: 'gidouille',
		eyes: EYES.cuivre
	},
	{
		name: 'Chartreux Absolu',
		primary: FUR.gris,
		secondary: FUR.grisFonce,
		pattern: 'uni',
		eyes: EYES.cuivre
	},
	{
		name: 'Écaille des Phynances',
		primary: FUR.chocolat,
		secondary: FUR.roux,
		tertiary: CHAT_NOIR.jaune,
		pattern: 'ecaille',
		eyes: EYES.ambre
	},
	{
		name: 'Moucheté du Cymbalum',
		primary: FUR.sable,
		secondary: FUR.chocolat,
		pattern: 'tachete',
		eyes: EYES.noisette
	},
	{
		name: 'Tricolore Trismégiste',
		primary: FUR.blanc,
		secondary: FUR.roux,
		tertiary: FUR.noir,
		pattern: 'tricolore',
		eyes: EYES.vert
	},
	{
		name: 'Arlequin du Cabaret',
		primary: CHAT_NOIR.creme,
		secondary: CHAT_NOIR.rouge,
		tertiary: FUR.noir,
		pattern: 'arlequin',
		eyes: EYES.ambre
	},
	{
		name: 'Masqué du Palotin',
		primary: FUR.gris,
		secondary: FUR.noir,
		pattern: 'masque',
		eyes: EYES.ambre
	},
	{
		name: 'Marbré de Haldern',
		primary: FUR.cannelle,
		secondary: FUR.chocolat,
		pattern: 'marbre',
		eyes: EYES.vert
	},
	{
		name: 'Fumé de la Gidouille',
		primary: FUR.lilas,
		secondary: FUR.grisFonce,
		pattern: 'fume',
		eyes: EYES.cuivre
	},
	{
		name: 'Van du Cap Clinamen',
		primary: FUR.blanc,
		secondary: FUR.roux,
		pattern: 'van',
		eyes: EYES.bleu
	},
	{
		name: 'Chaussé de la Phynance',
		primary: FUR.chocolat,
		secondary: FUR.blanc,
		pattern: 'chaussettes',
		eyes: EYES.ambre
	},
	{
		name: 'Bicolore de Bosse-de-Nage',
		primary: FUR.fauve,
		secondary: FUR.blanc,
		pattern: 'bicolore',
		eyes: EYES.vert
	},
	{
		name: 'Plastron Lunaire',
		primary: FUR.noir,
		secondary: CHAT_NOIR.jaune,
		pattern: 'plastron',
		eyes: EYES.vert
	},
	{
		name: 'Étoilé Ubuesque',
		primary: CHAT_NOIR.rouge,
		secondary: CHAT_NOIR.creme,
		pattern: 'etoile',
		eyes: EYES.noisette
	},
	{
		name: 'Tigré de l’Absolu',
		primary: FUR.gris,
		secondary: FUR.noir,
		pattern: 'tigre',
		eyes: EYES.noisette
	}
];

export const MATHOU_RACE_COUNT = MATHOU_RACES.length;

/** Ramène n'importe quel index (négatif, décimal, NaN) dans 0..18. */
export function normalizeRaceIndex(raceIndex: number): number {
	if (!Number.isFinite(raceIndex)) return 0;
	const n = Math.trunc(raceIndex);
	return ((n % MATHOU_RACE_COUNT) + MATHOU_RACE_COUNT) % MATHOU_RACE_COUNT;
}

export function getMathouRace(raceIndex: number): MathouRace {
	return MATHOU_RACES[normalizeRaceIndex(raceIndex)];
}
