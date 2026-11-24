# Lot pedagogie : 24 points (29 blocs une fois découpés)

| verdict      | nombre |
| ------------ | -----: |
| VRAI         |     20 |
| CORRIGÉ      |      1 |
| FAUX         |      0 |
| PAS UN ÉCART |      3 |
| NON VÉRIFIÉ  |      5 |
| DOUBLON      |      0 |

Note : les numéros de ligne de `ubumark.md` cités par la recollecte sont décalés ; la section vit aujourd'hui sous « Doutes et écarts connus » (`docs/systeme/ubumark.md:2105` à 2143). Les sondes vitest ont été posées un instant sous `src/…/__tests__/zz-sonde-tri-pedagogie.test.ts` (seul endroit que vitest lit) puis effacées ; `git status` propre sur `src`.

## Points

### ubumark.md:2040 (a) [M] — VRAI

- **Point** : l'option `solved` de `courbe-typst.ts` n'est passée par aucun appel.
- **Vu** : `src/lib/ubumark/generators/courbe-typst.ts:44,316` (option et dessin du corrigé) ; seul appel de production `src/lib/ubumark/generators/typst-generator.ts:530` : `generateCourbeTypst(node, { language: options.language })`, sans `solved`.
- **Registre** : M · blocs · le dessin du corrigé d'un repère à placer ou à tracer existe dans le générateur PDF mais aucune fiche ne l'appelle · commande `test -f src/lib/ubumark/generators/courbe-typst.ts && { grep -rn "generateCourbeTypst(" src --include=*.ts | grep -v __tests__ | grep -q solved || ! grep -q "solved?: boolean" src/lib/ubumark/generators/courbe-typst.ts; }` → exit 1 aujourd'hui.

### ubumark.md:2040 (b) [V] — VRAI

- **Point** : le corrigé imprimé d'une série d'automatismes refuse le vecteur à tracer et la droite verticale.
- **Vu** : `src/lib/worksheets/serie-automatismes.ts:328` `throw refus('vecteur à tracer non pris en charge')`, `:333` `throw refus('droite verticale non prise en charge')`.
- **Registre** : V · fiches · un prof ne peut pas mettre dans une série d'automatismes une question où l'on trace un vecteur ou une droite verticale (refus à la création) · commande `test -f src/lib/worksheets/serie-automatismes.ts && ! grep -qE "vecteur à tracer non pris en charge|droite verticale non prise en charge" src/lib/worksheets/serie-automatismes.ts` → exit 1.

### ubumark.md:2040 (c) [V] — VRAI

- **Point** : l'horloge et les barres à placer n'ont pas de corrigé imprimé.
- **Vu** : `src/lib/ubumark/generators/horloge-typst.ts:130` `generateHorlogeTypst(node)` sans option, `:134-135` cadran sans aiguilles quand `placer:` ; `typst-generator.ts:536,543` appellent sans `solved` ; `stat-chart-typst.ts:151` barre à construire laissée vide ; aucun réécrivain horloge / barres dans `serie-automatismes.ts` (fonctions l.270-610 : repère, droites, boîtes, associer, trous, robots, labyrinthes).
- **Registre** : V · fiches · au corrigé imprimé, une horloge à régler ou une barre à construire reste vide · commande `test -f src/lib/ubumark/generators/horloge-typst.ts && grep -q "solved" src/lib/ubumark/generators/horloge-typst.ts` → exit 1.

### ubumark.md:2048 [V] — VRAI

- **Point** : cote d'un cylindre coupé parallèlement à l'axe posée loin de son court trait quand la distance est petite.
- **Vu** : `src/lib/ubumark/utils/espace-solides.ts:711-713` : trait en tirets de `(0,0)` à `(0, low)` avec `low = -d × ry / r`, mais la cote posée à `{ x: 0, y: -ry }` (bas de l'ellipse), fixe, quelle que soit `d`.
- **Registre** : V · blocs · sur un cylindre coupé parallèlement à l'axe près de l'axe, le nombre de la distance est écrit sous la base, loin du petit trait qu'il mesure · commande `test -f src/lib/ubumark/utils/espace-solides.ts && ! grep -q "at: { x: 0, y: -ry }, value: cut.distance" src/lib/ubumark/utils/espace-solides.ts` → exit 1 (à rendre verte par un test de position plutôt que par grep si on corrige).

### fiches-et-pdf.md:955 [V] — VRAI (voisin de E57, pas doublon)

- **Point** : fiche anglaise au titre composé sans catégorie : le PDF imprime le titre composé en français.
- **Vu** : `src/lib/worksheets/worksheet-title.ts` (`printedTitle`, l.163-191) : en anglais `notions = []` (l.165), sans catégorie → `alone(title)` (l.186), et `title` est le titre composé écrit en français par l'éditeur.
- **Doublon ?** Non. E57 (`docs/ecarts/registre.md:54`, `e2e/verifs/modeles-paquet6.spec.ts:628`) : titre **libre** traduit en base, que `GET /api/worksheets/<id>` ne rend pas (`translations` absent). Ici : titre **composé**, aucune traduction n'existe (pas de noms anglais des notions). Même symptôme, deux causes ; corriger E57 ne corrige pas celui-ci.
- **Registre** : V · fiches · en version anglaise, une fiche sans titre libre ni catégorie imprime en tête son titre français fait des noms des notions · test à écrire : `printedTitle({ customTitle: false, category: null, title: '<titre composé fr>', notions: [...], locale: 'en' }).main` ne contient pas le titre français.

### fiches-et-pdf.md:957 [T] — VRAI

- **Point** : `escapeTypst` n'échappe pas `[` `]` ; reste consignes et noms de section.
- **Vu** : `src/lib/ubumark/generators/typst-generator.ts:3706` regex `[\\#$@*_\`<>]`sans crochets ;`escapeTypstBrackets`(l.3919) n'est pas utilisé pour`src/lib/worksheets/document/render-exercise.ts:290` `[${escapeTypst(exercise.instructions)}]`, ni l.193-194 (titre et consigne de section), l.408.
- **Registre** : T · fiches · une consigne d'exercice ou un nom de section contenant `]` peut casser ou détourner le PDF de la fiche (texte écrit par le prof ou l'admin) · commande `test -f src/lib/worksheets/document/render-exercise.ts && ! grep -q "escapeTypst(exercise.instructions)" src/lib/worksheets/document/render-exercise.ts` → exit 1.

### fiches-et-pdf.md:962 [L] — VRAI

- **Point** : `escapeTypst` n'échappe pas `/` : `//` et `/*` ouvrent un commentaire Typst.
- **Vu** : même regex `typst-generator.ts:3706`, pas de `/`.
- **Registre** : L · fiches · un titre ou une consigne contenant `//` perdrait la fin de sa ligne dans le PDF · test à écrire : `escapeTypst('a // b')` compilé par Typst rend « a // b » en entier.

### fiches-et-pdf.md:950 [L] — VRAI

- **Point** : catégorie et notions en plusieurs requêtes, pas une transaction.
- **Vu** : `src/routes/api/worksheets/[id]/+server.ts:294-297` `writeWorksheet(otherUpdate)` puis `applyClassification(...)` ; `src/lib/server/worksheets/worksheet-classification.ts:289-291` `.delete()` sur `worksheet_classifications`, `:301` `updateWorksheet()`, `:304-305` écriture des notions : trois appels séparés, aucune fonction SQL.
- **Registre** : L · fiches · une coupure au mauvais moment pendant l'enregistrement laisse une fiche sans ses nouvelles notions (réenregistrer répare) · commande `test -f src/lib/server/worksheets/worksheet-classification.ts && ! grep -q "from(.worksheet_classifications.)" src/lib/server/worksheets/worksheet-classification.ts` → exit 1.

### programmes/arbre-des-notions.md:146 [V] — NON VÉRIFIÉ

- **Point** : 11 modèles sans corrigé, termes nuls dans des corrigés (`646b4cd3`, `93539700`, `f2cc01fc`), specs rouges (`27d77564`, `103cf8d9`, `e02fb162`), `9a6087c5` (12 tirages sur 600 en échec).
- **Vu** : les identifiants n'apparaissent que dans des copies figées de tests d'intégration (`tests/integration/fixtures/*.json`) ; le contenu est en base.
- **À faire** (lecture prod) : `select id, status from question_templates where id::text like any (array['646b4cd3%','93539700%','f2cc01fc%','27d77564%','103cf8d9%','e02fb162%','9a6087c5%','c9d6c5db%']);` puis rejouer `check-template` (600 tirages) sur chacun ; pour « sans corrigé » : modèles publiés dont aucune variation n'a de `correction` (requête jsonb sur `variations` / `shared`). Ensuite seulement une ligne de registre, par modèle.

### ubumark.md:2030 [L/D] — VRAI

- **Point** : option à geste dans un `choix` : ni refus ni case.
- **Vu** (sonde `assignBlankIndices` sur ` ````choix ` avec une option ` ```horloge ` + `placer:` ou ` ```cubes ` + `dessiner:`) : aucun `choiceErrors`, aucun `buildErrors` ; la même sonde avec ` ```trig ` + `placer:` rend « doit être au premier niveau de l'énoncé ». Le refus existe donc pour le cercle, pas pour horloge / cubes (patron non sondé).
- **Registre** : L · questions · un prof peut publier un choix dont une option est une horloge à régler : l'élève ne voit pas de geste et aucun refus ne prévient le prof · test à écrire : `assignBlankIndices` d'un choix à option horloge `placer:` rend un `choiceErrors` « premier niveau », comme pour `trig`.
- **Question à David** : « Un prof écrit un QCM dont la réponse A est une horloge où l'élève doit placer les aiguilles. Aujourd'hui l'horloge s'affiche sans aiguilles à placer et rien ne prévient le prof. On refuse à l'écriture (comme pour le cercle trigo), ou on veut un jour ce genre de choix ? » Réponses : (1) refus avec message, comme `trig` ; (2) le rendre possible (chantier) ; (3) laisser.

### ubumark.md:2037 [L] — PAS UN ÉCART

- **Point** : tolérance de `isGridNode` (1e-9 × pas) : un pas irrationnel avec de grandes valeurs peut refuser une cible écrite en décimal.
- **Vu** : `src/lib/ubumark/utils/courbe-placer.ts:51-53,77-80` : tolérance `1e-9 × max(1, |pas|)`. Avec `y: 1000 ; 1010` et `pi/2`, le bruit de `round(v/pas) × pas` reste vers 1e-13, bien sous la tolérance ; ce qui est refusé, c'est une cible décimale arrondie (`1.5708` pour π/2), qui n'est en effet pas un nœud. Limite voulue, écrite « laissée telle quelle », le juge n'est pas touché.

### ubumark.md:2039 [L] — PAS UN ÉCART

- **Point** : les juges de la droite et du vecteur ne vérifient pas que les points sont des nœuds.
- **Vu** : `src/lib/ubumark/utils/courbe-tracer.ts:206-211` (`isTracedLineCorrect` : deux points distincts sur la droite), `courbe-vecteur.ts:114-119` (`isTracedVectorCorrect`). Vrai, mais une réponse forgée hors nœud qui est sur la bonne droite, ou de bonnes coordonnées de vecteur, reste mathématiquement juste ; l'écran ne pose que des nœuds (aimant `nearestNode`, `courbe-placer.ts:108`). Rien de faux n'est accepté.

### ubumark.md:2044 [L] — VRAI

- **Point** : `\frac` refusé dans `tracer:`.
- **Vu** (sonde) : `lineCoefficients('y = \frac{1}{2}x')` → « équation illisible … (Invalid backslash sequence at position 0) » ; `lineCoefficients('y = 1/2x')` → `{a:-0.5,b:1,c:0}`. `courbe-tracer.ts:105-106` lit en syntaxe maison (`parseCustom`).
- **Registre** : L · blocs · un prof qui écrit `\frac{1}{2}x` dans une droite à tracer reçoit un refus (il doit écrire `1/2x`) · test à écrire : `lineCoefficients('y = \\frac{1}{2}x')` rend les mêmes coefficients que `y = 1/2x`. (Lettre discutable : c'est la syntaxe d'écriture des modèles partout ; D possible.)

### ubumark.md:2046 [L] — VRAI

- **Point** : ` ```ranger ` dans une liste sort en bloc de code.
- **Vu** (sonde `parseMarkdown('- item\n  ```ranger …')`) : l'item contient `{"type":"code-block","language":"ranger"}`. `src/lib/ubumark/parser/markdown-parser.ts:1816` `SPECIAL_BLOCK_KINDS` : 17 entrées, aucune `isRangerBlockStart` (définie `ranger-parser.ts:54`).
- **Registre** : L · blocs · dans un cours, des étiquettes à ranger écrites dans une liste s'affichent comme du code brut · commande `test -f src/lib/ubumark/parser/markdown-parser.ts && grep -q "isRangerBlockStart" src/lib/ubumark/parser/markdown-parser.ts` → exit 1.

### ubumark.md:2051 (a) [L] — VRAI

- **Point** : fractions refusées sur une ligne de boîte mais acceptées dans `données:`.
- **Vu** (sonde `parseStatChartContent('boite-a-moustaches', …)`) : `A = 1/2 ; 1 ; 2 ; 3 ; 4` → « « 1/2 » n'est pas un nombre » ; `données: 1/2 ; 1 ; 2 ; 3 ; 4` → aucune erreur.
- **Registre** : L · blocs · un prof peut écrire `1/2` dans les données d'une boîte à moustaches mais pas dans ses cinq valeurs · test à écrire : une ligne de boîte `A = 1/2 ; …` se lit comme `données:` (ou les deux refusent).

### ubumark.md:2051 (b) [L] — VRAI

- **Point** : à 40 graduations, les étiquettes de l'axe se chevauchent.
- **Vu** : plafond 40 (`src/lib/ubumark/parser/stat-chart-parser.ts:3029`) ; `src/lib/components/markdown/nodes/BoxPlotPlacer.svelte:452-456` écrit une étiquette à chaque graduation (`{#each scene.xTicks …}<text …>{tick.label}`), sans en sauter. Le chevauchement lui-même n'est pas vu à l'écran (voisin de E46, texte rétréci au téléphone, pas doublon).
- **Registre** : L · blocs · sur une boîte à moustaches à construire avec un axe très gradué, les nombres de l'axe se marchent dessus · à la main (capture à 40 graduations, téléphone), ou commande `test -f src/lib/components/markdown/nodes/BoxPlotPlacer.svelte && ! grep -q "{#each scene.xTicks as tick, i (i)}" src/lib/components/markdown/nodes/BoxPlotPlacer.svelte` → exit 1 (grossière).

### ubumark.md:2051 (c) [L] — PAS UN ÉCART

- **Point** : `données:` tirées au hasard de taille paire → médiane au demi, refusée sur un axe de 1 en 1.
- **Vu** : refus au parseur `stat-chart-parser.ts:3370` (valeur hors graduation) ; la boucle de nouveaux tirages (`instance-generator.ts:691,701`) ne couvre que variables et `conditions`. Limite documentée dans la fiche d'aide ; le prof la contourne par une `condition`, et la vérification de publication (600 tirages) la montre.

### questions.md:1787 [L] — CORRIGÉ

- **Point** : évaluations notées : le serveur régénère l'instance depuis la graine à la correction.
- **Vu** : `src/lib/server/evaluation-attempts.ts:621` l'instance est figée à la création (`instance: toJson(withoutSeed(instance))`) ; `:297,318-320` la correction relit l'instance figée ; régénération (`:322-323`) seulement pour une tentative sans instance, antérieure à Q42. La doc `questions.md` § Écarts connus est périmée sur ce point.
- Reste (NON VÉRIFIÉ, prod) : `select count(*) from evaluation_attempt_questions where instance is null;` — s'il en reste 0, le repli est du code mort.

### questions.md:1793 (a) [L] — NON VÉRIFIÉ

- **Point** : au doigt, le glisser qui suit la pose d'un point absent sur une droite attend un peu.
- **À faire** : appareil tactile (iPhone par `pnpm lien`), droite graduée à placer, poser un point puis le glisser aussitôt.

### questions.md:1793 (b) [L] — NON VÉRIFIÉ

- **Point** : modèles « ranger » `cp-a2/04` et `ce1-2/04` encore en case.
- **Vu** : toujours listés à réécrire dans `docs/wip/outils-manquants.md:137` ; aucune trace dans `src`, `supabase/migrations`, `data`. Contenu en base.
- **À faire** (lecture prod) : retrouver les deux modèles par leur identifiant de source (colonne ou champ qui porte `cp-a2/04`, `ce1-2/04`) et vérifier si leur énoncé contient ` ```ranger `. Contenu, pas code : relève du suivi `outils-manquants.md`, pas du registre.

### questions.md:1804 [L] — VRAI

- **Point** : durées du panier 5..300 s, série jusqu'à 600 s ; le premier « − » ramène 600 à 300.
- **Vu** : `src/lib/stores/questionCart.svelte.ts:22-23` `MIN_DELAY = 5`, `MAX_DELAY = 300`, `:216` borne ; `src/lib/components/CartQuestionCard.svelte:34` `DELAY_MAX = 300` ; `src/lib/validation/series.ts:30` `MAX_QUESTION_DELAY_SECONDS = 600`.
- **Registre** : L · séries · un prof qui recharge dans le panier une série à 10 min par question perd 5 min au premier clic sur « − » · commande `test -f src/lib/stores/questionCart.svelte.ts && ! grep -q "const MAX_DELAY = 300" src/lib/stores/questionCart.svelte.ts && ! grep -q "DELAY_MAX = 300" src/lib/components/CartQuestionCard.svelte` → exit 1.

### questions.md:1807 [L] — VRAI

- **Point** : contrôles natifs malgré MySelect / MyCheckbox.
- **Vu** : `src/lib/components/PrecisionEditor.svelte:82,139` `<select` ; `src/lib/components/QuestionPreview.svelte:180,268` `<select`, `:284` `<input type="checkbox"`.
- **Registre** : L · interface · trois listes déroulantes et une case à cocher de l'aperçu de question et du réglage de précision n'ont pas l'aspect des autres contrôles (règle 2 de CLAUDE.md) · commande `test -f src/lib/components/QuestionPreview.svelte && test -f src/lib/components/PrecisionEditor.svelte && ! grep -qE "<select|type=\"checkbox\"" src/lib/components/QuestionPreview.svelte src/lib/components/PrecisionEditor.svelte` → exit 1.

### ubumark.md:2034 [D] — VRAI

- **Point** : virgule décimale permise dans `placer:`, `grille:`, `tracer:`, pas dans `x:` / `y:`.
- **Vu** : `src/lib/ubumark/parser/courbe-parser.ts:441-444` `decimalPoint` (« `grille:` et `placer:` ») ; `x:` / `y:` (l.1233-1246) passent par `parsePair` (l.433-439) : découpe sur `;` puis `evaluateConstant`, sans `decimalPoint`.
- **Question à David** : « Dans un repère, un prof écrit `x: -2,5 ; 3`. Aujourd'hui c'est refusé (on lit la virgule comme une erreur, parce que `x: -3, 3` est la faute classique pour `x: -3 ; 3`). Partout ailleurs dans le bloc, `2,5` est accepté. On garde ? » Réponses : (1) garder le refus (choix actuel) ; (2) accepter `2,5` quand il y a aussi un `;` ; (3) accepter et avertir.

### ubumark.md:2056 [D] — VRAI

- **Point** : décisions de la boîte à moustaches à confirmer : trait posé → suivant ; une boîte → toute la hauteur ; phrases de retour.
- **Vu** : `BoxPlotPlacer.svelte:119,257-262` (premier trait posé → suivant pas posé), `:199` (une seule boîte : toute la hauteur la vise) ; `src/lib/ubumark/utils/boxplot-placer.ts:40` « Ta médiane », `:141` « Tu n'as pas placé … ».
- **Question à David** : « Quand l'élève construit une boîte à moustaches : après avoir posé la médiane, l'outil passe tout seul au trait suivant pas encore posé ; s'il n'y a qu'une boîte, toucher n'importe où dans le dessin vise cette boîte ; en cas d'erreur il lit « Ta médiane est à 12. » ou « Tu n'as pas placé le maximum. ». Ça te va ? » Réponses : (1) oui tel quel ; (2) oui sauf le passage automatique au trait suivant ; (3) revoir les phrases.

### programmes/arbre-des-notions.md:141 [D] — NON VÉRIFIÉ

- **Point** : couverture faible (primaire, collège, Tle techno) ; points ayant perdu leur seul exercice (2-232, TSPE-432, -466, -596).
- **À faire** (lecture prod) : `select p.grade, count(*) filter (where not exists (select 1 from question_template_points q where q.point_id = p.id) and not exists (select 1 from exercise_curriculum_points e where e.point_id = p.id)) as sans_contenu, count(*) from curriculum_points p where p.archived_at is null group by p.grade;` et la même chose pour les codes `2-232`, `TSPE-432`, `TSPE-466`, `TSPE-596`.
- **Question à David** : « Le CE1 a par exemple encore beaucoup de points du programme sans aucune question. On les couvre niveau par niveau (skill `couvrir-niveau`), dans quel ordre ? » Réponses : (1) primaire d'abord ; (2) collège d'abord ; (3) au fil des besoins de tes classes.

### programmes/arbre-des-notions.md:143 [D] — NON VÉRIFIÉ

- **Point** : 46 modèles valables pour un autre programme laissés sans tag.
- **Vu** : liste dans `docs/archive/wip/arbre-notions/modeles-autre-programme.csv` ; l'état actuel est en base.
- **À faire** (lecture prod) : pour les 46 identifiants du CSV, `select template_id, count(*) from question_template_points where template_id in (…) group by template_id;` joint aux `grade` des points, pour voir s'ils ont reçu un tag 1re techno / ens. sci. depuis.
- **Question à David** : « Un modèle de 1re générale sur les pourcentages servirait aussi en 1re techno. On lui ajoute le point de 1re techno (il apparaîtrait aux élèves de techno), ou on attend d'avoir des classes de techno ? » Réponses : (1) taguer maintenant ; (2) attendre ; (3) taguer seulement ceux sans retouche (7 « tag par variation »).

### programmes/arbre-des-notions.md:151 [D] — VRAI (pour le code ; le nombre 51 NON VÉRIFIÉ)

- **Point** : 51 exercices ne sont rangés nulle part ; aucun écran ne range un exercice.
- **Vu** : dans `src`, `exercise_classifications` n'est lu qu'à un endroit (`src/routes/(protected)/dashboard/teacher/contenu/exercices/[id]/+page.server.ts:87`, `.select('node_id')`) ; aucune écriture hors migrations.
- **À faire** (lecture prod, pour le nombre) : `select count(*) from exercises e where not exists (select 1 from exercise_classifications c where c.exercise_id = e.id);`
- **Question à David** : « 51 exercices rédigés ne sont rangés sur aucune notion, donc on ne peut pas leur attacher de point du programme, et il n'existe pas d'écran pour les ranger. On fait un écran de rangement des exercices (comme pour les modèles), ou on les range une fois pour toutes par migration ? » Réponses : (1) écran de rangement ; (2) migration ponctuelle ; (3) laisser.

### programmes/transcriptions-du-bo.md:76 [D] — VRAI (suivi perdu)

- **Point** : à relire par David : tableaux éclatés du cycle 2, `2.md` (fractions p. 5, vecteurs p. 9), titres ambigus 1_TECHNO / T_TECHNO.
- **Vu** : fichiers présents (`src/lib/server/programmes/transcriptions/2.md`, `1_TECHNO.md`, `T_TECHNO.md`, `cycle-2/`). La ligne de `docs/wip/verifications-manuelles.md` (#1688) a été sortie par `84f27fc894` : l'affichage est automatisé (`e2e/verifs/pages-prof-admin.spec.ts:505,534`), mais le « choix à confirmer » n'est plus suivi nulle part (`grep -rn "éclatés" docs/wip docs/ecarts e2e` ne trouve que la recollecte). Le renvoi de `transcriptions-du-bo.md:76` vers `verifications-manuelles.md` est donc périmé.
- **Question à David** : « Dans le programme du CP au CE2 affiché sur le site, les grands tableaux du BO ont été transformés en titres et listes (plus lisibles au téléphone, moins fidèles). Et trois passages sont à relire contre le PDF : fractions p. 5 et vecteurs p. 9 de Seconde, titres des pages 8-11 des programmes techno. Tu valides le choix des listes, et tu veux relire ces trois passages ? » Réponses : (1) listes validées, je relis ; (2) revenir à des tableaux ; (3) plus tard (on remet une ligne dans `verifications-manuelles.md`).

### srs.md:469 [M] — VRAI

- **Point** : `reviewedToday` sans appelant hors tests.
- **Vu** : `src/lib/server/course-card-attempts.ts:94` `export function reviewedToday` ; `grep -rn reviewedToday src --exclude-dir=__tests__` ne trouve que sa définition.
- **Registre** : M · révisions · une fonction « carte déjà révisée aujourd'hui » existe mais rien ne s'en sert · commande `test -f src/lib/server/course-card-attempts.ts && { ! grep -q "export function reviewedToday" src/lib/server/course-card-attempts.ts || grep -rl "reviewedToday" src --include=*.ts --include=*.svelte | grep -v __tests__ | grep -vq course-card-attempts.ts; }` → exit 1.

## Vu en passant

- `docs/systeme/questions.md` § Écarts connus, puce « Évaluations notées » : périmée depuis Q42 (instance figée), à réécrire en « repli pour les tentatives d'avant Q42 ».
- `docs/systeme/programmes/transcriptions-du-bo.md:76` renvoie à une ligne de `verifications-manuelles.md` qui n'existe plus.
- Numéros de ligne de `ubumark.md` dans la recollecte : décalés d'environ 75 lignes (section « Doutes et écarts connus » à 2105).
