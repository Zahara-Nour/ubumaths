/**
 * Balises de synthèse vocale de MathLive (E32)
 *
 * Sa lecture anglaise les laisse en clair (« the fraction <break time="150ms"/>
 * pie over… ») : un lecteur d'écran les lirait telles quelles.
 *
 * @module utils/formula-speech/speech-markup
 */

/** Retirer les balises de synthèse vocale d'une lecture de MathLive */
export function stripSpeechMarkup(text: string): string {
	return text
		.replace(/<[^>]*>/g, ' ')
		.replace(/\s+/g, ' ')
		.replace(/\s+([.,])/g, '$1')
		.trim();
}
