/**
 * Base locale remplie, chantier `seed-complet` (PR 2) — suivi et travail scolaire inventés
 * =======================================================================================
 *
 * `planSuivi` fabrique, pour les élèves fictifs, de quoi remplir les pages de suivi : évaluations
 * passées, entraînement, révisions, Python, devinettes, fiches, exercices, compétences. Gardé ici,
 * sans base ni moteur de questions (doublures) :
 * - le plan est reproductible (même graine → même base) ;
 * - chaque ligne respecte les contraintes de la base (celles qui feraient échouer l'insertion) ;
 * - les nombres racontent la même histoire d'une table à l'autre (note = points, fiche de
 *   mémorisation = traces, séance = révisions du jour) ;
 * - les cas utiles au test sont toujours là : l'élève qui réussit tout, l'élève absent, l'élève
 *   hors classe, l'évaluation commencée, la devinette qui attend le prof ;
 * - rien n'est inventé hors des élèves fictifs et du prof local.
 */

import { describe, it, expect } from 'vitest';
import { INVENTE } from '../db-seed-riche/regles';
import {
	ECRITURE_SUIVI,
	planSuivi,
	PREFIXE_SUIVI,
	type ContexteSuivi,
	type QuestionTiree,
	type Verdict
} from '../db-seed-riche/suivi';

const PROF = '11111111-1111-4111-8111-111111111111';
const eleve = (n: number) => `5eed0000-0000-4000-8000-0000000000${String(n).padStart(2, '0')}`;
const HORS_CLASSE = eleve(31);
const ETOILE = eleve(1);
const ABSENT = eleve(3);

/** Doublure du tirage : 4 questions, la réponse attendue est la graine modulo 7. */
function tirer(graine: number): QuestionTiree[] {
	return ['m-eval-1', 'm-eval-2', 'm-eval-3', 'm-eval-4'].map((template_id, i) => ({
		template_id,
		seed: graine + i,
		delay_seconds: 20,
		instance: {
			templateId: template_id,
			statement: 'Calcule.',
			blanks: [{ expectedAnswer: `${i + 2}` }]
		},
		attendues: [`${i + 2}`]
	}));
}

/** Doublure de la correction : juste si la valeur est celle de la question. */
function corriger(instance: Record<string, unknown>, valeurs: string[] | null): Verdict {
	if (valeurs === null) return { status: 'empty', points: 0, isCorrect: false, partial: false };
	const attendue = (instance.blanks as { expectedAnswer: string }[])[0].expectedAnswer;
	return valeurs[0] === attendue
		? { status: 'correct', points: 1, isCorrect: true, partial: false }
		: { status: 'incorrect', points: 0, isCorrect: false, partial: false, feedback: 'Faux' };
}

function contexte(): ContexteSuivi {
	return {
		prof: PROF,
		classes: ['classe-a', 'classe-b', 'classe-c'].map((id, i) => ({
			id,
			eleves: [1, 2, 3].map((k) => eleve(i * 3 + k)),
			// La troisième classe n'a aucun modèle à son niveau.
			modeles: i === 2 ? [] : [1, 2, 3, 4, 5, 6, 7, 8].map((k) => `m-${id}-${k}`)
		})),
		horsClasse: HORS_CLASSE,
		maintenant: new Date('2026-11-22T10:00:00Z'),
		graine: 42,
		evaluation: {
			id: 'eval-1',
			items: [{ templateId: 'm-eval-1', quantity: 1, delay: 20 }],
			// Reçue par la première classe il y a deux jours.
			assigneeLe: '2026-11-20T10:00:00.000Z'
		},
		tirer,
		corriger,
		// Un modèle sur quatre ne se génère pas : la trace devient une carte retournée.
		attendues: (modele, graine) => (modele.endsWith('4') ? null : [`${graine % 7}`]),
		assignations: [
			{ id: 'assignation-1', classe: 'classe-a', exercicesDeFiche: ['we-1', 'we-2', 'we-3'] },
			{ id: 'assignation-2', classe: 'classe-b', exercicesDeFiche: ['we-4'] }
		],
		exercices: ['ex-1', 'ex-2', 'ex-3', 'ex-4'],
		python: {
			exercices: ['py-1', 'py-2', 'py-3', 'py-4', 'py-5'],
			fichier: 'fichier-1',
			carnets: [
				{ id: 'carnet-vide', controles: [] },
				{ id: 'carnet-demo', controles: ['cellule-1', 'cellule-2', 'cellule-3'] }
			]
		},
		devinette: { id: 'devinette-1', difficulte: 2 },
		observables: ['chercher', 'calculer'].flatMap((competence) =>
			[1, 2, 3, 4, 5].map((k) => ({
				id: `obs-${competence}-${k}`,
				code: `${competence[1].toUpperCase()}${k}`,
				competence
			}))
		)
	};
}

const tousLesEleves = (c: ContexteSuivi) => c.classes.flatMap((k) => k.eleves);
const MAINTENANT = Date.parse('2026-11-22T10:00:00Z');

describe('planSuivi — reproductible, et seulement pour les fictifs', () => {
	it('même graine → même plan', () => {
		expect(planSuivi(contexte())).toEqual(planSuivi(contexte()));
	});

	it('tout identifiant inventé commence par le préfixe du seed, sans doublon', () => {
		const p = planSuivi(contexte());
		const ids = Object.values(p).flatMap((lignes) =>
			(lignes as Record<string, unknown>[]).flatMap((l) => (typeof l.id === 'string' ? [l.id] : []))
		);
		expect(ids.length).toBeGreaterThan(100);
		for (const id of ids) {
			expect(id).toMatch(
				new RegExp(`^${PREFIXE_SUIVI}-[0-9a-f]{4}-4[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$`)
			);
		}
		expect(new Set(ids).size).toBe(ids.length);
	});

	it('aucune ligne ne désigne un élève qui n’est pas fictif', () => {
		const c = contexte();
		const connus = new Set([...tousLesEleves(c), HORS_CLASSE, PROF]);
		const p = planSuivi(c);
		for (const lignes of Object.values(p)) {
			for (const l of lignes as Record<string, unknown>[]) {
				for (const col of [
					'student_id',
					'user_id',
					'owner_id',
					'assigned_to',
					'assigned_by',
					'shared_by',
					'reviewed_by',
					'validated_by'
				]) {
					if (l[col] !== undefined && l[col] !== null) expect(connus).toContain(l[col]);
				}
			}
		}
	});

	it('l’absent n’a aucune activité, et sa dernière visite date de plus de trois semaines', () => {
		const p = planSuivi(contexte());
		const { visites, ...reste } = p;
		for (const lignes of Object.values(reste)) {
			for (const l of lignes as Record<string, unknown>[]) {
				expect([l.student_id, l.user_id, l.owner_id, l.assigned_to]).not.toContain(ABSENT);
			}
		}
		const visite = visites.find((v) => v.student_id === ABSENT);
		expect(visite?.last_visit_date).toBe('2026-10-28');
		expect(visites.find((v) => v.student_id === ETOILE)?.last_visit_date).toBe('2026-11-22');
	});

	it('l’élève hors classe ne reçoit qu’une fiche à son nom', () => {
		const p = planSuivi(contexte());
		const { fichesEleves, ...reste } = p;
		expect(fichesEleves.map((f) => f.student_id)).toContain(HORS_CLASSE);
		for (const lignes of Object.values(reste)) {
			for (const l of lignes as Record<string, unknown>[]) {
				expect([l.student_id, l.user_id, l.owner_id, l.assigned_to]).not.toContain(HORS_CLASSE);
			}
		}
	});

	it('aucune date n’est dans le futur, sauf les échéances', () => {
		const p = planSuivi(contexte());
		for (const [nom, lignes] of Object.entries(p)) {
			for (const l of lignes as Record<string, unknown>[]) {
				for (const [col, v] of Object.entries(l)) {
					if (['due_date', 'optional_deadline', 'next_review'].includes(col)) continue;
					if (typeof v === 'string' && /^\d{4}-\d\d-\d\dT/.test(v)) {
						expect(Date.parse(v), `${nom}.${col}`).toBeLessThanOrEqual(MAINTENANT);
					}
				}
			}
		}
	});
});

describe('planSuivi — évaluations passées', () => {
	it('une copie rendue : note = points sur 20 au demi-point, une réponse par question tirée', () => {
		const p = planSuivi(contexte());
		const rendues = p.seances.filter((s) => s.completed_at !== null);
		expect(rendues.length).toBeGreaterThanOrEqual(3);
		for (const s of rendues) {
			const reponses = p.reponses.filter((x) => x.test_session_id === s.id);
			const questions = p.questionsTirees.filter((x) => x.test_session_id === s.id);
			expect(questions.map((q) => q.position)).toEqual([0, 1, 2, 3]);
			expect(reponses).toHaveLength(s.total_questions as number);
			const points = reponses.reduce((n, x) => n + (x.points as number), 0);
			expect(s.points_earned).toBe(points);
			expect(s.grade).toBe((points / 4) * 20);
			expect(((s.grade as number) * 2) % 1).toBe(0);
			expect(s.score).toBe((s.grade as number) / 2);
			expect(s.mode).toBe('interactive');
			expect(Date.parse(s.completed_at as string)).toBeGreaterThan(
				Date.parse(s.created_at as string)
			);
		}
	});

	it('chaque réponse porte sa position, et son statut vient de la correction', () => {
		const p = planSuivi(contexte());
		const statuts = new Set<unknown>();
		for (const x of p.reponses) {
			const instance = x.question_instance as Record<string, unknown>;
			expect(typeof instance.attemptPosition).toBe('number');
			expect(instance).not.toHaveProperty('seed');
			statuts.add(x.status);
			expect(x.is_correct).toBe(x.points === 1);
			if (x.status === 'empty') expect(x.user_answer).toBeNull();
			else expect((x.user_answer as { value: string[] }).value).toHaveLength(1);
		}
		expect([...statuts].sort()).toEqual(['correct', 'empty', 'incorrect']);
	});

	it('l’étoile a 20, un élève a une copie commencée et non rendue, un autre deux tentatives', () => {
		const p = planSuivi(contexte());
		expect(p.seances.filter((s) => s.user_id === ETOILE).map((s) => s.grade)).toEqual([20]);
		const ouvertes = p.seances.filter((s) => s.completed_at === null);
		expect(ouvertes).toHaveLength(1);
		expect(ouvertes[0].grade).toBeNull();
		expect(p.reponses.filter((x) => x.test_session_id === ouvertes[0].id)).toHaveLength(0);
		expect(p.questionsTirees.filter((x) => x.test_session_id === ouvertes[0].id)).toHaveLength(4);
		expect(p.seances.filter((s) => s.user_id === eleve(2))).toHaveLength(2);
	});

	it('l’évaluation est aussi assignée à la deuxième classe', () => {
		const p = planSuivi(contexte());
		expect(p.evaluationsAssignees).toMatchObject([
			{ evaluation_id: 'eval-1', class_id: 'classe-b', assigned_by: PROF }
		]);
	});

	it('sans évaluation copiée : aucune séance, le reste est inventé quand même', () => {
		const p = planSuivi({ ...contexte(), evaluation: null });
		expect(p.seances).toHaveLength(0);
		expect(p.reponses).toHaveLength(0);
		expect(p.traces.length).toBeGreaterThan(0);
	});
});

describe('planSuivi — traces d’entraînement (contraintes de `skill_attempts`)', () => {
	it('chaque trace respecte les contraintes de son lieu', () => {
		const p = planSuivi(contexte());
		const lieux = new Set<string>();
		for (const t of p.traces) {
			lieux.add(t.place);
			expect(t.grade).toBe(t.success ? 3 : 1);
			// Durées et fin : ensemble, et seulement chronométré ou en évaluation.
			const chrono = t.place === 'mock_test' || t.place === 'evaluation';
			expect(t.response_ms !== null).toBe(chrono);
			expect(t.allotted_ms !== null).toBe(chrono);
			expect(t.end_reason !== null).toBe(chrono);
			// Réponses saisies : ensemble, même longueur, seulement là où l'élève tape.
			const saisie = t.place === 'typing' || t.place === 'mock_test';
			expect(t.answer_parts !== null).toBe(saisie);
			expect(t.part_verdicts?.length ?? null).toBe(t.answer_parts?.length ?? null);
			if (t.answer_parts) expect(t.answer_parts.length).toBeGreaterThan(0);
			expect(t.source).toBe(saisie || t.place === 'evaluation' ? 'auto' : 'student_self');
			if (t.seed !== null) expect(t.seed).toBeGreaterThanOrEqual(0);
		}
		expect([...lieux].sort()).toEqual([
			'evaluation',
			'flash_cards',
			'mock_test',
			'review',
			'typing'
		]);
	});

	it('un modèle qui ne se génère pas ne donne jamais de réponse saisie', () => {
		const p = planSuivi(contexte());
		const sansQuestion = p.traces.filter(
			(t) => t.template_id.endsWith('-4') && t.place !== 'evaluation'
		);
		expect(sansQuestion.length).toBeGreaterThan(0);
		for (const t of sansQuestion) expect(['flash_cards', 'review']).toContain(t.place);
	});

	it('chaque élève actif a au moins 5 jours avec 5 traces (seuil d’un jour actif)', () => {
		const c = contexte();
		const p = planSuivi(c);
		for (const e of [...c.classes[0].eleves, ...c.classes[1].eleves].filter((x) => x !== ABSENT)) {
			const parJour = new Map<string, number>();
			for (const t of p.traces.filter((x) => x.student_id === e && x.place !== 'evaluation')) {
				const jour = t.created_at.slice(0, 10);
				parJour.set(jour, (parJour.get(jour) ?? 0) + 1);
			}
			expect([...parJour.values()].filter((n) => n >= 5).length).toBeGreaterThanOrEqual(4);
		}
	});

	it('une classe sans modèle à son niveau n’a pas d’entraînement ; l’étoile réussit tout', () => {
		const c = contexte();
		const p = planSuivi(c);
		expect(p.traces.filter((t) => c.classes[2].eleves.includes(t.student_id))).toHaveLength(0);
		expect(p.traces.filter((t) => t.student_id === ETOILE).every((t) => t.success)).toBe(true);
	});
});

describe('planSuivi — révisions', () => {
	it('une fiche de mémorisation par élève et par carte, d’accord avec ses traces', () => {
		const p = planSuivi(contexte());
		const cles = p.fiches.map(
			(f) => `${f.user_id}|${f.card_reference_type}|${f.card_reference_id}`
		);
		expect(new Set(cles).size).toBe(cles.length);
		for (const f of p.fiches) {
			const historique = f.review_history as { date: string; grade: number }[];
			expect(f.total_reviews).toBe(historique.length);
			expect(f.difficulty).toBeGreaterThanOrEqual(1);
			expect(f.difficulty).toBeLessThanOrEqual(10);
			expect(f.stability).toBeGreaterThanOrEqual(0);
			expect(['new', 'learning', 'review', 'relearning']).toContain(f.state);
			if (f.state === 'new') {
				expect(historique).toEqual([]);
				continue;
			}
			const traces = p.traces.filter(
				(t) => t.student_id === f.user_id && t.template_id === f.card_reference_id
			);
			expect(historique.map((h) => h.date)).toEqual(traces.map((t) => t.created_at));
			expect(f.state === 'relearning').toBe(!traces[traces.length - 1].success);
		}
		// De quoi tester les deux écrans : des cartes à réviser maintenant, d'autres plus tard.
		const dues = p.fiches.filter((f) => Date.parse(f.next_review as string) <= MAINTENANT);
		expect(dues.length).toBeGreaterThan(0);
		expect(dues.length).toBeLessThan(p.fiches.length);
	});

	it('un seul paquet « Programme » par élève, avec ses modèles du programme travaillés', () => {
		const c = contexte();
		const p = planSuivi(c);
		const programmes = p.paquets.filter((d) => d.is_auto_managed);
		expect(new Set(programmes.map((d) => d.owner_id)).size).toBe(programmes.length);
		expect(programmes.map((d) => d.owner_id)).toContain(ETOILE);
		for (const d of programmes) {
			const cartes = p.cartes.filter((k) => k.deck_id === d.id);
			expect(cartes.length).toBeGreaterThan(0);
			const modeles = cartes.map((k) => k.template_id);
			expect(new Set(modeles).size).toBe(modeles.length);
			for (const k of cartes) {
				expect(k.card_type).toBe('template');
				// Les modèles de l'évaluation ne sont pas au programme de la classe : pas de carte.
				expect(k.template_id).not.toMatch(/^m-eval/);
			}
		}
	});

	it('les paquets du prof sont copiés chez chaque élève assigné, cartes et sections comprises', () => {
		const p = planSuivi(contexte());
		const sources = p.paquets.filter((d) => d.owner_id === PROF);
		expect(sources.map((d) => d.deck_type).sort()).toEqual(['official', 'personal']);
		for (const s of sources) {
			expect(s.is_assigned).toBe(false);
			expect(s.source_deck_id).toBeNull();
		}
		const copies = p.paquets.filter((d) => d.source_deck_id !== null);
		expect(copies).toHaveLength(p.paquetsAssignes.length);
		for (const copie of copies) {
			expect(copie.is_assigned).toBe(true);
			const source = sources.find((s) => s.id === copie.source_deck_id);
			expect(copie.name).toBe(source?.name);
			const nb = (deck: unknown) => p.cartes.filter((k) => k.deck_id === deck).length;
			expect(nb(copie.id)).toBe(nb(source?.id));
			expect(p.sections.filter((x) => x.deck_id === copie.id).map((x) => x.name)).toEqual(
				p.sections.filter((x) => x.deck_id === source?.id).map((x) => x.name)
			);
			expect(p.paquetsAssignes).toContainEqual(
				expect.objectContaining({
					source_deck_id: source?.id,
					assigned_to: copie.owner_id,
					assignment_type: 'student'
				})
			);
		}
	});

	it('cartes : un modèle OU un recto et un verso ; la section est celle du même paquet', () => {
		const p = planSuivi(contexte());
		for (const k of p.cartes) {
			if (k.card_type === 'template') expect(k.template_id).not.toBeNull();
			else {
				expect(k.front_content).toBeTruthy();
				expect(k.back_content).toBeTruthy();
			}
			if (k.section_id !== null) {
				expect(p.sections.find((x) => x.id === k.section_id)?.deck_id).toBe(k.deck_id);
			}
		}
		for (const x of p.sections) expect((x.name as string).length).toBeLessThanOrEqual(50);
	});

	it('une séance par jour de révision : jamais plus de réussites que de cartes', () => {
		const p = planSuivi(contexte());
		expect(p.seancesRevision.length).toBeGreaterThan(0);
		for (const s of p.seancesRevision) {
			const duJour = p.traces.filter(
				(t) =>
					t.student_id === s.user_id &&
					t.place === 'review' &&
					t.created_at.slice(0, 10) === (s.started_at as string).slice(0, 10)
			);
			expect(s.cards_reviewed).toBe(duJour.length);
			expect(s.correct_count).toBe(duJour.filter((t) => t.success).length);
			expect(p.paquets.find((d) => d.id === s.deck_id)?.owner_id).toBe(s.user_id);
		}
	});
});

describe('planSuivi — Python', () => {
	it('une assignation vise une classe OU un élève, jamais deux fois la même cible', () => {
		const p = planSuivi(contexte());
		expect(p.pythonAssignes.length).toBeGreaterThanOrEqual(4);
		const cles = p.pythonAssignes.map((a) => `${a.exercise_id}|${a.class_id}|${a.student_id}`);
		expect(new Set(cles).size).toBe(cles.length);
		for (const a of p.pythonAssignes) {
			expect((a.class_id === null) !== (a.student_id === null)).toBe(true);
			expect(a.assigned_by).toBe(PROF);
		}
	});

	it('soumissions : numérotées dans l’ordre du temps, espacées, sous le maximum d’essais', () => {
		const p = planSuivi(contexte());
		expect(p.pythonSoumissions.some((s) => s.is_correct)).toBe(true);
		expect(p.pythonSoumissions.some((s) => !s.is_correct)).toBe(true);
		const parCouple = new Map<string, typeof p.pythonSoumissions>();
		for (const s of p.pythonSoumissions) {
			const cle = `${s.student_id}|${s.exercise_id}`;
			parCouple.set(cle, [...(parCouple.get(cle) ?? []), s]);
			expect((s.validation_result as { valid: boolean }).valid).toBe(s.is_correct);
			expect(Date.parse(s.created_at as string)).toBeLessThan(MAINTENANT - 60_000);
		}
		for (const suite of parCouple.values()) {
			expect(suite.map((s) => s.attempt_number)).toEqual(suite.map((_, i) => i + 1));
			const dates = suite.map((s) => Date.parse(s.created_at as string));
			expect([...dates].sort((a, b) => a - b)).toEqual(dates);
			expect(suite.length).toBeLessThanOrEqual(5);
		}
	});

	it('le carnet partagé est celui qui a des points de contrôle ; un échec a son message', () => {
		const p = planSuivi(contexte());
		expect(new Set(p.pythonCarnets.map((k) => k.notebook_id))).toEqual(new Set(['carnet-demo']));
		expect(p.pythonFichiers).toMatchObject([{ file_id: 'fichier-1', class_id: 'classe-a' }]);
		const cles = p.pythonControles.map((k) => `${k.user_id}|${k.cell_id}`);
		expect(new Set(cles).size).toBe(cles.length);
		for (const k of p.pythonControles) {
			expect(['cellule-1', 'cellule-2', 'cellule-3']).toContain(k.cell_id);
			expect(k.error_message === null).toBe(k.status === 'passed');
			expect(k.succeeded_at === null).toBe(k.status === 'failed');
			expect(k.attempt_count).toBeGreaterThanOrEqual(1);
		}
		expect(p.pythonControles.filter((k) => k.user_id === ETOILE).map((k) => k.status)).toEqual([
			'passed',
			'passed',
			'passed'
		]);
	});
});

describe('planSuivi — devinettes', () => {
	it('une réponse validée, une refusée, et des réponses qui attendent le prof', () => {
		const p = planSuivi(contexte());
		const cles = p.devinettesTentatives.map((t) => `${t.student_id}|${t.attempt_number}`);
		expect(new Set(cles).size).toBe(cles.length);
		expect(p.devinettesTentatives.map((t) => t.is_correct).sort()).toEqual(
			[false, true, null, null].sort()
		);
		for (const t of p.devinettesTentatives) {
			expect(t.submitted_answer.value).toBeTruthy();
			expect(t.validated_by === null).toBe(t.is_correct === null);
			expect(t.validated_at === null).toBe(t.is_correct === null);
			// Difficulté 2, premier essai : 2 × 3.
			expect(t.gidouilles_awarded).toBe(t.is_correct ? 6 : 0);
		}
		for (const a of p.devinettesAssignees) expect(a.student_id).toBeNull();
	});

	it('sans devinette copiée : rien', () => {
		const p = planSuivi({ ...contexte(), devinette: null });
		expect(p.devinettesAssignees).toHaveLength(0);
		expect(p.devinettesTentatives).toHaveLength(0);
	});
});

describe('planSuivi — fiches et exercices', () => {
	it('signalements : un en attente, un corrigé, un refusé avec sa réponse', () => {
		const p = planSuivi(contexte());
		expect(p.signalements.map((s) => s.status)).toEqual(['pending', 'fixed', 'rejected']);
		for (const s of p.signalements) {
			expect(s.assignment_id).toBe('assignation-1');
			expect(['we-1', 'we-2', 'we-3']).toContain(s.worksheet_exercise_id);
			expect([ETOILE, eleve(2)]).toContain(s.student_id);
			expect((s.description as string).length).toBeGreaterThanOrEqual(10);
			expect(s.reviewed_by === null).toBe(s.status === 'pending');
			if (s.status === 'rejected') expect(s.response).toBeTruthy();
		}
	});

	it('une fiche atteint un élève d’une autre classe par son nom ; corrigé réglé par exercice', () => {
		const p = planSuivi(contexte());
		expect(p.fichesEleves.map((f) => f.student_id).sort()).toEqual([eleve(4), HORS_CLASSE].sort());
		expect(p.reglagesCorrige).toMatchObject([
			{ assignment_id: 'assignation-1', worksheet_exercise_id: 'we-1', show_correction: false },
			{ assignment_id: 'assignation-1', worksheet_exercise_id: 'we-2', show_correction: true }
		]);
		expect(p.impression.map((i) => i.text_size)).toEqual(['large', 'x_large']);
	});

	it('exercices hors fiche : classe, élève et « pour tous », cible cohérente avec le type', () => {
		const p = planSuivi(contexte());
		expect(p.exercicesAssignes.map((a) => a.assigned_to_type)).toEqual([
			'class',
			'class',
			'student',
			'public'
		]);
		for (const a of p.exercicesAssignes) {
			expect(a.class_id !== null).toBe(a.assigned_to_type === 'class');
			expect(a.student_id !== null).toBe(a.assigned_to_type === 'student');
		}
		const cles = p.exercicesVus.map((v) => `${v.exercise_id}|${v.student_id}`);
		expect(new Set(cles).size).toBe(cles.length);
		expect(p.exercicesVus.some((v) => v.completed_at === null)).toBe(true);
		expect(p.exercicesVus.some((v) => v.completed_at !== null)).toBe(true);
		for (const v of p.exercicesVus) expect(v.view_count).toBeGreaterThanOrEqual(1);
	});

	it('sans fiche assignée : ni élève nommé, ni signalement', () => {
		const p = planSuivi({ ...contexte(), assignations: [] });
		expect(p.fichesEleves).toHaveLength(0);
		expect(p.signalements).toHaveLength(0);
		expect(p.reglagesCorrige).toHaveLength(0);
	});
});

describe('planSuivi — compétences', () => {
	it('un niveau par élève et par compétence, d’accord avec ses observables', () => {
		const p = planSuivi(contexte());
		const cles = p.competences.map((k) => `${k.student_id}|${k.math_competence_id}`);
		expect(new Set(cles).size).toBe(cles.length);
		for (const k of p.competences) {
			expect(['insuffisante', 'fragile', 'satisfaisante', 'tres_bonne']).toContain(k.niveau);
			const valides = k.validated_observables as string[];
			const acquis = p.observablesEtats.filter(
				(o) =>
					o.student_id === k.student_id &&
					(o.observable_id as string).startsWith(`obs-${k.math_competence_id}-`) &&
					o.is_acquis
			);
			expect(acquis).toHaveLength(valides.length);
			if (k.niveau === 'tres_bonne') expect(k.missing_for_next).toEqual([]);
		}
		for (const o of p.observablesEtats) {
			expect(o.is_acquis).toBe(
				(o.count_plus as number) >= 2 && (o.count_plus as number) > (o.count_minus as number)
			);
		}
	});

	it('l’étoile a « très bonne » partout ; un élève n’est pas encore assez observé', () => {
		const p = planSuivi(contexte());
		expect(p.competences.filter((k) => k.student_id === ETOILE).map((k) => k.niveau)).toEqual([
			'tres_bonne',
			'tres_bonne'
		]);
		const peu = p.competences.filter((k) => k.task_count === 1);
		expect(peu.length).toBe(2);
		for (const k of peu) {
			expect(k.niveau).toBe('insuffisante');
			expect(k.validated_observables).toEqual([]);
			expect(k.missing_for_next).toEqual([{ kind: 'guard', name: 'needs_more_tasks' }]);
		}
	});
});

describe('planSuivi — base presque vide', () => {
	it('sans classe : rien n’est inventé, rien ne plante', () => {
		const p = planSuivi({ ...contexte(), classes: [], assignations: [] });
		for (const [nom, lignes] of Object.entries(p)) expect(lignes, nom).toHaveLength(0);
	});

	it('sans contenu Python ni exercice : ces parties restent vides', () => {
		const p = planSuivi({
			...contexte(),
			exercices: [],
			python: { exercices: [], fichier: null, carnets: [] }
		});
		expect(p.pythonAssignes).toHaveLength(0);
		expect(p.pythonCarnets).toHaveLength(0);
		expect(p.exercicesAssignes).toHaveLength(0);
	});
});

describe('ECRITURE_SUIVI — où va le plan', () => {
	it('chaque partie du plan a sa table, une seule fois, et c’est une table à inventer', () => {
		const parties = ECRITURE_SUIVI.map((e) => e.partie);
		expect([...parties].sort()).toEqual(Object.keys(planSuivi(contexte())).sort());
		for (const { table } of ECRITURE_SUIVI) expect(INVENTE, table).toContain(table);
	});

	it('une table est écrite après celles qu’elle désigne', () => {
		const rang = (table: string) => ECRITURE_SUIVI.findIndex((e) => e.table === table);
		const avant: [string, string][] = [
			['test_sessions', 'test_answers'],
			['test_sessions', 'evaluation_attempt_questions'],
			['srs_decks', 'srs_deck_sections'],
			['srs_deck_sections', 'srs_cards'],
			['srs_decks', 'srs_deck_assignments'],
			['srs_decks', 'srs_review_sessions'],
			['python_exercise_assignments', 'python_exercise_submissions'],
			['exercise_assignments', 'exercise_completions']
		];
		for (const [parent, enfant] of avant) expect(rang(parent), enfant).toBeLessThan(rang(enfant));
	});
});

describe('planSuivi — après relecture', () => {
	it('aucune partie du plan ne met deux fois la même clé unique', () => {
		const p = planSuivi(contexte());
		for (const { partie, unique } of ECRITURE_SUIVI) {
			if (!unique) continue;
			const cles = (p[partie] as Record<string, unknown>[]).map((l) =>
				unique.map((col) => String(l[col])).join('|')
			);
			expect(new Set(cles).size, partie).toBe(cles.length);
		}
	});

	it('une copie n’est jamais commencée avant que sa classe ait reçu l’évaluation', () => {
		const c = contexte();
		const p = planSuivi(c);
		const recueLe = new Map<string, number>([
			['classe-a', Date.parse('2026-11-20T10:00:00.000Z')],
			['classe-b', Date.parse(p.evaluationsAssignees[0].assigned_at as string)]
		]);
		expect(p.seances.length).toBeGreaterThan(3);
		for (const s of p.seances) {
			const classe = c.classes.find((k) => k.eleves.includes(s.user_id as string));
			expect(Date.parse(s.created_at as string)).toBeGreaterThanOrEqual(
				recueLe.get(classe?.id ?? '') as number
			);
		}
	});

	it('longue évaluation : une copie rendue l’est toujours dans le passé, dans le délai de chaque question', () => {
		const longue = (graine: number) =>
			Array.from({ length: 30 }, (_, i) => ({
				...tirer(graine)[i % 4],
				delay_seconds: i % 2 ? 600 : 2
			}));
		const p = planSuivi({ ...contexte(), tirer: longue });
		for (const s of p.seances.filter((x) => x.completed_at !== null)) {
			expect(Date.parse(s.completed_at as string)).toBeLessThanOrEqual(MAINTENANT);
		}
		for (const t of p.traces.filter((x) => x.place === 'evaluation')) {
			expect(t.response_ms as number).toBeLessThanOrEqual(t.allotted_ms as number);
		}
	});

	it('demi-point : une réponse « presque juste » compte 0,5 et la note reste un multiple de 0,5', () => {
		const presque = (instance: Record<string, unknown>, valeurs: string[] | null): Verdict => {
			const v = corriger(instance, valeurs);
			return v.status === 'correct' && instance.templateId === 'm-eval-2'
				? { status: 'unoptimal_form', points: 0.5, isCorrect: false, partial: false }
				: v;
		};
		const p = planSuivi({ ...contexte(), corriger: presque });
		const etoile = p.seances.find((s) => s.user_id === ETOILE);
		expect(etoile?.points_earned).toBe(3.5);
		expect(etoile?.grade).toBe(17.5);
		for (const s of p.seances) if (s.grade !== null) expect(((s.grade as number) * 2) % 1).toBe(0);
	});

	it('tirage vide (aucune question utilisable) : aucune séance, rien ne plante', () => {
		const p = planSuivi({ ...contexte(), tirer: () => [] });
		expect(p.seances).toHaveLength(0);
		expect(p.traces.filter((t) => t.place === 'evaluation')).toHaveLength(0);
	});

	it('réponse attendue « 0 » : la réponse fausse inventée est « 1 », jamais « 0 »', () => {
		const p = planSuivi({ ...contexte(), attendues: () => ['0', '5'] });
		const fausses = p.traces.filter((t) => t.answer_parts && !t.success);
		expect(fausses.length).toBeGreaterThan(0);
		for (const t of fausses) {
			expect(t.answer_parts).toEqual(['1', '0']);
			expect(t.part_verdicts).toEqual([false, false]);
		}
	});

	it('classes d’un et de deux élèves : le plan tient, l’absent reste sans activité', () => {
		const c = contexte();
		c.classes[0].eleves = [eleve(1), eleve(2)];
		c.classes[1].eleves = [eleve(4)];
		const p = planSuivi(c);
		expect(p.seances.length).toBeGreaterThan(0);
		for (const [nom, lignes] of Object.entries(p)) {
			if (nom === 'visites') continue;
			for (const l of lignes as Record<string, unknown>[]) {
				expect([l.student_id, l.user_id, l.owner_id, l.assigned_to], nom).not.toContain(eleve(2));
			}
		}
	});

	it('une seule classe d’un seul élève : pas d’absent, l’étoile travaille', () => {
		const c = contexte();
		c.classes = [{ ...c.classes[0], eleves: [eleve(1)] }];
		const p = planSuivi(c);
		expect(p.traces.some((t) => t.student_id === ETOILE)).toBe(true);
		expect(p.evaluationsAssignees).toHaveLength(0);
	});
});
