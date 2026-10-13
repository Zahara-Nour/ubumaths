/**
 * Opérateurs à limites (∑, ∏, ∫, lim, max…) : bornes dessous et dessus
 *
 * Règles Typst communes aux setups des PDF de fiche (élève et prof sans
 * gabarit) ; les gabarits les recevront au lot 2 (ADR 0028).
 *
 * @module worksheets/document/math-limits
 */

export const MATH_LIMITS_SETUP = `// Display limits above/below for common operators
#show math.sum: math.limits
#show math.product: math.limits
#show math.integral: math.limits.with(inline: false)

// Redefine operators with limits: true
#let lim = math.op("lim", limits: true)
#let limsup = math.op("lim sup", limits: true)
#let liminf = math.op("lim inf", limits: true)
#let max = math.op("max", limits: true)
#let min = math.op("min", limits: true)
#let sup = math.op("sup", limits: true)
#let inf = math.op("inf", limits: true)
`;
