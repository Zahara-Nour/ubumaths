/**
 * Tests for Display Options Cascade Resolution
 *
 * Tests the 3-level cascade: global -> template -> variable
 * and the expansion of convenience options.
 */

import { describe, it, expect } from 'vitest';
import {
	resolveDisplayOptions,
	GLOBAL_DISPLAY_DEFAULTS,
	type DisplayOptions
} from './display-options';

describe('GLOBAL_DISPLAY_DEFAULTS', () => {
	it('should have all structural transforms disabled by default', () => {
		expect(GLOBAL_DISPLAY_DEFAULTS.shuffleTerms).toBe(false);
		expect(GLOBAL_DISPLAY_DEFAULTS.shuffleFactors).toBe(false);
		expect(GLOBAL_DISPLAY_DEFAULTS.shuffleTermsAndFactors).toBe(false);
		expect(GLOBAL_DISPLAY_DEFAULTS.shallowShuffleTerms).toBe(false);
		expect(GLOBAL_DISPLAY_DEFAULTS.shallowShuffleFactors).toBe(false);
		expect(GLOBAL_DISPLAY_DEFAULTS.removeNullTerms).toBe(false);
		expect(GLOBAL_DISPLAY_DEFAULTS.removeUnnecessaryBrackets).toBe(false);
	});

	it('should have addSpaces enabled by default', () => {
		expect(GLOBAL_DISPLAY_DEFAULTS.addSpaces).toBe(true);
	});

	it('should have keepUnnecessaryZeros disabled by default', () => {
		expect(GLOBAL_DISPLAY_DEFAULTS.keepUnnecessaryZeros).toBe(false);
	});

	it('should be a complete Required<DisplayOptions>', () => {
		// All keys must be defined
		const keys: (keyof DisplayOptions)[] = [
			'shuffleTerms',
			'shuffleFactors',
			'shuffleTermsAndFactors',
			'shallowShuffleTerms',
			'shallowShuffleFactors',
			'removeNullTerms',
			'removeUnnecessaryBrackets',
			'addSpaces',
			'keepUnnecessaryZeros'
		];

		for (const key of keys) {
			expect(GLOBAL_DISPLAY_DEFAULTS[key]).toBeDefined();
		}
	});
});

describe('resolveDisplayOptions', () => {
	describe('with no overrides', () => {
		it('should return global defaults when both parameters are undefined', () => {
			const result = resolveDisplayOptions(undefined, undefined);
			expect(result).toEqual(GLOBAL_DISPLAY_DEFAULTS);
		});

		it('should return global defaults when both parameters are empty objects', () => {
			const result = resolveDisplayOptions({}, {});
			expect(result).toEqual(GLOBAL_DISPLAY_DEFAULTS);
		});
	});

	describe('template-level overrides', () => {
		it('should apply template overrides to global defaults', () => {
			const templateOptions: DisplayOptions = {
				shuffleTerms: true,
				removeNullTerms: true
			};

			const result = resolveDisplayOptions(templateOptions, undefined);

			expect(result.shuffleTerms).toBe(true);
			expect(result.removeNullTerms).toBe(true);
			// Other values should remain as global defaults
			expect(result.shuffleFactors).toBe(false);
			expect(result.addSpaces).toBe(true);
		});

		it('should allow disabling addSpaces at template level', () => {
			const result = resolveDisplayOptions({ addSpaces: false }, undefined);
			expect(result.addSpaces).toBe(false);
		});
	});

	describe('variable-level overrides', () => {
		it('should apply variable overrides to global defaults', () => {
			const variableOptions: DisplayOptions = {
				shuffleFactors: true
			};

			const result = resolveDisplayOptions(undefined, variableOptions);

			expect(result.shuffleFactors).toBe(true);
			expect(result.shuffleTerms).toBe(false);
		});

		it('should override template settings with variable settings', () => {
			const templateOptions: DisplayOptions = {
				shuffleTerms: true,
				shuffleFactors: true
			};
			const variableOptions: DisplayOptions = {
				shuffleTerms: false // Override template
			};

			const result = resolveDisplayOptions(templateOptions, variableOptions);

			expect(result.shuffleTerms).toBe(false); // Variable wins
			expect(result.shuffleFactors).toBe(true); // Template value preserved
		});
	});

	describe('full cascade: global -> template -> variable', () => {
		it('should apply cascade in correct order', () => {
			// Global: addSpaces=true, all shuffles=false
			const templateOptions: DisplayOptions = {
				shuffleTerms: true, // Override global
				addSpaces: false // Override global
			};
			const variableOptions: DisplayOptions = {
				shuffleTerms: false // Override template
			};

			const result = resolveDisplayOptions(templateOptions, variableOptions);

			expect(result.shuffleTerms).toBe(false); // Variable wins
			expect(result.addSpaces).toBe(false); // Template override preserved
			expect(result.shuffleFactors).toBe(false); // Global default
		});

		it('should preserve unrelated options through cascade', () => {
			const templateOptions: DisplayOptions = {
				removeNullTerms: true
			};
			const variableOptions: DisplayOptions = {
				shuffleFactors: true
			};

			const result = resolveDisplayOptions(templateOptions, variableOptions);

			expect(result.removeNullTerms).toBe(true); // From template
			expect(result.shuffleFactors).toBe(true); // From variable
			expect(result.shuffleTerms).toBe(false); // From global
		});
	});

	describe('shuffleTermsAndFactors convenience option expansion', () => {
		it('should expand shuffleTermsAndFactors to shuffleTerms and shuffleFactors', () => {
			const options: DisplayOptions = {
				shuffleTermsAndFactors: true
			};

			const result = resolveDisplayOptions(options, undefined);

			expect(result.shuffleTerms).toBe(true);
			expect(result.shuffleFactors).toBe(true);
			expect(result.shuffleTermsAndFactors).toBe(true);
		});

		it('should not override explicit shuffleTerms when expanding', () => {
			const templateOptions: DisplayOptions = {
				shuffleTermsAndFactors: true // Would set shuffleTerms=true
			};
			const variableOptions: DisplayOptions = {
				shuffleTerms: false // Explicit override
			};

			const result = resolveDisplayOptions(templateOptions, variableOptions);

			expect(result.shuffleTerms).toBe(false); // Variable wins
			expect(result.shuffleFactors).toBe(true); // From template expansion
		});

		it('should not override explicit shuffleFactors when expanding', () => {
			const templateOptions: DisplayOptions = {
				shuffleTermsAndFactors: true
			};
			const variableOptions: DisplayOptions = {
				shuffleFactors: false
			};

			const result = resolveDisplayOptions(templateOptions, variableOptions);

			expect(result.shuffleTerms).toBe(true); // From template expansion
			expect(result.shuffleFactors).toBe(false); // Variable wins
		});

		it('should allow variable to use shuffleTermsAndFactors to override template', () => {
			const templateOptions: DisplayOptions = {
				shuffleTerms: false
			};
			const variableOptions: DisplayOptions = {
				shuffleTermsAndFactors: true
			};

			const result = resolveDisplayOptions(templateOptions, variableOptions);

			expect(result.shuffleTerms).toBe(true); // Variable expansion wins
			expect(result.shuffleFactors).toBe(true);
		});

		it('should expand at each level before cascade', () => {
			// Template expands shuffleTermsAndFactors -> shuffleTerms=true, shuffleFactors=true
			// Variable sets shuffleFactors=false
			// Result: shuffleTerms=true (template), shuffleFactors=false (variable)
			const templateOptions: DisplayOptions = {
				shuffleTermsAndFactors: true
			};
			const variableOptions: DisplayOptions = {
				shuffleFactors: false
			};

			const result = resolveDisplayOptions(templateOptions, variableOptions);

			expect(result.shuffleTerms).toBe(true);
			expect(result.shuffleFactors).toBe(false);
		});
	});

	describe('shallow shuffle options', () => {
		it('should support shallowShuffleTerms independently', () => {
			const result = resolveDisplayOptions({ shallowShuffleTerms: true }, undefined);
			expect(result.shallowShuffleTerms).toBe(true);
			expect(result.shuffleTerms).toBe(false);
		});

		it('should support shallowShuffleFactors independently', () => {
			const result = resolveDisplayOptions({ shallowShuffleFactors: true }, undefined);
			expect(result.shallowShuffleFactors).toBe(true);
			expect(result.shuffleFactors).toBe(false);
		});

		it('should allow combining shallow and deep shuffles', () => {
			const result = resolveDisplayOptions(
				{
					shuffleTerms: true, // Deep
					shallowShuffleFactors: true // Shallow
				},
				undefined
			);
			expect(result.shuffleTerms).toBe(true);
			expect(result.shallowShuffleFactors).toBe(true);
		});
	});

	describe('LaTeX formatting options', () => {
		it('should support keepUnnecessaryZeros', () => {
			const result = resolveDisplayOptions({ keepUnnecessaryZeros: true }, undefined);
			expect(result.keepUnnecessaryZeros).toBe(true);
		});

		it('should allow variable to override template addSpaces', () => {
			const result = resolveDisplayOptions({ addSpaces: false }, { addSpaces: true });
			expect(result.addSpaces).toBe(true);
		});
	});

	describe('edge cases', () => {
		it('should handle null-ish values gracefully', () => {
			// TypeScript prevents actual null/undefined in options object,
			// but empty objects should work fine
			const result = resolveDisplayOptions({}, {});
			expect(result).toEqual(GLOBAL_DISPLAY_DEFAULTS);
		});

		it('should return a new object, not mutate defaults', () => {
			const result = resolveDisplayOptions({ shuffleTerms: true }, undefined);
			expect(result).not.toBe(GLOBAL_DISPLAY_DEFAULTS);
			expect(GLOBAL_DISPLAY_DEFAULTS.shuffleTerms).toBe(false);
		});

		it('should handle all options being set at once', () => {
			const allOptions: Required<DisplayOptions> = {
				shuffleTerms: true,
				shuffleFactors: true,
				shuffleTermsAndFactors: true,
				shallowShuffleTerms: true,
				shallowShuffleFactors: true,
				removeNullTerms: true,
				removeUnnecessaryBrackets: true,
				addSpaces: false,
				keepUnnecessaryZeros: true
			};

			const result = resolveDisplayOptions(allOptions, undefined);

			expect(result.shuffleTerms).toBe(true);
			expect(result.shuffleFactors).toBe(true);
			expect(result.shuffleTermsAndFactors).toBe(true);
			expect(result.shallowShuffleTerms).toBe(true);
			expect(result.shallowShuffleFactors).toBe(true);
			expect(result.removeNullTerms).toBe(true);
			expect(result.removeUnnecessaryBrackets).toBe(true);
			expect(result.addSpaces).toBe(false);
			expect(result.keepUnnecessaryZeros).toBe(true);
		});
	});
});
