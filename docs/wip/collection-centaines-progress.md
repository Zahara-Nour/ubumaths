# Chantier `collection-centaines` — plaques de cent et gros cubes du bloc ` ```collection `

## Reprendre ici

_Mis à jour le 2026-11-06, code écrit, PR en cours._

- **État** : code et tests faits (parseur, scène, construire, PDF, écran), rendu vérifié dans l'aperçu admin local · **Prochaine action** : PR, revue `code-reviewer`, CI, merge · **En attente de David** : rien · **Pièges en cours** : un grand bloc dans un choix de QCM (3 cm) sera très petit — non traité, à voir si un modèle le demande · **Worktree / branche** : `../ubumaths-wt-collection-centaines`, `feat/collection-centaines`

---

## Contexte

Ligne n° 5 de [`outils-manquants.md`](outils-manquants.md). Points servis : CE1-001, 002, 003 ;
CE2-001, 002, et la partie « matériel » de 005 (journaux `questions-ce1` § 3 C, `questions-ce2`
§ 3 C). Aujourd'hui, `centaines:` est une clé réservée : le parseur la refuse avec le message
« pas encore disponible » (`collection-parser.ts`).

Ce que demande le BO (`transcriptions/cycle-2/`) :

- **CE1** (nombres jusqu'à 1 000) : « collections organisées en centaines, dizaines et unités
  isolées » ; matériel multibase = **plaques de cent cubes, barres de dix, cubes unités** ;
  écritures non canoniques : « 2 centaines, 27 dizaines et 14 unités », « 9 dizaines, 23 unités
  et 4 centaines » ; « six plaques, trois barres et cinq cubes ».
- **CE2** (jusqu'à 10 000) : en plus, **gros cubes de mille** ; « 17 unités, 8 dizaines,
  32 centaines et 2 milliers » ; « quatre gros cubes, six plaques, trois barres et cinq petits
  cubes ».

## Phase 0 — comportements

### Écriture du bloc

```collection
milliers: 2
centaines: 32
dizaines: 8
unités: 17
```

- **Nominal** : deux nouvelles lignes, `centaines:` et `milliers:`, écrites comme `dizaines:`
  (une valeur par collection, `;` entre les collections, une ligne absente vaut 0). L'ordre des
  lignes est libre.
- **Nominal** : la valeur d'une collection = 1 000 × milliers + 100 × centaines + 10 × dizaines + unités.
- **Limite** : plafonds proposés (Q4) — milliers 0 à 9, centaines 0 à 40, dizaines 0 à 30,
  unités 0 à 100, valeur totale 9 999 au plus. Un bloc sans centaines ni milliers garde les
  règles d'aujourd'hui (dizaines ≤ 10, 100 objets au plus) : aucun modèle publié ne change.
- **Erreur** : valeur hors plafond, nombre de valeurs différent d'une ligne à l'autre, ligne
  donnée deux fois → erreur située, comme aujourd'hui.
- **Erreur** : `centaines:` ou `milliers:` avec `dessin: paquets` → refusé (Q2).

### Dessin (écran et PDF, même scène)

- **Plaque** : un carré quadrillé de 10 × 10 cubes. **Gros cube** : un cube en perspective,
  ses trois faces visibles quadrillées en 10 × 10.
- **Disposition** : de haut en bas, gros cubes, puis plaques, puis barres, puis cubes isolés ;
  chaque rangée revient à la ligne quand elle est pleine. Les cubes isolés gardent `vrac` ou
  `rangées`.
- **Échelle** : voir Q1.
- **Toucher pour marquer** (aide au comptage, non jugée) : une plaque ou un gros cube se barre
  d'un toucher, comme une barre aujourd'hui.
- **Lecteur d'écran** : le nom accessible ne dit toujours pas combien d'objets compte la
  collection.

### Construire (`construire:`)

- **Nominal** : `construire: 235` → l'élève dispose de plaques, de barres et de cubes ;
  `construire: 2 435` → en plus, des gros cubes. Seule la **valeur** posée est jugée : 2 plaques, 3 barres et 5 cubes, ou 23 barres + 5 cubes, valent 235.
- **Limite** : `construire: 34` → la réserve reste celle d'aujourd'hui (barres et cubes) : les
  modèles publiés ne changent pas (Q3).
- **Limite** : `construire:` accepte de 1 à 9 999 (aujourd'hui 1 à 100).
- **Corrigé** : la construction juste avec le moins d'objets (2 plaques, 3 barres, 5 cubes).
- **Erreur** : plan vide → réponse vide, comme aujourd'hui.

### Hors du chantier

- Les modèles de questions eux-mêmes (CE1-001 à 003, CE2-001, 002, 005) : ils reviennent aux
  sessions `questions-ce1` et `questions-ce2` une fois l'outil mergé.
- Le « paquet de cent » en jetons (`dessin: paquets`).

## Questions à David (phase 0)

- **Q1 — Échelle** : une plaque à l'échelle d'aujourd'hui fait 10 cubes de côté, soit à peu près
  la moitié de la largeur de la collection (2 plaques par rangée, 32 plaques = 16 rangées).
  Proposé : quand le bloc a des centaines ou des milliers, **toute la collection est dessinée
  plus petite** (environ 4 plaques par rangée), et deux collections comparées dans un même bloc
  gardent la même échelle.
- **Q2 — `dessin: paquets`** : proposé de **refuser** les centaines et les milliers avec les
  paquets de jetons (le BO ne parle que du matériel multibase pour les centaines).
- **Q3 — Réserve de `construire:`** : proposé d'en **déduire les pièces de la valeur** (plaques à
  partir de 100, gros cubes à partir de 1 000), sans nouvelle clé.
- **Q4 — Plafonds** : milliers 9, centaines 40, dizaines 30, unités 100, total 9 999.

**Tranché le 2026-11-06 (David)** : Q1 collection réduite ; Q2 refus avec `paquets` ; Q3 réserve
déduite de la valeur ; Q4 plafonds proposés.

## Journal

- 2026-11-06 : worktree ouvert, code relu (`collection-parser.ts`, `collection-scene.ts`,
  `collection-construire.ts`), BO relu ; phase 0 écrite.
- 2026-11-06 : phase 0 validée par David (Q1 à Q4, recommandations).
- 2026-11-06 : tests rouges (`collection-centaines.test.ts`, 35), puis code : `CollectionSet` à quatre
  rangs, `spec.large`, `COLLECTION_LARGE_LIMITS`, `COLLECTION_LARGE_VIEW` (objets à moitié taille),
  plaques et gros cubes (faces et quadrillage calculés par la scène), réserve de `construire:` déduite de
  la valeur. Choix d'exécution : 12 cm pleine largeur par défaut pour un grand bloc (sinon un cube fait
  moins de 2 mm à l'écran) ; un petit bloc garde sa graine (dessins publiés inchangés, instantanés
  verts). Compilation Typst réelle verte. Rendu vérifié à l'écran (aperçu de `/dashboard/admin/questions/create`, serveur 127.0.0.1:5178).
- 2026-11-06 : revue `code-reviewer` (Sonnet) de #2420 : rien de bloquant. Corrigé : hauteur d'un
  grand bloc au PDF bornée à 20 cm (jusqu'à 47 cm sinon, bloc insécable) ; cadre de `construire:` carré
  (12 × 12 cm) pour un grand bloc. Laissé, limite connue : grand bloc dans un choix de QCM imprimé
  (`taille: 3cm` forcée, cube < 1 mm) ; coins vides de la boîte de toucher d'un gros cube (sans effet).
