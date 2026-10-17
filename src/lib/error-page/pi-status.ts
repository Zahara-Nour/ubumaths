/**
 * Où le code d'une erreur HTTP apparaît-il dans les décimales de π ?
 *
 * La page d'erreur reprend la blague de l'ancien site (« As-tu regardé à la
 * n-ième décimale ? ») en la rendant VRAIE : chaque code connu est situé à sa
 * première apparition dans les décimales de π, avec les chiffres qui l'entourent.
 *
 * Table précalculée plutôt que calculée : la page d'erreur racine est préchargée
 * sur toutes les pages (SvelteKit l'importe au démarrage), elle doit rester
 * légère, et 500 n'apparaît qu'à la 6 238ᵉ décimale. Le test associé recalcule π
 * (formule de Machin, en BigInt) et vérifie chaque ligne.
 *
 * @module lib/error-page/pi-status
 */

export interface PiOccurrence {
	/** Rang de la première décimale du code (1 = le « 1 » de 3,14…). */
	position: number;
	/** Jusqu'à 6 décimales qui précèdent le code. */
	before: string;
	/** Les 6 décimales qui suivent le code. */
	after: string;
}

/** Première apparition de chaque code dans les décimales de π. */
export const PI_STATUS_OCCURRENCES: Readonly<Record<number, PiOccurrence>> = {
	400: { position: 1174, before: '255060', after: '927701' },
	401: { position: 1197, before: '984882', after: '285836' },
	403: { position: 723, before: '196086', after: '441815' },
	404: { position: 1272, before: '684710', after: '753464' },
	405: { position: 595, before: '467669', after: '132000' },
	408: { position: 145, before: '725359', after: '128481' },
	410: { position: 162, before: '745028', after: '270193' },
	413: { position: 1075, before: '622599', after: '891249' },
	415: { position: 2, before: '1', after: '926535' },
	422: { position: 1839, before: '068006', after: '512520' },
	429: { position: 1229, before: '101819', after: '555961' },
	500: { position: 6238, before: '651300', after: '516832' },
	501: { position: 1343, before: '580381', after: '935112' },
	502: { position: 31, before: '383279', after: '884197' },
	503: { position: 837, before: '334468', after: '526193' },
	504: { position: 1920, before: '919494', after: '712371' }
};

/** L'occurrence du code dans π, ou `null` pour un code hors table. */
export function piOccurrence(status: number): PiOccurrence | null {
	return PI_STATUS_OCCURRENCES[status] ?? null;
}

/** « 1ʳᵉ », « 2ᵉ », « 1 272ᵉ » : rang ordinal à la française, espace fine insécable. */
export function frenchOrdinal(n: number): string {
	return `${new Intl.NumberFormat('fr-FR').format(n)}${n === 1 ? 'ʳᵉ' : 'ᵉ'}`;
}
