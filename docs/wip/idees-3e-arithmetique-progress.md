# Chantier `idees-3e-arithmetique` — journal

Idées reprises d'ailleurs, rubrique « Arithmétique » de Troisième (code 3A1, 25 exercices), selon le
skill `idees-rubrique`. Relevé : [idees-3e-arithmetique-releve.md](idees-3e-arithmetique-releve.md).

## Reprendre ici

_Mis à jour le 2026-11-23, phase 0 validée, aucune PR._

- **État** : phase 0 validée par David (« je valide tout ») : F1 à F8 oui, Q1 oui (F4 à F7 sans
  point), Q2 oui (F3 sans point, point de 3e des critères à noter pour le référentiel) ; rien
  d'écrit encore · **Prochaine action** : écrire le lot dans le worktree, sur le gabarit de
  `docs/wip/questions/idees-6e-decimaux-neufs.py` et `-publies.py` : scripts
  `idees-3e-arithmetique-neufs.py` (F3 à F7) et `-publies.py` (F1 sur 77ab770d, F2 sur 90dca27a) ·
  **En attente de David** : rien · **Pièges en cours** : F1 = case libre jugée comme le brouillon
  629c231b (options `constraints: {spaces: off, products: off}` ; `8 × 45`, `2³ × 9 × 5` et `360`
  → `bad_form` contrainte `form` ; vérifier d'où vient ce jugement avant d'écrire) ; F4 « donner un
  diviseur » = règle `divisor` + `range`, `rulesSuffice` (comme b7304fcb) ; F3 « cocher » = choix
  `plusieurs: oui` ; nombres ⩾ 1 000 : espaces · **Worktree / branche** :
  `../ubumaths-wt-idees-3e-arithmetique`, branche `docs/idees-3e-arithmetique` vide, à recréer en
  `feat/idees-3e-arithmetique` sur `origin/main`.

## Historique

### 2026-11-23 — rubrique prise, relevé, phase 0 publiée

- La troisième n'était pas au tableau de répartition : section ajoutée (15 lignes), rubrique 3A1
  choisie par David, ligne « prise » poussée sur `main`.
- Relevé : 25 exercices lus par deux agents (Sonnet), points clés relus dans le code ; nos modèles
  relevés en prod (lecture seule). ✅ 5 · 🟡 9 · ❌ 11.
- Constat : leur rubrique suit l'ancien programme (nombres premiers, PGCD, engrenages). Le BO en
  vigueur ne garde en 3e que factoriser un entier (3-010), fraction irréductible (3-001), et les
  critères par 2, 3, 5, 9 (cités en automatisme, sans point de 3e en base).
- Page à cocher : https://claude.ai/artifact/HvbQ9hjYSJXMsGgxEQbFCV (8 fiches, 2 questions). Si tout
  est oui : 5 modèles neufs (15 variations : chiffre manquant, nombre premier, partage en lots,
  engrenages et évènements, atteindre un multiple) et 5 variations de 2 modèles publiés (77ab770d,
  90dca27a).
- Q1 : garder les hors programme de 3e, rangés sans point, comme en Seconde (F4 à F7) ; je
  recommande oui. Q2 : F3 sans point et point manquant noté, ou tag de 5e ; je recommande sans point.
- Question d'accès : personne (rangement de modèles, variations ajoutées).
- Outils manquants ajoutés : n° 52 (figure d'engrenages), n° 53 (grille à parcourir).
- Idée en attente notée au tableau : « plus grand reste possible » (niveau 6e).
- Modèles publiés à réserver quand David aura dit oui : 77ab770d, 90dca27a (libres le 2026-11-23).
- Questions ouvertes, sans réponse = non tranchées : F1 à F8, Q1, Q2.

### 2026-11-23 — phase 0 validée

- David : « je valide tout ». F1 à F8 oui ; Q1 oui : F4 (nombre premier), F5 (partage en lots),
  F6 (engrenages et évènements), F7 (atteindre un multiple) rangés **sans point** ; Q2 oui : F3
  (chiffre manquant) **sans point**, et le point manquant « critères de divisibilité par 2, 3, 5, 9 »
  en 3e est à signaler au chantier du référentiel.
- Modèles publiés réservés au tableau : 77ab770d (F1), 90dca27a (F2).
- Lot attendu : 5 modèles neufs (15 variations), 5 variations de 2 modèles publiés.
