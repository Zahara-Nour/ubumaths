# Chantier `idees-1re-second-degre` — journal

Idées reprises d'ailleurs, rubrique « Fonctions polynomiales de degré 2 » de Première spécialité
(code 1AL2, 22 exercices), selon le skill `idees-rubrique`. Relevé :
[idees-1re-second-degre-releve.md](idees-1re-second-degre-releve.md).

## Reprendre ici

_Mis à jour le 2026-11-23, chantier clos._

- **État** : rubrique **publiée** : les 7 modèles neufs sont publiés et validés par David ; les 13
  variations des 9 publiés aussi (série de relecture `1bfc8da3-4992-4f74-9804-62e64b5952dc`) ;
  journal archivé · **Prochaine action** : aucune · **En attente de David** : rien · **Pièges
  retenus** : « pas factorisable » attend l'outil n° 51 de `docs/wip/outils-manquants.md` ·
  **Worktree / branche** : aucun.

## Historique

### 2026-11-22 — rubrique prise

- David a choisi 1AL2 parmi les rubriques libres de Première ; la ligne est passée à « prise » sur
  `main` (27b0fe9aa).
- Nos modèles relevés en prod (MCP lecture seule) : 35 modèles publiés tagués sur les points de
  second degré de 1re spé (1SPE-243 à 258, 287, 382 à 387, 402, 403, 420), plus deux modèles 1_SPE
  publiés sans point (eae2ff6a « Déterminer les racines… », f8ccc8b6 « Vrai ou Faux sur les
  polynômes du second degré ») et sept modèles 1_GEN / 1_TECHNO sur les paraboles. Le point
  1SPE-382 (signe d'une forme factorisée) n'a aucun modèle ; 1SPE-251 en a un.
- Aucun de ces modèles n'est réservé par une autre session.

### 2026-11-22 — relevé, phase 0 publiée

- Relevé : 21 exercices (pas 22 : le tableau comptait aussi un fichier de test), lus par deux agents
  (Sonnet) ; `choisiDelta` et l'interactivité de 1AL24-2 vérifiés dans le code. 4 ✅, 15 🟡, 2 ❌
  (résoudre par la forme canonique, discuter selon un paramètre m). 10 exercices sur 21 n'ont pas de
  saisie chez eux.
- Page à cocher : https://claude.ai/artifact/JeWK9CeELHWtAMj2fkmzBy (16 fiches). Si tout est oui :
  7 modèles neufs (28 variations : F1 à F7) et 13 variations de 9 modèles publiés (604f83b7,
  b09c430a, 9e1d084e, afe51ac4, aab8e41c, 87140df3, 18e26873, 56b1803f, a9aece33).
- Q1 : « pas factorisable » (une case « expression, ou bien impossible ») → je recommande de
  l'ajouter à `outils-manquants.md`, sans variation en attendant. F3 : point 1SPE-246 recommandé,
  1SPE-386 possible.
- Question d'accès : personne (rangement de modèles, variations ajoutées).
- Questions ouvertes, sans réponse = non tranchées : F1 à F15, Q1.

### 2026-11-22 — phase 0 tranchée

- David : « je valide tes recos ». Donc F1 à F14 oui comme décrits, F15 rien ; F3 rangé sur
  1SPE-246 ; Q1 : outil n° 51 de `outils-manquants.md`, aucune variation « pas factorisable ».
- Les 9 modèles publiés à compléter sont réservés dans le tableau de répartition.

### 2026-11-22 — lot écrit

- Scripts `docs/wip/questions/idees-1re-second-degre-neufs.py` (→ `scripts/questions/idees-1re-second-degre-neufs/`)
  et `idees-1re-second-degre-publies.py` (→ `scripts/questions/idees-1re-second-degre-publies/`, 9
  modèles exportés de prod, variations ajoutées à la fin, relançable).
- Neufs (28 variations) : F1 résoudre (ensemble des solutions, 7), F2 forme adaptée (5), F3 par la
  forme canonique (3, deux cases), F4 paramètre m (4), F5 extremum sur [p ; q] (3, dont un tableau
  de variations à compléter), F6 comparer deux images (3, choix), F7 inéquation en situation (3).
- Publiés (+13) : 604f83b7 +5, b09c430a +1, 9e1d084e +1, afe51ac4 +1, aab8e41c +1, 87140df3 +1,
  18e26873 +1, 56b1803f +1, a9aece33 +1.
- Vérifié : `question:specs` vert sur les 16 fichiers, `create-questions` en simulation vert,
  `sonde-courbes` 0 problème, les 7 neufs créés en base locale et vus dans l'aperçu admin (F1, F5 et
  son tableau ; 0 erreur de console), ids locaux retirés (`git restore`, diff = ids seuls).
- Écarts au plan : la factorisation à racines irrationnelles (604f83b7) n'a pas de forme imposée :
  le motif `u*($x+v)*($x+w)` refuse `x-2-\sqrt{3}` ; la contrainte `form` (stricte par défaut)
  garde la forme factorisée. Pas d'erreur inventée : certaines cases n'en ont qu'une ou deux.

### 2026-11-22 — brouillons en prod, migrations

- David a lancé `create-questions --publier` : 7 brouillons créés en prod, ids commités.
- Contenu : `20261122183232_questions_idees_1re_second_degre_publies_contenu.sql` (+13 variations
  sur 9 publiés, fixture rejouée par `migrations-contenu-publie.test.ts`).
- Rangement : `20261122183241_questions_1re_second_degre_rangement_tags.sql` (test
  `questions-1re-second-degre-rangement-tags.test.ts`). F1, F4 → « Algèbre > Équations : second
  degré > discriminant » ; F2, F3 → « Fonctions > Second degré > formes » ; F5, F6 → « Fonctions >
  Second degré > variations » ; F7 → « Algèbre > Inéquations : second degré ». Voisins publiés
  rangés de même, sauf celui de 1SPE-402 (sur « parabole ») : F5 lit l'extremum dans un tableau de
  variations.
- Preuve : corps des deux migrations vidé → 10 tests rouges ; restaurés → 59 verts.
  `security-auditor` : aucun finding.

### 2026-11-22 — #3017 mergée, migrations en prod

- `db:migrate` depuis `main` : seules les 2 migrations du chantier étaient en attente ; appliquées,
  vérifiées en prod (MCP lecture seule).
- Série de relecture des 9 publiés : `scripts/series/1_SPE-relecture-second-degre-publies.json`,
  simulation verte (9 questions, 9 min).

### 2026-11-23 — #3021 mergée, rubrique publiée

- Série de relecture créée en prod par David, id commité (#3021).
- David : « je valide les modèles » (aucun verdict enregistré dans `/dev/modeles`) ; simulation de
  `publier-lot.ts` verte ; David a lancé `--publier` : les 7 neufs sont `published` (vérifié, MCP
  lecture seule).
- Rubrique « publiée » au tableau de répartition, 9 réservations levées ; journal archivé.
