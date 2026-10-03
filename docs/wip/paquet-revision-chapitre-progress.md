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
- (2026-10-03) **Fait, commité, non poussé.**
  - Tests d'abord, rouges (modules absents) : `server/srs/__tests__/chapter-deck.test.ts` (16),
    `tests/integration/paquet-revision-chapitre.test.ts` (13), puis verts. Preuve par neutralisation :
    sans le recontrôle « modèle dans le paquet » du submit → 4 rouges (E2, L1, L2).
  - `server/srs/chapter-deck.ts` : calcul pur (`resolveDeckTemplateIds`, `selectChapterSession`) +
    lectures aux droits de l'élève (`loadChapterDecks`, `summarizeChapterDecks`). Résolution catégorie →
    modèles = `templatesOfCategory` de `questions/series-items.ts` (exportée, rendue générique).
  - Routes `api/srs/chapters/[chapterId]/{due,submit}` (élève, Zod, 404 / 403, `applyFsrsReview` avec
    `bestOfDay` (ADR 0016) et `verifyWrite`, rien vers le Programme).
  - UI : `ChapterRevisionButton` (page élève du chapitre, « Mes chapitres » dans « Mes révisions »),
    séance `revisions/chapitres/[chapterId]` = `ReviewSession` paramétrée par `$lib/srs/review-source`.
  - Bug latent corrigé au passage : `ReviewSession` lisait `card.card.*` alors que `review/due` rend des
    cartes plates (toute carte de paquet faisait planter l'écran) ; une séance vide affichait « Session
    terminée » au lieu de l'état vide.
- Constat : index unique partiel → UNE question publiée par catégorie ; le paquet a donc une question par
  catégorie distincte des séries.

## Ouvert (à trancher par David)

- Traces : le submit du chapitre n'insère PAS de `skill_attempts` (le Programme le fait, ADR 0016 dit que
  les traces auto-évaluées alimentent le référentiel). À décider.
- « Dues aujourd'hui » = échéance ≤ maintenant (comme le Programme), pas fin de journée.
- Revues `code-reviewer` + `security-auditor`, puis PR (pas de migration).
