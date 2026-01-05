/**
 * Markdown Frontmatter Tests - Exercise Import/Export
 * ====================================================
 *
 * Unit tests for markdown frontmatter parsing and serialization.
 */

import { describe, it, expect } from 'vitest';
import { parseMarkdownWithFrontmatter, serializeToMarkdown } from './markdown-frontmatter';
import type { ExerciseExport } from './types';

describe('parseMarkdownWithFrontmatter', () => {
	it('should parse valid markdown with frontmatter', () => {
		const markdown = `---
version: "1.0"
difficulty: 2
tags:
  - algèbre
  - équations
title: "Test Exercise"
source: "Test Book"
---

# Énoncé

Résoudre $x^2 = 4$

# Solution

$x = \\pm 2$
`;

		const result = parseMarkdownWithFrontmatter(markdown);

		expect(result.success).toBe(true);
		expect(result.data).toBeDefined();
		expect(result.data?.version).toBe('1.0');
		expect(result.data?.difficulty).toBe(2);
		expect(result.data?.tags).toEqual(['algèbre', 'équations']);
		expect(result.data?.title).toBe('Test Exercise');
		expect(result.data?.source).toBe('Test Book');
		expect(result.data?.statement_md).toBe('Résoudre $x^2 = 4$');
		expect(result.data?.solution_md).toBe('$x = \\pm 2$');
	});

	it('should parse markdown with only required fields', () => {
		const markdown = `---
version: "1.0"
difficulty: 1
tags: []
---

# Énoncé

Simple question

# Solution

Simple answer
`;

		const result = parseMarkdownWithFrontmatter(markdown);

		expect(result.success).toBe(true);
		expect(result.data?.difficulty).toBe(1);
		expect(result.data?.tags).toEqual([]);
		expect(result.data?.statement_md).toBe('Simple question');
		expect(result.data?.solution_md).toBe('Simple answer');
	});

	it('should handle multiline statement and solution', () => {
		const markdown = `---
version: "1.0"
difficulty: 2
tags: []
---

# Énoncé

Line 1 of statement
Line 2 with $x^2$
Line 3 continues

# Solution

Line 1 of solution
Line 2 with formula
Line 3 ends here
`;

		const result = parseMarkdownWithFrontmatter(markdown);

		expect(result.success).toBe(true);
		expect(result.data?.statement_md).toContain('Line 1 of statement');
		expect(result.data?.statement_md).toContain('Line 2 with $x^2$');
		expect(result.data?.solution_md).toContain('Line 1 of solution');
		expect(result.data?.solution_md).toContain('Line 3 ends here');
	});

	it('should handle optional fields in frontmatter', () => {
		const markdown = `---
version: "1.0"
difficulty: 3
tags:
  - algèbre
title: "Advanced Algebra"
source: "Algebra Book"
grades:
  - "2"
  - "1"
topic: "Algèbre avancée"
---

# Énoncé

Complex algebra problem

# Solution

Detailed solution
`;

		const result = parseMarkdownWithFrontmatter(markdown);

		expect(result.success).toBe(true);
		expect(result.data?.grades).toEqual(['2', '1']);
		expect(result.data?.topic).toBe('Algèbre avancée');
	});

	it('should reject markdown without frontmatter delimiter', () => {
		const markdown = `# Énoncé

Test

# Solution

Answer
`;

		const result = parseMarkdownWithFrontmatter(markdown);

		expect(result.success).toBe(false);
		expect(result.error).toBeDefined();
		expect(result.error).toContain('frontmatter');
	});

	it('should reject markdown with invalid YAML', () => {
		const markdown = `---
version: 1.0
difficulty: invalid yaml [[[
---

# Énoncé

Test

# Solution

Answer
`;

		const result = parseMarkdownWithFrontmatter(markdown);

		expect(result.success).toBe(false);
		expect(result.error).toBeDefined();
	});

	it('should reject markdown missing Énoncé section', () => {
		const markdown = `---
version: "1.0"
difficulty: 2
tags: []
---

# Solution

Answer only
`;

		const result = parseMarkdownWithFrontmatter(markdown);

		expect(result.success).toBe(false);
		expect(result.error).toBeDefined();
		expect(result.error).toContain('Énoncé');
	});

	it('should reject markdown missing Solution section', () => {
		const markdown = `---
version: "1.0"
difficulty: 2
tags: []
---

# Énoncé

Question only
`;

		const result = parseMarkdownWithFrontmatter(markdown);

		expect(result.success).toBe(false);
		expect(result.error).toBeDefined();
		expect(result.error).toContain('Solution');
	});

	it('should reject markdown with invalid difficulty in frontmatter', () => {
		const markdown = `---
version: "1.0"
difficulty: 5
tags: []
---

# Énoncé

Test

# Solution

Answer
`;

		const result = parseMarkdownWithFrontmatter(markdown);

		expect(result.success).toBe(false);
		expect(result.error).toBeDefined();
	});

	it('should handle empty content between sections', () => {
		const markdown = `---
version: "1.0"
difficulty: 1
tags: []
---

# Énoncé


# Solution


`;

		const result = parseMarkdownWithFrontmatter(markdown);

		expect(result.success).toBe(false);
		expect(result.error).toBeDefined();
		expect(result.error).toContain('empty');
	});

	it('should preserve LaTeX formatting', () => {
		const markdown = `---
version: "1.0"
difficulty: 2
tags: []
---

# Énoncé

Calculate $$\\int_0^\\pi \\sin(x) dx$$

# Solution

The result is $2$
`;

		const result = parseMarkdownWithFrontmatter(markdown);

		expect(result.success).toBe(true);
		expect(result.data?.statement_md).toContain('$$\\int_0^\\pi \\sin(x) dx$$');
		expect(result.data?.solution_md).toContain('$2$');
	});
});

describe('serializeToMarkdown', () => {
	it('should serialize minimal exercise to markdown', () => {
		const exercise: ExerciseExport = {
			version: '1.0',
			difficulty: 1,
			tags: [],
			statement_md: 'Simple question',
			solution_md: 'Simple answer'
		};

		const markdown = serializeToMarkdown(exercise);

		expect(markdown).toContain('---');
		expect(markdown).toContain('version: "1.0"');
		expect(markdown).toContain('difficulty: 1');
		expect(markdown).toContain('tags: []');
		expect(markdown).toContain('# Énoncé');
		expect(markdown).toContain('Simple question');
		expect(markdown).toContain('# Solution');
		expect(markdown).toContain('Simple answer');
	});

	it('should serialize complete exercise to markdown', () => {
		const exercise: ExerciseExport = {
			version: '1.0',
			difficulty: 2,
			tags: ['algèbre', 'équations'],
			statement_md: 'Résoudre $x^2 = 4$',
			solution_md: '$x = \\pm 2$',
			title: 'Équation du second degré',
			source: 'Livre de maths',
			grades: ['3', '2'],
			topic: 'Algèbre'
		};

		const markdown = serializeToMarkdown(exercise);

		// YAML may or may not quote strings depending on content
		expect(markdown).toContain('title:');
		expect(markdown).toContain('Équation du second degré');
		expect(markdown).toContain('source:');
		expect(markdown).toContain('Livre de maths');
		expect(markdown).toContain('topic:');
		expect(markdown).toContain('Algèbre');
		expect(markdown).toContain('- algèbre');
		expect(markdown).toContain('- équations');
	});

	it('should preserve LaTeX in serialized markdown', () => {
		const exercise: ExerciseExport = {
			version: '1.0',
			difficulty: 2,
			tags: [],
			statement_md: 'Calculate $$\\int_0^\\pi \\sin(x) dx$$',
			solution_md: 'The result is $2$'
		};

		const markdown = serializeToMarkdown(exercise);

		expect(markdown).toContain('$$\\int_0^\\pi \\sin(x) dx$$');
		expect(markdown).toContain('$2$');
	});

	it('should handle multiline content', () => {
		const exercise: ExerciseExport = {
			version: '1.0',
			difficulty: 1,
			tags: [],
			statement_md: 'Line 1\nLine 2\nLine 3',
			solution_md: 'Answer line 1\nAnswer line 2'
		};

		const markdown = serializeToMarkdown(exercise);

		expect(markdown).toContain('Line 1\nLine 2\nLine 3');
		expect(markdown).toContain('Answer line 1\nAnswer line 2');
	});
});

describe('round-trip serialization', () => {
	it('should parse and serialize to same content', () => {
		const original: ExerciseExport = {
			version: '1.0',
			difficulty: 2,
			tags: ['test', 'round-trip'],
			statement_md: 'Test question with $x^2$',
			solution_md: 'Test answer',
			title: 'Round Trip Test',
			source: 'Test Source',
			grades: ['3'],
			topic: 'Testing'
		};

		// Serialize to markdown
		const markdown = serializeToMarkdown(original);

		// Parse back
		const result = parseMarkdownWithFrontmatter(markdown);

		expect(result.success).toBe(true);
		// Compare only the defined fields from original
		expect(result.data?.version).toBe(original.version);
		expect(result.data?.difficulty).toBe(original.difficulty);
		expect(result.data?.tags).toEqual(original.tags);
		expect(result.data?.statement_md).toBe(original.statement_md);
		expect(result.data?.solution_md).toBe(original.solution_md);
		expect(result.data?.title).toBe(original.title);
		expect(result.data?.source).toBe(original.source);
		expect(result.data?.grades).toEqual(original.grades);
		expect(result.data?.topic).toBe(original.topic);
	});

	it('should handle round-trip with minimal data', () => {
		const original: ExerciseExport = {
			version: '1.0',
			difficulty: 1,
			tags: [],
			statement_md: 'Q',
			solution_md: 'A'
		};

		const markdown = serializeToMarkdown(original);
		const result = parseMarkdownWithFrontmatter(markdown);

		expect(result.success).toBe(true);
		// Check only the fields that should be present
		expect(result.data?.version).toBe(original.version);
		expect(result.data?.difficulty).toBe(original.difficulty);
		expect(result.data?.tags).toEqual(original.tags);
		expect(result.data?.statement_md).toBe(original.statement_md);
		expect(result.data?.solution_md).toBe(original.solution_md);
		// Optional fields should be undefined
		expect(result.data?.title).toBeUndefined();
		expect(result.data?.source).toBeUndefined();
	});
});
