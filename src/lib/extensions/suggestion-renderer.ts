/**
 * Suggestion Popup Renderer
 * =========================
 *
 * Shared utility for rendering autocomplete suggestion popups
 * for hashtags and mentions using tippy.js for positioning.
 *
 * @module extensions/suggestion-renderer
 */

import tippy, { type Instance as TippyInstance } from 'tippy.js';
import type { SuggestionProps, SuggestionKeyDownProps } from '@tiptap/suggestion';

/**
 * Configuration for suggestion items
 */
export interface SuggestionItem {
	/** Unique identifier for the item */
	id: string;
	/** Display label shown in the popup */
	label: string;
	/** Optional secondary text (e.g., display name for mentions) */
	description?: string;
}

/**
 * Configuration for the suggestion renderer
 */
export interface SuggestionRendererConfig {
	/** Type of suggestion (affects styling) */
	type: 'hashtag' | 'mention';
	/** Prefix character shown before each item */
	prefix: string;
	/** CSS class for the popup container */
	popupClass?: string;
	/** CSS class for each item */
	itemClass?: string;
	/** Text shown when no results match */
	noResultsText?: string;
}

/**
 * Internal state for the suggestion popup
 */
interface SuggestionState {
	items: SuggestionItem[];
	selectedIndex: number;
	command: (item: SuggestionItem) => void;
}

/**
 * Creates a suggestion renderer factory for TipTap's Suggestion plugin.
 *
 * @param config - Configuration for the renderer
 * @returns Object with render callbacks for Suggestion plugin
 *
 * @example
 * ```typescript
 * const renderer = createSuggestionRenderer({
 *   type: 'hashtag',
 *   prefix: '#',
 *   noResultsText: 'Aucun hashtag trouvé'
 * });
 *
 * Suggestion({
 *   // ... other config
 *   render: () => renderer
 * })
 * ```
 */
export function createSuggestionRenderer(config: SuggestionRendererConfig) {
	const {
		type,
		prefix,
		popupClass = 'suggestion-popup',
		itemClass = 'suggestion-item',
		noResultsText = 'Aucun résultat'
	} = config;

	let popup: HTMLDivElement | null = null;
	let tippyInstance: TippyInstance | null = null;
	let state: SuggestionState = {
		items: [],
		selectedIndex: 0,
		command: () => {}
	};

	/**
	 * Creates the popup DOM structure
	 */
	function createPopupElement(): HTMLDivElement {
		const el = document.createElement('div');
		el.classList.add(popupClass, `suggestion-popup-${type}`);
		el.setAttribute('role', 'listbox');
		el.setAttribute(
			'aria-label',
			type === 'hashtag' ? 'Suggestions de hashtags' : 'Suggestions de mentions'
		);
		return el;
	}

	/**
	 * Renders items in the popup
	 */
	function renderItems(): void {
		if (!popup) return;

		// Clear existing content
		popup.innerHTML = '';

		if (state.items.length === 0) {
			// Show no results message
			const noResults = document.createElement('div');
			noResults.classList.add('suggestion-no-results');
			noResults.textContent = noResultsText;
			popup.appendChild(noResults);
			return;
		}

		// Render each item
		state.items.forEach((item, index) => {
			const itemEl = document.createElement('button');
			itemEl.classList.add(itemClass);
			itemEl.setAttribute('role', 'option');
			itemEl.setAttribute('aria-selected', String(index === state.selectedIndex));

			if (index === state.selectedIndex) {
				itemEl.classList.add('selected');
			}

			// Create content
			const labelSpan = document.createElement('span');
			labelSpan.classList.add('suggestion-item-label');
			labelSpan.textContent = `${prefix}${item.label}`;
			itemEl.appendChild(labelSpan);

			// Add description if present (for mentions)
			if (item.description) {
				const descSpan = document.createElement('span');
				descSpan.classList.add('suggestion-item-description');
				descSpan.textContent = item.description;
				itemEl.appendChild(descSpan);
			}

			// Click handler
			itemEl.addEventListener('click', (e) => {
				e.preventDefault();
				e.stopPropagation();
				selectItem(index);
			});

			// Hover handler
			itemEl.addEventListener('mouseenter', () => {
				state.selectedIndex = index;
				renderItems();
			});

			popup.appendChild(itemEl);
		});
	}

	/**
	 * Selects an item and executes the command
	 */
	function selectItem(index: number): void {
		const item = state.items[index];
		if (item) {
			state.command(item);
		}
	}

	/**
	 * Updates the selected index with bounds checking
	 */
	function updateSelectedIndex(delta: number): void {
		if (state.items.length === 0) return;

		let newIndex = state.selectedIndex + delta;

		// Wrap around
		if (newIndex < 0) {
			newIndex = state.items.length - 1;
		} else if (newIndex >= state.items.length) {
			newIndex = 0;
		}

		state.selectedIndex = newIndex;
		renderItems();

		// Scroll selected item into view
		if (popup) {
			const selectedEl = popup.querySelector('.selected');
			selectedEl?.scrollIntoView({ block: 'nearest' });
		}
	}

	return {
		/**
		 * Called when suggestion popup should appear
		 */
		onStart: (props: SuggestionProps<SuggestionItem>) => {
			popup = createPopupElement();

			state = {
				items: props.items,
				selectedIndex: 0,
				command: props.command
			};

			renderItems();

			// Create tippy instance for positioning
			tippyInstance = tippy(document.body, {
				getReferenceClientRect: props.clientRect as () => DOMRect,
				appendTo: () => document.body,
				content: popup,
				showOnCreate: true,
				interactive: true,
				trigger: 'manual',
				placement: 'bottom-start',
				offset: [0, 8],
				// Prevent tippy from stealing focus
				popperOptions: {
					modifiers: [
						{
							name: 'preventOverflow',
							options: {
								boundary: 'viewport',
								padding: 8
							}
						},
						{
							name: 'flip',
							options: {
								fallbackPlacements: ['top-start', 'bottom-end', 'top-end']
							}
						}
					]
				}
			});
		},

		/**
		 * Called when suggestion items change (user types more)
		 */
		onUpdate: (props: SuggestionProps<SuggestionItem>) => {
			state.items = props.items;
			state.selectedIndex = 0;
			state.command = props.command;

			renderItems();

			// Update position
			if (tippyInstance) {
				tippyInstance.setProps({
					getReferenceClientRect: props.clientRect as () => DOMRect
				});
			}
		},

		/**
		 * Called for keyboard events when popup is open
		 * Returns true if the event was handled
		 */
		onKeyDown: (props: SuggestionKeyDownProps) => {
			const { event } = props;

			// Arrow Down - next item
			if (event.key === 'ArrowDown') {
				updateSelectedIndex(1);
				return true;
			}

			// Arrow Up - previous item
			if (event.key === 'ArrowUp') {
				updateSelectedIndex(-1);
				return true;
			}

			// Enter - select current item
			if (event.key === 'Enter') {
				if (state.items.length > 0) {
					selectItem(state.selectedIndex);
					return true;
				}
			}

			// Escape - close popup (handled by Suggestion plugin)
			if (event.key === 'Escape') {
				return true;
			}

			return false;
		},

		/**
		 * Called when popup should close
		 */
		onExit: () => {
			if (tippyInstance) {
				tippyInstance.destroy();
				tippyInstance = null;
			}
			popup = null;
		}
	};
}
