<!--
  BlocklyWorkspace.svelte

  Reusable Blockly workspace wrapper component for UbuMaths visual programming.
  Provides initialization, auto-resize, state persistence, and event forwarding.

  @example
  ```svelte
  <script lang="ts">
    import BlocklyWorkspace from '$lib/components/blockly/BlocklyWorkspace.svelte';
    import type * as Blockly from 'blockly';

    let workspace = $state<Blockly.WorkspaceSvg | null>(null);

    function handleChange(event: Blockly.Events.Abstract) {
      console.log('Workspace changed:', event.type);
    }
  </script>

  <BlocklyWorkspace
    bind:workspace
    onchange={handleChange}
  />
  ```
-->
<script lang="ts">
	import * as Blockly from 'blockly';
	import 'blockly/blocks';
	import { onMount, onDestroy } from 'svelte';
	import {
		STANDARD_TOOLBOX,
		DEFAULT_WORKSPACE_OPTIONS,
		ERROR_MESSAGES,
		type ToolboxDefinition
	} from '$lib/shared/blockly';

	// =============================================================================
	// Types
	// =============================================================================

	/**
	 * Component props interface
	 */
	interface Props {
		/** The Blockly workspace instance (bindable for parent access) */
		workspace?: Blockly.WorkspaceSvg | null;
		/** Toolbox definition for the workspace */
		toolbox?: ToolboxDefinition;
		/** Blockly theme for styling */
		theme?: Blockly.Theme;
		/** Whether the workspace is read-only */
		readonly?: boolean;
		/** Initial workspace state as JSON string */
		initialState?: string;
		/** Callback for workspace change events */
		onchange?: (event: Blockly.Events.Abstract) => void;
	}

	// =============================================================================
	// Props
	// =============================================================================

	let {
		workspace = $bindable(null),
		toolbox = STANDARD_TOOLBOX,
		theme = undefined,
		readonly = false,
		initialState = undefined,
		onchange = undefined
	}: Props = $props();

	// =============================================================================
	// State
	// =============================================================================

	/** Reference to the container div element */
	let containerRef: HTMLDivElement | null = $state(null);

	/** ResizeObserver for auto-resize functionality */
	let resizeObserver: ResizeObserver | null = $state(null);

	/** Track if initial state has been loaded */
	let initialStateLoaded = $state(false);

	// =============================================================================
	// Lifecycle
	// =============================================================================

	onMount(() => {
		initializeWorkspace();
	});

	onDestroy(() => {
		cleanup();
	});

	// =============================================================================
	// Workspace Initialization
	// =============================================================================

	/**
	 * Initialize the Blockly workspace with configuration
	 */
	function initializeWorkspace(): void {
		if (!containerRef) {
			console.error(ERROR_MESSAGES.WORKSPACE_NOT_INITIALIZED);
			return;
		}

		try {
			// Create workspace options
			const options: Blockly.BlocklyOptions = {
				...DEFAULT_WORKSPACE_OPTIONS,
				toolbox: toolbox as Blockly.utils.toolbox.ToolboxDefinition,
				readOnly: readonly
			};

			// Add theme if provided
			if (theme) {
				options.theme = theme;
			}

			// Inject Blockly into the container
			workspace = Blockly.inject(containerRef, options);

			// Setup change listener
			if (onchange) {
				workspace.addChangeListener(handleWorkspaceChange);
			}

			// Setup resize observer for auto-resize
			setupResizeObserver();

			// Load initial state if provided
			if (initialState && !initialStateLoaded) {
				loadWorkspaceState(initialState);
				initialStateLoaded = true;
			}
		} catch (error) {
			console.error('Failed to initialize Blockly workspace:', error);
			workspace = null;
		}
	}

	// =============================================================================
	// Event Handling
	// =============================================================================

	/**
	 * Handle workspace change events and forward to parent
	 * @param event - The Blockly change event
	 */
	function handleWorkspaceChange(event: Blockly.Events.Abstract): void {
		// Skip UI events that don't affect the workspace state
		if (event.isUiEvent) {
			return;
		}

		onchange?.(event);
	}

	// =============================================================================
	// Resize Handling
	// =============================================================================

	/**
	 * Setup ResizeObserver to auto-resize workspace when container changes
	 */
	function setupResizeObserver(): void {
		if (!containerRef || !workspace) {
			return;
		}

		resizeObserver = new ResizeObserver(() => {
			if (workspace) {
				Blockly.svgResize(workspace);
			}
		});

		resizeObserver.observe(containerRef);
	}

	// =============================================================================
	// State Management
	// =============================================================================

	/**
	 * Load workspace state from JSON string
	 * @param stateJson - JSON serialized workspace state
	 */
	function loadWorkspaceState(stateJson: string): void {
		if (!workspace) {
			console.error(ERROR_MESSAGES.WORKSPACE_NOT_INITIALIZED);
			return;
		}

		try {
			const state = JSON.parse(stateJson) as object;
			Blockly.serialization.workspaces.load(state, workspace);
		} catch (error) {
			console.error(ERROR_MESSAGES.WORKSPACE_LOAD_FAILED, error);
		}
	}

	/**
	 * Serialize current workspace state to JSON string
	 * @returns JSON serialized workspace state
	 */
	export function serializeWorkspace(): string {
		if (!workspace) {
			console.error(ERROR_MESSAGES.WORKSPACE_NOT_INITIALIZED);
			return '{}';
		}

		try {
			const state = Blockly.serialization.workspaces.save(workspace);
			return JSON.stringify(state);
		} catch (error) {
			console.error('Failed to serialize workspace:', error);
			return '{}';
		}
	}

	/**
	 * Clear all blocks from the workspace
	 */
	export function clearWorkspace(): void {
		if (!workspace) {
			return;
		}

		workspace.clear();
	}

	/**
	 * Get the number of blocks in the workspace
	 * @returns Number of blocks
	 */
	export function getBlockCount(): number {
		if (!workspace) {
			return 0;
		}

		return workspace.getAllBlocks(false).length;
	}

	// =============================================================================
	// Cleanup
	// =============================================================================

	/**
	 * Clean up resources on component destroy
	 */
	function cleanup(): void {
		// Disconnect resize observer
		if (resizeObserver) {
			resizeObserver.disconnect();
			resizeObserver = null;
		}

		// Dispose Blockly workspace
		if (workspace) {
			workspace.dispose();
			workspace = null;
		}
	}

	// =============================================================================
	// Effects
	// =============================================================================

	/**
	 * Effect to handle initialState changes after initial load
	 * Allows parent to update workspace state dynamically
	 */
	$effect(() => {
		// Track initialState dependency
		const currentState = initialState;

		// Only load state if workspace exists and we've already done initial load
		if (workspace && initialStateLoaded && currentState) {
			loadWorkspaceState(currentState);
		}
	});

	/**
	 * Effect to handle readonly changes
	 * Reinitialize workspace when readonly prop changes
	 */
	$effect(() => {
		// Track readonly dependency
		const isReadonly = readonly;

		// If workspace exists and readonly changed, we need to reinitialize
		// Blockly doesn't support changing readOnly after initialization
		if (workspace && containerRef) {
			const currentReadOnly = workspace.options.readOnly;
			if (currentReadOnly !== isReadonly) {
				// Save current state before reinitializing
				const savedState = serializeWorkspace();

				// Cleanup and reinitialize
				cleanup();
				initializeWorkspace();

				// Restore state
				if (savedState !== '{}') {
					loadWorkspaceState(savedState);
				}
			}
		}
	});
</script>

<div
	bind:this={containerRef}
	class="h-full w-full"
	role="application"
	aria-label="Espace de travail Blockly"
></div>
