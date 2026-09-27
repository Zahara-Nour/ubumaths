# Pourcentages dans mathAST — suivi

Chantier ouvert le 2026-09-27 pour le lot de relecture **Proportionnalité** (#483–#510). Constat
mesuré : mathAST ne connaît pas les pourcentages — `10%` (syntaxe maison) est lu `10 × %` (une
variable nommée « % »), `20\%` (ce que MathLive produit) est refusé par le parseur LaTeX
(« Unexpected token: % »), et `{{eval:10%*50}}` échoue. 7 questions du lot ne génèrent pas ; #492,
#504, #505 attendent une RÉPONSE en pourcentage.

## Décisions de David (2026-09-27)

1. mathAST gère **directement et proprement** les pourcentages (pas un contournement dans `{{eval}}`).
2. Réponse de même valeur sans % (`0,2` ou `\frac{1}{5}` pour `20 %`) : **perfectible**, message
   « Écris le résultat en pourcentage. »
3. Réponse en pourcentage quand un NOMBRE est attendu (`710 %` pour 7,1) : **faux, mauvaise forme**
   (`bad_form`).
4. `20` sans le symbole pour `20 %` : faux (valeur 20 ≠ 0,2), avec un **message dédié**
   « N'oublie pas le symbole %. »

## Spécification (phase 0 validée)

| Point                  | Comportement                                                     |
| ---------------------- | ---------------------------------------------------------------- |
| Syntaxe maison         | `20%`, `12.5%` → pourcentage                                     |
| LaTeX                  | `20\%`, `20\,\%` → pourcentage                                   |
| Affichage              | « 20 % » (espace fine), « 12,5 % »                               |
| Valeur                 | `20 %` = 1/5 exact ; `12,5 %` = 1/8                              |
| `{{eval}}`             | `10%*50` → 5 ; `a%*b` ; `{{eval:20%}}` → 1/5 (la valeur)         |
| Attendu en pourcentage | écrit sans calcul : `{{a}}%` → « 20 % »                          |
| `tidy`, `simplify`     | un pourcentage reste un pourcentage (pas converti en fraction)   |
| Erreurs                | `%` seul, `%5` → erreur de lecture, jamais un produit silencieux |

Correction, attendu `20 %` : `20 %` juste ; `0,2`, `1/5` perfectible (décision 2) ; `20` faux +
message (décision 4) ; `2 %` faux. Attendu `7,1` : `7,1` juste ; `710 %` faux, mauvaise forme
(décision 3).

Mesures avant de livrer : base (553) sans différence ; Proportionnalité 19 → ≥ 24 questions
générables ; #492, #504, #505 corrigées avec la saisie réelle `20\%`.

## Avancement

- [x] Phase 0 validée (2026-09-27)
- [ ] mathAST : nœud pourcentage, parseurs, affichage, évaluation, équivalence
- [ ] correcteur : forme (perfectible / mauvaise forme), message « N'oublie pas le symbole % »
- [ ] relecture du lot Proportionnalité
