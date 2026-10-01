# Modèles publiés du second degré — corrections (2026-10-01)

Décision de David : mise à jour directe des 13 modèles relus, qui restent publiés.

- Specs : `scripts/questions/second-degre-existants/<id8>.json` (premier commit = instantané de
  production avant correction).
- Écriture : `pnpm tsx scripts/update-published-questions.ts --lot second-degre` (simulation + diff + preuves rouges),
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

## Lecture graphique tracée par ```courbe (Q57, 2026-10-01)

Écrit en production : `eae2ff6a` (racines lues, Apprivoiser 7, ajouté aux `CIBLES`) et
`87140df3` (forme canonique lue, Apprivoiser 9). Les 15 images fixes de chacun sont remplacées
par une parabole tirée au hasard ; les PNG restent dans `static/images/questions/…` (David les
retirera).

- Racines : 1 variation, p < q dans −4..4, a = ±k/2 (k ∈ {1, 2, 4}), |β| entre ½ et 16 ;
  fenêtre x −6..6, y adaptée (même règle que le modèle n° 9) ; ordre indifférent conservé.
- Forme canonique : 2 variations (a ∈ {±¼, ±½} avec A(α±2 ; β+4a), a ∈ {±1, ±2, ±3} avec
  A(α±1 ; β+a)) ; α, β ∈ −3..3 NON NULS (comme avant) ; fenêtre fixe x −6..6, y −7..7, grille 1.
- Audit : `audit-question-draws.ts` vérifie désormais les blocs courbe (parseur, scène,
  `parseMarkdown`, Typst sans « Figure indisponible ») ; preuve rouge faite.
- Limite : une évaluation en cours garde son instance (`evaluation_attempt_questions.instance`),
  mais un même `seed` ne redonne plus la même question qu'avant.
