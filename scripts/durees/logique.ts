/**
 * `pnpm durees` : les règles (pures, testées dans scripts/__tests__/durees.test.ts)
 * ===============================================================================
 *
 * Ce que GitHub dit des exécutions de quality.yml, de nightly-integration.yml
 * et des PR, ce que `pnpm deploy:prod` et les commandes du Mac mini ont noté, et
 * ce que la commande en conclut. Aucun appel à `gh` ni au disque ici : cf. index.ts.
 *
 * Une « phase » se nomme :
 *   - `ci`                      la CI entière d'une PR de code ;
 *   - `pr`                      de l'ouverture au merge, PR à un seul push ;
 *   - `job:<nom du job>`        un job de quality.yml ;
 *   - `etape:<job> / <étape>`   une étape suivie (ETAPES_SUIVIES) ;
 *   - `integration:nuit`        la suite d'intégration entière, la nuit ;
 *   - `integration:pr`          la suite d'intégration entière, sur une PR ;
 *   - `prod:<étape>`            une étape de `pnpm deploy:prod` ;
 *   - `local:<commande>`        une commande du Mac mini (scripts/durees/noter.sh).
 *
 * Une phase « rare » (au plus une mesure par jour : mise en prod, suite de la
 * nuit) ne peut pas réunir 5 mesures en 24 heures : `estRare`.
 */

import { z } from 'zod';

// ============================================================================
// Types
// ============================================================================

/** Une exécution d'un workflow, telle que `gh run list --json` la rend. */
export type Run = {
	databaseId: number;
	/** `pull_request`, `schedule`… Lu pour nightly-integration.yml seulement. */
	event?: string;
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

/** Ce que demandent les options de `pnpm durees`. */
export type Demande =
	| { mode: 'tableau' }
	| { mode: 'releve'; essai: boolean }
	/** `depuis` (ISO 8601) seulement s'il est donné par `--depuis`. */
	| { mode: 'reference'; depuis?: string };

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
/**
 * Sur le Mac mini, pas d'attente d'un runner : `check:incremental` dure 18 s et
 * 27 s y serait un vrai signal. Le plancher y est plus bas.
 */
export const PLANCHER_LOCAL_S = 5;
/** La suite d'intégration entière tourne en 4 morceaux (nightly-integration.yml, job `portee`). */
export const MORCEAUX_SUITE_ENTIERE = 4;
/** Étape du job « Integration scope » jouée seulement quand aucune liste de tests n'est retenue. */
export const ETAPE_SUITE_COMPLETE = 'Tests de migration de données laissés de côté';

/** Les seules étapes suivies à part de leur job. */
export const ETAPES_SUIVIES = new Set([
	'Type Check / Run svelte-check',
	'Lint / Run Prettier check'
]);

const JOUR_MS = 24 * 3600 * 1000;

/** La forme de reference.json : le fichier peut avoir été édité à la main. */
const SCHEMA_REFERENCE = z.object({
	depuis: z.iso.datetime(),
	phases: z.record(z.string().min(1).max(200), z.number().int().min(1).max(86_400))
});

const LIBELLES: Record<string, string> = {
	ci: 'CI entière (PR de code)',
	pr: 'Ouverture → merge (un push)',
	'integration:nuit': 'Tests d’intégration : suite entière, la nuit',
	'integration:pr': 'Tests d’intégration : suite entière, sur une PR',
	'local:check-incremental': 'Mac mini : check:incremental',
	'local:test-server': 'Mac mini : test:server (suite entière)',
	'local:test-client': 'Mac mini : test:client (suite entière)',
	'local:test-integration': 'Mac mini : test:integration (suite entière)',
	'local:pre-push': 'Mac mini : pre-push',
	'local:pr-merger': 'Mac mini : pr:merger (attente de la CI comprise)',
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

/** La référence lue dans le texte de reference.json, ou `null` s'il est mal formé. */
export function lireReference(texte: string): Reference | null {
	let lu: unknown;
	try {
		lu = JSON.parse(texte);
	} catch {
		return null;
	}
	const controle = SCHEMA_REFERENCE.safeParse(lu);
	return controle.success ? controle.data : null;
}

/** Les options de la ligne de commande, ou `null` si elles ne sont pas une forme prévue. */
export function lireArguments(args: string[]): Demande | null {
	if (args.length === 0) return { mode: 'tableau' };
	if (args[0] === '--releve') {
		if (args.length === 1) return { mode: 'releve', essai: false };
		return args.length === 2 && args[1] === '--essai' ? { mode: 'releve', essai: true } : null;
	}
	if (args[0] !== '--reference') return null;
	if (args.length === 1) return { mode: 'reference' };
	if (args.length !== 3 || args[1] !== '--depuis' || !/^\d{4}-\d{2}-\d{2}$/.test(args[2]))
		return null;
	const date = Date.parse(args[2]);
	return Number.isNaN(date) ? null : { mode: 'reference', depuis: new Date(date).toISOString() };
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

/** Vrai pour une phase mesurée au plus une fois par jour : mise en prod, suite de la nuit. */
export function estRare(phase: string): boolean {
	return phase.startsWith('prod:') || phase === 'integration:nuit';
}

/**
 * Phases montrées en simple information : jamais de référence, donc jamais
 * d'alerte. `pr:merger` compte l'attente de la CI, déjà surveillée par « CI
 * entière » et « ouverture → merge » ; `test:integration` du Mac mini compte le
 * démarrage de la pile, et la suite est déjà surveillée en CI.
 */
const SIMPLE_INFORMATION = new Set(['local:pr-merger', 'local:test-integration']);

export function estSimpleInformation(phase: string): boolean {
	return SIMPLE_INFORMATION.has(phase);
}

/** La durée sous laquelle une phase n'entre pas dans la référence. */
function plancher(phase: string): number {
	return phase.startsWith('local:') ? PLANCHER_LOCAL_S : PLANCHER_S;
}

export function libelle(phase: string): string {
	if (LIBELLES[phase]) return LIBELLES[phase];
	if (phase.startsWith('local:')) return `Mac mini : ${phase.slice(6)}`;
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
	// Datée du merge : datée de l'ouverture, une PR ouverte la veille et mergée
	// lentement sortirait des dernières 24 heures, alors que c'est elle qu'on cherche.
	return duree === null ? [] : [{ phase: 'pr', secondes: duree, date: pr.mergedAt }];
}

/**
 * La suite d'intégration (nightly-integration.yml) : une mesure seulement quand
 * elle a tout joué. Sur une PR, le job `portee` ne retient souvent que les tests
 * touchés (un seul morceau), ou aucun (passage déjà vert, aucun test atteint :
 * l'étape des tests est sautée) : ces exécutions ne comptent pas. Une PR à plus
 * de 40 tests touchés tourne aussi en 4 morceaux : la suite complète se reconnaît
 * à l'étape ETAPE_SUITE_COMPLETE du job de portée, sautée dès qu'une liste de
 * tests est retenue. La nuit, tous
 * les tests ; sur une PR, la suite sans les tests de migration de données : deux
 * phases. Une exécution lancée à la main n'est pas comptée.
 */
export function mesuresIntegration(run: Run, jobs: Job[]): Mesure[] {
	if (run.status !== 'completed' || run.conclusion !== 'success' || run.attempt !== 1) return [];
	const phase =
		run.event === 'schedule'
			? 'integration:nuit'
			: run.event === 'pull_request'
				? 'integration:pr'
				: null;
	if (phase === null) return [];
	const morceaux = jobs.filter(
		(j) =>
			j.name.endsWith(`/${MORCEAUX_SUITE_ENTIERE})`) &&
			j.name.startsWith('Integration tests (shard ')
	);
	const joues = morceaux.filter(
		(j) =>
			j.conclusion === 'success' &&
			(j.steps ?? []).some(
				(e) => e.name.startsWith('Run integration tests') && e.conclusion === 'success'
			)
	);
	if (morceaux.length !== MORCEAUX_SUITE_ENTIERE || joues.length !== MORCEAUX_SUITE_ENTIERE)
		return [];
	const complete = jobs.some(
		(j) =>
			j.name === 'Integration scope' &&
			(j.steps ?? []).some(
				(e) => e.name.startsWith(ETAPE_SUITE_COMPLETE) && e.conclusion === 'success'
			)
	);
	if (!complete) return [];
	const duree = secondesEntre(run.createdAt, run.updatedAt);
	return duree === null ? [] : [{ phase, secondes: duree, date: run.createdAt }];
}

/**
 * Le journal du Mac mini (scripts/durees/noter.sh) : `date;commande;secondes`,
 * une ligne par commande verte qui a tout joué.
 */
export function lireJournalLocal(texte: string): Mesure[] {
	const lues: Mesure[] = [];
	for (const ligne of texte.split('\n')) {
		const [date, commande, secondes] = ligne.split(';');
		if (
			!date ||
			!/^[a-z0-9-]+$/.test(commande ?? '') ||
			!/^\d+$/.test(secondes ?? '') ||
			Number.isNaN(Date.parse(date))
		)
			continue;
		lues.push({ phase: `local:${commande}`, secondes: Number(secondes), date });
	}
	return lues;
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
 * Les mesures « du jour » d'une phase. CI, PR, Mac mini : les dernières 24 heures.
 * Phase rare (mise en prod, suite de la nuit) : les 5 dernières, et seulement si
 * la plus récente a moins de 24 heures, pour ne pas répéter la même alerte chaque nuit.
 */
function duJour(phase: string, mesures: Mesure[], maintenant: Date): Mesure[] {
	const limite = new Date(maintenant.getTime() - JOUR_MS).toISOString();
	if (!estRare(phase)) return mesures.filter((m) => m.date >= limite);
	const dernieres = [...mesures].sort((a, b) => a.date.localeCompare(b.date)).slice(-MESURES_MIN);
	return dernieres.length > 0 && dernieres[dernieres.length - 1].date >= limite ? dernieres : [];
}

function rang(phase: string): string {
	// CI entière et PR en tête, puis les jobs (leurs étapes juste dessous), puis les
	// tests d'intégration, la mise en prod, le Mac mini.
	if (phase === 'ci') return '0';
	if (phase === 'pr') return '1';
	if (phase.startsWith('job:')) return `2${phase.slice(4)}`;
	if (phase.startsWith('etape:')) return `2${phase.slice(6).split(' / ')[0]} /`;
	if (phase.startsWith('integration:')) return `3${phase}`;
	if (phase.startsWith('local:')) return `5${phase}`;
	return `4${phase}`;
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
			// Une phase en simple information ignore même une référence écrite à la main.
			const ref = estSimpleInformation(phase) ? null : (reference.phases[phase] ?? null);
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
		(l) => l.reference !== null || (l.semaine ?? l.jour ?? plancher(l.phase)) >= plancher(l.phase)
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

function sansReference(phase: string): string {
	return estSimpleInformation(phase) ? 'simple information' : 'pas de référence';
}

/** Le tableau de `pnpm durees` : entre parenthèses, le nombre de mesures. */
export function tableau(lignes: Ligne[]): string {
	const entete = ['Phase', 'Référence', '24 h', '7 jours', ''];
	const corps = lignes.map((l) => [
		libelle(l.phase),
		l.reference === null ? '—' : formaterDuree(l.reference),
		cellule(l.jour, l.nJour),
		cellule(l.semaine, l.nSemaine),
		l.verdict === 'lent' ? '⚠️  LENT' : l.verdict === 'sans-reference' ? sansReference(l.phase) : ''
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
 * phase qui a au moins 5 mesures (et dure au moins 20 s, 5 s sur le Mac mini).
 * Les autres gardent leur valeur ; `gardees` les nomme. Une phase en simple
 * information n'y entre jamais, et en sort si elle y était. `depuisProd` : la même
 * date pour les phases rares (mise en prod, suite de la nuit), qui ne tiennent
 * pas dans la fenêtre de la CI.
 */
export function nouvelleReference(
	ancienne: Reference,
	mesures: Mesure[],
	depuis: string,
	depuisProd: string = depuis
): { reference: Reference; gardees: string[] } {
	const lisibles = mesures.filter((m) => m.date >= (estRare(m.phase) ? depuisProd : depuis));
	const phases: Record<string, number> = { ...ancienne.phases };
	const gardees: string[] = [];
	for (const phase of new Set([...Object.keys(ancienne.phases), ...lisibles.map((m) => m.phase)])) {
		if (estSimpleInformation(phase)) {
			delete phases[phase];
			continue;
		}
		const valeurs = lisibles.filter((m) => m.phase === phase).map((m) => m.secondes);
		const milieu = mediane(valeurs);
		if (valeurs.length >= MESURES_MIN && milieu !== null && milieu >= plancher(phase))
			phases[phase] = milieu;
		else if (phase in ancienne.phases) gardees.push(phase);
	}
	return { reference: { depuis, phases }, gardees };
}
