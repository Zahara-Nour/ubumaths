/**
 * Unit AST - Type Definitions
 *
 * Type system for representing physical units in the MathAST.
 * Independent from src/lib/questions/units/ - focused on AST representation
 * and manipulation rather than validation and parsing.
 *
 * @module mathAST/units/types
 */

// =============================================================================
// PHYSICAL DIMENSIONS
// =============================================================================

/**
 * Physical dimensions for dimensional analysis
 *
 * Based on SI base quantities plus common derived/practical dimensions.
 * This is the type-safe representation of physical properties.
 *
 * @example
 * const lengthDim: Dimension = 'length';     // meters, kilometers, etc.
 * const massDim: Dimension = 'mass';         // kilograms, grams, etc.
 * const timeDim: Dimension = 'time';         // seconds, hours, etc.
 * const volumeDim: Dimension = 'volume';     // liters (derived from length^3)
 * const currencyDim: Dimension = 'currency'; // euros, dollars (non-physical)
 */
export type Dimension =
	| 'length'
	| 'mass'
	| 'time'
	| 'volume'
	| 'electric_current'
	| 'temperature'
	| 'amount'
	| 'luminous_intensity'
	| 'angle'
	| 'currency'
	| 'dimensionless';

// =============================================================================
// BASE UNIT DEFINITION
// =============================================================================

/**
 * Base unit definition with conversion and metadata information
 *
 * Defines a single unit (possibly with SI prefix) and how to convert
 * it to the reference base unit for its dimension.
 *
 * All properties are readonly to ensure immutability throughout the AST.
 *
 * @example Kilometer (length)
 * const km: BaseUnitDef = {
 *   symbol: 'km',
 *   baseSymbol: 'm',
 *   coefficient: 1000,    // 1 km = 1000 m
 *   dimension: 'length',
 *   name: 'kilometre'
 * };
 *
 * @example Millisecond (time)
 * const ms: BaseUnitDef = {
 *   symbol: 'ms',
 *   baseSymbol: 's',
 *   coefficient: 0.001,   // 1 ms = 0.001 s
 *   dimension: 'time',
 *   name: 'milliseconde'
 * };
 *
 * @example Liter (volume)
 * const L: BaseUnitDef = {
 *   symbol: 'L',
 *   baseSymbol: 'm',
 *   coefficient: 0.001,   // 1 L = 0.001 m³
 *   dimension: 'volume',
 *   name: 'litre'
 * };
 */
export interface BaseUnitDef {
	/**
	 * Display symbol for the unit
	 *
	 * Examples: 'km', 'm', 'cm', 'mm', 'kg', 'g', 'mg', 's', 'ms', 'L', 'mL'
	 */
	readonly symbol: string;

	/**
	 * Reference base unit symbol for this dimension
	 *
	 * This is the normalized symbol to which all units of the same dimension
	 * are converted for operations.
	 *
	 * Examples:
	 * - 'm' for length units (km, cm, mm all map to 'm')
	 * - 'g' for mass units (kg, mg all map to 'g')
	 * - 's' for time units (ms, h, min all map to 's')
	 * - 'L' for volume (mL, cL all map to 'L')
	 */
	readonly baseSymbol: string;

	/**
	 * Conversion coefficient to the base unit
	 *
	 * Represents the multiplication factor needed to convert from this unit
	 * to the base unit.
	 *
	 * Formula: value_in_base = value_in_this_unit * coefficient
	 *
	 * Examples:
	 * - km -> m: coefficient = 1000
	 * - cm -> m: coefficient = 0.01
	 * - g -> kg: coefficient = 0.001
	 * - ms -> s: coefficient = 0.001
	 * - h -> s: coefficient = 3600
	 */
	readonly coefficient: number;

	/**
	 * Physical dimension this unit measures
	 *
	 * Determines which units are compatible for operations.
	 * Only units with the same dimension can be added or compared.
	 */
	readonly dimension: Dimension;

	/**
	 * Full name of the unit (typically in French for this application)
	 *
	 * Used for display and documentation purposes.
	 *
	 * Examples: 'metre', 'kilometre', 'gramme', 'seconde', 'litre'
	 */
	readonly name?: string;
}

// =============================================================================
// COMPOSITE UNIT (AST NODE)
// =============================================================================

/**
 * Unit representation for the MathAST
 *
 * Represents both simple units (meters) and composite units (m/s, kg.m^2.s^-2).
 *
 * The structure supports:
 * - Normalized representation via components map for operations
 * - Optional original string for faithful formatting and debugging
 * - Coefficient for handling SI prefixes and derived units
 *
 * Components map: baseSymbol -> exponent
 * - Positive exponent: unit in numerator (e.g., m² has exponent 2)
 * - Negative exponent: unit in denominator (e.g., 1/s has exponent -1)
 * - Zero exponent: unit cancels out (removed from map)
 *
 * @example Simple unit: meters
 * const meter: Unit = {
 *   components: new Map([['m', 1]]),
 *   coefficient: 1
 * };
 *
 * @example With prefix: kilometers
 * const kilometer: Unit = {
 *   components: new Map([['m', 1]]),
 *   coefficient: 1000
 * };
 *
 * @example Square meters
 * const squareMeter: Unit = {
 *   components: new Map([['m', 2]]),
 *   coefficient: 1
 * };
 *
 * @example Velocity: m/s
 * const velocity: Unit = {
 *   components: new Map([['m', 1], ['s', -1]]),
 *   coefficient: 1
 * };
 *
 * @example Acceleration: m/s²
 * const acceleration: Unit = {
 *   components: new Map([['m', 1], ['s', -2]]),
 *   coefficient: 1
 * };
 *
 * @example Energy: kg.m²/s² (Joule)
 * const joule: Unit = {
 *   components: new Map([['kg', 1], ['m', 2], ['s', -2]]),
 *   coefficient: 1
 * };
 *
 * @example Velocity in km/h with original formatting
 * const kmPerHour: Unit = {
 *   components: new Map([['m', 1], ['s', -1]]),
 *   coefficient: 1000 / 3600,  // 1 km/h = (1000/3600) m/s
 *   original: 'km/h'           // Preserve original input for display
 * };
 */
export interface Unit {
	/**
	 * Map of base unit symbols to their exponents
	 *
	 * Keys are base unit symbols (e.g., 'm', 'kg', 's', 'A')
	 * Values are integer or fractional exponents
	 *
	 * The map is normalized:
	 * - Units with exponent 0 are removed (cancelled out)
	 * - Exponents are combined during operations
	 *
	 * Empty map represents a dimensionless unit.
	 *
	 * @example
	 * m/s: new Map([['m', 1], ['s', -1]])
	 * kg.m²/s²: new Map([['kg', 1], ['m', 2], ['s', -2]])
	 * Dimensionless: new Map([])
	 */
	readonly components: ReadonlyMap<string, number>;

	/**
	 * Total conversion coefficient to base units
	 *
	 * When converting a quantity to base units:
	 * value_in_base = value * coefficient
	 *
	 * This coefficient combines:
	 * - SI prefix scaling (e.g., k=1000, m=0.001)
	 * - Derived unit conversions (e.g., h->s: 3600)
	 * - Composite unit coefficients
	 *
	 * @example
	 * km: coefficient = 1000
	 * km/h: coefficient = 1000 / 3600 = 0.277...
	 * mg: coefficient = 0.001 (already in grams)
	 */
	readonly coefficient: number;

	/**
	 * Original unit string for faithful formatting and debugging
	 *
	 * Preserves the original input or preferred display format.
	 * Useful for:
	 * - Displaying units as the user entered them
	 * - Debugging and logging
	 * - Round-tripping user input
	 *
	 * If not provided, units are displayed using their normalized form.
	 *
	 * @example
	 * 'km', 'm/s', 'kg.m^-2.s^-2', '°C'
	 */
	readonly original?: string;
}
