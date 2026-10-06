/**
 * Erreur de saisie d'un chiffre (clé invalide, code mal formé…). Son message
 * s'affiche tel quel sous le champ : il est en français et nomme le problème.
 * Toute autre erreur est un bug, pas une faute de l'élève.
 */
export class CipherInputError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'CipherInputError';
	}
}
