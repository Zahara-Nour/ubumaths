/**
 * Données de travail d'élève gardées dans le navigateur (`localStorage`) : code Python,
 * Blockly, atelier, console de calcul, calculatrice, grapheur, tableur, tableau blanc,
 * parties de jeux, conversation du Père Ubu.
 *
 * Sur une tablette partagée, un compte ne doit pas retrouver celles d'un autre (T17 étendu,
 * décision de David du 2026-10-13 : effacées à la déconnexion). Le navigateur retient à
 * qui elles appartiennent (`OWNER_KEY`) :
 * - même propriétaire : rien ne change ;
 * - visiteur sans compte qui se connecte : son compte les reprend (le bac à sable Python
 *   propose alors de les enregistrer dans le compte) ;
 * - tout autre changement (autre compte, visiteur après un compte, propriétaire inconnu) :
 *   elles sont effacées avant d'être affichées ;
 * - déconnexion et suppression du compte : effacées (`clearWorkData`).
 *
 * Les préférences (thème, police, position des barres d'outils) et les réglages du prof
 * (classe, période, panier de questions) ne sont pas des données d'élève : elles restent.
 *
 * ⚠️ Une nouvelle clé de travail s'ajoute ici, sinon elle survit au changement de compte.
 */

const OWNER_KEY = 'chiphre:work-data-owner';
const ANONYMOUS = 'anonymous';

const WORK_DATA_KEYS: readonly string[] = [
	'chatHistory',
	'chiphre-python-playground',
	'chiphre-blockly-playground',
	'chiphre-atelier',
	'chiphre-cas-repl',
	'chiphre-calc-history',
	'chiphre-grapheur-state',
	'chiphre-spreadsheet-state',
	'chiphre-whiteboard-autosave',
	'chiphre-whiteboard-autosave-index',
	'chiphre-whiteboard-sync-state',
	'chiphre:depeches-du-czar',
	'chiphre:depeches-du-czar:indices',
	'minesweeper_game',
	'2048-best-score',
	'2048-game-state',
	'mathemo_state',
	'game_player'
];

const WORK_DATA_PREFIXES: readonly string[] = [
	'chatHistory:',
	'chiphre-whiteboard-autosave-',
	'chiphre-exercise-',
	'evoland_save_'
];

export function isWorkDataKey(key: string): boolean {
	return WORK_DATA_KEYS.includes(key) || WORK_DATA_PREFIXES.some((p) => key.startsWith(p));
}

function workDataKeys(storage: Storage): string[] {
	// Liste figée : retirer une clé décale les index de `storage.key()`.
	return Array.from({ length: storage.length }, (_, i) => storage.key(i)).filter(
		(key): key is string => key !== null && isWorkDataKey(key)
	);
}

/** Efface toutes les données de travail et leur propriétaire. Rend le nombre de clés retirées. */
export function clearWorkData(storage: Storage): number {
	const keys = workDataKeys(storage);
	for (const key of keys) storage.removeItem(key);
	storage.removeItem(OWNER_KEY);
	return keys.length;
}

/**
 * Attribue les données de travail au compte courant (`null` : visiteur sans compte), en
 * effaçant celles d'un autre. Rend `true` si des données ont été effacées : celles déjà
 * chargées en mémoire par la page doivent alors disparaître (rechargement).
 */
export function claimWorkData(storage: Storage, userId: string | null): boolean {
	const current = userId ?? ANONYMOUS;
	const owner = storage.getItem(OWNER_KEY);
	if (owner === current) return false;

	const adopt = owner === ANONYMOUS && userId !== null;
	const removed = adopt ? 0 : clearWorkData(storage);
	storage.setItem(OWNER_KEY, current);
	return removed > 0;
}

/**
 * Au chargement de chaque page (`src/routes/+layout.ts`) : si des données d'un autre ont
 * été effacées, la page est rechargée pour vider celles que les modules ont déjà lues. Un
 * stockage inaccessible (navigation privée, quota) ne bloque jamais la page.
 */
export function enforceWorkDataOwner(
	userId: string | null,
	storage: Storage,
	reload: () => void
): boolean {
	let removed: boolean;
	try {
		removed = claimWorkData(storage, userId);
	} catch (e) {
		console.error('Données de travail du navigateur non vérifiées :', e);
		return false;
	}
	if (removed) reload();
	return removed;
}
