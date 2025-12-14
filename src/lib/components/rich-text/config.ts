/**
 * Rich Text Editor Configuration
 * ================================
 *
 * Shared configuration constants for text colors, highlights, emojis, and math templates.
 * Unified from RichTextEditor.svelte and FormRichTextEditor.svelte.
 */

import type {
	TextColor,
	HighlightColor,
	MathTemplate,
	EmojiCategory,
	EditorPreset,
	PresetConfig
} from './types';

/**
 * Text Color Palette (8 colors)
 * Used for text color picker in toolbar
 */
export const TEXT_COLORS: TextColor[] = [
	{ name: 'Noir', value: '#000000' },
	{ name: 'Rouge', value: '#ef4444' },
	{ name: 'Orange', value: '#f97316' },
	{ name: 'Jaune', value: '#eab308' },
	{ name: 'Vert', value: '#22c55e' },
	{ name: 'Bleu', value: '#3b82f6' },
	{ name: 'Violet', value: '#8b5cf6' },
	{ name: 'Rose', value: '#ec4899' }
];

/**
 * Highlight Color Palette (7 colors including "Aucun")
 * Used for text highlighting in toolbar
 */
export const HIGHLIGHT_COLORS: HighlightColor[] = [
	{ name: 'Aucun', value: null },
	{ name: 'Jaune', value: '#fef3c7' },
	{ name: 'Rouge', value: '#fecaca' },
	{ name: 'Vert', value: '#d9f99d' },
	{ name: 'Bleu', value: '#bfdbfe' },
	{ name: 'Violet', value: '#e9d5ff' },
	{ name: 'Rose', value: '#fbcfe8' }
];

/**
 * Curated Emoji Categories for Educational Use
 * ==============================================
 *
 * 200+ carefully selected emojis organized into 8 categories.
 * No external emoji libraries - uses native Unicode emojis.
 *
 * Category Selection Rationale:
 * - Smileys: Student/teacher expression and engagement
 * - Feedback: Quick positive/negative responses
 * - Math & Science: Domain-specific educational symbols
 * - School: Study materials and academic context
 * - Stars & Symbols: Achievement marking and feedback
 * - Shapes: Visual representation and color coding
 * - Arrows: Directional indicators for problem-solving
 * - Nature: Universal symbols for context setting
 */
export const EMOJI_CATEGORIES: EmojiCategory[] = [
	{
		name: 'Smileys',
		emojis: [
			'😊',
			'😀',
			'😃',
			'😄',
			'😁',
			'😅',
			'😂',
			'🤣',
			'😉',
			'😌',
			'😍',
			'🥰',
			'😘',
			'😋',
			'😎',
			'🤓',
			'🧐',
			'🤔',
			'🤨',
			'😐',
			'😑',
			'😶',
			'🙄',
			'😏',
			'😬',
			'😮',
			'😯',
			'😲',
			'😳',
			'🥺',
			'😢',
			'😭',
			'😤',
			'😠',
			'😡',
			'🤯',
			'😱'
		]
	},
	{
		name: 'Feedback',
		emojis: [
			'👍',
			'👎',
			'👏',
			'🙌',
			'👌',
			'✌️',
			'🤞',
			'🤝',
			'🙏',
			'✋',
			'🤚',
			'👋',
			'💪',
			'✊',
			'👊',
			'🤜',
			'🤛'
		]
	},
	{
		name: 'Math & Science',
		emojis: [
			'📐',
			'📏',
			'📊',
			'📈',
			'📉',
			'🔬',
			'🔭',
			'⚗️',
			'🧮',
			'🧬',
			'⚛️',
			'🔢',
			'➕',
			'➖',
			'✖️',
			'➗',
			'🟰'
		]
	},
	{
		name: 'School',
		emojis: [
			'📚',
			'📖',
			'📝',
			'✏️',
			'✒️',
			'🖊️',
			'🖍️',
			'📒',
			'📓',
			'📔',
			'📕',
			'📗',
			'📘',
			'📙',
			'🎓',
			'🎒',
			'🏫',
			'💡',
			'🧠',
			'📌',
			'📍',
			'✂️',
			'📎'
		]
	},
	{
		name: 'Stars & Symbols',
		emojis: [
			'⭐',
			'🌟',
			'✨',
			'💫',
			'🔥',
			'💥',
			'✅',
			'❌',
			'⚠️',
			'❗',
			'❓',
			'❕',
			'❔',
			'💯',
			'🎯',
			'🏆',
			'🥇',
			'🥈',
			'🥉',
			'🎖️',
			'🏅'
		]
	},
	{
		name: 'Shapes',
		emojis: [
			'🔴',
			'🟠',
			'🟡',
			'🟢',
			'🔵',
			'🟣',
			'🟤',
			'⚫',
			'⚪',
			'🟥',
			'🟧',
			'🟨',
			'🟩',
			'🟦',
			'🟪',
			'🟫',
			'⬛',
			'⬜',
			'🔶',
			'🔷',
			'🔸',
			'🔹',
			'🔺',
			'🔻',
			'💠',
			'🔘'
		]
	},
	{
		name: 'Arrows',
		emojis: [
			'⬆️',
			'↗️',
			'➡️',
			'↘️',
			'⬇️',
			'↙️',
			'⬅️',
			'↖️',
			'↕️',
			'↔️',
			'↩️',
			'↪️',
			'⤴️',
			'⤵️',
			'🔃',
			'🔄',
			'🔀',
			'🔁',
			'🔂'
		]
	},
	{
		name: 'Nature',
		emojis: [
			'🌞',
			'🌝',
			'🌛',
			'⭐',
			'🌟',
			'💫',
			'✨',
			'🌍',
			'🌎',
			'🌏',
			'🌈',
			'☀️',
			'⛅',
			'☁️',
			'🌧️',
			'⛈️',
			'🌩️',
			'⚡',
			'❄️',
			'🔥',
			'💧',
			'🌊'
		]
	}
];

/**
 * Math Templates - Full Set (9 templates)
 * All mathematical templates available in RichTextEditor
 */
export const MATH_TEMPLATES_FULL: MathTemplate[] = [
	{ label: 'Fraction', latex: '\\frac{a}{b}', icon: 'ᵃ⁄ᵦ', title: 'Fraction' },
	{ label: 'Racine carrée', latex: '\\sqrt{x}', icon: '√x', title: 'Racine carrée' },
	{ label: 'Puissance', latex: 'x^{n}', icon: 'xⁿ', title: 'Puissance' },
	{ label: 'Indice', latex: 'x_{i}', icon: 'xᵢ', title: 'Indice' },
	{ label: 'Intégrale', latex: '\\int_{a}^{b} f(x) dx', icon: '∫', title: 'Intégrale' },
	{ label: 'Somme', latex: '\\sum_{i=1}^{n} x_i', icon: '∑', title: 'Somme' },
	{ label: 'Limite', latex: '\\lim_{x \\to \\infty} f(x)', icon: 'lim', title: 'Limite' },
	{ label: 'Dérivée', latex: '\\frac{d}{dx} f(x)', icon: "f'", title: 'Dérivée' },
	{
		label: 'Équation du 2nd degré',
		latex: '\\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}',
		icon: '±',
		title: 'Équation du 2nd degré'
	}
];

/**
 * Math Templates - Basic Set (4 templates)
 * Subset of templates for simplified UI (FormRichTextEditor)
 */
export const MATH_TEMPLATES_BASIC: MathTemplate[] = [
	{ label: 'Fraction', latex: '\\frac{a}{b}', icon: 'ᵃ⁄ᵦ', title: 'Fraction' },
	{ label: 'Racine carrée', latex: '\\sqrt{x}', icon: '√x', title: 'Racine carrée' },
	{ label: 'Puissance', latex: 'x^{n}', icon: 'xⁿ', title: 'Puissance' },
	{ label: 'Indice', latex: 'x_{i}', icon: 'xᵢ', title: 'Indice' }
];

/**
 * Editor Presets - Predefined configurations for common use cases
 *
 * - minimal: Basic text formatting only (comments, simple notes)
 * - standard: Common features without templates (exercises, general content)
 * - full: All features including templates (exercise creation, advanced content)
 */
export const EDITOR_PRESETS: Record<EditorPreset, PresetConfig> = {
	minimal: {
		toolbar: {
			text: true,
			paragraph: false,
			insertion: false,
			formula: false,
			templates: false,
			more: false
		},
		mathTemplates: 'none'
	},
	standard: {
		toolbar: {
			text: true,
			paragraph: true,
			insertion: true,
			formula: true,
			templates: false,
			more: false
		},
		mathTemplates: 'basic'
	},
	full: {
		toolbar: {
			text: true,
			paragraph: true,
			insertion: true,
			formula: true,
			templates: true,
			more: true
		},
		mathTemplates: 'full'
	}
};
