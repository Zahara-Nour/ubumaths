/**
 * Tests for the Typst template placeholder engine, in particular the
 * `{{#if key}}...{{/if}}` conditionals that make worksheet display options
 * (show_date, show_class, ...) effective in template mode.
 */
import { describe, expect, it } from 'vitest';
import { DEFAULT_TEMPLATES, renderTemplate, SAMPLE_PREVIEW_DATA } from '../default-templates';

describe('renderTemplate placeholders', () => {
	it('replaces every occurrence of a placeholder', () => {
		expect(renderTemplate('{{title}} / {{title}}', { title: 'Fractions' })).toBe(
			'Fractions / Fractions'
		);
	});

	it('leaves Typst math untouched', () => {
		const template = '{{#if show_date}}*Date :* {{date}}{{/if}} $x^2 + 1$';

		expect(renderTemplate(template, { show_date: 'true', date: '2 septembre 2026' })).toBe(
			'*Date :* 2 septembre 2026 $x^2 + 1$'
		);
	});
});

describe('renderTemplate conditionals', () => {
	it('keeps the body when the flag is truthy', () => {
		expect(
			renderTemplate('[{{#if show_date}}*Date :* {{date}}{{/if}}]', {
				show_date: 'true',
				date: '2 septembre 2026'
			})
		).toBe('[*Date :* 2 septembre 2026]');
	});

	it('drops the label along with the value when the flag is false', () => {
		expect(
			renderTemplate('[{{#if show_date}}*Date :* {{date}}{{/if}}]', {
				show_date: '',
				date: '2 septembre 2026'
			})
		).toBe('[]');
	});

	it('treats a missing flag and the string "false" as falsy', () => {
		expect(renderTemplate('[{{#if show_class}}*Classe :* {{class}}{{/if}}]', {})).toBe('[]');
		expect(
			renderTemplate('[{{#if show_class}}*Classe :* {{class}}{{/if}}]', { show_class: 'false' })
		).toBe('[]');
	});

	it('resolves independent blocks independently', () => {
		const template =
			'[{{#if show_student_name}}Nom : {{student_name}}{{/if}}][{{#if show_class}}Classe : {{class}}{{/if}}]';

		expect(
			renderTemplate(template, {
				show_student_name: 'true',
				student_name: 'Jean',
				show_class: '',
				class: '3eme B'
			})
		).toBe('[Nom : Jean][]');
	});

	it('resolves nested blocks from the inside out', () => {
		const template = '{{#if show_points}}Bareme{{#if show_date}} du {{date}}{{/if}}{{/if}}';

		expect(
			renderTemplate(template, { show_points: 'true', show_date: 'true', date: 'lundi' })
		).toBe('Bareme du lundi');
		expect(renderTemplate(template, { show_points: 'true', show_date: '', date: 'lundi' })).toBe(
			'Bareme'
		);
		expect(renderTemplate(template, { show_points: '', show_date: 'true', date: 'lundi' })).toBe(
			''
		);
	});

	it('leaves an unbalanced opening tag untouched instead of swallowing the document', () => {
		const template = '{{#if show_date}}*Date :* {{date}}\n\nExercices';

		expect(renderTemplate(template, { show_date: 'true', date: 'lundi' })).toBe(
			'{{#if show_date}}*Date :* lundi\n\nExercices'
		);
	});
});

describe('built-in templates and display options', () => {
	const VALUES = {
		title: 'ZZTITLE',
		date: 'ZZDATE',
		class: 'ZZCLASS',
		student_name: 'ZZSTUDENT',
		total_points: 'ZZPOINTS'
	};
	const FLAGS = ['show_title', 'show_date', 'show_class', 'show_student_name', 'show_points'];

	function render(templateContent: string, flagValue: string) {
		const data: Record<string, string> = { ...SAMPLE_PREVIEW_DATA, ...VALUES };
		for (const flag of FLAGS) data[flag] = flagValue;
		return renderTemplate(templateContent, data);
	}

	it.each(DEFAULT_TEMPLATES.map((t) => [t.name, t.template_content] as const))(
		'%s drops every gated value when the options are off',
		(_name, content) => {
			const rendered = render(content, '');

			for (const value of Object.values(VALUES)) {
				expect(rendered).not.toContain(value);
			}
		}
	);

	it.each(DEFAULT_TEMPLATES.map((t) => [t.name, t.template_content] as const))(
		'%s renders every gated value when the options are on',
		(_name, content) => {
			const rendered = render(content, 'true');

			// Not every template uses every field, but each one it does use must show.
			for (const [key, value] of Object.entries(VALUES)) {
				if (content.includes(`{{${key}}}`)) expect(rendered).toContain(value);
			}
		}
	);

	it.each(DEFAULT_TEMPLATES.map((t) => [t.name, t.template_content] as const))(
		'%s leaves no unresolved placeholder',
		(_name, content) => {
			for (const flagValue of ['', 'true']) {
				expect(render(content, flagValue)).not.toMatch(/\{\{/);
			}
		}
	);
});
