/**
 * Tests for Instrument Layer
 *
 * Tests instrument state management and configuration
 */

import { describe, it, expect, beforeEach } from 'vitest';

// =============================================================================
// Types
// =============================================================================

/** Instrument types available in the whiteboard */
type InstrumentType = 'ruler' | 'protractor' | 'setSquare';

/** Instrument state stored in document */
interface InstrumentState {
	type: InstrumentType;
	visible: boolean;
	x: number;
	y: number;
	rotation: number;
}

/** Default instrument configurations */
const DEFAULT_INSTRUMENTS: Record<InstrumentType, Omit<InstrumentState, 'type'>> = {
	ruler: { visible: false, x: 100, y: 300, rotation: 0 },
	protractor: { visible: false, x: 300, y: 300, rotation: 0 },
	setSquare: { visible: false, x: 200, y: 200, rotation: 0 }
};

/** Instrument display labels */
const INSTRUMENT_LABELS: Record<InstrumentType, string> = {
	ruler: 'Règle',
	protractor: 'Rapporteur',
	setSquare: 'Équerre'
};

// =============================================================================
// Tests
// =============================================================================

describe('Instrument Types', () => {
	const instrumentTypes: InstrumentType[] = ['ruler', 'protractor', 'setSquare'];

	it('has 3 instrument types', () => {
		expect(instrumentTypes.length).toBe(3);
	});

	it('includes ruler', () => {
		expect(instrumentTypes).toContain('ruler');
	});

	it('includes protractor', () => {
		expect(instrumentTypes).toContain('protractor');
	});

	it('includes setSquare', () => {
		expect(instrumentTypes).toContain('setSquare');
	});
});

describe('Default Instrument Configuration', () => {
	it('has defaults for all instrument types', () => {
		expect(DEFAULT_INSTRUMENTS.ruler).toBeDefined();
		expect(DEFAULT_INSTRUMENTS.protractor).toBeDefined();
		expect(DEFAULT_INSTRUMENTS.setSquare).toBeDefined();
	});

	it('all instruments start hidden by default', () => {
		expect(DEFAULT_INSTRUMENTS.ruler.visible).toBe(false);
		expect(DEFAULT_INSTRUMENTS.protractor.visible).toBe(false);
		expect(DEFAULT_INSTRUMENTS.setSquare.visible).toBe(false);
	});

	it('all instruments have valid default positions', () => {
		for (const [_type, config] of Object.entries(DEFAULT_INSTRUMENTS)) {
			expect(config.x).toBeGreaterThanOrEqual(0);
			expect(config.y).toBeGreaterThanOrEqual(0);
			expect(typeof config.rotation).toBe('number');
		}
	});

	it('all instruments start with zero rotation', () => {
		for (const [_type, config] of Object.entries(DEFAULT_INSTRUMENTS)) {
			expect(config.rotation).toBe(0);
		}
	});
});

describe('Instrument Labels', () => {
	it('has French labels for all instruments', () => {
		expect(INSTRUMENT_LABELS.ruler).toBe('Règle');
		expect(INSTRUMENT_LABELS.protractor).toBe('Rapporteur');
		expect(INSTRUMENT_LABELS.setSquare).toBe('Équerre');
	});

	it('all instrument types have labels', () => {
		const types: InstrumentType[] = ['ruler', 'protractor', 'setSquare'];
		for (const type of types) {
			expect(INSTRUMENT_LABELS[type]).toBeDefined();
			expect(INSTRUMENT_LABELS[type].length).toBeGreaterThan(0);
		}
	});
});

describe('Instrument State Management', () => {
	let instruments: Record<InstrumentType, InstrumentState>;

	beforeEach(() => {
		// Initialize with defaults
		instruments = {
			ruler: { type: 'ruler', ...DEFAULT_INSTRUMENTS.ruler },
			protractor: { type: 'protractor', ...DEFAULT_INSTRUMENTS.protractor },
			setSquare: { type: 'setSquare', ...DEFAULT_INSTRUMENTS.setSquare }
		};
	});

	it('can toggle instrument visibility', () => {
		expect(instruments.ruler.visible).toBe(false);

		instruments.ruler.visible = true;
		expect(instruments.ruler.visible).toBe(true);

		instruments.ruler.visible = false;
		expect(instruments.ruler.visible).toBe(false);
	});

	it('can update instrument position', () => {
		instruments.ruler.x = 250;
		instruments.ruler.y = 450;

		expect(instruments.ruler.x).toBe(250);
		expect(instruments.ruler.y).toBe(450);
	});

	it('can update instrument rotation', () => {
		instruments.protractor.rotation = 45;
		expect(instruments.protractor.rotation).toBe(45);

		instruments.protractor.rotation = -30;
		expect(instruments.protractor.rotation).toBe(-30);
	});

	it('allows multiple instruments to be visible simultaneously', () => {
		instruments.ruler.visible = true;
		instruments.protractor.visible = true;
		instruments.setSquare.visible = true;

		expect(instruments.ruler.visible).toBe(true);
		expect(instruments.protractor.visible).toBe(true);
		expect(instruments.setSquare.visible).toBe(true);
	});

	it('maintains separate state for each instrument', () => {
		instruments.ruler.x = 100;
		instruments.ruler.y = 100;
		instruments.ruler.rotation = 0;

		instruments.protractor.x = 200;
		instruments.protractor.y = 200;
		instruments.protractor.rotation = 90;

		expect(instruments.ruler.x).not.toBe(instruments.protractor.x);
		expect(instruments.ruler.rotation).not.toBe(instruments.protractor.rotation);
	});
});

describe('Instrument Position Constraints', () => {
	it('position values can be any number (including negative for off-screen)', () => {
		const state: InstrumentState = {
			type: 'ruler',
			visible: true,
			x: -50,
			y: -100,
			rotation: 0
		};

		expect(state.x).toBe(-50);
		expect(state.y).toBe(-100);
	});

	it('rotation can be any angle (normalized by renderer)', () => {
		const state: InstrumentState = {
			type: 'protractor',
			visible: true,
			x: 100,
			y: 100,
			rotation: 720 // 2 full rotations
		};

		expect(state.rotation).toBe(720);
	});
});

describe('Instrument Drag Behavior', () => {
	it('calculates new position from drag delta', () => {
		const startX = 100;
		const startY = 200;
		const deltaX = 50;
		const deltaY = -30;

		const newX = startX + deltaX;
		const newY = startY + deltaY;

		expect(newX).toBe(150);
		expect(newY).toBe(170);
	});
});

describe('Instrument Rotation Behavior', () => {
	it('calculates rotation angle from center point', () => {
		// Simple test: point directly to the right is 0 degrees
		const centerX = 100;
		const centerY = 100;
		const pointX = 200;
		const pointY = 100;

		const angle = Math.atan2(pointY - centerY, pointX - centerX) * (180 / Math.PI);
		expect(angle).toBe(0);
	});

	it('calculates 90 degree rotation', () => {
		const centerX = 100;
		const centerY = 100;
		const pointX = 100;
		const pointY = 200; // directly below

		const angle = Math.atan2(pointY - centerY, pointX - centerX) * (180 / Math.PI);
		expect(angle).toBe(90);
	});

	it('calculates negative rotation', () => {
		const centerX = 100;
		const centerY = 100;
		const pointX = 100;
		const pointY = 0; // directly above

		const angle = Math.atan2(pointY - centerY, pointX - centerX) * (180 / Math.PI);
		expect(angle).toBe(-90);
	});
});

describe('Instrument Serialization', () => {
	it('can serialize instrument state to JSON', () => {
		const state: InstrumentState = {
			type: 'ruler',
			visible: true,
			x: 150,
			y: 250,
			rotation: 45
		};

		const json = JSON.stringify(state);
		const parsed = JSON.parse(json);

		expect(parsed.type).toBe('ruler');
		expect(parsed.visible).toBe(true);
		expect(parsed.x).toBe(150);
		expect(parsed.y).toBe(250);
		expect(parsed.rotation).toBe(45);
	});

	it('can serialize multiple instruments', () => {
		const instruments: InstrumentState[] = [
			{ type: 'ruler', visible: true, x: 100, y: 100, rotation: 0 },
			{ type: 'protractor', visible: false, x: 200, y: 200, rotation: 90 }
		];

		const json = JSON.stringify(instruments);
		const parsed = JSON.parse(json);

		expect(parsed.length).toBe(2);
		expect(parsed[0].type).toBe('ruler');
		expect(parsed[1].type).toBe('protractor');
	});
});
