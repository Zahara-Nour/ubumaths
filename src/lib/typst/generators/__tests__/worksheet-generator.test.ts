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
import { WorksheetGenerator, generateWorksheetTypst } from '../worksheet-generator';
import { DEFAULT_TEMPLATES, DEFAULT_TEMPLATE_IDS } from '../../templates/default-templates';
import { exerciseBadge } from '../../worksheet-palette';
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
	config: { show_points: true },
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

// Le type décide de l'en-tête (ADR 0030) : seule l'option des points reste
const createMockConfig = (overrides?: Partial<WorksheetConfig>): WorksheetConfig => ({
	show_points: true,
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
				worksheet: createMockWorksheet({ template_id: DEFAULT_TEMPLATE_IDS.standard }),
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
		it.each(DEFAULT_TEMPLATES.map((t) => [t.name, t.template_content]))(
			'place le bandeau CORRECTION après la mise en page du modèle « %s »',
			(_name, templateContent) => {
				const generator = new WorksheetGenerator(createMockConfig(), {}, { mode: 'correction' });
				const result = generator.generate({
					worksheet: createMockWorksheet(),
					instance: createMockInstance(),
					template: {
						id: 't',
						name: 'T',
						description: null,
						template_content: templateContent,
						placeholders: [],
						created_by: 'teacher-id',
						created_at: '2024-01-01',
						updated_at: '2024-01-01'
					}
				});
				const content = result.typstContent;
				// Un `#set page` APRÈS du contenu ouvre une nouvelle page : le bandeau
				// placé avant restait seul sur une page 1 vide.
				const banner = content.indexOf('CORRECTION');
				expect(banner).toBeGreaterThan(-1);
				expect(content.lastIndexOf('#set page(')).toBeLessThan(banner);
			}
		);

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

			// Le corrigé ne répète plus l'énoncé : la correction seule
			expect(result.typstContent).toContain('x = 2');
			expect(result.typstContent).toContain('17');
			expect(result.typstContent).not.toContain('Solve for x');
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

		it("fiche d'exercices : le gabarit ne reçoit que le titre (ADR 0030)", () => {
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
			const generator = new WorksheetGenerator(createMockConfig(), undefined, {
				studentName: 'Jean Dupont',
				className: 'Classe 3B'
			});

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
			// Le titre s'imprime toujours.
			expect(result.typstContent).toContain('*Titre :* My Title');
		});

		it('évaluation écrite : date à remplir et classe dans le gabarit', () => {
			const conditionalTemplate: WorksheetTemplateRow = {
				...mockTemplate,
				template_content: `[{{#if show_date}}*Date :* {{date}}{{/if}}]
[{{#if show_class}}*Classe :* {{class}}{{/if}}]
{{exercises}}`
			};
			const generator = new WorksheetGenerator({}, undefined, { className: 'Classe 3B' });

			const result = generator.generate({
				worksheet: createMockWorksheet({ type: 'assessment' }),
				instance: createMockInstance(),
				template: conditionalTemplate
			});

			expect(result.typstContent).toContain('Date :');
			expect(result.typstContent).toContain('*Classe :* #"Classe 3B";');
		});

		it('writes the chrome in English when the worksheet is', () => {
			const generator = new WorksheetGenerator(createMockConfig({ language: 'en' }), undefined, {
				studentName: 'John Smith',
				className: 'Year 10'
			});

			const result = generator.generate({
				worksheet: createMockWorksheet({
					type: 'exam',
					template_id: DEFAULT_TEMPLATE_IDS.exam,
					estimated_duration_minutes: 50
				}),
				instance: createMockInstance()
			});

			expect(result.typstContent).toContain('Surname');
			expect(result.typstContent).toContain('Duration');
			expect(result.typstContent).toContain('Exercise 1');
			// No French label left behind.
			expect(result.typstContent).not.toContain('Nom :');
			expect(result.typstContent).not.toContain('Classe :');
			expect(result.typstContent).not.toContain('Exercice ');
			expect(result.typstContent).not.toContain('Duree');
			expect(result.typstContent).not.toContain('Bareme');
		});

		it('keeps the French chrome when no language is set', () => {
			const generator = new WorksheetGenerator(createMockConfig(), undefined, {
				studentName: 'Jean Dupont',
				className: '3B'
			});

			const result = generator.generate({
				worksheet: createMockWorksheet({
					type: 'assessment',
					template_id: DEFAULT_TEMPLATE_IDS.standard
				}),
				instance: createMockInstance()
			});

			expect(result.typstContent).toContain('*Nom :*');
			expect(result.typstContent).toContain('Exercice 1');
		});

		it('names the correction in the document language', () => {
			const generator = new WorksheetGenerator(createMockConfig({ language: 'en' }), undefined, {
				mode: 'correction'
			});

			const result = generator.generate({
				worksheet: createMockWorksheet(),
				instance: createMockInstance()
			});

			// « ANSWERS » nomme le PDF des réponses seules
			expect(result.typstContent).toContain('SOLUTIONS');
			expect(result.typstContent).not.toContain('CORRECTION');
		});

		it('feeds templates the labels and the typst lang', () => {
			const labelTemplate: WorksheetTemplateRow = {
				...mockTemplate,
				template_content: `#set text(lang: "{{lang}}")
*{{label_name}} :* {{student_name}}
*{{label_date}} :* {{date}}
{{label_daily_exercises}}
{{exercises}}`
			};
			const generator = new WorksheetGenerator(createMockConfig({ language: 'en' }), undefined, {
				studentName: 'John Smith'
			});

			const result = generator.generate({
				worksheet: createMockWorksheet(),
				instance: createMockInstance(),
				template: labelTemplate
			});

			expect(result.typstContent).toContain('#set text(lang: "en")');
			expect(result.typstContent).toContain('*Surname :* #"John Smith";');
			expect(result.typstContent).toContain("Today's exercises");
		});

		it('uses the translated worksheet title on an English sheet', () => {
			const generator = new WorksheetGenerator(createMockConfig({ language: 'en' }));

			const result = generator.generate({
				worksheet: createMockWorksheet({
					title: 'Fonctions du second degré',
					translations: { en: { title: 'Quadratic functions' } }
				}),
				instance: createMockInstance()
			});

			expect(result.typstContent).toContain('Quadratic functions');
			expect(result.typstContent).not.toContain('Fonctions du second degré');
		});

		it('falls back to the French title when it is not translated', () => {
			const generator = new WorksheetGenerator(createMockConfig({ language: 'en' }));

			const result = generator.generate({
				worksheet: createMockWorksheet({ title: 'Fonctions du second degré' }),
				instance: createMockInstance()
			});

			// A missing translation must not leave a hole in the document.
			expect(result.typstContent).toContain('Fonctions du second degré');
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

		it('numbers exercises with an amber badge when the template uses {{exercises_badge}}', () => {
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

			// Numéro en blanc sur carré ambre tirant sur le rouge, sans « Exercice N »
			expect(result.typstContent).toContain(
				'box(fill: rgb("#e8590c"), radius: 3pt, inset: (x: 6pt, y: 3pt))[#text(fill: white, weight: "bold")[1]]'
			);
			expect(result.typstContent).not.toContain('rgb("#dc2626")');
			expect(result.typstContent).toContain('Equation lineaire');
			expect(result.typstContent).not.toContain('Exercice 1');
			expect(result.typstContent).not.toContain('{{exercises_badge}}');
		});

		it('centres the exercise title vertically on its badge', () => {
			const badgeTemplate: WorksheetTemplateRow = {
				...mockTemplate,
				template_content: '{{exercises_badge}}'
			};
			const generator = new WorksheetGenerator(createMockConfig());
			const result = generator.generate({
				worksheet: createMockWorksheet(),
				instance: createMockInstance(),
				template: badgeTemplate
			});

			// Badge et titre dans deux cellules d'une grille alignée `horizon` :
			// posés en ligne, le titre suivait la ligne de base et paraissait décalé.
			const header = result.typstContent.match(
				/#grid\(\n\s+columns: \(auto, 1fr, auto\),[\s\S]*?\n\s+\)/
			);
			expect(header?.[0]).toContain('align: horizon');
			expect(header?.[0]).toContain('rgb("#e8590c")');
			expect(header?.[0]).toContain('Equation lineaire');
		});

		it('keeps the statement close to its badge header', () => {
			const badgeTemplate: WorksheetTemplateRow = {
				...mockTemplate,
				template_content: '{{exercises_badge}}'
			};
			const generator = new WorksheetGenerator(createMockConfig());
			const result = generator.generate({
				worksheet: createMockWorksheet(),
				instance: createMockInstance(),
				template: badgeTemplate
			});

			// Sans `above` explicite, l'énoncé héritait de l'espacement entre
			// exercices (1,8em) et flottait loin de son titre.
			const content = result.typstContent;
			const statementAt = content.indexOf('Solve for x');
			const statementBlock = content.slice(
				content.lastIndexOf('#block(', statementAt),
				statementAt
			);
			expect(statementBlock).toContain('above: 0.5em');
		});

		it('frames the « Moderne » score box in the amber of the badges, not the old red', () => {
			const modern = DEFAULT_TEMPLATES.find((t) => t.name === 'Moderne');

			expect(modern?.template_content).toContain('stroke: 2pt + rgb("#e8590c")');
			expect(modern?.template_content).not.toContain('#dc2626');
		});

		it('keeps the statement close to its heading header too ({{exercises}})', () => {
			const generator = new WorksheetGenerator(createMockConfig());
			const result = generator.generate({
				worksheet: createMockWorksheet(),
				instance: createMockInstance(),
				template: { ...mockTemplate, template_content: '{{exercises}}' }
			});

			// Même défaut qu'avec le badge : le bloc de l'énoncé héritait de l'espacement
			// entre blocs du modèle (souvent 1,8em) et flottait loin de « Exercice N ».
			const content = result.typstContent;
			expect(content).toContain('Exercice 1');
			const statementAt = content.indexOf('Solve for x');
			const statementBlock = content.slice(
				content.lastIndexOf('#block(', statementAt),
				statementAt
			);
			expect(statementBlock).toContain('above: 0.5em');
		});
	});

	describe('numbering styles', () => {
		it('uses numeric numbering by default', () => {
			const generator = new WorksheetGenerator(createMockConfig());
			const result = generator.generate({
				worksheet: createMockWorksheet({ template_id: DEFAULT_TEMPLATE_IDS.standard }),
				instance: createMockInstance()
			});

			expect(result.typstContent).toContain('Exercice 1');
			expect(result.typstContent).toContain('Exercice 2');
		});

		it('numérotation toujours en chiffres arabes, même avec l’ancienne clé (ADR 0030)', () => {
			const generator = new WorksheetGenerator({
				numbering_style: 'roman'
			} as WorksheetConfig);
			const result = generator.generate({
				worksheet: createMockWorksheet({ template_id: DEFAULT_TEMPLATE_IDS.standard }),
				instance: createMockInstance()
			});

			expect(result.typstContent).toContain('Exercice 1');
			expect(result.typstContent).not.toContain('Exercice I');
		});
	});

	describe('exercise metadata', () => {
		it('shows the points set on the exercise, not its position', () => {
			const generator = new WorksheetGenerator(createMockConfig());
			const instance = createMockInstance();
			// 1st exercise (position 1) worth 5 points, 2nd (position 2) worth 1
			instance.exercises[0].points = 5;
			instance.exercises[1].points = 1;

			// Évaluation écrite, points cochés (ADR 0030 : le type décide, pas le style)
			const result = generator.generate({
				worksheet: createMockWorksheet({
					type: 'assessment',
					template_id: DEFAULT_TEMPLATE_IDS.standard
				}),
				instance
			});

			// Libellé de documentLabels : « 1 pt », « 5 pts » (ADR 0028, lot 1)
			expect(result.typstContent).toContain(')[5 pts]');
			expect(result.typstContent).toContain(')[1 pt]');
			expect(result.typstContent).not.toContain(')[2 pts]');
		});

		it('omits the points badge when the exercise has none', () => {
			const generator = new WorksheetGenerator(createMockConfig());
			const result = generator.generate({
				worksheet: createMockWorksheet(),
				instance: createMockInstance()
			});

			expect(result.typstContent).not.toMatch(/\)\[\d+ pts?\]/);
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
			// Le style ambre est réservé aux modèles à carrés numérotés
			expect(result.typstContent).not.toMatch(/#e8590c|#fc8f1b/);
		});

		it('marks sections with an amber small-caps title and rule in badge templates', () => {
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
					template_content: '{{exercises_badge}}',
					placeholders: [],
					created_by: 'teacher-id',
					created_at: '2024-01-01',
					updated_at: '2024-01-01'
				}
			});

			const content = result.typstContent;
			expect(content).toContain(
				'#text(fill: rgb("#fc8f1b"), weight: "bold", size: 1.15em)[#smallcaps[Calculs]]'
			);
			expect(content).toContain('#line(length: 100%, stroke: 1.2pt + rgb("#fc8f1b"))');
			expect(content).toContain('Sans calculatrice.');
			// Le titre de section ne reste jamais seul en bas de colonne,
			// et il précède bien son premier exercice
			const sectionAt = content.indexOf('#smallcaps[Calculs]');
			const sectionBlock = content.slice(content.lastIndexOf('#block(', sectionAt), sectionAt);
			expect(sectionBlock).toContain('sticky: true');
			// Nette cassure avec la section précédente : plus d'espace avant une
			// section qu'entre deux exercices (1,8em)
			expect(sectionBlock).toContain('above: 3.5em');
			expect(sectionAt).toBeLessThan(content.indexOf('Equation lineaire'));
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
			// Énoncé dans un bloc à part, juste après l'en-tête ; il commence par l'en-tête
			// de lisibilité (règles et fonctions, sans contenu), puis le texte
			expect(result.typstContent).toMatch(
				/\]\n#block\(width: 100%, inset: 0pt, above: 0\.5em\)\[\n {2}#show math\.equation[\s\S]*?\/\/ ubumark: fin de l’en-tête\n\s*Solve for x/
			);
		});

		it('without a template, the « Fiche élève » badge header is sticky too', () => {
			const generator = new WorksheetGenerator(createMockConfig());
			const result = generator.generate({
				worksheet: createMockWorksheet(),
				instance: createMockInstance()
			});

			expect(result.typstContent).toContain(
				`#block(width: 100%, inset: 0pt, sticky: true, below: 0.3em)[\n  #grid(`
			);
			expect(result.typstContent).toContain(exerciseBadge('1'));
		});
	});

	describe('worksheet types', () => {
		it.each(['exam', 'assessment'] as const)(
			'%s : cadre de réponse seulement avec « réponses sur le sujet »',
			(type) => {
				const generate = (config: WorksheetConfig) =>
					new WorksheetGenerator(config).generate({
						worksheet: createMockWorksheet({ type }),
						instance: createMockInstance()
					}).typstContent;

				expect(generate(createMockConfig({ answers_on_sheet: true }))).toContain('dashed');
				expect(generate(createMockConfig())).not.toContain('dashed');
			}
		);
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
			worksheet: createMockWorksheet({ type: 'assessment' }),
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
		expect(result).toContain('x = 2');
	});
});

// Fonctions déclarées par l'exercice (`exercises.generic_functions`) : sans elles,
// `C'(x)` s'imprimait en rouge « Unexpected token: ' » dans l'énoncé ET le corrigé.
describe('fonctions déclarées de l’exercice', () => {
	const instanceWithC = (genericFunctions: string[] | null | undefined): InstanceData =>
		createMockInstance({
			exercises: [
				{
					exercise_id: 'ex-c',
					title: 'Coût de fabrication',
					position: 1,
					parameters: {},
					statement: "Calculer ~C'(x)~.",
					solution: "On trouve ~C'(x)=2x~.",
					generic_functions: genericFunctions
				}
			]
		});

	const render = (
		instance: InstanceData,
		withTemplate: boolean,
		mode: 'worksheet' | 'correction' = 'correction'
	): string =>
		generateWorksheetTypst({
			worksheet: createMockWorksheet(),
			instance,
			config: createMockConfig(),
			mode,
			template: withTemplate
				? {
						id: 'tpl',
						name: 'tpl',
						description: null,
						template_content: DEFAULT_TEMPLATES[0].template_content,
						placeholders: [],
						created_by: null,
						created_at: '2024-01-01',
						updated_at: '2024-01-01'
					}
				: null
		});

	it.each([
		['sans modèle', false],
		['avec modèle', true]
	])('énoncé et corrigé sans erreur quand C est déclaré (%s)', (_label, withTemplate) => {
		// Énoncé sur la fiche, correction dans le corrigé (qui ne répète plus l'énoncé)
		const sheet = render(instanceWithC(['C']), withTemplate, 'worksheet');
		const correction = render(instanceWithC(['C']), withTemplate);
		for (const typst of [sheet, correction]) expect(typst).not.toContain('Unexpected token');
		expect(sheet).toContain('Calculer');
		expect(correction).toContain('On trouve');
	});

	it('sans déclaration, C reste une variable : l’erreur apparaît (témoin)', () => {
		expect(render(instanceWithC(undefined), false)).toContain('Unexpected token');
	});
});

// Sens de deux majuscules collées (lot 6 des longueurs, Q-J) : résolu à la génération de
// l'instance depuis le thème de l'exercice et copié dessus ; absent (instance d'avant) :
// produit, l'écriture d'avant (Q-L).
describe('sens de AB de l’exercice (capital_pairs)', () => {
	const instanceWithPrimes = (capitalPairs: 'length' | 'product' | undefined): InstanceData =>
		createMockInstance({
			exercises: [
				{
					exercise_id: 'ex-ab',
					title: 'Thalès',
					position: 1,
					parameters: {},
					statement: "Calculer ~A'B'~.",
					solution: "On trouve ~A'B'=5~.",
					...(capitalPairs && { capital_pairs: capitalPairs })
				}
			]
		});

	const render = (instance: InstanceData): string =>
		generateWorksheetTypst({
			worksheet: createMockWorksheet(),
			instance,
			config: createMockConfig(),
			mode: 'correction',
			template: null
		});

	it('longueur : énoncé et corrigé sans erreur', () => {
		const typst = render(instanceWithPrimes('length'));
		expect(typst).not.toContain('Unexpected token');
		expect(typst).toContain('On trouve');
	});

	it('absent ou produit : écriture d’avant, identique (témoin)', () => {
		const before = render(instanceWithPrimes(undefined));
		expect(before).toContain('Unexpected token');
		expect(render(instanceWithPrimes('product'))).toBe(before);
	});
});

// Accessibilité (élèves malvoyants, 2026-10-16) : le gabarit grandit, les exercices suivent
describe('taille du texte', () => {
	const generate = (textSize?: 'normal' | 'large' | 'x_large', templateId: string | null = null) =>
		new WorksheetGenerator(createMockConfig(), undefined, undefined, { textSize }).generate({
			worksheet: createMockWorksheet({ template_id: templateId }),
			instance: createMockInstance()
		}).typstContent;

	it('sans réglage : « Fiche élève » à 10 pt sur deux colonnes, comme avant', () => {
		const typst = generate();
		expect(typst).toContain('size: 10pt, lang:');
		expect(typst).toContain('columns: 2,');
	});

	it('grande : 14 pt, deux colonnes gardées, exercices compris', () => {
		const typst = generate('large');
		expect(typst).toContain('size: 14pt, lang:');
		expect(typst).toContain('columns: 2,');
		expect(typst).toContain('2x + 3 = 7');
	});

	it('très grande : 18 pt', () => {
		expect(generate('x_large')).toContain('size: 18pt, lang:');
	});

	it('un autre style grandit aussi (Standard, 11 pt → 15,4 pt)', () => {
		const typst = generate('large', DEFAULT_TEMPLATE_IDS.standard);
		expect(typst).toContain('size: 15.4pt');
		expect(typst).not.toContain('size: 11pt');
	});

	// Styles qui posent leurs colonnes dans le corps (`#columns(N)[…]`) : elles restent
	it.each([
		['Deux colonnes', DEFAULT_TEMPLATE_IDS.twoColumns, '#columns(2'],
		['Paysage', DEFAULT_TEMPLATE_IDS.landscape, '#columns(3']
	])('style « %s » en grande taille : ses colonnes restent', (_, templateId, columns) => {
		expect(generate('x_large', templateId)).toContain(columns);
	});

	it('la fonction héritée transmet la taille', () => {
		const typst = generateWorksheetTypst({
			worksheet: createMockWorksheet(),
			instance: createMockInstance(),
			config: createMockConfig(),
			mode: 'worksheet',
			textSize: 'x_large'
		});
		expect(typst).toContain('size: 18pt, lang:');
	});
});
