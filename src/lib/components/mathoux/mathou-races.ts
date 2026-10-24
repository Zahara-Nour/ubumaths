/**
 * Races des Mathoux — les chats du Docteur Faustroll.
 *
 * Une race par branche de l'arbre des notions (19 branches), dans l'ordre `position` des
 * branches. Noms validés par David le 2026-10-18 (docs/wip/mathoux-noms.md).
 * Palette : celle du Chat Noir de Steinlen (docs/Chiphres/lore-pataphysique.md, § XI)
 * — rouge hsl(15,75%,50%), jaune hsl(40,70%,75%), noir hsl(220,30%,10%), crème hsl(40,30%,90%) —
 * complétée de teintes de pelage crédibles.
 *
 * Chaque race combine une couleur et un motif distincts : elle doit rester reconnaissable
 * à 64 px, quand le motif se réduit à quelques taches de couleur. Le dessin (direction « AB3 »,
 * chat-poire sur une affiche jaune) est dans mathou-dessin.ts.
 */

export type MathouStage = 'chaton' | 'matou' | 'grand_matou';

/** Réaction ponctuelle d'un Mathou : apparition = naissance, bond = il grandit, reveil = fin de sieste */
export type MathouReaction = 'apparition' | 'bond' | 'reveil';

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
	| 'arabesque'
	| 'arlequin'
	| 'plastron'
	| 'etoile';

export interface MathouRace {
	/** Nom de race affiché après le nom du Mathou : « Tangentin, le Chartreux de Yoyolande » */
	name: string;
	/** Couleur principale du pelage */
	primary: string;
	/** Couleur du motif */
	secondary: string;
	/** Troisième couleur (écaille, tricolore, arlequin), sinon absente */
	tertiary?: string;
	pattern: MathouPattern;
	/** Couleur de l'iris */
	eyes: string;
	/** Iris du second œil (à droite du dessin) quand il diffère : yeux vairons */
	eyesRight?: string;
	/** Auréole derrière la tête (et gloire du grand matou, lune de la sieste) */
	halo: string;
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
	noir: 'hsl(220, 28%, 12%)',
	blanc: 'hsl(40, 40%, 96%)',
	roux: 'hsl(24, 80%, 54%)',
	rouxFonce: 'hsl(14, 70%, 30%)',
	gris: 'hsl(212, 16%, 62%)',
	grisBleu: 'hsl(210, 16%, 50%)',
	grisFonce: 'hsl(215, 20%, 30%)',
	argent: 'hsl(210, 12%, 78%)',
	chocolat: 'hsl(20, 40%, 28%)',
	cannelle: 'hsl(26, 52%, 48%)',
	sable: 'hsl(34, 48%, 68%)',
	fume: 'hsl(222, 14%, 30%)',
	fauve: 'hsl(30, 62%, 54%)',
	lilas: 'hsl(268, 12%, 60%)',
	creme: 'hsl(38, 45%, 86%)'
} as const;

// Couleurs d'yeux
const EYES = {
	ambre: 'hsl(46, 95%, 58%)',
	vert: 'hsl(80, 60%, 52%)',
	bleu: 'hsl(200, 80%, 62%)',
	cuivre: 'hsl(28, 90%, 55%)',
	noisette: 'hsl(58, 60%, 50%)'
} as const;

// Auréoles : rouge de Steinlen, bleu nuit, vert bouteille, violet d'évêque
const HALO = {
	rouge: CHAT_NOIR.rouge,
	bleu: 'hsl(215, 50%, 30%)',
	vert: 'hsl(165, 40%, 30%)',
	violet: 'hsl(285, 30%, 36%)'
} as const;

export const MATHOU_RACES: readonly MathouRace[] = [
	{
		name: 'le Noir de Nombrilie',
		primary: FUR.noir,
		secondary: CHAT_NOIR.noir,
		pattern: 'uni',
		eyes: EYES.ambre,
		halo: HALO.rouge
	},
	{
		name: 'le Divisionnaire Euclidien',
		primary: FUR.roux,
		secondary: FUR.rouxFonce,
		pattern: 'tigre',
		eyes: EYES.vert,
		halo: HALO.bleu
	},
	{
		name: 'l’Imaginaire Eulérien',
		primary: FUR.noir,
		secondary: FUR.blanc,
		pattern: 'smoking',
		eyes: EYES.vert,
		halo: HALO.rouge
	},
	{
		name: 'le Linéen',
		primary: FUR.creme,
		secondary: FUR.chocolat,
		pattern: 'pointes',
		eyes: EYES.bleu,
		halo: HALO.vert
	},
	{
		name: 'le Al Jabr Oriental',
		primary: FUR.blanc,
		secondary: CHAT_NOIR.rouge,
		pattern: 'arabesque',
		eyes: EYES.bleu,
		eyesRight: EYES.cuivre,
		halo: HALO.bleu
	},
	{
		name: 'le Chartreux de Yoyolande',
		primary: FUR.grisBleu,
		secondary: FUR.grisFonce,
		pattern: 'uni',
		eyes: EYES.cuivre,
		halo: HALO.rouge
	},
	{
		name: 'le Mesuré Riemannien',
		primary: FUR.noir,
		secondary: FUR.roux,
		tertiary: FUR.sable,
		pattern: 'ecaille',
		eyes: EYES.ambre,
		halo: HALO.vert
	},
	{
		name: 'le Moucheté Newtonien',
		primary: FUR.sable,
		secondary: FUR.chocolat,
		pattern: 'tachete',
		eyes: EYES.noisette,
		halo: HALO.rouge
	},
	{
		name: 'le Discret Bigarré',
		primary: FUR.blanc,
		secondary: FUR.roux,
		tertiary: FUR.noir,
		pattern: 'tricolore',
		eyes: EYES.vert,
		halo: HALO.bleu
	},
	{
		name: 'le Matouriciel',
		primary: FUR.creme,
		secondary: CHAT_NOIR.rouge,
		tertiary: FUR.noir,
		pattern: 'arlequin',
		eyes: EYES.ambre,
		halo: HALO.vert
	},
	{
		name: 'l’Écumeur d’Arêtes',
		primary: FUR.gris,
		secondary: FUR.noir,
		pattern: 'masque',
		eyes: EYES.ambre,
		halo: HALO.rouge
	},
	{
		name: 'le Marbré de Bedonstan',
		primary: FUR.cannelle,
		secondary: FUR.chocolat,
		pattern: 'marbre',
		eyes: EYES.vert,
		halo: HALO.bleu
	},
	{
		name: 'l’Unitaire Napoléonien',
		primary: FUR.fume,
		secondary: FUR.argent,
		pattern: 'fume',
		eyes: EYES.cuivre,
		halo: HALO.violet
	},
	{
		name: 'le Hasardeux de Pifométrie',
		primary: FUR.blanc,
		secondary: FUR.roux,
		pattern: 'van',
		eyes: EYES.bleu,
		halo: HALO.vert
	},
	{
		name: 'le Chaussé Combinatoire',
		primary: FUR.chocolat,
		secondary: FUR.blanc,
		pattern: 'chaussettes',
		eyes: EYES.ambre,
		halo: HALO.rouge
	},
	{
		name: 'le Médian Moyen',
		primary: FUR.fauve,
		secondary: FUR.blanc,
		pattern: 'bicolore',
		eyes: EYES.vert,
		halo: HALO.bleu
	},
	{
		name: 'le Lunaire de Patatovie',
		primary: FUR.noir,
		secondary: CHAT_NOIR.jaune,
		pattern: 'plastron',
		eyes: EYES.vert,
		halo: HALO.violet
	},
	{
		name: 'le Patapouf',
		primary: FUR.lilas,
		secondary: FUR.blanc,
		pattern: 'etoile',
		eyes: EYES.noisette,
		halo: HALO.rouge
	},
	{
		name: 'le Tigré de Glitchistan',
		primary: FUR.argent,
		secondary: FUR.noir,
		pattern: 'tigre',
		eyes: EYES.noisette,
		halo: HALO.violet
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
