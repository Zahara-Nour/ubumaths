import { z } from 'zod';

export const EXAMPLE_CATEGORIES = [
	'bases',
	'fonctions',
	'oop',
	'strings',
	'exceptions',
	'io',
	'maths',
	'visualisation',
	'algorithmes'
] as const;

export type ExampleCategory = (typeof EXAMPLE_CATEGORIES)[number];

export const EXAMPLE_TAGS = [
	// bases
	'variables',
	'types',
	'operateurs',
	'print',
	'input',
	'f-strings',
	// flux
	'if',
	'while',
	'for',
	'comprehensions',
	// fonctions
	'parametres',
	'defaults',
	'args-kwargs',
	'lambda',
	'recursion',
	// collections
	'list',
	'tuple',
	'dict',
	'set',
	'slicing',
	// strings
	'methodes-string',
	'regex',
	'formatage',
	// oop
	'class',
	'heritage',
	'dataclass',
	'properties',
	// io
	'fichiers',
	'json',
	'csv',
	// exceptions
	'try-except',
	'custom-exceptions',
	// maths
	'math',
	'sympy',
	'numpy',
	'random',
	'fractions',
	'statistics',
	// visualisation
	'matplotlib',
	'plotly',
	// algorithmes
	'tri',
	'recherche',
	// niveaux
	'college',
	'lycee',
	'nsi',
	'superieur'
] as const;

export type ExampleTag = (typeof EXAMPLE_TAGS)[number];

export interface PythonExample {
	id: string;
	title: string;
	description: string;
	category: ExampleCategory;
	tags: ExampleTag[];
	code: string;
}

export const pythonExampleSchema = z.object({
	id: z
		.string()
		.min(1)
		.regex(/^[a-z0-9-]+$/, 'id must be kebab-case ASCII'),
	title: z.string().min(1).max(80),
	description: z.string().min(1).max(300),
	category: z.enum(EXAMPLE_CATEGORIES),
	tags: z
		.array(z.enum(EXAMPLE_TAGS))
		.min(1)
		.max(6)
		.refine((tags) => new Set(tags).size === tags.length, 'tags must be unique'),
	code: z.string().min(1).max(10000)
}) satisfies z.ZodType<PythonExample>;
