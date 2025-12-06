/**
 * Standard Blockly toolbox configuration for UbuMaths.
 *
 * Provides a comprehensive set of programming blocks organized into French-labeled categories:
 * - Logique (Logic): Conditionals, comparisons, boolean operations
 * - Boucles (Loops): Repeat, while, for loops
 * - Math: Arithmetic, trigonometry, constants
 * - Texte (Text): String manipulation and output
 * - Variables: Dynamic variable management
 * - Fonctions (Functions): Dynamic procedure management
 *
 * All block types use Blockly's standard definitions with French category names
 * appropriate for the French-speaking mathematics education context.
 */

/**
 * Standard toolbox configuration with French category labels.
 * Uses Blockly's category toolbox with predefined blocks organized by functionality.
 */
export const STANDARD_TOOLBOX = {
	kind: 'categoryToolbox',
	contents: [
		// Logic category - Conditionals and boolean operations
		{
			kind: 'category',
			name: 'Logique',
			colour: '#3D5570',
			contents: [
				{
					kind: 'block',
					type: 'controls_if'
				},
				{
					kind: 'block',
					type: 'logic_compare'
				},
				{
					kind: 'block',
					type: 'logic_operation'
				},
				{
					kind: 'block',
					type: 'logic_negate'
				},
				{
					kind: 'block',
					type: 'logic_boolean'
				},
				{
					kind: 'block',
					type: 'logic_null'
				},
				{
					kind: 'block',
					type: 'logic_ternary'
				}
			]
		},

		// Loops category - Iteration constructs
		{
			kind: 'category',
			name: 'Boucles',
			colour: '#3D703D',
			contents: [
				{
					kind: 'block',
					type: 'controls_repeat_ext',
					inputs: {
						TIMES: {
							shadow: {
								type: 'math_number',
								fields: {
									NUM: 10
								}
							}
						}
					}
				},
				{
					kind: 'block',
					type: 'controls_whileUntil'
				},
				{
					kind: 'block',
					type: 'controls_for',
					inputs: {
						FROM: {
							shadow: {
								type: 'math_number',
								fields: {
									NUM: 1
								}
							}
						},
						TO: {
							shadow: {
								type: 'math_number',
								fields: {
									NUM: 10
								}
							}
						},
						BY: {
							shadow: {
								type: 'math_number',
								fields: {
									NUM: 1
								}
							}
						}
					}
				},
				{
					kind: 'block',
					type: 'controls_forEach'
				},
				{
					kind: 'block',
					type: 'controls_flow_statements'
				}
			]
		},

		// Math category - Arithmetic and mathematical operations
		{
			kind: 'category',
			name: 'Math',
			colour: '#3D4570',
			contents: [
				{
					kind: 'block',
					type: 'math_number',
					fields: {
						NUM: 0
					}
				},
				{
					kind: 'block',
					type: 'math_arithmetic',
					inputs: {
						A: {
							shadow: {
								type: 'math_number',
								fields: {
									NUM: 1
								}
							}
						},
						B: {
							shadow: {
								type: 'math_number',
								fields: {
									NUM: 1
								}
							}
						}
					}
				},
				{
					kind: 'block',
					type: 'math_single',
					inputs: {
						NUM: {
							shadow: {
								type: 'math_number',
								fields: {
									NUM: 9
								}
							}
						}
					}
				},
				{
					kind: 'block',
					type: 'math_trig',
					inputs: {
						NUM: {
							shadow: {
								type: 'math_number',
								fields: {
									NUM: 45
								}
							}
						}
					}
				},
				{
					kind: 'block',
					type: 'math_constant'
				},
				{
					kind: 'block',
					type: 'math_number_property',
					inputs: {
						NUMBER_TO_CHECK: {
							shadow: {
								type: 'math_number',
								fields: {
									NUM: 0
								}
							}
						}
					}
				},
				{
					kind: 'block',
					type: 'math_round',
					inputs: {
						NUM: {
							shadow: {
								type: 'math_number',
								fields: {
									NUM: 3.1
								}
							}
						}
					}
				},
				{
					kind: 'block',
					type: 'math_on_list'
				},
				{
					kind: 'block',
					type: 'math_modulo',
					inputs: {
						DIVIDEND: {
							shadow: {
								type: 'math_number',
								fields: {
									NUM: 64
								}
							}
						},
						DIVISOR: {
							shadow: {
								type: 'math_number',
								fields: {
									NUM: 10
								}
							}
						}
					}
				},
				{
					kind: 'block',
					type: 'math_constrain',
					inputs: {
						VALUE: {
							shadow: {
								type: 'math_number',
								fields: {
									NUM: 50
								}
							}
						},
						LOW: {
							shadow: {
								type: 'math_number',
								fields: {
									NUM: 1
								}
							}
						},
						HIGH: {
							shadow: {
								type: 'math_number',
								fields: {
									NUM: 100
								}
							}
						}
					}
				},
				{
					kind: 'block',
					type: 'math_random_int',
					inputs: {
						FROM: {
							shadow: {
								type: 'math_number',
								fields: {
									NUM: 1
								}
							}
						},
						TO: {
							shadow: {
								type: 'math_number',
								fields: {
									NUM: 100
								}
							}
						}
					}
				},
				{
					kind: 'block',
					type: 'math_random_float'
				}
			]
		},

		// Text category - String operations and output
		{
			kind: 'category',
			name: 'Texte',
			colour: '#3D705E',
			contents: [
				{
					kind: 'block',
					type: 'text',
					fields: {
						TEXT: ''
					}
				},
				{
					kind: 'block',
					type: 'text_print',
					inputs: {
						TEXT: {
							shadow: {
								type: 'text',
								fields: {
									TEXT: 'abc'
								}
							}
						}
					}
				},
				{
					kind: 'block',
					type: 'text_join'
				},
				{
					kind: 'block',
					type: 'text_append',
					inputs: {
						TEXT: {
							shadow: {
								type: 'text',
								fields: {
									TEXT: ''
								}
							}
						}
					}
				},
				{
					kind: 'block',
					type: 'text_length',
					inputs: {
						VALUE: {
							shadow: {
								type: 'text',
								fields: {
									TEXT: 'abc'
								}
							}
						}
					}
				},
				{
					kind: 'block',
					type: 'text_isEmpty',
					inputs: {
						VALUE: {
							shadow: {
								type: 'text',
								fields: {
									TEXT: ''
								}
							}
						}
					}
				},
				{
					kind: 'block',
					type: 'text_indexOf',
					inputs: {
						VALUE: {
							shadow: {
								type: 'text',
								fields: {
									TEXT: 'abc'
								}
							}
						},
						FIND: {
							shadow: {
								type: 'text',
								fields: {
									TEXT: 'b'
								}
							}
						}
					}
				},
				{
					kind: 'block',
					type: 'text_charAt',
					inputs: {
						VALUE: {
							shadow: {
								type: 'text',
								fields: {
									TEXT: 'abc'
								}
							}
						}
					}
				},
				{
					kind: 'block',
					type: 'text_getSubstring',
					inputs: {
						STRING: {
							shadow: {
								type: 'text',
								fields: {
									TEXT: 'abc'
								}
							}
						}
					}
				},
				{
					kind: 'block',
					type: 'text_changeCase',
					inputs: {
						TEXT: {
							shadow: {
								type: 'text',
								fields: {
									TEXT: 'abc'
								}
							}
						}
					}
				},
				{
					kind: 'block',
					type: 'text_trim',
					inputs: {
						TEXT: {
							shadow: {
								type: 'text',
								fields: {
									TEXT: 'abc'
								}
							}
						}
					}
				}
			]
		},

		// Lists category - Array operations
		{
			kind: 'category',
			name: 'Listes',
			colour: '#4E3D70',
			contents: [
				{
					kind: 'block',
					type: 'lists_create_empty'
				},
				{
					kind: 'block',
					type: 'lists_create_with'
				},
				{
					kind: 'block',
					type: 'lists_repeat',
					inputs: {
						NUM: {
							shadow: {
								type: 'math_number',
								fields: {
									NUM: 5
								}
							}
						}
					}
				},
				{
					kind: 'block',
					type: 'lists_length'
				},
				{
					kind: 'block',
					type: 'lists_isEmpty'
				},
				{
					kind: 'block',
					type: 'lists_indexOf'
				},
				{
					kind: 'block',
					type: 'lists_getIndex'
				},
				{
					kind: 'block',
					type: 'lists_setIndex'
				},
				{
					kind: 'block',
					type: 'lists_getSublist'
				},
				{
					kind: 'block',
					type: 'lists_split',
					inputs: {
						DELIM: {
							shadow: {
								type: 'text',
								fields: {
									TEXT: ','
								}
							}
						}
					}
				},
				{
					kind: 'block',
					type: 'lists_sort'
				}
			]
		},

		// Variables category - Dynamic variable management
		{
			kind: 'category',
			name: 'Variables',
			colour: '#703D55',
			custom: 'VARIABLE'
		},

		// Functions category - Dynamic procedure management
		{
			kind: 'category',
			name: 'Fonctions',
			colour: '#663D70',
			custom: 'PROCEDURE'
		}
	]
} as const;

/**
 * TypeScript type definition for the toolbox configuration.
 * Allows type-safe usage throughout the application.
 */
export type ToolboxDefinition = typeof STANDARD_TOOLBOX;
