# Chantier `idees-tle-techno-analyse` : idées reprises d'ailleurs, analyse de Terminale techno

## Reprendre ici

_Mis à jour le 2026-11-26, lot écrit et migration générée (aucune PR encore)._

- **État** : 9 variations écrites (script `docs/wip/questions/idees-tle-techno-analyse-publies.py`,
  relançable), 7 modèles verts (`question:specs`, `create-questions` en simulation, sonde des courbes),
  migration `20261126193659_…_publies_contenu` + fixture générées, test d'intégration vert ; commité
  sur la branche, pas poussé. 7 copies « [essai] » brouillons en base LOCALE (ids 00fc2afe, 11ae1464,
  9fda9141, 2d3c6edc, 3f8670c8, 76c038a0, 7ee1d753) · **Prochaine action** : regarder les captures
  `pnpm voir` (F8 courbe 9fda9141, F9 76c038a0) et jouer une réponse juste et une fausse, supprimer
  les copies locales, revue `code-reviewer` (opus, correction des réponses) + `security-auditor`,
  push, PR, merge ; `db:migrate` = David · **En attente de David** : rien · **Pièges en cours** :
  variable `i` = imaginaire (F9 renommée `h`) ; `e1` évité (`w1`) ; `∛5` refusé par la forme (F6 :
  la consigne demande une puissance) ; messages des specs sous leur forme réécrite (`0.25`, `2 x`) ;
  serveur de dev du worktree sur 5176 · **Worktree / branche** :
  `../ubumaths-wt-idees-tle-techno-analyse`, `docs/idees-tle-techno-analyse`.

## Journal

### 2026-11-26 — prise, relevé, phase 0

- Rubrique « Analyse » (TTE, 12 exercices) prise dans le tableau de répartition (commit direct sur
  `main`).
- Relevé : [idees-tle-techno-analyse-releve.md](idees-tle-techno-analyse-releve.md). ✅ 1 · 🟡 8 · ❌ 1 ·
  hors programme 2 (TTE-7, TTE-11 : log d'une expression, absent du BO techno).
- Fiches : [idees-tle-techno-analyse-fiches.md](idees-tle-techno-analyse-fiches.md).
- Question d'accès : personne ne gagne d'accès (variations ajoutées à des modèles publiés).
- Page à cocher (verdicts dans sa base, collection `verdicts`) : https://claude.ai/artifact/FeuuwKNpLXVHXLZHpcBPDz.
- Phase 0 validée par David en bloc (« je valide les modèles ») ; les deux questions (F6, TTE-7/11) suivent
  ma recommandation, qui ne change rien à l'existant.

### 2026-11-26 — lot écrit, migration générée

- 7 modèles exportés de prod (`scripts/questions/idees-tle-techno-analyse-publies/`) ; variations
  ajoutées à la fin : 52b884ee +2 (F1, F6), 10bd7075 +1 (F2), af24839d +2 (F3, F4), dc269779 +1 (F5),
  f84e23a3 +1 (F7), 94b1dbf6 +1 (F8), f6805041 +1 (F9). Erreurs prévues (3 par case, sauf la case
  choix de F9) et coup de pouce pour chacune.
- Écarts à la fiche, sans changer l'idée : F6 dit dans la consigne la forme attendue (« un entier si
  c'est possible, sinon une puissance de b ») car `∛b` est refusé par la contrainte de forme du
  modèle ; F7, 3e erreur prévue = taux horaire divisé par 60 (la fiche proposait
  (1 + x/100)^(60n) − 1, nombre démesuré) ; F4, 3e erreur = exposant j oublié (la fiche répétait
  ak + bj + cm) ; F8, pour |x_A| = 1, l'erreur « ordonnée » coïncide avec l'inverse ou la réponse :
  remplacée par « base négative ».
- Vérifié : `question:specs` vert sur les 7 (tirages 200 à 400 chacun) ; tirages relus pour chaque
  nouvelle variation, cas rares compris (F6 entier, F8 à |x_A| = 2, F5 produit, F7 baisse) ;
  `create-questions` en simulation vert ; sonde des courbes 0 problème ;
  `test:integration tests/integration/migrations-contenu-publie.test.ts` vert (258 tests).
