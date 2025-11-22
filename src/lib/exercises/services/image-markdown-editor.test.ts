/**
 * Image Markdown Editor Tests
 * ============================
 *
 * Tests for the image markdown editing utilities.
 */

import { describe, it, expect } from 'vitest';
import {
	findImageAtCursor,
	findAllImages,
	generateImageMarkdown,
	replaceImageMarkdown
} from './image-markdown-editor';

describe('findImageAtCursor', () => {
	it('should find image when cursor is inside', () => {
		const text = 'Some text ![alt](image.png){size=medium} more text';
		const result = findImageAtCursor(text, 20); // Inside the image

		expect(result).not.toBeNull();
		expect(result?.url).toBe('image.png');
		expect(result?.alt).toBe('alt');
		expect(result?.sizeClass).toBe('medium');
	});

	it('should find image when cursor is at start', () => {
		const text = '![alt](image.png)';
		const result = findImageAtCursor(text, 0);

		expect(result).not.toBeNull();
		expect(result?.url).toBe('image.png');
	});

	it('should find image when cursor is at end', () => {
		const text = '![alt](image.png)';
		const result = findImageAtCursor(text, text.length);

		expect(result).not.toBeNull();
		expect(result?.url).toBe('image.png');
	});

	it('should return null when cursor is far from any image', () => {
		const text = 'Some text without images here';
		const result = findImageAtCursor(text, 10);

		expect(result).toBeNull();
	});

	it('should find image when cursor is within 5 characters after image', () => {
		const text = '![alt](image.png) text';
		const result = findImageAtCursor(text, 20); // 3 chars after image end (17)

		expect(result).not.toBeNull();
		expect(result?.url).toBe('image.png');
	});

	it('should not find image when cursor is more than 5 characters away', () => {
		const text = '![alt](image.png)       far away';
		const result = findImageAtCursor(text, 25); // 8 chars after image end (17)

		expect(result).toBeNull();
	});

	it('should parse all attributes', () => {
		const text = '![Figure](graph.png){size=large align=right width=80% caption="Test caption"}';
		const result = findImageAtCursor(text, 10);

		expect(result).not.toBeNull();
		expect(result?.alt).toBe('Figure');
		expect(result?.url).toBe('graph.png');
		expect(result?.sizeClass).toBe('large');
		expect(result?.alignment).toBe('right');
		expect(result?.widthPercent).toBe(80);
		expect(result?.caption).toBe('Test caption');
	});

	it('should find correct image when multiple images exist', () => {
		const text = '![first](a.png) some text ![second](b.png){size=small}';
		const result = findImageAtCursor(text, 35); // Inside second image

		expect(result).not.toBeNull();
		expect(result?.alt).toBe('second');
		expect(result?.url).toBe('b.png');
	});

	it('should return start and end positions', () => {
		const text = 'prefix ![alt](url.png) suffix';
		const result = findImageAtCursor(text, 12);

		expect(result).not.toBeNull();
		expect(result?.start).toBe(7);
		expect(result?.end).toBe(22);
		expect(result?.fullMatch).toBe('![alt](url.png)');
	});
});

describe('findAllImages', () => {
	it('should find all images in text', () => {
		const text = `# Title
![first](a.png){size=small}
Some text
![second](b.png){align=center}
More text
![third](c.png)`;

		const images = findAllImages(text);

		expect(images).toHaveLength(3);
		expect(images[0].url).toBe('a.png');
		expect(images[1].url).toBe('b.png');
		expect(images[2].url).toBe('c.png');
	});

	it('should return empty array for text without images', () => {
		const text = 'No images here';
		const images = findAllImages(text);

		expect(images).toHaveLength(0);
	});
});

describe('generateImageMarkdown', () => {
	it('should generate basic markdown', () => {
		const result = generateImageMarkdown('image.png', 'alt text');

		expect(result).toBe('![alt text](image.png)');
	});

	it('should add size class when not medium', () => {
		const result = generateImageMarkdown('image.png', 'alt', { sizeClass: 'large' });

		expect(result).toBe('![alt](image.png){size=large}');
	});

	it('should not add size class when medium (default)', () => {
		const result = generateImageMarkdown('image.png', 'alt', { sizeClass: 'medium' });

		expect(result).toBe('![alt](image.png)');
	});

	it('should add alignment when not center', () => {
		const result = generateImageMarkdown('image.png', 'alt', { alignment: 'left' });

		expect(result).toBe('![alt](image.png){align=left}');
	});

	it('should not add alignment when center (default)', () => {
		const result = generateImageMarkdown('image.png', 'alt', { alignment: 'center' });

		expect(result).toBe('![alt](image.png)');
	});

	it('should add width percent', () => {
		const result = generateImageMarkdown('image.png', 'alt', { widthPercent: 60 });

		expect(result).toBe('![alt](image.png){width=60%}');
	});

	it('should prefer width over size when both provided', () => {
		const result = generateImageMarkdown('image.png', 'alt', {
			sizeClass: 'large',
			widthPercent: 50
		});

		expect(result).toBe('![alt](image.png){width=50%}');
	});

	it('should add caption with quotes', () => {
		const result = generateImageMarkdown('image.png', 'alt', { caption: 'Figure 1' });

		expect(result).toBe('![alt](image.png){caption="Figure 1"}');
	});

	it('should escape quotes in caption', () => {
		const result = generateImageMarkdown('image.png', 'alt', { caption: 'Test "quoted" text' });

		expect(result).toBe('![alt](image.png){caption="Test \\"quoted\\" text"}');
	});

	it('should combine multiple attributes', () => {
		const result = generateImageMarkdown('image.png', 'alt', {
			sizeClass: 'large',
			alignment: 'right',
			caption: 'My caption'
		});

		expect(result).toBe('![alt](image.png){size=large align=right caption="My caption"}');
	});

	it('should add title when provided', () => {
		const result = generateImageMarkdown('image.png', 'alt', { title: 'Image Title' });

		expect(result).toBe('![alt](image.png "Image Title")');
	});
});

describe('replaceImageMarkdown', () => {
	it('should replace image markdown in text', () => {
		const text = 'Before ![old](old.png) After';
		const oldImage = {
			fullMatch: '![old](old.png)',
			start: 7,
			end: 22,
			url: 'old.png',
			alt: 'old'
		};

		const result = replaceImageMarkdown(text, oldImage, '![new](new.png){size=large}');

		expect(result).toBe('Before ![new](new.png){size=large} After');
	});

	it('should handle replacement at start of text', () => {
		const text = '![image](url.png) after';
		const oldImage = {
			fullMatch: '![image](url.png)',
			start: 0,
			end: 17,
			url: 'url.png',
			alt: 'image'
		};

		const result = replaceImageMarkdown(text, oldImage, '![new](new.png)');

		expect(result).toBe('![new](new.png) after');
	});

	it('should handle replacement at end of text', () => {
		const text = 'before ![image](url.png)';
		const oldImage = {
			fullMatch: '![image](url.png)',
			start: 7,
			end: 24,
			url: 'url.png',
			alt: 'image'
		};

		const result = replaceImageMarkdown(text, oldImage, '![new](new.png)');

		expect(result).toBe('before ![new](new.png)');
	});
});
