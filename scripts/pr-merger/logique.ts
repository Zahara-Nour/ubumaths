/**
 * `pnpm pr:merger` : les règles (pures, testées dans scripts/__tests__/pr-merger.test.ts)
 * =====================================================================================
 *
 * Ce que GitHub dit d'une PR, lu une fois par `gh pr view --json`, et ce que la
 * commande en conclut. Aucun appel à `gh` ni à `git` ici : cf. index.ts.
 */

// ============================================================================
// Types
// ============================================================================

/** Un contrôle du dernier commit de la PR, tel que `statusCheckRollup` le rend. */
export type Controle = {
	__typename?: string;
	/** CheckRun */
	name?: string;
	status?: string;
	conclusion?: string | null;
	/** StatusContext */
	context?: string;
	state?: string;
};

export type Verdict =
	| { etat: 'vert' }
	/** Au moins un contrôle n'a pas fini. */
	| { etat: 'en-cours'; noms: string[] }
	/** Au moins un contrôle fini n'est ni réussi ni sauté. */
	| { etat: 'rouge'; noms: string[] }
	/** Rien ne tourne et le contrôle de synthèse n'est pas là : run pas encore enregistré. */
	| { etat: 'absent' };

export type Pr = {
	number: number;
	state: string;
	isDraft: boolean;
	baseRefName: string;
	headRefName: string;
	headRefOid: string;
	mergeable: string;
	mergeStateStatus: string;
	statusCheckRollup: Controle[];
};

// ============================================================================
// Constantes
// ============================================================================

/**
 * Le contrôle de synthèse de quality.yml, exigé par la protection de main. Il
 * n'existe qu'une fois les autres jobs finis : sans lui, la CI n'a pas rendu
 * son verdict, même si tout ce qui est listé est vert (juste après un push, la
 * liste ne contient que les contrôles des workflows déjà enregistrés).
 */
export const SYNTHESE = 'CI Summary';

/** « Sauté » vaut réussi : PR de contenu seul, jobs conditionnels. */
const CONCLUSIONS_VERTES = new Set(['SUCCESS', 'SKIPPED', 'NEUTRAL']);

/** PR qui demande `code-reviewer` + `security-auditor` (CLAUDE.md § Planning, point 4). */
const CHEMINS_SENSIBLES = [
	/^supabase\//,
	/^src\/routes\/api\//,
	/^src\/hooks\.server\.ts$/,
	/^src\/lib\/server\/auth/,
	/(^|\/)auth\//
];

// ============================================================================
// Fonctions
// ============================================================================

/** Le verdict des contrôles du dernier commit. Une liste vide n'est jamais « vert ». */
export function verdictDesControles(controles: Controle[]): Verdict {
	const enCours: string[] = [];
	const rouges: string[] = [];
	let synthese = false;

	for (const c of controles) {
		if (c.__typename === 'StatusContext') {
			const nom = c.context ?? '(sans nom)';
			if (c.state === 'SUCCESS') continue;
			if (c.state === 'PENDING' || c.state === 'EXPECTED') enCours.push(nom);
			else rouges.push(`${nom} (${(c.state ?? 'inconnu').toLowerCase()})`);
			continue;
		}
		const nom = c.name ?? '(sans nom)';
		if (c.status !== 'COMPLETED') {
			enCours.push(nom);
			continue;
		}
		if (!CONCLUSIONS_VERTES.has(c.conclusion ?? '')) {
			rouges.push(`${nom} (${(c.conclusion ?? 'sans conclusion').toLowerCase()})`);
			continue;
		}
		// La synthèse doit avoir RÉUSSI : sautée, elle n'a rien vérifié.
		if (nom === SYNTHESE && c.conclusion === 'SUCCESS') synthese = true;
	}

	if (rouges.length > 0) return { etat: 'rouge', noms: rouges };
	if (enCours.length > 0) return { etat: 'en-cours', noms: enCours };
	if (!synthese) return { etat: 'absent' };
	return { etat: 'vert' };
}

export function migrations(fichiers: string[]): string[] {
	return fichiers.filter((f) => f.startsWith('supabase/migrations/'));
}

export function fichiersSensibles(fichiers: string[]): string[] {
	return fichiers.filter((f) => CHEMINS_SENSIBLES.some((motif) => motif.test(f)));
}

/**
 * Ce qui interdit le merge quoi que dise la CI, ou `null`. `BLOCKED` n'en fait
 * pas partie tant que la CI tourne : c'est l'état normal d'une PR dont les
 * contrôles exigés n'ont pas fini (cf. `blocage`).
 */
export function refus(pr: Pr): string | null {
	if (pr.state === 'CLOSED') return 'la PR est fermée sans merge';
	if (pr.baseRefName !== 'main') return `la PR vise « ${pr.baseRefName} », pas main`;
	if (pr.isDraft) return 'la PR est en brouillon';
	if (pr.mergeable === 'CONFLICTING') return 'la PR est en conflit avec main';
	return null;
}

/** Contrôles verts et pourtant pas mergeable : une règle de la branche le refuse. */
export function blocage(pr: Pr): string | null {
	if (pr.mergeStateStatus === 'BLOCKED')
		return 'GitHub la dit bloquée (`BLOCKED`) : une règle de protection de main n’est pas remplie';
	if (pr.mergeStateStatus === 'DIRTY') return 'la PR est en conflit avec main';
	return null;
}

/**
 * Les worktrees du dépôt, lus dans `git worktree list --porcelain`. Le premier
 * est toujours le dépôt principal.
 */
export function lireWorktrees(porcelaine: string): { chemin: string; branche: string | null }[] {
	return porcelaine
		.split('\n\n')
		.map((bloc) => bloc.trim())
		.filter(Boolean)
		.map((bloc) => {
			const lignes = bloc.split('\n');
			const chemin = (lignes.find((l) => l.startsWith('worktree ')) ?? '').slice(
				'worktree '.length
			);
			const ref = lignes.find((l) => l.startsWith('branch '));
			return { chemin, branche: ref ? ref.slice('branch refs/heads/'.length) : null };
		});
}
