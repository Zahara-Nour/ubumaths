# Chantier `idees-3e-arithmetique` — journal

Idées reprises d'ailleurs, rubrique « Arithmétique » de Troisième (code 3A1, 25 exercices), selon le
skill `idees-rubrique`. Relevé : [idees-3e-arithmetique-releve.md](idees-3e-arithmetique-releve.md).

## Reprendre ici

_Mis à jour le 2026-11-23, PR de rangement prête, pas encore ouverte._

- **État** : 6 brouillons en prod (créés par David) ; branche prête (id commités, migrations de
  rangement et de contenu générées, tests d'intégration verts) · **Prochaine action** : réponse Q3
  → `security-auditor`, ouvrir la PR, merger, `db:migrate` (4 conditions), puis relecture dans
  `/dev/modeles?noeud=` · **En attente de David** : Q3 (F1 modèle neuf au lieu de 77ab770d,
  puissances exigées) ; sous-notions choisies (voir historique) · **Pièges en cours** : réservation
  de 77ab770d à lever si Q3 = oui · **Worktree / branche** : `ubumaths-wt-idees-3e-arithmetique`,
  `feat/idees-3e-arithmetique-rangement`.

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

### 2026-11-23 — lot écrit

- Scripts : `docs/wip/questions/idees-3e-arithmetique-neufs.py` (→ `scripts/questions/idees-3e-arithmetique-neufs/`)
  et `-publies.py` (→ `scripts/questions/idees-3e-arithmetique-publies/90dca27a.json`, export de prod).
- Neufs : F1 décomposition sans aide (2 var., 16 specs), F3 chiffre manquant (4 var., 16), F4 nombre
  premier (3 var., 17), F5 partage en lots (3 var., 10), F6 engrenages (3 var., 11), F7 atteindre un
  multiple (2 var., 8). Publié : 90dca27a + 3 variations (13 specs). Tout vert ; 6 brouillons créés
  dans la base LOCALE et vus dans l'aperçu admin (`pnpm voir`), id locaux retirés des fichiers.
- **Écart à la phase 0, question Q3 à David** : F1 devait s'ajouter à 77ab770d. Sans `products: off`,
  la bonne réponse `2^3 × 3^2 × 5` est jugée « produit à calculer » (½ point) selon l'ordre des
  facteurs (`5 × 3^2 × 2^3` passe) ; or les options d'un modèle publié sont figées par
  `migration-contenu.ts`. F1 est donc un modèle neuf (point visé 3-010), réglé `products: off`.
  Autre écart : la case est jugée par la comparaison de forme ordinaire (ADR 0013), donc
  `2 × 2 × 3 × 5` est `bad_form` comme `4 × 15` (pas « accepté » comme l'annonçait la fiche) ;
  l'énoncé demande les puissances, comme le brouillon 629c231b.
- Bug relevé, non corrigé ici : la remarque « produits » dépend de l'ordre des facteurs
  (`2^3\times3^2\times5` remarqué, `5\times3^2\times2^3` non).
- F4 b (donner un diviseur) : pas d'erreurs prévues, le générateur les refuse sur une case jugée
  par ses règles seules (`rulesSuffice`).
- F2 : 90dca27a n'a pas d'options, une fraction simplifiable reste `unoptimal_form` (½ point),
  comme sa variation d'origine (la fiche disait « refusée »).

### 2026-11-23 — brouillons en prod, migrations générées

- David a lancé `create-questions --publier` : 6 brouillons en prod (vérifié en lecture seule), id
  commités sur `feat/idees-3e-arithmetique-rangement`.
- Sous-notions choisies là où sont les modèles de collège voisins : F1 décomposition en facteurs
  premiers (3-010) ; F3 critères de divisibilité ; F4 primalité ; F5 et F6 multiples et diviseurs
  (comme 0bd51758, PGCD et PPCM de 2de) ; F7 Nombres et calculs > Entiers : division > division
  euclidienne (modèles de 6e), plutôt que la division euclidienne d'Arithmétique (Terminale).
- Migrations : `20261123115206_…_neufs_rangement_tags.sql`, `20261123115216_…_publies_contenu.sql`
  (90dca27a +3 variations). Tests d'intégration verts.
- Correctif de test : « un modèle absent parmi d'autres » échouait sur un lot d'un seul modèle publié
  (aucune assertion) ; sauté quand le lot a moins de deux modèles.
