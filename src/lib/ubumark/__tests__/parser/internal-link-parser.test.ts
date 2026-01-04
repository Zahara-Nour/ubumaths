/**
 * Internal Link Parser Tests
 * ==========================
 *
 * Unit tests for parsing [[type:uuid|label]] syntax for internal resource links.
 */

import { describe, it, expect } from 'vitest';
import { parseMarkdown } from '../../parser/markdown-parser';

describe('parseMarkdown - internal link support', () => {
	// =========================================================================
	// Basic Parsing
	// =========================================================================

	it('should parse simple internal link to chapter', () => {
		const markdown = '[[chapter:550e8400-e29b-41d4-a716-446655440000|Chapitre Fractions]]';
		const ast = parseMarkdown(markdown);

		expect(ast.children).toHaveLength(1);
		expect(ast.children[0].type).toBe('paragraph');

		if (ast.children[0].type === 'paragraph') {
			const paragraph = ast.children[0];
			expect(paragraph.children).toHaveLength(1);
			expect(paragraph.children[0].type).toBe('internal-link');

			if (paragraph.children[0].type === 'internal-link') {
				expect(paragraph.children[0].referenceType).toBe('chapter');
				expect(paragraph.children[0].uuid).toBe('550e8400-e29b-41d4-a716-446655440000');
				expect(paragraph.children[0].label).toBe('Chapitre Fractions');
			}
		}
	});

	it('should parse internal link to document', () => {
		const markdown = '[[document:123e4567-e89b-12d3-a456-426614174000|Mon Document]]';
		const ast = parseMarkdown(markdown);

		expect(ast.children).toHaveLength(1);
		expect(ast.children[0].type).toBe('paragraph');

		if (ast.children[0].type === 'paragraph') {
			const paragraph = ast.children[0];
			expect(paragraph.children[0].type).toBe('internal-link');

			if (paragraph.children[0].type === 'internal-link') {
				expect(paragraph.children[0].referenceType).toBe('document');
				expect(paragraph.children[0].uuid).toBe('123e4567-e89b-12d3-a456-426614174000');
				expect(paragraph.children[0].label).toBe('Mon Document');
			}
		}
	});

	it('should parse internal link to exercise', () => {
		const markdown = '[[exercise:abcdef01-2345-6789-abcd-ef0123456789|Exercice 5]]';
		const ast = parseMarkdown(markdown);

		expect(ast.children).toHaveLength(1);
		expect(ast.children[0].type).toBe('paragraph');

		if (ast.children[0].type === 'paragraph') {
			const paragraph = ast.children[0];
			expect(paragraph.children[0].type).toBe('internal-link');

			if (paragraph.children[0].type === 'internal-link') {
				expect(paragraph.children[0].referenceType).toBe('exercise');
				expect(paragraph.children[0].uuid).toBe('abcdef01-2345-6789-abcd-ef0123456789');
				expect(paragraph.children[0].label).toBe('Exercice 5');
			}
		}
	});

	it('should parse internal link to assessment', () => {
		const markdown = '[[assessment:00000000-0000-0000-0000-000000000001|Evaluation finale]]';
		const ast = parseMarkdown(markdown);

		expect(ast.children).toHaveLength(1);
		expect(ast.children[0].type).toBe('paragraph');

		if (ast.children[0].type === 'paragraph') {
			const paragraph = ast.children[0];
			expect(paragraph.children[0].type).toBe('internal-link');

			if (paragraph.children[0].type === 'internal-link') {
				expect(paragraph.children[0].referenceType).toBe('assessment');
				expect(paragraph.children[0].uuid).toBe('00000000-0000-0000-0000-000000000001');
				expect(paragraph.children[0].label).toBe('Evaluation finale');
			}
		}
	});

	// =========================================================================
	// Case Insensitivity
	// =========================================================================

	it('should parse internal link with uppercase type', () => {
		const markdown = '[[CHAPTER:550e8400-e29b-41d4-a716-446655440000|Test]]';
		const ast = parseMarkdown(markdown);

		expect(ast.children).toHaveLength(1);
		expect(ast.children[0].type).toBe('paragraph');

		if (ast.children[0].type === 'paragraph') {
			const paragraph = ast.children[0];
			expect(paragraph.children[0].type).toBe('internal-link');

			if (paragraph.children[0].type === 'internal-link') {
				// Type should be normalized to lowercase
				expect(paragraph.children[0].referenceType).toBe('chapter');
			}
		}
	});

	it('should parse internal link with uppercase UUID', () => {
		const markdown = '[[chapter:550E8400-E29B-41D4-A716-446655440000|Test]]';
		const ast = parseMarkdown(markdown);

		expect(ast.children).toHaveLength(1);
		expect(ast.children[0].type).toBe('paragraph');

		if (ast.children[0].type === 'paragraph') {
			const paragraph = ast.children[0];
			expect(paragraph.children[0].type).toBe('internal-link');

			if (paragraph.children[0].type === 'internal-link') {
				// UUID should be normalized to lowercase
				expect(paragraph.children[0].uuid).toBe('550e8400-e29b-41d4-a716-446655440000');
			}
		}
	});

	// =========================================================================
	// Labels with Special Characters
	// =========================================================================

	it('should parse label with French accents', () => {
		const markdown = '[[chapter:550e8400-e29b-41d4-a716-446655440000|Equations du second degre]]';
		const ast = parseMarkdown(markdown);

		expect(ast.children).toHaveLength(1);
		expect(ast.children[0].type).toBe('paragraph');

		if (ast.children[0].type === 'paragraph') {
			const paragraph = ast.children[0];
			expect(paragraph.children[0].type).toBe('internal-link');

			if (paragraph.children[0].type === 'internal-link') {
				expect(paragraph.children[0].label).toBe('Equations du second degre');
			}
		}
	});

	it('should parse label with punctuation', () => {
		const markdown = '[[chapter:550e8400-e29b-41d4-a716-446655440000|Chapitre 1: Introduction!]]';
		const ast = parseMarkdown(markdown);

		expect(ast.children).toHaveLength(1);
		expect(ast.children[0].type).toBe('paragraph');

		if (ast.children[0].type === 'paragraph') {
			const paragraph = ast.children[0];
			expect(paragraph.children[0].type).toBe('internal-link');

			if (paragraph.children[0].type === 'internal-link') {
				expect(paragraph.children[0].label).toBe('Chapitre 1: Introduction!');
			}
		}
	});

	it('should parse label with numbers and special characters', () => {
		const markdown = '[[exercise:550e8400-e29b-41d4-a716-446655440000|Ex. 42 - (a + b)]]';
		const ast = parseMarkdown(markdown);

		expect(ast.children).toHaveLength(1);
		expect(ast.children[0].type).toBe('paragraph');

		if (ast.children[0].type === 'paragraph') {
			const paragraph = ast.children[0];
			expect(paragraph.children[0].type).toBe('internal-link');

			if (paragraph.children[0].type === 'internal-link') {
				expect(paragraph.children[0].label).toBe('Ex. 42 - (a + b)');
			}
		}
	});

	// =========================================================================
	// Context: Surrounded by Text
	// =========================================================================

	it('should parse internal link surrounded by text', () => {
		const markdown =
			'Voir le [[chapter:550e8400-e29b-41d4-a716-446655440000|Chapitre Fractions]] pour plus de details.';
		const ast = parseMarkdown(markdown);

		expect(ast.children).toHaveLength(1);
		expect(ast.children[0].type).toBe('paragraph');

		if (ast.children[0].type === 'paragraph') {
			const paragraph = ast.children[0];
			expect(paragraph.children).toHaveLength(3);

			// First: text before
			expect(paragraph.children[0].type).toBe('text');
			if (paragraph.children[0].type === 'text') {
				expect(paragraph.children[0].content).toBe('Voir le ');
			}

			// Second: internal link
			expect(paragraph.children[1].type).toBe('internal-link');
			if (paragraph.children[1].type === 'internal-link') {
				expect(paragraph.children[1].referenceType).toBe('chapter');
				expect(paragraph.children[1].label).toBe('Chapitre Fractions');
			}

			// Third: text after
			expect(paragraph.children[2].type).toBe('text');
			if (paragraph.children[2].type === 'text') {
				expect(paragraph.children[2].content).toBe(' pour plus de details.');
			}
		}
	});

	// =========================================================================
	// Multiple Internal Links
	// =========================================================================

	it('should parse multiple internal links', () => {
		const markdown =
			'[[chapter:550e8400-e29b-41d4-a716-446655440000|Chapitre 1]] et [[exercise:123e4567-e89b-12d3-a456-426614174000|Exercice 2]]';
		const ast = parseMarkdown(markdown);

		expect(ast.children).toHaveLength(1);
		expect(ast.children[0].type).toBe('paragraph');

		if (ast.children[0].type === 'paragraph') {
			const paragraph = ast.children[0];
			const internalLinks = paragraph.children.filter((n) => n.type === 'internal-link');
			expect(internalLinks).toHaveLength(2);

			if (internalLinks[0].type === 'internal-link' && internalLinks[1].type === 'internal-link') {
				expect(internalLinks[0].referenceType).toBe('chapter');
				expect(internalLinks[0].label).toBe('Chapitre 1');
				expect(internalLinks[1].referenceType).toBe('exercise');
				expect(internalLinks[1].label).toBe('Exercice 2');
			}
		}
	});

	// =========================================================================
	// Invalid Syntax (Should NOT Parse as Internal Link)
	// =========================================================================

	it('should NOT parse internal link with invalid type', () => {
		const markdown = '[[unknown:550e8400-e29b-41d4-a716-446655440000|Label]]';
		const ast = parseMarkdown(markdown);

		expect(ast.children).toHaveLength(1);
		expect(ast.children[0].type).toBe('paragraph');

		if (ast.children[0].type === 'paragraph') {
			const paragraph = ast.children[0];
			// Should NOT have internal-link node
			const internalLinkNode = paragraph.children.find((n) => n.type === 'internal-link');
			expect(internalLinkNode).toBeUndefined();

			// Should be plain text
			expect(paragraph.children[0].type).toBe('text');
			if (paragraph.children[0].type === 'text') {
				expect(paragraph.children[0].content).toContain('[[unknown:');
			}
		}
	});

	it('should NOT parse internal link with invalid UUID format', () => {
		const markdown = '[[chapter:invalid-uuid|Label]]';
		const ast = parseMarkdown(markdown);

		expect(ast.children).toHaveLength(1);
		expect(ast.children[0].type).toBe('paragraph');

		if (ast.children[0].type === 'paragraph') {
			const paragraph = ast.children[0];
			// Should NOT have internal-link node
			const internalLinkNode = paragraph.children.find((n) => n.type === 'internal-link');
			expect(internalLinkNode).toBeUndefined();

			// Should be plain text
			expect(paragraph.children[0].type).toBe('text');
		}
	});

	it('should NOT parse internal link with empty label', () => {
		const markdown = '[[chapter:550e8400-e29b-41d4-a716-446655440000|]]';
		const ast = parseMarkdown(markdown);

		expect(ast.children).toHaveLength(1);
		expect(ast.children[0].type).toBe('paragraph');

		if (ast.children[0].type === 'paragraph') {
			const paragraph = ast.children[0];
			// Should NOT have internal-link node (empty label)
			const internalLinkNode = paragraph.children.find((n) => n.type === 'internal-link');
			expect(internalLinkNode).toBeUndefined();
		}
	});

	it('should NOT parse internal link with whitespace-only label', () => {
		const markdown = '[[chapter:550e8400-e29b-41d4-a716-446655440000|   ]]';
		const ast = parseMarkdown(markdown);

		expect(ast.children).toHaveLength(1);
		expect(ast.children[0].type).toBe('paragraph');

		if (ast.children[0].type === 'paragraph') {
			const paragraph = ast.children[0];
			// Should NOT have internal-link node (whitespace-only label)
			const internalLinkNode = paragraph.children.find((n) => n.type === 'internal-link');
			expect(internalLinkNode).toBeUndefined();
		}
	});

	it('should NOT parse internal link with missing pipe separator', () => {
		const markdown = '[[chapter:550e8400-e29b-41d4-a716-446655440000]]';
		const ast = parseMarkdown(markdown);

		expect(ast.children).toHaveLength(1);
		expect(ast.children[0].type).toBe('paragraph');

		if (ast.children[0].type === 'paragraph') {
			const paragraph = ast.children[0];
			// Should NOT have internal-link node
			const internalLinkNode = paragraph.children.find((n) => n.type === 'internal-link');
			expect(internalLinkNode).toBeUndefined();
		}
	});

	// =========================================================================
	// Mixed Content
	// =========================================================================

	it('should parse internal link with math', () => {
		const markdown =
			'Voir $x^2$ dans [[chapter:550e8400-e29b-41d4-a716-446655440000|Chapitre Algebre]]';
		const ast = parseMarkdown(markdown);

		expect(ast.children).toHaveLength(1);
		expect(ast.children[0].type).toBe('paragraph');

		if (ast.children[0].type === 'paragraph') {
			const paragraph = ast.children[0];

			// Should have math and internal link
			const mathNode = paragraph.children.find((n) => n.type === 'math-inline');
			expect(mathNode).toBeDefined();
			if (mathNode && mathNode.type === 'math-inline') {
				expect(mathNode.expression).toBe('x^2');
			}

			const internalLinkNode = paragraph.children.find((n) => n.type === 'internal-link');
			expect(internalLinkNode).toBeDefined();
			if (internalLinkNode && internalLinkNode.type === 'internal-link') {
				expect(internalLinkNode.label).toBe('Chapitre Algebre');
			}
		}
	});

	it('should parse internal link with external link', () => {
		const markdown =
			'[[chapter:550e8400-e29b-41d4-a716-446655440000|Local]] et [Google](https://google.com)';
		const ast = parseMarkdown(markdown);

		expect(ast.children).toHaveLength(1);
		expect(ast.children[0].type).toBe('paragraph');

		if (ast.children[0].type === 'paragraph') {
			const paragraph = ast.children[0];

			// Should have both internal-link and regular link
			const internalLinkNode = paragraph.children.find((n) => n.type === 'internal-link');
			expect(internalLinkNode).toBeDefined();

			const linkNode = paragraph.children.find((n) => n.type === 'link');
			expect(linkNode).toBeDefined();
			if (linkNode && linkNode.type === 'link') {
				expect(linkNode.text).toBe('Google');
				expect(linkNode.url).toBe('https://google.com');
			}
		}
	});

	it('should parse internal link with hashtag', () => {
		const markdown = '[[chapter:550e8400-e29b-41d4-a716-446655440000|Chapitre]] #mathematiques';
		const ast = parseMarkdown(markdown);

		expect(ast.children).toHaveLength(1);
		expect(ast.children[0].type).toBe('paragraph');

		if (ast.children[0].type === 'paragraph') {
			const paragraph = ast.children[0];

			const internalLinkNode = paragraph.children.find((n) => n.type === 'internal-link');
			expect(internalLinkNode).toBeDefined();

			const hashtagNode = paragraph.children.find((n) => n.type === 'hashtag');
			expect(hashtagNode).toBeDefined();
			if (hashtagNode && hashtagNode.type === 'hashtag') {
				expect(hashtagNode.tag).toBe('mathematiques');
			}
		}
	});

	it('should parse internal link with mention', () => {
		const markdown =
			'@teacher recommande [[chapter:550e8400-e29b-41d4-a716-446655440000|ce chapitre]]';
		const ast = parseMarkdown(markdown);

		expect(ast.children).toHaveLength(1);
		expect(ast.children[0].type).toBe('paragraph');

		if (ast.children[0].type === 'paragraph') {
			const paragraph = ast.children[0];

			const mentionNode = paragraph.children.find((n) => n.type === 'mention');
			expect(mentionNode).toBeDefined();
			if (mentionNode && mentionNode.type === 'mention') {
				expect(mentionNode.username).toBe('teacher');
			}

			const internalLinkNode = paragraph.children.find((n) => n.type === 'internal-link');
			expect(internalLinkNode).toBeDefined();
		}
	});

	it('should parse internal link with hint reference', () => {
		const markdown =
			'{{hint:formula1}} - Voir [[chapter:550e8400-e29b-41d4-a716-446655440000|Rappels]]';
		const ast = parseMarkdown(markdown);

		expect(ast.children).toHaveLength(1);
		expect(ast.children[0].type).toBe('paragraph');

		if (ast.children[0].type === 'paragraph') {
			const paragraph = ast.children[0];

			const hintNode = paragraph.children.find((n) => n.type === 'hint-reference');
			expect(hintNode).toBeDefined();
			if (hintNode && hintNode.type === 'hint-reference') {
				expect(hintNode.hintId).toBe('formula1');
			}

			const internalLinkNode = paragraph.children.find((n) => n.type === 'internal-link');
			expect(internalLinkNode).toBeDefined();
		}
	});

	it('should parse internal link with formatting', () => {
		const markdown =
			'**Important:** [[chapter:550e8400-e29b-41d4-a716-446655440000|Lire ce chapitre]]';
		const ast = parseMarkdown(markdown);

		expect(ast.children).toHaveLength(1);
		expect(ast.children[0].type).toBe('paragraph');

		if (ast.children[0].type === 'paragraph') {
			const paragraph = ast.children[0];

			// Should have bold text
			const boldNode = paragraph.children.find(
				(n) => n.type === 'text' && n.bold && n.content === 'Important:'
			);
			expect(boldNode).toBeDefined();

			// Should have internal link
			const internalLinkNode = paragraph.children.find((n) => n.type === 'internal-link');
			expect(internalLinkNode).toBeDefined();
		}
	});

	// =========================================================================
	// Lists
	// =========================================================================

	it('should parse internal link in list item', () => {
		const markdown = `1. [[chapter:550e8400-e29b-41d4-a716-446655440000|Chapitre 1]]
2. [[exercise:123e4567-e89b-12d3-a456-426614174000|Exercice 2]]`;

		const ast = parseMarkdown(markdown);

		expect(ast.children).toHaveLength(1);
		expect(ast.children[0].type).toBe('list');

		if (ast.children[0].type === 'list') {
			const list = ast.children[0];
			expect(list.items).toHaveLength(2);

			// Check first item has internal link
			const firstItem = list.items[0];
			if (firstItem.children[0].type === 'paragraph') {
				const internalLinkNode = firstItem.children[0].children.find(
					(n) => n.type === 'internal-link'
				);
				expect(internalLinkNode).toBeDefined();
				if (internalLinkNode && internalLinkNode.type === 'internal-link') {
					expect(internalLinkNode.referenceType).toBe('chapter');
				}
			}

			// Check second item has internal link
			const secondItem = list.items[1];
			if (secondItem.children[0].type === 'paragraph') {
				const internalLinkNode = secondItem.children[0].children.find(
					(n) => n.type === 'internal-link'
				);
				expect(internalLinkNode).toBeDefined();
				if (internalLinkNode && internalLinkNode.type === 'internal-link') {
					expect(internalLinkNode.referenceType).toBe('exercise');
				}
			}
		}
	});
});
