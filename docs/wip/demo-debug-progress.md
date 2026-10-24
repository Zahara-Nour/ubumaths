# Pages de démo et de debug : mise en cohérence

## Reprendre ici

_Mis à jour le 2026-10-24, PR 2 en cours._

- **État** : PR 1 (socle) mergée (#1675). PR 2 (déplacements vers `/dev`) ouverte : 18 pages sous `/dev`, `database` → `/dashboard/admin/integrite-donnees`, redirections 308 (`MOVED_PAGES`), lien « Debug » → `/dev`.
- **Prochaine action** : merger la PR 2, puis PR 3 (fusions 7, 8, 15 ; parts dev des lignes 1, 5, 6, 10).
- **En attente de David** : rien.
- **Pièges en cours** : sous `/dev`, jamais de donnée sensible par un load universel (`+page.ts`) ni par Supabase dans le navigateur ; chaque page ajoutée → une ligne dans `DEV_PAGES` / `AIDE_PAGES` ; `/test-font` redirigée à l'adresse exacte seulement (images sous `static/test-font/`) ; `question-display` et `rich-text` restent sous `admin/debug` jusqu'à la PR 3 ; ligne 4 après le chantier constructions.
- **Worktree / branche** : `../ubumaths-wt-demo-debug` · `feat/demo-debug-deplacements`.

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

## PR 2 — déplacements vers `/dev` (2026-10-24)

- 18 pages déplacées telles quelles (`git mv`) : lignes 9, 11, 12, 13, 14, 16, 19 et 11 pages de la ligne 18. Adresses : voir `MOVED_PAGES` (`src/lib/server/redirectHandle.ts`), 308 comme les autres anciennes routes, sous-pages et query string comprises.
- `database` → `/dashboard/admin/integrite-donnees` (titre « Intégrité des données », lien propre au menu admin) ; « Debug » → `/dev`.
- `/dev/erreurs/surveillance` traduite en français. Carte « Test de Thème » retirée du carrefour `/demo` (page désormais admin). Exclusion sitemap `/blockly/**` retirée (plus de page).
- Vérifié sur 5178 (Playwright) : 20 pages en 200 pour l'admin, redirections justes, élève 403, anonyme → connexion. Erreurs de console déjà présentes avant (clés en double dans `rls` et `correction-generee`, boutons imbriqués dans `theme`, CSP de la feuille Swagger) : laissées telles quelles.
