# Étude v2 — Objet `angle` de premier ordre dans `geometry-core` (sans backward compat)

> Statut : **révision** de [`study-angle-object.md`](./study-angle-object.md) (v1).
> Décision attendue : **arbitrer une des 5 options** (A/B/C/D/**E**) avec la
> contrainte backward compat **levée**.
> Public : utilisateur (PO du module geometry-core).

---

## 1. Préambule — ce qui change par rapport à v1

La v1 a tranché **Option D — enrichir `GeoAngleMark`** principalement parce
que ce chemin garantissait :

1. Aucun nouveau type `Geo*` (pas de nouvelle surface de rendu à brancher
   sur 4 cibles).
2. **Backward compat absolue** : `marque_angle()`, `angle_droit()`,
   `createAngleMark()` (5 sites internes) restent intacts.
3. La grille de tranchage pondérait « backward compat » à **4/5** et
   « risque de régression » à **5/5** — D rafle 163/195.

**Ce que le PO change aujourd'hui** : il **lève la contrainte de
backward compatibility**. Priorité au **système propre et cohérent**,
quitte à casser :

- `GeoAngleMark` peut **disparaître** ou être renommé.
- `marque_angle()` / `angle_droit()` peuvent disparaître.
- `angle_vecteurs(u,v)` peut disparaître (redondant avec
  `mesure(angle(u,v))`).
- `angle(A,V,B)` peut changer de retour sans alias.
- `angle(O,P)` polaire peut être renommé / supprimé.
- Les 5 sites internes (`triangle_rectangle`, `rectangle`, `carre` qui
  appellent `createAngleMark`) sont migrés.

**Conséquence directe sur le tranchage** : les critères « backward compat »
(poids 4) et « risque de régression » (poids 5) chutent ou disparaissent.
La grille doit être recalculée — c'est l'objet de la section 4.

**Conséquence secondaire** : une nouvelle option **E** (« D propre » sans
dette de double-sémantique annotation+objet) devient envisageable, et
même probablement gagnante.

---

## 2. Vision « système propre » — angle DSL feuille blanche

Si on partait d'une feuille blanche aujourd'hui en respectant les
**patterns 2026-05-18** du module :

### 2.1 Conventions à respecter

- **Un builtin = un objet sémantique principal** (`segment(A,B)` → objet
  segment ; `cercle(O,r)` → objet cercle). `angle(A,V,B)` doit donc
  retourner un **objet angle** identifiable, pas un scalaire.
- **Accesseurs purs** : `centre(c)`, `rayon(c)`, `extremite(s,i)`,
  `sommet(p,i)`. Pour un angle : `mesure(α)`, `sommet(α)`, `cote(α, i)`.
- **`montre()` / `masque()`** pour la visibilité — les sous-produits
  invisibles sont la norme. Un `angle` _peut_ être invisible par défaut,
  ou visible — décision UX section 2.4.
- **`style(α, ...)`** comme mutateur pur ; pas d'options de style en
  paramètre nommé direct sauf pour les **propriétés sémantiques** du type
  (`marque`, `arcs`, etc. — pas la couleur).
- **HANDLERS Map**, **type guards** (`isAngle`), **schema Zod**, **4
  surfaces de rendu** branchées dans le même commit, **`compute-position.ts`**
  branche obligatoire.
- **Erreurs structurées** `DslRuntimeError({ summary, hint?, forms? })`.

### 2.2 Modélisation interne unique

Représentation **triplet de points** (`vertexId, p1Id, p2Id`) +
sémantique :

```ts
interface GeoAngle extends GeoElementBase {
	type: 'angle';
	vertexId: string;
	p1Id: string;
	p2Id: string;
	orientation: 'auto' | 'direct' | 'indirect'; // CCW signed
	kind: 'saillant' | 'rentrant'; // < π ou > π
	marque: 'arc' | 'arcs2' | 'arcs3' | 'carre' | 'aucune'; // unifié
	showLabel: 'aucun' | 'nom' | 'mesure' | 'mesure+nom';
	unite: 'rad' | 'deg' | 'auto'; // 'auto' = angleMode global
	arcRadiusPx?: number; // override style
	dependsOn: [p1Id, vertexId, p2Id]; // ordre stable
}
```

Justification du triplet plutôt que sommet+sides (Option B v1) :

- C'est la forme la plus simple et la plus testable.
- Toutes les autres formes (`angle(u,v)`, `angle(seg1, seg2)`,
  `angle(d1, d2)`) **peuvent être normalisées** en triplet de points
  internes (sommet = origine commune ; p1/p2 = points témoins construits
  par `figure.createDilatedPoint` ou équivalent, invisibles).
- Le pattern **« créer des points témoins invisibles »** est déjà la
  norme du module (cf. `handleBissectrice` qui crée `Bprime` et `M`
  cachés ; cf. `triangle_equilateral` qui crée son 3ᵉ sommet caché).
- `dependsOn` = closure stable de 3 points → drag-friendly trivialement
  (pattern `GeoSegment`).

### 2.3 API DSL système propre

```text
α = angle(A, V, B)                 # objet, sommet V, côtés A B (orientation auto)
α = angle(u, v)                    # entre vecteurs → triplet (P1,V,P2) interne
α = angle(seg1, seg2)              # entre segments sécants
α = angle(d1, d2)                  # entre droites (4 angles, conv. min |α|)

# Accesseurs (purs)
m  = mesure(α)                     # scalaire en angleMode courant
V  = sommet(α)                     # point
P  = cote(α, 1)                    # point côté 1 (invisible par défaut)

# Composition
b  = bissectrice(α)                # surcharge sur GeoAngle
ρ  = rotation(P, α, centre)        # rotation par la mesure de α

# Visibilité / style (uniformes avec le reste du DSL)
montre(α, couleur="rouge", marque="arcs2")
masque(α)
style(α, showLabel="mesure", unite="deg")
```

### 2.4 Décision UX : visible par défaut ou invisible ?

Le pattern moderne est : **un builtin produit un objet visible** (cf.
`cercle()`, `segment()`, `polygone()`). Les byproducts sont masqués
explicitement.

→ **Choix recommandé** : `α = angle(A, V, B)` produit un objet
**visible** avec `marque='arc'` et `showLabel='aucun'` par défaut.
C'est ce que fait GeoGebra (Angle[A,B,C] dessine l'arc) — l'élève
voit immédiatement quelque chose.

Si l'utilisateur veut un angle « calculatoire » sans marque, il fait
`masque(α)` ou `α = angle(A,V,B); style(α, marque="aucune")`.

**Trade-off vs v1** : la v1 préservait `showLabel='aucun'` par défaut
pour rester compatible avec `marque_angle()` qui ne mettait rien.
Sans backward compat, on prend la convention **visible** qui colle au
reste du DSL.

---

## 3. Inventaire — ce qui est supprimé / fusionné / renommé

| Élément actuel                                                                                 | Devenir (système propre)                                                 | Justification                                                                                                                                                                                                                                                                               |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GeoAngleMark` (type)                                                                          | **SUPPRIMÉ** au profit de `GeoAngle`                                     | Type unique, plus de dualité annotation/objet                                                                                                                                                                                                                                               |
| `isAngleMark` (type guard)                                                                     | renommé → `isAngle`                                                      | –                                                                                                                                                                                                                                                                                           |
| `'angleMark'` (string littéral)                                                                | renommé → `'angle'`                                                      | Serializer + schemas + 4 exporters                                                                                                                                                                                                                                                          |
| `marque_angle(P1,V,P2,arcs=N)`                                                                 | **SUPPRIMÉ**, remplacé par `angle(P1,V,P2,marque="arcs2")` ou par défaut | Une seule construction d'angle                                                                                                                                                                                                                                                              |
| `angle_droit(P1,V,P2)`                                                                         | **SUPPRIMÉ**, remplacé par `angle(P1,V,P2,marque="carre")`               | –                                                                                                                                                                                                                                                                                           |
| `angle_vecteurs(u,v)` (scalaire pur)                                                           | **SUPPRIMÉ** au profit de `mesure(angle(u,v))`                           | Cohérence : pas de raccourci scalaire qui contourne l'objet                                                                                                                                                                                                                                 |
| `angle(A,V,B)` → `GeoScalar`                                                                   | **CHANGE** : retourne `GeoAngle`                                         | Convention « un builtin = un objet »                                                                                                                                                                                                                                                        |
| `angle(O,P)` polaire → `GeoScalar`                                                             | **RENOMMÉ** en `angle_polaire(O,P)`                                      | `angle()` est désormais réservé à l'angle géométrique au sommet ; pour un angle polaire, le builtin nommé évite l'ambiguïté. Alternative : supprimer pur (l'utilisateur écrit `mesure(angle(P, O, P+(1;0)))` ou `mesure(vecteur(O,P))` si on étend `mesure` aux vecteurs). À trancher (Q1). |
| `createAngleMark()` (factory `figure.ts`)                                                      | renommé → `createAngle()`                                                | –                                                                                                                                                                                                                                                                                           |
| `createScalarAngle()`                                                                          | **SUPPRIMÉ** (la mesure est dérivée via `mesure(α)`)                     | Plus de scalaire de premier ordre, juste un dérivé                                                                                                                                                                                                                                          |
| `createScalarPolarAngle()`                                                                     | conservée (utilisée par `angle_polaire`)                                 | –                                                                                                                                                                                                                                                                                           |
| Sites internes `createAngleMark({rightAngle:true})` × 5 (triangle_rectangle, rectangle, carre) | migrés vers `figure.createAngle(..., { marque: 'carre' })`               | Triviallement remplaçable                                                                                                                                                                                                                                                                   |
| `scalarKind: 'angle'` dans `GeoScalar`                                                         | **SUPPRIMÉ**                                                             | Plus de scalaire angle de premier ordre                                                                                                                                                                                                                                                     |
| `scalarKind: 'polar_angle'`                                                                    | conservé (utilisé par `angle_polaire`)                                   | –                                                                                                                                                                                                                                                                                           |

**Récapitulatif quantitatif** :

- **3 builtins supprimés** : `marque_angle`, `angle_droit`,
  `angle_vecteurs`.
- **1 builtin renommé** : `angle(O,P)` → `angle_polaire(O,P)`.
- **1 type supprimé** : `GeoAngleMark` (remplacé par `GeoAngle`).
- **2 factories renommées/supprimées** : `createAngleMark` →
  `createAngle` ; `createScalarAngle` supprimée.
- **5 sites internes** migrés (lignes 4509, 4565, 4590 de `builtins.ts`).
- **6 entrées BUILTIN_NAMES** modifiées (suppression de 3, ajout de
  `angle_polaire`, conservation de `angle`, `mesure`, etc.).

---

## 4. Re-tranchage des options (poids révisés)

### 4.1 Pondérations révisées

| Critère                                            |  v1 |    v2 | Justification du changement                             |
| -------------------------------------------------- | --: | ----: | ------------------------------------------------------- |
| Cohérence avec `GeoVector` / `GeoSegment`          |   3 | **5** | C'est maintenant le critère cardinal                    |
| Drag-friendliness                                  |   5 |     5 | inchangé                                                |
| Expressivité DSL                                   |   4 |     5 | promu : on construit pour l'usage scolaire              |
| Effort multi-rendu (canvas/SVG/TikZ/Typst)         |   5 |     4 | légèrement abaissé : c'est de l'effort one-shot         |
| Risque de régression                               |   5 | **1** | backward compat levée → on accepte les breaking changes |
| Couverture cas dégénérés                           |   3 |     3 | inchangé                                                |
| Alignement standards éducatifs (FR + GG)           |   3 |     4 | promu : pas de demi-mesure                              |
| **Backward compat** (`marque_angle`/`angle_droit`) |   4 | **0** | **supprimé**                                            |
| Simplicité du modèle de données                    |   3 |     5 | promu : éviter la dualité annotation/objet              |
| Composition (`bissectrice(α)`, etc.)               |   4 |     5 | promu : c'est le point qui motive l'étude               |

### 4.2 Notes par option (révisées)

| Critère                                 | Poids | A (nouv. type, triplet) | B (sommet+sides) | C (sommet+2 angles) | D (enrichir AngleMark) | **E (D nettoyé, AngleMark supprimé)** | F (objet « secteur ») |
| --------------------------------------- | ----: | ----------------------: | ---------------: | ------------------: | ---------------------: | ------------------------------------: | --------------------: |
| Cohérence avec `GeoVector`/`GeoSegment` |     5 |                       4 |                5 |                   3 |                      3 |                                 **4** |                     4 |
| Drag-friendliness                       |     5 |                       5 |                4 |                   2 |                      5 |                                 **5** |                     4 |
| Expressivité DSL                        |     5 |                       4 |                5 |                   3 |                      4 |                                 **5** |                     4 |
| Effort multi-rendu                      |     4 |                       2 |                1 |                   1 |                      5 |                                 **5** |                     2 |
| Risque de régression                    |     1 |                       3 |                2 |                   2 |                      4 |                                 **3** |                     2 |
| Couverture cas dégénérés                |     3 |                       4 |                3 |                   5 |                      4 |                                 **4** |                     4 |
| Alignement standards éducatifs          |     4 |                       4 |                3 |                   3 |                      5 |                                 **5** |                     4 |
| Backward compat                         |     0 |                       3 |                2 |                   2 |                      5 |                                     1 |                     1 |
| Simplicité du modèle de données         |     5 |                       4 |                2 |                   3 |                      3 |                                 **5** |                     3 |
| Composition                             |     5 |                       4 |                5 |                   3 |                      4 |                                 **5** |                     5 |
| **Total pondéré (max 185)**             |       |                 **138** |          **123** |              **89** |                **144** |                               **162** |               **131** |

**Lecture** : E gagne nettement (162/185). D reste second (144) ; A
talonne (138). C définitivement disqualifié.

### 4.3 Définition précise des options E et F

#### Option E — « D nettoyé »

- Faire **comme D** (un seul type, triplet de points, accesseurs,
  marque unifiée, etc.).
- Mais **renommer** `GeoAngleMark` en `GeoAngle`, **supprimer**
  `marque_angle()` / `angle_droit()` / `angle_vecteurs()`, **migrer**
  les 5 sites internes, **mettre à jour** serializer/schemas/exporters.
- Reuse intégral du **code de rendu existant** d'`angleMarkToSVG` (et
  ses 3 jumeaux TikZ/Typst/canvas) — pas besoin de réécrire le rendu.
  Juste renommer la fonction et étendre la signature.

C'est strictement « D moins la dette de double-sémantique ». Le gain
est **conceptuel** : un seul type avec une sémantique claire « angle
géométrique avec un rendu ».

#### Option F — « secteur angulaire » distinct (style Cabri)

Type différent de l'annotation : `GeoAngle` est un **secteur**
(arc + intérieur optionnellement coloré), avec mesure exposée et
composition. L'annotation marque (équerre 90°, hachures d'égalité) reste
distincte sous un autre type, ou disparaît.

- Avantage : sémantique cristalline « secteur géométrique » ≠
  « annotation visuelle ».
- Inconvénient : nécessite un second type pour l'annotation pure si on
  garde le besoin de coder une égalité d'angles entre deux secteurs
  visuels — ou alors on intègre tout dans `GeoAngle` (et on revient à E).
- Surcoût rendu : il faut une primitive « secteur rempli » ou modifier
  l'arc pour fill. ~150 LoC.

Verdict F : 131/185, en-dessous de A. **Non recommandé.**

---

## 5. API DSL cible (révisée, 8 exemples)

```text
# 1. Construction simple — l'angle est visible avec arc par défaut
A = point(0; 0); B = point(3; 0); C = point(1; 2)
α = angle(B, A, C)                       # sommet A ; arc visible

# 2. Mesure scalaire dérivée
m = mesure(α)                            # rad par défaut (angleMode)
m_d = mesure(α, unite="deg")             # forcé en degrés

# 3. Bissectrice par composition
b = bissectrice(α)                       # surcharge sur GeoAngle (sinon 3 pts)

# 4. Rotation paramétrée par un angle
P' = rotation(P, α, centre=O)            # rotation par mesure(α)

# 5. Marquage d'angles égaux (hachures doubles)
β = angle(D, E, F, marque="arcs2")
style(α, marque="arcs2")                 # même hachure → équivalence visuelle

# 6. Angle droit (carré au sommet)
γ = angle(A, V, B, marque="carre")       # remplace l'ancien angle_droit()

# 7. Construction depuis vecteurs ou segments
u = vecteur(O, A); v = vecteur(O, B)
α = angle(u, v)                          # triplet interne (A, O, B) calculé

# 8. Affichage de la mesure sur la figure (UX GeoGebra)
α = angle(B, A, C)
style(α, showLabel="mesure", unite="deg") # affiche "60°" à côté de l'arc

# 9. Réactivité au drag : drag A, B, ou C → α se met à jour →
#    mesure(α) recalculée → bissectrice(α) suit. Aucune intervention.

# 10. Angle polaire (renommé)
θ = angle_polaire(O, P)                  # = atan2(P.y - O.y, P.x - O.x)
```

---

## 6. Effort estimé révisé (Option E)

### 6.1 Effort net (création + migration)

| Sous-tâche                                                                                                                                            | Fichiers                                                                                                                |                                                LoC | Notes                                                                   |
| ----------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------: | ----------------------------------------------------------------------- |
| Renommer `GeoAngleMark` → `GeoAngle` + champs étendus                                                                                                 | `types/elements.ts`, `types/schemas.ts`                                                                                 |                                                ~30 | +`orientation`, `kind`, `marque` unifié, `showLabel`, `unite`           |
| Renommer `isAngleMark` → `isAngle`, `'angleMark'` → `'angle'` partout                                                                                 | 8 fichiers (cf. annexe v1)                                                                                              |                                                ~80 | grep + remplacement mécanique                                           |
| Renommer `createAngleMark` → `createAngle`                                                                                                            | `graph/figure.ts` (8 sites) + tests (24 sites)                                                                          |                                                ~40 | –                                                                       |
| Migrer 5 sites internes (`triangle_rectangle`, `rectangle`, `carre`)                                                                                  | `dsl/builtins.ts:4509, 4565, 4590`                                                                                      |                                                ~10 | `{rightAngle:true}` → `{marque:'carre'}`                                |
| Refondre `handleAngle` → retourne `GeoAngle` au lieu de scalaire                                                                                      | `dsl/builtins.ts:2853-2872`                                                                                             |                                                ~50 | Garde forme 2 args en `angle_polaire` séparé                            |
| **Supprimer** `handleAngleVecteurs`, `handleMarqueAngle`, `handleAngleDroit`                                                                          | `dsl/builtins.ts`                                                                                                       |                                               -120 | Suppression nette ; BUILTIN_NAMES mis à jour                            |
| Ajouter `handleAnglePolaire` (renommé)                                                                                                                | `dsl/builtins.ts`                                                                                                       |                                                +30 | Reprend logique de `angle(O,P)` actuelle                                |
| Surcharger `handleAngle` pour `angle(u,v)`, `angle(seg1,seg2)`, `angle(d1,d2)`                                                                        | `dsl/builtins.ts`                                                                                                       |                                                +80 | Construit triplet de points témoins invisibles via `createDilatedPoint` |
| Ajouter `handleSommet` étendu (déjà existe pour polygone — étendre à angle)                                                                           | `dsl/builtins.ts:3205`                                                                                                  |                                                +20 | `sommet(α)` retourne `vertexId`                                         |
| Ajouter `handleCote(α, i)` accesseur                                                                                                                  | `dsl/builtins.ts`                                                                                                       |                                                +25 | Nouveau builtin                                                         |
| Étendre `handleMesure` (accepte `GeoAngle`, gère `unite=`)                                                                                            | `dsl/builtins.ts:2706`                                                                                                  |                                                +40 | Lecture du scalaire dérivé + format unite                               |
| Surcharger `handleBissectrice` (accepte `GeoAngle`)                                                                                                   | `dsl/builtins.ts:4376`                                                                                                  |                                                +25 | Dispatch type guard                                                     |
| Surcharger `handleRotation` (accepte `GeoAngle` pour le paramètre angle)                                                                              | `dsl/builtins.ts:2329`                                                                                                  |                                                +15 | –                                                                       |
| Refacto rendu : `marque` unifiée (arc/carre/arcs2/arcs3), sweep `kind='rentrant'`, label `mesure`                                                     | `svg-primitives.ts`, `export-svg.ts`, `export-tikz.ts`, `export-typst.ts`, `GeometryCanvas.svelte`, `rough-geometry.ts` |                                               ~120 | 5 surfaces — `extendLineToViewport` × 3 piège connu                     |
| Branche `compute-position.ts` (calc baricentre arc pour `mesureScalarRef`)                                                                            | `graph/compute-position.ts:1159-1176`                                                                                   |                                                ~30 | –                                                                       |
| Tests : refondre `figure-angle-mark.test.ts` (265 LoC) → `figure-angle.test.ts`                                                                       | `graph/__tests__/figure-angle-mark.test.ts`                                                                             |                                               ~280 | renommage + adaptation `marque`                                         |
| Tests : nouveau `builtins-angle.test.ts` (créateurs + accesseurs + composition + 4 surcharges)                                                        | nouveau fichier                                                                                                         |                                               ~250 | –                                                                       |
| Tests : adapter `scalar-dsl.test.ts` (22 occurrences de `angle(`)                                                                                     | `dsl/__tests__/scalar-dsl.test.ts`                                                                                      |                                                ~80 | mesure(angle(...)) au lieu de angle(...) direct                         |
| Tests : adapter `serializer.test.ts` (7), `roundtrip.test.ts` (9), `vector-ops-dsl.test.ts` (5), `interpreter.test.ts` (2), `integration.test.ts` (3) | 5 fichiers                                                                                                              |                                               ~120 | mécanique                                                               |
| Migration scripts : `migrate-constructions-to-dsl.ts`, `convert-instrumenpoche.ts`, 2 converters                                                      | 4 fichiers                                                                                                              |                                                ~30 | émettre nouveau DSL                                                     |
| Migration demos : `triangles`, `vectors`, `measurements`, `intersections`                                                                             | 4 `+page.svelte`                                                                                                        |                                                ~25 | mécanique                                                               |
| Documentation utilisateur (DSL reference)                                                                                                             | `docs/ref/geometry/dsl-builtins.md`                                                                                     |                                                ~80 | section angle complète                                                  |
| CHANGELOG.md (breaking changes)                                                                                                                       | `CHANGELOG.md`                                                                                                          |                                                ~30 | –                                                                       |
| **TOTAL**                                                                                                                                             | **~25 fichiers**                                                                                                        | **~1 270 LoC** (dont **-120** suppressions nettes) |                                                                         |

### 6.2 Comparaison

| Option                  | v1 estimate |                            Migration sites |                           Migration tests | LoC nettes |
| ----------------------- | ----------: | -----------------------------------------: | ----------------------------------------: | ---------: |
| D (v1, backward compat) |        ~595 |                                          0 |                                         0 |       ~595 |
| **E (v2, breaking)**    |           – | **5 sites internes + 4 demos + 4 scripts** | **6 fichiers de tests (~38 occurrences)** | **~1 270** |
| A (v1)                  |        ~825 |                                          0 |                                  quelques |       ~825 |

**Surcoût E vs D** : ~675 LoC, dont :

- ~280 LoC de tests refondus (figure-angle-mark → figure-angle, scalar-dsl, etc.)
- ~80 LoC de mécanique de renommage `angleMark` → `angle`
- ~30 LoC pour la suppression des 3 builtins et leur réécriture
  (`angle(u,v)` au lieu de `angle_vecteurs(u,v)`)
- ~30 LoC documentation breaking changes / CHANGELOG

**Gain conceptuel** : un seul concept dans le DSL (« angle » = objet
géométrique avec mesure dérivée), zéro dualité annotation/objet, zéro
builtin redondant, alignement strict sur les conventions 2026-05-18.

---

## 7. Risques révisés

| Risque                                                                             | Probabilité  | Impact | Mitigation                                                                                                                                                                                                             |
| ---------------------------------------------------------------------------------- | :----------: | :----: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Casse de scripts utilisateur externes (figures partagées, exemples publiés)        |    élevée    | moyen  | Annoncer la migration dans CHANGELOG ; fournir un script de **migration automatique** (regex `marque_angle\(` → `angle(`, `angle_droit\(` → `angle(... marque="carre")`, `angle_vecteurs\(` → `mesure(angle(...))`)    |
| Régression sur chorégraphies `constructions-v2` (notamment `bissectrice @euclide`) |   moyenne    | élevé  | Test manuel des chorégraphies existantes ; le converter v1 (`constructions-v2/converter.ts:455`) émet `angle_droit` — adapter le générateur. Aucune chorégraphie ne consomme `GeoAngleMark` directement (vérifié grep) |
| Tests à refondre (38 occurrences réparties sur 6 fichiers)                         |   certaine   | faible | Mécanique : grep + remplacement guidé                                                                                                                                                                                  |
| Migration des 5 sites internes (`triangle_rectangle`, `rectangle`, `carre`)        |   certaine   | faible | 3 lignes à changer, tests `triangle_rectangle.test.ts` à re-checker                                                                                                                                                    |
| Sémantique surchargée (annotation + objet dans même type)                          | **éliminée** |   –    | Une seule sémantique : `GeoAngle` = objet géométrique avec rendu, point.                                                                                                                                               |
| Divergence rendu entre 4 surfaces sur sweep `rentrant` ou nouvelle marque          |   moyenne    | moyen  | Implémenter en parallèle + tests par surface ; `extendLineToViewport` triplé reste un piège                                                                                                                            |
| Cas `bissectrice(α)` avec α plat → `DslRuntimeError`                               |    faible    | faible | Déjà géré dans `handleBissectrice:4403`                                                                                                                                                                                |
| Réactivité du scalaire dérivé `mesure(α)` après mutation drag                      |    faible    | moyen  | Suivre pattern `dependsOn=[p1,v,p2]` strict ; tests drag                                                                                                                                                               |
| Cas `angle_polaire` perdu / pas adopté par les utilisateurs                        |   moyenne    | faible | Documenter clairement ; alternative `mesure(vecteur(O,P))` à creuser                                                                                                                                                   |
| Coût pédagogique : élèves désorientés par le changement                            |    faible    | faible | C'est un module backend ; les supports pédagogiques sont contrôlés par l'enseignant — il met à jour ses scripts une fois                                                                                               |

### 7.1 Quantification du grep d'impact

| Pattern                               | Occurrences |                                         Fichiers | Action                                                                    |
| ------------------------------------- | ----------: | -----------------------------------------------: | ------------------------------------------------------------------------- |
| `marque_angle(`                       |         ~25 | 12 (3 dans `dsl/`, 6 dans tests, 1 demo, 2 docs) | suppression + remplacement par `angle(... marque="...")`                  |
| `angle_droit(`                        |         ~20 |         9 (3 dans `dsl/`, 4 dans tests, 2 demos) | suppression + remplacement par `angle(... marque="carre")`                |
| `angle_vecteurs(`                     |         ~24 | 11 (3 dans `dsl/`, 5 dans tests, 1 demo, 2 docs) | suppression + remplacement par `mesure(angle(u,v))`                       |
| `angle(` (tout)                       |         ~70 |                                               11 | 22 occurrences dans `scalar-dsl.test.ts` à migrer en `mesure(angle(...))` |
| `angleMark`/`AngleMark`/`'angleMark'` |         ~80 |                                               19 | renommage mécanique                                                       |
| `createAngleMark(`                    |         ~50 |                 13 (dont 5 internes builtins.ts) | rename + signature étendue                                                |

**Total fichiers touchés** : **~25 fichiers source + 6 fichiers de tests
= ~31 fichiers**, dont la moitié sont des renommages mécaniques.

---

## 8. Plan phasé V1 / V2 / V3 (révisé)

### V1 — fondations + breaking changes (1 commit suffisamment gros)

- Renommage `GeoAngleMark` → `GeoAngle`, type guard, schemas, 4 exporters.
- Suppression `marque_angle()`, `angle_droit()`, `angle_vecteurs()`.
- Renommage `angle(O,P)` → `angle_polaire(O,P)`.
- Refondre `angle(A,V,B)` → retourne `GeoAngle` (objet visible avec arc).
- Accesseurs : `mesure(α)`, `sommet(α)`, `cote(α, i)`.
- Surcharges : `bissectrice(α)`, `rotation(P, α, centre=...)`.
- Migration 5 sites internes + 4 demos + 4 scripts converters.
- Refonte tests (38 occurrences sur 6 fichiers + nouveau
  `builtins-angle.test.ts`).
- CHANGELOG + doc utilisateur + script de migration automatique optionnel.

**Critère de done** : 0 régression sur les 1509 tests existants (après
migration mécanique des occurrences), nouveaux tests verts, baseline
svelte-check ~9 errors / 46 warnings préservée.

### V2 — surcharges complètes

- `angle(u, v)`, `angle(seg1, seg2)`, `angle(d1, d2)` (triplet de points
  témoins internes).
- `showLabel='mesure'` rendu : positionnement automatique label au
  bissecteur, `formatAngleLabel` partagé entre 4 surfaces.
- `arcRadiusPx` / `arcSpacingPx` paramétrables.
- Chorégraphie `bissectrice @euclide` adaptée pour partir d'un `GeoAngle`.

### V3 — futur

- **Report d'angle au compas** (`transporte(α, V', direction)`) +
  chorégraphie `@euclide` dédiée.
- Marquage `fill` du secteur (façon Cabri).
- Refactor des 3 rendus dupliqués (`angleToSVG` / TikZ / Typst) en
  helper unique abstrait (en même temps que `extendLineToViewport`).

---

## 9. Questions ouvertes pour le PO (révisées)

1. **`angle_polaire(O,P)` : à conserver, renommer en
   `angle_polaire`, ou supprimer pur ?** L'alternative « supprimé pur »
   force l'utilisateur à écrire `mesure(vecteur(O,P))` (en étendant
   `mesure` aux vecteurs — voir Q5), ce qui est très propre mais casse
   un usage fréquent du DSL (22 occurrences dans `scalar-dsl.test.ts`).
   **Recommandation : renommer en `angle_polaire`** pour un compromis.
2. **`angle` visible par défaut avec arc, ou invisible (= ancien
   `angle()` scalaire) ?** v2 recommande **visible** par cohérence avec
   `cercle`, `segment`, etc. L'utilisateur peut `masque(α)` ou
   `style(α, marque="aucune")`. Confirmer ?
3. **`marque` unifié (`'arc'|'arcs2'|'arcs3'|'carre'|'aucune'`) vs garder
   `arcs: 1|2|3` séparé de `marque: 'arc'|'carre'`?** v2 recommande
   l'unifier (plus simple à apprendre), mais le séparé est plus
   composable. À trancher.
4. **Script de migration automatique** (regex find/replace) fourni avec
   la V1 ? Recommandation : oui, c'est peu cher (~50 LoC) et ça aide
   les utilisateurs externes (chorégraphies sauvegardées dans la base).
5. **`mesure(u)` pour un vecteur = `norme(u)` ou `angle_polaire` de
   `u` ?** Si on garde `norme` distinct, alors `mesure` n'est pas
   étendu aux vecteurs et `angle_polaire(O,P)` reste nécessaire.
   **Recommandation : ne pas étendre `mesure`** (garder `norme(u)` ;
   `mesure` reste pour les objets dont la « mesure principale » est
   évidente : angle, segment, polygone-périmètre).
6. **Faut-il un `kind='rentrant'` exposé en V1 ou différer en V2 ?**
   v1 le mettait en V1 ; v2 peut le garder (1 sweep flag par surface,
   ~30 LoC), mais ce n'est pas la priorité scolaire. À trancher.
7. **Faut-il que `α` accepte une syntaxe `angle(A, V, B, mesure=60°)` qui
   _construit_ le point B à 60° de [VA]** ? Ce serait un raccourci pour
   « construire un angle de mesure donnée », très utile en pédagogie.
   Hors scope V1 — mais à noter pour V2.

---

## Annexe — référence v1

Toutes les sections suivantes de la v1 restent valides et ne sont pas
reprises ici :

- **§2** État actuel (rappel synthétique) — 3 briques co-existent.
- **§3** Valeur pédagogique d'un objet angle.
- **§5** Comparaison avec outils concurrents (GeoGebra, Cabri, CarMetal,
  Desmos, Sketchpad, Manim, Asymptote, TikZ, Sketchometry).
- **§7** Stratégie de rendu (réutiliser `angleMarkToSVG` renommé).
- **§8** Réactivité au drag (`dependsOn=[p1,vertex,p2]`).
- **§9** Cas dégénérés et invariants.
- **Annexe** Fichiers concernés (audit lignes 512-532 v1) — toujours
  valable, ajouter les fichiers de tests `scalar-dsl.test.ts`,
  `serializer.test.ts`, `roundtrip.test.ts`, `vector-ops-dsl.test.ts`,
  `interpreter.test.ts`, `integration.test.ts` et les 4 demos
  `geometry-demo/{triangles,vectors,measurements,intersections}`.

---

**Fin de l'étude v2.** Validation utilisateur requise avant
implémentation.
