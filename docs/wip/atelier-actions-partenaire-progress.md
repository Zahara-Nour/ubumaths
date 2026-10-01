# Actions d'une liste regroupées par partenaire (Q46)

Branche `feat/atelier-actions-partenaire`. Décision Q46 (2026-10-02).

- `actionsFor(object, atelier, partner?)` : les actions de la liste, puis celles d'UNE partenaire
  (`partnersOf`, `defaultPartner` : celle du diagramme affiché, sinon la liste suivante du panneau).
  Au plus 9 boutons (avant : 2 + 5 × (n − 1), 37 avec 8 listes).
- `ObjectCard.svelte` : « Avec la liste M » (une partenaire) ou un `MySelect` « Liste partenaire »
  (plusieurs), choix propre à chaque carte.
- Anciens tests « une action par partenaire » (`scatter-partner.test.ts`) adaptés au choix.
