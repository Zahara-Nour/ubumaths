/**
 * Tests for Whiteboard Document Types and Factory Functions
 */

import { describe, it, expect } from 'vitest';
import {
	createEmptyDocument,
	createEmptyPage,
	PAGE_FORMATS,
	UBW_FILE_VERSION,
	DEFAULT_PAGE_FORMAT
} from '../types/document';

describe('Document Creation', () => {
	describe('createEmptyDocument', () => {
		it('creates a document with unique UUID', () => {
			const doc1 = createEmptyDocument();
			const doc2 = createEmptyDocument();

			expect(doc1.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
			expect(doc1.id).not.toBe(doc2.id);
		});

		it('creates a document with default title "Sans titre"', () => {
			const doc = createEmptyDocument();
			expect(doc.title).toBe('Sans titre');
		});

		it('creates a document with custom title', () => {
			const doc = createEmptyDocument('Mon cours de maths');
			expect(doc.title).toBe('Mon cours de maths');
		});

		it('creates a document with version 1', () => {
			const doc = createEmptyDocument();
			expect(doc.version).toBe(UBW_FILE_VERSION);
			expect(doc.version).toBe(1);
		});

		it('initializes createdAt and updatedAt timestamps', () => {
			const before = new Date().toISOString();
			const doc = createEmptyDocument();
			const after = new Date().toISOString();

			expect(doc.createdAt).toBeTruthy();
			expect(doc.updatedAt).toBeTruthy();
			expect(doc.createdAt).toBe(doc.updatedAt);
			expect(doc.createdAt >= before).toBe(true);
			expect(doc.createdAt <= after).toBe(true);
		});

		it('creates a document with one empty page', () => {
			const doc = createEmptyDocument();
			expect(doc.pages).toHaveLength(1);
			expect(doc.pages[0].elements).toHaveLength(0);
		});

		it('creates a document with currentPageIndex at 0', () => {
			const doc = createEmptyDocument();
			expect(doc.currentPageIndex).toBe(0);
		});

		it('creates a document with A4 format by default', () => {
			const doc = createEmptyDocument();
			const page = doc.pages[0];
			expect(page.width).toBe(PAGE_FORMATS.A4.width);
			expect(page.height).toBe(PAGE_FORMATS.A4.height);
		});

		it('creates a document with specified format', () => {
			const doc = createEmptyDocument('Test', 'WIDESCREEN_16_9');
			const page = doc.pages[0];
			expect(page.width).toBe(PAGE_FORMATS.WIDESCREEN_16_9.width);
			expect(page.height).toBe(PAGE_FORMATS.WIDESCREEN_16_9.height);
		});
	});

	describe('createEmptyPage', () => {
		it('creates a page with unique UUID', () => {
			const page1 = createEmptyPage();
			const page2 = createEmptyPage();

			expect(page1.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
			expect(page1.id).not.toBe(page2.id);
		});

		it('creates a page with empty elements array', () => {
			const page = createEmptyPage();
			expect(page.elements).toEqual([]);
		});

		it('creates a page with white plain background', () => {
			const page = createEmptyPage();
			expect(page.background).toEqual({
				type: 'plain',
				style: 'plain',
				color: '#ffffff'
			});
		});

		it('creates a page with A4 dimensions by default', () => {
			const page = createEmptyPage();
			expect(page.width).toBe(794);
			expect(page.height).toBe(1123);
		});

		it('creates a page with A3 dimensions when specified', () => {
			const page = createEmptyPage('A3');
			expect(page.width).toBe(PAGE_FORMATS.A3.width);
			expect(page.height).toBe(PAGE_FORMATS.A3.height);
		});

		it('creates a page with landscape dimensions when specified', () => {
			const page = createEmptyPage('A4_LANDSCAPE');
			expect(page.width).toBe(1123);
			expect(page.height).toBe(794);
		});
	});

	describe('PAGE_FORMATS', () => {
		it('defines A4 format correctly', () => {
			expect(PAGE_FORMATS.A4).toEqual({
				width: 794,
				height: 1123,
				label: 'A4'
			});
		});

		it('defines A3 format correctly', () => {
			expect(PAGE_FORMATS.A3).toEqual({
				width: 1123,
				height: 1587,
				label: 'A3'
			});
		});

		it('defines 16:9 widescreen format correctly', () => {
			expect(PAGE_FORMATS.WIDESCREEN_16_9).toEqual({
				width: 1920,
				height: 1080,
				label: '16:9'
			});
		});

		it('has default format set to A4', () => {
			expect(DEFAULT_PAGE_FORMAT).toBe('A4');
		});
	});
});
