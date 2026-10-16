/**
 * Une copie par élève, nom pré-imprimé (ADR 0030, lot 5)
 * ======================================================
 *
 * Le prof imprime une affectation en une copie par élève visé, chacune à son
 * nom, pour donner la bonne fiche à la bonne personne. Rien n'est calculé ici
 * qui ne l'est déjà ailleurs :
 *
 * - les élèves visés : la liste de l'affectation que le serveur résout déjà
 *   (`GET /api/worksheets/assignments/[id]/students` : classes visées, membres
 *   actifs, plus les élèves visés nommément), triée ici en français ;
 * - la copie de chaque élève : l'aperçu « copie d'un élève »
 *   (`GET …/preview?studentId=`), au niveau de guidage de l'affectation ;
 * - le PDF de chaque copie : `generateStudentWorksheetTypst`, le même que celui
 *   de l'élève, le nom en plus à la ligne « Nom » de l'en-tête.
 *
 * Le PDF est fabriqué dans le navigateur du prof, jamais stocké.
 *
 * @module worksheets/student-copies
 */

import type { StudentWorksheetView } from '$lib/types/worksheets';
import { generateStudentWorksheetTypst } from './student-worksheet-typst';
import type { TextSize } from '$lib/typst/text-size';

// ============================================================================
// TYPES
// ============================================================================

/** Un élève visé par l'affectation, tel que la liste de l'affectation le donne */
export interface CopyRecipient {
	id: string;
	first_name: string | null;
	last_name: string | null;
	/** La classe visée dont il est membre ; `null` : visé nommément, classe inconnue */
	class_name: string | null;
	/** Taille du texte de ses fiches (accessibilité) ; absente : normale */
	text_size?: TextSize;
}

/** La copie d'un élève telle que l'aperçu la rend */
export type StudentCopyView = StudentWorksheetView & {
	/** Chaque élève a sa version (valeurs tirées ou ordre mélangé) */
	per_student_copies?: boolean;
};

/** Une copie prête à imprimer : l'élève et sa copie */
export interface StudentCopy {
	recipient: CopyRecipient;
	view: StudentCopyView;
}

export interface FetchCopiesOptions {
	/** Demandes simultanées au serveur (4 par défaut) */
	concurrency?: number;
	/** Copies reçues, sur le total */
	onProgress?: (done: number, total: number) => void;
}

// ============================================================================
// CONSTANTES
// ============================================================================

const DEFAULT_CONCURRENCY = 4;

/** Tri français : accents à leur place (« Écureuil » entre « Dupré » et « Fougère ») */
const FRENCH = new Intl.Collator('fr', { sensitivity: 'base' });

/** Étiquette posée à la fin de chaque copie : son nombre de pages y est lu */
const COPY_END_LABEL = 'chiphre-copie-fin';

// ============================================================================
// LES ÉLÈVES
// ============================================================================

/**
 * Les élèves dans l'ordre d'impression : nom puis prénom, tri français. Un
 * élève visé deux fois (par sa classe et nommément) n'a qu'une copie ; la
 * classe connue est gardée.
 */
export function sortCopyRecipients(recipients: readonly CopyRecipient[]): CopyRecipient[] {
	const byId = new Map<string, CopyRecipient>();
	for (const recipient of recipients) {
		const known = byId.get(recipient.id);
		byId.set(
			recipient.id,
			known ? { ...known, class_name: known.class_name ?? recipient.class_name } : recipient
		);
	}
	return [...byId.values()].sort(
		(a, b) =>
			FRENCH.compare(a.last_name ?? '', b.last_name ?? '') ||
			FRENCH.compare(a.first_name ?? '', b.first_name ?? '')
	);
}

/**
 * Le nom imprimé : « Nom Prénom », dans l'ordre du paquet. `null` si l'élève
 * n'a pas de nom : la ligne reste à remplir, rien n'est inventé.
 */
export function copyRecipientName(recipient: CopyRecipient): string | null {
	const name = [recipient.last_name, recipient.first_name]
		.map((part) => part?.trim() ?? '')
		.filter((part) => part !== '')
		.join(' ');
	return name === '' ? null : name;
}

// ============================================================================
// LES COPIES
// ============================================================================

/**
 * La copie de chaque élève, dans l'ordre de `recipients`. Affectation commune
 * (`per_student_copies` faux) : la première copie reçue sert à tous, une seule
 * demande. Une copie illisible fait tout échouer : jamais de paquet incomplet.
 *
 * @param fetchView - la copie d'un élève (l'aperçu `?studentId=`)
 */
export async function fetchStudentCopyViews(
	recipients: readonly CopyRecipient[],
	fetchView: (studentId: string) => Promise<StudentCopyView>,
	options: FetchCopiesOptions = {}
): Promise<StudentCopy[]> {
	const total = recipients.length;
	if (total === 0) return [];
	const report = (done: number) => options.onProgress?.(done, total);

	const first = await fetchView(recipients[0].id);
	if (first.per_student_copies !== true) {
		report(total);
		return recipients.map((recipient) => ({ recipient, view: first }));
	}

	const views: StudentCopyView[] = Array.from({ length: total });
	views[0] = first;
	let done = 1;
	report(done);
	let next = 1;
	const concurrency = Math.max(1, options.concurrency ?? DEFAULT_CONCURRENCY);
	const worker = async () => {
		while (next < total) {
			const index = next++;
			views[index] = await fetchView(recipients[index].id);
			report(++done);
		}
	};
	await Promise.all(Array.from({ length: Math.min(concurrency, total - 1) }, worker));
	return recipients.map((recipient, index) => ({ recipient, view: views[index] }));
}

/**
 * Le Typst de la copie d'un élève : exactement son PDF (énoncés seuls), avec
 * son nom à la ligne « Nom » et sa classe si elle est connue — sinon la ligne
 * reste à remplir (jamais les classes de toute l'affectation). Le reste de
 * l'en-tête est décidé par le type de la fiche (`worksheetHeader`), mais le
 * nom s'imprime toujours : une copie par élève porte le nom de son élève, même
 * sur une fiche d'exercices sans l'option « Nom de l'élève » (décision de
 * David, 2026-10-15 ; l'option ne règle que la ligne à remplir du PDF commun).
 */
export function studentCopyTypst(view: StudentCopyView, recipient: CopyRecipient): string {
	return generateStudentWorksheetTypst({ ...view, show_student_name: true }, 'none', {
		studentName: copyRecipientName(recipient) ?? undefined,
		className: recipient.class_name,
		textSize: recipient.text_size
	});
}

/**
 * Le pied « page / total » d'une copie compte SES pages : le total, lu à la
 * fin du document (`final()`, `both: true`), est lu à la fin de la copie.
 */
function scopePageTotal(typst: string, label: string): string {
	return typst
		.replaceAll('counter(page).final()', `counter(page).at(<${label}>)`)
		.replace(
			/counter\(page\)\.display\(\s*("[^"]*")\s*,\s*both:\s*true\s*\)/g,
			`numbering($1, ..counter(page).get(), ..counter(page).at(<${label}>))`
		);
}

/**
 * Toutes les copies dans un seul document : chacune dans son propre bloc (ses
 * réglages de page et de texte ne débordent pas sur la suivante), sur une
 * nouvelle page, numérotée à partir de 1.
 */
export function assembleStudentCopies(sources: readonly string[]): string {
	return sources
		.map((source, index) => {
			const label = `${COPY_END_LABEL}-${index}`;
			return [
				'#counter(page).update(1)',
				'#[',
				scopePageTotal(source, label),
				`#metadata(none) <${label}>`,
				']'
			].join('\n');
		})
		.join('\n#pagebreak(weak: true)\n');
}
