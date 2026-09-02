/**
 * Tests for WorksheetGenerator
 *
 * Tests the worksheet-specific Typst generator including:
 * - Default document generation
 * - Template-based generation
 * - Correction mode
 * - Backward compatibility with legacy function
 */
import { describe, it, expect } from 'vitest';
import {
	WorksheetGenerator,
	generateWorksheetTypst,
	generateBatchTypst
} from '../worksheet-generator';
import type {
	WorksheetRow,
	InstanceData,
	WorksheetConfig,
	WorksheetTemplateRow
} from '$lib/types/worksheets';

// Test fixtures
const createMockWorksheet = (overrides?: Partial<WorksheetRow>): WorksheetRow => ({
	id: 'test-worksheet-id',
	title: 'Test Worksheet',
	description: 'A test worksheet',
	type: 'worksheet',
	config: {
		show_title: true,
		show_date: true,
		show_student_name: true,
		show_class: true,
		show_points: true,
		numbering_style: 'numeric',
		page_layout: 'A4',
		font_size: 12,
		margins: { top: 20, bottom: 20, left: 15, right: 15 }
	},
	status: 'published',
	version: 1,
	published_at: '2024-01-01',
	archived_at: null,
	template_id: null,
	estimated_duration_minutes: 30,
	total_points: 20,
	grades: ['3eme'],
	tags: ['algebra'],
	created_by: 'teacher-id',
	school_id: 'school-id',
	created_at: '2024-01-01',
	updated_at: '2024-01-01',
	...overrides
});

const createMockInstance = (overrides?: Partial<InstanceData>): InstanceData => ({
	exercises: [
		{
			exercise_id: 'ex-1',
			title: 'Equation lineaire',
			position: 1,
			parameters: {},
			statement: 'Solve for x: 2x + 3 = 7',
			solution: 'x = 2'
		},
		{
			exercise_id: 'ex-2',
			title: null,
			position: 2,
			parameters: {},
			statement: 'Calculate: 3 * 4 + 5',
			solution: '17'
		}
	],
	...overrides
});

const createMockConfig = (overrides?: Partial<WorksheetConfig>): WorksheetConfig => ({
	show_title: true,
	show_date: true,
	show_student_name: true,
	show_class: true,
	show_points: true,
	numbering_style: 'numeric',
	page_layout: 'A4',
	font_size: 12,
	margins: { top: 20, bottom: 20, left: 15, right: 15 },
	...overrides
});

describe('WorksheetGenerator', () => {
	describe('constructor', () => {
		it('accepts worksheet config', () => {
			const config = createMockConfig();
			const generator = new WorksheetGenerator(config);

			// The generator should be created without error
			expect(generator).toBeInstanceOf(WorksheetGenerator);
		});

		it('accepts optional generator config and context', () => {
			const worksheetConfig = createMockConfig();
			const generator = new WorksheetGenerator(
				worksheetConfig,
				{ fontSize: 14 },
				{ mode: 'correction' }
			);

			expect(generator).toBeInstanceOf(WorksheetGenerator);
		});
	});

	describe('generate', () => {
		it('returns GenerateResult with typstContent and metadata', () => {
			const generator = new WorksheetGenerator(createMockConfig());
			const result = generator.generate({
				worksheet: createMockWorksheet(),
				instance: createMockInstance()
			});

			expect(result).toHaveProperty('typstContent');
			expect(result).toHaveProperty('metadata');
			expect(result.metadata.generator).toBe('chiphre-worksheet-generator');
			expect(result.metadata.generatedAt).toBeInstanceOf(Date);
		});

		it('generates valid Typst content with page setup', () => {
			const generator = new WorksheetGenerator(createMockConfig());
			const result = generator.generate({
				worksheet: createMockWorksheet(),
				instance: createMockInstance()
			});

			expect(result.typstContent).toContain('#set page');
			expect(result.typstContent).toContain('#set text');
		});

		it('includes worksheet title', () => {
			const generator = new WorksheetGenerator(createMockConfig());
			const result = generator.generate({
				worksheet: createMockWorksheet({ title: 'My Custom Title' }),
				instance: createMockInstance()
			});

			expect(result.typstContent).toContain('My Custom Title');
		});

		it('includes exercises', () => {
			const generator = new WorksheetGenerator(createMockConfig());
			const result = generator.generate({
				worksheet: createMockWorksheet(),
				instance: createMockInstance()
			});

			expect(result.typstContent).toContain('Exercice 1');
			expect(result.typstContent).toContain('Exercice 2');
			expect(result.typstContent).toContain('2x + 3 = 7');
			// Note: * is escaped to \* in Typst
			expect(result.typstContent).toContain('3 \\* 4 + 5');
		});
	});

	describe('correction mode', () => {
		it('includes CORRECTION banner in correction mode', () => {
			const generator = new WorksheetGenerator(createMockConfig(), undefined, {
				mode: 'correction'
			});
			const result = generator.generate({
				worksheet: createMockWorksheet(),
				instance: createMockInstance()
			});

			expect(result.typstContent).toContain('CORRECTION');
		});

		it('includes solutions in correction mode', () => {
			const generator = new WorksheetGenerator(createMockConfig(), undefined, {
				mode: 'correction'
			});
			const result = generator.generate({
				worksheet: createMockWorksheet(),
				instance: createMockInstance()
			});

			expect(result.typstContent).toContain('Solution');
			expect(result.typstContent).toContain('x = 2');
			expect(result.typstContent).toContain('17');
		});

		it('does not include solutions in worksheet mode', () => {
			const generator = new WorksheetGenerator(createMockConfig());
			const result = generator.generate({
				worksheet: createMockWorksheet(),
				instance: createMockInstance()
			});

			// Solutions should not appear in worksheet mode
			expect(result.typstContent).not.toMatch(/Solution.*x = 2/);
		});
	});

	describe('template support', () => {
		const mockTemplate: WorksheetTemplateRow = {
			id: 'template-1',
			name: 'Test Template',
			description: 'A test template',
			template_content: `#set page(paper: "a4")
{{title}}
{{student_name}}
{{class}}
{{exercises}}`,
			placeholders: [],
			created_by: 'teacher-id',
			created_at: '2024-01-01',
			updated_at: '2024-01-01'
		};

		it('uses template when provided', () => {
			const generator = new WorksheetGenerator(createMockConfig());
			const result = generator.generate({
				worksheet: createMockWorksheet(),
				instance: createMockInstance(),
				template: mockTemplate
			});

			// Template content should be used (page setup from template)
			expect(result.typstContent).toContain('#set page(paper: "a4")');
		});

		it('replaces placeholders in template', () => {
			const generator = new WorksheetGenerator(createMockConfig(), undefined, {
				studentName: 'Jean Dupont',
				className: 'Classe 3B'
			});
			const result = generator.generate({
				worksheet: createMockWorksheet({ title: 'My Title' }),
				instance: createMockInstance(),
				template: mockTemplate
			});

			expect(result.typstContent).toContain('My Title');
			expect(result.typstContent).toContain('Jean Dupont');
			expect(result.typstContent).toContain('Classe 3B');
		});

		it('honours display options in template mode', () => {
			const conditionalTemplate: WorksheetTemplateRow = {
				...mockTemplate,
				template_content: `#set page(paper: "a4")
[{{#if show_title}}*Titre :* {{title}}{{/if}}]
[{{#if show_date}}*Date :* {{date}}{{/if}}]
[{{#if show_class}}*Classe :* {{class}}{{/if}}]
[{{#if show_student_name}}*Nom :* {{student_name}}{{/if}}]
[{{#if show_points}}*Bareme :* {{total_points}}{{/if}}]
{{exercises}}`
			};
			const generator = new WorksheetGenerator(
				createMockConfig({
					show_date: false,
					show_class: false,
					show_student_name: false,
					show_points: false
				}),
				undefined,
				{ studentName: 'Jean Dupont', className: 'Classe 3B' }
			);

			const result = generator.generate({
				worksheet: createMockWorksheet({ title: 'My Title' }),
				instance: createMockInstance(),
				template: conditionalTemplate
			});

			// The labels have to go with the values, not just the values.
			expect(result.typstContent).not.toContain('Date :');
			expect(result.typstContent).not.toContain('Classe :');
			expect(result.typstContent).not.toContain('Classe 3B');
			expect(result.typstContent).not.toContain('Nom :');
			expect(result.typstContent).not.toContain('Jean Dupont');
			expect(result.typstContent).not.toContain('Bareme :');
			// The option left on still renders.
			expect(result.typstContent).toContain('*Titre :* My Title');
		});

		it('shows every field in template mode when no display option is set', () => {
			const conditionalTemplate: WorksheetTemplateRow = {
				...mockTemplate,
				template_content: `[{{#if show_date}}*Date :* {{date}}{{/if}}]
[{{#if show_class}}*Classe :* {{class}}{{/if}}]
{{exercises}}`
			};
			// An empty config: flags are opt-out, an absent one means "show".
			const generator = new WorksheetGenerator({}, undefined, { className: 'Classe 3B' });

			const result = generator.generate({
				worksheet: createMockWorksheet(),
				instance: createMockInstance(),
				template: conditionalTemplate
			});

			expect(result.typstContent).toContain('Date :');
			expect(result.typstContent).toContain('*Classe :* Classe 3B');
		});

		it('numbers exercises with a heading by default', () => {
			const generator = new WorksheetGenerator(createMockConfig());
			const result = generator.generate({
				worksheet: createMockWorksheet(),
				instance: createMockInstance(),
				template: mockTemplate
			});

			expect(result.typstContent).toContain('Exercice 1');
			expect(result.typstContent).not.toContain('rgb("#dc2626")');
		});

		it('numbers exercises with a red badge when the template uses {{exercises_badge}}', () => {
			const badgeTemplate: WorksheetTemplateRow = {
				...mockTemplate,
				template_content: `#set page(paper: "a4", columns: 2)
{{title}}
{{exercises_badge}}`
			};
			const generator = new WorksheetGenerator(createMockConfig());
			const result = generator.generate({
				worksheet: createMockWorksheet(),
				instance: createMockInstance(),
				template: badgeTemplate
			});

			// Number in white on a red rounded square, no "Exercice N" heading
			expect(result.typstContent).toContain(
				'#box(fill: rgb("#dc2626"), radius: 3pt, inset: (x: 6pt, y: 3pt))[#text(fill: white, weight: "bold")[1]]'
			);
			expect(result.typstContent).toContain('Equation lineaire');
			expect(result.typstContent).not.toContain('Exercice 1');
			expect(result.typstContent).not.toContain('{{exercises_badge}}');
		});
	});

	describe('numbering styles', () => {
		it('uses numeric numbering by default', () => {
			const generator = new WorksheetGenerator(createMockConfig({ numbering_style: 'numeric' }));
			const result = generator.generate({
				worksheet: createMockWorksheet(),
				instance: createMockInstance()
			});

			expect(result.typstContent).toContain('Exercice 1');
			expect(result.typstContent).toContain('Exercice 2');
		});

		it('uses alphabetic numbering when configured', () => {
			const generator = new WorksheetGenerator(createMockConfig({ numbering_style: 'alphabetic' }));
			const result = generator.generate({
				worksheet: createMockWorksheet(),
				instance: createMockInstance()
			});

			expect(result.typstContent).toContain('Exercice A');
			expect(result.typstContent).toContain('Exercice B');
		});

		it('uses roman numbering when configured', () => {
			const generator = new WorksheetGenerator(createMockConfig({ numbering_style: 'roman' }));
			const result = generator.generate({
				worksheet: createMockWorksheet(),
				instance: createMockInstance()
			});

			expect(result.typstContent).toContain('Exercice I');
			expect(result.typstContent).toContain('Exercice II');
		});
	});

	describe('exercise metadata', () => {
		it('shows the points set on the exercise, not its position', () => {
			const generator = new WorksheetGenerator(createMockConfig());
			const instance = createMockInstance();
			// 1st exercise (position 1) worth 5 points, 2nd (position 2) worth 1
			instance.exercises[0].points = 5;
			instance.exercises[1].points = 1;

			const result = generator.generate({ worksheet: createMockWorksheet(), instance });

			expect(result.typstContent).toContain('points-badge(5)');
			expect(result.typstContent).toContain('points-badge(1)');
			expect(result.typstContent).not.toContain('points-badge(2)');
		});

		it('omits the points badge when the exercise has none', () => {
			const generator = new WorksheetGenerator(createMockConfig());
			const result = generator.generate({
				worksheet: createMockWorksheet(),
				instance: createMockInstance()
			});

			// (the `#let points-badge(pts)` definition always sits in the setup)
			expect(result.typstContent).not.toMatch(/^\s+points-badge\(/m);
		});

		it('renders the custom instructions of an exercise', () => {
			const generator = new WorksheetGenerator(createMockConfig());
			const instance = createMockInstance();
			instance.exercises[0].custom_instructions = 'Detailler les etapes.';

			const result = generator.generate({ worksheet: createMockWorksheet(), instance });

			expect(result.typstContent).toContain('Detailler les etapes.');
		});

		it('groups exercises under their section titles', () => {
			const generator = new WorksheetGenerator(createMockConfig());
			const instance = createMockInstance();
			instance.sections = [
				{ id: 's1', title: 'Calculs', instructions: 'Sans calculatrice.', position: 1 }
			];
			instance.exercises[0].section_id = 's1';
			instance.exercises[1].section_id = 's1';

			const result = generator.generate({
				worksheet: createMockWorksheet(),
				instance,
				template: {
					id: 't',
					name: 'T',
					description: null,
					template_content: '{{exercises}}',
					placeholders: [],
					created_by: 'teacher-id',
					created_at: '2024-01-01',
					updated_at: '2024-01-01'
				}
			});

			expect(result.typstContent).toContain('Calculs');
			expect(result.typstContent).toContain('Sans calculatrice.');
		});
	});

	describe('exercise header is never orphaned', () => {
		const mockTemplate: WorksheetTemplateRow = {
			id: 'template-1',
			name: 'Test Template',
			description: null,
			template_content: '#set page(paper: "a4", columns: 2)\n{{exercises}}',
			placeholders: [],
			created_by: 'teacher-id',
			created_at: '2024-01-01',
			updated_at: '2024-01-01'
		};

		it('puts the header of a templated exercise in its own sticky block', () => {
			const generator = new WorksheetGenerator(createMockConfig());
			const result = generator.generate({
				worksheet: createMockWorksheet(),
				instance: createMockInstance(),
				template: mockTemplate
			});

			// Header block is sticky, statement follows in a separate (breakable) block
			expect(result.typstContent).toContain(
				'#block(width: 100%, inset: 0pt, sticky: true, below: 0.3em)[\n  #text(size: 1.1em, weight: "bold")[Exercice 1'
			);
			expect(result.typstContent).toContain(']\n#block(width: 100%, inset: 0pt)[\n  Solve for x');
		});

		it('renders the header through the sticky exercise-header helper without a template', () => {
			const generator = new WorksheetGenerator(createMockConfig());
			const result = generator.generate({
				worksheet: createMockWorksheet(),
				instance: createMockInstance()
			});

			expect(result.typstContent).toContain('#let exercise-header(content)');
			expect(result.typstContent).toContain('sticky: true,');
			expect(result.typstContent).toContain('#exercise-header[');
		});
	});

	describe('worksheet types', () => {
		it('generates exam with answer spaces', () => {
			const generator = new WorksheetGenerator(createMockConfig());
			const result = generator.generate({
				worksheet: createMockWorksheet({ type: 'exam' }),
				instance: createMockInstance()
			});

			// Exams should have answer spaces
			expect(result.typstContent).toContain('rect');
			expect(result.typstContent).toContain('dashed');
		});

		it('generates assessment with answer spaces', () => {
			const generator = new WorksheetGenerator(createMockConfig());
			const result = generator.generate({
				worksheet: createMockWorksheet({ type: 'assessment' }),
				instance: createMockInstance()
			});

			// Assessments should have answer spaces like exams
			expect(result.typstContent).toContain('rect');
		});
	});
});

describe('generateWorksheetTypst (legacy function)', () => {
	it('produces same output as WorksheetGenerator', () => {
		const worksheet = createMockWorksheet();
		const instance = createMockInstance();
		const config = createMockConfig();

		// Using the class
		const generator = new WorksheetGenerator(config, undefined, { mode: 'worksheet' });
		const classResult = generator.generate({ worksheet, instance });

		// Using the legacy function
		const legacyResult = generateWorksheetTypst({
			worksheet,
			instance,
			config,
			mode: 'worksheet'
		});

		// Both should produce similar content (class returns GenerateResult, legacy returns string)
		expect(classResult.typstContent).toBe(legacyResult);
	});

	it('supports studentName and className parameters', () => {
		const result = generateWorksheetTypst({
			worksheet: createMockWorksheet(),
			instance: createMockInstance(),
			config: createMockConfig(),
			mode: 'worksheet',
			studentName: 'Marie Dupont',
			className: 'Classe 4A'
		});

		expect(result).toContain('Marie Dupont');
		expect(result).toContain('Classe 4A');
	});

	it('supports correction mode', () => {
		const result = generateWorksheetTypst({
			worksheet: createMockWorksheet(),
			instance: createMockInstance(),
			config: createMockConfig(),
			mode: 'correction'
		});

		expect(result).toContain('CORRECTION');
		expect(result).toContain('Solution');
	});
});

describe('generateBatchTypst', () => {
	it('generates multiple worksheets with page breaks', () => {
		const worksheet = createMockWorksheet();
		const config = createMockConfig();

		const instances = [
			{ instance: createMockInstance(), studentName: 'Student 1', studentId: 's1' },
			{ instance: createMockInstance(), studentName: 'Student 2', studentId: 's2' },
			{ instance: createMockInstance(), studentName: 'Student 3', studentId: 's3' }
		];

		const result = generateBatchTypst(worksheet, instances, config, 'worksheet');

		expect(result).toContain('Student 1');
		expect(result).toContain('Student 2');
		expect(result).toContain('Student 3');
		expect(result).toContain('#pagebreak()');
	});

	it('removes duplicate setup sections', () => {
		const worksheet = createMockWorksheet();
		const config = createMockConfig();

		const instances = [
			{ instance: createMockInstance(), studentName: 'Student 1', studentId: 's1' },
			{ instance: createMockInstance(), studentName: 'Student 2', studentId: 's2' }
		];

		const result = generateBatchTypst(worksheet, instances, config, 'worksheet');

		// Count occurrences of "// Document Setup" - should only appear once
		const setupMatches = result.match(/\/\/ Document Setup/g);
		expect(setupMatches?.length || 0).toBeLessThanOrEqual(1);
	});
});
