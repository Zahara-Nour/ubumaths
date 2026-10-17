/**
 * Nombre de signalements anti-triche non résolus d'une classe (badge Surveillance).
 *
 * Rend `null` quand le nombre est illisible (réponse en erreur, panne réseau,
 * réponse sans nombre) : la page affiche alors « ? » plutôt qu'un nombre périmé
 * (écart L30).
 */
export async function fetchUnresolvedCount(
	classId: string,
	fetchFn: (url: string) => Promise<Response> = fetch
): Promise<number | null> {
	try {
		const res = await fetchFn(`/api/teacher/classes/${classId}/anti-fraud/count`);
		if (!res.ok) return null;
		const body = (await res.json()) as { count?: unknown };
		return typeof body.count === 'number' ? body.count : null;
	} catch {
		return null;
	}
}
