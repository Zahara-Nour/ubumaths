# Paquet de révision calculé du chapitre (questions de cours, étape 3)

Branche `feat/paquet-revision-chapitre`, worktree `ubumaths-wt-paquet-chapitre`.
Décisions : `docs/wip/questions-de-cours-progress.md` (Q163–Q168). Comportements validés par David
(N1–N6, L1–L6, E1–E4) : voir le brief de l'étape 3, repris ci-dessous.

## Comportements

- N1 bouton « Réviser ce chapitre (k à revoir) » ; N2 paquet = questions PUBLIÉES des catégories des
  séries publiées ; N3 séance = dues + ≤ 10 nouvelles, nouvelle graine ; N4 mémoire unique
  `srs_card_stats` ; N5 entrées dans « Mes révisions » ; N6 union sans doublon.
- L1 série retirée / chapitre masqué → sort, mémoire gardée ; L2 brouillon → sort ; L3 rien → « Rien à
  revoir aujourd'hui » ; L4 catégorie vide ignorée, paquet vide → pas de bouton ; L5 changement de classe ;
  L6 question de cours : dans le paquet du chapitre, jamais ajoutée au Programme par ce circuit.
- E1 autre classe / masqué → 404 ; E2 question hors paquet → refusée, rien ne bouge ; E3 → 401 ;
  E4 Zod.

## Plan

1. Tests d'abord (serveur : calcul pur + accès mocké ; intégration : E1, E2, L1, L2, N4, L6) — rouges.
2. `src/lib/server/srs/chapter-deck.ts` ; routes `api/srs/chapters/[chapterId]/{due,submit}`.
3. UI : bouton page élève du chapitre, entrées « Mes révisions », séance (ReviewSession paramétrée).
4. Vérifs : check:incremental, lint:fast, check:integration-paths, autofix, tests voisins.

## État

- (2026-10-03) Doc créé.
