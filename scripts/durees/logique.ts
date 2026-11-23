/**
 * `pnpm durees` : les règles (pures, testées dans scripts/__tests__/durees.test.ts)
 * ===============================================================================
 *
 * Ce que GitHub dit des exécutions de quality.yml et des PR, ce que
 * `pnpm deploy:prod` a noté, et ce que la commande en conclut. Aucun appel à
 * `gh` ni au disque ici : cf. index.ts.
 *
 * Une « phase » se nomme :
 *   - `ci`                      la CI entière d'une PR de code ;
 *   - `pr`                      de l'ouverture au merge, PR à un seul push ;
 *   - `job:<nom du job>`        un job de quality.yml ;
 *   - `etape:<job> / <étape>`   une étape suivie (ETAPES_SUIVIES) ;
 *   - `prod:<étape>`            une étape de `pnpm deploy:prod`.
 */

// ============================================================================
// Types
// ============================================================================

/** Une exécution de quality.yml, telle que `gh run list --json` la rend. */
export type Run = {
	databaseId: number;
	headBranch: string;
	headSha: string;
	conclusion: string | null;
	status: string;
	attempt: number;
	createdAt: string;
	updatedAt: string;
};

export type Etape = {
	name: string;
	conclusion: string | null;
	started_at?: string | null;
	completed_at?: string | null;
};

/** Un job, tel que l'API `actions/runs/<id>/jobs` le rend. */
export type Job = {
	name: string;
	conclusion: string | null;
	started_at: string | null;
	completed_at: string | null;
	steps?: Etape[];
};

export type PrMergee = {
	number: number;
	createdAt: string;
	mergedAt: string;
	headRefName: string;
};

export type Mesure = {
	phase: string;
	secondes: number;
	/** Début de ce qui est mesuré (ISO 8601, UTC). */
	date: string;
};

/** Le fichier scripts/durees/reference.json. */
export type Reference = {
	/** Aucune mesure d'avant cette date n'est lue : la CI n'était pas la même. */
	depuis: string;
	/** Durée normale de chaque phase, en secondes. */
	phases: Record<string, number>;
};

export type Verdict = 'lent' | 'normal' | 'trop-peu' | 'sans-reference';

export type Ligne = {
	phase: string;
	reference: number | null;
	/** Médiane des dernières 24 heures (mise en prod : des 5 dernières). */
	jour: number | null;
	nJour: number;
	/** Médiane des 7 derniers jours. */
	semaine: number | null;
	nSemaine: number;
	verdict: Verdict;
};

// ============================================================================
// Constantes
// ============================================================================

/** Tranché par David le 2026-11-23 : médiane d'au moins 1,5 fois la référence… */
export const SEUIL = 1.5;
/** … sur au moins 5 mesures. Une seule PR lente ne déclenche rien. */
export const MESURES_MIN = 5;
/** Sous 20 s, une phase n'entre pas dans la référence : 4 s contre 6 s n'est que du bruit. */
export const PLANCHER_S = 20;

/** Les seules étapes suivies à part de leur job. */
export const ETAPES_SUIVIES = new Set([
	'Type Check / Run svelte-check',
	'Lint / Run Prettier check'
]);

const JOUR_MS = 24 * 3600 * 1000;

const LIBELLES: Record<string, string> = {
	ci: 'CI entière (PR de code)',
	pr: 'Ouverture → merge (un push)',
	'prod:ci-version': 'Mise en prod : CI de la version',
	'prod:vercel': 'Mise en prod : construction Vercel',
	'prod:bascule': 'Mise en prod : bascule du site'
};

// ============================================================================
// Fonctions
// ============================================================================

function secondesEntre(debut?: string | null, fin?: string | null): number | null {
	if (!debut || !fin) return null;
	const duree = Math.round((Date.parse(fin) - Date.parse(debut)) / 1000);
	return Number.isFinite(duree) && duree >= 0 ? duree : null;
}

export function mediane(valeurs: number[]): number | null {
	if (valeurs.length === 0) return null;
	const triees = [...valeurs].sort((a, b) => a - b);
	const milieu = Math.floor(triees.length / 2);
	return triees.length % 2 === 1
		? triees[milieu]
		: Math.round((triees[milieu - 1] + triees[milieu]) / 2);
}

export function formaterDuree(secondes: number): string {
	if (secondes < 60) return `${secondes} s`;
	const reste = secondes % 60;
	const minutes = Math.floor(secondes / 60);
	return reste === 0 ? `${minutes} min` : `${minutes} min ${String(reste).padStart(2, '0')}`;
}

export function libelle(phase: string): string {
	if (LIBELLES[phase]) return LIBELLES[phase];
	if (phase.startsWith('job:')) return phase.slice(4);
	if (phase.startsWith('etape:'))
		return `  dont ${phase.slice(6).split(' / ')[1] ?? phase.slice(6)}`;
	return phase;
}

/**
 * Vrai si l'exécution a tout joué. Une PR de contenu saute six jobs et écourte
 * les autres (tests serveur en 2 s) : ses durées feraient baisser la médiane.
 */
export function estComplete(run: Run, jobs: Job[]): boolean {
	return (
		run.status === 'completed' && jobs.length > 0 && jobs.every((j) => j.conclusion !== 'skipped')
	);
}

/** Les mesures d'une exécution finie ; aucune si elle n'est pas complète. */
export function mesuresDuRun(run: Run, jobs: Job[]): Mesure[] {
	if (!estComplete(run, jobs)) return [];
	const lues: Mesure[] = [];
	for (const job of jobs) {
		if (job.conclusion !== 'success') continue;
		const duree = secondesEntre(job.started_at, job.completed_at);
		if (duree === null) continue;
		lues.push({ phase: `job:${job.name}`, secondes: duree, date: run.createdAt });
		for (const etape of job.steps ?? []) {
			const nom = `${job.name} / ${etape.name}`;
			if (etape.conclusion !== 'success' || !ETAPES_SUIVIES.has(nom)) continue;
			const dureeEtape = secondesEntre(etape.started_at, etape.completed_at);
			if (dureeEtape !== null) {
				lues.push({ phase: `etape:${nom}`, secondes: dureeEtape, date: run.createdAt });
			}
		}
	}
	// Une relance ne rejoue que les jobs rouges : sa durée n'est pas celle d'une CI.
	if (run.conclusion === 'success' && run.attempt === 1) {
		const duree = secondesEntre(run.createdAt, run.updatedAt);
		if (duree !== null) lues.push({ phase: 'ci', secondes: duree, date: run.createdAt });
	}
	return lues;
}

/**
 * « Ouverture → merge » d'une PR mergée : comptée seulement si elle n'a eu
 * qu'une exécution de CI (un seul push) et que celle-ci était complète.
 * `completes` = les identifiants des exécutions complètes.
 */
export function mesuresDeLaPr(pr: PrMergee, runs: Run[], completes: Set<number>): Mesure[] {
	const siennes = runs.filter(
		(r) =>
			r.headBranch === pr.headRefName && r.createdAt >= pr.createdAt && r.createdAt <= pr.mergedAt
	);
	if (siennes.length !== 1 || !completes.has(siennes[0].databaseId)) return [];
	const duree = secondesEntre(pr.createdAt, pr.mergedAt);
	return duree === null ? [] : [{ phase: 'pr', secondes: duree, date: pr.createdAt }];
}

/** Le journal de `pnpm deploy:prod` : `date;version;étape;secondes`, une ligne par étape. */
export function lireJournalProd(texte: string): Mesure[] {
	const lues: Mesure[] = [];
	for (const ligne of texte.split('\n')) {
		const [date, , etape, secondes] = ligne.split(';');
		if (!date || !etape || !/^\d+$/.test(secondes ?? '') || Number.isNaN(Date.parse(date)))
			continue;
		lues.push({ phase: `prod:${etape}`, secondes: Number(secondes), date });
	}
	return lues;
}

/**
 * Les mesures « du jour » d'une phase. CI et PR : les dernières 24 heures. Mise
 * en prod (rare) : les 5 dernières, et seulement si la plus récente a moins de
 * 24 heures, pour ne pas répéter la même alerte chaque nuit.
 */
function duJour(phase: string, mesures: Mesure[], maintenant: Date): Mesure[] {
	const limite = new Date(maintenant.getTime() - JOUR_MS).toISOString();
	if (!phase.startsWith('prod:')) return mesures.filter((m) => m.date >= limite);
	const dernieres = [...mesures].sort((a, b) => a.date.localeCompare(b.date)).slice(-MESURES_MIN);
	return dernieres.length > 0 && dernieres[dernieres.length - 1].date >= limite ? dernieres : [];
}

function rang(phase: string): string {
	// CI entière et PR en tête, puis les jobs (leurs étapes juste dessous), puis la mise en prod.
	if (phase === 'ci') return '0';
	if (phase === 'pr') return '1';
	if (phase.startsWith('job:')) return `2${phase.slice(4)}`;
	if (phase.startsWith('etape:')) return `2${phase.slice(6).split(' / ')[0]} /`;
	return `3${phase}`;
}

/** Une ligne par phase de la référence ou mesurée, la journée et les 7 jours face à la référence. */
export function comparer(mesures: Mesure[], reference: Reference, maintenant: Date): Ligne[] {
	const lisibles = mesures.filter((m) => m.date >= reference.depuis);
	const semaineDepuis = new Date(maintenant.getTime() - 7 * JOUR_MS).toISOString();
	const phases = new Set([...Object.keys(reference.phases), ...lisibles.map((m) => m.phase)]);
	const lignes = [...phases]
		.sort((a, b) => rang(a).localeCompare(rang(b)))
		.map((phase): Ligne => {
			const siennes = lisibles.filter((m) => m.phase === phase);
			const jour = duJour(phase, siennes, maintenant).map((m) => m.secondes);
			const semaine = siennes.filter((m) => m.date >= semaineDepuis).map((m) => m.secondes);
			const ref = reference.phases[phase] ?? null;
			const medianeJour = mediane(jour);
			let verdict: Verdict = 'normal';
			if (ref === null) verdict = 'sans-reference';
			else if (jour.length < MESURES_MIN || medianeJour === null) verdict = 'trop-peu';
			else if (medianeJour >= SEUIL * ref) verdict = 'lent';
			return {
				phase,
				reference: ref,
				jour: medianeJour,
				nJour: jour.length,
				semaine: mediane(semaine),
				nSemaine: semaine.length,
				verdict
			};
		});
	// Trop courte pour entrer un jour dans la référence (« CI Summary », 4 s) : pas montrée.
	return lignes.filter(
		(l) => l.reference !== null || (l.semaine ?? l.jour ?? PLANCHER_S) >= PLANCHER_S
	);
}

/** Le message de l'alerte, ou `null` quand aucune phase n'est lente. Ni chemin ni nom de projet. */
export function messageAlerte(lignes: Ligne[]): string | null {
	const lentes = lignes.filter(
		(l) => l.verdict === 'lent' && l.jour !== null && l.reference !== null
	);
	if (lentes.length === 0) return null;
	const morceaux = lentes.map(
		(l) =>
			`${libelle(l.phase).trim()} ${formaterDuree(l.jour ?? 0)} de médiane sur ${l.nJour} mesures, référence ${formaterDuree(l.reference ?? 0)}`
	);
	return `Durées : ${morceaux.join(' ; ')}.`;
}

function cellule(valeur: number | null, n: number): string {
	return valeur === null ? '—' : `${formaterDuree(valeur)} (${n})`;
}

/** Le tableau de `pnpm durees` : entre parenthèses, le nombre de mesures. */
export function tableau(lignes: Ligne[]): string {
	const entete = ['Phase', 'Référence', '24 h', '7 jours', ''];
	const corps = lignes.map((l) => [
		libelle(l.phase),
		l.reference === null ? '—' : formaterDuree(l.reference),
		cellule(l.jour, l.nJour),
		cellule(l.semaine, l.nSemaine),
		l.verdict === 'lent' ? '⚠️  LENT' : l.verdict === 'sans-reference' ? 'pas de référence' : ''
	]);
	const largeurs = entete.map((_, i) => Math.max(...[entete, ...corps].map((r) => r[i].length)));
	return [entete, ...corps]
		.map((r) =>
			r
				.map((c, i) => c.padEnd(largeurs[i]))
				.join('  ')
				.trimEnd()
		)
		.join('\n');
}

/**
 * La référence refaite sur les mesures prises depuis `depuis` : médiane de chaque
 * phase qui a au moins 5 mesures (et dure au moins 20 s). Les autres gardent
 * leur valeur ; `gardees` les nomme.
 */
export function nouvelleReference(
	ancienne: Reference,
	mesures: Mesure[],
	depuis: string
): { reference: Reference; gardees: string[] } {
	const lisibles = mesures.filter((m) => m.date >= depuis);
	const phases: Record<string, number> = { ...ancienne.phases };
	const gardees: string[] = [];
	for (const phase of new Set([...Object.keys(ancienne.phases), ...lisibles.map((m) => m.phase)])) {
		const valeurs = lisibles.filter((m) => m.phase === phase).map((m) => m.secondes);
		const milieu = mediane(valeurs);
		if (valeurs.length >= MESURES_MIN && milieu !== null && milieu >= PLANCHER_S)
			phases[phase] = milieu;
		else if (phase in ancienne.phases) gardees.push(phase);
	}
	return { reference: { depuis, phases }, gardees };
}
