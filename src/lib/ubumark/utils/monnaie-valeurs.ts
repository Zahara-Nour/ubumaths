/**
 * Bloc ```monnaie — les valeurs, en centimes exacts
 * =================================================
 *
 * Le nœud garde ses valeurs en euros (`0.5` = une pièce de 50 c, `20` = un
 * billet de 20 €) ; tout calcul passe par les CENTIMES entiers (`toCents`) :
 * 20 c + 20 c + 5 c valent 45 c, jamais 0,449999 €. Lecture d'un montant écrit
 * par l'auteur, écritures montrées à l'élève (correction, nom accessible) et
 * réponse d'une case, partagées par le parseur, la construction, l'écran et le
 * PDF (chantier `docs/wip/monnaie-centimes-progress.md` § 2, décisions 2 à 4).
 *
 * @module ubumark/utils/monnaie-valeurs
 */

import { MONNAIE_NOTES } from '../types/monnaie';

// ============================================================================
// CONSTANTES
// ============================================================================

/** Euros entiers, l'espace des milliers par groupes de trois : `35`, `1000`, `1 000` */
const EUROS = String.raw`(\d{1,3}(?: \d{3})+|\d+)`;

/** `3,45`, `3.45`, `3,5`, `35`, `35 €`, `1 000` */
const DECIMAL_REGEX = new RegExp(String.raw`^${EUROS}(?:[.,](\d{1,2}))?\s*€?$`);

/** `3 € 45 c`, `3€45c`, `3 € et 45 c` */
const EUROS_AND_CENTS_REGEX = new RegExp(String.raw`^${EUROS}\s*€\s*(?:et\s+)?(\d{1,2})\s*c$`, 'i');

/** Espaces insécables (fine ou non) : une espace ordinaire */
const NARROW_SPACES_REGEX = /[\u00a0\u202f]/g;

/** `345c`, `85 c` */
const CENTS_REGEX = /^(\d+)\s*c$/i;

// ============================================================================
// FONCTIONS
// ============================================================================

/** Une valeur en euros, en centimes entiers */
export function toCents(euros: number): number {
	return Math.round(euros * 100);
}

/** Des centimes, en euros (`345` → `3.45`) */
export function fromCents(cents: number): number {
	return cents / 100;
}

/** Une coupure de centimes (pièce de 1 à 50 c) ? */
export function isCents(value: number): boolean {
	return toCents(value) < 100;
}

/** `1000` → `1 000` */
function grouped(n: number): string {
	return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/**
 * Un montant écrit par l'auteur, en centimes : à virgule (`3,45`, `3,5`, `17,00`,
 * `35`, `35 €`), en euros et centimes (`3 € 45 c`) ou en centimes (`345c`) ;
 * null s'il est illisible ou a plus de 2 chiffres après la virgule
 */
export function readAmount(text: string): number | null {
	const t = text.replace(NARROW_SPACES_REGEX, ' ').trim();
	const euros = (digits: string) => Number(digits.replaceAll(' ', '')) * 100;
	const decimal = DECIMAL_REGEX.exec(t);
	if (decimal) return euros(decimal[1]) + Number((decimal[2] ?? '0').padEnd(2, '0'));
	const mixed = EUROS_AND_CENTS_REGEX.exec(t);
	if (mixed) return euros(mixed[1]) + Number(mixed[2]);
	const cents = CENTS_REGEX.exec(t);
	if (cents) return Number(cents[1]);
	return null;
}

/**
 * Réponse d'une case à construire, écrite comme le juge ordinaire l'attend
 * (revue B1, C1) : virgule sans zéro final (`3,45`, `0,85`, `2,2`), milliers
 * séparés (`1 000`) ; une somme entière reste sans virgule (`35`, celle du CP).
 * L'élève ne la lit jamais : la correction dit « 2 € et 20 c » (`amountWords`).
 */
export function amountAnswer(cents: number): string {
	const euros = grouped(Math.floor(cents / 100));
	const rest = cents % 100;
	if (rest === 0) return euros;
	return `${euros},${String(rest).padStart(2, '0').replace(/0$/, '')}`;
}

/** Un montant pour l'élève ou l'auteur : `3 € et 45 c`, `32 €`, `85 c`, `1 000 €` */
export function amountWords(cents: number): string {
	const euros = Math.floor(cents / 100);
	const rest = cents % 100;
	if (rest === 0) return `${grouped(euros)} €`;
	if (euros === 0) return `${rest} c`;
	return `${grouped(euros)} € et ${rest} c`;
}

/** Ce qui s'écrit sur une coupure : `50 c`, `2 €`, `500 €` */
export function denominationLabel(value: number): string {
	return isCents(value) ? `${toCents(value)} c` : `${value} €`;
}

/** Nom d'une coupure (bouton, lecteur d'écran) : « une pièce de 50 centimes », « un billet de 10 € » */
export function denominationName(value: number): string {
	if ((MONNAIE_NOTES as readonly number[]).includes(value)) return `un billet de ${value} €`;
	if (!isCents(value)) return `une pièce de ${value} €`;
	const cents = toCents(value);
	return `une pièce de ${cents} centime${cents > 1 ? 's' : ''}`;
}

/**
 * Des coupures en liste croissante, l'unité sur chacune : `5 c, 10 c, 1 €, 2 €`.
 * Jamais `5, 10 c` : recopié en `réserve: 5 10 c`, il donnerait un billet de 5 €
 * sans erreur (revue C3).
 */
export function denominationList(values: readonly number[]): string {
	return [...values]
		.sort((a, b) => a - b)
		.map(denominationLabel)
		.join(', ');
}

/**
 * Famille d'une pièce, qui donne sa couleur (décision 1) : `cuivre` (1, 2, 5 c),
 * `dore` (10, 20, 50 c), `euro` (1 et 2 €, la couleur d'accent)
 */
export function coinFamily(value: number): 'cuivre' | 'dore' | 'euro' {
	const cents = toCents(value);
	if (cents >= 100) return 'euro';
	return cents >= 10 ? 'dore' : 'cuivre';
}
