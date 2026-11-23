# Chantier `idees-tle-derivation` — journal

Idées reprises d'ailleurs, rubrique « Compléments sur la dérivation » de Terminale spécialité (TSA3,
14 exercices ; TCA7-30 à 32 n'en sont que des reprises), selon le skill `idees-rubrique`. Relevé :
[idees-tle-derivation-releve.md](idees-tle-derivation-releve.md).

## Reprendre ici

_Mis à jour le 2026-11-23, phase 0 validée._

- **État** : phase 0 **validée** (lot complet : 5 modèles neufs, 12 variations ; 16 variations de
  11 modèles publiés, réservés dans le tableau, 13d3ed972) · **Prochaine action** : écrire le lot,
  sur le modèle de `docs/wip/questions/idees-tle-limites-neufs.py` et `-publies.py` (scripts
  `docs/wip/questions/idees-tle-derivation-neufs.py` et `-publies.py`) ; fiches détaillées dans la
  page https://claude.ai/artifact/M7SzozkJJarxg9q1xPNDGE (source : la section « 2026-11-23 — phase 0 »
  ci-dessous) · **En attente de David** : rien · **Pièges en cours** : `{{e}}` interdit (Euler) ;
  bornes ±∞ des tableaux de F6 et F7 laissées vides (outil n° 50 non requis) ; une seule case par
  variation ; `create-questions` par `pnpm tsx scripts/create-questions.ts` · **Worktree / branche** :
  `../ubumaths-wt-idees-tle-derivation`, `feat/idees-tle-derivation`.

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
