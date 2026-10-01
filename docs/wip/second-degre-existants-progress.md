# Modèles publiés du second degré — corrections (2026-10-01)

Décision de David : mise à jour directe des 13 modèles relus, qui restent publiés.

- Specs : `scripts/questions/second-degre-existants/<id8>.json` (premier commit = instantané de
  production avant correction).
- Écriture : `pnpm tsx scripts/update-published-questions.ts` (simulation + diff + preuves rouges),
  `--publier` pour écrire. Ids explicites dans `CIBLES`.
- Rendu : `pnpm tsx scripts/audit-question-draws.ts --dir|--file|--template` (`1x`, `+ 0`, `-8 0`,
  gabarit non résolu, tableau ```variation illisible, abscisse hors domaine ou non croissante,
  Typst).

## État

Écrit en production le 2026-10-01 : 13/13 relus conformes, specs vertes relues en base, audit
vert (200 tirages par variation). Échange de niveaux Racines 2 ↔ 3 fait (aucune série ni séance
ne désignait le sous-domaine « Racines »).

## Limites connues (dites aux specs)

- Axe de symétrie : la case ne demande que la valeur (`x = ?`). Ressaisir `x=-5` dans la case est
  refusé.
- Racine évidente (non unitaire) : l'autre racine `\frac{3}{2}` est jugée `bad_form` (forme
  stricte, attendu entier) alors qu'elle est racine.
- `question:specs --template` signale l'erreur de schéma `created_at` (défaut de l'outil).
