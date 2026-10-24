# Pages de démo et de debug : mise en cohérence

## Reprendre ici

_Mis à jour le 2026-10-24, avant toute PR._

- **État** : inventaire fait ; revue page par page en cours, lignes 1 à 12 tranchées (tableau ci-dessous).
- **Prochaine action** : poursuivre la revue au premier `?` du tableau « Revue page par page ».
- **En attente de David** : le sort des lignes 13 à 19. Rien n'est codé : le plan viendra à la fin de la revue.
- **Pièges en cours** : rien ne se supprime pour l'instant ; `/automaths/test`, `/api/tests/save`, `/api/test-mode` sont de vraies fonctionnalités, hors chantier.
- **Worktree / branche** : aucun (rien de codé) ; journal commité sur `main`.

## Décisions de David (2026-10-24)

1. **Pages de dev : admin seul.**
2. **Rangées dans un espace unique `/dev/…`** : groupe de routes avec sa propre garde, sans
   la coquille du tableau de bord (pages en plein écran). `/dashboard/admin/debug/*` y passe
   aussi. Anciennes adresses redirigées un temps.
3. **Une vitrine publique** (`/demo/…`), au contenu choisi page par page avec David.
4. **Aucune suppression pour l'instant**, sauf fusion de doublons demandée par David (lignes 7, 8).
5. **Contenu pédagogique = prof, jamais l'admin** (règle générale). D'où une 3ᵉ catégorie :
   **aide à l'écriture**, réservée au prof, dans un espace unique `/aide-ecriture/…` (pages pour
   essayer et apprendre à écrire scripts, blocs, figures). Exception : l'éditeur de constructions
   va à côté des constructions (`/constructions/essais`).

## Inventaire (2026-10-24)

Aucune de ces pages n'est reliée depuis le site, hors liens entre elles. Hors chantier : la
vitrine du Tour du Royaume.

### Déjà admin (`/dashboard/admin/…`)

`debug/database`, `debug/session`, `debug/rls`, `debug/api-docs`, `debug/avatar`,
`debug/wheel`, `debug/mathfield`, `debug/rich-text`, `debug/question-display`,
`debug/typst-preview`, `debug/latex-preview`, `debug/latex-transpiler`,
`debug/correction-mode-b` et `debug/question-preview-base-card` (absentes des onglets),
`errors/test` (hors de `debug/`).

### Publiques (cachées aux robots seulement)

`/test-cadres`, `/test-font`, `/test-erreur` (+ `[code]`, `plantage` en dev seul),
`/test-saisie` (prototype « jetable »), `/test-structure`, `/demo` (carrefour),
`/demo/theme-test`, `/demo/mots-cliquables`, `/demo/question-display-demo` et
`/demo/rich-text-editor-demo` (doublons d'`admin/debug`), `/demo/trig-circle-demo`,
`/demo/vip-cards-demo` (vide pour un anonyme), `/geometry-demo/*` (30 pages),
`/construction-demo` (« Sauvegarder » montré à l'élève → 403), `/slides/demo`,
`/slides/demo-embedded`, `/slides/test-transitions`, `/blockly/playground` (seul usage de Blockly).

### Tout connecté, élève compris

`/test-exercises` (« probablement morte » selon `utilitaires-et-demos.md`).

## Revue page par page

Sort : **vitrine** (`/demo/…`, public) · **aide** (`/aide-ecriture/…`, prof) · **dev** (`/dev/…`, admin) · **à revoir**.

| #   | Page                            | Sort                    | Note                                                                                                                                                                                                                                                                                                                                                                                     |
| --- | ------------------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `/test-structure`               | vitrine + dev           | coupée en deux : formule (`StructureField`) → `/demo/structure` ; corpus et case « AB produit » → `/dev/structure`                                                                                                                                                                                                                                                                       |
| 2   | `/geometry-demo/*`              | aide + vitrine          | tout → `/aide-ecriture/geometrie/…` tel quel ; galerie `/demo/geometrie` : 10 figures validées (ci-dessous), textes en français propre, script replié par défaut                                                                                                                                                                                                                         |
| 3   | `/demo/trig-circle-demo`        | aide + vitrine          | catalogue complet → `/aide-ecriture/cercle-trigo` ; `/demo/cercle-trigo` : 4 exemples sans le texte du bloc (mode interactif, π/6 avec projections et tableau, cos x = 1/2, cos x > 1/2)                                                                                                                                                                                                 |
| 4   | `/construction-demo`            | aide + vitrine          | éditeur → `/constructions/essais`, prof seul ; API `construction-demo-scripts` prof seul = retrait d'accès admin, PR à part après le chantier constructions ; `/demo/constructions` : lecteur seul, 2-3 constructions écrites dans le code ; doublon scripts de démo / brouillons noté pour plus tard                                                                                    |
| 5   | `/demo/vip-cards-demo`          | vitrine + dev           | `/demo/cartes` : 4 cartes (une par rareté) écrites dans le code, lisibles sans compte (vérifier où sont les images, `image_path`) ; `/examples` et le catalogue lu en base → `/dev/cartes`                                                                                                                                                                                               |
| 6   | `/demo/mots-cliquables`         | dev + vitrine           | page de test telle quelle → `/dev/mots-cliquables` ; `/demo/lexique` : mots cliquables et sélecteur de niveau (bloc 3 : la définition suit l'élève), sans les consignes de test                                                                                                                                                                                                          |
| 7   | `/demo/question-display-demo`   | dev (fusion) + vitrine  | fusion avec `admin/debug/question-display` → `/dev/carte-question` (page admin + 4 questions d'exemple) ; `/demo/questions` : une série de 3-4 questions sous ses 5 formes en onglets (en classe, entraînement, flash-cards, course aux nombres, révisions espacées — simulée si elle exige la base), une phrase « qui, quand » par forme, lien vers `/automaths`                        |
| 8   | `/demo/rich-text-editor-demo`   | dev (fusion) + vitrine  | fusion avec `admin/debug/rich-text` → `/dev/editeur-riche` (page admin + mode messagerie) ; `/demo/editeur` : le visiteur écrit une phrase avec formule, vue dans 3 usages réels (message au prof, cahier de texte, énoncé d'exercice), une phrase « qui écrit, qui lit » par usage, sans « Technologies »                                                                               |
| 9   | `/demo/theme-test`              | dev                     | → `/dev/theme` telle quelle ; rien en vitrine                                                                                                                                                                                                                                                                                                                                            |
| 10  | `/demo` (carrefour)             | vitrine (accueil) + dev | champ MathLive, carte retournable, logger, toasts → `/dev/bancs-essai` ; `/demo` = accueil de la vitrine : les 8 pages vitrine rangées par public, + liens vers Automaths, Atelier, jeux ; `/demo/…` ouvert aux robots et ajouté au sitemap (`/dev`, `/aide-ecriture` fermés) ; lien « Voir ce que fait Chiphre » dans les vues `/professeurs`, `/parents`, `/eleves` et le pied de page |
| 11  | `/test-saisie`                  | dev                     | → `/dev/saisie-naturelle` telle quelle (panneau « sous le capot ») ; rien en vitrine (lien Atelier depuis `/demo`) ; candidate à la suppression plus tard                                                                                                                                                                                                                                |
| 12  | `/test-cadres`                  | dev                     | → `/dev/cadres` telle quelle (banc de contrôle à chaque mise à jour de MathLive) ; rien en vitrine                                                                                                                                                                                                                                                                                       |
| 13  | `/test-font`                    | ?                       |                                                                                                                                                                                                                                                                                                                                                                                          |
| 14  | `/test-erreur`                  | ?                       |                                                                                                                                                                                                                                                                                                                                                                                          |
| 15  | `/slides/*` (3 pages)           | ?                       |                                                                                                                                                                                                                                                                                                                                                                                          |
| 16  | `/blockly/playground`           | ?                       |                                                                                                                                                                                                                                                                                                                                                                                          |
| 17  | `/test-exercises`               | ?                       |                                                                                                                                                                                                                                                                                                                                                                                          |
| 18  | `/dashboard/admin/debug/*` (14) | ?                       |                                                                                                                                                                                                                                                                                                                                                                                          |
| 19  | `/dashboard/admin/errors/test`  | ?                       |                                                                                                                                                                                                                                                                                                                                                                                          |

### Galerie de géométrie `/demo/geometrie` (validée par David le 2026-10-24)

Chaque figure : titre et texte de 2-3 lignes en français propre, pour le visiteur ; script
replié sous « Voir le script ».

| #   | Figure                                             | Source (`/geometry-demo/…`) | Niveau  |
| --- | -------------------------------------------------- | --------------------------- | ------- |
| 1   | Points remarquables du triangle                    | `triangles`                 | collège |
| 2   | Symétries et rotation                              | `transformations` (2ᵉ)      | collège |
| 3   | Homothétie variable                                | `sliders/homothetie`        | collège |
| 4   | Cercle par trois points                            | `circles` (1ʳᵉ)             | collège |
| 5   | Intégrale dynamique                                | `sliders/integrale`         | lycée   |
| 6   | Aire entre deux courbes                            | `sliders/aire-entre`        | lycée   |
| 7   | Lieu géométrique (milieu d'un point sur un cercle) | `lieu` (2ᵉ)                 | lycée   |
| 8   | Flocon de Von Koch                                 | `sliders/koch`              | plaisir |
| 9   | Épicycloïde                                        | `sliders/epicycloide`       | plaisir |
| 10  | Spirale d'Archimède                                | `trace` (2ᵉ)                | plaisir |

Écartées : spirographe, rosace, limaçon (doublons de l'épicycloïde), coniques (hors programme),
vecteurs (textes à réécrire en entier), le reste = référence du langage.

## Hors chantier, à faire plus tard (noté le 2026-10-24)

- **Catalogue des cartes VIP géré par l'admin** (`/dashboard/admin/vip-cards`, `api/admin/vip-cards/`) :
  ce sont des privilèges de classe, donc du ressort du prof (règle 5). David : « on le fera plus tard ».
- **Lexique (dictionnaire) géré par l'admin** (`/dashboard/admin/dictionnaire`, `requireAdmin`,
  `api/admin/dictionnaire/`) : contenu pédagogique, donc du ressort du prof (règle 5).
- **`/test-saisie`** : prototype jetable dont le travail est fait (#1355) ; candidate à la
  suppression, à trancher par David.
- **Scripts de démo de constructions / brouillons de `/constructions`** : doublon possible, à revoir
  après la revue (aucune suppression pour l'instant).
