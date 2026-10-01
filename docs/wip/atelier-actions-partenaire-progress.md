# Actions d'une liste regroupées par partenaire (Q46)

Branche `feat/atelier-actions-partenaire`. Décision Q46 (2026-10-02).

- `actionsFor(object, atelier, partner?)` : les actions de la liste, puis celles d'UNE partenaire
  (`partnersOf`, `defaultPartner` : celle du diagramme affiché, sinon la liste suivante du panneau).
  Au plus 9 boutons (avant : 2 + 5 × (n − 1), 37 avec 8 listes).
- `ObjectCard.svelte` : « Avec la liste M » (une partenaire) ou un `MySelect` « Liste partenaire »
  (plusieurs), choix propre à chaque carte.
- Anciens tests « une action par partenaire » (`scatter-partner.test.ts`) adaptés au choix.

## Revue (code-reviewer + a11y)

- Diagramme affiché avec M, partenaire N choisie : « Retirer le diagramme » (`chart:M`) reste parmi
  les actions de la liste — sinon il fallait rechoisir M pour le retirer.
- Les actions avec la partenaire portent `partner` : la carte les regroupe dessus, plus sur le `:` de l'id.
- `MySelect` : prop `triggerAriaLabel` (« Avec la liste M ») au lieu du placeholder comme nom accessible.
- Limite connue : renommer la partenaire choisie fait revenir en silence à celle par défaut.

Vérifs : 466 tests serveur, 207 client, `check:incremental` 0 erreur, eslint + `lint:fast` propres.
