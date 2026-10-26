---
status: en cours
---

# Chantier « construire » — l'élève construit une collection ou une somme d'argent

## Reprendre ici

_Mis à jour le 2026-10-26, après #1825._

- **État** : PR 1 collection (#1812), PR 2 monnaie (#1820) et PR 3 copie corrigée (#1825 : plan verrouillé avec la construction de l'élève, sa valeur, une construction juste ; verso : construction juste) mergées, pas en prod ; vérifiées dans l'appli locale (admin@local.test, `/dashboard/admin/questions/<id>/preview`). Le code du chantier est complet.
- **Prochaine action** : modèles CP-002, CP-044, CP-071, CP-045 au chantier « questions » (brouillons jusqu'au `deploy:prod`) ; puis fin de chantier = versement (§ 3-6 → `docs/systeme/`, journal archivé), quand David le dit.
- **En attente de David** : vérifications manuelles #1812, #1820, #1825 (tablette, PDF) ; go pour clore le chantier ou y garder les modèles ; idée possible : garder la composition posée (pas seulement la valeur) pour que la copie montre les vrais gestes de l'élève.
- **Pièges en cours** : ```operation garde ses angles morts (à traiter à part) ; `vercel-maintenance` instable en CI (SIGPIPE 141) ; un worktree doit avoir `.env` ET `.env.local` (sinon base distante) ; 3 brouillons « VERIF construire … (local) » en base locale.
- **Worktree / branche** : aucun (retiré après #1825).

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

## 6. PR 2 — conception (monnaie)

- **Écriture** (même précision de Q4 que la PR 1) : `construire: 35` donne la somme à construire
  (1 à 100 €), `réserve: 1 2 5 10 20` les coupures permises (défaut : 1, 2, 5, 10, 20, 50 €, une
  fois chacune, coupures existantes seulement). Avec `construire:` : `billets:`, `pièces:`,
  `montant:`, `légendes:`, `disposition:` refusées (plan vide, rangé d'office) ; `taille:` gardée ;
  `réserve:` sans `construire:` refusée.
- **Bloc impossible** : somme qu'on ne peut pas faire avec la réserve en 30 objets au plus
  (`réserve: 2 5` + `construire: 1`, `réserve: 1` + `construire: 35`) → erreur située.
- **Case** : celle de la PR 1, généralisée (`construire: 'collection' | 'monnaie'`).
- **Réponse** : la somme posée en chiffres (`'35'`), `''` si le plan est vide. Remonté avec une seule
  valeur, le plan la redessine « le moins d'objets » avec la réserve.
- **Écran** : plan (scène de la monnaie, `rangé` : billets en haut, pièces dessous), réserve dessous
  (« Ajouter un billet de 10 € », « Ajouter une pièce de 2 € », chacun avec son « Enlever »),
  « Tout enlever ». Bouton grisé si l'ajout passe 100 € ou 30 objets. Correction : « Tu as posé
  32 €. » + une construction juste (le moins d'objets AVEC la réserve, pas l'algorithme glouton :
  `réserve: 2 5`, 6 € = 3 × 2 €).
- **PDF** : cadre vide en pointillés, réserve dessinée en petit au-dessus.

## Journal

- 2026-10-26 : ouverture, worktree `construire`, phase 0 ; validée (« je suis tes recos »).
- 2026-10-26 : PR 1 — `construire:` dans ```collection (parseur, case du générateur, `CollectionConstruire.svelte`, PDF) ; tests rouges vérifiés puis verts ; capture d'écran relue.
- 2026-10-26 : revue Opus de #1812 — corrigés : bloc délimité comme le parseur (ligne vide + clé), bloc non fermé et `orderIndependent` refusés, test au décor de la prod. Laissé : ```operation a les mêmes angles morts (ligne vide, non fermé, ordre indifférent), à traiter à part.
- 2026-10-26 : PR 2 — `construire:` + `réserve:` dans ```monnaie (parseur, case généralisée `construire: 'collection' | 'monnaie'`, `MonnaieConstruire.svelte`, `MonnaieObjets.svelte` extrait, PDF) ; tests unitaires et générateur vérifiés rouges puis verts ; tests d'écran écrits avec le composant ; capture relue.
- 2026-10-26 : revue Opus de la PR 2 — corrigés : case dont le bloc n'est pas lu à l'écran (fence de fin en retrait, bloc dans un bloc de code) refusée au générateur, pour les deux blocs ; `construire:`, `réserve:`, `case:` retirées du repérage des blocs non fermés (un paragraphe « Construire… » était avalé) et `case` de la liste des clés affichée ; test du parent lié (`bind:values`, harnais `FillBlanksBoundHarness.svelte`) qui garde la construction de l'élève. Tous vérifiés rouges sans le correctif.
- 2026-10-26 : vérification locale (admin@local.test, `/dashboard/admin/questions/<id>/preview`) : jeu et jugement justes, mais la carte de correction rejouait le bloc (plan vide, réserve active). Correctif (PR 3) : ligne `build` du résultat attendu, `BuildAnswer.svelte` (plan verrouillé sans réserve, construction de l'élève, sa valeur, construction juste ; verso : construction juste seule), consigne seule au-dessus ; tests vérifiés rouges sans le correctif ; revérifié dans l'appli. Limite : seule la valeur est gardée, la construction de l'élève est redessinée « le moins d'objets ».
- 2026-10-26 : revue Opus de la PR 3 : rien de bloquant ; corrigés : case à construire vide → « Tu n'as rien posé. » (propre à la case, pas « rien répondu » quand une autre case a sa réponse), plan après l'énoncé rempli, test du cas mêlé renforcé.
