/**
 * Version d'un exercice dans une fiche (ADR 0044, points 5 et 6)
 * ===============================================================
 *
 * Une ligne de fiche pointe vers UNE version de son exercice. La page d'édition de la fiche montre,
 * pour chaque exercice qui a plusieurs versions, celle de la fiche, et propose de passer à une
 * autre. Un exercice à une seule version n'affiche rien (aucune fiche ne change à l'écran).
 *
 * Module sans dépendance serveur : les types servent aussi à `#lib/server/exercise-versions.ts`.
 *
 * @module worksheets/line-version
 */

// ============================================================================
// TYPES
// ============================================================================

/** Une version telle que le menu de la ligne la montre (sans son contenu) */
export interface VersionOption {
	id: string;
	number: number;
	note: string | null;
	created_at: string;
}

/** La version d'une ligne de fiche et toutes les versions de son exercice */
export interface LineVersionChoice {
	current_version_id: string;
	/** Par numéro croissant */
	versions: VersionOption[];
}

/** Ce que la page d'édition d'une fiche sait des versions de ses exercices */
export interface WorksheetVersionChoices {
	/** Affectations EN COURS de la fiche : au-delà de 0, changer de version demande confirmation */
	active_assignments: number;
	/** Par identifiant de ligne ; seules les lignes dont l'exercice a plusieurs versions */
	lines: Record<string, LineVersionChoice>;
}

export interface LineVersionState {
	current: VersionOption;
	latest: VersionOption;
	isLatest: boolean;
}

// ============================================================================
// CONSTANTES
// ============================================================================

const DATE_FORMAT = new Intl.DateTimeFormat('fr-FR', {
	day: '2-digit',
	month: '2-digit',
	year: 'numeric',
	timeZone: 'Europe/Paris'
});

// ============================================================================
// FONCTIONS
// ============================================================================

/**
 * La version de la ligne et la plus récente (le plus grand numéro). `null` si la version de la
 * ligne n'est pas dans la liste : données périmées, la page se recharge.
 */
export function lineVersionState(choice: LineVersionChoice): LineVersionState | null {
	const current = choice.versions.find((v) => v.id === choice.current_version_id);
	if (!current) return null;
	const latest = choice.versions.reduce((a, b) => (b.number > a.number ? b : a));
	return { current, latest, isLatest: current.id === latest.id };
}

/** « v2 · question b) reformulée · 25/11/2026 » ; la plus récente le dit */
export function versionOptionLabel(version: VersionOption, latestNumber: number): string {
	const name =
		version.number === latestNumber ? `v${version.number} (la plus récente)` : `v${version.number}`;
	const note = version.note?.trim();
	const date = DATE_FORMAT.format(new Date(version.created_at));
	return [name, note, date].filter(Boolean).join(' · ');
}

/**
 * Le texte de la confirmation avant de changer de version, `null` sans affectation en cours
 * (changement direct, ADR 0044 point 6).
 */
export function versionChangeConfirmation(activeAssignments: number): string | null {
	if (activeAssignments <= 0) return null;
	const what = activeAssignments === 1 ? 'affectation' : 'affectations';
	return `${activeAssignments} ${what} en cours : les élèves verront la nouvelle rédaction à leur prochaine ouverture.`;
}
