# Chantier `idees-tle-techno-analyse` : idées reprises d'ailleurs, analyse de Terminale techno

## Reprendre ici

_Mis à jour le 2026-11-26, PR des retouches F5 et F6 ouverte._

- **État** : #3196 mergée et migrée par David ; retouches F5 (erreur « exposants oubliés » = a + c) et
  F6 (coup de pouce « cherche p tel que (xᵃ)ᵖ = x ») sur `fix/idees-tle-techno-f5-f6`, migration
  `20261126200955_…_publies_contenu` · **Prochaine action** : merge de cette PR, `db:migrate`
  (David), puis verser le chantier (archiver le journal, ligne de la répartition) · **En attente de
  David** : `db:migrate` après le merge · **Pièges en cours** : le moteur ne voit pas
  4^(1/4) = 2^(1/2) (F6 limitée à r ∈ {2, 3, 5, 6, 7}) · **Worktree / branche** :
  `../ubumaths-wt-idees-tle-techno-f5-f6`, `fix/idees-tle-techno-f5-f6`.

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

### 2026-11-26 — essai local, revues, corrections

- Essai en base locale (Playwright, compte admin fictif) : F8 `1/4` juste, `4` faux avec le message
  « exposant négatif » ; F9 « décroissante » juste, « croissante » faux. Copies « [essai] » supprimées.
- `security-auditor` : aucun finding (UPDATE de contenu seuls, garde passée sur les md5 de prod,
  anciennes variations en tête). Remarque : lien claude.ai de la page à cocher dans ce journal (dépôt
  public), comme d'autres journaux.
- `code-reviewer` (opus), corrigé :
  - F6 : r ∈ {2, 3, 5, 6, 7} (r = 4, 8, 9 : `\sqrt{2}` juste comptée fausse, ~11 % des tirages ; le
    moteur ne voit pas 4^(1/4) = 2^(1/2), limite à signaler à part) ;
  - F6 : le message « log(x) au lieu de x » n'invite plus à taper `10^{log(b)/a}` (jugé faux) ;
  - F8 : coup de pouce qui ne donne plus a quand x_A = 1 ; message y/2 juste pour l'exposant −2 ;
  - F3 : « coefficients échangés » avant « nombre au lieu de l'exposant » (même valeur parfois) ;
  - F2 : message et coup de pouce parlent du signe de p, comme la correction ;
  - F4 : plus de coefficient 1 écrit dans la correction ; F7 : étape t_m = CM^(1/N) − 1 ajoutée.
- Non corrigé, conforme à la fiche validée, **à trancher par David** : F6, le coup de pouce « élève à
  la puissance 1/a » donne presque la réponse ; F5, l'erreur « exposants oubliés » d'une somme vaut
  a × c (un élève trouverait plutôt a + c).

### 2026-11-26 — #3196 mergée, retouches F5 et F6

- #3196 mergée ; `db:migrate` fait par David.
- David suit mes deux recommandations :
  - F5 : l'erreur « exposants oubliés » d'une somme vaut a + c (3 log(10²) − 2 log(0,01) → 1), plus
    a × c que personne n'écrit ;
  - F6 : coup de pouce « Cherche le nombre p tel que (xᵃ)ᵖ = x », qui ne donne plus la réponse.
- `question:specs` vert, migration de contenu générée (2 variations corrigées), test d'intégration
  vert (266 tests).
