# Chantier `verifs-auto` — automatiser les vérifications manuelles

## Reprendre ici

_Mis à jour le 2026-11-24, paquet 3 en cours (aucune PR ouverte)._

- **État** : paquets 1 (#3061) et 2 (#3064) mergés, 391 → 313 lignes. **Paquet 3 (23-25 octobre, 77 lignes)** en cours dans `../ubumaths-wt-verifs-tri-3` : part Atelier et prod faite et commitée ; agents constructions (27 tests) et opérations posées (12 tests) rendus, NON commités (`constructions.spec.ts`, `operations.spec.ts`) ; agent modèles de questions rendu (19 tests, `modeles-corrections.spec.ts`, NON commité, écarts E34 E35) ; agents pages démo/aide/dev et Mathoux en cours (`pages-demo.spec.ts`, `pages-prof-admin.spec.ts`, `mathoux-decorations.spec.ts`, `modeles-corrections.spec.ts`). Écarts E32 à E35 ajoutés.
- **Prochaine action** : rejouer chaque fichier d'agent, verdict par ligne (§ Tri — paquet 3), retirer les lignes sorties de `verifications-manuelles.md` (rien de retiré pour le paquet 3), revue `code-reviewer`, PR, merge.
- **En attente de David** : tâche de nuit (après R12) ; écarts E18, E19, E21-E33 (E33 : miroir de la carte sous WebKit, à voir sur son iPhone) ; barre qui saute de 37 px (§ #1469) ; un `tsconfig` pour `e2e/` dans la CI ; `locale: 'fr-FR'` pour les projets de `test:verifs`.
- **Pièges en cours** : `--output=<dossier>` par lancement ; `networkidle` avant un clic après `goto` ; gestes à deux doigts = `Fingers` (CDP, Android) ; présence notée une fois par jour et par processus du serveur ; agents sur des élèves distincts ; rouges sous charge → rejouer seuls ; types de `e2e/verifs` : `tsgo -p` d'un tsconfig limité ; ne JAMAIS changer l'attendu seul.
- **Worktree / branche** : `../ubumaths-wt-verifs-tri-3`, `test/verifs-tri-3`, serveur 5179. Reste `../ubumaths-wt-verifs-webkit` (seul `.svelte-kit`), à effacer avec l'accord de David.

## Tri — paquet 3 : lignes du 23 au 25 octobre (2026-11-24)

77 lignes. Worktree `ubumaths-wt-verifs-tri-3`, branche `test/verifs-tri-3`, serveur 5179. Cinq agents : opérations posées (élèves 21-25) ; constructions (01-03) ; pages démo / aide / dev / programme ; Mathoux (10-15) ; modèles de questions (16-20). La session : Atelier et prod.

- **Contre la prod** (`VERIFS_URL=https://chiph.re`, pages publiques, 2 workers) : `atelier-calcul` 70 verts, #1674, #1703, #1620 compris → la ligne « verifs-auto » et les lignes « test rouge » #1674, #1703, #1620 sortent.
- **Atelier** (`atelier-paquet3.spec.ts`, ordi, iPhone, Android) : #1663 (ordonnées exactes du tableau, minimum −1,5 ; l'exercice `fonctions/597` n'existe pas en local), #1656 (carte « Dériver » = `.dériver`, quotient réduit, signe devant), #1709 (infobulle « Les touches de calcul » du clavier de la console), #1710 (rien ne déborde au téléphone), #1684 (tracée pour x > 0, vu) ; #1673, #1624 déjà couverts.
- **Écart** : E32 (formules lues en anglais par les lecteurs d'écran, balises SSML comprises).
- **Remarque outillage** : les projets de `pnpm test:verifs` tournent en `en-US` (défaut de Playwright) ; MathLive suit la langue du navigateur (infobulles en anglais dans les tests, en français chez un élève). À proposer : `locale: 'fr-FR'` dans `e2e/verifs/projets.ts`.
- **Restent tels quels** : #1784 (question à David : les réponses « domaine gardé » de `.développer`), #1682 et #1625 (mis de côté par David), #1692 (proposer la suppression de la table du tableur V4 : migration destructive, à David), #1594 (Brevo), #1712 (relecture du lot A1 du CP).

## Tri — paquet 2 : lignes du 17 au 22 octobre (2026-11-24)

44 lignes. Worktree `ubumaths-wt-verifs-tri-2`, branche `test/verifs-tri-2`, serveur 5179. Trois agents (gamification ; connexion, QR, constructions ; programme, fiches, unités) sur des élèves distincts ; la session fait les lignes Atelier.

- **Suite Atelier sur 4 navigateurs** (ordi Chrome, ordi Safari, iPhone, Android) : 556 verts, 4 rouges sous la charge des agents (#1368, #1369, #1374, #1404), verts rejoués seuls.
- **Gestes à plusieurs doigts** : `Fingers` (`atelier-tactile.spec.ts`) envoie de vrais événements tactiles par le protocole de Chromium (Android seulement ; WebKit n'en a pas) : pincement (AB passe de 45 à 141 px), glisser à deux doigts, Déplacer à un doigt.
- **Sorties Atelier** : #1540 (toile, barre dessous qui défile, deux doigts avec un outil sans rien écrire, Déplacer, Segment et Milieu par appuis, téléphone couché), #1546, #1536, #1538 (outils au doigt : Segment, Milieu ; le reste vert en émulation téléphone), #1472 (≥ et “ ” dans ET), barre d'icônes (Safari, iPhone : téléchargement et choix de fichier, au doigt), console (touche sous Échap : `IntlBackslash` si le navigateur se dit Mac, `Backquote` ailleurs ; poignée glissée ; « --> » orange ; boutons au survol ; téléphone : plein écran, « Tracer » du menu la referme — l'œil de la carte trace sans changer de vue, voulu C3), cartes lot 3 (phrase de f′ au toucher), lecture graphique (losange au doigt ; sombre lisible, sauf E28), Annuler / Rétablir lot 5 PR 1, 2, 3 (`atelier-annuler.spec.ts`, 4 navigateurs ; PR 3 aussi par `atelier-barre` et les tests de composant `remplacer`, `rejeu`).
- **Réduite** : #1473 → vrais fichiers sortis d'Excel (Windows) et de LibreOffice (aucun des deux sur le Mac mini ; le test reproduit leurs octets) ; le choix de fichier au doigt est testé.
- **Écart** : E28 (étiquettes de la lecture graphique superposées quand f(x) ≈ 0).
- **Agents, rejoués par la session** : QR, connexion, constructions (38 verts) ; gamification (19 verts, 2 sautés voulus : la présence n'est notée qu'une fois par jour et par serveur) ; programme, fiches, unités, modèles (37 verts).
- **Sorties (31)** : #1615, #1599/#1600, #1588, #1587, #1579, #1578, #1577, #1581, #1583, #1573/#1574, #1568/#1569, #1563, #1546, #1540, #1539, #1472, #1460-#1462, #1465, barre d'icônes, console, cartes lot 3, #1490, lecture graphique, Annuler/Rétablir PR 1-3, QR lots 1 et 2, #1536, #1538, #1589. **Périmé** : Palotin triste et « tu m'as manqué » (`3620df136c`, R2 du 2026-11-12, retour joyeux après un jour travaillé) ; « Constance Royale : 0 semaine » (R1) ; « plus de lien » sous les cartes du deck (#1589 l'a remis) ; « Ce lien est trop long » (#1539 : lien court). #1461 : « Avec réponses » de l'élève en paysage, comme le dit `docs/systeme/fiches-et-pdf.md`.
- **Réduites (13)** : pour David, #1592 (Dashboard Supabase de prod), #1585 (OVH, facultatif), #1534 (QR imprimé en noir et blanc), #1564 (modèles vus en prod, CE1 réel), numérotation (relecture des renvois du 23/09 au 18/10), #1473 (vrais fichiers Excel / LibreOffice) ; faisables par la session plus tard : #1582, #1580, #1575, #1471, #1484, #1493/#1494, #1498 (états de jeu à poser).
- **Écarts** : E29 (« Sa panse est pleine » jamais affiché), E30 (« Enonce » sans accents), E31 (message de `36, mm`).
- **Types des tests e2e** : `e2e/` n'est pas dans le `tsconfig` du projet : ni `check:incremental` ni la CI ne vérifient les types de `e2e/verifs` (Playwright transpile sans contrôle). Vérifié à part (`tsgo -p` d'un tsconfig limité à `e2e/verifs`, `types: ["node"]`) : 3 erreurs corrigées (une du paquet 2, deux d'avant). À proposer à David : un `tsconfig` pour `e2e/` dans la CI.
- **Revue `code-reviewer` (Sonnet)** : aucun bloquant ; corrigés : réglages d'origine rendus seulement s'ils ont été lus (classe DEVLOCAL, tailles de texte), tables non photographiées laissées, saut de #1599 seulement si CE processus du serveur a déjà noté l'élève (repère `.captures/verifs/presence/<pid>-<jour>-<élève>`), `programme` et `fiches-2` en série, profil absent dit clairement. Laissés : attentes fixes avant une absence de bulle (gamification, modèles), sélecteurs `.figure svg text`, `#classCode`.
- **Base locale** : l'agent gamification a lancé deux fois ses tests en même temps ; il a remis à la main l'état d'eleve10 à eleve15 (pansées, séries, gidouilles), un résidu possible dans `student_point_state` / `skill_attempts` de ces élèves fictifs.

## Tri — paquet 1 : lignes du 13 au 16 octobre (2026-11-23)

53 lignes. Worktree `ubumaths-wt-verifs-tri`, branche `test/verifs-tri`, serveur de dev 5178, base locale (`db:seed-riche`).

- **Sorties, par un test (nouveau ou existant), vert sur ordinateur, iPhone et Android** : #1292, #1417, #1427, #1410, #1434 (`atelier-tactile.spec.ts` : cibles ≥ 24 px, `tap`, guillemets courbes d'iOS) ; #1422 (nom lu « A4 : 2/3 », formule dans sa ligne, carte d'une liste à formules, confirmation de suppression) ; #1411 (ordi Chrome et Safari : collage d'un tableau, copie à virgule, ⌘C/⌘V garde `=1/3`, flèches après ⌘C, CSV avec BOM et « ; ») ; #1303, #1295, #1308 (`changement-de-compte.spec.ts`, Chrome et Safari, comptes élèves locaux) ; #1307 et #1674 verts depuis E10 (#3054) ; #1333, #1369, #1375, #1442 (tests R6 verts sur les téléphones).
- **Sorties par les tests unitaires de leur PR, rendu vu dans l'Atelier** : #1201, #1212, #1215, #1283, #1329, #1377 (décimal à virgule : oui) ; #1262 (cas `\ln|x|` et `2|x|` ajoutés à `answer-validator-vert.test.ts`) ; #1410 (ancien atelier : `grille.test.ts` § 7) ; #1439, #1444.
- **Sorties à l'œil de la session** : #1415 (±600 : plus aucune asymptote, étiquettes en fractions dans leur boîte), #1442 (vue Graphe au téléphone), #1375 (étapes clair et sombre, iPhone). #1421 mesuré : la case suit dès l'image suivante, aucune tâche longue.
- **Sorties avec un écart** (dans [ecarts-verifs-progress.md](ecarts-verifs-progress.md)) : #1294 → E21 (aucune énigme publiée en prod, la tâche tourne) ; #1388 → E22 (croix « Fermer » 16 px), E23 (consigne coupée au téléphone), E24 (clavier MathLive sur le champ de la console) ; #1377 → E25 (exemple fixe « 2x × 3 = 6x ») ; #1358 → E26 (cadres décalés au toucher sur `/demo/structure`).
- **Sorties par l'agent chapitres/figures, rejouées par la session (5 verts)** : #1341 (`figures.spec.ts`), #1387, #1390/#1392, #1394 (`chapitres.spec.ts`, données « Verifs … » créées puis effacées ; PDF orphelins dans le stockage local).
- **Sorties par l'agent fiches, rejouées par la session (19 verts, `fiches.spec.ts`)** : #1280→#1297 (polices du corrigé lues par poppler, image vue), #1344, #1352, #1370, #1379, #1386, #1396, #1428, #1429, #1433/#1438, #1441/#1443, #1445/#1446, #1454, #1457 (prof). **Périmé par l'ADR 0030** (`cd714d6170`, 2026-10-15) : numérotation romaine, case « afficher les points », styles Contrôle/Examen/Devoirs/Quiz ; le test suit la décision. Écart E27 : titre d'exercice à formule brut chez l'élève.
- **Réduites, faisables par la session plus tard** : #1348 (lot ZIP par élève), #1389/#1396 (cahier de texte partagé, page à jeton).
- **Restent pour David** : #1457 (PDF 18 pt imprimé) ; #1385 (vrai clavier d'iPhone) ; #1450, #1451/#1452 (fiches T_COMP toujours en brouillon en prod, retouchées le 2026-11-22 : relecture du contenu et publication = David).
- **Remarque** : iPhone 15, Atelier vide, console ouverte : l'historique n'a qu'environ 120 px de haut (une étape à la fois).

## #1469 sous Firefox (2026-11-23)

Pas un écart moteur à tolérer : un vrai bug, visible par un élève sous Firefox.

- **Cause** (sonde `pointerdown` / `pointerenter` / `pointerup`) : A1 en « Nombre » montre « Décimales » dans la barre de mise en forme ; le clic sur A2 la retire, « Effacer la mise en forme » remonte d'une ligne (barre 68 → 32 px, sous-barre 29,6 → 28 px) et la grille monte de 37,6 px sous la souris encore appuyée. Firefox envoie alors `pointerenter A3, buttons=1` sans mouvement, puis `pointerup` sur A3 : `enterCell` étendait la zone. Chrome n'envoie `pointerenter` qu'au prochain mouvement réel.
- **Correctif** (`DataView.svelte`) : le glisser ne commence qu'à 4 px (`DRAG_START`) du point d'appui (`pressedAt`), oublié ensuite. Tests unitaires : pointeur immobile → pas de zone (rouge avant) ; pointeur glissé → zone.
- **Reste, question pour David** : la barre saute toujours de 37 px au clic (désagréable aussi sous Chrome). La stabiliser (« Décimales » toujours là, grisée quand le format n'en a pas) est un choix d'interface, non fait.
- **#1424 poignée, rouge sous Firefox sur `main`** (déjà rouge sans le correctif) : `scrollIntoViewIfNeeded` centrait A8 sous Firefox, A2 et sa poignée sortaient de la grille, le pointeur appuyait sur une case. Geste du test : `scrollIntoView({ block: 'nearest' })`, attendu inchangé. Vert sur les 5 projets.

## Rouges WebKit (2026-11-23)

Gestes des tests seulement, attendus inchangés :

- **Clavier MathLive au toucher** (`waitVirtualKeyboard`) : au focus d'un champ, MathLive ouvre son clavier, et le champ perd puis reprend le focus (sonde `focusin`/`focusout` : clignement à `mathVirtualKeyboard.visible = true`). Lot 3 ligne 368 (iPhone, 2 sur 16 sous charge) : le champ déjà vidé était rangé vide à la sortie, la courbe disparaissait ; 0 sur 32 après. #1385 iPhone : « résoudre » perdait ses premières lettres (« dre »).
- **`typeMath`** : après un rechargement, MathLive perd parfois plusieurs frappes (« ex2=4 », « + » au lieu de « 2+ », ordinateur aussi) : 1er caractère seul, recommencé sur un champ vidé sans touche (sous Safari, Retour arrière hors du champ revient à la page précédente : page blanche), puis le reste.
- **`gotoRedirected`** : attend le `load` du document d'arrivée et le réseau calme. `toHaveURL(/\/atelier/)` était déjà vrai sur l'adresse d'avant, et SvelteKit relit `__data.json?…x-sveltekit-invalidated` au démarrage : la page suivante interrompait la redirection (#1340, #1692).
- **Barre d'icônes au téléphone** : les annonces empilées couvrent les cartes, et sonner arrête leur minuteur sous la souris de Playwright (écartée, WebKit iPhone ne le voit pas toujours). Le test les balaie, comme au doigt (E18).
- **Revue `code-reviewer` (Sonnet)** : cas frères corrigés (`typeInMathConsole` d'`atelier-calcul`, `3*4` de #1423 : clavier attendu), `arrived` de `gotoRedirected` sans rejet orphelin. Copie de `typeMath` dans `captures/` : clavier attendu aussi (captures iPhone). Laissé : `Alt+Tab` conditionné au moteur et non à l'OS (Mac mini seul).
- **Capture #1385 (iPhone)**, rouge avant cette PR (3 sur 3) : le bouton clavier au bout du champ d'une carte est recouvert par son contenu sous WebKit. Geste de l'élève au toucher : il touche le champ, le clavier s'ouvre seul (`focusCardField`). Image vérifiée : clavier de la carte, sans « Commandes ».
- **E16** (Tab sans focus sur un bouton sous Safari, laissé) : sous WebKit, le test fait ⌥ Tab, le geste de l'utilisateur de Safari.

## Phase 0 (validée le 2026-10-25)

- Lignes Atelier : test qui tape la commande dans `/atelier` (sans compte) et lit la réponse **affichée** ; les « pas … » deviennent des assertions ; refus → message de refus visible.
- Ligne mixte calcul + œil : le calcul passe en test, le visuel reste dans la liste.
- Test rouge : bug réel ou ligne périmée → signalé à David, attendu jamais modifié pour passer.
- Titre de test = n° de PR de la ligne. Ligne entièrement couverte → **sort** de `verifications-manuelles.md`.
- Exécution : **à la demande, en local** (`pnpm test:verifs`, Chromium, serveur de dev), pas en CI.
- Pilote : un lot d'environ 20 lignes, une PR, revue `code-reviewer` (Sonnet).

## Pilote — lignes retenues (n° de PR des lignes)

#1717, 5f-5 (#1743), M2 (#1749), #1674, #1682, #1656 (partie console), #1658/#1660, #1625, #1302, #1319, #1502, #1345, #1350, #1351, #1362/#1363, #1364, #1365, #1372, #1371, #1373, #1655 (partie console).

## Lot 2 — lignes retenues (2026-10-25)

#1253, #1278/#1279, #1282, #1300, #1321 (sans le clavier), #1483, #1326, #1329 (sans la correction générée), #1333 (sans le grapheur), #1334, #1347/#1349, #1353/#1357, #1361. Écart vu par la sonde : `.latex` seul → l'Entrée complète la commande (la ligne datait d'avant la complétion) ; David l'a vu, le test joue les deux Entrées.

## Lot 3 — lignes retenues (2026-10-25)

5f-4, Q50 (#1735), Q51-Q52 (#1741), #1710 (sans la lisibilité sur téléphone), #1709 (sans l'infobulle du clavier), #1708 (sans la correction d'un modèle d'essai), #1703 (sans la carte f′), #1663 (console seule), #1673 (console seule), #1620 (console seule), #1624 (sans le mode décimal), #1628, #1631, #1636 (console seule). Sonde : AUCUN écart avec les lignes, sauf `each_key_duplicate` sur « Comment ? » de `.dériver x/(x+1)`, `.dériver x\ln(x)` et `.dériver 2^(x^2)` (cette dernière ligne ne demande que la réponse : test vert).

Vu en passant, hors des lignes (à montrer à David, rien changé) : `.intégrer -0,6x+1,2` → la ligne dit $-0{,}3x^2 + 1{,}2x + C$, la dernière étape $1{,}2x - 0{,}3x^2 + C$ ; `.résoudre (x-0,5)/(x+1)>0` → « P(x) = 2x − 1, Q(x) = 2x + 2 » (multipliés par 2) et l'étape 1 d'une inéquation rationnelle explique « Une inéquation du second degré s'écrit… » ; `.résoudre |x/2-0,5|=1` → la branche réécrit x/2 en $0{,}5x$ dès l'étape suivante.

## Lot 4 — lignes retenues (2026-10-25)

Cartes : #1305 (sans `a = 3 sur 4`, à trancher), #1307, #1309, #1315 (thème clair ; sombre et /grapheur restent), #1328 (sans le dessin ni les 3 étapes dans Calcul), #1337, #1338 (sans le gris de y = x), carte f′ et bouton « Dériver » de #1703. Sonde étendue : `CARTES` après chaque ligne, `@Réciproque f` pour un clic de menu.

Écarts vus (rien changé, à David) : `f(1)` de `max(2,5 ; x)` → 2,5 (la ligne : 5/2) ; carte `g(x) = f(x)+1` sans intervalle affiché (le Graphe l'applique) ; `.réciproque sin` demande des parenthèses ; `a = 3 sur 4` en erreur. Nouveau cas `each_key_duplicate` : « Comment ? » de `.résoudre f(x)=4` avec f sur `[0;+∞[`. Vu en passant : la légende du tableau de variations dit « Tableau de variations de la fonction x » (au lieu de f).

## Lot 5 — vue Données et « Propriétés » (2026-10-26)

Lignes : #1410 (sans statistiques / nuage / diagramme de L, ancien atelier, tablette), #1413 (sans la note du diagramme), #1421 (sans « sans saccade » ni la carte calculée), #1422 (partie « Valeur exacte » et π), #1424 (sans poignée, copier-coller, partage), #1426 (sans Ctrl+Z), #1427 (sans tablette), #1430, #1431, #1432, #1434 (sans iPad), #1437 (sans le partage), #1444 (sans Tabuler de f_1 ni u_1), #1472 (sans iPad), #1477 ; `atelier-proprietes.spec.ts` : #1630 (sans téléphone), #1634 (sans le rendu). #1430, #1431, #1432, #1477 sortent de la liste.

Outillage : `helpers/grille.ts` (taper une case par la barre, lire son nom accessible, « Valeur exacte », la note, l'aide) ; `data-latex` posé sur la case écrite en maths, sur « Valeur exacte » (`DataView.svelte`) et sur les valeurs du panneau « Propriétés » (`ObjectProperties.svelte`) — la phrase du lecteur d'écran est en anglais (« one quarter ») ; sonde : `#A1 =…`, `?A1`, `~A1 =…`, `!Données`.

Écarts (à David, rien changé côté appli) :

1. **#1413, test rouge** : « Ajustement avec M » crée une carte f qui montre `2 × x + 1` ; la console dit `f(x) = 2x + 1`.
2. **#1422** : `=2/3` s'écrit en texte « 2/3 », pas en fraction — voulu par une PR suivante (`latexOf`, `formula.ts` : « une fraction en maths débordait de la ligne ») : ligne périmée ? Pas testé.
3. **#1410** : « « Annuler » du message remet L » — plus de message ; ↶ « Annuler : retirer le nom de la colonne A » remet L. Le test passe par ↶.

**Écarts tranchés par David (2026-10-26)** : les 3 recos acceptées — #1413 = bug à corriger (PR à part) ; #1422 et #1410 = lignes périmées, à récrire. « Valeur exacte » en anglais : futur petit chantier d'accessibilité (langue de la lecture vocale MathLive, console probablement aussi — non vérifié), pas maintenant.

Vu en passant : « Valeur exacte » est lue en anglais par un lecteur d'écran (`convertLatexToSpeakableText` de MathLive, « the square root of 2 ») ; #1427 parlait d'un formulaire dans la carte, c'est une fenêtre (Dialog) et la phrase « colonnes A et B (11 lignes) » est bien dans la carte.

## Lot 6 — écarts (b) et (c), Graphe, Géométrie, reste de Calcul (2026-10-26)

Lignes : #1422 (`=2/3` en texte, testé) et #1410 (↶ et Ctrl+Z remettent L) récrites ; Graphe #1400, #1401, #1402, #1405 (`atelier-graphe.spec.ts`, ligne sortie) ; Géométrie #1536, #1538 sans la tablette (`atelier-geometrie.spec.ts`) ; Calcul #1784 (sans « domaine gardé » à l'écran), #1684 (sans le tracé x > 0), #1617 (sans la cohérence du résumé), #1375 (sans thèmes ni téléphone), #1366, #1503 (sans le × du champ), #1535 (sans le rejeu de fichier), #1342, #1367, #1368 et #1369 (sans le clavier MathLive), #1374, #1404, #1417 (sans le collage ni la flèche au doigt). #1342, #1366, #1374 sortent. La ligne #1366 était cassée en deux dans le tableau (`\f` de `$\frac00$` lu comme saut de page).

Outillage : Graphe = 10 clics « Zoom arrière » (±577), asymptotes comptées par leur `stroke-dasharray` (5,5 verticale, 8,4 horizontale ; un trait horizontal est « caché » pour `toBeVisible`, on compte), une asymptote horizontale attendue avant de compter « 0 verticale » ; Géométrie = clic en coordonnées du repère (origine au centre, `min(l, h)/13` px par unité), lignes lues dans l'historique console FERMÉE ; presse-papiers par `grantPermissions`.

Écarts (à David, rien changé côté appli) :

1. **#1367** : « Dériver » sur `f(x) = a x`, `a` non défini → carte f′ « En attente de « a » », sans formule (la ligne : f′(x) = a) ; avec `a = 2`, f′ = 2. Alors que `.intégrer` de `e^{a x}` calcule avec `a` symbolique.
2. **#1369** : `sinus` n'est pas refusé mais lu i·n·s²·u : « lu normalement » ?
3. **#1404** : « l'image de 2 sur la carte f′ » : plus de champ d'image sur la carte (décision du 2026-10-18) — ligne périmée ?
4. **#1617 et #1620 rouges depuis #1807** (tidy-conditions, mergée pendant le lot) : `.simplifier (x^2-1)/(x+1)` et `.simplifier x/x` laissent la fraction (bouton « Simplifier pour x ≠ … ») ; les lignes demandaient `x − 1` et `1` avec leurs étapes. Attendus non changés, à David.
5. **Bug, #1422 rouge par intermittence (suite complète)** : la grille saute de 32 px selon que la case choisie a une « Valeur exacte » ou non (A1 = √8 : A1.y 376 ; A2 = 5 : 344). Pendant un clic, la grille bouge sous le pointeur enfoncé → zone A2:A3 au lieu de A2. Un élève qui appuie un peu longtemps l'aurait aussi. Correctif probable : réserver la ligne sous la barre (comme la consigne de la Géométrie). Test non masqué.

Vu en passant : le menu « Options » d'une carte k dit « Résoudre f(x) = 0 » (pas k) ; les 6 premiers tests d'une suite complète lancée juste après un commit expirent dans `openAtelier` (serveur de dev à froid) — relancer.

## Écarts du lot 6 tranchés par David (2026-10-26)

Mes recos acceptées : (1) #1367 ligne périmée : f′ attend `a` comme f ; `.dériver a x` → `a` en console ; (2) #1369 `sinus` : seul le non-refus est testé, pas de chantier ; (3) #1404 périmée : `f'(2)` → 12 en console ; (4) grille qui saute → PR de correctif à part, test rouge d'abord ; (5) #1617/#1620 récrits selon #1807 (bouton « Simplifier pour x ≠ … » → résultat, sa condition, ses étapes ; `.factoriser (x^2-1)/(x+1)` et `(x^2-1)/(x+1)+1` aussi) ; libellé « Résoudre f(x) = 0 » de la carte k → même PR que (4). Lot 7 = (1), (3), (5) ; #1367 et #1404 sortent de la liste.

## Écarts tranchés par David (2026-10-26)

L'Atelier a raison, les lignes étaient périmées ou imprécises : #1305 `a = 3 sur 4` → carte rangée en erreur, sans refus d'intervalle ; #1309 `f(1)` → 2,5 (décimal tapé → décimal) ; #1337 l'héritage se lit par `.domaine g` (« ensemble hérité »), le champ ne montre que l'ensemble propre (décision d) ; #1338 `.réciproque sin(x)` (`sin` seul refusé depuis le 2026-10-06) ; #1620 `.dériver x^x` → `x^x(ln(x)+1)`, ordre de l'Atelier. #1305, #1309, #1337 sortent de la liste.

## Lot 8 — console, réglages, historique, cartes valeur (2026-10-26)

Lignes (`atelier-console.spec.ts`) : #1289 (sans `1/2 m`), #1296 (sans la durée), #1301, #1292 et #1313/#1318 (sans la lisibilité), #1340, #1356 (sans « Repartir de zéro »), #1385 et #1388 (sans téléphone, clavier virtuel, thèmes, VoiceOver), #1423, #1425, #1442 (sans la lisibilité du Graphe à 390 px), #1692 (sans le rappel de la table `spreadsheets`), #1807, #1811 (sans téléphone), « console de l'Atelier » (sans Safari, Mac AZERTY, PC, glisser, téléphone, couleurs). #1301, #1340, #1423, #1425 sortent de la liste.

Outillage : `typeInCard` passe dans `helpers/atelier.ts` ; « Écriture mathématique » choisie par la fenêtre Réglages ; MathLive perd la première frappe juste après un rechargement ou un changement de réglage → `typeMath` recommence tant que le champ reste vide ; « pas de menu au clic droit » vérifié contre un témoin (un `math-field` ordinaire posé dans la page, dont le menu s'ouvre — en dernier : il ne se referme pas à Échap) ; la pastille de la console est la description du bouton (« 1 nouveau résultat »), hors du bouton.

Écarts (à David, rien changé côté appli) :

1. **#1296** : `d = 1 h 30 min * 2` refusé depuis #1562 (« Durée composée collée à × ou ÷ ») ; dans une définition le refus est générique (« n'est pas une expression valide »), sur une ligne de calcul il dit d'écrire `2*(1 h 30 min)`. Ligne périmée ; le message générique de la définition, à corriger ?
2. **#1289** : au vrai clavier, `1/2 m` dans une carte valeur → $\frac{1}{2\,m}$ = 0,5 m⁻¹ (MathLive met « 2 m » au dénominateur).
3. **#1356** : « Repartir de zéro vide tout » — la console garde ses lignes depuis le 2026-10-19 (#1530) : ligne périmée.

Vu en passant : `n = 1` → « n est réservé » (variable des suites) ; `.exporter` n'écrit pas de ligne, il le dit sous la console (« Historique exporté : … ») ; au téléphone, la barre d'icônes est passée SOUS « Mes objets » (la ligne #1442 parlait de « Partager… / Réglages » en haut).

## Écarts du lot 8 corrigés (2026-10-26, David : « corrige les écarts »)

1. **#1296** : la carte refusée dit maintenant l'aide du parseur, comme la ligne de calcul (`invalidExpressionMessage`, `parse.ts` ; `knownFrench`, `french-errors.ts`) : `« 1[h] 30[min] * 2 » n'est pas une expression valide. Durée composée collée à × ou ÷ : écris 2*(1 h 30 min)…`. Vaut pour toute aide précise (`x^^2` → « Il manque l'exposant après ^. »), pas pour une position seule (`a = 3 sur 4` → « « 4 » inattendu ici », trompeur : #1305 inchangé) ; « Unexpected token in atom: EOF » se traduisait « « EOF » inattendu ici » → « Expression incomplète ». Ligne récrite : `(1 h 30 min) * 2` retouchée reste 3 h.
2. **#1289** : un VRAI bug, masqué par mon geste. Tapé `1/2`, →, ` m`, MathLive écrit `\frac12\,m` (forme compacte, sans accolades) : la carte le lisait 1/2 × m, « En attente de m ». `naturalQuantityLatex` (`mathfield.ts`) lit aussi `\frac12`. Reste connu, d'avant : `2\frac12\,m` et `\frac12\,3\,m` se recollent (21/2 m, 1/23 m), avec ou sans accolades.
3. **#1356** : ligne périmée, récrite : « Repartir de zéro » vide les cartes, la console garde ses lignes, après rechargement aussi.

#1289, #1296, #1356 sortent de la liste.

## Lot 9 — cartes, lecture graphique, barre d'icônes, Données, Grapheur, Python (2026-10-26)

Lignes : cartes de fonction (lot 3, sans le toucher iPad), cartes valeur / suite / liste (lot 4a), cartes point et courbe (lot 4b, sans ce qui est passé dans Propriétés), lecture graphique (sans iPad ni thème sombre), barre d'icônes (sans Safari ni iPad), #1530, #1412, #1439 (sans VoiceOver), #1469 (sans la lisibilité des couleurs ni le téléphone), #1473 (fichiers fabriqués, sans iPad), #1415-#1419 (sans « plus de trait isolé »), #1627, #1546 (390 px émulés), #1697, #1746. Sortent : #1746, #1627, #1412, lot 4a, #1530. #1417 non traitée (coller dans un message, flèche au doigt : à la main).

Outillage : `retypeCard` / `fieldValue` (vider le champ jusqu'à ce qu'il le soit, MathLive perd le premier geste) et `chooseSetting`, `mathConsole`, `mathValue` passent dans `helpers/atelier.ts` ; `nameColumn` dans `helpers/grille.ts` ; nouveaux `atelier-barre.spec.ts` (fichiers téléchargés puis rechoisis par la fenêtre du système) et `python.spec.ts` (un nouvel onglet = une nouvelle page du contexte). « Rien de rangé pendant la frappe » se prouve par Échap (la valeur d'avant revient) : un clic dans la console range la carte. Thème sombre : `emulateMedia` (ModeWatcher suit le système).

Écarts (à David, rien changé côté appli) :

1. **Bug probable, `/python`** : sans compte, le code tapé n'est rangé qu'à Ctrl+S (`bind:value={pythonStore.code}` ne passe pas par `setCode`, donc pas de `saveToStorage`). Perdu au rechargement, et Q1 de #1697 (« Remplacer ton code ? ») ne se déclenche jamais avec du code tapé. Vérifié : après Ctrl+S, la question apparaît. Test Q1 rouge.
2. **Bug probable, Partager** : un atelier qui n'a que la grille ne se partage pas (« Ton atelier est vide », `atelier.objects.length === 0`), alors que Repartir de zéro et Enregistrer comptent la grille. Les tests #1469 et #1439 posent une carte `k = 1` avant le lien.
3. **Message faux** : « Charger cet atelier ? » dit « ton objet sera remplacé, et l'historique effacé » ; la console garde ses lignes (décision du 2026-10-19, testée).
4. **Lot 4b, ligne périmée ?** : nature au bout, valeur en gris, équation de `d = (AB)`, ⋮ → Étiquette : passés dans Propriétés (5490181c2, 5c46e243c).
5. **Lot 3, ligne périmée** : « Image d'un nombre » retirée du menu exprès (0a099ddb6).
6. **#1530, ligne imprécise** : `X suit B(10;0,5)` est la réponse de la console ; tapé, il est refusé par « Il manque « ) » » (message trompeur). Le test tape `.binomiale X 10 0,5`.
7. **#1439** : sur Mac, ⌘Y ne rétablit pas (le code lit `ctrlKey` seul) ; Ctrl+Y et ⌘⇧Z, oui.
8. **Grapheur** : l'asymptote de `1/(ln(x)−1)` est étiquetée « x=2.718 » (point décimal ; « y = e », lui, est écrit « e »).

Vu en passant : un CSV se pose à partir de la case choisie (« posées à partir de A1 » seulement si A1 l'est) ; des décimaux à point (Google Sheets) restent affichés « 2.25 » dans la case (calculés comme nombres) ; `.exporter` puis rejeu d'un historique qui contient un chargement : le rejeu s'arrête à la « rupture » sans le dire ; `u(0) = 3` tapé dans la console répond « false » (une comparaison), le premier terme se règle dans la carte ; une suite qui se cite elle-même ne passe pas en Explicite (refus avec sa raison).

## Écarts du lot 9 tranchés et corrigés (2026-10-26, David : « je suis tes recos »)

1. **`/python`** : `code` devient un accesseur du store ; chaque écriture (dont `bind:value` de l'éditeur) range un BROUILLON dans le navigateur après 500 ms, sans toucher `_lastSavedCode` (`isModified` garde son sens pour « Charger un exemple »). Le code survit au rechargement, Q1 se pose : test Q1 vert, rechargement testé.
2. **Partager / Enregistrer** : une grille seule n'est plus « vide » (`atelier.isBlank`, comme Repartir de zéro). Enregistrer avait le même défaut, corrigé avec. Le `k = 1` des tests #1469 et #1439 est retiré.
3. **Confirmation de Charger** : « Ton objet sera remplacé. La console garde ses lignes ; celles du fichier s'ajoutent. » (`replacementLoss`, au lieu de la phrase du REJEU).
4. **Lot 4b** : ligne récrite, testée dans `atelier-proprietes.spec.ts` (nature, coordonnées de `I = milieu(A, B)`, équation réduite de `d = (AB)`, étiquette) ; elle sort.
5. **Lot 3** : « Image d'un nombre » retiré de la ligne.
6. **`X suit B(10;0,5)` tapé** : la console dit la commande (`typedLawRefusal`, `law-commands.ts`) : `.binomiale X 10 0,5`, `.geometrique`, `.exponentielle` ; pour N, l'écart type et non la variance.
7. **⌘Y** : laissé tel quel (⌘⇧Z sur Mac), ligne corrigée.
8. **Étiquettes d'asymptotes** : `valueLatex` (`asymptote-labels.ts`) reconnaît e et les multiples simples de π (`x = \frac{\pi}{2}`), sinon 4 chiffres avec la virgule décimale (`2{,}5`), verticales comme horizontales numériques.

#1697 et lot 4b sortent de la liste.

Revue (`code-reviewer`) : le brouillon venait de TOUTE affectation de `code` (exemple, fichier du cloud : il écrasait le code local que lit la migration) → accesseur dédié `editorCode`, lié à l'éditeur ; `destroy()` range le brouillon au lieu de le jeter ; le rejeu d'un historique vidait une grille seule sans demander → confirmation sur `isBlank` ; « Garder » d'une grille seule disait « rien à garder » → `MergeReport.grid`. Noté, pas corrigé (d'avant la PR) : un `saveTimeout` de `saveToStorage` en attente marque « enregistré » un code tapé juste après (`_lastSavedCode`), et un réglage (taille, thème) aussi ; `B(10,0,5)` sans séparateur lisible donne un conseil faux (rare).

## Lot 10 — captures « à l'œil » (2026-10-26)

Outillage : `playwright.captures.config.ts` (projet `comptes` : connexion par le formulaire aux comptes locaux de `dev_accounts.sql`, refusée hors localhost), `helpers/captures.ts` (`shoot`, `shootBothThemes`, `around`), `scripts/verifs-captures-page.ts` (page HTML autonome, images en data URI, verdicts dans la capacité `db`, file d'écriture avec nouvel essai). Pages déménagées : `/construction-demo` → `/constructions/essais` (prof), `/test-font` → `/dev/polices`, `/test-structure` → `/dev/structure` (admin).

Captures : Atelier (#1315, #1328, #1338, #1634, #1630, #1617, #1313/#1318, #1362/#1363, #1364, #1385, #1413, #1415-#1419, #1424, #1442, #1469), constructions (#1621 → #1653), `/dev` (#1793, #1798, #1312/#1322, #1346). Tests de restes : #1658/#1660 (bouton Variations), #1319, #1503, #1535, #1333 (grapheur), #1368, #1369 (mode maths), #1421, #1424, #1426, #1437.

## Lot 10 rejoué sur le code du 2026-11-23

David : « les captures et résultats du 26 octobre sont périmés », « juge les captures toi-même », « les lignes peuvent être anciennes, la vérif n'a peut-être plus lieu d'être ». L'ancienne page à cocher n'est plus utilisée.

- **Attendus changés, chacun par une décision écrite** : `.résoudre` répond par S (`S = {2}`, `S = ]-∞ ; 5]`, #2360, Q2 du 2026-11-03), 4e étape « ensemble des solutions » ; `.simplifier 0.5/x` → `1/(2x)` (Q9, 2026-11-02) ; `.simplifier ln(x^2)` a son bouton « Simplifier pour x > 0 » (#1819). Tests seuls réparés : étapes chargées à la demande, `combobox` des formats, bouton « Signaler » du serveur de dev masqué au téléphone.
- **Sorties de la liste (27)** : par les captures #1313/#1318, #1315 (et `/grapheur`), #1328 (+ test des 3 étapes), #1338, #1362/#1363, #1364, #1413, #1424, #1469, #1617, #1630, #1634, #1643, #1312/#1322 (formule grossie), #1346 ; par les tests #1658/#1660, #1319, #1503, #1535, #1368, #1426, #1437 ; #1466 (relecture d'une grille sans `formats` : `persistence.ts` `salvageFormats`) ; #1321, #1502, #1655, #1359 rejouées en local (composants réels, modèle local pour #1655). #1793/#1798 : vues par David sur iPad le 2026-11-09, captures retirées. #1385 réduite au vrai clavier d'iPhone.
- **Écarts à présenter à David** : déplacés le 2026-11-23 dans [ecarts-verifs-progress.md](ecarts-verifs-progress.md) (E1 à E11, mêmes numéros).
- **Restent dans la liste, faisables par la session plus tard** : #1421 (« sans saccade »), #1649 (lecture continue, construction publique sur chiph.re), reste de #1621/#1626/#1629.

## R6 — navigateurs du téléphone (David, 2026-11-23)

David : « tu parles de Safari mais pas des autres navigateurs », puis « pars sur les trois projets ». Sur iPhone, tous les navigateurs utilisent WebKit ; sur Android, Chrome / Samsung / Edge utilisent Chromium, Firefox utilise Gecko (Playwright ne simule pas le toucher de Firefox Android).

- **Décision (révisée, David « et le cas du desktop ? » puis « je valide »)** : cinq projets, toute la suite : **ordinateur Chrome/Edge** (Chromium, l'actuel), **ordinateur Safari** (WebKit), **ordinateur Firefox** (Gecko), **iPhone** (WebKit), **Android** (Chromium) ; plus **Firefox à 390 px** sur un sous-ensemble (clavier MathLive, graphiques, constructions).
- **Comportements validés (phase 0)** : `--project <nom>` pour un seul navigateur ; test sans sens au téléphone (`Ctrl+D`, survol) marqué « bureau seulement », sauté ailleurs, attendu jamais changé ; rouge propre à un moteur = écart soumis à David (candidat : verso de carte retournée en miroir sous WebKit, vu par `pnpm voir`) ; moteur absent → arrêt avec la ligne d'installation ; durées avant / après dans la PR ; R6 ne sort aucune ligne de la liste, le tri s'en servira.
- **Jour / nuit (David : « lancer la suite complète la nuit »)** : le jour, `pnpm test:verifs` = ordinateur Chrome seul (ou `--project`) ; `pnpm test:verifs:tout` = tous les projets. Tâche de nuit sur le Mac mini (`test:verifs:tout` sur `main`, base locale, notification seulement d'un rouge nouveau) : après R12, dont elle prend le filtre — à confirmer par David.
- **Ordre du découpage validé** (David, 2026-11-23, « je valide ») : R6 → tri des 391 lignes par paquets d'environ 50 (les plus anciennes d'abord) → R12 → R13.

## R6 — premier passage (2026-11-23)

- **Avant** (Chrome seul, ancienne config) : 150 tests, **2,9 min**, 5 rouges : #1674, #1703, #1620 (bug `each_key_duplicate` de « Comment ? », mis de côté), #1369 (écart 1/10), carnet #2731 (vert rejoué seul sous `with-db-lock.sh`).
- **`test:verifs:tout`** : 769 tests, **15,4 min**, 424 verts, 341 rouges.
  - **Firefox (172)** : ne démarre pas. `Could not find profile folder`, même lancé à la main hors bac à sable, même après `playwright install --force firefox` (Firefox 159, build 1572, macOS 27.0).
  - **Ordinateur Safari (14)** : les 4 rouges connus ; 7 × `grantPermissions: clipboard-write` inconnu de WebKit (réglage du test) ; #1709 / redirections « navigation interrompue » (course de redirection sous WebKit) ; cartes lot 3 `toBeFocused` après Tab (Safari ne met pas le focus sur un bouton au Tab : candidat écart moteur) ; #1425 délai.
  - **Firefox réglé** (David : « cherche une solution maintenant ») : macOS 27 refuse à Firefox `~/Library/Application Support/Firefox` (confidentialité) ; `CFFIXED_USER_HOME` vers un dossier à lui (`projets.ts`). Ordinateur Firefox ensuite : 4 rouges connus + presse-papiers ; `allowClipboard` / `readClipboard` (permissions Chromium seulement, coller ⌘V ailleurs) → tous verts sauf **#1469 sous Firefox, écart moteur** : après « Format de nombre », le 1er clic sur A2 étend la sélection en zone A1:A2 au lieu de choisir A2 (2e clic : A2 choisie) ; Chrome : A2 dès le 1er clic. Firefox 390 px : mêmes rouges de mise en page que le téléphone.
  - **iPhone (78) et Android (72)** : presque les mêmes tests → la **mise en page téléphone**, pas le moteur. Causes : la console couvre la vue Données et la sous-barre recouvre A1 au défilement (~39) ; cartes de « Mes objets » attendues dans le panneau d'ordinateur (~30) ; grapheur : dézoom attendu > 400, l'écran étroit s'arrête à 400 (14).

## R6 — rouges restants (2026-11-23, `test:verifs:tout` après les gestes du téléphone)

- **Connus, tous projets** : #1674, #1703, #1620 (`each_key_duplicate`, mis de côté), #1369 (écart 1/10). Carnet : rouge en suite complète, vert seul.
- **Grille de Données invisible au téléphone** (~22 rouges par projet téléphone, dont barre d'icônes, #1442, #1692, #1697) : à 393 px de large, la zone de la grille fait 2 px ; barre, mise en forme, consigne et boutons prennent toute la hauteur. Mesuré à 659, 750 et 844 px de haut ; à 700 px de large : 222 px, 30 cases. **Même chose en prod (chiph.re).** Correctif proposé : `DataView.svelte`, hauteur minimale de la grille au téléphone et défilement de la vue. Pas fait : à trancher par David.
- **Écarts moteur** : déplacés le 2026-11-23 dans [ecarts-verifs-progress.md](ecarts-verifs-progress.md) (E12 à E17) ; #1536 tranché (test, #3040, écart E11) ; #1337 reste ici, prochaine étape.
- **#1337 tranché : le test** (2026-11-23). iPhone 15 (393 × 659) : au chargement du lien, « Mes objets » est replié, la console a 329 px (historique 191 px), la réponse se lit. Le test déplie « Mes objets » pour voir la carte `f` (`showCards`), puis `calc` le garde déplié : avec le bandeau « Tu regardes un atelier partagé » (~130 px, deux boutons), la console n'a plus que son en-tête (75 px, historique 0 px) et `innerText` de la réponse rend `""`. Geste ajouté : replier « Mes objets » (`leavePanelAlone`) avant `.domaine g` ; attendu inchangé. Remarque, pas écart : déplié + bandeau, la console est inutilisable au téléphone ; l'élève replie.
- **Revue `code-reviewer` (Sonnet)** : corrigés : seuil du dézoom > 400 gardé sur ordinateur, tests « 390 px » (#1442, #1546) rendus aux téléphones, `readClipboard` qui attend le collage (`try/finally`), « Signaler » masqué sur tout le contexte, `VERIFS_PROJETS` recalculé par le processus principal. Laissés : Échap sans équivalent au téléphone (noté ci-dessus), `showCards({ afterLoad })` attend 5 s sans objet, `calc` déplie toujours « Mes objets » (le repli n'est vérifié que par #1442 / #1546), motif `ordi-*` exige les trois moteurs, `--ui` ne voit qu'`ordi-chrome`, captures iPhone sans `openAtelier` (bouton Signaler et panneau replié visibles).
- **Adaptations des tests (gestes, jamais l'attendu)** : `showCards` / `leavePanelAlone`, `allowClipboard` / `readClipboard`, `gotoRedirected`, `ownTexts` (rendu MathLive en shadow DOM sous Chromium mobile), pas de la sous-grille au téléphone, dézoom ≥ 400, `@bureau` (raccourcis, clic droit, poignée, tests « ordinateur » ou qui posent eux-mêmes 390 px).

## Plan d'ensemble

1. Pilote Atelier (~20 lignes) → puis le reste des ~126 lignes Atelier.
2. Page à cocher avec captures (clair, sombre, téléphone) pour les ~73 lignes « à l'œil ».
3. Lignes prof / élève : en local, comptes de test (`db:seed-riche`) — jamais de mot de passe saisi en prod.
4. Ce qui reste vraiment manuel.

## Pilote — ce qui s'est passé (2026-10-25)

- **Lignes périmées, tranchées par David** : #1625 « `0.5*sqrt(2)` inchangé » (#1663 le veut `√2/2`) ; écritures de #1302 (`(ln(a) − 1)/2`, `S = {√a ; −√a}`) ; #1372 « pas de Comment ? » (la PR 2 l'a livré). Le test suit l'appli.
- **`.simplifier` (#1682, #1625)** : `ln(x)-ln(x)`, `1/x-1/x` → 0, `(0.5x+1)/(x+1)` → `(x+2)/(2x+2)`. Rejoué au commit de #1682 : déjà ainsi (`pedagogical-simplify` rend `null`, repli sur `simplify()`, inchangés depuis #1625). Les PR ont corrigé `tidy` = ligne de calcul, où tout reste écrit. Mis de côté par David.
- **Bug trouvé** : « Comment ? » de `.dériver (e^x)^2` (et `.dériver x*e^x` seul) ne s'ouvre pas, `each_key_duplicate` (deux étapes de même `id`) dans `GeneratedStepsCorrection`. Chantier à part (David) ; test #1674 laissé rouge.
- **Prod** : la suite tourne contre chiph.re (`VERIFS_URL`), mais la prod n'a pas encore `data-latex` → 19 rouges « réponse en texte », textes visibles conformes. Ligne ajoutée en tête de `verifications-manuelles.md`.
- `playwright.config.ts` ignore `verifs/**` (`pnpm test:e2e` ne les lance pas) ; la CI ne lance aucun e2e.

## Recommandations venues d'`environnement-workflow` (2026-11-23)

Écrites à la demande de David (« oui fais le ») à la clôture du chantier `environnement-workflow`
([journal archivé](../archive/environnement-workflow-progress.md)). Ce sont des recommandations de
cette session-là, que David a acceptées d'y voir notées ; le découpage reste à valider par lui à la
reprise.

- **Consigne de David du 2026-11-23** : limiter le plus possible les vérifications à la main ; la
  session vérifie elle-même ([tests.md](../pratiques/tests.md#vérifier-à-lécran-soi-même-avant-de-demander-à-david)).
  `docs/wip/verifications-manuelles.md` compte 418 lignes non cochées ce jour-là.
- **R6 — format iPhone et moteur de Safari dans `pnpm test:verifs`** : aujourd'hui un seul projet,
  Chrome sur grand écran (`playwright.verifs.config.ts`). Beaucoup de lignes disent « téléphone puis
  ordinateur » : sans ce format, leur moitié « téléphone » reste à David. WebKit est déjà installé
  (`pnpm voir` s'en sert).
- **R13 — vérifier la prod après chaque `pnpm deploy:prod`** : rejouer les tests sur `chiph.re`
  (`VERIFS_URL` existe déjà), résultat envoyé à David. Pages publiques seulement : une session
  n'entre aucun mot de passe réel.
- **R12 — notifications** (petite, peut se faire à part) : seulement ce qui demande un geste de
  David (« lien prêt », « question en attente ») ; pas « CI verte », la session merge seule.
- **Essayé à distance le 2026-11-23** : `VERIFS_PORT=<port> pnpm test:verifs` (barre de l'Atelier et
  carnet, 5 verts) depuis un worktree neuf, base locale remplie par `pnpm db:seed-riche`.
