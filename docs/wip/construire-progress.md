---
status: en cours
---

# Chantier « construire » — l'élève construit une collection ou une somme d'argent

## Reprendre ici

_Mis à jour le 2026-10-26, phase 0 validée._

- **État** : phase 0 validée (§ 4 bis) ; PR 1 (collection, § 5) écrite, tests verts, PR ouverte.
- **Prochaine action** : CI verte de #1812 → merge ; puis PR 2 (monnaie).
- **En attente de David** : rien.
- **Pièges en cours** : toute retouche de `scene-commune.ts` garde verts les tests de la collection ET de la monnaie (instantanés figés) ; aucune réponse d'élève enregistrée (ADR 0001) ; le chantier `geometrie-validation` va réécrire les QCM en cases « choix » : ne pas en dépendre.
- **Worktree / branche** : `../ubumaths-wt-construire` · `feat/construire`.

---

## 1. Origine

Issu du chantier « questions » (prochaine action après le lot M, go de David le 2026-10-26). Les
chantiers `collection` (décision 1) et `monnaie` (décision 7) avaient renvoyé ici le geste : l'élève
pose et retire des objets jusqu'à un nombre ou une somme, et le bloc compte pour **une case** lue
comme un nombre, jugée par le juge existant (même patron que la saisie de ` ```operation ` :
`case: N` posée par `assignBlankIndices`, `answer` descendu jusqu'au bloc, correction).

## 2. Points visés

| Point                        | Libellé (abrégé)                             | Aujourd'hui                                               | Avec « construire »                       |
| ---------------------------- | -------------------------------------------- | --------------------------------------------------------- | ----------------------------------------- |
| CP-002                       | Construire des collections de cardinal donné | aucun modèle                                              | **oui** : barres de dix et cubes          |
| CP-044                       | Constituer une somme donnée                  | en partie (QCM d'ensembles, « combien de pièces de 2 € ») | **oui** : pièces et billets               |
| CP-071                       | Rendre la monnaie                            | en partie (« combien rend-il ? », case)                   | **oui** : l'élève construit ce qu'il rend |
| CP-045                       | Simuler des achats en manipulant             | « Peut-il acheter ? » (QCM)                               | **oui** : il paie le prix                 |
| CE1-056/057/086, CE2-054/080 | centimes, achats, rendre par ajouts          | —                                                         | plus tard (centimes : lot CE1)            |

## 3. Comportements (phase 0)

**Nominal — collection.** Sous l'énoncé « Construis 34 avec des barres de dix et des cubes. », un
plan de travail vide et, dessous, une réserve : une barre de dix, un cube. Toucher la barre de la
réserve en pose une sur le plan ; toucher un objet posé l'enlève. Les barres se rangent à gauche, les
cubes en rangées de 5 + 5 à droite (comme `unités en: rangées`). Un bouton « Tout enlever ». **Aucun
total affiché** (il donnerait la réponse). À la validation : la valeur posée (3 barres + 4 cubes →
34, ou 34 cubes → 34) est la réponse de la case, jugée comme un nombre.

**Nominal — monnaie.** « Paie le ballon à 35 €. » : réserve des coupures permises par l'auteur
(défaut : 1, 2, 5, 10, 20, 50 €) ; même geste ; billets en haut, pièces dessous (`rangé`). Valeur
posée = réponse.

**Limites.** Plafonds de la v1 : collection 10 barres et 100 cubes (le bouton se grise au-delà) ;
monnaie 100 € et 30 objets (ceux du bloc). Plan vide → réponse vide (pas « 0 », sauf si l'auteur
attend 0 : à trancher, Q6). Groupement partiel (2 barres + 14 cubes = 34) : juste.

**Erreur.** Valeur fausse : au corrigé, la construction de l'élève reste affichée, avec sa valeur
écrite dessous (« Ta collection vaut 32. ») et, à côté, une construction juste (le moins d'objets :
`decomposeAmount` pour la monnaie, dizaines + unités pour la collection). Bloc mal écrit (coupure
inconnue, plafond dépassé, `construire:` sur un bloc à plusieurs ensembles) → message situé, comme
aujourd'hui.

**Ce qui ne change pas.** Rien n'est enregistré (verdict côté client, ADR 0001) : ni migration, ni
policy, **personne ne gagne ni ne perd d'accès**. Les blocs en affichage seul restent identiques
(instantanés figés).

## 4. Questions à David

- **Q1 — Geste** : toucher la réserve pour poser, toucher un objet pour l'enlever ? Ou glisser-déposer
  (lot 1 #1332) ? _Reco : toucher ; marche au doigt, à la souris et au clavier ; le glisser plus tard
  si les élèves le cherchent._
- **Q2 — Disposition** : objets rangés d'office sur le plan, ou posés où l'enfant veut ? _Reco :
  rangés ; l'enfant choisit combien, pas où, et la structure dizaines / unités se voit._
- **Q3 — Total** : jamais affiché pendant la construction ? _Reco : jamais (comme le nom accessible
  des blocs d'aujourd'hui)._
- **Q4 — Écriture** : une clé dans les blocs existants plutôt qu'un bloc neuf ?
  ` ```collection ` + `construire: barres` (ou `paquets`) ; ` ```monnaie ` + `construire: 1 2 5 10 20`
  (la réserve). _Reco : oui, une clé ; le reste de la syntaxe (`taille:`, `dessin:`) sert tel quel._
- **Q5 — Ce qui est jugé** : la valeur seule en v1 ? Les contraintes (« le moins de pièces possible »,
  « sans pièce de 1 € », « avec exactement 3 billets ») plus tard. _Reco : la valeur seule ; la
  réserve limitée (Q4) couvre déjà « sans pièce de 1 € »._
- **Q6 — Plan vide** : réponse vide (refusée comme une case vide), même si l'auteur attend 0 ? _Reco :
  vide = vide ; un modèle « construis 0 » n'a pas de sens au CP._
- **Q7 — Échange** : un geste « 10 cubes → 1 barre » (ou 5 × 2 € → 10 €) ? _Reco : pas en v1._
- **Q8 — Corrigé** : construction de l'élève + sa valeur + une construction juste à côté (§ 3) ?
  _Reco : oui._
- **Q9 — PDF** : cadre vide en pointillés (hauteur du bloc) avec la réserve dessinée en petit
  au-dessus (« Dessine… » reste dans l'énoncé) ? Ou bloc refusé au PDF ? _Reco : le cadre vide._
- **Q10 — Découpage** : PR 1 collection (socle commun du geste dans `scene-commune` / `SceneMarks`
  voisin), PR 2 monnaie, puis les modèles (CP-002, CP-044, CP-071, CP-045) au chantier « questions »,
  en brouillon jusqu'au `deploy:prod`. _Reco : oui ; revue Opus sur la PR 1 (correction des
  réponses)._

## 4 bis. Décisions (David, 2026-10-26 : « je suis tes recos »)

Q1 toucher (glisser plus tard) · Q2 objets rangés d'office · Q3 total jamais affiché · Q4 une clé dans
les blocs existants · Q5 valeur seule · Q6 plan vide = réponse vide · Q7 pas d'échange · Q8 corrigé :
construction de l'élève + sa valeur + une construction juste · Q9 PDF : cadre vide + réserve en petit ·
Q10 PR 1 collection, PR 2 monnaie, modèles au chantier « questions ».

## 5. PR 1 — conception (collection)

- **Écriture** (précision de Q4) : `construire: 34` donne la valeur à construire, `dessin: barres |
paquets` le matériel (clé existante). Le bloc porte sa réponse, comme ` ```operation ` : ni
  `expectedAnswer` ni `blanks[]` à écrire. Avec `construire:` : `dizaines:`, `unités:`, `unités en:`,
  `légendes:` refusées (pas d'ensemble de départ en v1) ; `taille:` gardée. Valeur de 1 à 100.
- **Case** : `case: N` posé par `assignBlankIndices` (premier niveau seulement), `InstanceBlank` de
  type `math`, `expectedAnswer` = la valeur, drapeau `construire: 'collection'` ; juge ordinaire.
- **Réponse** : la valeur posée en chiffres (`'34'`), `''` si le plan est vide. La composition (3 barres
  - 4 cubes) vit dans le composant, monté de la saisie au verdict ; remonté avec une seule valeur, il
    la redessine en dizaines et unités.
- **Écran** : plan de travail (scène de la collection, cubes en rangées), réserve dessous (« Ajouter
  une barre de dix », « Ajouter un cube », chacun avec son « Enlever » pour le clavier), « Tout
  enlever ». Toucher un objet du plan l'enlève. Sans case (aperçu du prof), le même geste, rien de jugé.
- **PDF** : cadre vide en pointillés, réserve dessinée en petit au-dessus.

## Journal

- 2026-10-26 : ouverture, worktree `construire`, phase 0 ; validée (« je suis tes recos »).
- 2026-10-26 : PR 1 — `construire:` dans ```collection (parseur, case du générateur, `CollectionConstruire.svelte`, PDF) ; tests rouges vérifiés puis verts ; capture d'écran relue.
- 2026-10-26 : revue Opus de #1812 — corrigés : bloc délimité comme le parseur (ligne vide + clé), bloc non fermé et `orderIndependent` refusés, test au décor de la prod. Laissé : ```operation a les mêmes angles morts (ligne vide, non fermé, ordre indifférent), à traiter à part.
