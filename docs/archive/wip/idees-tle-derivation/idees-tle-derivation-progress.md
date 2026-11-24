# Chantier `idees-tle-derivation` — journal

Idées reprises d'ailleurs, rubrique « Compléments sur la dérivation » de Terminale spécialité (TSA3,
14 exercices ; TCA7-30 à 32 n'en sont que des reprises), selon le skill `idees-rubrique`. Relevé :
[idees-tle-derivation-releve.md](idees-tle-derivation-releve.md).

## Reprendre ici

_Mis à jour le 2026-11-24, chantier clos (après #3068 et #3070)._

- **État** : rubrique publiée — 5 modèles neufs publiés (F5, F6, F7 avec F7 b, F11, F12) et
  16 variations ajoutées à 11 modèles publiés, relus et validés par David ; série de relecture
  c9a6ae1b · **Prochaine action** : aucune · **En attente de David** : rien · **Suite** : outil
  n° 59 (flèche cachée autour d'une double barre), puis comparer avec F7 b · **Worktree /
  branche** : aucun.

## Historique

### 2026-11-23 — rubrique prise, relevé, phase 0

- Rubrique choisie par David (TSA3 + TCA7) ; ligne « prise » poussée sur `main` (901317a04).
- Relevé : 14 exercices lus par deux agents (Sonnet), points vérifiés dans le code ; 22 modèles publiés
  sur TSPE-407 à 424 et 585 à 591, aucun brouillon, aucun réservé ailleurs. ✅ 1, 🟡 9, ❌ 4.
- Phase 0, si tout est oui : **5 modèles neufs** (12 variations : F5 tangente à une composée, F6
  variations de uⁿ / eᵘ / √u, F7 fonction auxiliaire et homographique, F11 signes de f′ et f″ lus sur
  la courbe, F12 reconnaître une courbe à partir de f″) et **16 variations** de 11 modèles publiés
  (50feeefd +2, f52b93c4 +2, e3e19d28 +1, 225c8682 +1, cfd13223 +1, 37ce7759 +2, 98f9d4b2 +1,
  eeb72d3a +2, 08f9ad7b +1, c4775a3a +1, e814175b +2).
- Idées en attente reprises : TSA1-44, TSA2-34, TSA2-52 → F7.
- Q1 : F12 en un modèle (TSPE-590) + une variation de 37ce7759, ou deux modèles. Q2 : sens de
  l'inégalité de F18 donné, ou deux cases.
- Question d'accès : personne (rangement de modèles, variations ajoutées).
- Questions ouvertes, sans réponse = non tranchées : F1 à F19, Q1, Q2.

### 2026-11-23 — phase 0 validée

- David, à mes recommandations (tout oui, Q1 et Q2 aux choix recommandés) : « je te suis ». Donc
  F1 à F18 oui, F19 rien ; **Q1** : F12 = un modèle neuf sur TSPE-590 (f″ donnée → f, f″ donnée → f′)
  et une variation de 37ce7759 (f donnée → f″) ; **Q2** : le sens de l'inégalité de F18 est écrit
  dans l'énoncé, une seule case (la tangente).
- Les 11 modèles publiés sont réservés dans le tableau de répartition (13d3ed972).

### 2026-11-23 — lot écrit

- Scripts `docs/wip/questions/idees-tle-derivation-neufs.py` (→ `scripts/questions/idees-tle-derivation-neufs/`)
  et `idees-tle-derivation-publies.py` (→ `scripts/questions/idees-tle-derivation-publies/`, 11 modèles
  exportés de prod le 2026-11-23, variations ajoutées à la fin, relançable).
- Neufs (11 variations) : F5 tangente à une composée (uⁿ, eᵘ, √u ; u du second degré construit
  par u(a), u′(a)), F6 variations de uⁿ / eᵘ / √u (tableau à compléter : x₀, signes, extremum,
  flèches), F7 a fonction auxiliaire eˣ − ax − b (minimum en ln a), F11 signes de f′(b) / f″(c)
  lus sur la courbe et sa tangente, F12 reconnaître f ou f′ à partir de la courbe de f″.
- Publiés (+16) : 50feeefd +2, f52b93c4 +2, e3e19d28 +1, 225c8682 +1, cfd13223 +1, 37ce7759 +2
  (F12 c, F13), 98f9d4b2 +1, eeb72d3a +2, 08f9ad7b +1, c4775a3a +1, e814175b +2.
- **F7 b retiré, question à David** : `-inf,3: ?flèche` est refusé autour d'une double barre
  (« ni centrée, ni asymptote »), et une limite écrite donnerait la flèche. Outil n° 59 de
  `outils-manquants.md` (18d10940d, `main`). Choix : (a) choix de quatre tableaux (décroissante des
  deux côtés, croissante, creux, bosse ; écrit, specs vertes, hors du modèle) ; (b) attendre
  l'outil ; (c) laisser F7 b.
- Écarts à la fiche, sans changer l'idée : F2 b demande la fraction simplifiée et le signe devant
  (`form: warn` du modèle : non simplifiée = moitié des points) ; F5 c refuse les décimaux (consigne
  « fractions irréductibles ») ; F8 demande la courbure du milieu ; F16 nomme r le paramètre e.
- Vérifié : `question:specs` vert sur les 16 fichiers (2 900 tirages), `create-questions` en
  simulation vert, 5 000 blocs courbe et tableau passés au parseur (0 problème), 70 000 formules à
  `validateLatex` + accolades (0 problème). Neufs et copies des variations à courbe (37ce7759,
  98f9d4b2, eeb72d3a) créés en base locale et vus dans l'aperçu (`pnpm voir`, iPhone) : tableaux,
  tangentes, choix de courbes ; ids locaux retirés des fichiers.

### 2026-11-24 — brouillons en prod, F7 b, migrations

- David a créé les 5 brouillons en prod ; ids commités (da157de6, 1a82084b, 74d73d4e, 91841156,
  02253f0a).
- F7 b : David choisit (a), le choix de quatre tableaux, « on fera l'outil après pour voir si c'est
  mieux » (outil n° 59). `INCLURE_F7B = True` ; 9 specs vertes. Le brouillon en prod n'a encore que
  F7 a : mise à jour par `create-questions --mettre-a-jour --publier` (David).
- Rangement relevé en prod : F5 « Dérivation > fonctions composées » (TSPE-413), F6 et F7
  « Dérivation > variations et extremums » (TSPE-416), F11 « Convexité > caractérisations »
  (TSPE-419), F12 « Convexité > dérivée seconde » (TSPE-590). « Convexité > lecture graphique »
  est archivée.
- Migrations `20261124062316_…_rangement_tags` et `20261124062325_…_publies_contenu` (+1 ou +2
  variations par modèle, 16 en tout) ; tests d'intégration verts (125).
- Doc système inchangée : les migrations rangent et complètent du contenu, sans toucher au schéma.
- #3068 mergée ; `security-auditor` sans finding bloquant. `db:migrate` refusé à la session par le
  classifieur (écriture en prod) : laissé à David.

### 2026-11-24 — relecture, publication, clôture

- `db:migrate` et mise à jour de F7 (F7 b) lancés par David ; vérifié en prod : 5 modèles rangés,
  F7 à 2 variations, 16 variations sur les 11 publiés.
- Série de relecture c9a6ae1b (11 publiés), enregistrée par David, fichier commité (#3070).
- David : « je valide tout » ; 5 modèles publiés par `publier-lot.ts --publier` (vérifié en prod).
- Tableau de répartition : rubrique publiée, 11 réservations levées, idées en attente TSA1-44,
  TSA2-34, TSA2-52 retirées (reprises en F7). Outil de la flèche cachée renuméroté 59 (le n° 57
  était pris deux fois).
