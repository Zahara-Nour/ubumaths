# Étude — Objet `angle` de premier ordre dans `geometry-core`

> Statut : **étude exploratoire**, pas de code, pas de promesse.
> Décision attendue : **arbitrer une des 4 options** + valider le périmètre V1.
> Source de vérité du prompt : [`prompt-angle-object.md`](./prompt-angle-object.md).
> Public : utilisateur (PO du module geometry-core).

---

## 1. Résumé exécutif

**Recommandation : Option D — promouvoir `GeoAngleMark` au rang d'objet de
premier ordre**, en lui adjoignant `orientation` + `kind` (saillant/rentrant) +
un scalaire-mesure dérivé. Aucun nouveau type `Geo*`, aucune nouvelle
surface de rendu.

Justification en trois lignes :

1. Le rendu sur les 4 surfaces (canvas, SVG, TikZ, Typst) est déjà
   complet et testé sur `GeoAngleMark` — toute nouvelle option (A/B/C)
   doit le redupliquer ou risquer la divergence (cf. piège
   `extendLineToViewport` triplée, `GeoOsculatingCircle` oublié des
   exporters jusqu'en 2026-05-18).
2. Le DSL expose déjà `angle(A,V,B)` qui produit un `GeoScalar` — il
   suffit de basculer la sémantique en « retourne l'objet `angle`, et
   la mesure est obtenue via accesseur `mesure()` » pour rester
   cohérent avec la convention 2026-05-18 (« un builtin = un objet
   principal, accesseurs purs »).
3. L'Option B (sommet + 2 vecteurs/segments) est séduisante mais
   nécessite de gérer N² combinaisons typage (point|vecteur|segment|
   droite) côté handler et casse l'identité « 3 points » utilisée par
   `bissectrice`, `triangle_rectangle`, `hauteur` (3 sites internes).

Si l'utilisateur veut absolument **un type distinct** (séparer
annotation et objet), basculer en **Option A** (triplet de points,
identique structurellement, mais nouveau type `GeoAngle`). Coût
supplémentaire : ~150 LoC de duplication rendu + tests + 4 branches
exporters. **Pas recommandé** sauf raison sémantique forte.

---

## 2. État actuel (rappel synthétique)

Trois briques co-existent aujourd'hui :

| Brique                                       | Type sortant                                           | Rôle                                      | Sites internes                                                        |
| -------------------------------------------- | ------------------------------------------------------ | ----------------------------------------- | --------------------------------------------------------------------- |
| `angle_vecteurs(u,v)`                        | `BuiltinScalarResult`                                  | mesure scalaire `[0,π]` (acos)            | 0                                                                     |
| `angle(A,V,B)` / `angle(O,P)`                | `GeoScalar` (scalarKind: `'angle'` ou `'polar_angle'`) | mesure scalaire, visible=false par défaut | 0                                                                     |
| `marque_angle(A,V,B)` / `angle_droit(A,V,B)` | `GeoAngleMark`                                         | annotation visuelle (arc/carré)           | 5 sites (triangle_rectangle, hauteur, mediatrice via createAngleMark) |

`GeoAngleMark` (`types/elements.ts:427-435`) :

```
{ type: 'angleMark', p1Id, vertexId, p2Id,
  arcCount: 1|2|3, rightAngle: boolean, label?, dependsOn: [3] }
```

Rendu sur les 4 surfaces :

- Canvas : `GeometryCanvas.svelte:1723-1730` via `angleMarkToSVG`
- SVG export : `export-svg.ts:332-335`
- TikZ : `export-tikz.ts:380-430` (50 lignes inline)
- Typst : `export-typst.ts:383-…`
- Tests : `figure-angle-mark.test.ts` (265 lignes)

**Conclusion** : il existe déjà tout ce qu'il faut pour rendre un objet
angle. Il manque uniquement la **sémantique de premier ordre** : que
`angle(A,V,B)` retourne un objet identifiable avec accesseurs et
composition.

---

## 3. Valeur pédagogique d'un objet angle de premier ordre

**Pour l'enseignant** :

- Réutilisabilité : déclarer un angle une seule fois, puis l'utiliser
  dans plusieurs constructions (bissectrice, marquage, mesure, report).
- Cohérence DSL : `segment(A,B)` → objet ; `cercle(O,r)` → objet ;
  `angle(A,V,B)` → **scalaire actuellement** = exception (incohérent).
- Marquage par défaut : un objet angle peut s'afficher visuellement
  sans appel séparé à `marque_angle` (UX façon GeoGebra).

**Pour l'élève** :

- Notation conforme aux manuels français (`\widehat{AVB}`, AÔB).
- Le scalaire mesure devient un accesseur pur (`mesure(α)`) — distingué
  de l'objet géométrique (cf. distinction « segment vs longueur »
  enseignée explicitement au collège).

**Pour les chorégraphies `constructions-v2`** :

- `bissectrice @euclide` pourrait prendre un angle existant et animer
  la construction au compas à partir de ses 3 points.
- Futur « transport d'angle au compas » (hors scope V1) a besoin d'un
  objet angle source.

**Risque pédagogique d'un objet** : double sémantique (objet visuel +
mesure) à expliquer. Atténué si on adopte la convention GeoGebra :
l'objet **affiche** sa mesure par défaut → l'élève voit l'angle, pas
deux entités séparées.

---

## 4. Comparaison des 4 options

### Option A — Triplet de points (nouveau type `GeoAngle`)

```
GeoAngle {
  type: 'angle',
  vertexId, p1Id, p2Id,
  orientation: 'direct'|'indirect'|'auto',
  kind: 'saillant'|'rentrant',
  arcCount, rightAngle, ...
}
```

- **Drag** : trivial — chacun des 3 points peut bouger, recalcul
  `dependsOn=[p1,v,p2]`.
- **Cas dégénérés** : 0° (côtés confondus), 180° (côtés opposés), 360°
  (= 0°). Gérés en silence (`null` retourné).
- **Orientation** : champ explicite, défaut `'auto'` (= secteur interne
  via produit vectoriel signe).
- **Effort rendu** : à dupliquer / partager avec `angleMark` (factoriser
  `angleMarkToSVG` → `angleToSVG` accepte les deux).
- **Migration** : `angle()` DSL change de retour : scalaire → objet.
  Tests à mettre à jour (compter sites d'usage).

**Verdict** : structurellement identique à D mais **nouveau type
distinct**. Avantage : sémantique propre. Désavantage : duplique
`GeoAngleMark` à 90%.

### Option B — Sommet + 2 sides (vecteurs ou segments)

```
GeoAngle {
  type: 'angle',
  vertexId, side1Id, side2Id, // refs to GeoVector | GeoSegment | GeoLine
  orientation, ...
}
```

- **Drag** : indirect — bouger un point côté revient à bouger le
  vecteur/segment référencé, qui propage. Conceptuellement plus pur.
- **Avantage** : permet `angle(u, v)`, `angle(seg1, seg2)`, `angle(d1,
d2)` naturellement.
- **Inconvénient majeur** : ambiguïté de signe pour `angle(d1, d2)` (4
  angles possibles), nécessite une convention « plus petit angle » +
  option utilisateur.
- **Effort handler** : matrice de dispatch côté handler
  (point|vecteur|segment|droite × point|vecteur|segment|droite) — au
  moins 6 combinaisons à gérer.
- **Composition `bissectrice(α)`** : il faut extraire les « rayons »
  abstraits depuis les sides → couche d'indirection.

**Verdict** : option la plus expressive mais ~2× le code de A/D, et
casse la simplicité « 3 points » utilisée par les builtins existants.

### Option C — Sommet + 2 angles absolus

```
GeoAngle {
  type: 'angle',
  vertexId, startAngle: ScalarParam, endAngle: ScalarParam, ...
}
```

- Calqué sur `GeoArcByAngles`. Bonne cohérence avec l'arc.
- **Drag** : aucun point côté à dragger — il faudrait dragger un point
  fictif construit à partir de `(vertex + cos(start), sin(start))`.
  Drag-friendliness médiocre.
- **Avantage** : représente naturellement les angles `>180°` et les
  angles signés.
- **Inconvénient** : l'API DSL `angle(A,V,B)` doit calculer
  `atan2(A-V)` et `atan2(B-V)` au moment de la création et perdre la
  réactivité aux points A, B (sauf à wrapper en `ScalarParam`
  réactif). Complique le modèle.

**Verdict** : utile pour exposer l'arc comme objet, mais inutilement
compliqué pour un objet angle pédagogique.

### Option D — Enrichir `GeoAngleMark` (recommandé)

Garder `GeoAngleMark` comme **unique type**, lui ajouter :

```
GeoAngleMark {
  ... champs existants ...
+ orientation?: 'direct'|'indirect'|'auto'  // default 'auto'
+ kind?: 'saillant'|'rentrant'              // default 'saillant'
+ showLabel?: 'aucun'|'nom'|'mesure'|'mesure+nom'  // default 'aucun' (backward compat)
+ unite?: 'rad'|'deg'                       // default suit angleMode
+ measureScalarId?: string                  // back-ref optionnelle vers le scalaire mesure
}
```

- **Backward compat absolue** : tous les champs nouveaux sont
  optionnels avec défauts qui reproduisent le comportement actuel.
- **`marque_angle()` / `angle_droit()`** : inchangés. Continuent de
  produire des `GeoAngleMark` avec `showLabel: 'aucun'`.
- **`angle(A,V,B)`** : _change_ de retour. Au lieu de produire un
  `GeoScalar`, produit un `GeoAngleMark` (objet de premier ordre).
  La mesure scalaire est créée _en interne, invisible_, et exposée
  via accesseur `mesure(α)` (pattern `centre()` / `rayon()` post
  2026-05-18).
- **Composition** : `bissectrice(α)` lit `α.p1Id, α.vertexId, α.p2Id`
  et appelle la logique existante (refactor mineur de
  `handleBissectrice`).
- **Rendu** : déjà branché partout. Aucun nouveau code.
- **Risque** : sémantique surchargée (annotation vs objet dans un
  même type). Mitigation : c'est un **type-union de facto** déjà —
  `rightAngle: true` et `arcCount: 3` cohabitent déjà sans
  collision logique. Ajouter `kind` / `orientation` reste
  conservateur.

**Verdict** : moindre coût, moindre risque, alignement
GeoGebra (« le scalaire affiché est un proxy d'objet »), pleine
backward compat. **Recommandé.**

### Grille de tranchage pondérée

Poids `1..5` (5 = critique). Note `0..5` par option (5 = excellent).

| Critère                                          | Poids |       A |       B |      C |       D |
| ------------------------------------------------ | ----: | ------: | ------: | -----: | ------: |
| Cohérence avec `GeoVector`/`GeoSegment`          |     3 |       4 |       5 |      3 |       3 |
| Drag-friendliness                                |     5 |       5 |       4 |      2 |       5 |
| Expressivité DSL                                 |     4 |       4 |       5 |      3 |       4 |
| Effort multi-rendu (canvas/SVG/TikZ/Typst)       |     5 |       2 |       1 |      1 |       5 |
| Risque de régression                             |     5 |       3 |       2 |      2 |       4 |
| Couverture des cas dégénérés                     |     3 |       4 |       3 |      5 |       4 |
| Alignement standards éducatifs (français + GG)   |     3 |       4 |       3 |      3 |       5 |
| Backward compat (`marque_angle` / `angle_droit`) |     4 |       3 |       2 |      2 |       5 |
| Simplicité du modèle de données                  |     3 |       4 |       2 |      3 |       5 |
| Composition (`bissectrice(α)`, etc.)             |     4 |       4 |       5 |      3 |       4 |
| **Total pondéré (max 195)**                      |       | **135** | **121** | **95** | **163** |

**D gagne (163/195)**, A second (135). C disqualifié drag-friendliness.

---

## 5. Comparaison avec outils concurrents

| Outil                  | Objet angle ?                  | Constructeur            | Mesure      | Bissectrice via angle ? | Orientation             | Marquage                              |
| ---------------------- | ------------------------------ | ----------------------- | ----------- | ----------------------- | ----------------------- | ------------------------------------- |
| GeoGebra               | non (scalaire affiché)         | `Angle[A,B,C]`          | implicite   | non (prend 3 pts)       | CCW par défaut          | arc, 90°, hachures                    |
| Cabri II               | oui (secteur)                  | menu                    | séparée     | oui                     | non orienté             | arc multi, 90°                        |
| CarMetal               | oui                            | menu / `Angle()`        | séparée     | oui                     | configurable            | multi                                 |
| Desmos Geometry        | non                            | outil                   | implicite   | non                     | non orienté             | arc + label                           |
| Sketchpad              | annotation                     | menu                    | séparée     | non                     | non orienté             | arc, 90°                              |
| Manim                  | oui (`Angle(l1, l2)`)          | API Python              | méthode     | composable              | configurable            | configurable                          |
| Asymptote              | non (lib tierce)               | `geometry.asy`          | externe     | non                     | configurable            | manuel                                |
| TikZ                   | non (`pic`)                    | `pic { angle=A--V--B }` | externe     | non                     | –                       | très flexible                         |
| Sketchometry           | annotation                     | gesture                 | implicite   | non                     | non orienté             | arc                                   |
| **UbuMaths (cible D)** | **oui (GeoAngleMark enrichi)** | `angle(A,V,B)`          | `mesure(α)` | **oui**                 | défaut `auto`, override | réutilise rendu existant + arcs/carré |

**Synthèse** : la cible UbuMaths se range dans la famille
GeoGebra/Desmos (objet implicite affichant sa mesure) plutôt que
Cabri/CarMetal (objet « secteur » distinct). Choix justifié par
l'usage scolaire majoritaire en France (GeoGebra > Cabri).

---

## 6. API DSL proposée

### Constructeurs

```text
α = angle(A, V, B)                       # objet, sommet V, côtés A et B
α = angle(A, V, B, orientation="direct") # signé CCW
α = angle(A, V, B, kind="rentrant")      # secteur extérieur
α = angle(O, P)                          # angle polaire (legacy, conservé)
```

**Différé V2** (Option B-ish, étend D sans le remplacer) :

```text
α = angle(u, v)                          # entre vecteurs
α = angle(seg1, seg2)                    # entre segments
α = angle(d1, d2)                        # entre droites (4 possibles, conv. min)
```

### Accesseurs

```text
m   = mesure(α)                          # scalaire en angleMode courant
m_d = mesure(α, unite="deg")             # forçage degré
m_r = mesure(α, unite="rad")             # forçage radian
V   = sommet(α)                          # point
P1  = cote(α, 1)                         # point côté 1 (alias rayons(α,1))
P2  = cote(α, 2)                         # point côté 2
```

**Note** : `mesure(α)` retourne un `GeoScalar` réactif. Si
`α.measureScalarId` existe déjà, le réutiliser (cache) ; sinon, le
créer à la volée et le mémoriser.

### Composition

```text
d = bissectrice(α)                       # overload sur GeoAngleMark
ρ = rotation_angle(α)                    # = rotation centrée sommet, scalaire = mesure
```

### Marquages

```text
α = angle(A, V, B, arcs=2)               # double arc
α = angle(A, V, B, marque="carre")       # force carré (sans test 90°)
marque(α, arcs=3)                        # mutateur idempotent
α = angle(A, V, B, label="α")            # étiquette texte
α = angle(A, V, B, showLabel="mesure")   # affiche valeur (ex: "60°")
```

`angle_droit()` reste un raccourci de `angle(..., marque="carre")`.
`marque_angle()` reste un raccourci de `angle(..., showLabel="aucun")`.

### Style

Héritage de `GeoStyle` standard (color, opacity, strokeWidth, dash).
Nouveaux champs spécifiques optionnels :

- `arcRadius` (px) : override du `ARC_RADIUS_PX = 25` actuel.
- `arcSpacing` (px) : override du `ARC_SPACING_PX = 6`.
- `fill` (color) : fond du secteur (option visuelle façon Cabri).

---

## 7. Stratégie de rendu

**Décision : réutiliser intégralement `angleMarkToSVG`** (et ses 3
jumeaux TikZ/Typst/canvas).

Justifications :

- Le rendu est déjà couvert sur les 4 surfaces et testé.
- Ajouter `kind: 'rentrant'` revient à inverser le sens d'arc (sweep
  via long-arc-flag SVG = 1 au lieu de 0) → modification locale dans
  `buildArcPath` + duplication dans les 2 exporters tikz/typst (mêmes
  formules d'angle existent déjà).
- Ajouter `arcRadius` custom : remplacer la constante par
  `mark.style?.arcRadius ?? ARC_RADIUS_PX` (3 sites).
- Ajouter `showLabel: 'mesure'` : appeler une fonction commune
  `formatAngleLabel(mark, mode)` qui produit la string (ex `"60°"`).

**Non-décisions à valider** :

- Le label « mesure » s'affiche au point bissecteur à distance
  `arcRadius + 12px`. Position calculable dans le helper SVG.
- Doit-on **factoriser** les 3 (`svg-primitives.ts`, `export-tikz.ts`,
  `export-typst.ts`) en un seul helper retournant des primitives
  abstraites ? **Hors scope V1** (cf. `extendLineToViewport` triplée
  encore non factorisée).

---

## 8. Réactivité au drag

Pattern à suivre : `GeoSegment` (`dependsOn: [startId, endId]`),
`GeoVectorByPoints`.

- `α.dependsOn = [p1Id, vertexId, p2Id]` (déjà le cas pour
  `GeoAngleMark`).
- Drag d'un des 3 points → propagation automatique via
  `dependency-graph` → recalcul `compute-position` → mutation `$state`
  → re-render.
- Le scalaire `measureScalarId` (créé à la demande) dépend de
  `[p1Id, vertexId, p2Id]` aussi, donc se met à jour en cascade.
- La bissectrice dérivée (`bissectrice(α)`) dépend transitivement de
  ces 3 points.

**Aucun nouveau code de drag** n'est nécessaire — le pipeline existant
suffit.

**Cas spécifique** : drag d'un point qui change le signe du produit
vectoriel (`p1 × p2` autour de `vertex`) → orientation `'auto'` flippe.
Pour les utilisateurs qui veulent l'orientation stable, ils déclarent
explicitement `orientation="direct"`.

---

## 9. Cas dégénérés et invariants

| Cas                                | Comportement attendu                                                                 | Source de vérité                   |
| ---------------------------------- | ------------------------------------------------------------------------------------ | ---------------------------------- | --- | ----------------------- |
| `vertex == p1` (ou `vertex == p2`) | `mesure(α)` retourne `null`, rendu masqué                                            | `angleMarkToSVG` ligne 771         |
| `p1 == p2` (côtés confondus)       | mesure = 0, arc invisible (rayon ok mais vide)                                       | logique existante                  |
| Angle plat (180°)                  | arc demi-cercle ; bissectrice indéterminée → `DslRuntimeError` côté `bissectrice(α)` | `handleBissectrice:4403` déjà géré |
| Angle nul (0°)                     | mesure = 0, rendu OK (arc minuscule)                                                 | OK                                 |
| Angle `> 180°` (rentrant)          | nécessite `kind="rentrant"` explicite → sweep inverse                                | nouveau, à coder                   |
| 3 points alignés (V entre A et B)  | angle plat → idem ci-dessus                                                          | idem                               |
| `arcCount > 3` ou `< 1`            | refusé via Zod (déjà : `1                                                            | 2                                  | 3`) | `types/elements.ts:432` |

**Invariants à préserver** :

- `α.vertexId`, `α.p1Id`, `α.p2Id` doivent référencer des `GeoPoint*`
  (point-like). Type guard `isPointElement` déjà appliqué dans
  `createAngleMark`.
- `dependsOn` doit rester exactement `[p1Id, vertexId, p2Id]` (l'ordre
  importe pour les renderers qui font `dependsOn[0]`).

---

## 10. Effort estimé par sous-tâche (Option D)

Unité : fichier touché + LoC ajoutées (estimations conservatrices).

| Sous-tâche                                                                                                                                         | Fichiers                                                           | LoC nettes |
| -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ---------: |
| Étendre `GeoAngleMark` (champs + Zod schema)                                                                                                       | `types/elements.ts`, `types/schemas.ts`                            |        ~25 |
| Modifier `figure.createAngleMark` (gère nouveaux options)                                                                                          | `graph/figure.ts`                                                  |        ~20 |
| Refacto `handleAngle` → retourne `GeoAngleMark` au lieu de `GeoScalar` (gardant ancien comportement pour `angle(O,P)` polaire et `angle_vecteurs`) | `dsl/builtins.ts`                                                  |        ~60 |
| `handleMesure` (nouvel accesseur) avec cache `measureScalarId`                                                                                     | `dsl/builtins.ts`                                                  |        ~40 |
| `handleSommet` accesseur, `handleCote` accesseur                                                                                                   | `dsl/builtins.ts`                                                  |        ~30 |
| Overload `handleBissectrice` (accepte `GeoAngleMark`)                                                                                              | `dsl/builtins.ts`                                                  |        ~25 |
| Rendu : `kind='rentrant'` (sweep inversé) + `showLabel='mesure'`                                                                                   | `rendering/svg-primitives.ts`, `export-tikz.ts`, `export-typst.ts` |        ~80 |
| Rendu : `arcRadius` paramétrable                                                                                                                   | 3 fichiers rendu (idem)                                            |        ~15 |
| Tests : extension `figure-angle-mark.test.ts`                                                                                                      | `graph/__tests__/figure-angle-mark.test.ts`                        |       ~100 |
| Tests DSL : nouveaux comportements `angle()` / `mesure()` / `bissectrice(α)`                                                                       | `dsl/__tests__/builtins-angle.test.ts` (à créer)                   |       ~150 |
| Documentation utilisateur (DSL reference, exemples)                                                                                                | `docs/ref/geometry/dsl-builtins.md`                                |        ~50 |
| **TOTAL**                                                                                                                                          | **~10 fichiers**                                                   |   **~595** |

**Migration interne** : 3 sites utilisent `createAngleMark` avec
`{ rightAngle: true }` (triangle_rectangle, hauteur) — inchangés
puisque l'API factory est rétrocompatible.

**Comparaison Option A** : ~595 + ~150 LoC rendu dupliqué + ~80 LoC
type guards + branches dans 4 surfaces = **~825 LoC**, soit ~40% de
plus. **Option B** : ~825 + ~200 LoC matrice de dispatch typage = **~1025**.

---

## 11. Risques identifiés

| Risque                                                                                           | Probabilité | Impact | Mitigation                                                                                                                                  |
| ------------------------------------------------------------------------------------------------ | :---------: | :----: | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Régression sur `angle(A,V,B)` qui retourne maintenant un `GeoAngleMark` au lieu d'un `GeoScalar` |   élevée    | élevé  | Tester tous les usages existants ; faire grep sur `angle(` dans tests + scripts ; option de migration `angle(...) + mesure(...)` documentée |
| Régression sur `marque_angle` / `angle_droit` (3 sites internes)                                 |   faible    | élevé  | Tests `figure-angle-mark.test.ts` (265 lignes) à conserver intacts ; `triangle_rectangle.test.ts` à vérifier                                |
| Sémantique surchargée (annotation + objet dans même type)                                        |   moyenne   | moyen  | Documenter clairement ; convention `showLabel='aucun'` = annotation, `showLabel='mesure'` = objet ; type guard partagé                      |
| Divergence rendu rentrant entre canvas / SVG / TikZ / Typst                                      |   moyenne   | moyen  | Implémenter en parallèle sur les 4 surfaces dans un seul commit ; test visuel manuel                                                        |
| Cas `bissectrice(α)` avec `α` plat (mesure = π) → ambiguïté                                      |   faible    | faible | Déjà géré dans `handleBissectrice:4403` (cross-direction check) ; propager le `DslRuntimeError`                                             |
| Réactivité du scalaire `measureScalarId` (cache stale après mutation de `α`)                     |   faible    | moyen  | Suivre pattern `dependsOn` strict ; tests de drag                                                                                           |
| Conflit avec `angle_vecteurs(u,v)` qui reste scalaire (incohérence)                              |   moyenne   | faible | Documenter : `angle_vecteurs` = fonction pure scalaire utilitaire ; `angle()` = objet géométrique                                           |
| Coût pédagogique de la nouvelle sémantique (UX confuse)                                          |   faible    | moyen  | Garder `angle(A,V,B)` invisible par défaut (`showLabel: 'aucun'`) → comportement initial préservé sauf opt-in                               |

---

## 12. Plan phasé V1 / V2 / V3

### V1 (livrable minimal, ~595 LoC, ~10 fichiers)

- Étendre `GeoAngleMark` avec `orientation`, `kind`, `showLabel`,
  `unite`, `measureScalarId`.
- Refacto `handleAngle(A,V,B)` → retourne `GeoAngleMark` (objet).
- Conserver `angle(O,P)` → reste scalaire (polar_angle).
- Conserver `angle_vecteurs(u,v)` → reste scalaire.
- Nouveaux accesseurs : `mesure(α)`, `sommet(α)`, `cote(α, i)`.
- Overload `bissectrice(α)`.
- Rendu : `kind='rentrant'` (sweep inversé) sur 4 surfaces.
- Backward compat : `marque_angle`, `angle_droit` inchangés.
- Tests : étendre `figure-angle-mark.test.ts` + nouveau
  `builtins-angle.test.ts`.

**Critère de done** : 0 régression sur les 1500 tests existants,
nouveaux tests verts, documentation utilisateur mise à jour.

### V2 (post-validation)

- `angle(u, v)`, `angle(seg1, seg2)`, `angle(d1, d2)` : overloads sur
  vecteurs / segments / droites.
- `showLabel='mesure+nom'` (ex : `α = 60°`).
- `arcRadius`, `arcSpacing` paramétrables.
- Chorégraphie `bissectrice @euclide` adaptée pour partir d'un objet
  angle existant.
- Helper de factorisation `formatAngleLabel` partagé entre rendus.

### V3 (futur, hors scope étude)

- Report d'angle au compas (`transporte(α, V', direction)`).
- Marquage `fill` du secteur (façon Cabri).
- Animation `@euclide` du report d'angle.
- Refactor des 3 rendus dupliqués (`angleMarkToSVG` /
  TikZ / Typst) en un helper unique abstrait.

---

## 13. Questions ouvertes (à trancher avec PO avant implémentation)

1. **Breaking change `angle(A,V,B)`** : le retour passe de `GeoScalar`
   à `GeoAngleMark`. Acceptable ? Sinon, introduire un **nouveau
   builtin** (`angleobj()` ? `angle_obj()` ?) et garder `angle()`
   scalaire — moins propre mais zéro risque de régression.
2. **`angle(O,P)` polaire** : maintenu en scalaire (V1) ou aussi
   migré en objet « angle polaire » ?
3. **`showLabel` défaut** : `'aucun'` (backward compat strict) ou
   `'mesure'` (UX façon GeoGebra : un angle affiche sa mesure) ?
4. **Convention orientation par défaut** : `'auto'` (CCW si produit
   vectoriel positif, sinon CW) ou `'direct'` (toujours CCW) ?
5. **Unité par défaut** : suivre `angleMode` global de la figure
   (actuel) ou champ explicite par angle ?
6. **`mesure(α)` retour** : `GeoScalar` (visible=false, accessible via
   `montre()` plus tard) ou directement un scalaire computed sans
   identité ? Pattern de réutilisation post 2026-05-18 dit « objet
   réutilisable, cache `measureScalarId` ».
7. **Faut-il un `cote(α, i)` ou exposer les points via `point1(α)` /
   `point2(α)`** ? Cohérence avec `extremite(s, i)`.

---

## Annexe — Fichiers concernés (audit)

- `types/elements.ts:427-435` (`GeoAngleMark`)
- `types/elements.ts:1504-1506` (`isAngleMark` type guard)
- `dsl/builtins.ts:2059-2107` (`handleAngleVecteurs`)
- `dsl/builtins.ts:2574-2630` (`handleMarqueAngle`, `handleAngleDroit`)
- `dsl/builtins.ts:2853-2872` (`handleAngle` — actuel : retourne scalaire)
- `dsl/builtins.ts:4376-4427` (`handleBissectrice` — actuel : 3 points)
- `dsl/builtins.ts:4509, 4565, 4590` (sites internes `createAngleMark`)
- `graph/figure.ts:1961-1997` (`createAngleMark`)
- `graph/figure.ts:3526-3548` (`createScalarAngle`)
- `graph/figure.ts:3550-3567` (`createScalarPolarAngle`)
- `graph/compute-position.ts:1159-1176` (calc `scalarKind='angle'`)
- `rendering/svg-primitives.ts:723-802` (`angleMarkToSVG`)
- `rendering/export-svg.ts:25, 332-335` (usage `angleMarkToSVG`)
- `rendering/export-tikz.ts:380-430` (branche TikZ inline, 50 LoC)
- `rendering/export-typst.ts:383-…` (branche Typst inline)
- `components/geometry/GeometryCanvas.svelte:1723-1730` (canvas)
- `graph/__tests__/figure-angle-mark.test.ts` (265 LoC tests existants)
- `constructions-v2/core/choreographies/bissectrice.ts` (834 LoC, à
  étendre en V2 si on veut chorégraphier à partir d'un objet angle)

---

**Fin de l'étude.** Validation utilisateur requise avant implémentation.
