import { describe, it, expect } from 'vitest';
import { fitViewport, DEFAULT_VIEWPORT } from '../viewport';

describe('fitViewport', () => {
	it('returns default viewport for empty array', () => {
		const vp = fitViewport([]);
		expect(vp).toEqual(DEFAULT_VIEWPORT);
	});

	it('creates a viewport centered on a single point with padding', () => {
		const vp = fitViewport([{ x: 3, y: 5 }]);
		// Single point: xMin=3-1=2, xMax=3+1=4 (expanded by 1 for single point), then padding=1
		expect(vp.xMin).toBe(1); // (3-1) - 1
		expect(vp.xMax).toBe(5); // (3+1) + 1
		expect(vp.yMin).toBe(3); // (5-1) - 1
		expect(vp.yMax).toBe(7); // (5+1) + 1
	});

	it('fits two points with default padding', () => {
		const vp = fitViewport([
			{ x: -5, y: -3 },
			{ x: 5, y: 3 }
		]);
		expect(vp.xMin).toBe(-6); // -5 - 1
		expect(vp.xMax).toBe(6); // 5 + 1
		expect(vp.yMin).toBe(-4); // -3 - 1
		expect(vp.yMax).toBe(4); // 3 + 1
	});

	it('respects custom padding', () => {
		const vp = fitViewport(
			[
				{ x: 0, y: 0 },
				{ x: 10, y: 10 }
			],
			2
		);
		expect(vp.xMin).toBe(-2); // 0 - 2
		expect(vp.xMax).toBe(12); // 10 + 2
		expect(vp.yMin).toBe(-2);
		expect(vp.yMax).toBe(12);
	});

	it('handles padding of 0', () => {
		const vp = fitViewport(
			[
				{ x: 1, y: 2 },
				{ x: 3, y: 4 }
			],
			0
		);
		expect(vp.xMin).toBe(1);
		expect(vp.xMax).toBe(3);
		expect(vp.yMin).toBe(2);
		expect(vp.yMax).toBe(4);
	});

	it('handles many points', () => {
		const points = [
			{ x: -100, y: 50 },
			{ x: 200, y: -30 },
			{ x: 0, y: 0 },
			{ x: 10, y: 100 }
		];
		const vp = fitViewport(points);
		expect(vp.xMin).toBe(-101); // min(-100) - 1
		expect(vp.xMax).toBe(201); // max(200) + 1
		expect(vp.yMin).toBe(-31); // min(-30) - 1
		expect(vp.yMax).toBe(101); // max(100) + 1
	});

	it('clamps negative padding to 0', () => {
		const vp = fitViewport(
			[
				{ x: 0, y: 0 },
				{ x: 10, y: 10 }
			],
			-5
		);
		// Negative padding clamped to 0, same as padding=0
		expect(vp.xMin).toBe(0);
		expect(vp.xMax).toBe(10);
		expect(vp.yMin).toBe(0);
		expect(vp.yMax).toBe(10);
	});

	it('handles points with same x (vertical line)', () => {
		const vp = fitViewport([
			{ x: 5, y: 0 },
			{ x: 5, y: 10 }
		]);
		// x is a single value -> expanded by 1 each side, then padding
		expect(vp.xMin).toBe(3); // (5-1) - 1
		expect(vp.xMax).toBe(7); // (5+1) + 1
		expect(vp.yMin).toBe(-1); // 0 - 1
		expect(vp.yMax).toBe(11); // 10 + 1
	});
});
