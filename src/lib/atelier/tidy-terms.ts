/**
 * Atelier — mettre une dérivée au propre, sans perdre ce qui la rend lisible
 *
 * `tidyTerms` vit désormais dans `mathAST/tidy/terms.ts` :
 * la commande `.diff` du moteur s'en sert aussi, et `mathAST` n'importe pas
 * l'atelier. Ce module le ré-exporte ; `withExplicitNumberProducts` a suivi
 * l'étape « On simplifie » dans `pedagogical-differentiation/tidy-step.ts`.
 *
 * @module atelier/tidy-terms
 */

export { tidyTerms } from '$lib/mathAST/tidy/terms';
