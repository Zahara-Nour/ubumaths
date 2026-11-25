# Chantier `idees-tle-integration` — journal

Idées reprises d'ailleurs, rubriques « Primitives et équations différentielles » (TSA7, 7 exercices)
et « Intégration » (TSA8, 5 exercices) de Terminale spécialité, selon le skill `idees-rubrique`.
Relevé : [idees-tle-integration-releve.md](idees-tle-integration-releve.md) · fiches :
[idees-tle-integration-fiches.md](idees-tle-integration-fiches.md) · page à cocher :
https://claude.ai/artifact/Tw3TtUfAWtsn6CPudQcxot

## Reprendre ici

_Mis à jour le 2026-11-25, lot écrit et vérifié._

- **État** : phase 0 validée, lot écrit (2 neufs, 11 variations sur 7 publiés), tout vert ·
  **Prochaine action** : David crée les 2 brouillons en prod (commande ci-dessous), je commite les
  ids, puis migrations de rangement et de contenu, PR · **En attente de David** :
  `pnpm tsx scripts/create-questions.ts --dir scripts/questions/idees-tle-integration-neufs --publier`
  dans le worktree · **Pièges en cours** : réponses attendues avec e : constante d'abord
  (« 3e-1 » se lit 3 × 10⁻¹) ; 7 publiés réservés (48d8d729f) · **Worktree / branche** :
  `../ubumaths-wt-idees-tle-integration`, `feat/idees-tle-integration`.

## Historique

### 2026-11-25 — rubriques prises, relevé, phase 0

- Rubriques TSA7 et TSA8 choisies par David (« je te suis », recommandation suivie) ; lignes
  « prise » poussées sur `main` (ae031a888).
- Relevé : 12 exercices lus en entier dans le code (par moi, sans agent). 65 modèles publiés touchent la
  rubrique, aucun brouillon, aucun réservé ailleurs. ✅ 4, 🟡 8, ❌ 0.
- Idée en attente reprise : TSA1-48 (suite Iₙ = ∫₁ᵉ (ln x)ⁿ dx) → F10.
- Aucun outil manquant.
- Phase 0, si tout est oui : **2 modèles neufs** (F1 lien entre f et F, lecture de courbe, 2 var. ;
  F7 intégrale de cos et de sin, 3 var.) et **11 variations** de 7 modèles publiés (3dbc5a7b +1,
  2d480f3d +1, fe25be0a +2, b52c53d8 +2, 74da1cd6 +1, fc2ea212 +3, 6035aa61 +1).
- Questions : Q1 forme de F1 (lecture de courbe recommandée, ou QCM) ; Q2 F7 en modèle neuf
  (recommandé, b52c53d8 sert aussi en maths complémentaires) ou en variation de b52c53d8. Question
  d'accès : personne.

### 2026-11-25 — phase 0 validée, lot écrit

- David : « je suis tes recos » → toutes les fiches oui, Q1 lecture de courbe, Q2 F7 en modèle neuf.
  7 modèles publiés réservés dans le tableau (48d8d729f).
- Scripts `docs/wip/questions/idees-tle-integration-neufs.py` (→ `scripts/questions/idees-tle-integration-neufs/`)
  et `idees-tle-integration-publies.py` (→ `scripts/questions/idees-tle-integration-publies/`, 7 modèles
  exportés de prod le 2026-11-25, variations ajoutées à la fin, relançable).
- Neufs : F1 « Lien entre une fonction et ses primitives » (2 var., courbe de f, case intervalles),
  rangé « Équations différentielles > y′ = f > primitives : notion », TSPE-462 ; F7 « Intégrale de cos
  et de sin » (3 var.), rangé « Intégration > Calcul d'intégrales > par une primitive », TSPE-487,
  T_SPE seul.
- Publiés (+11) : 3dbc5a7b +1, 2d480f3d +1, fe25be0a +2, b52c53d8 +2, 74da1cd6 +1, fc2ea212 +3,
  6035aa61 +1.
- Écarts à la fiche, sans changer l'idée : pas d'erreurs prévues sur les cases à choix (F8, F10) ni
  sur la case « primitive » (F4a) : le moteur les refuse, les explications sont dans le corrigé ;
  F2 corrigé par « deux primitives diffèrent d'une constante » (le point du modèle).
- Vérifié : `question:specs` vert sur les 9 fichiers (200 specs, 300 tirages par variation) ;
  `create-questions` en simulation vert ; `sonde-courbes` 0 problème ; 1 262 formules distinctes des
  aperçus passées à `validateLatex` + accolades (0 problème, après correction d'un `$f$` imbriqué
  dans `\text` en F8) ; « 2e-1 » tapé par l'élève jugé juste. Copies créées en base locale, F1
  (courbe), F7, F8 vus dans l'aperçu (`pnpm voir`, iPhone, 0 erreur de console) ; brouillons d'essai
  supprimés de la base locale.
