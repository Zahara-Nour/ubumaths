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
 * Couplage des tailles — à garder ensemble :
 * - le client envoie des paquets de 50 (chaque modèle publié coûte 50 tirages
 *   par variation côté serveur ; tout d'un coup dépasserait le délai d'une fonction) ;
 * - le serveur accepte au plus 100 identifiants par appel (`MAX_BULK_TEMPLATE_IDS`),
 *   la marge couvre un groupe de rivaux qui déborde un paquet ;
 * - un conflit d'unicité (23505) refuse tout le paquet concerné : des paquets
 *   petits limitent ce qui est refusé d'un coup.
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
 * Clé de catégorie, alignée sur l'index unique de la base :
 * `(theme, domain, coalesce(subdomain, ''), level)`.
 */
export function templateCategoryKey(template: {
	theme: string;
	domain: string;
	subdomain?: string | null;
	level: number;
}): string {
	return JSON.stringify([
		template.theme,
		template.domain,
		template.subdomain ?? '',
		template.level
	]);
}

/**
 * Découpe en paquets SANS couper un groupe : les rivaux d'une même catégorie
 * partent ensemble, sinon le serveur ne les verrait jamais côte à côte et
 * publierait les deux (un par paquet). Un groupe plus grand qu'un paquet forme
 * son propre paquet (le serveur accepte jusqu'à 100).
 */
function chunkKeepingGroups(ids: string[], size: number, groupOf: (id: string) => string) {
	const groups = new Map<string, string[]>();
	for (const id of ids) {
		const key = groupOf(id);
		groups.set(key, [...(groups.get(key) ?? []), id]);
	}
	const chunks: string[][] = [];
	let current: string[] = [];
	for (const group of groups.values()) {
		if (current.length > 0 && current.length + group.length > size) {
			chunks.push(current);
			current = [];
		}
		current.push(...group);
	}
	if (current.length > 0) chunks.push(current);
	return chunks;
}

function isBulkResult(value: unknown): value is BulkPublishResult | BulkUnpublishResult {
	if (!value || typeof value !== 'object' || !('refused' in value)) return false;
	const changed =
		'published' in value ? value.published : 'unpublished' in value ? value.unpublished : null;
	return Array.isArray(changed) && Array.isArray(value.refused);
}

async function readErrorMessage(response: Response): Promise<string> {
	const body: unknown = await response.json().catch(() => null);
	return body && typeof body === 'object' && 'message' in body && typeof body.message === 'string'
		? body.message
		: `Erreur ${response.status}`;
}

/**
 * Appelle l'endpoint par paquets et agrège les comptes rendus. Tout échec
 * (réseau, réponse non OK, réponse illisible) interrompt la suite et lève une
 * `BulkStatusError` qui porte ce qui est déjà passé : le compte rendu reste vrai.
 *
 * `groupOf` : clé de catégorie d'un identifiant (publication) ; sans elle, chaque
 * identifiant est son propre groupe.
 */
export async function changeTemplatesStatus(
	ids: string[],
	status: BulkTemplateStatus,
	onProgress?: (done: number, total: number) => void,
	groupOf: (id: string) => string = (id) => id
): Promise<BulkStatusSummary> {
	const summary: BulkStatusSummary = { status, changed: [], refused: [] };
	let done = 0;
	for (const part of chunkKeepingGroups(ids, BULK_CLIENT_CHUNK_SIZE, groupOf)) {
		let result: unknown;
		try {
			const response = await fetch('/api/questions/templates/bulk-status', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ ids: part, status })
			});
			if (!response.ok) throw new BulkStatusError(await readErrorMessage(response), summary);
			result = await response.json();
		} catch (err) {
			if (err instanceof BulkStatusError) throw err;
			console.error('Bulk status request failed:', err);
			throw new BulkStatusError('connexion perdue ou réponse illisible', summary);
		}
		if (!isBulkResult(result)) throw new BulkStatusError('réponse illisible du serveur', summary);
		summary.changed.push(...('published' in result ? result.published : result.unpublished));
		summary.refused.push(...result.refused);
		done += part.length;
		onProgress?.(done, ids.length);
	}
	return summary;
}
