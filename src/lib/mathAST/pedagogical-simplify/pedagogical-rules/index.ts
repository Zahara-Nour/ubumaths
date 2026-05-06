/**
 * Pedagogical-simplify custom rules barrel.
 *
 * Rules created specifically for the pedagogical pipeline (not duplicated
 * from `pattern/rule-sets/*`). Currently V1 only owns the generic binomial
 * product distribution; V2+ may add `distribute-trinomial-binomial`,
 * `expand-cube`, etc.
 */

export { distributeBinomialProduct } from './distribute-binomial-product';
