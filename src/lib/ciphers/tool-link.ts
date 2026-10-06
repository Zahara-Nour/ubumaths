/**
 * Lien d'une dépêche vers les outils de son chiffre : le message voyage dans
 * l'URL (`?decrypter=…`) et la page du chiffre l'ouvre dans l'onglet Décrypter.
 *
 * @module lib/ciphers/tool-link
 */
import { z } from 'zod';

// Constantes

export const DECRYPT_PARAM = 'decrypter';
/** Largement au-dessus de la plus longue dépêche ; au-delà, l'URL est ignorée */
export const MAX_URL_MESSAGE = 5000;

const messageSchema = z.string().min(1).max(MAX_URL_MESSAGE);

// Functions

/** `?decrypter=…`, à ajouter au chemin résolu de la page du chiffre */
export function decryptQuery(message: string): string {
	return `?${new URLSearchParams({ [DECRYPT_PARAM]: message })}`;
}

/** Le message à décrypter passé dans l'URL, ou null s'il est absent ou invalide */
export function readDecryptParam(params: URLSearchParams): string | null {
	const parsed = messageSchema.safeParse(params.get(DECRYPT_PARAM));
	return parsed.success ? parsed.data : null;
}
