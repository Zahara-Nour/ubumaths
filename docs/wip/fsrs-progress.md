---
status: en-cours
---

# Chantier `fsrs` — le planificateur des révisions s'écarte de FSRS-6

Ouvert le 2026-11-15, choisi par David après la clôture de `type-erreur`. Trouvé le 2026-10-25 pendant
la PR 6g de `demo-debug` (#1711) : `calculateNewStability` n'utilise pas la note.

## Reprendre ici

_Mis à jour le 2026-11-15, phase 0 écrite._

- **État** : phase 0 écrite (constat mesuré, Q1-Q4), rien de codé · **Prochaine action** : réponses de David à Q1-Q4, puis PR 1 · **En attente de David** : Q1 (corriger notre code / passer à `ts-fsrs`), Q2 (fiches existantes), Q3 (révisions du même jour), Q4 (rétention et intervalle) · **Pièges en cours** : depuis l'ADR 0038 l'écran n'envoie plus que les notes 1 et 3 ; le bug d'origine (Difficile = Bien = Facile) n'est presque plus visible, les écarts qui comptent sont ailleurs (ci-dessous) · **Worktree / branche** : `../ubumaths-wt-fsrs`, `fix/fsrs`

## Ce qui existe (vérifié le 2026-11-15)

- `src/lib/srs/fsrs.ts` : classe `FSRS` maison, « FSRS-6 » d'après son en-tête ; paramètres `w` =
  les 21 valeurs par défaut publiées de FSRS-6 (`config.ts`). Pure, sans base ; tous les chemins font
  `new FSRS()` (rétention 0,9). Doc : `docs/systeme/srs.md` § FSRS et la mémoire.
- Notes reçues aujourd'hui : **1 (Again) ou 3 (Good) seulement** (boutons « Pas réussi / Réussi »,
  questions justes / fausses). L'API accepte encore 2 et 4 (vieux onglets).
- Questions interactives (`api/skill-attempts`, hors flash-cards) : **chaque** réponse passe par
  `reviewCard`, même plusieurs fois dans la journée ; flash-cards, paquets, évaluations : meilleur du jour
  (ADR 0016).
- Prod (lecture seule, 2026-11-15) : **27 fiches `srs_card_stats`, 4 élèves**, 5 fiches revues 2 fois ou
  plus ; **20 fiches à difficulté 10** (le maximum).

## Écarts avec FSRS-6 publié

Lus dans le code, contre les formules publiées (FSRS-6, `ts-fsrs` / `py-fsrs`) :

1. **Stabilité initiale** : `w[0] + w[1]·(note − 1)` au lieu de `w[note − 1]`. Bien : 2,80 j au lieu de 2,31 ;
   Facile : 4,09 au lieu de 8,30.
2. **Courbe d'oubli et intervalle** : FSRS-4 (`9·S`, puissance −0,5) au lieu de FSRS-6 (puissance
   `−w[20]` = −0,1542, facteur qui donne un intervalle = S à 90 %). Effet : **intervalles ≈ 2,1 fois trop
   longs** à rétention 0,9.
3. **Difficulté initiale** fixée à 5 au lieu de `w[4] − e^(w[5]·(note − 1)) + 1` (Bien : 2,12).
4. **Mise à jour de la difficulté** sans amortissement `(10 − D)/9` ni retour à la moyenne (`w[7]`) :
   un seul « Pas réussi » fait 5 + 6,04 → **10, et la fiche y reste pour toujours** (Bien ne change pas D).
   C'est ce qu'on voit en prod (20 fiches sur 27).
5. **Rappel réussi** : ni pénalité Difficile (`w[15]`) ni bonus Facile (`w[16]`) — le bug d'origine.
6. **Après un oubli** : pas de plafond `S' ≤ S / e^(w[17]·w[18])`.
7. **Même jour** : la formule court terme de FSRS-6 (`w[17]`, `w[18]`, `w[19]`) n'existe pas.

Simulation (révision à chaque échéance ; intervalles en jours, FSRS-6 recodé d'après les formules, à
confirmer par la bibliothèque de référence) :

| Notes                        | Code actuel             | FSRS-6                  |
| ---------------------------- | ----------------------- | ----------------------- |
| Bien ×5                      | 6 · 22 · 70 · 197 · 496 | 2 · 11 · 46 · 163 · 497 |
| Raté puis Bien ×4            | 1 · 6 · 9 · 12 · 17     | 1 · 2 · 6 · 17 · 44     |
| Bien, Bien, Raté, Bien, Bien | 6 · 22 · 3 · 5 · 7      | 2 · 11 · 2 · 5 · 12     |

En clair : une question **réussie** revient trop tard au début (6 j au lieu de 2) ; une question **ratée
une fois** reste à jamais sur des intervalles courts (17 j au lieu de 44 au 5e passage).

## Phase 0 — comportements proposés (à valider)

- **Nominal** : mêmes notes, mêmes écrans ; seules les prochaines dates changent, calculées par FSRS-6
  tel que publié. Tests de référence : suites de notes et d'écarts dont le résultat (S, D, intervalle) est
  celui de la bibliothèque de référence `ts-fsrs` (MIT, open-spaced-repetition), au millième.
- **Limites** : fiche neuve (stabilité 0) → `w[note − 1]` ; révision en retard ou en avance → R calculé
  sur l'écart réel ; intervalle borné à [1 j, 36 500 j] ; notes 2 et 4 encore acceptées par l'API et
  traitées comme FSRS-6 les traite.
- **Erreur** : rien de neuf (pur calcul) ; une fiche aux valeurs hors bornes (D hors [1, 10], S ≤ 0)
  est ramenée dans les bornes, jamais d'exception.
- **Accès** : aucun changement — personne ne lit rien de plus, aucune migration (colonnes inchangées).

**Découpage proposé**

- **PR 1** — algorithme : `fsrs.ts` conforme à FSRS-6 + tests de référence (rouges avant) ; doc `srs.md`.
- **PR 2** (selon Q2) — rejouer les 27 fiches de prod depuis leur `review_history`, par un script
  `--essai` puis `--publier` sur ta demande explicite.

## Questions à David (phase 0, posées le 2026-11-15)

- **Q1 — Comment** : (a) **corriger notre `fsrs.ts`** (même API, ~100 lignes) et le vérifier contre
  `ts-fsrs` ajouté en **devDependency, pour les tests seulement** (reco : rien ne change à l'exécution,
  pas de dépendance en prod, l'oracle est l'implémentation officielle) ; (b) remplacer notre classe par
  `ts-fsrs` à l'exécution (moins de code à nous, mais une dépendance de plus en prod et ses « étapes
  d'apprentissage » en minutes à neutraliser) ; (c) corriger sans oracle, valeurs de test recopiées à la
  main.
- **Q2 — Fiches existantes** (27, 4 élèves, 20 à difficulté 10) : (a) **les rejouer** depuis
  `review_history` avec le nouvel algorithme (reco : l'historique est complet, c'est la seule façon de
  sortir les 20 fiches de D = 10 ; écriture en prod par script, sur ta demande) ; (b) les laisser : les
  prochaines révisions partent de leurs S et D actuels.
- **Q3 — Plusieurs révisions le même jour** (questions interactives, chaque réponse compte) : (a)
  **appliquer la formule court terme de FSRS-6** (reco : c'est ce que les paramètres `w[17..19]` attendent) ;
  (b) n'en garder qu'une par jour comme ailleurs (meilleur du jour) — changement de comportement plus
  large, qui toucherait l'ADR 0016.
- **Q4 — Rétention 0,9** : intervalles ≈ 2 fois plus courts qu'aujourd'hui une fois corrigé (Bien ×3 : 2,
  11, 46 j au lieu de 6, 22, 70). (a) **garder 0,9** (reco : la valeur standard ; plus de révisions, mais
  celles que l'algorithme prévoit) ; (b) baisser la rétention (0,85 ou 0,8) pour garder un rythme proche
  d'aujourd'hui.

## Historique

- 2026-11-15 : chantier ouvert, worktree `fix/fsrs` ; constat et simulation ; phase 0 écrite, Q1-Q4 posées.
