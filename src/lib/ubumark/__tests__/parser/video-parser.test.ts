/**
 * Video Parser Tests
 * ===================
 *
 * Comprehensive tests for video parsing functionality in the markdown parser.
 * Tests cover HTML5 videos, YouTube detection, attribute parsing, and edge cases.
 */

import { describe, it, expect } from 'vitest';
import { parseMarkdown } from '../../parser/markdown-parser';
import type { VideoNode } from '../../types/ast';

describe('parseMarkdown - video support', () => {
	describe('basic video parsing', () => {
		it('should parse basic HTML5 video', () => {
			const markdown = '!video[Demo](video.mp4)';
			const ast = parseMarkdown(markdown);

			expect(ast.children).toHaveLength(1);
			expect(ast.children[0].type).toBe('video');

			if (ast.children[0].type === 'video') {
				const video = ast.children[0];
				expect(video.src).toBe('video.mp4');
				expect(video.alt).toBe('Demo');
				expect(video.provider).toBe('html5');
				expect(video.controls).toBe(true); // Default
			}
		});

		it('should parse video with alt text', () => {
			const markdown = '!video[My Video](video.mp4)';
			const ast = parseMarkdown(markdown);

			expect(ast.children).toHaveLength(1);
			expect(ast.children[0].type).toBe('video');

			if (ast.children[0].type === 'video') {
				const video = ast.children[0];
				expect(video.alt).toBe('My Video');
				expect(video.src).toBe('video.mp4');
			}
		});

		it('should parse video with title', () => {
			const markdown = '!video[Demo](video.mp4 "Video title")';
			const ast = parseMarkdown(markdown);

			expect(ast.children).toHaveLength(1);
			expect(ast.children[0].type).toBe('video');

			if (ast.children[0].type === 'video') {
				const video = ast.children[0];
				expect(video.src).toBe('video.mp4');
				expect(video.alt).toBe('Demo');
				// Note: title is captured by regex but not currently stored in VideoNode
				// This test documents current behavior
			}
		});

		it('should parse video with empty alt', () => {
			const markdown = '!video[](video.mp4)';
			const ast = parseMarkdown(markdown);

			expect(ast.children).toHaveLength(1);
			expect(ast.children[0].type).toBe('video');

			if (ast.children[0].type === 'video') {
				const video = ast.children[0];
				expect(video.src).toBe('video.mp4');
				expect(video.alt).toBeUndefined();
			}
		});

		it('should parse video with various file extensions', () => {
			const extensions = ['mp4', 'webm', 'ogg', 'mov'];

			for (const ext of extensions) {
				const markdown = `!video[Test](video.${ext})`;
				const ast = parseMarkdown(markdown);

				expect(ast.children).toHaveLength(1);
				expect(ast.children[0].type).toBe('video');

				if (ast.children[0].type === 'video') {
					const video = ast.children[0];
					expect(video.src).toBe(`video.${ext}`);
					expect(video.provider).toBe('html5');
				}
			}
		});
	});

	describe('YouTube detection', () => {
		it('should detect YouTube watch URL', () => {
			const markdown = '!video[Tutorial](https://youtube.com/watch?v=dQw4w9WgXcQ)';
			const ast = parseMarkdown(markdown);

			expect(ast.children).toHaveLength(1);
			expect(ast.children[0].type).toBe('video');

			if (ast.children[0].type === 'video') {
				const video = ast.children[0];
				expect(video.provider).toBe('youtube');
				expect(video.videoId).toBe('dQw4w9WgXcQ');
				expect(video.alt).toBe('Tutorial');
			}
		});

		it('should detect YouTube short URL', () => {
			const markdown = '!video[Tutorial](https://youtu.be/dQw4w9WgXcQ)';
			const ast = parseMarkdown(markdown);

			expect(ast.children).toHaveLength(1);
			expect(ast.children[0].type === 'video').toBe(true);

			if (ast.children[0].type === 'video') {
				const video = ast.children[0];
				expect(video.provider).toBe('youtube');
				expect(video.videoId).toBe('dQw4w9WgXcQ');
			}
		});

		it('should detect YouTube embed URL', () => {
			const markdown = '!video[Tutorial](https://youtube.com/embed/dQw4w9WgXcQ)';
			const ast = parseMarkdown(markdown);

			expect(ast.children).toHaveLength(1);
			expect(ast.children[0].type).toBe('video');

			if (ast.children[0].type === 'video') {
				const video = ast.children[0];
				expect(video.provider).toBe('youtube');
				expect(video.videoId).toBe('dQw4w9WgXcQ');
			}
		});

		it('should detect YouTube with www prefix', () => {
			const markdown = '!video[Tutorial](https://www.youtube.com/watch?v=dQw4w9WgXcQ)';
			const ast = parseMarkdown(markdown);

			expect(ast.children).toHaveLength(1);
			expect(ast.children[0].type).toBe('video');

			if (ast.children[0].type === 'video') {
				const video = ast.children[0];
				expect(video.provider).toBe('youtube');
				expect(video.videoId).toBe('dQw4w9WgXcQ');
			}
		});

		it('should treat non-YouTube URL as HTML5', () => {
			const markdown = '!video[Demo](https://example.com/video.mp4)';
			const ast = parseMarkdown(markdown);

			expect(ast.children).toHaveLength(1);
			expect(ast.children[0].type).toBe('video');

			if (ast.children[0].type === 'video') {
				const video = ast.children[0];
				expect(video.provider).toBe('html5');
				expect(video.videoId).toBeUndefined();
				expect(video.src).toBe('https://example.com/video.mp4');
			}
		});

		it('should handle YouTube video IDs with hyphens and underscores', () => {
			const markdown = '!video[Test](https://youtube.com/watch?v=ABC-123_xyz)';
			const ast = parseMarkdown(markdown);

			expect(ast.children).toHaveLength(1);
			expect(ast.children[0].type).toBe('video');

			if (ast.children[0].type === 'video') {
				const video = ast.children[0];
				expect(video.provider).toBe('youtube');
				expect(video.videoId).toBe('ABC-123_xyz');
			}
		});
	});

	describe('video attributes', () => {
		it('should parse size class attribute', () => {
			const sizes: Array<'inline' | 'small' | 'medium' | 'large' | 'full'> = [
				'inline',
				'small',
				'medium',
				'large',
				'full'
			];

			for (const size of sizes) {
				const markdown = `!video[Demo](video.mp4){size=${size}}`;
				const ast = parseMarkdown(markdown);

				expect(ast.children).toHaveLength(1);
				expect(ast.children[0].type).toBe('video');

				if (ast.children[0].type === 'video') {
					const video = ast.children[0];
					expect(video.sizeClass).toBe(size);
				}
			}
		});

		it('should parse width percentage', () => {
			const markdown = '!video[Demo](video.mp4){width=60%}';
			const ast = parseMarkdown(markdown);

			expect(ast.children).toHaveLength(1);
			expect(ast.children[0].type).toBe('video');

			if (ast.children[0].type === 'video') {
				const video = ast.children[0];
				expect(video.widthPercent).toBe(60);
			}
		});

		it('should parse alignment attribute', () => {
			const alignments: Array<'left' | 'center' | 'right'> = ['left', 'center', 'right'];

			for (const align of alignments) {
				const markdown = `!video[Demo](video.mp4){align=${align}}`;
				const ast = parseMarkdown(markdown);

				expect(ast.children).toHaveLength(1);
				expect(ast.children[0].type).toBe('video');

				if (ast.children[0].type === 'video') {
					const video = ast.children[0];
					expect(video.alignment).toBe(align);
				}
			}
		});

		it('should default controls to true', () => {
			const markdown = '!video[Demo](video.mp4)';
			const ast = parseMarkdown(markdown);

			expect(ast.children).toHaveLength(1);
			expect(ast.children[0].type).toBe('video');

			if (ast.children[0].type === 'video') {
				const video = ast.children[0];
				expect(video.controls).toBe(true);
			}
		});

		it('should allow explicit controls=false', () => {
			const markdown = '!video[Demo](video.mp4){controls=false}';
			const ast = parseMarkdown(markdown);

			expect(ast.children).toHaveLength(1);
			expect(ast.children[0].type).toBe('video');

			if (ast.children[0].type === 'video') {
				const video = ast.children[0];
				expect(video.controls).toBe(false);
			}
		});

		it('should parse autoplay attribute', () => {
			const markdown = '!video[Demo](video.mp4){autoplay}';
			const ast = parseMarkdown(markdown);

			expect(ast.children).toHaveLength(1);
			expect(ast.children[0].type).toBe('video');

			if (ast.children[0].type === 'video') {
				const video = ast.children[0];
				expect(video.autoplay).toBe(true);
			}
		});

		it('should parse loop attribute', () => {
			const markdown = '!video[Demo](video.mp4){loop}';
			const ast = parseMarkdown(markdown);

			expect(ast.children).toHaveLength(1);
			expect(ast.children[0].type).toBe('video');

			if (ast.children[0].type === 'video') {
				const video = ast.children[0];
				expect(video.loop).toBe(true);
			}
		});

		it('should parse muted attribute', () => {
			const markdown = '!video[Demo](video.mp4){muted}';
			const ast = parseMarkdown(markdown);

			expect(ast.children).toHaveLength(1);
			expect(ast.children[0].type).toBe('video');

			if (ast.children[0].type === 'video') {
				const video = ast.children[0];
				expect(video.muted).toBe(true);
			}
		});

		it('should parse multiple boolean attributes', () => {
			const markdown = '!video[Demo](video.mp4){autoplay loop muted}';
			const ast = parseMarkdown(markdown);

			expect(ast.children).toHaveLength(1);
			expect(ast.children[0].type).toBe('video');

			if (ast.children[0].type === 'video') {
				const video = ast.children[0];
				expect(video.autoplay).toBe(true);
				expect(video.loop).toBe(true);
				expect(video.muted).toBe(true);
			}
		});

		it('should parse combined attributes', () => {
			const markdown = '!video[Demo](video.mp4){size=medium align=center autoplay muted}';
			const ast = parseMarkdown(markdown);

			expect(ast.children).toHaveLength(1);
			expect(ast.children[0].type).toBe('video');

			if (ast.children[0].type === 'video') {
				const video = ast.children[0];
				expect(video.sizeClass).toBe('medium');
				expect(video.alignment).toBe('center');
				expect(video.autoplay).toBe(true);
				expect(video.muted).toBe(true);
			}
		});

		it('should parse width percentage and size class together', () => {
			const markdown = '!video[Demo](video.mp4){size=large width=80%}';
			const ast = parseMarkdown(markdown);

			expect(ast.children).toHaveLength(1);
			expect(ast.children[0].type).toBe('video');

			if (ast.children[0].type === 'video') {
				const video = ast.children[0];
				expect(video.sizeClass).toBe('large');
				expect(video.widthPercent).toBe(80);
			}
		});

		it('should parse explicit boolean=true', () => {
			const markdown = '!video[Demo](video.mp4){autoplay=true loop=true}';
			const ast = parseMarkdown(markdown);

			expect(ast.children).toHaveLength(1);
			expect(ast.children[0].type).toBe('video');

			if (ast.children[0].type === 'video') {
				const video = ast.children[0];
				expect(video.autoplay).toBe(true);
				expect(video.loop).toBe(true);
			}
		});

		it('should parse explicit boolean=false', () => {
			const markdown = '!video[Demo](video.mp4){autoplay=false loop=false}';
			const ast = parseMarkdown(markdown);

			expect(ast.children).toHaveLength(1);
			expect(ast.children[0].type).toBe('video');

			if (ast.children[0].type === 'video') {
				const video = ast.children[0];
				expect(video.autoplay).toBe(false);
				expect(video.loop).toBe(false);
			}
		});

		it('should ignore invalid size class', () => {
			const markdown = '!video[Demo](video.mp4){size=invalid}';
			const ast = parseMarkdown(markdown);

			expect(ast.children).toHaveLength(1);
			expect(ast.children[0].type).toBe('video');

			if (ast.children[0].type === 'video') {
				const video = ast.children[0];
				expect(video.sizeClass).toBeUndefined();
			}
		});

		it('should ignore invalid alignment', () => {
			const markdown = '!video[Demo](video.mp4){align=invalid}';
			const ast = parseMarkdown(markdown);

			expect(ast.children).toHaveLength(1);
			expect(ast.children[0].type).toBe('video');

			if (ast.children[0].type === 'video') {
				const video = ast.children[0];
				expect(video.alignment).toBeUndefined();
			}
		});

		it('should ignore width percentage outside valid range', () => {
			const markdown1 = '!video[Demo](video.mp4){width=150%}';
			const ast1 = parseMarkdown(markdown1);

			if (ast1.children[0].type === 'video') {
				// Width > 100 should be ignored
				expect(ast1.children[0].widthPercent).toBeUndefined();
			}

			const markdown2 = '!video[Demo](video.mp4){width=-10%}';
			const ast2 = parseMarkdown(markdown2);

			if (ast2.children[0].type === 'video') {
				// Negative width should be ignored
				expect(ast2.children[0].widthPercent).toBeUndefined();
			}
		});
	});

	describe('edge cases', () => {
		it('should NOT parse video inside paragraph', () => {
			const markdown = 'Here is a video !video[Demo](video.mp4) inline';
			const ast = parseMarkdown(markdown);

			// When video is not on its own line, it should be treated as paragraph
			expect(ast.children).toHaveLength(1);
			expect(ast.children[0].type).toBe('paragraph');

			// The !video prefix should remain as text (the [Demo](url) may be parsed as a link)
			if (ast.children[0].type === 'paragraph') {
				const paragraph = ast.children[0];
				const textContent = paragraph.children
					.filter((n) => n.type === 'text')
					.map((n) => (n.type === 'text' ? n.content : ''))
					.join('');
				// The !video part should remain as plain text
				expect(textContent).toContain('!video');
			}
		});

		it('should parse video on its own line', () => {
			const markdown = `Text before

!video[Demo](video.mp4)

Text after`;
			const ast = parseMarkdown(markdown);

			expect(ast.children).toHaveLength(3);
			expect(ast.children[0].type).toBe('paragraph');
			expect(ast.children[1].type).toBe('video');
			expect(ast.children[2].type).toBe('paragraph');
		});

		it('should handle URL without file extension', () => {
			const markdown = '!video[Demo](https://example.com/video)';
			const ast = parseMarkdown(markdown);

			expect(ast.children).toHaveLength(1);
			expect(ast.children[0].type).toBe('video');

			if (ast.children[0].type === 'video') {
				const video = ast.children[0];
				expect(video.src).toBe('https://example.com/video');
				expect(video.provider).toBe('html5');
			}
		});

		it('should handle relative paths', () => {
			const markdown = '!video[Demo](./assets/video.mp4)';
			const ast = parseMarkdown(markdown);

			expect(ast.children).toHaveLength(1);
			expect(ast.children[0].type).toBe('video');

			if (ast.children[0].type === 'video') {
				const video = ast.children[0];
				expect(video.src).toBe('./assets/video.mp4');
				expect(video.provider).toBe('html5');
			}
		});

		it('should handle absolute paths', () => {
			const markdown = '!video[Demo](/static/videos/demo.mp4)';
			const ast = parseMarkdown(markdown);

			expect(ast.children).toHaveLength(1);
			expect(ast.children[0].type).toBe('video');

			if (ast.children[0].type === 'video') {
				const video = ast.children[0];
				expect(video.src).toBe('/static/videos/demo.mp4');
				expect(video.provider).toBe('html5');
			}
		});

		it('should NOT match invalid video syntax', () => {
			const invalidSyntaxes = [
				'!video[Demo]',
				'!video(video.mp4)',
				'video[Demo](video.mp4)',
				'!Video[Demo](video.mp4)' // Wrong capitalization
			];

			for (const markdown of invalidSyntaxes) {
				const ast = parseMarkdown(markdown);

				// Should be parsed as paragraph, not video
				if (ast.children.length > 0) {
					expect(ast.children[0].type).not.toBe('video');
				}
			}
		});

		it('should handle multiple videos in document', () => {
			const markdown = `!video[First](video1.mp4)

!video[Second](https://youtube.com/watch?v=ABC123)

!video[Third](video3.webm){size=large}`;

			const ast = parseMarkdown(markdown);

			expect(ast.children).toHaveLength(3);
			expect(ast.children[0].type).toBe('video');
			expect(ast.children[1].type).toBe('video');
			expect(ast.children[2].type).toBe('video');

			// First: HTML5
			if (ast.children[0].type === 'video') {
				expect(ast.children[0].provider).toBe('html5');
				expect(ast.children[0].alt).toBe('First');
			}

			// Second: YouTube
			if (ast.children[1].type === 'video') {
				expect(ast.children[1].provider).toBe('youtube');
				expect(ast.children[1].videoId).toBe('ABC123');
				expect(ast.children[1].alt).toBe('Second');
			}

			// Third: HTML5 with attributes
			if (ast.children[2].type === 'video') {
				expect(ast.children[2].provider).toBe('html5');
				expect(ast.children[2].sizeClass).toBe('large');
				expect(ast.children[2].alt).toBe('Third');
			}
		});

		it('should preserve alt text with special characters', () => {
			const markdown = '!video[Vidéo: démonstration #1](video.mp4)';
			const ast = parseMarkdown(markdown);

			expect(ast.children).toHaveLength(1);
			expect(ast.children[0].type).toBe('video');

			if (ast.children[0].type === 'video') {
				const video = ast.children[0];
				expect(video.alt).toBe('Vidéo: démonstration #1');
			}
		});

		it('should handle YouTube URL with additional query parameters', () => {
			const markdown = '!video[Tutorial](https://youtube.com/watch?v=ABC123&t=30s)';
			const ast = parseMarkdown(markdown);

			expect(ast.children).toHaveLength(1);
			expect(ast.children[0].type).toBe('video');

			if (ast.children[0].type === 'video') {
				const video = ast.children[0];
				expect(video.provider).toBe('youtube');
				expect(video.videoId).toBe('ABC123');
			}
		});

		it('should handle empty attributes', () => {
			const markdown = '!video[Demo](video.mp4){}';
			const ast = parseMarkdown(markdown);

			expect(ast.children).toHaveLength(1);
			expect(ast.children[0].type).toBe('video');

			if (ast.children[0].type === 'video') {
				const video = ast.children[0];
				expect(video.controls).toBe(true); // Default
				expect(video.sizeClass).toBeUndefined();
			}
		});

		it('should handle whitespace in attributes', () => {
			const markdown = '!video[Demo](video.mp4){  size=large   align=center  }';
			const ast = parseMarkdown(markdown);

			expect(ast.children).toHaveLength(1);
			expect(ast.children[0].type).toBe('video');

			if (ast.children[0].type === 'video') {
				const video = ast.children[0];
				expect(video.sizeClass).toBe('large');
				expect(video.alignment).toBe('center');
			}
		});
	});

	describe('integration with other features', () => {
		it('should coexist with images in same document', () => {
			const markdown = `![Image](image.png)

!video[Video](video.mp4)`;

			const ast = parseMarkdown(markdown);

			expect(ast.children).toHaveLength(2);
			expect(ast.children[0].type).toBe('image');
			expect(ast.children[1].type).toBe('video');
		});

		it('should coexist with lists in same document', () => {
			// Videos are block-level elements and cannot be nested in list items
			// This test verifies they can coexist in the same document
			const markdown = `1. First item
2. Second item

!video[Demo](video.mp4)

3. Third item continuing list`;

			const ast = parseMarkdown(markdown);

			// Should have: list, video, list (or paragraph depending on parser)
			expect(ast.children.length).toBeGreaterThanOrEqual(2);

			// Find the video node
			const hasVideo = ast.children.some((child) => child.type === 'video');
			expect(hasVideo).toBe(true);

			// Find the first list
			const firstList = ast.children.find((child) => child.type === 'list');
			expect(firstList).toBeDefined();
		});

		it('should work with headings', () => {
			const markdown = `## Video Section

!video[Tutorial](https://youtube.com/watch?v=ABC123){size=large}`;

			const ast = parseMarkdown(markdown);

			expect(ast.children).toHaveLength(2);
			expect(ast.children[0].type).toBe('heading');
			expect(ast.children[1].type).toBe('video');
		});

		it('should work in complex documents', () => {
			const markdown = `# Introduction

This is a tutorial video:

!video[Tutorial](https://youtube.com/watch?v=ABC123){size=large align=center}

## Additional Resources

- Link 1
- Link 2

!video[Extra](extra.mp4){controls loop}`;

			const ast = parseMarkdown(markdown);

			// Count video nodes
			const videoNodes = ast.children.filter((node) => node.type === 'video');
			expect(videoNodes).toHaveLength(2);

			// First video: YouTube
			const firstVideo = videoNodes[0] as VideoNode;
			expect(firstVideo.provider).toBe('youtube');
			expect(firstVideo.videoId).toBe('ABC123');
			expect(firstVideo.sizeClass).toBe('large');
			expect(firstVideo.alignment).toBe('center');

			// Second video: HTML5
			const secondVideo = videoNodes[1] as VideoNode;
			expect(secondVideo.provider).toBe('html5');
			expect(secondVideo.controls).toBe(true);
			expect(secondVideo.loop).toBe(true);
		});
	});
});
