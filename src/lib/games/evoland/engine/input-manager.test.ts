/**
 * Tests for Evoland Input Manager
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { InputManager, KeyCode, createInputManager } from './input-manager';

describe('KeyCode constants', () => {
	it('should have correct arrow key codes', () => {
		expect(KeyCode.UP).toBe(38);
		expect(KeyCode.DOWN).toBe(40);
		expect(KeyCode.LEFT).toBe(37);
		expect(KeyCode.RIGHT).toBe(39);
	});

	it('should have correct WASD key codes', () => {
		expect(KeyCode.W).toBe(87);
		expect(KeyCode.A).toBe(65);
		expect(KeyCode.S).toBe(83);
		expect(KeyCode.D).toBe(68);
	});

	it('should have correct ZQSD key codes (French layout)', () => {
		expect(KeyCode.Z).toBe(90);
		expect(KeyCode.Q).toBe(81);
	});

	it('should have correct action key codes', () => {
		expect(KeyCode.SPACE).toBe(32);
		expect(KeyCode.ENTER).toBe(13);
		expect(KeyCode.ESCAPE).toBe(27);
	});
});

describe('InputManager', () => {
	let input: InputManager;
	let keyboardTarget: EventTarget;

	beforeEach(() => {
		keyboardTarget = new EventTarget();
		input = new InputManager({ keyboardTarget });
	});

	afterEach(() => {
		input.destroy();
	});

	describe('key state tracking', () => {
		it('should detect key down', () => {
			expect(input.isDown(KeyCode.SPACE)).toBe(false);

			keyboardTarget.dispatchEvent(new KeyboardEvent('keydown', { keyCode: KeyCode.SPACE }));

			expect(input.isDown(KeyCode.SPACE)).toBe(true);
		});

		it('should detect key up', () => {
			keyboardTarget.dispatchEvent(new KeyboardEvent('keydown', { keyCode: KeyCode.SPACE }));
			expect(input.isDown(KeyCode.SPACE)).toBe(true);

			keyboardTarget.dispatchEvent(new KeyboardEvent('keyup', { keyCode: KeyCode.SPACE }));
			expect(input.isDown(KeyCode.SPACE)).toBe(false);
		});

		it('should detect toggled key (just pressed this frame)', () => {
			input.update(); // Frame 1

			keyboardTarget.dispatchEvent(new KeyboardEvent('keydown', { keyCode: KeyCode.SPACE }));

			// Should be toggled on the frame it was pressed
			expect(input.isToggled(KeyCode.SPACE)).toBe(true);

			// After next frame, no longer toggled
			input.update(); // Frame 2
			expect(input.isToggled(KeyCode.SPACE)).toBe(false);
			expect(input.isDown(KeyCode.SPACE)).toBe(true); // Still held
		});

		it('should track multiple keys simultaneously', () => {
			keyboardTarget.dispatchEvent(new KeyboardEvent('keydown', { keyCode: KeyCode.UP }));
			keyboardTarget.dispatchEvent(new KeyboardEvent('keydown', { keyCode: KeyCode.SPACE }));

			expect(input.isDown(KeyCode.UP)).toBe(true);
			expect(input.isDown(KeyCode.SPACE)).toBe(true);
			expect(input.isDown(KeyCode.DOWN)).toBe(false);
		});
	});

	describe('getState()', () => {
		it('should return neutral state when no keys pressed', () => {
			const state = input.getState();
			expect(state.moveX).toBe(0);
			expect(state.moveY).toBe(0);
			expect(state.action).toBe(false);
			expect(state.actionHeld).toBe(false);
			expect(state.menu).toBe(false);
			expect(state.confirm).toBe(false);
		});

		it('should detect movement from arrow keys', () => {
			keyboardTarget.dispatchEvent(new KeyboardEvent('keydown', { keyCode: KeyCode.LEFT }));
			expect(input.getState().moveX).toBe(-1);

			keyboardTarget.dispatchEvent(new KeyboardEvent('keyup', { keyCode: KeyCode.LEFT }));
			keyboardTarget.dispatchEvent(new KeyboardEvent('keydown', { keyCode: KeyCode.RIGHT }));
			expect(input.getState().moveX).toBe(1);

			keyboardTarget.dispatchEvent(new KeyboardEvent('keyup', { keyCode: KeyCode.RIGHT }));
			keyboardTarget.dispatchEvent(new KeyboardEvent('keydown', { keyCode: KeyCode.UP }));
			expect(input.getState().moveY).toBe(-1);

			keyboardTarget.dispatchEvent(new KeyboardEvent('keyup', { keyCode: KeyCode.UP }));
			keyboardTarget.dispatchEvent(new KeyboardEvent('keydown', { keyCode: KeyCode.DOWN }));
			expect(input.getState().moveY).toBe(1);
		});

		it('should detect movement from WASD', () => {
			keyboardTarget.dispatchEvent(new KeyboardEvent('keydown', { keyCode: KeyCode.A }));
			expect(input.getState().moveX).toBe(-1);

			keyboardTarget.dispatchEvent(new KeyboardEvent('keyup', { keyCode: KeyCode.A }));
			keyboardTarget.dispatchEvent(new KeyboardEvent('keydown', { keyCode: KeyCode.D }));
			expect(input.getState().moveX).toBe(1);

			keyboardTarget.dispatchEvent(new KeyboardEvent('keyup', { keyCode: KeyCode.D }));
			keyboardTarget.dispatchEvent(new KeyboardEvent('keydown', { keyCode: KeyCode.W }));
			expect(input.getState().moveY).toBe(-1);

			keyboardTarget.dispatchEvent(new KeyboardEvent('keyup', { keyCode: KeyCode.W }));
			keyboardTarget.dispatchEvent(new KeyboardEvent('keydown', { keyCode: KeyCode.S }));
			expect(input.getState().moveY).toBe(1);
		});

		it('should detect movement from ZQSD (French layout)', () => {
			keyboardTarget.dispatchEvent(new KeyboardEvent('keydown', { keyCode: KeyCode.Q }));
			expect(input.getState().moveX).toBe(-1);

			keyboardTarget.dispatchEvent(new KeyboardEvent('keyup', { keyCode: KeyCode.Q }));
			keyboardTarget.dispatchEvent(new KeyboardEvent('keydown', { keyCode: KeyCode.Z }));
			expect(input.getState().moveY).toBe(-1);
		});

		it('should clamp movement to -1, 0, or 1', () => {
			// Press both left and right - should still be clamped
			keyboardTarget.dispatchEvent(new KeyboardEvent('keydown', { keyCode: KeyCode.LEFT }));
			keyboardTarget.dispatchEvent(
				new KeyboardEvent('keydown', { keyCode: KeyCode.A }) // Also left
			);
			keyboardTarget.dispatchEvent(
				new KeyboardEvent('keydown', { keyCode: KeyCode.Q }) // Also left (French)
			);

			const state = input.getState();
			expect(state.moveX).toBe(-1);
		});

		it('should detect action button', () => {
			input.update(); // Frame 1

			keyboardTarget.dispatchEvent(new KeyboardEvent('keydown', { keyCode: KeyCode.SPACE }));

			const state = input.getState();
			expect(state.action).toBe(true); // Just pressed
			expect(state.actionHeld).toBe(true); // Held down
		});

		it('should detect menu button', () => {
			input.update();

			keyboardTarget.dispatchEvent(new KeyboardEvent('keydown', { keyCode: KeyCode.ESCAPE }));

			expect(input.getState().menu).toBe(true);
		});

		it('should detect confirm button', () => {
			input.update();

			keyboardTarget.dispatchEvent(new KeyboardEvent('keydown', { keyCode: KeyCode.ENTER }));

			expect(input.getState().confirm).toBe(true);
		});
	});

	describe('reset()', () => {
		it('should clear all key states', () => {
			keyboardTarget.dispatchEvent(new KeyboardEvent('keydown', { keyCode: KeyCode.SPACE }));
			keyboardTarget.dispatchEvent(new KeyboardEvent('keydown', { keyCode: KeyCode.UP }));

			expect(input.isDown(KeyCode.SPACE)).toBe(true);
			expect(input.isDown(KeyCode.UP)).toBe(true);

			input.reset();

			expect(input.isDown(KeyCode.SPACE)).toBe(false);
			expect(input.isDown(KeyCode.UP)).toBe(false);
		});
	});

	describe('options', () => {
		it('should respect enableWasd option', () => {
			const inputNoWasd = new InputManager({
				keyboardTarget,
				enableWasd: false
			});

			keyboardTarget.dispatchEvent(new KeyboardEvent('keydown', { keyCode: KeyCode.A }));

			// WASD disabled, so A key should not trigger movement
			expect(inputNoWasd.getState().moveX).toBe(0);

			inputNoWasd.destroy();
		});

		it('should respect enableZqsd option', () => {
			const inputNoZqsd = new InputManager({
				keyboardTarget,
				enableZqsd: false
			});

			keyboardTarget.dispatchEvent(new KeyboardEvent('keydown', { keyCode: KeyCode.Q }));

			// ZQSD disabled, so Q key should not trigger movement
			expect(inputNoZqsd.getState().moveX).toBe(0);

			inputNoZqsd.destroy();
		});
	});

	describe('destroy()', () => {
		it('should remove event listeners', () => {
			input.destroy();

			// After destroy, new key presses should not be tracked
			keyboardTarget.dispatchEvent(new KeyboardEvent('keydown', { keyCode: KeyCode.SPACE }));

			expect(input.isDown(KeyCode.SPACE)).toBe(false);
		});
	});
});

describe('createInputManager', () => {
	it('should create an input manager', () => {
		const input = createInputManager();
		expect(input).toBeInstanceOf(InputManager);
		input.destroy();
	});
});

describe('Touch swipe detection', () => {
	let input: InputManager;
	let touchTarget: HTMLElement;

	beforeEach(() => {
		touchTarget = document.createElement('div');
		document.body.appendChild(touchTarget);
		input = new InputManager({ touchTarget, swipeThreshold: 30 });
	});

	afterEach(() => {
		input.destroy();
		touchTarget.remove();
	});

	function createTouchEvent(
		type: 'touchstart' | 'touchend' | 'touchcancel',
		x: number,
		y: number
	): TouchEvent {
		const touch = {
			clientX: x,
			clientY: y,
			identifier: 0,
			target: touchTarget,
			screenX: x,
			screenY: y,
			pageX: x,
			pageY: y,
			radiusX: 1,
			radiusY: 1,
			rotationAngle: 0,
			force: 1
		} as Touch;

		const touchList = {
			length: 1,
			item: () => touch,
			[0]: touch,
			[Symbol.iterator]: function* () {
				yield touch;
			}
		} as unknown as TouchList;

		return new TouchEvent(type, {
			touches: type === 'touchstart' ? touchList : ([] as unknown as TouchList),
			changedTouches: touchList,
			bubbles: true,
			cancelable: true
		});
	}

	it('should detect horizontal swipe right', () => {
		const startEvent = createTouchEvent('touchstart', 100, 100);
		const endEvent = createTouchEvent('touchend', 180, 100); // 80px to the right

		touchTarget.dispatchEvent(startEvent);
		touchTarget.dispatchEvent(endEvent);

		const swipe = input.getLastSwipe();
		expect(swipe.direction).toBe('right');
		expect(swipe.distance).toBeGreaterThanOrEqual(30);
	});

	it('should detect horizontal swipe left', () => {
		const startEvent = createTouchEvent('touchstart', 180, 100);
		const endEvent = createTouchEvent('touchend', 100, 100); // 80px to the left

		touchTarget.dispatchEvent(startEvent);
		touchTarget.dispatchEvent(endEvent);

		const swipe = input.getLastSwipe();
		expect(swipe.direction).toBe('left');
	});

	it('should detect vertical swipe down', () => {
		const startEvent = createTouchEvent('touchstart', 100, 100);
		const endEvent = createTouchEvent('touchend', 100, 180); // 80px down

		touchTarget.dispatchEvent(startEvent);
		touchTarget.dispatchEvent(endEvent);

		const swipe = input.getLastSwipe();
		expect(swipe.direction).toBe('down');
	});

	it('should detect vertical swipe up', () => {
		const startEvent = createTouchEvent('touchstart', 100, 180);
		const endEvent = createTouchEvent('touchend', 100, 100); // 80px up

		touchTarget.dispatchEvent(startEvent);
		touchTarget.dispatchEvent(endEvent);

		const swipe = input.getLastSwipe();
		expect(swipe.direction).toBe('up');
	});

	it('should not detect swipe below threshold', () => {
		const startEvent = createTouchEvent('touchstart', 100, 100);
		const endEvent = createTouchEvent('touchend', 110, 100); // Only 10px

		touchTarget.dispatchEvent(startEvent);
		touchTarget.dispatchEvent(endEvent);

		const swipe = input.getLastSwipe();
		expect(swipe.direction).toBeNull();
	});

	it('should clear swipe on clearSwipe()', () => {
		const startEvent = createTouchEvent('touchstart', 100, 100);
		const endEvent = createTouchEvent('touchend', 180, 100);

		touchTarget.dispatchEvent(startEvent);
		touchTarget.dispatchEvent(endEvent);

		expect(input.getLastSwipe().direction).toBe('right');

		input.clearSwipe();

		expect(input.getLastSwipe().direction).toBeNull();
	});

	it('should apply swipe to movement state', () => {
		const startEvent = createTouchEvent('touchstart', 100, 100);
		const endEvent = createTouchEvent('touchend', 180, 100); // Swipe right

		touchTarget.dispatchEvent(startEvent);
		touchTarget.dispatchEvent(endEvent);

		const state = input.getState();
		expect(state.moveX).toBe(1);

		// Second call should have consumed the swipe
		const state2 = input.getState();
		expect(state2.moveX).toBe(0);
	});
});
