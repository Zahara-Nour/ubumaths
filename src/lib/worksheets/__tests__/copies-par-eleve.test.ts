/**
 * Une copie par élève, nom pré-imprimé (ADR 0030, lot 5)
 * ======================================================
 *
 * Spécification validée par David (2026-10-16) : depuis une affectation, le
 * prof imprime une copie par élève visé, chacune au niveau de guidage de
 * l'affectation, avec SA copie si l'affectation est individualisée ; le nom
 * vient de la liste des élèves et s'imprime à la ligne « Nom » de l'en-tête
 * (la classe aussi si elle est connue). Toutes les copies à la suite, ordre
 * alphabétique français (nom puis prénom), chaque copie sur une nouvelle page,
 * numérotée « page / total » pour elle seule.
 *
 * Noms d'élèves : tous fictifs.
 */
import { describe, expect, it, vi } from 'vitest';
import {
	assembleStudentCopies,
	copyRecipientName,
	fetchStudentCopyViews,
	sortCopyRecipients,
	studentCopyTypst,
	type CopyRecipient,
	type StudentCopyView
} from '../student-copies';
import { generateStudentWorksheetTypst } from '../student-worksheet-typst';
import { BUILT_IN_STYLES } from '$lib/typst/templates/styles';

const ONDINE: CopyRecipient = {
	id: '550e8400-e29b-41d4-a716-446655440601',
	first_name: 'Ondine',
	last_name: 'Abricot',
	class_name: '3e Lune'
};
const ELISE: CopyRecipient = {
	id: '550e8400-e29b-41d4-a716-446655440602',
	first_name: 'Élise',
	last_name: 'Écureuil',
	class_name: '3e Lune'
};
const BASILE: CopyRecipient = {
	id: '550e8400-e29b-41d4-a716-446655440603',
	first_name: 'Basile',
	last_name: 'Dupré',
	class_name: '3e Lune'
};
const ANOUK: CopyRecipient = {
	id: '550e8400-e29b-41d4-a716-446655440604',
	first_name: 'Anouk',
	last_name: 'Dupré',
	class_name: null
};
const FELIX: CopyRecipient = {
	id: '550e8400-e29b-41d4-a716-446655440605',
	first_name: 'Félix',
	last_name: 'Fougère',
	class_name: '3e Lune'
};

function view(overrides: Partial<StudentCopyView> = {}): StudentCopyView {
	return {
		assignment_id: 'a-1',
		worksheet_id: 'w-1',
		title: 'Fractions',
		language: 'fr',
		description: null,
		type: 'assessment',
		instructions: null,
		available_from: null,
		closes_at: null,
		show_corrections: false,
		class_name: '3e Lune, 3e Soleil',
		read_only: false,
		sections: [],
		exercises: [
			{
				id: 'we-1',
				exercise_id: 'ex-1',
				title: 'Simplifier',
				position: 1,
				section_id: null,
				points: 3,
				is_essential: false,
				custom_instructions: null,
				statement: 'ENONCE-COMMUN',
				correction: null,
				answers: null,
				correction_visible: false
			}
		],
		per_student_copies: false,
		...overrides
	} as StudentCopyView;
}

/** Les morceaux du document assemblé, un par copie */
function copiesOf(document: string): string[] {
	return document.split('#pagebreak(weak: true)');
}

describe('ordre des copies : alphabétique français, nom puis prénom', () => {
	it('trie par nom puis prénom, les accents à leur place', () => {
		const sorted = sortCopyRecipients([FELIX, ELISE, BASILE, ONDINE, ANOUK]);
		expect(sorted.map((r) => r.first_name)).toEqual([
			'Ondine', // Abricot
			'Anouk', // Dupré
			'Basile', // Dupré
			'Élise', // Écureuil : entre Dupré et Fougère, pas après Z
			'Félix' // Fougère
		]);
	});

	it('un élève visé deux fois (classe et nommément) n’a qu’une copie', () => {
		const sorted = sortCopyRecipients([BASILE, ONDINE, { ...BASILE, class_name: null }]);
		expect(sorted.map((r) => r.id)).toEqual([ONDINE.id, BASILE.id]);
		// La classe connue est gardée
		expect(sorted[1].class_name).toBe('3e Lune');
	});

	it('le nom imprimé : NOM Prénom, comme la liste ; rien d’inventé s’il manque', () => {
		expect(copyRecipientName(ELISE)).toBe('Écureuil Élise');
		expect(copyRecipientName({ ...ELISE, first_name: null })).toBe('Écureuil');
		expect(copyRecipientName({ ...ELISE, first_name: null, last_name: '  ' })).toBeNull();
	});
});

describe('les copies : celle de chaque élève, reçue du serveur', () => {
	it('affectation commune : une seule demande, la même copie pour tous', async () => {
		const fetchView = vi.fn(async () => view({ per_student_copies: false }));
		const progress: number[] = [];
		const copies = await fetchStudentCopyViews([ONDINE, BASILE, FELIX], fetchView, {
			onProgress: (done) => progress.push(done)
		});
		expect(fetchView).toHaveBeenCalledTimes(1);
		expect(copies.map((c) => c.recipient.id)).toEqual([ONDINE.id, BASILE.id, FELIX.id]);
		expect(new Set(copies.map((c) => c.view)).size).toBe(1);
		expect(progress.at(-1)).toBe(3);
	});

	it('affectation individualisée : la copie propre à chaque élève', async () => {
		const fetchView = vi.fn(async (studentId: string) =>
			view({ per_student_copies: true, title: `Copie de ${studentId}` })
		);
		const copies = await fetchStudentCopyViews([ONDINE, BASILE, FELIX], fetchView, {
			concurrency: 2
		});
		expect(fetchView.mock.calls.map((call) => call[0]).sort()).toEqual(
			[ONDINE.id, BASILE.id, FELIX.id].sort()
		);
		// Chaque copie est bien celle de SON élève, dans l'ordre de la liste
		for (const copy of copies) {
			expect(copy.view.title).toBe(`Copie de ${copy.recipient.id}`);
		}
		expect(copies.map((c) => c.recipient.id)).toEqual([ONDINE.id, BASILE.id, FELIX.id]);
	});

	it('une copie illisible : tout échoue, rien d’imprimé à moitié', async () => {
		const fetchView = vi.fn(async (studentId: string) => {
			if (studentId === BASILE.id) throw new Error('Cet élève n’a pas accès');
			return view({ per_student_copies: true });
		});
		await expect(fetchStudentCopyViews([ONDINE, BASILE, FELIX], fetchView)).rejects.toThrow(
			'Cet élève n’a pas accès'
		);
	});

	it('aucun élève : aucune demande', async () => {
		const fetchView = vi.fn(async () => view());
		expect(await fetchStudentCopyViews([], fetchView)).toEqual([]);
		expect(fetchView).not.toHaveBeenCalled();
	});
});

describe('la copie d’un élève : son nom à la ligne « Nom »', () => {
	it('évaluation : le nom et la classe de l’élève remplacent les lignes à remplir', () => {
		const typst = studentCopyTypst(view(), ONDINE);
		expect(typst).toContain('*Nom :* #"Abricot Ondine";');
		expect(typst).toContain('*Classe :* #"3e Lune";');
		// Pas les classes de toute l'affectation
		expect(typst).not.toContain('3e Soleil');
	});

	it('élève visé nommément, sans classe connue : ligne « Classe » à remplir', () => {
		const typst = studentCopyTypst(view(), ANOUK);
		expect(typst).toContain('*Nom :* #"Dupré Anouk";');
		expect(typst).not.toMatch(/\*Classe :\* 3e/);
	});

	it('même rendu que le PDF de l’élève, au nom près', () => {
		const own = generateStudentWorksheetTypst(view(), 'none', { className: '3e Lune' });
		const printed = studentCopyTypst(view(), ONDINE);
		expect(printed.replace('#"Abricot Ondine";', '')).toBe(
			own.replace(
				'#context box(width: 4cm, height: 0.9em, stroke: (bottom: 0.5pt + text.fill))',
				''
			)
		);
	});

	it('un nom qui ressemble à du Typst s’imprime tel quel, jamais évalué', () => {
		// Le nom est écrit par l'élève lui-même (sa fiche de profil) : texte, jamais code
		const hostile = 'X], text(size: 40pt)[pirate], [ // "q" \\ <chiphre-copie-fin-0>\nZ';
		const typst = studentCopyTypst(view(), { ...ONDINE, first_name: null, last_name: hostile });
		expect(typst).toContain(
			'*Nom :* #"X], text(size: 40pt)[pirate], [ // \\"q\\" \\\\ <chiphre-copie-fin-0> Z";'
		);
		// Classe venue du prof : même traitement
		const withClass = studentCopyTypst(view(), { ...ONDINE, class_name: '3e "Lune"]' });
		expect(withClass).toContain('*Classe :* #"3e \\"Lune\\"]";');
	});
});

describe('le document : toutes les copies à la suite', () => {
	const recipients = sortCopyRecipients([FELIX, ONDINE, ELISE]);
	const sources = recipients.map((r) => studentCopyTypst(view(), r));
	const document = assembleStudentCopies(sources);

	it('une copie par élève, chacune sur une nouvelle page', () => {
		const copies = copiesOf(document);
		expect(copies).toHaveLength(3);
		expect(document.match(/#pagebreak\(weak: true\)/g)).toHaveLength(2);
		// Chaque copie repart à la page 1
		expect(document.match(/#counter\(page\)\.update\(1\)/g)).toHaveLength(3);
	});

	it('chaque copie porte le nom de son élève, et aucun autre', () => {
		const copies = copiesOf(document);
		const names = recipients.map((r) => copyRecipientName(r) as string);
		copies.forEach((copy, index) => {
			expect(copy).toContain(`*Nom :* #"${names[index]}";`);
			for (const other of names.filter((_, i) => i !== index)) {
				expect(copy).not.toContain(other);
			}
		});
	});

	it('« page / total » compte les pages de la copie, pas du paquet', () => {
		// Le total d'une copie est lu à SA fin, jamais à la fin du document
		expect(document).not.toContain('counter(page).final()');
		expect(document).not.toMatch(/both:\s*true/);
		for (let index = 0; index < 3; index++) {
			expect(document).toContain(`<chiphre-copie-fin-${index}>`);
		}
	});

	it('pied de page « Page n sur N » des autres styles : même règle', () => {
		const source =
			'Page #context(counter(page).display()) sur #context(counter(page).final().first())';
		const assembled = assembleStudentCopies([source, source]);
		expect(assembled).not.toContain('counter(page).final()');
		expect(assembled).toContain('counter(page).at(<chiphre-copie-fin-0>).first()');
		expect(assembled).toContain('counter(page).at(<chiphre-copie-fin-1>).first()');
	});

	it('tous les styles intégrés : aucun total « du paquet » ne reste', () => {
		for (const style of BUILT_IN_STYLES) {
			const styled = recipients.map((r) =>
				studentCopyTypst(view({ type: 'exam', style_id: style.id }), r)
			);
			const assembled = assembleStudentCopies(styled);
			expect(assembled, style.name).not.toMatch(/counter\(page\)\.final\(/);
			expect(assembled, style.name).not.toMatch(/both:\s*true/);
		}
	});

	it('aucune copie : document vide', () => {
		expect(assembleStudentCopies([])).toBe('');
	});
});
