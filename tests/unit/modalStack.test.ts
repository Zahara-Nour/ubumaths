import { describe, it, expect, beforeEach, vi } from 'vitest';
import { modalStack } from '$lib/stores/modalStack.svelte';
import type { Component } from 'svelte';

// Mock component for testing
const MockComponent: Component = {} as Component;

describe('ModalStack Store', () => {
	beforeEach(() => {
		// Clear stack before each test
		modalStack.clear();
	});

	it('should start with empty stack', () => {
		expect(modalStack.isEmpty).toBe(true);
		expect(modalStack.depth).toBe(0);
		expect(modalStack.current).toBeNull();
	});

	it('should push modal onto stack', () => {
		const id = modalStack.push({
			component: MockComponent,
			props: { test: 'value' }
		});

		expect(typeof id).toBe('string');
		expect(modalStack.isEmpty).toBe(false);
		expect(modalStack.depth).toBe(1);
		expect(modalStack.current).toMatchObject({
			id,
			component: MockComponent,
			props: { test: 'value' }
		});
	});

	it('should push multiple modals and maintain stack order', () => {
		modalStack.push({
			component: MockComponent,
			props: { modal: 1 }
		});

		const id2 = modalStack.push({
			component: MockComponent,
			props: { modal: 2 }
		});

		expect(modalStack.depth).toBe(2);
		expect(modalStack.current?.id).toBe(id2);
		expect(modalStack.current?.props).toEqual({ modal: 2 });
	});

	it('should pop modal from stack', () => {
		const id1 = modalStack.push({
			component: MockComponent,
			props: { modal: 1 }
		});

		modalStack.push({
			component: MockComponent,
			props: { modal: 2 }
		});

		const popped = modalStack.pop();

		expect(popped?.props).toEqual({ modal: 2 });
		expect(modalStack.depth).toBe(1);
		expect(modalStack.current?.id).toBe(id1);
	});

	it('should call onReturn when popping to previous modal', () => {
		const onReturn = vi.fn();

		modalStack.push({
			component: MockComponent,
			props: { modal: 1 },
			onReturn
		});

		modalStack.push({
			component: MockComponent,
			props: { modal: 2 }
		});

		modalStack.pop();

		expect(onReturn).toHaveBeenCalledTimes(1);
	});

	it('should not call onReturn when popping last modal', () => {
		const onReturn = vi.fn();

		modalStack.push({
			component: MockComponent,
			props: { modal: 1 },
			onReturn
		});

		modalStack.pop();

		expect(onReturn).not.toHaveBeenCalled();
		expect(modalStack.isEmpty).toBe(true);
	});

	it('should popTo specific modal by id', () => {
		const id1 = modalStack.push({
			component: MockComponent,
			props: { modal: 1 }
		});

		modalStack.push({
			component: MockComponent,
			props: { modal: 2 }
		});

		modalStack.push({
			component: MockComponent,
			props: { modal: 3 }
		});

		expect(modalStack.depth).toBe(3);

		modalStack.popTo(id1);

		expect(modalStack.depth).toBe(1);
		expect(modalStack.current?.id).toBe(id1);
	});

	it('should call onReturn when using popTo', () => {
		const onReturn = vi.fn();

		const id1 = modalStack.push({
			component: MockComponent,
			props: { modal: 1 },
			onReturn
		});

		modalStack.push({
			component: MockComponent,
			props: { modal: 2 }
		});

		modalStack.popTo(id1);

		expect(onReturn).toHaveBeenCalledTimes(1);
	});

	it('should handle popTo with non-existent id gracefully', () => {
		modalStack.push({
			component: MockComponent,
			props: { modal: 1 }
		});

		const depthBefore = modalStack.depth;

		modalStack.popTo('non-existent-id');

		expect(modalStack.depth).toBe(depthBefore);
	});

	it('should clear entire stack', () => {
		modalStack.push({
			component: MockComponent,
			props: { modal: 1 }
		});

		modalStack.push({
			component: MockComponent,
			props: { modal: 2 }
		});

		expect(modalStack.depth).toBe(2);

		modalStack.clear();

		expect(modalStack.isEmpty).toBe(true);
		expect(modalStack.depth).toBe(0);
		expect(modalStack.current).toBeNull();
	});

	it('should handle canDismiss flag', () => {
		modalStack.push({
			component: MockComponent,
			props: {},
			canDismiss: false
		});

		expect(modalStack.current?.canDismiss).toBe(false);

		modalStack.clear();

		modalStack.push({
			component: MockComponent,
			props: {},
			canDismiss: true
		});

		expect(modalStack.current?.canDismiss).toBe(true);
	});

	it('should generate unique UUIDs for each modal', () => {
		const id1 = modalStack.push({
			component: MockComponent,
			props: {}
		});

		const id2 = modalStack.push({
			component: MockComponent,
			props: {}
		});

		expect(id1).not.toBe(id2);
		expect(typeof id1).toBe('string');
		expect(typeof id2).toBe('string');
	});
});
