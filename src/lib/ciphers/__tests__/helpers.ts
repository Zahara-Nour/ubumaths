// Générateur pseudo-aléatoire déterministe (LCG) : les tests par propriétés
// tirent toujours les mêmes cas, un échec se rejoue à l'identique.
export function seededRandom(seed: number): () => number {
	let state = seed >>> 0;
	return () => {
		state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
		return state / 2 ** 32;
	};
}

// Caractères tirés : lettres, accents, ligatures, chiffres, ponctuation, espaces
const POOL = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZéèêàçùôœæÉÇ0123456789 ,.;'!?-";

export function randomText(rand: () => number, maxLength = 60): string {
	const length = Math.floor(rand() * maxLength);
	let text = '';
	for (let i = 0; i < length; i++) text += POOL[Math.floor(rand() * POOL.length)];
	return text;
}

/** Une phrase française de plus de 80 lettres */
export const FRENCH_SENTENCE =
	'Le Pere Ubu ne sait pas compter mais la Mere Ubu tient les comptes du royaume et surveille les phynances de toute la Pologne';

/** Un texte français de plus de 400 lettres, pour Kasiski et l'indice de coïncidence */
export const LONG_FRENCH_TEXT =
	'Le Cabinet Noir de Turingrad ouvre chaque matin les lettres du Royaume. Les secrétaires de la Mère Ubu comptent les lettres une à une, notent celles qui reviennent le plus souvent et comparent leurs listes avec celles du français. Quand le message est long, la lettre E finit toujours par se montrer, suivie de près par le A, le S et le I. Les espions du Czar croyaient leur chiffre de Vigenère impossible à percer, mais une clé trop courte se répète, et ce qui se répète finit toujours par se trahir. Il suffit alors de découper le message en colonnes et de casser chacune comme un simple chiffre de César.';
