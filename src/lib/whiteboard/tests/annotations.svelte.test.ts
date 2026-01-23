/**
 * Tests for Annotation Layer functionality
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { whiteboardStore } from '../stores/whiteboard.svelte';
import type { AnnotationStroke, AnnotationShape, AnnotationStamp, Point } from '../types/document';

describe('Annotation Layer', () => {
	beforeEach(() => {
		whiteboardStore.createNew();
		whiteboardStore.clearAutosave();
	});

	afterEach(() => {
		whiteboardStore.destroy();
	});

	describe('annotation mode', () => {
		it('starts with annotation mode disabled', () => {
			expect(whiteboardStore.isAnnotationMode).toBe(false);
		});

		it('enters annotation mode', () => {
			whiteboardStore.enterAnnotationMode();
			expect(whiteboardStore.isAnnotationMode).toBe(true);
		});

		it('exits annotation mode', () => {
			whiteboardStore.enterAnnotationMode();
			whiteboardStore.exitAnnotationMode();
			expect(whiteboardStore.isAnnotationMode).toBe(false);
		});

		it('toggles annotation mode', () => {
			whiteboardStore.toggleAnnotationMode();
			expect(whiteboardStore.isAnnotationMode).toBe(true);
			whiteboardStore.toggleAnnotationMode();
			expect(whiteboardStore.isAnnotationMode).toBe(false);
		});

		it('sets default tool to pen when entering annotation mode', () => {
			whiteboardStore.enterAnnotationMode();
			expect(whiteboardStore.annotationTool).toBe('annotation-pen');
		});
	});

	describe('annotation tool selection', () => {
		beforeEach(() => {
			whiteboardStore.enterAnnotationMode();
		});

		it('changes annotation tool', () => {
			whiteboardStore.setAnnotationTool('annotation-highlighter');
			expect(whiteboardStore.annotationTool).toBe('annotation-highlighter');
		});

		it('supports all annotation tools', () => {
			const tools = [
				'annotation-select',
				'annotation-pen',
				'annotation-marker',
				'annotation-highlighter',
				'annotation-eraser',
				'annotation-line',
				'annotation-rectangle',
				'annotation-circle',
				'annotation-arrow',
				'annotation-stamp'
			] as const;

			for (const tool of tools) {
				whiteboardStore.setAnnotationTool(tool);
				expect(whiteboardStore.annotationTool).toBe(tool);
			}
		});
	});

	describe('annotation style', () => {
		beforeEach(() => {
			whiteboardStore.enterAnnotationMode();
		});

		it('has default annotation style', () => {
			const style = whiteboardStore.annotationStyle;
			expect(style.color).toBeDefined();
			expect(style.strokeWidth).toBeDefined();
		});

		it('updates annotation color', () => {
			whiteboardStore.setAnnotationStyleProperty('color', '#ff0000');
			expect(whiteboardStore.annotationStyle.color).toBe('#ff0000');
		});

		it('updates annotation stroke width', () => {
			whiteboardStore.setAnnotationStyleProperty('strokeWidth', 8);
			expect(whiteboardStore.annotationStyle.strokeWidth).toBe(8);
		});

		it('updates stamp type', () => {
			whiteboardStore.setAnnotationStyleProperty('stampType', '✓');
			expect(whiteboardStore.annotationStyle.stampType).toBe('✓');
		});
	});

	describe('adding strokes', () => {
		beforeEach(() => {
			whiteboardStore.enterAnnotationMode();
		});

		it('adds annotation stroke to current page', () => {
			const points: Point[] = [
				{ x: 10, y: 10 },
				{ x: 50, y: 50 },
				{ x: 100, y: 100 }
			];

			// Use the actual API - stroke uses internal annotationStyle
			whiteboardStore.addAnnotationStroke(points, 'pen');

			const annotations = whiteboardStore.currentPage?.annotations;
			expect(annotations).toBeDefined();
			expect(annotations?.length).toBe(1);
			expect(annotations?.[0].type).toBe('stroke');
		});

		it('stroke has correct tool type', () => {
			const points: Point[] = [
				{ x: 10, y: 10 },
				{ x: 50, y: 50 }
			];

			whiteboardStore.addAnnotationStroke(points, 'highlighter');

			const stroke = whiteboardStore.currentPage?.annotations?.[0] as AnnotationStroke;
			expect(stroke).toBeDefined();
			expect(stroke.toolType).toBe('highlighter');
			expect(stroke.points.length).toBe(2);
		});

		it('stroke uses current annotation style', () => {
			whiteboardStore.setAnnotationStyleProperty('color', '#ff0000');
			whiteboardStore.setAnnotationStyleProperty('strokeWidth', 6);

			const points: Point[] = [
				{ x: 10, y: 10 },
				{ x: 50, y: 50 }
			];
			whiteboardStore.addAnnotationStroke(points, 'pen');

			const stroke = whiteboardStore.currentPage?.annotations?.[0] as AnnotationStroke;
			expect(stroke.color).toBe('#ff0000');
			expect(stroke.width).toBe(6);
		});
	});

	describe('adding shapes', () => {
		beforeEach(() => {
			whiteboardStore.enterAnnotationMode();
		});

		it('adds annotation shape to current page', () => {
			const start: Point = { x: 10, y: 10 };
			const end: Point = { x: 100, y: 100 };

			whiteboardStore.addAnnotationShape(start, end, 'rectangle');

			const annotations = whiteboardStore.currentPage?.annotations;
			expect(annotations).toBeDefined();
			expect(annotations?.length).toBe(1);
			expect(annotations?.[0].type).toBe('shape');
		});

		it('shape has correct type', () => {
			const start: Point = { x: 10, y: 10 };
			const end: Point = { x: 100, y: 100 };

			whiteboardStore.addAnnotationShape(start, end, 'circle');

			const shape = whiteboardStore.currentPage?.annotations?.[0] as AnnotationShape;
			expect(shape).toBeDefined();
			expect(shape.shapeType).toBe('circle');
		});

		it('shape uses current annotation style', () => {
			whiteboardStore.setAnnotationStyleProperty('color', '#0000ff');
			whiteboardStore.setAnnotationStyleProperty('strokeWidth', 4);

			const start: Point = { x: 10, y: 10 };
			const end: Point = { x: 100, y: 100 };
			whiteboardStore.addAnnotationShape(start, end, 'rectangle');

			const shape = whiteboardStore.currentPage?.annotations?.[0] as AnnotationShape;
			expect(shape.color).toBe('#0000ff');
			expect(shape.strokeWidth).toBe(4);
		});

		it('supports all shape types', () => {
			const shapeTypes = ['line', 'rectangle', 'circle', 'arrow'] as const;

			for (const shapeType of shapeTypes) {
				whiteboardStore.addAnnotationShape({ x: 0, y: 0 }, { x: 50, y: 50 }, shapeType);
			}

			const annotations = whiteboardStore.currentPage?.annotations;
			expect(annotations?.length).toBe(4);
		});
	});

	describe('adding stamps', () => {
		beforeEach(() => {
			whiteboardStore.enterAnnotationMode();
		});

		it('adds annotation stamp to current page', () => {
			const position: Point = { x: 50, y: 50 };

			// Set stamp type before adding
			whiteboardStore.setAnnotationStyleProperty('stampType', '✓');
			whiteboardStore.addAnnotationStamp(position);

			const annotations = whiteboardStore.currentPage?.annotations;
			expect(annotations).toBeDefined();
			expect(annotations?.length).toBe(1);
			expect(annotations?.[0].type).toBe('stamp');
		});

		it('stamp has correct properties from style', () => {
			whiteboardStore.setAnnotationStyleProperty('stampType', '★');
			whiteboardStore.setAnnotationStyleProperty('color', '#ffd700');
			// stampSize uses default (32) - TypeScript infers literal type

			const position: Point = { x: 100, y: 100 };
			whiteboardStore.addAnnotationStamp(position);

			const stamp = whiteboardStore.currentPage?.annotations?.[0] as AnnotationStamp;
			expect(stamp).toBeDefined();
			expect(stamp.stampType).toBe('★');
			expect(stamp.position.x).toBe(100);
			expect(stamp.position.y).toBe(100);
			expect(stamp.color).toBe('#ffd700');
			expect(stamp.size).toBe(32); // Default stamp size
		});
	});

	describe('deleting annotations', () => {
		beforeEach(() => {
			whiteboardStore.enterAnnotationMode();
			// Add some annotations
			whiteboardStore.addAnnotationStroke(
				[
					{ x: 10, y: 10 },
					{ x: 50, y: 50 }
				],
				'pen'
			);
			whiteboardStore.setAnnotationStyleProperty('stampType', '✓');
			whiteboardStore.addAnnotationStamp({ x: 100, y: 100 });
		});

		it('deletes annotation by id', () => {
			const annotations = whiteboardStore.currentPage?.annotations;
			expect(annotations?.length).toBe(2);

			const firstId = annotations?.[0].id;
			if (firstId) {
				whiteboardStore.deleteAnnotation(firstId);
			}

			expect(whiteboardStore.currentPage?.annotations?.length).toBe(1);
		});

		it('clears all annotations', () => {
			expect(whiteboardStore.currentPage?.annotations?.length).toBe(2);

			whiteboardStore.clearAnnotations();

			expect(whiteboardStore.currentPage?.annotations?.length).toBe(0);
		});
	});

	describe('annotation selection', () => {
		beforeEach(() => {
			whiteboardStore.enterAnnotationMode();
			whiteboardStore.addAnnotationStroke(
				[
					{ x: 10, y: 10 },
					{ x: 50, y: 50 }
				],
				'pen'
			);
			whiteboardStore.setAnnotationStyleProperty('stampType', '✓');
			whiteboardStore.addAnnotationStamp({ x: 100, y: 100 });
		});

		it('starts with no selection', () => {
			expect(whiteboardStore.selectedAnnotationIds.size).toBe(0);
		});

		it('selects annotation by id', () => {
			const annotations = whiteboardStore.currentPage?.annotations;
			const id = annotations?.[0].id;

			if (id) {
				whiteboardStore.selectAnnotation(id, false);
				expect(whiteboardStore.selectedAnnotationIds.has(id)).toBe(true);
			}
		});

		it('multi-selects with addToSelection=true', () => {
			const annotations = whiteboardStore.currentPage?.annotations;

			if (annotations && annotations.length >= 2) {
				whiteboardStore.selectAnnotation(annotations[0].id, false);
				whiteboardStore.selectAnnotation(annotations[1].id, true);

				expect(whiteboardStore.selectedAnnotationIds.size).toBe(2);
			}
		});

		it('replaces selection with addToSelection=false', () => {
			const annotations = whiteboardStore.currentPage?.annotations;

			if (annotations && annotations.length >= 2) {
				whiteboardStore.selectAnnotation(annotations[0].id, false);
				whiteboardStore.selectAnnotation(annotations[1].id, false);

				expect(whiteboardStore.selectedAnnotationIds.size).toBe(1);
				expect(whiteboardStore.selectedAnnotationIds.has(annotations[1].id)).toBe(true);
			}
		});

		it('clears selection', () => {
			const annotations = whiteboardStore.currentPage?.annotations;
			if (annotations?.[0]) {
				whiteboardStore.selectAnnotation(annotations[0].id, false);
			}

			whiteboardStore.clearAnnotationSelection();

			expect(whiteboardStore.selectedAnnotationIds.size).toBe(0);
		});

		it('deletes selected annotations', () => {
			const annotations = whiteboardStore.currentPage?.annotations;

			if (annotations && annotations.length >= 2) {
				whiteboardStore.selectAnnotation(annotations[0].id, false);
				whiteboardStore.selectAnnotation(annotations[1].id, true);

				whiteboardStore.deleteSelectedAnnotations();

				expect(whiteboardStore.currentPage?.annotations?.length).toBe(0);
				expect(whiteboardStore.selectedAnnotationIds.size).toBe(0);
			}
		});
	});

	describe('annotation visibility', () => {
		it('annotations are visible by default', () => {
			expect(whiteboardStore.document?.annotationsVisible).toBe(true);
		});

		it('toggles annotation visibility', () => {
			whiteboardStore.toggleAnnotationsVisible();
			expect(whiteboardStore.document?.annotationsVisible).toBe(false);

			whiteboardStore.toggleAnnotationsVisible();
			expect(whiteboardStore.document?.annotationsVisible).toBe(true);
		});

		it('sets annotation visibility directly', () => {
			whiteboardStore.setAnnotationsVisible(false);
			expect(whiteboardStore.document?.annotationsVisible).toBe(false);

			whiteboardStore.setAnnotationsVisible(true);
			expect(whiteboardStore.document?.annotationsVisible).toBe(true);
		});
	});

	describe('annotation movement', () => {
		beforeEach(() => {
			whiteboardStore.enterAnnotationMode();
			whiteboardStore.setAnnotationStyleProperty('stampType', '✓');
			whiteboardStore.addAnnotationStamp({ x: 100, y: 100 });
		});

		it('moves single annotation', () => {
			const annotations = whiteboardStore.currentPage?.annotations;
			const id = annotations?.[0].id;

			if (id) {
				whiteboardStore.moveAnnotation(id, 50, 30);

				const moved = whiteboardStore.currentPage?.annotations?.find((a) => a.id === id);
				expect(moved?.type).toBe('stamp');
				if (moved?.type === 'stamp') {
					expect(moved.position.x).toBe(150);
					expect(moved.position.y).toBe(130);
				}
			}
		});

		it('moves selected annotations', () => {
			whiteboardStore.setAnnotationStyleProperty('stampType', '✗');
			whiteboardStore.addAnnotationStamp({ x: 200, y: 200 });

			const annotations = whiteboardStore.currentPage?.annotations;
			if (annotations && annotations.length >= 2) {
				whiteboardStore.selectAnnotation(annotations[0].id, false);
				whiteboardStore.selectAnnotation(annotations[1].id, true);

				whiteboardStore.moveSelectedAnnotations(10, 20);

				const stamps = whiteboardStore.currentPage?.annotations as AnnotationStamp[];
				expect(stamps[0].position.x).toBe(110);
				expect(stamps[0].position.y).toBe(120);
				expect(stamps[1].position.x).toBe(210);
				expect(stamps[1].position.y).toBe(220);
			}
		});
	});

	describe('annotation color update', () => {
		beforeEach(() => {
			whiteboardStore.enterAnnotationMode();
			whiteboardStore.setAnnotationStyleProperty('stampType', '✓');
			whiteboardStore.setAnnotationStyleProperty('color', '#00ff00');
			whiteboardStore.addAnnotationStamp({ x: 100, y: 100 });
		});

		it('updates annotation color', () => {
			const annotations = whiteboardStore.currentPage?.annotations;
			const id = annotations?.[0].id;

			if (id) {
				whiteboardStore.updateAnnotationColor(id, '#ff0000');

				const updated = whiteboardStore.currentPage?.annotations?.find((a) => a.id === id);
				expect(updated?.color).toBe('#ff0000');
			}
		});
	});
});
