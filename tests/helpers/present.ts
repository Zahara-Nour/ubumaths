/**
 * Rend la valeur si elle est présente ; fait échouer le test sinon.
 *
 * Remplace un `as { id: string }` qui affirmait la présence d'une ligne sans la
 * vérifier : une RLS qui refuse rend `null` sans erreur, et le cast transformait
 * ce refus en `TypeError` incompréhensible plus loin dans le test.
 */
export function present<T>(value: T | null | undefined, label = 'valeur attendue'): T {
	if (value === null || value === undefined) {
		throw new Error(`${label} : absente (null ou undefined)`);
	}
	return value;
}
