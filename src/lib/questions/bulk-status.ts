/**
 * Publication par lot — forme de la réponse
 * ==========================================
 *
 * Partagée entre l'endpoint `POST /api/questions/templates/bulk-status` et la
 * page admin qui l'appelle (hors de `$lib/server`, donc importable côté client).
 */

export type BulkTemplateStatus = 'published' | 'draft';

export interface BulkTemplateEntry {
	id: string;
	title: string;
}

export interface BulkTemplateRefusal extends BulkTemplateEntry {
	/** Raisons du refus, en français */
	reasons: string[];
}

export interface BulkPublishResult {
	published: BulkTemplateEntry[];
	refused: BulkTemplateRefusal[];
}

export interface BulkUnpublishResult {
	unpublished: BulkTemplateEntry[];
	refused: BulkTemplateRefusal[];
}

/** Résultat agrégé côté page, quel que soit le sens */
export interface BulkStatusSummary {
	status: BulkTemplateStatus;
	changed: BulkTemplateEntry[];
	refused: BulkTemplateRefusal[];
}

/**
 * Taille d'un appel : chaque modèle publié coûte 50 tirages par variation côté
 * serveur. Tout publier en une requête dépasserait le délai d'une fonction.
 */
export const BULK_CLIENT_CHUNK_SIZE = 50;

/** Échec d'un paquet : porte ce qui était déjà passé avant l'échec */
export class BulkStatusError extends Error {
	readonly partial: BulkStatusSummary;

	constructor(message: string, partial: BulkStatusSummary) {
		super(message);
		this.name = 'BulkStatusError';
		this.partial = partial;
	}
}

/**
 * Appelle l'endpoint par paquets et agrège les comptes rendus. Une réponse non
 * OK interrompt la suite : ce qui est déjà passé reste acquis et figure dans le
 * résumé, le message d'erreur est levé avec lui.
 */
export async function changeTemplatesStatus(
	ids: string[],
	status: BulkTemplateStatus,
	onProgress?: (done: number, total: number) => void
): Promise<BulkStatusSummary> {
	const summary: BulkStatusSummary = { status, changed: [], refused: [] };
	for (let start = 0; start < ids.length; start += BULK_CLIENT_CHUNK_SIZE) {
		const part = ids.slice(start, start + BULK_CLIENT_CHUNK_SIZE);
		const response = await fetch('/api/questions/templates/bulk-status', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ ids: part, status })
		});
		if (!response.ok) {
			const body: unknown = await response.json().catch(() => null);
			const message =
				body && typeof body === 'object' && 'message' in body && typeof body.message === 'string'
					? body.message
					: `Erreur ${response.status}`;
			throw new BulkStatusError(message, summary);
		}
		const result = (await response.json()) as BulkPublishResult | BulkUnpublishResult;
		summary.changed.push(...('published' in result ? result.published : result.unpublished));
		summary.refused.push(...result.refused);
		onProgress?.(Math.min(start + part.length, ids.length), ids.length);
	}
	return summary;
}
