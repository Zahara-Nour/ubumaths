# Pages de démo et de debug : mise en cohérence

## Reprendre ici

_Mis à jour le 2026-10-25, après #1756 et #1757._

- **État** : phases 1 à 8 mergées (#1750) ; retrait de l'admin sur les scripts de démo mergé (#1756 : API `DEMO_SCRIPT_AUTHOR_ROLES = ['teacher']`, RLS `is_teacher()`, transfert des 5 scripts de l'admin au prof ; #1757 : migration renommée `20261026120000`, l'horodatage `20261026020000` étant déjà pris en prod par `questions_cp_a6`). Rien en prod côté code avant le prochain `deploy:prod`.
- **Prochaine action** : `pnpm db:migrate` (bloqué par le classifieur, **à lancer par David** : `! pnpm db:migrate`), puis vérifier en prod : les 5 scripts au prof, policy « Teacher can CRUD own demo scripts ». Avant le migrate, mesuré : 5 scripts à l'admin, 0 au prof. Ensuite fin de chantier = versement.
- **Hors chantier, décidé par David le 2026-10-25** : cahier de texte → ubumark, **futur chantier `cahier-ubumark`** ; énigmes (HTML lu comme markdown) à mesurer ; bug FSRS → **chantier `fsrs`** ; `z` ≈ `2` → PR à part dans `tools/chiphre-math/`, en dernier.
- **Tranché par David** : `/aide-ecriture/geometrie` reste fermée à l'admin (403), le 2026-10-24.
- **Signalé à David, hors chantier** : `angle_polaire` rend des degrés même en mode radians (`dsl-builtins.md` dit « radians ») → `geometry-expert`, plus tard. Images des 4 cartes Mathémo à vérifier.
- **Pièges en cours** : nouvelle vitrine → une entrée dans `DEMO_PAGES` + `<SeoHead {...demoSeo(…)} />` (le test l'exige) ; sous `/dev`, ni `+layout@` ni donnée sensible par un load universel ; dans `<main>`, `h2`/`p`/`li` ont une taille `!important` × `--font-scale` ; `wrapDynamicImport` dans la sortie des tests client = bruit, déjà sur `main` ; 1er test de `page-demo-lexique` lent à froid en CI (1 échec, vert à la relance).
- **Worktree / branche** : aucun (celui de la phase 8 est supprimé) ; la PR suivante partira d'un nouveau worktree depuis `origin/main`. Serveurs de test : 5176 = simplify-carte, 5179 = operations-posees.

## Décisions de David (2026-10-24)

1. **Pages de dev : admin seul.**
2. **Rangées dans un espace unique `/dev/…`** : groupe de routes avec sa propre garde, sans
   la coquille du tableau de bord (pages en plein écran). `/dashboard/admin/debug/*` y passe
   aussi. Anciennes adresses redirigées un temps.
3. **Une vitrine publique** (`/demo/…`), au contenu choisi page par page avec David.
4. **Aucune suppression pour l'instant**, sauf fusion de doublons demandée par David (lignes 7, 8, 15) et `/test-exercises` (ligne 17).
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

| #   | Page                            | Sort                    | Note                                                                                                                                                                                                                                                                                                                                                                                      |
| --- | ------------------------------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `/test-structure`               | vitrine + dev           | coupée en deux : formule (`StructureField`) → `/demo/structure` ; corpus et case « AB produit » → `/dev/structure`                                                                                                                                                                                                                                                                        |
| 2   | `/geometry-demo/*`              | aide + vitrine          | tout → `/aide-ecriture/geometrie/…` tel quel ; galerie `/demo/geometrie` : 10 figures validées (ci-dessous), textes en français propre, script replié par défaut                                                                                                                                                                                                                          |
| 3   | `/demo/trig-circle-demo`        | aide + vitrine          | catalogue complet → `/aide-ecriture/cercle-trigo` ; `/demo/cercle-trigo` : 4 exemples sans le texte du bloc (mode interactif, π/6 avec projections et tableau, cos x = 1/2, cos x > 1/2)                                                                                                                                                                                                  |
| 4   | `/construction-demo`            | aide + vitrine          | éditeur → `/constructions/essais`, prof seul ; API `construction-demo-scripts` prof seul = retrait d'accès admin, PR à part après le chantier constructions ; `/demo/constructions` : lecteur seul, 2-3 constructions écrites dans le code ; doublon scripts de démo / brouillons noté pour plus tard                                                                                     |
| 5   | `/demo/vip-cards-demo`          | vitrine + dev           | `/demo/cartes` : 4 cartes (une par rareté) écrites dans le code, lisibles sans compte (vérifier où sont les images, `image_path`) ; `/examples` et le catalogue lu en base → `/dev/cartes`                                                                                                                                                                                                |
| 6   | `/demo/mots-cliquables`         | dev + vitrine           | page de test telle quelle → `/dev/mots-cliquables` ; `/demo/lexique` : mots cliquables et sélecteur de niveau (bloc 3 : la définition suit l'élève), sans les consignes de test                                                                                                                                                                                                           |
| 7   | `/demo/question-display-demo`   | dev (fusion) + vitrine  | fusion avec `admin/debug/question-display` → `/dev/carte-question` (page admin + 4 questions d'exemple) ; `/demo/questions` : une série de 3-4 questions sous ses 5 formes en onglets (en classe, entraînement, flash-cards, course aux nombres, révisions espacées — simulée si elle exige la base), une phrase « qui, quand » par forme, lien vers `/automaths`                         |
| 8   | `/demo/rich-text-editor-demo`   | dev (fusion) + vitrine  | fusion avec `admin/debug/rich-text` → `/dev/editeur-riche` (page admin + mode messagerie) ; `/demo/editeur` : le visiteur écrit une phrase avec formule, vue dans 3 usages réels (message au prof, cahier de texte, énoncé d'exercice), une phrase « qui écrit, qui lit » par usage, sans « Technologies »                                                                                |
| 9   | `/demo/theme-test`              | dev                     | → `/dev/theme` telle quelle ; rien en vitrine                                                                                                                                                                                                                                                                                                                                             |
| 10  | `/demo` (carrefour)             | vitrine (accueil) + dev | champ MathLive, carte retournable, logger, toasts → `/dev/bancs-essai` ; `/demo` = accueil de la vitrine : les 10 pages vitrine rangées par public, + liens vers Automaths, Atelier, jeux ; `/demo/…` ouvert aux robots et ajouté au sitemap (`/dev`, `/aide-ecriture` fermés) ; lien « Voir ce que fait Chiphre » dans les vues `/professeurs`, `/parents`, `/eleves` et le pied de page |
| 11  | `/test-saisie`                  | dev                     | → `/dev/saisie-naturelle` telle quelle (panneau « sous le capot ») ; rien en vitrine (lien Atelier depuis `/demo`) ; candidate à la suppression plus tard                                                                                                                                                                                                                                 |
| 12  | `/test-cadres`                  | dev                     | → `/dev/cadres` telle quelle (banc de contrôle à chaque mise à jour de MathLive) ; rien en vitrine                                                                                                                                                                                                                                                                                        |
| 13  | `/test-font`                    | dev + vitrine           | → `/dev/polices`, contenu INTACT (rien de « KaTeX » renommé), ancienne adresse redirigée ; vitrine : `/demo/corriges`, extrait de corrigé PDF en écriture manuscrite (Shantell), en image fixe                                                                                                                                                                                            |
| 14  | `/test-erreur`                  | dev                     | → `/dev/erreurs/page` telle quelle, avec `[code]` et `plantage` ; rien en vitrine (le clin d'œil de π se découvre par hasard) ; voisine de la ligne 19 (`/dev/erreurs/surveillance`)                                                                                                                                                                                                      |
| 15  | `/slides/*` (3 pages)           | dev (fusion) + vitrine  | fusion des 3 → `/dev/diaporama` (bascule plein écran / dans un cadre, taille réglable, section transitions) ; vitrine `/demo/diaporama` : diaporama qui se présente lui-même, façon démo reveal.js + atouts Chiphre (plan ci-dessous)                                                                                                                                                     |
| 16  | `/blockly/playground`           | dev                     | → `/dev/blockly` tel quel ; rien en vitrine (fonctionnalité pas encore ouverte aux élèves) ; deviendra une vraie fonctionnalité plus tard (David)                                                                                                                                                                                                                                         |
| 17  | `/test-exercises`               | **supprimée** (David)   | avec ses orphelins : `ExerciseMarkdownEditor.svelte`, `exercises/services/image-markdown-editor.ts` + son test. GARDER `ExerciseMarkdownPreview` (sert à `LaTeXImportDialog` → `ExerciseForm`), `ImageAttributePanel`, `image-upload.ts`, `MarkdownEditor`. Re-greper avant de supprimer                                                                                                  |
| 18  | `/dashboard/admin/debug/*` (14) | dev (13) + admin (1)    | → `/dev/` : `session`, `rls`, `api`, `avatar`, `roue`, `champ-math`, `apercu-question`, `correction-generee`, `pdf-typst`, `pdf-latex`, `latex-vers-ubumark` ; `question-display` et `rich-text` fusionnées (lignes 7, 8) ; `database` RESTE dans l'admin, renommée « Intégrité des données » ; lien « Debug » du menu admin → accueil de `/dev` (liste de toutes les pages de dev)       |
| 19  | `/dashboard/admin/errors/test`  | dev                     | → `/dev/erreurs/surveillance`, voisine de `/dev/erreurs/page` (ligne 14), ancienne adresse redirigée ; textes traduits en français (UI en anglais aujourd'hui) ; `surveillance-des-erreurs.md` (ligne 108) mise à jour dans la même PR ; rien en vitrine                                                                                                                                  |

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

### Diaporama `/demo/diaporama` (validé par David le 2026-10-24)

1 titre et comment avancer · 2 pile verticale · 3 fragments · 4 transitions · 5 animation
automatique ($(x+1)^2$ développé pas à pas) · **propre à Chiphre** : 6 formules en ubumark ·
7 bloc `trig` (cos x = 1/2) · 8 figure de géométrie manipulable · 9 question projetée avec chrono
(forme « En classe ») · 10 annoter par-dessus · 11 tableau blanc · 12 fin, liens `/demo` et Atelier.
À vérifier avant de coder : `trig` et figures dans une diapositive ubumark, question sans compte ;
si l'une ne marche pas, le dire à David plutôt que contourner.

## Plan en phases (validé par David le 2026-10-24)

Une PR = une session. Ancienne adresse → redirection 301 vers la nouvelle (« un temps »).

1. **Socle** : groupe `/dev` (garde admin, plein écran, accueil = liste des pages de dev),
   groupe `/aide-ecriture` (garde prof, accueil = liste), mécanisme de redirections, robots
   (`/dev`, `/aide-ecriture` fermés). Aucune page déplacée. Revue : `code-reviewer` + `security-auditor`.
2. **Déplacements « telles quelles » vers `/dev`** : lignes 9, 11, 12, 13, 14, 16, 18 (hors 7, 8),
   19 (+ traduction) ; lien « Debug » du menu admin → `/dev` ; `database` → « Intégrité des données ».
3. **Fusions et parts dev** : lignes 7, 8, 15 (fusions) ; parts dev des lignes 1, 5, 6, 10.
4. **Aide à l'écriture** : ligne 2 (`/geometry-demo/*`, 30 pages), ligne 3 (catalogue trigo).
5. **Suppression ligne 17** (re-greper les orphelins avant).
6. **Vitrine, une PR par page** : structure, cercle-trigo, cartes, lexique, corrigés, géométrie,
   questions, éditeur, diaporama.
7. **Accueil `/demo`** + robots/sitemap ouverts sur `/demo/…` + liens depuis `/professeurs`,
   `/parents`, `/eleves` et le pied de page.
8. **Ligne 4 (constructions)**, après les merges du chantier constructions : `/constructions/essais`,
   `/demo/constructions` ; puis PR à part du retrait d'accès admin sur `construction-demo-scripts`.

## PR 1 — socle (phase 0 validée par David le 2026-10-24)

- **Garde dans le hook** (choix de David, reco) : `src/lib/server/reservedAreasHandle.ts`, après
  `adminElevationHandle`, par identifiant de route (`/(protected)/dev…`, `/(protected)/aide-ecriture…`).
- `/dev` : admin ou prof élevé → passe ; prof non élevé → `/dashboard/elevate?redirect=…` (lecture),
  403 (écriture) ; élève → 403 ; visiteur → `/auth/login` (lecture), 401 (écriture).
- `/aide-ecriture` : prof (élevé ou non) → passe ; vrai compte admin → 403 ; élève → 403 ; visiteur → connexion.
- Trouvé en route : `adminElevationHandle` ne lisait le cookie que sous `/dashboard/admin` et
  `/api/admin` → un prof élevé aurait été refusé sur `/dev`. Étendu à `/dev` (test rouge d'abord).
  `safeRedirect` de l'écran d'élévation sorti en `src/lib/server/elevation-redirect.ts`, admet `/dev`.
- Vérifié sur le serveur local (5176), comptes `student`, `teacher`, `teacher` élevé, `admin` : conforme.
- Revues : `code-reviewer` (rien de bloquant), `security-auditor` (rien de bloquant ; un Moyen
  corrigé) : en **navigation côté client**, sans nœud serveur propre, `__data.json` n'était pas
  demandé, le hook ne tournait pas → un élève voyait `/dev` (constaté rouge avec Playwright). Ajout
  d'un `+layout.server.ts` par espace (`checkReservedArea`), vert ensuite pour les 4 comptes.
  Aussi : retour d'élévation refuse `.`/`..` (encodés compris) et `\` ; robots `/dev$` + `/dev/`.
  Laissé : `adminElevationHandle` filtre sur le chemin brut (`/%64ev` → élévation non lue : échec fermé).

## Hors chantier, à faire plus tard (noté le 2026-10-24)

- **Catalogue des cartes VIP géré par l'admin** (`/dashboard/admin/vip-cards`, `api/admin/vip-cards/`) :
  ce sont des privilèges de classe, donc du ressort du prof (règle 5). David : « on le fera plus tard ».
- **Lexique (dictionnaire) géré par l'admin** (`/dashboard/admin/dictionnaire`, `requireAdmin`,
  `api/admin/dictionnaire/`) : contenu pédagogique, donc du ressort du prof (règle 5).
- **`/test-saisie`** : prototype jetable dont le travail est fait (#1355) ; candidate à la
  suppression, à trancher par David.
- **Blockly → vraie fonctionnalité** (décidé par David le 2026-10-24) : algorithmique par blocs
  (cycle 4, Scratch), relais vers Python ; prototype dans `$lib/components/blockly`,
  `$lib/shared/blockly`, inchangé depuis le 2026-06-23. Phase 0 à ouvrir.
- **Scripts de démo de constructions / brouillons de `/constructions`** : doublon possible, à revoir
  après la revue (aucune suppression pour l'instant).
- **Images des 4 cartes VIP de Mathémo, à vérifier** (noté le 2026-10-24, demandé par David) :
  Voyelles Révélées, Multiplicateur x1.5 (Mathémo), Lettre Bonus, Retour en Arrière (Mathémo) ont en
  prod un `image_path` en `/images/vip-cards/…`, dossier absent de `static/` (les autres cartes sont
  dans le stockage `vip-card-images`). Images sans doute cassées ; pas vérifié dans le navigateur.

## PR 2 — déplacements vers `/dev` (2026-10-24)

- 18 pages déplacées telles quelles (`git mv`) : lignes 9, 11, 12, 13, 14, 16, 19 et 11 pages de la ligne 18. Adresses : voir `MOVED_PAGES` (`src/lib/server/redirectHandle.ts`), 308 comme les autres anciennes routes, sous-pages et query string comprises.
- `database` → `/dashboard/admin/integrite-donnees` (titre « Intégrité des données », lien propre au menu admin) ; « Debug » → `/dev`.
- `/dev/erreurs/surveillance` traduite en français. Carte « Test de Thème » retirée du carrefour `/demo` (page désormais admin). Exclusion sitemap `/blockly/**` retirée (plus de page).
- Retour de CI : 10 pages tenaient leur `<h1>` du layout de debug → titre et marges ajoutés. Garde de couverture : `couvre:` de `surveillance-des-erreurs.md` étendu, `trous` Blockly repointé.
- Vérifié sur 5178 (Playwright) : 20 pages en 200 pour l'admin, redirections justes, élève 403, anonyme → connexion. Erreurs de console déjà présentes avant (clés en double dans `rls` et `correction-generee`, boutons imbriqués dans `theme`, CSP de la feuille Swagger) : laissées telles quelles.

## PR 3 — fusions et parts dev (phase 0 validée par David le 2026-10-24)

- **Fusions** : ligne 7 → `/dev/carte-question` (page admin + les 4 questions de la démo, énoncés en français) ; ligne 8 → `/dev/editeur-riche` (page admin + onglet « Messagerie » repris de la démo) ; ligne 15 → `/dev/diaporama` (diapositives écrites une fois, bascule plein écran / dans un cadre aux 4 tailles / transitions ; pas de `+layout@`, qui sauterait la garde de `/dev` en navigation client).
- **Parts dev** : ligne 1 → `/dev/structure` en entier (la formule sera recopiée vers `/demo/structure` en phase 6) ; ligne 5 → `/dev/cartes` + `/dev/cartes/exemples` ; ligne 6 → `/dev/mots-cliquables` ; ligne 10 → `/dev/bancs-essai` (champ MathLive, carte retournable, logger, toasts).
- Anciennes adresses publiques → 308 vers `/dev` (le visiteur tombe sur la connexion jusqu'aux pages vitrine). Carrefour `/demo` jusqu'à la phase 7 : seulement les cartes vers des pages encore publiques (cercle trigo, Mathémo, Trio). Layout `admin/debug` supprimé. `<select>` et cases natives des pages fusionnées → `MySelect` / `MyCheckbox`.
- **Fait** : 8 pages sous `/dev` (`carte-question`, `editeur-riche`, `diaporama`, `structure`, `mots-cliquables`, `cartes` + `exemples`, `bancs-essai`), 12 redirections de plus dans `MOVED_PAGES`. Questions de la démo : 3 reprises, la 4ᵉ (`x^2 - 9`) était déjà dans la page admin. Exclusions du sitemap `/slides/**` et `/test-*` retirées (plus aucune page à couvrir).
- Trouvé en route : `MySelect` ignore son `id` → un `<Label for>` ne le nomme pas ; nom accessible par `triggerAriaLabel` (avec la valeur choisie). Le chemin relatif de la fixture du dictionnaire dans les tests de `/dev/structure` avait un niveau de trop peu après le déplacement (test client rouge, corrigé).
- Vérifié sur 5178 (Playwright) : 10 pages en 200 pour l'admin, 403 pour l'élève, connexion pour le visiteur, anciennes adresses comprises. Erreur de console déjà présente : images des cartes VIP sur le stockage de la prod refusées par la CSP locale.

## PR 4 — aide à l'écriture (phase 0 validée par David le 2026-10-24)

- `/geometry-demo/*` (30 pages, `DslDemo.svelte`, `koch-dsl.ts` et son test) → `/aide-ecriture/geometrie/…` par `git mv`, noms des sous-pages inchangés ; `/demo/trig-circle-demo` → `/aide-ecriture/cercle-trigo`. Deux entrées dans `AIDE_PAGES`. Anciennes adresses en 308 (`MOVED_PAGES`), sous-pages et query string comprises (test rouge d'abord).
- Carte « cercle trigo » retirée du carrefour `/demo` (reste Mathémo, Trio). Exclusion sitemap `/geometry-demo/**` retirée (plus de page à couvrir, le test l'exige) ; `Disallow: /geometry-demo` gardé dans `robots.txt`, comme `/test-`, `/slides/`, `/blockly`.
- Retouches : accueil de la géométrie en français (titre, `<title>`, `BackLink` vers `/aide-ecriture`) ; retours des pages → « Retour à la géométrie » ; liens maison « ← Sliders » des 13 pages de sliders → `BackLink` ; liens des deux accueils par `resolve()` ; lien mort vers une doc d'étude (non servie) → chemin du journal archivé en texte.
- Admin : question posée à David (ouvrir `/aide-ecriture/geometrie` à l'admin ?), sans réponse → règle du socle gardée, un vrai compte admin reçoit 403.
- Vérifié sur 5178 (Playwright) : prof 33 pages en 200 sans erreur de page, clics accueil → sliders → Koch ; anciennes adresses → nouvelles ; élève et admin 403 (navigation client comprise pour l'élève) ; visiteur → connexion.

## PR 5 — suppression de `/test-exercises` (2026-10-24)

- Re-grep des orphelins (`src`, `e2e`, `tests`, docs) : `ExerciseMarkdownEditor.svelte` n'était importé que par `/test-exercises` ; `exercises/services/image-markdown-editor.ts` que par lui et son test. Supprimés tous les quatre.
- Gardés : `ExerciseMarkdownPreview` (aperçu de `LaTeXImportDialog`, en-tête corrigé), `ImageAttributePanel` (`ImageNodeView`, `RichTextEditor`), `exercises/services/image-upload.ts` (`ExerciseRichTextEditor`), `MarkdownEditor` (5 usages).
- Pas de redirection : page de mise au point sans lien, `Disallow: /test-` déjà dans `robots.txt` ; l'adresse rend 404.
- Doc : `utilitaires-et-demos.md` (ligne du tableau, `couvre:`, constat « élève compris » retirés), `exercices.md`, `python/README.md`.

## PR 6a — vitrine `/demo/structure` (phase 0 validée par David le 2026-10-24)

- La formule seule (`StructureField`, lecture + déplacement), sans corpus ni cases à cocher,
  réglages par défaut ; `BackLink` vers `/demo` ; `noindex`, non reliée avant la phase 7.
- 6 exemples validés (Priorités, Somme algébrique, Différence, Puissance, Fractions, Équation) ;
  l'expression de l'article Sésamath chargée à l'ouverture.
- Pas de crédit Algebria affiché (Algebria, c'était David).
- `structure-lexicon.svelte.ts` déplacé de la route `/dev/structure` vers
  `$lib/components/structure/` (partagé par les deux pages).
- Vérifié sans compte sur le serveur de la branche : page 200, `/api/dictionnaire` 200.
- Pas de revue (page qui assemble des composants existants, validé par David).

## PR 6b — vitrine `/demo/cercle-trigo` (phase 0 validée par David le 2026-10-24)

- 4 exemples du bloc `trig`, sans le texte du bloc ni « Voir le code » : mode interactif,
  π/6 **seul** (recommandation suivie par David : un angle se lit, douze projections non) avec
  projections et tableau, cos x = 1/2, cos x > 1/2 en arc. `BackLink` vers `/demo`, `noindex`.
- Trouvé en route : `preset: custom` + `mode: interactive` sans angle est refusé par le parseur
  (« demande au moins un angle »). Le catalogue `/aide-ecriture/cercle-trigo` montrait donc au
  prof « Bloc trig : figure non dessinée ». Corrigé des deux côtés par un angle de départ π/4 ;
  test ajouté au catalogue (chaque exemple se dessine), vu rouge sans la correction.
- Pas de revue (page qui assemble des composants existants, comme la 6a).

## PR 6c — vitrine `/demo/cartes` (phase 0 validée par David le 2026-10-24)

- 4 cartes écrites dans `cartes.ts`, une par rareté, textes du catalogue de la prod : Coup Double
  (légendaire, en rotation `showcase`), Super Bonus, Game of throne, Batman and Robin. Écartées :
  Sheikh (trop local), Mathémagie (« Daoudini »), les cartes de jeux.
- Images recopiées du stockage public de la prod dans `static/images/demo-cartes/` : ni base ni
  stockage, la page s'affiche aussi en local.
- Trouvé en route : `VipCardHolo` sans les feuilles `/css/holo-cards/*.css` rend une simple image
  (ni cadre ni reflet) ; elles sont chargées par le layout de `/dev/cartes` et du tableau de bord.
  La page les charge dans son `<svelte:head>`.
- Vérifié sans compte sur 5179 (Playwright) : page 200, 4 cartes, reflet au survol, agrandissement
  au clic, aucune erreur de console, pas de défilement horizontal à 390 px.
- Pas de revue (page qui assemble des composants existants, comme la 6a et la 6b).

## PR 6d — vitrine `/demo/lexique` (phase 0 validée par David le 2026-10-24)

- Sélecteur « Niveau de l'élève » (CM1, 6e, 5e, 3e, 2de, 1re spé, 1re générale), 6e à
  l'ouverture ; le niveau vaut pour toute la page (`provideReaderGrade`).
- Bloc 1 « Dans une question » : la question de l'aire du carré de la page de test, à remplir.
- Bloc 2 « La définition suit l'élève » : une phrase par mot dont la fiche change avec le
  niveau (carré, aire, périmètre, fonction, fonction exponentielle), chacune avec une ligne
  d'aide ; on dit qu'un mot au-dessus du niveau n'est pas souligné.
- Retirés : le bloc indice (test de focus sur tablette) et les phrases d'essai (seuil, urne…).
- Dictionnaire indisponible : texte sans soulignés, rien d'ajouté.
- `BackLink` vers `/demo`, `noindex`, non reliée avant la phase 7. Pas de revue.
- Vérifié en base (prod, lecture seule) : niveaux des définitions de ces 5 mots identiques au
  jeu de référence des tests.
- Vu sur le serveur de la branche (5177, Playwright, sans compte, 390 px) : page 200, mots
  soulignés en 6e sans « fonction », avec « fonction » et « fonction exponentielle » en 1re spé,
  aucune erreur de console, pas de défilement horizontal. Une fiche **cumule** les définitions
  des niveaux passés (CP + CE2 pour « carré » en 6e) : lignes d'aide écrites en « la fiche ajoute ».

## PR 6e — vitrine `/demo/corriges` (phase 0 : David suit les recommandations de Claude, « je te suis », le 2026-10-24)

- Une page de Corrigé en **image fixe** (WebP, `static/demo/corriges/`), sans Typst ni polices
  chargés par la page ; mode sombre : la feuille reste blanche, cadre et ombre.
- Source : la **vraie chaîne des fiches** (`rendu-fiche.ts` puis `compile-prod.mjs
--polices-corrige`), pas celle de `/dev/polices` qui met tout le document en Shantell :
  bandeau et titres dans la police du modèle, correction en Shantell / Chiphre Math.
- Exercices : les deux premiers de `/dev/polices/exercices-demo.json` (inéquation du second
  degré, cos x = a et sin x = a), page 1 seule ; pas de comparaison côte à côte.
- `BackLink` vers `/demo`, `noindex`, non reliée avant la phase 7. Pas de revue.
- Remarqué sur l'image : le `z` manuscrit de Chiphre Math ressemble à un `2` (« 4z », « z² »
  dans l'exercice 1). Signalé à David, rien changé.

## PR 6f — vitrine `/demo/geometrie` (phase 0 : David suit les recommandations de Claude, « je te suis », le 2026-10-24)

- Trois sections (Au collège, Au lycée, Pour le plaisir), 10 figures manipulables, titre et texte
  de 2-3 lignes, script replié sous « Voir le script ». `BackLink` vers `/demo`, `noindex`.
- Figure 1 : la droite d'Euler (des 7 de `triangles`).
- Trouvé en route, vérifié au moteur : `rotation(P, centre=A, angle=a)` avec A sur un cercle trace
  un **cercle** (B = R_a·P + (I − R_a)·A), pas une épicycloïde ; « 120 = deltoïde, 90 = astroïde »
  est faux (`sliders/epicycloide`, `lieu` n° 11 et 14). Le « lieu du milieu » (`lieu` n° 2) est un
  cercle de rayon 2, pas une ellipse. Textes de ces pages d'aide corrigés dans la PR, scripts gardés.
- Figure 9 : une vraie épicycloïde à 3 arches écrite pour la vitrine (petit cercle qui roule,
  `trace` + curseur t), au lieu de `sliders/epicycloide`.
- Textes rendus par le serveur, figures montées dans le navigateur (les sources sont en `ssr = false`).
- Sur téléphone, la figure se réduit à la largeur de l'écran (canevas à largeur fixe aujourd'hui).
- Test : chaque figure se construit sans erreur. `koch-dsl.ts` passe dans `$lib`. Pas de revue.
- Trouvé en route : « Aire entre deux courbes » traçait sin et cos **en degrés** (droites presque
  plates, aire 3,009 au lieu de 2√2) faute de `unite_angle("radians")`, sur la vitrine comme sur
  `sliders/aire-entre` : corrigé des deux côtés, test de l'aire vu rouge sans. `curves`,
  `point-sur` et `sliders/integrale-improper` tracent aussi sin ou cos sans `unite_angle` : pas
  regardé, signalé à David. `trace` n° 3 (« Épicycloïde ») est une hypotrochoïde à trois lobes, et
  `trace` n° 6 annonçait une ellipse pour un milieu : textes corrigés aussi.
- Retouches de lisibilité : triangle d'Euler C(−3, 4) (G, H, O écartés) ; plus de noms internes
  affichés (`s_rot`, `de`, `chemin`…) : styles en ligne, `etiquette="aucune"`, objets sans nom.
- Vérifié sans compte sur 5177 (Playwright) : 200, texte dans le HTML du serveur, 10 figures,
  aucune erreur de console, rien qui déborde à 390 px ; curseurs glissés (épicycloïde complète,
  spirale déroulée, flocon à l'étape 4, aire 2,828).

## PR 6g — vitrine `/demo/questions` (phase 0 : David a tranché les deux questions le 2026-10-25)

- Une série de 4 questions **écrites dans la page** (7 × 8, 25 % de 80, ¾ de 12, 2x + 3 = 11),
  5 onglets : En classe (10 s par question), Entraînement, Flash-cards, Course aux nombres
  (2 min), Révisions espacées **simulée** (une carte, 4 boutons, intervalles du vrai FSRS sur
  une carte neuve). Une phrase « qui, quand » par onglet ; lien « Composer sa propre série »
  vers `/automaths`. `BackLink` vers `/demo`, `noindex`, non reliée avant la phase 7.
- Bandeau « Connecte-toi… » **masqué** (choix de David) : une ligne « Rien n'est enregistré sur
  cette page » à la place. Rien n'est envoyé (fin de série = résultat à l'écran seulement).
- Les boutons « Retour au panier » des formes mènent au vrai panier (`/automaths/panier`).
- Trouvé en route, pas corrigé : `calculateNewStability` (`src/lib/srs/fsrs.ts`) ignore la note ;
  après la 1re révision, Difficile, Bien et Facile donnent le même intervalle (22 j dans l'essai).
  La démo n'affiche que la 1re révision (1, 3, 6, 9 j), qui n'est pas touchée. Signalé à David.
- `TestInteractive` et `FlashSeries` gagnent `loginNote` (défaut `true`) : la vitrine coupe le
  bandeau sans se dire connectée. Test du bandeau vu rouge sans `loginNote={false}`.
- Tests : la page (titre, 5 onglets, chaque forme montée, simulation FSRS, aucune requête
  d'écriture) et la série (4 réponses, intervalles croissants). Le test de page simule
  `fetchDictionary`, sinon la vraie requête fait planter le serveur de vitest (`wrapDynamicImport`).
- Vu sans compte sur 5177 (Playwright, 1280 et 390 px) : 200, 5 onglets, aucune erreur de console,
  aucune requête autre que GET, rien qui déborde ; « Facile » → « dans 9 jours ». Pas de revue.

## PR « sin/cos en radians » de l'aide géométrie (David suit la recommandation, le 2026-10-25)

- Mesuré au moteur, mode degrés par défaut : sin(π/2) = 0,027 sur `courbe("y = sin(x)")`, et la
  cascade des dérivées est divisée par π/180 à chaque cran (cycle de 4 invisible). En radians : 1.
- `unite_angle("radians")` ajouté à 5 scripts : `curves` (fonctions, cascade des dérivées,
  implicite `sin(x) + cos(y) = 1`), `point-sur` (point sur sin), `sliders/integrale-improper`
  (oscillation ; texte décalé, il sortait du cadre).
- Pas touchés, mesurés justes : `polar` (θ d'une courbe `r = f(theta)` en radians dans les deux
  modes) ; `trace` et `lieu` (`angle_polaire` rend des degrés en mode degrés, cos(3θ) = −1 en 60°).
- Garde-fou : `__tests__/courbes-trigo-radians.test.ts` (toute `courbe()` trigonométrique non
  polaire de l'aide déclare les radians), vu rouge sur les 5 scripts sans le correctif.
- Vu (captures dans le navigateur de vitest, page montée sans compte) : sinusoïdes de période 2π,
  cycle sin → cos → −sin → −cos, ovales périodiques de l'implicite.
- Trouvé en route, signalé à David, pas corrigé : `angle_polaire` rend **60 aussi en mode radians**
  (cos(3θ) faux dès qu'on combine les deux) ; `dsl-builtins.md` dit « en radians », faux en degrés.

## PR 6h — vitrine `/demo/editeur` (phase 0 : David suit les recommandations, le 2026-10-25)

- Un seul éditeur (`preset="standard"`, comme au cahier de texte), une phrase de départ
  « La solution de 2x + 3 = 11 est x = 4. » ; trois cartes, chacune par le vrai moteur de son usage :
  message privé au prof (JSON → `RestrictedRichText`, comme `/messages/[id]`), cahier de texte
  (HTML de `generateHTML` = `editor.getHTML()` → `transformMathHtml` + `linkifyResourceReferences`),
  énoncé d'exercice (`tipTapToMarkdown` → `MarkdownRenderer`). Pas de volet « ce qui est gardé ».
- Éditeur vidé → « Écrivez une phrase ci-dessus. » (vouvoiement, comme les autres vitrines).
- **Bug trouvé, pas encore corrigé** : `transformMathHtml` (`src/lib/utils/sanitize.ts`) ne lit
  `latex="…"` que s'il suit directement `data-math-inline` / `data-math-block` ; or l'éditeur écrit
  `data-math-syntax` et `data-math-original` avant (depuis `6939fefb5`, 2025-12-14). Toute formule
  du cahier de texte arrive **vide** chez l'élève (`/dashboard/student/cahier-texte/[entryId]` et
  `/cahier/[token]`). Prod mesurée (MCP) : 2 séances, 2 travaux, aucune formule → personne touché.
  Le test « formule au cahier » de la vitrine était rouge à cause de lui.
- David a demandé pourquoi le cahier n'utilise pas ubumark : aucune trace d'une décision (cahier
  créé le 2026-01-04 sur `bind:htmlValue`, alors que la sortie markdown existait depuis le
  2025-12-16). Il retient la **voie 2** : passer le cahier à ubumark, en chantier à part, plutôt
  que réparer `transformMathHtml`. La vitrine part sans le test des formules du cahier (commentaire
  dans le test) ; écart noté dans `docs/systeme/editeur-riche.md`, avec les énigmes (`RiddleForm`
  enregistre du HTML, `RiddleCard` le lit comme du markdown ; pas mesuré).
- Trouvé par le test « éditeur vidé » : Ctrl+A puis Retour arrière levait `RangeError: There is
no position before the top-level node` dans les raccourcis Backspace de la droite graduée et du
  tableau de variations (`$from.before()` au niveau du document). Garde `$from.depth === 0` dans
  les deux ; `src/lib/extensions/__tests__/retour-arriere-tout-selectionne.svelte.test.ts`, vu
  rouge sans. L'effacement se faisait quand même (repli natif), mais l'erreur partait en console.
- Vu sur 5177 (Playwright, 1280 et 390 px) : 200, aucune erreur de console, aucune requête autre
  que GET, rien qui déborde ; le texte de la carte « cahier » manquait (`{@html}` gardé du serveur) →
  HTML calculé après `onMount`.

## PR 6i — vitrine `/demo/diaporama` (phase 0 validée par David le 2026-10-25)

**Vérifié avant de coder** (page d'essai non commitée, Chromium piloté) :

- `trig` dans une `UbuMarkSlide` : ✅ statique et interactif.
- Figure manipulable : le bloc ubumark ` ```figure ` est **statique** (le déplacement n'est permis
  qu'aux figures stockées) ; `GeometryCanvas` posé dans une `Slide` se manipule (A suit la souris,
  la diapositive ne bouge pas, console propre).
- Question « En classe » sans compte : les questions de la démo marchent ; mais `ClassroomSeries`
  imbriquée dans un `Deck` est elle-même un `Deck` → ouverte sur la question 2/4, flèches inertes,
  titre et compte à rebours blancs sur fond clair. Pas d'imbrication.
- L'« auto-animate » de reveal.js **n'existe pas** chez nous (`Slide` ne pose que l'attribut) ; le
  défilement automatique par diapositive (`autoSlide`) existe.
- Les 18 sortes de contenu ubumark s'affichent dans une diapositive, sans erreur console. **Deux défauts** :
  1. la couleur du texte suit le **thème du site**, pas le fond de la diapositive : fond sombre +
     site en thème clair → texte, tableaux, `trig`, `variation`, `operation`… invisibles ;
  2. pas d'ajustement de taille : `courbe`, `line`, `figure`, `qr` minuscules ; contenu long coupé
     en haut et en bas, sans défilement.
- ` ```python ` s'affiche en **texte brut** : `CodeBlock.svelte` (2025-11-24, jamais retouché)
  échappe le code sans coloration, alors que `highlight.js` sert déjà dans `slides/components/Code.svelte`
  et `server/markdown-parser.ts`. Un oubli, aucune ADR ni doc ne l'écarte.

**Décisions (David suit les recommandations, le 2026-10-25)** :

- **6i-a** : coloration branchée sur `CodeBlock` (tous les blocs de code ubumark), `highlight.js`
  chargé à la demande ; langage inconnu ou absent → texte brut.
- **6i-b** : la diapositive pose `color-scheme` d'après son fond (couleur unie → luminosité ;
  dégradé, image, vidéo → comme aujourd'hui, prop `theme="clair" | "sombre"` pour forcer) — les
  tokens du site sont en `light-dark()`, ils basculent seuls ; `UbuMarkSlide` réduit son contenu
  trop long pour qu'il tienne (jamais d'agrandissement). Blocs trop petits : réglage `taille:`
  dans la vitrine, rien de plus pour l'instant.
- **6i-c**, 13 diapositives : celles du plan + une diapositive Python (bloc ubumark ` ```python `
  coloré, bouton « Ouvrir dans Python » via `pythonPageOf`) après les formules ubumark.
  Diapositive 5 : $(x+1)^2$ développé **ligne par ligne, tout seul** (`autoSlide` + fragments, ~2 s) ;
  diapositive 8 : `GeometryCanvas` (droite d'Euler de `/demo/geometrie`) ; diapositive 9 : **minuteur
  du diaporama** (2 questions de la démo, 10 s chacune, barre qui se vide, puis la correction).

### 6i-a — coloration des blocs de code (#1729, mergée le 2026-10-25)

- `utils/code-highlight.ts` : cœur + un morceau par langage, chargés à la demande ; chargement
  raté retenté au bloc suivant (revue). `CodeBlock` : coloration après le montage, l'ancienne reste
  jusqu'à la nouvelle. Revue `code-reviewer` (Sonnet) : 0 bloquant, 2 « à corriger » corrigés.
- Piège : un test client qui charge un module **nouveau** pour Vite peut échouer au premier passage
  (cache Vite d'avant le module, rechargement en plein test) ; à froid ou au 2ᵉ passage, vert.

### 6i-b — thème et réduction des diapositives (#1731, mergée le 2026-10-25)

- `slide-theme.ts` (`slideColorScheme`) : couleur unie → luminance, prop `theme` ; `Slide` pose
  `color-scheme`. Sans fond : couleur du site ; dégradé / image : blanc comme avant.
- `UbuMarkSlide` : réduction à largeur fixe (`ResizeObserver`), plancher 0,5 puis défilement ;
  bordures de tableau et fond des `pre` en `color-mix` du texte.
- Revue `code-reviewer` (Sonnet) : 0 bloquant ; trouvé en chemin un bug antérieur — le cercle trigo
  interactif comparait des coordonnées d'écran au dessin (faux dès qu'il est affiché à une autre
  taille) → `svgPoint`, test `TrigCircle-echelle`.
- Pour 6i-c : fonds de couleur unie (thème déduit), blocs grossis par `taille:` si besoin ; un
  tableau large défile dans son cadre (`TableNode`), il n'est pas réduit.

### 6i-c — vitrine `/demo/diaporama` (2026-10-25)

- 13 diapositives comme prévu ; contenu dans `diaporama.ts`, minuteur = `autoSlide` des
  diapositives d'une pile (titre, Q1, Q2, correction : le compte ne part qu'en descendant),
  barre `ChronoBar` lue dans le contexte du Deck. Plein écran : bouton dans l'`overlay` ou F.
- **Bug trouvé** : le marqueur `->` d'une `UbuMarkSlide` était ignoré après une formule (le
  rendu met `->` dans un nœud de texte à part, sans espace devant) → `isTrailingMarker`, testé
  par `UbuMarkSlide.fragments.svelte.test.ts`, vu rouge sans ; une flèche au milieu reste une flèche.
- Piège : dans `<main>`, `h2`/`p`/`li` ont une taille `!important` × `--font-scale` (`app.css`) ;
  les classes `text-*` n'y font rien. La page règle `--font-scale` selon la largeur du cadre
  (requêtes de conteneur : 1 ; 1,4 dès 640 px ; 1,8 dès 960 px), `td` et code compris.
- Vu sur 5177 (Playwright, 1280 et 390 px, les 13 diapositives) : aucune erreur de console,
  aucune requête autre que GET, rien qui déborde. Sur téléphone, les flèches du Deck chevauchent
  parfois le bas du contenu (comportement du Deck, pas touché).

## PR 7 — accueil `/demo`, robots, liens (phase 0 : David suit les recommandations, le 2026-10-25)

- **Accueil `/demo`** : 9 cartes (titre + une ligne), une seule couleur d'accent, ordre : questions,
  corrigés, diaporama, géométrie, cercle trigo, éditeur, lexique, cartes VIP, structure. Prérendue,
  sans `BackLink` (carrefour). Mathémo et Trio en sortent (déjà dans `/games`).
- **Robots** : `Disallow: /demo` retiré (le reste fermé) ; `noindex` retiré des 9 pages, une
  `meta description` chacune ; sitemap : `/demo` (0,6) + les 9 (0,5), exclusion `/demo/**` retirée.
- **Liens** : un seul lien vers `/demo` par page de public (recommandation suivie) — 3ᵉ bouton
  d'appel sur `/professeurs`, « Voir Chiphre en action » dans un bloc de `/parents` et `/eleves` ;
  5ᵉ lien « Démonstrations » dans l'`InfoPanel`.
- Ouverture aux robots dans cette PR (recommandation suivie) : effective au prochain `deploy:prod`.
- Une seule liste `DEMO_PAGES` (`$lib/seo/demo-pages.ts`) nourrit l'accueil, le sitemap et les
  descriptions ; un test exige qu'elle colle aux dossiers de `/demo`. Revue : `code-reviewer` (Sonnet).
- **Livrée : #1742, mergée le 2026-10-25.** En plus du plan : vitrines par `SeoHead` (canonique,
  Open Graph ; suite de la revue `code-reviewer`, 0 bloquant) via `demoSeo()`. Vu sur 5178
  (1280 et 390 px) : aucune erreur de console, rien ne déborde. CI : 1er test de `/demo/lexique`
  trop lent à froid (769 ms sur `main`, délai de 1 s dépassé), vert à la relance ; 25 runs
  précédents sans cet échec.

## PR 8 — constructions : `/constructions/essais` et `/demo/constructions` (phase 0 validée par David le 2026-10-25)

- Chantier constructions vérifié avant de lancer : CLOS le 2026-10-24 (journal archivé, versé dans
  `docs/systeme/geometrie/constructions.md`), aucune PR ouverte.
- **`/constructions/essais`** : ex-`/construction-demo` (`git mv`), garde `requireRoles` prof
  (`CONSTRUCTION_AUTHOR_ROLES`) dans le `load` ; élève et admin 403, visiteur → connexion.
  Textes accentués, « Sauvegarder » → « Enregistrer », `BackLink` « Retour aux constructions » ;
  bouton « Essais » sur `/constructions` (prof seul). Exemples XML de `extern/` gardés tels quels
  (toujours vides en prod). `/construction-demo` → 308 (`MOVED_PAGES`) ; `Disallow` gardé ;
  exclusion sitemap retirée. `canAuthorDemoScripts` supprimée (plus d'appelant) ; l'API
  `construction-demo-scripts` garde prof + admin jusqu'à la PR suivante.
- **`/demo/constructions`** : 3 constructions recopiées de `scripts/constructions-prod/contenu.ts`
  (parallélogramme, partage en trois, symétrie axiale au compas), lecteur seul, script replié ;
  entrée `DEMO_PAGES` après la géométrie.
- Trouvé en route (vu dans le navigateur, 1280 et 390 px) : toile blanche avant « Jouer » →
  `seekToEnd` (la figure finie s'affiche, « Jouer » repart du début) ; `zoom` du lecteur entier
  rendait les boutons minuscules sur téléphone → seule la toile se réduit ; commandes du lecteur
  sur une ligne sans retour (frise écrasée à 390 px) → `flex-wrap` dans `ConstructionPlayer`
  (profite aussi à `/constructions/[id]`) ; titres de carte en `h2` grossis par `main h2`
  `!important` → classe `!` avec `--font-scale`. Hauteur de toile 460 (D coupé à 420).
- Vérifié sur 5177 (Playwright) : vitrine 200 sans erreur de console, rien ne déborde ; prof :
  `/construction-demo` → `/constructions/essais` 200, clic « Essais » ; élève et admin 403, pas
  de bouton « Essais ».
- **Livrée : #1750, mergée le 2026-10-25.** CI verte du premier coup.
