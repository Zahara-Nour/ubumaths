/**
 * Base locale remplie, lot 2 — l'activité des élèves fictifs
 * ==========================================================
 *
 * `planActivite` fabrique, à partir du contenu copié et des élèves fictifs, de
 * quoi remplir les tableaux de bord : feuilles assignées et progression,
 * Gidouilles, bonus, avertissements, discussion de classe, amitiés, une
 * évaluation assignée. Gardé ici :
 * - le plan est reproductible (même graine → même base) ;
 * - chaque valeur respecte les contraintes de la base (statuts, types, enums) ;
 * - les cas utiles au test sont toujours présents : un élève qui a tout
 *   maîtrisé, un élève qui n'a rien fait, l'élève hors classe sans activité,
 *   une demande d'amitié en attente ;
 * - rien n'est inventé hors des élèves fictifs et du prof local.
 */

import { describe, it, expect } from 'vitest';
import { planActivite, type Contexte } from '../db-seed-riche/activite';

const PROF = '11111111-1111-4111-8111-111111111111';
const eleve = (n: number) => `5eed0000-0000-4000-8000-0000000000${String(n).padStart(2, '0')}`;

function contexte(): Contexte {
	const classes = ['classe-a', 'classe-b', 'classe-c'];
	return {
		prof: PROF,
		classes: classes.map((id, i) => ({
			id,
			eleves: [1, 2, 3, 4].map((k) => eleve(i * 4 + k))
		})),
		horsClasse: eleve(31),
		feuilles: [
			{ id: 'f1', exercices: ['e1', 'e2', 'e3'] },
			{ id: 'f2', exercices: ['e4', 'e5'] },
			{ id: 'f3', exercices: ['e6'] },
			{ id: 'f4', exercices: [] }
		],
		evaluation: 'eval-1',
		periode: 'periode-1',
		maintenant: new Date('2026-10-10T08:00:00Z'),
		graine: 42
	};
}

const tousLesEleves = (c: Contexte) => c.classes.flatMap((k) => k.eleves);

describe('planActivite — reproductible et valide', () => {
	it('même graine → même plan', () => {
		expect(planActivite(contexte())).toEqual(planActivite(contexte()));
	});

	it('assigne des feuilles qui ont des exercices, à des classes existantes', () => {
		const c = contexte();
		const p = planActivite(c);
		expect(p.assignations.length).toBeGreaterThan(0);
		for (const a of p.assignations) {
			expect(['f1', 'f2', 'f3']).toContain(a.worksheet_id);
			expect(a.status).toBe('active');
			expect(a.correction_release_mode).toBe('immediate');
			expect(a.created_by).toBe(PROF);
		}
		for (const ac of p.assignationsClasses) {
			expect(c.classes.map((k) => k.id)).toContain(ac.class_id);
			expect(p.assignations.map((a) => a.id)).toContain(ac.assignment_id);
		}
	});

	it('la progression ne porte que sur des exercices assignés, avec des statuts autorisés', () => {
		const c = contexte();
		const p = planActivite(c);
		expect(p.maitrise.length).toBeGreaterThan(0);
		for (const m of p.maitrise) {
			expect(['not_worked', 'mastered', 'needs_review']).toContain(m.status);
			expect(tousLesEleves(c)).toContain(m.student_id);
		}
	});

	it('Gidouilles, bonus, avertissements : valeurs autorisées, créés par le prof', () => {
		const p = planActivite(contexte());
		expect(p.gidouilles.length).toBeGreaterThan(0);
		expect(p.bonus.length).toBeGreaterThan(0);
		expect(p.avertissements.length).toBeGreaterThan(0);
		for (const g of p.gidouilles) expect(g.created_by).toBe(PROF);
		for (const w of p.avertissements) {
			expect(['C', 'M', 'R', 'T']).toContain(w.warning_type);
			expect(w.academic_period_id).toBe('periode-1');
		}
	});

	it('discussion de classe : le prof et les élèves de la classe, messages au format de l’éditeur', () => {
		const c = contexte();
		const p = planActivite(c);
		expect(p.conversations).toHaveLength(1);
		const conv = p.conversations[0];
		const membres = p.participants
			.filter((x) => x.conversation_id === conv.id)
			.map((x) => x.user_id);
		expect(membres).toContain(PROF);
		for (const m of p.messages) {
			expect(membres).toContain(m.sender_id);
			expect(m.content).toMatchObject({ type: 'doc' });
			expect(m.plain_text.length).toBeGreaterThan(0);
		}
		expect(conv.last_message_id).toBe(p.messages.at(-1)?.id);
	});

	it('amitiés : jamais avec soi-même, statuts autorisés', () => {
		const p = planActivite(contexte());
		for (const f of p.amities) {
			expect(f.requester_id).not.toBe(f.addressee_id);
			expect(['pending', 'accepted']).toContain(f.status);
		}
	});

	it('évaluation : assignée à une classe par le prof', () => {
		const c = contexte();
		const p = planActivite(c);
		expect(p.evaluationsAssignees).toHaveLength(1);
		expect(p.evaluationsAssignees[0]).toMatchObject({ evaluation_id: 'eval-1', assigned_by: PROF });
	});

	it('sans évaluation ni période copiées : ni assignation d’évaluation, ni avertissement', () => {
		const p = planActivite({ ...contexte(), evaluation: null, periode: null });
		expect(p.evaluationsAssignees).toEqual([]);
		expect(p.avertissements).toEqual([]);
	});
});

describe('planActivite — les cas utiles au test sont toujours là', () => {
	it('un élève a tout maîtrisé, un autre n’a rien fait', () => {
		const p = planActivite(contexte());
		const parEleve = new Map<string, Set<string>>();
		for (const m of p.maitrise) {
			const s = parEleve.get(m.student_id) ?? new Set<string>();
			s.add(m.status);
			parEleve.set(m.student_id, s);
		}
		const statuts = [...parEleve.values()].map((s) => [...s].join(','));
		expect(statuts).toContain('mastered');
		expect(statuts).toContain('not_worked');
	});

	it('l’élève hors classe n’a aucune activité', () => {
		const c = contexte();
		const p = planActivite(c);
		const json = JSON.stringify(p);
		expect(json).not.toContain(c.horsClasse);
	});

	it('une demande d’amitié reste en attente', () => {
		const p = planActivite(contexte());
		expect(p.amities.some((f) => f.status === 'pending')).toBe(true);
		expect(p.amities.some((f) => f.status === 'accepted')).toBe(true);
	});
});
