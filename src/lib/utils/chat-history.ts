/**
 * Historique du chat du Père Ubu dans le navigateur (`ChatBot.svelte`).
 *
 * Rangé PAR COMPTE (`chatHistory:<id>`) : sur une tablette partagée, l'élève suivant ne
 * doit pas lire la conversation du précédent (constat T17). L'ancienne clé commune
 * `chatHistory` n'appartient à personne de connu : elle est effacée, jamais reprise.
 * La déconnexion efface toutes les conversations avec les autres données de travail
 * (`clearWorkData`, `src/lib/utils/work-data.ts`).
 */

const LEGACY_KEY = 'chatHistory';
const KEY_PREFIX = 'chatHistory:';

function isChatHistoryKey(key: string): boolean {
	return key === LEGACY_KEY || key.startsWith(KEY_PREFIX);
}

function removeChatHistories(storage: Storage, keep: (key: string) => boolean): void {
	// Liste figée d'abord : retirer une clé décale les index de `storage.key()`.
	const keys = Array.from({ length: storage.length }, (_, i) => storage.key(i)).filter(
		(key): key is string => key !== null
	);
	for (const key of keys) {
		if (isChatHistoryKey(key) && !keep(key)) storage.removeItem(key);
	}
}

/** Efface les conversations des AUTRES comptes (et l'ancienne clé commune). */
export function forgetOtherChatHistories(storage: Storage, userId: string): void {
	removeChatHistories(storage, (key) => key === KEY_PREFIX + userId);
}

export function loadChatHistory(storage: Storage, userId: string): unknown {
	const saved = storage.getItem(KEY_PREFIX + userId);
	return saved === null ? null : JSON.parse(saved);
}

export function saveChatHistory(storage: Storage, userId: string, messages: unknown[]): void {
	storage.setItem(KEY_PREFIX + userId, JSON.stringify(messages));
}

export function clearChatHistory(storage: Storage, userId: string): void {
	storage.removeItem(KEY_PREFIX + userId);
}
