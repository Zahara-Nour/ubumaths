# 0004 — PDF : Typst (WASM) + jsPDF

- **Statut** : acceptée
- **Date** : 2026-06-11 · **Décidée par** : David

## Contexte

Deux pistes d'export PDF / impression ont été étudiées en profondeur à côté de l'existant.

## Décision

On garde l'existant, sans rien ajouter :

- **Typst compilé en WASM dans le navigateur** (`src/lib/typst/`) pour les fiches et notebooks :
  lot déterministe par élève + ZIP, numéros de page.
- **jsPDF** pour le tableau blanc (`src/lib/whiteboard/core/pdf-export.ts`).

## Écarté

- **WeasyPrint** : Python, donc un micro-service serveur (régresse la stratégie client), et ne rend pas
  MathML.
- **`window.print()` + CSS d'impression** : viable et peu coûteux, mais pas de lot silencieux par élève,
  et Chromium n'implémente pas les margin-boxes `@page` (pas de numéros de page).

## Conséquences

- Le compilateur de production est **typst.ts dans le navigateur**, pas le Typst CLI local : une
  erreur Typst fait échouer toute la fiche.
- Ne re-proposer print-CSS que pour un besoin nouveau et explicite (ex. docs admin accessibles).
