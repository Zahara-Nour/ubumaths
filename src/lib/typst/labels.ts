/**
 * Document vocabulary, per content locale
 * =======================================
 *
 * Everything the generator and the built-in templates write *around* the
 * teacher's content: field labels, section headings, banners, boilerplate.
 * An English worksheet whose chrome stayed French would read as half-finished,
 * so these travel with the worksheet language.
 *
 * The templates reach these through `{{label_*}}` placeholders — the same
 * substitution the `{{#if show_x}}` conditionals use — so a single template
 * body serves both languages and cannot drift between them.
 *
 * Kept free of Typst syntax: these are words, the layout stays in the template.
 */

import type { ContentLocale } from '$lib/types/locale';

export interface DocumentLabels {
	// --- Identity block -------------------------------------------------------
	name: string;
	firstName: string;
	class: string;
	date: string;
	student: string;
	teacher: string;
	candidateNumber: string;
	signature: string;

	// --- Metadata -------------------------------------------------------------
	duration: string;
	minutes: string;
	marks: string;
	total: string;
	points: string;
	/** Short unit on the per-exercise badge, singular then plural. */
	pointAbbrev: string;
	pointAbbrevPlural: string;
	score: string;
	grade: string;
	coefficient: string;
	subject: string;
	field: string;
	value: string;

	// --- Structure ------------------------------------------------------------
	exercise: string;
	exercises: string;
	corrections: string;
	correction: string;
	instructions: string;
	guidelines: string;
	essentialExercises: string;
	otherExercises: string;
	skill: string;
	observations: string;

	// --- Document types (banners) --------------------------------------------
	assessment: string;
	exam: string;
	homework: string;
	quiz: string;
	worksheet: string;

	// --- Template flavour text ------------------------------------------------
	studentInfo: string;
	edition: string;
	inBrief: string;
	dailyExercises: string;
	didYouKnow: string;
	didYouKnowBody: string;
	quote: string;
	quoteAuthor: string;
	intro: string;
	dueDate: string;
	handedOut: string;
	by: string;
	honourStatement: string;
	skillsAssessment: string;
	generatedOn: string;
	markingScale: string;
	totalPoints: string;
	calculatorUnlessStated: string;
	presentationCounts: string;
	askQuestions: string;
	at: string;

	// --- Academic template (Scientifique) -------------------------------------
	generatedBy: string;
	tagline: string;
	mathsDepartment: string;
	academicYear: string;
	semester: string;
	learningObjectives: string;
	objectivesIntro: string;
	objectiveEquations: string;
	objectiveTheorems: string;
	objectiveReasoning: string;
	objectiveGraphs: string;
	criterionAccuracy: string;
	criterionClarity: string;
	criterionRigour: string;
	criterionPresentation: string;
	markingGrid: string;
	examinerOnly: string;
	skillAlgebra: string;
	skillEquations: string;
	skillReasoning: string;
	skillApplication: string;
	indicativeMarks: string;
	justifyAnswers: string;
	readEachExercise: string;
	neatWorkReminder: string;
	studentSignature: string;

	// --- Instruction sentences ------------------------------------------------
	readCarefully: string;
	writeLegibly: string;
	calculatorAllowed: string;
	calculatorForbidden: string;
	manageTime: string;
	noDocuments: string;
	answersOnPaper: string;
	anyOrder: string;

	// --- Document type names (title line) -------------------------------------
	typeWorksheet: string;
	typeAssessment: string;
	typeExam: string;
	typeQuiz: string;
	typeHomework: string;
}

const FR: DocumentLabels = {
	name: 'Nom',
	firstName: 'Prénom',
	class: 'Classe',
	date: 'Date',
	student: 'Élève',
	teacher: 'Professeur',
	candidateNumber: 'N° candidat',
	signature: 'Signature',

	duration: 'Durée',
	minutes: 'minutes',
	marks: 'Barème',
	total: 'Total',
	points: 'Points',
	pointAbbrev: 'pt',
	pointAbbrevPlural: 'pts',
	score: 'Score',
	grade: 'Note',
	coefficient: 'Coefficient',
	subject: 'Mathématiques',
	field: 'Champ',
	value: 'Valeur',

	exercise: 'Exercice',
	exercises: 'Exercices',
	corrections: 'Corrections',
	correction: 'Correction',
	instructions: 'Instructions',
	guidelines: 'Consignes',
	essentialExercises: 'Exercices indispensables',
	otherExercises: 'Autres exercices',
	skill: 'Compétence évaluée',
	observations: 'Observations',

	assessment: 'ÉVALUATION',
	exam: 'EXAMEN',
	homework: 'DEVOIRS',
	quiz: 'QUIZ',
	worksheet: "Feuille d'exercices",

	studentInfo: 'Info Élève',
	edition: 'Édition',
	inBrief: 'En bref',
	dailyExercises: 'Exercices du jour',
	didYouKnow: 'Le saviez-vous ?',
	didYouKnowBody:
		'Les mathématiques sont utilisées dans tous les domaines : musique, architecture, médecine, et même dans les jeux vidéo !',
	quote: 'Les mathématiques sont la poésie des sciences',
	quoteAuthor: 'Léopold Sédar Senghor',
	intro:
		"es exercices d'aujourd'hui vous permettront d'explorer de nouveaux concepts mathématiques passionnants.",
	dueDate: 'À rendre pour le',
	handedOut: 'Date de distribution',
	by: 'Par',
	honourStatement:
		"Je soussigné(e) atteste sur l'honneur avoir pris connaissance du règlement de l'examen et m'engage à le respecter.",
	skillsAssessment: 'Évaluation de compétences mathématiques',
	generatedOn: 'Document généré le',
	markingScale: 'Barème de notation',
	totalPoints: 'Total des points',
	calculatorUnlessStated: "L'usage de la calculatrice est autorisé sauf mention contraire.",
	presentationCounts: 'La présentation et la rédaction sont prises en compte.',
	askQuestions: "N'hésitez pas à poser des questions en classe si nécessaire.",
	at: 'à',

	generatedBy: 'Document généré par Chiphre',
	tagline: "L'excellence mathématique à votre portée",
	mathsDepartment: 'Département de Mathématiques',
	academicYear: 'Année académique',
	semester: 'Semestre',
	learningObjectives: 'Objectifs pédagogiques',
	objectivesIntro: 'Cette évaluation vise à mesurer les compétences suivantes :',
	objectiveEquations: "Résolution d'équations algébriques",
	objectiveTheorems: 'Application des théorèmes fondamentaux',
	objectiveReasoning: 'Raisonnement logique et démonstration',
	objectiveGraphs: 'Interprétation graphique',
	criterionAccuracy: 'Exactitude de la réponse',
	criterionClarity: 'Clarté de la démarche',
	criterionRigour: 'Rigueur mathématique',
	criterionPresentation: 'Présentation',
	markingGrid: "Grille d'évaluation",
	examinerOnly: "réservé à l'examinateur",
	skillAlgebra: 'Calcul algébrique',
	skillEquations: "Résolution d'équations",
	skillReasoning: 'Raisonnement',
	skillApplication: 'Application',
	indicativeMarks:
		'Barème indicatif - La note finale peut tenir compte de la qualité de la rédaction',
	justifyAnswers: 'Justifiez vos réponses sauf indication contraire.',
	readEachExercise: 'Lisez attentivement chaque exercice avant de répondre.',
	neatWorkReminder: 'Rappel : Le travail doit être soigné et les réponses justifiées.',
	studentSignature: "Signature de l'élève",

	readCarefully: 'Lisez attentivement chaque énoncé avant de répondre.',
	writeLegibly: 'Écrivez lisiblement et justifiez vos réponses.',
	calculatorAllowed: 'La calculatrice est autorisée.',
	calculatorForbidden: 'La calculatrice est interdite.',
	manageTime: 'Gérez bien votre temps.',
	noDocuments: "Aucun document n'est autorisé.",
	answersOnPaper: "Les réponses doivent être rédigées sur la copie d'examen.",
	anyOrder: "Les exercices peuvent être traités dans n'importe quel ordre.",

	typeWorksheet: "Feuille d'exercices",
	typeAssessment: 'Évaluation',
	typeExam: 'Examen',
	typeQuiz: 'Quiz',
	typeHomework: 'Devoirs'
};

const EN: DocumentLabels = {
	name: 'Surname',
	firstName: 'First name',
	class: 'Class',
	date: 'Date',
	student: 'Student',
	teacher: 'Teacher',
	candidateNumber: 'Candidate no.',
	signature: 'Signature',

	duration: 'Duration',
	minutes: 'minutes',
	marks: 'Marks',
	total: 'Total',
	points: 'Points',
	pointAbbrev: 'pt',
	pointAbbrevPlural: 'pts',
	score: 'Score',
	grade: 'Mark',
	coefficient: 'Weighting',
	subject: 'Mathematics',
	field: 'Field',
	value: 'Value',

	exercise: 'Exercise',
	exercises: 'Exercises',
	corrections: 'Answers',
	correction: 'Answers',
	instructions: 'Instructions',
	guidelines: 'Instructions',
	essentialExercises: 'Essential exercises',
	otherExercises: 'Other exercises',
	skill: 'Skill assessed',
	observations: 'Comments',

	assessment: 'ASSESSMENT',
	exam: 'EXAM',
	homework: 'HOMEWORK',
	quiz: 'QUIZ',
	worksheet: 'Worksheet',

	studentInfo: 'Student details',
	edition: 'Edition',
	inBrief: 'In brief',
	dailyExercises: "Today's exercises",
	didYouKnow: 'Did you know?',
	didYouKnowBody:
		'Mathematics is used everywhere: music, architecture, medicine, and even video games!',
	quote: 'Mathematics is the poetry of the sciences',
	quoteAuthor: 'Léopold Sédar Senghor',
	intro: "oday's exercises will take you through some fascinating new mathematical ideas.",
	dueDate: 'Due by',
	handedOut: 'Handed out',
	by: 'By',
	honourStatement:
		'I declare that I have read the exam regulations and undertake to abide by them.',
	skillsAssessment: 'Mathematics skills assessment',
	generatedOn: 'Document generated on',
	markingScale: 'Marking scheme',
	totalPoints: 'Total marks',
	calculatorUnlessStated: 'Calculators are allowed unless stated otherwise.',
	presentationCounts: 'Presentation and clarity are taken into account.',
	askQuestions: 'Do ask questions in class if you need to.',
	at: 'at',

	generatedBy: 'Document generated by Chiphre',
	tagline: 'Mathematical excellence within reach',
	mathsDepartment: 'Mathematics Department',
	academicYear: 'Academic year',
	semester: 'Term',
	learningObjectives: 'Learning objectives',
	objectivesIntro: 'This assessment measures the following skills:',
	objectiveEquations: 'Solving algebraic equations',
	objectiveTheorems: 'Applying fundamental theorems',
	objectiveReasoning: 'Logical reasoning and proof',
	objectiveGraphs: 'Graphical interpretation',
	criterionAccuracy: 'Accuracy of the answer',
	criterionClarity: 'Clarity of the method',
	criterionRigour: 'Mathematical rigour',
	criterionPresentation: 'Presentation',
	markingGrid: 'Marking grid',
	examinerOnly: 'examiner only',
	skillAlgebra: 'Algebra',
	skillEquations: 'Solving equations',
	skillReasoning: 'Reasoning',
	skillApplication: 'Application',
	indicativeMarks: 'Indicative marks - the final grade may reflect the quality of presentation',
	justifyAnswers: 'Justify your answers unless told otherwise.',
	readEachExercise: 'Read each exercise carefully before answering.',
	neatWorkReminder: 'Reminder: work must be neat and answers justified.',
	studentSignature: 'Student signature',

	readCarefully: 'Read each question carefully before answering.',
	writeLegibly: 'Write legibly and justify your answers.',
	calculatorAllowed: 'Calculators are allowed.',
	calculatorForbidden: 'Calculators are not allowed.',
	manageTime: 'Manage your time carefully.',
	noDocuments: 'No documents are allowed.',
	answersOnPaper: 'Answers must be written on the exam paper.',
	anyOrder: 'Exercises may be tackled in any order.',

	typeWorksheet: 'Worksheet',
	typeAssessment: 'Assessment',
	typeExam: 'Exam',
	typeQuiz: 'Quiz',
	typeHomework: 'Homework'
};

const LABELS: Record<ContentLocale, DocumentLabels> = { fr: FR, en: EN };

export function documentLabels(locale: ContentLocale): DocumentLabels {
	return LABELS[locale] ?? FR;
}

/**
 * Labels flattened into `{{label_*}}` placeholders for template substitution.
 *
 * Every label is a plain string precisely so a template can substitute it; an
 * instruction list is therefore modelled as one label per sentence.
 */
export function labelPlaceholders(locale: ContentLocale): Record<string, string> {
	const labels = documentLabels(locale);
	const entries = Object.entries(labels).filter(
		(entry): entry is [string, string] => typeof entry[1] === 'string'
	);

	return Object.fromEntries(entries.map(([key, value]) => [`label_${toSnakeCase(key)}`, value]));
}

function toSnakeCase(key: string): string {
	return key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

/**
 * Document type as named on the *student* sheet.
 *
 * Deliberately worded differently from the teacher document ("Fiche de travail"
 * rather than "Feuille d'exercices"): changing that wording is not part of
 * adding English, so the French strings stay exactly as they were.
 */
export const STUDENT_TYPE_LABELS: Record<ContentLocale, Record<string, string>> = {
	fr: {
		worksheet: 'Fiche de travail',
		assessment: 'Évaluation',
		exam: 'Examen',
		quiz: 'Quiz',
		homework: 'Devoir'
	},
	en: {
		worksheet: 'Worksheet',
		assessment: 'Assessment',
		exam: 'Exam',
		quiz: 'Quiz',
		homework: 'Homework'
	}
};
