# Recollecte des écarts : docs système contre `ecarts-a-trier.md` (2026-11-24)

Lecture seule, rien vérifié dans le code. Suivi = `docs/wip/ecarts-a-trier.md` + `ecarts-verifs-progress.md` (E1-E52) + `rgpd-securite-constats.md`.
Nature : V bug visible · L bug latent · M code mort · C commentaire/doc périmée · D décision produit · T RGPD-sécurité (proposée, à confirmer).

## Méthode et limites

- Sections lues : les 64 titres du `grep` (en-têtes `## Écarts connus`, `Pièges`, `Doutes`, `Lacunes`, `Limites`, `Points ouverts`, `État`...), du titre jusqu'au titre suivant de même niveau. **Pas les docs en entier.**
- 5 titres sont des faux positifs (pas des listes d'écarts) : `programmes/terminale-spe-programme.md` (« Limites des fonctions »), `programmes/bornes/lycee/tspe.md` (idem), `python/executor-pattern.md` et `python/store.md` (« État réactif »), `grapheur.md:73` (« État » = stores) : 0 point.
- Les « Pièges » qui sont de simples mises en garde d'usage ne sont pas comptés (ex. `base-de-donnees.md` § 4 : RLS, `db:types`, `jsonb`, `REVOKE` de colonne ; `seo.md`, `exercices.md`, `utilitaires-et-demos.md` pièges de polices ; `editeur-riche.md:123,126`).
- Recherche dans le suivi par mots-clés (noms de fichiers, symboles, identifiants) : un point suivi sous des mots très différents peut m'avoir échappé et apparaître à tort en A. `mathast/README.md` : seule la section « Points ouverts connus » (l.1776-1947) lue ; le reste du fichier (2002 lignes) seulement par `grep` pour la liste C.
- `ecarts-a-trier.md` : lu en entier pour les lignes ouvertes ; lignes barrées lues tronquées (110 premiers caractères) pour repérer le sujet.
- Statut « suivi » = le sujet apparaît dans l'un des trois fichiers, ou figure au « Non retenus » de `ecarts-a-trier.md` (Pyodide, backlog Notebook, Shtam futur).

## A. Nouveaux (dans une doc système, dans aucun des trois suivis)

Total A : **225** — V 40 · L 81 · M 36 · C 27 · D 30 · T 11

### A-V. Bugs visibles (40)

- `surveillance-des-erreurs.md:446` [V] Doc admin : la recherche `?q=` ne cherche rien ; `CATEGORY_CONFIG` nomme des dossiers disparus ; lecture de `docs/` sur disque non vérifiée sous Vercel.
- `jeux-et-economie.md:424` [V] 4 cartes VIP Mathémo : `/images/vip-cards/mathemo-*.webp` absent de `static/` -> 404 en prod (constaté le 2026-11-22).
- `editeur-riche.md:173` [V] `handlePaste` ne lit jamais `text/html` (en-tête promet le contraire) : un collage depuis Google Docs perd sa mise en forme ; `isTrivialHtmlWrapper` sans appelant.
- `comptes-classes-ecoles.md:392` [V] `bulk_create` des écoles force `uai: ''` : un import en masse n'enregistre jamais d'UAI.
- `ubumark.md:2040` [V] Corrigé imprimé : l'option `solved` de `courbe-typst.ts` n'est passée par aucun appel ; le corrigé d'une série d'automatismes refuse le vecteur à tracer et la droite verticale ; l'horloge et les barres à placer n'ont pas de corrigé imprimé.
- `ubumark.md:2048` [V] Bloc d'espace : la cote d'un cylindre coupé parallèlement à l'axe est posée loin de son court trait quand la distance est petite.
- `fiches-et-pdf.md:955` [V] Fiche anglaise au titre composé sans catégorie : le PDF imprime le titre composé en français.
- `organisation-et-documents.md:170` [V] Un document désactivé disparaît de l'écran (`enabledOnly` par défaut) : impossible de le réactiver ou de le supprimer depuis l'interface.
- `organisation-et-documents.md:186` [V] Bouton « Modifier » de `DocumentCard` désactivé (« bientôt disponible ») ; suppression par `confirm()` natif.
- `utilitaires-et-demos.md:409` [V] Images de 4 cartes VIP de Mathémo absentes de `static/` (doublon de `jeux-et-economie.md:424`).
- `utilitaires-et-demos.md:412` [V] `angle_polaire` rend des degrés même en mode radians (cos(3θ) faux) ; `dsl-builtins.md` dit « en radians ».
- `utilitaires-et-demos.md:419` [V] Au téléphone, les flèches du `Deck` chevauchent le bas d'une diapositive de `/demo/diaporama`.
- `utilitaires-et-demos.md:446` [V] Réglage admin de numérotation des listes : rangé dans `localStorage` de l'admin, élèves et profs voient `DEFAULT_CONFIG` ; la page de réglages ne le dit pas.
- `coquille-et-caches.md:328` [V] Pile de modales peu accessible : dialogue rendu dans un `<button>`, focus ni déplacé ni piégé.
- `coquille-et-caches.md:346` [V] `teacher/recherche` : recherche par tag seul sans résultat affiche « Aucun résultat pour « ». » ; filtres figés à la création du composant.
- `coquille-et-caches.md:350` [V] Surlignage différent entre barre et tiroir publics (`/shtam/<article>`).
- `exercices.md:250` [V] Libellés du hub sans accents ni français : « Contenu pedagogique », « Gerez », « Enigmes », « Templates », « Worksheets », « Notebooks ».
- `atelier.md:3232` [V] `.relever` sur une figure chargée : 19 à 23 s de balayage, ~95 ms de recalcul par pas ; pas d'optimisation sûre.
- `geometrie/README.md:494` [V] `courbe("x^2 + y^2 = a^2")` avec `a = slider(...)` rend une conique dégénérée (le curseur n'est pas suivi).
- `geometrie/README.md:500` [V] `GeometryCanvas` : l'étiquette d'une courbe implicite (`svg.label`) n'est pas rendue.
- `messagerie-et-moderation.md:411` [V] Messagerie privée en panne : boîte de réception 400 (`folderId` nul refusé par le schéma).
- `messagerie-et-moderation.md:413` [V] Messagerie privée en panne : envoyés 400 sans `limit`, 500 avec (réponse de `get_user_sent_messages` ne passe pas `messageResponseSchema`).
- `messagerie-et-moderation.md:427` [V] Mentions factices dans l'éditeur riche : liste en dur (« Alice Dupont », « Bob Durand »...) offerte à l'autocomplétion.
- `messagerie-et-moderation.md:450` [V] Tri des notifications par priorité alphabétique : `urgent`, `normal`, puis `important`.
- `analytique-prof.md:252` [V] Nom d'un point en LaTeX brut dans les infobulles `title` de la grille.
- `evaluations.md:543` [V] `shuffle_questions` sans effet : réglé, stocké, jamais lu au tirage.
- `evaluations.md:559` [V] Temps de course par défaut : 5 min (séance libre) contre 7 min (contrôle).
- `evaluations.md:561` [V] Fenêtre de choix du panier (`TestModeDialog`) : dépasse un écran bas avec quatre cartes.
- `programmes/arbre-des-notions.md:146` [V] Modèles à vérifier : 11 sans corrigé, termes nuls dans des corrigés, specs rouges, `9a6087c5` (12 tirages sur 600 en échec).
- `mathast/README.md:1808` [V] Écritures de `developper` perfectibles : `(x+1)/pi`, `sqrt(8)(x+1)`, `x(1/x-1) -> -x + x/x`, `sqrt(x)^3 sqrt(x)` (aucune valeur fausse).
- `mathast/README.md:1842` [V] Différences de ln : `.factoriser ln(xy)-ln(xy)`, `.simplifier ln x + ln y - ln(xy)` (bouton « pour xy > 0 » non réduit), `ln(2x)-ln(2x)` garde `ln x - ln x`.
- `mathast/README.md:1867` [V] `.intégrer` à bornes décimales : mêle les registres (`1/2 e^{0,5} - 1/2`), paramètre au dénominateur laissé en fraction.
- `mathast/README.md:1870` [V] `.simplifier x(-e^x)e` non regroupé ; `e^{2x}x/(e^x x) -> x e^x / x`.
- `mathast/README.md:1876` [V] `toCustom` écrit `(1/2)^xe^x`, illisible en syntaxe maison.
- `mathast/README.md:1878` [V] VALEUR FAUSSE (relevé 2026-10-26) : second degré à paramètre, `x^2 - ab = 0` rend `±sqrt(a) sqrt(b)` si `4ab >= 0` (faux pour a, b < 0, il faut `sqrt(ab)`).
- `mathast/README.md:1879` [V] Second degré à paramètre : `ax^2 - 1 = 0` condition `a >= 0` au lieu de `a > 0` ; conditions non réduites ; condition réduite à un point écrite `0 <= a <= 0` ; étapes détaillées en double.
- `mathast/README.md:1940` [V] Conditions de racine et ln à paramètre : doublons d'écritures (`a-3/2 >= 0, a >= 1,5`), `a > -0`, contradictions affichées (« a < 3, a > 3 »), `1/ln(a)` garde « ln(a) != 0 », `.intégrer e^{sqrt(a) x}` non réduit.
- `geometrie/constructions.md:416` [V] 3 constructions en prod contiennent des `@cacher("T_3")`... sans effet (identifiants IEP sans nom, ré-import depuis leur XML).
- `geometrie/constructions.md:422` [V] L'étiquette d'un segment nommé s'affiche au milieu, sur celle du milieu I (aucun segment nommé en prod).
- `geometrie/constructions.md:424` [V] Marqueurs d'angle droit de la double perpendiculaire visibles seulement en `@complet`.

### A-T. RGPD / sécurité (11)

- `surveillance-des-erreurs.md:433` [T] Supprimer un rapport de bug ne supprime pas sa capture d'écran (storage) : ni DELETE ni le lot n'y touchent (donnée d'élève résiduelle).
- `editeur-riche.md:120` [T] `sanitizeHtml` garde `style`, `class`, `img`, `src` (pixel de suivi, CSS en ligne) : un contenu d'élève lu par d'autres doit passer par `RestrictedRichText`.
- `editeur-riche.md:163` [T] Rendu restreint des formules par liste NOIRE (`UNSAFE_MATH_COMMANDS`) : une macro MathLive qui se développerait en commande à attributs n'est pas rattrapée (audit #2488).
- `fiches-et-pdf.md:957` [T] `escapeTypst` n'échappe pas `[` `]` : un texte de la base dans une cellule `[...]` peut être lu comme du code Typst ; reste consignes, noms de section (audit #2912).
- `organisation-et-documents.md:164` [T] L'admin croit tout voir (« admins see all ») mais la RLS ne le suit pas ; PATCH/DELETE d'un document d'autrui répondent succès sans effet (0 ligne, pas de `.select()`).
- `organisation-et-documents.md:173` [T] Policy élève de `rag_documents` ignore le statut d'adhésion : un élève archivé lit encore les documents du prof et le tuteur peut les lui citer.
- `messagerie-et-moderation.md:419` [T] Safeguarding : l'échec de lecture des signalements (`get_reports_for_moderation`) est muet, le prof voit une liste vide.
- `messagerie-et-moderation.md:423` [T] Safeguarding : le marquage automatique (`is_flagged`, filtre à 4 mots) n'arrive chez le prof sur aucun écran de modération ; le contrôle serveur annoncé n'existe pas.
- `conformite/rgpd.md:404` [T] Aucun bandeau de consentement cookies (à implémenter si cookies non essentiels).
- `conformite/violation-de-donnees.md:74` [T] Emplacement du registre des violations : à décider (dossier privé des DPA).
- `conformite/violation-de-donnees.md:75` [T] La restauration de la prod n'a jamais été jouée (`procedure-restauration.md`, « reste à établir ») : une perte de données ne se répare pas encore de façon sûre.

### A-L. Bugs latents (81)

- `surveillance-des-erreurs.md:435` [L] Zod manquant : filtres de `/dashboard/admin/errors` et `bug-reports`, `notes` de l'action `resolve` sans borne.
- `surveillance-des-erreurs.md:441` [L] La détection de gel tourne et envoie ses erreurs même si `freeze_detection_enabled` vaut false.
- `surveillance-des-erreurs.md:455` [L] `/api/latex/compile` répond 500 « Unknown error » à une entrée invalide (le `throw error(400)` est rattrapé par le `catch` global).
- `base-de-donnees.md:795` [L] `curriculum_points` : 5 des 6 clés étrangères en CASCADE ; supprimer un point efface sans un mot couverture du cahier et acquisition des élèves (on archive).
- `base-de-donnees.md:798` [L] `journal_entry_activities.exercise_id` en SET NULL alors qu'un CHECK exige la colonne pour `kind='exercise'` : supprimer un exercice cité dans une séance échoue.
- `base-de-donnees.md:801` [L] Deux générations de seeds du programme ; le rollback des nouveaux (un `delete`) devient destructif dès qu'un élève ou un modèle s'y accroche.
- `comptes-classes-ecoles.md:390` [L] `/api/classes/[classId]/students` valide `classId` avec `getClassGidouillesSchema` (schéma d'une autre route).
- `statistiques.md:300` [L] Graduations et fréquences (`formatRounded`, `formatTick`, pourcentages) arrondissent encore en flottant (sans demi négatif à départager).
- `ubumark.md:2030` [L] Option à geste dans un choix (`horloge` + `placer:`, `cubes`/`patron` à geste en option de `choix`) : le générateur masque le choix avant de chercher les gestes, ni refus ni case (#2065, décision à David).
- `ubumark.md:2037` [L] `isGridNode` (tolérance 1e-9 x pas) : un pas irrationnel avec de grandes valeurs peut refuser au prof une cible écrite en décimal.
- `ubumark.md:2039` [L] Les juges de la droite et du vecteur ne vérifient pas que les points sont des nœuds de la grille.
- `ubumark.md:2044` [L] `\frac` refusé dans `tracer:` (écrire `1/2x`).
- `ubumark.md:2046` [L] ` ```ranger ` dans une liste sort en bloc de code (absent de `SPECIAL_BLOCK_KINDS`) ; sans effet en question, refusé de toute façon.
- `ubumark.md:2051` [L] Boîte à moustaches : fractions refusées sur une ligne de boîte mais acceptées dans `données:` ; à 40 graduations les étiquettes de l'axe se chevauchent ; médiane au demi refusée sur un axe de 1 en 1 pour un tirage de taille paire.
- `fiches-et-pdf.md:950` [L] Catégorie et notions : trois requêtes, pas une transaction (`PUT /api/worksheets/[id]`) ; une panne entre deux laisse la fiche sans ses nouvelles notions (ADR 0041).
- `fiches-et-pdf.md:962` [L] `escapeTypst` n'échappe pas `/` : `//` et `/*` ouvrent un commentaire Typst (aucun titre en prod concerné).
- `page-erreur.md:179` [L] Hors du garde de langue : messages des `+server.ts` (API) et messages dynamiques de la base (`warnings.ts` relaie le texte d'une RPC) peuvent rester en anglais.
- `organisation-et-documents.md:176` [L] Policy storage élève absente du baseline local : un élève qui ouvre un document de chapitre reçoit 500 en local, aucun test du chemin de prod.
- `organisation-et-documents.md:179` [L] `PATCH` ne valide pas `documentId` en UUID ; `description` jamais écrite ; `enabledForRag` du dépôt ignoré.
- `organisation-et-documents.md:182` [L] `extractText` : test `mimeType.endsWith('.md')` jamais vrai ; `text/x-markdown` traité en texte brut.
- `organisation-et-documents.md:188` [L] Pomodoro : clé `localStorage` non propre au compte (le compte suivant hérite du minuteur) ; commentaire de `tick` renvoie à un design doc introuvable.
- `carnet-de-liaison.md:156` [L] Rejets définitifs Brevo signalés après l'envoi : l'adresse n'est pas marquée `invalid` (pas de webhook).
- `carnet-de-liaison.md:158` [L] `access_count` du lien compte aussi les ouvertures par le jeton d'un courriel.
- `carnet-de-liaison.md:162` [L] Épisodes non marqués après un envoi réussi (erreur de base) : repartent une semaine plus tard.
- `utilitaires-et-demos.md:503` [L] Deux `formatDuration` d'unités différentes (secondes / minutes), même type `number`.
- `utilitaires-et-demos.md:506` [L] `MathField` n'efface pas le champ quand `value` revient à `''`.
- `coquille-et-caches.md:289` [L] Getters `*Sync` : `Date.now()` n'est pas réactif, un `$derived` ne se recalcule pas à l'expiration du TTL.
- `coquille-et-caches.md:293` [L] Une mise à jour optimiste ne prolonge pas l'entrée de cache.
- `coquille-et-caches.md:295` [L] `teacherCache.getClassInfo` / `getSchoolInfo` lèvent toujours (fetch non écrit) ; aucun appelant.
- `coquille-et-caches.md:298` [L] Hydratation des layouts dans `onMount` : ne se rejoue pas après `refreshAll()`.
- `coquille-et-caches.md:303` [L] Deux listes de liens publics (`Header` tiroir, `Sidebar` barre) à tenir d'accord.
- `coquille-et-caches.md:308` [L] `TeacherDashboard` ne confronte pas `teacher_selected_class_id` aux classes lues.
- `coquille-et-caches.md:313` [L] Cache école mal rempli et jamais lu (`hydrateSchoolInfo(data.school, ...)`, `as never` + `@ts-expect-error`).
- `coquille-et-caches.md:319` [L] `GET /api/student/buddy/presence` écrit (remet la Constance Royale du Palotin à 0) : écriture dans une lecture, rejouée à chaque chargement.
- `coquille-et-caches.md:333` [L] `modalStack.popTo` appelle l'`onReturn` de la modale qui reste ; `ModalEntry.component` typé `any`.
- `coquille-et-caches.md:341` [L] `teacher/wheel` : `<select>` natif (règle MySelect), sélection propre à la page, gain de gidouilles qui ne touche pas `teacherCache`.
- `coquille-et-caches.md:353` [L] `Wheel` : prop `spinDuration` ignorée ; évitement des frontières `Math.floor(360 / n)` faux si 360 n'est pas multiple de n.
- `cours-et-chapitres.md:645` [L] Trois définitions de l'année scolaire (Avancement, `endOfSchoolYear`, `school_years`).
- `tableaux-de-bord-et-navigation.md:180` [L] Accueil élève : requête `recentExercises` pour un bloc en commentaire.
- `mathast/pattern-matching.md:264` [L] Une règle ne voit que la représentation du parseur : `sqrt-product` ne regarde pas encore `power`, `\exp(x)` hors des motifs `ln-exp`.
- `mathast/pattern-matching.md:275` [L] Coût combinatoire de `P.sum` / `P.prod` sur de longues sommes (pas de mémoïsation).
- `geometrie/README.md:498` [L] `courbe("x^2 = 4")` refusée (« la variable y est absente ») au lieu de deux droites.
- `grapheur.md:397` [L] Somme de pôles périodiques et isolés (tan(x) + 1/(x-3)) : `getAllDiscontinuities` ne rend que la famille de tan, le pôle 3 est perdu au dézoom.
- `grapheur.md:399` [L] Une limite lente non calculée par le moteur symbolique reste invisible (convergence exigée en moins de 137 299).
- `grapheur.md:401` [L] Avec un curseur, chaque valeur refait l'AST et l'analyse (0,4 à 22 ms par cran).
- `seo.md:103` [L] Deux `SITE_URL` (`seo/site.ts` sans barre finale, `welcome.ts` avec).
- `messagerie-et-moderation.md:453` [L] `NotificationType` accepte `warning/success/error/system`, refusés par `notifications_type_check`.
- `messagerie-et-moderation.md:459` [L] `add_warning` / `add_warnings_bulk` ne vérifient pas que l'élève est membre de la classe.
- `messagerie-et-moderation.md:460` [L] `createNotification` accepte tout élève de `class_members` quel que soit le statut ; un élève hors-classe ne peut pas être ciblé nommément.
- `messagerie-et-moderation.md:463` [L] `send_private_message` laisse le prof écrire à un élève de test ; `get_allowed_recipients` les masque.
- `questions.md:1787` [L] Évaluations notées : le serveur régénère l'instance depuis la graine à la correction ; une copie commencée avant un changement de sens (AB) est corrigée avec le sens nouveau.
- `questions.md:1793` [L] Réponses à placer : glisser tactile après la pose d'un point attend un peu ; modèles « ranger » `cp-a2/04` et `ce1-2/04` encore en case (suivi `outils-manquants.md`).
- `questions.md:1804` [L] Durées du panier (5..300 s) différentes de celles d'une série (jusqu'à 600 s) : le premier « - » ramène 600 à 300.
- `questions.md:1807` [L] Contrôles natifs malgré MySelect/MyCheckbox : `<select>` dans `PrecisionEditor`, `QuestionPreview` ; `<input type=checkbox>` dans `QuestionPreview`.
- `analytique-prof.md:248` [L] Grille A : traces lues sans pagination (`getClassCurriculumPointGrid`), des modèles tentés peuvent manquer en silence au-delà du plafond PostgREST.
- `evaluations.md:552` [L] Saisie des observations : DELETE puis INSERT sans `.select()` ni transaction ; un refus RLS du DELETE double la grille ; observable retiré garde ses observations en cache.
- `evaluations.md:556` [L] Mode test à deux sources (`localStorage` vs `user_preferences`) : l'interrupteur peut afficher l'inverse de l'état serveur ; store en `writable`.
- `tuteur-ia.md:232` [L] `studentGrade` vient du client ; `ExerciseModal` et `/exercice/[slug]` ne l'envoient pas : le tuteur parle à un élève de 6e quel que soit son niveau (tuteur en pause).
- `tuteur-ia.md:235` [L] Le niveau d'aide monte à chaque message : dès le 8e échange « va voir ton professeur », alors que le quota autorise 15.
- `tuteur-ia.md:238` [L] Échecs silencieux : insertions et DELETE du tuteur sans vérifier les lignes ; l'indexation rend `success` sans embeddings.
- `tuteur-ia.md:242` [L] Deux écritures de `max_help_level_reached` (trigger puis `/api/chat`) : la valeur peut redescendre ; `message_count` idem.
- `tuteur-ia.md:248` [L] Le limiteur du tuteur crée son propre client service role (`dotenv`) au lieu de `serviceRoleClient.ts`.
- `tuteur-ia.md:263` [L] `effort_score` et `topics_covered` jamais écrits : colonnes « effort moyen » et « thèmes » vides.
- `tuteur-ia.md:276` [L] `GROQ_MODEL` ignoré ; `enabledForRag` du dépôt ignoré.
- `mathast/README.md:1800` [L] Conventions d'échec des évaluateurs (NaN vs exception) : lot 6c non fait ; signe d'un pôle `1/(-x)` en 0 non tranché.
- `mathast/README.md:1806` [L] Q29 : `(e^x)^2` tapé doit rester tel quel, `tidy` ne le distingue pas (à vérifier).
- `mathast/README.md:1815` [L] tidy-conditions §4.2 : à plusieurs lettres, une réécriture qui rétrécit le domaine n'a ni bouton ni simplification ; `ln(6x)-ln(2x)` s'arrête sur `ln 6 + ln x - ...` ; `e^{ln(x^2)}` sans étapes.
- `mathast/README.md:1834` [L] Conditions : `cot/sec/csc/arccosh` sans condition écrivable ; `computeDomain(1/(sin x cos x))` rend k pi au lieu de k pi/2 ; libellés bruts et conditions redondantes ; `engineAlternative` ne vérifie pas chaque étape.
- `mathast/README.md:1845` [L] `tidy` ne regroupe pas deux termes sous une barre ; `normalize` : `exp(10000000 ln 2)` sans plafond ; `2^{1/3}` et racine cubique de 2 de formes normales différentes ; Q14 `sqrt2 - sqrt3 - 1`.
- `mathast/README.md:1856` [L] `.simplifier cos(0.5 pi) x -> 0` sans étape (repli décimal) ; `cos(-pi/3)` refusé comme écriture mélangée.
- `mathast/README.md:1858` [L] `sin(-(pi/6))` n'atteint pas la valeur ; étape réunie `withValuesTogether` montre la ligne entière ; `cos(30° + 30°)` sans que la valeur suive.
- `mathast/README.md:1871` [L] `factoriser` : `(a+b)(a-b)/((a-b)(a+b))` rend `(a+b)*1/(a+b)`, facteurs opposés non reconnus, `MAX_FRACTIONS = 8` coupe en silence.
- `mathast/README.md:1873` [L] `tidy` : `reduceFractionOfSums` ignore `domain` ; `(2x-2)/(x-1)` reste.
- `mathast/README.md:1905` [L] Domaine : `shiftedLinearRoot` fabrique un nœud `opposite` à la main (hors `factory.ts`) ; inversion de `ln u > c` ne couvre ni u non affine ni `log` avec c != 0.
- `mathast/README.md:1912` [L] `evaluateNumeric` (limites) n'évalue ni pi ni e (`null`) : le moteur compte sur cette lacune pour garder l'exact.
- `mathast/README.md:1923` [L] Limites refusées (pas fausses) : `u^{-p/q}` non entier, produit `f u^{-n}` jamais réécrit en quotient, `x^3 e^{-x^2+x}`, `x^2 e^{-sqrt x}` en +inf.
- `mathast/README.md:1927` [L] Limite `x^2/(x sin(1/x))` en 0+ rendue « ~ 0 » (approché).
- `geometrie/constructions.md:412` [L] La visibilité finale d'une instruction chorégraphiée s'applique au pas suivant.
- `geometrie/constructions.md:413` [L] Chaque changement de pas rejoue tout ; `reset()` refait la pré-simulation : coût quadratique sur un long script.
- `geometrie/constructions.md:425` [L] `mediatrice(s)` sur un segment nommé refusé ; identifiant avec prime (`M'`) refusé à la lecture.
- `geometrie/constructions.md:426` [L] `starPairStems` pourrait aller jusqu'à Q*/R* si toutes les lettres C-P sont prises (théorique).

### A-D. Décisions produit (30)

- `statistiques.md:304` [D] La binomiale n'a pas d'échantillonneur propre (tirée comme loi finie).
- `ubumark.md:2034` [D] Repère à placer / à tracer : virgule décimale permise dans `placer:`, `grille:`, `tracer:` mais pas `x:`/`y:` (laissé tel quel).
- `ubumark.md:2056` [D] Boîte à moustaches : décisions prises en écrivant le geste, à confirmer par David (trait posé -> suivant, une boîte -> toute la hauteur, phrases de retour).
- `carnet-de-liaison.md:159` [D] Plafond d'un courriel par semaine par adresse et par élève : un parent de deux élèves peut en recevoir deux le même jour.
- `carnet-de-liaison.md:166` [D] Changement de classe en cours d'année ou retrait puis remise : tout repart ; le parent ne voit plus les semaines d'avant.
- `carnet-de-liaison.md:170` [D] L'effacement des 90 jours efface aussi les adresses « Je ne suis pas le parent » et retirées : leur empreinte ne bloque plus une ressaisie.
- `carnet-de-liaison.md:172` [D] `parent_notifications` effacé au bout d'un an (Q42) : élève, prof et admin ne voient plus les courriels plus anciens.
- `utilitaires-et-demos.md:401` [D] Contenu pédagogique encore géré par l'admin (cartes VIP, lexique/dictionnaire) alors que la règle dit : au prof (« plus tard »).
- `coquille-et-caches.md:339` [D] Aucun lien vers `/dashboard/teacher/wheel` ni `/dashboard/teacher/documents` : accessibles par l'adresse seule.
- `cours-et-chapitres.md:615` [D] Le cahier de texte publie par booléen `is_published` + `entry_date <= current_date`, pas par `published_at` (ADR 0005).
- `seo.md:106` [D] Données structurées limitées à deux pages (accueil, article du Shtam).
- `messagerie-et-moderation.md:433` [D] Messagerie privée sans lien d'entrée ; idem notifications prof/admin, modèles de messages, amitiés admin.
- `qr-codes.md:142` [D] Pas de QR pour l'Atelier (décision) ; pas de bouton QR sur les fiches (QR automatique en en-tête de PDF non retenu).
- `evaluations.md:548` [D] Archivage d'un contrôle sans écran.
- `evaluations.md:550` [D] Assignation à un élève sans écran (`assignEvaluation` accepte `student_ids`).
- `programmes/arbre-des-notions.md:141` [D] Couverture faible des programmes (primaire, collège, Tle techno) ; points ayant perdu leur seul exercice (2-232, TSPE-432, -466, -596).
- `programmes/arbre-des-notions.md:143` [D] 46 modèles valables pour un autre programme laissés sans tag.
- `programmes/arbre-des-notions.md:151` [D] 51 exercices ne sont rangés nulle part (aucun écran ne range un exercice).
- `programmes/transcriptions-du-bo.md:76` [D] À relire par David : tableaux éclatés du cycle 2, `2.md` (fractions p.5, vecteurs p.9), titres ambigus 1_TECHNO / T_TECHNO (suivi `verifications-manuelles.md`).
- `mathast/README.md:1796` [D] Bascule des modèles existants vers la correction automatique (« plus tard »).
- `mathast/README.md:1798` [D] `pnpm math` à brancher sur l'atelier ; aujourd'hui les deux divergent.
- `mathast/README.md:1804` [D] `tidy` dans `evaluate` (option B possible plus tard).
- `mathast/README.md:1851` [D] `.domaine 1/(x - cos(pi/3))` rend `R \ {cos(pi/3)}`, voulu `R \ {1/2}` plus tard.
- `mathast/README.md:1853` [D] Corrections d'exercices de résolution (`correction-generator`, `pedagogical-solve`) sans l'étape de valeur remarquable.
- `mathast/README.md:1884` [D] Solveur pédagogique, écritures perfectibles à trancher (x à droite, `2/3 x = 0,5` -> « multiplie par 1,5 », `P(x) = 2x - 1` annoncé pour une fraction...).
- `mathast/README.md:1928` [D] Limites à paramètre de signe inconnu : refus depuis `limites-parametres` ; discussion selon le signe de k (choix C) pour plus tard ; la substitution directe suppose encore k != 0.
- `geometrie/constructions.md:404` [D] Contrainte `@mesure` : trois voies (milieu, bissectrice, médiatrice), pas `perpendiculaire`.
- `geometrie/constructions.md:405` [D] Sept builtins chorégraphiés seulement (`cercle`, `triangle_equilateral`... refusent les décorateurs).
- `geometrie/constructions.md:406` [D] Polygones, vecteurs, courbes apparaissent d'un coup (pas de tracé ni d'instrument).
- `geometrie/constructions.md:423` [D] `@arc_milieu` refuse l'angle plat (écart à confirmer par David).

### A-M. Code mort (36)

- `surveillance-des-erreurs.md:443` [M] `reportWebVital` (`freezeDetection.ts`) n'est appelée par personne : `webVitals` reste vide dans les signalements.
- `editeur-riche.md:179` [M] Exports sans appelant : `getDetectedPatterns`, `RichTextEditorProps`, `isAlreadyEscaped`, `escapeHtmlSafe`, `NotificationSanitizeConfig`.
- `editeur-riche.md:182` [M] `containsDangerousHtml` existe deux fois (`utils/sanitize.ts` sans appelant, `server/sanitization.ts`) ; `sanitizeUrl` locale homonyme dans `errorMonitoring.ts`.
- `editeur-riche.md:185` [M] `escapeHtml` en cinq exemplaires.
- `comptes-classes-ecoles.md:375` [M] `restoreOptionsSchema` utilisé seulement via `validateRestoreOptions`.
- `comptes-classes-ecoles.md:378` [M] Doublon : `api/classes` et `api/teacher/classes` rendent les mêmes classes.
- `outils-prof.md:40` [M] Anciennes constructions (`/constructions/conversion`) : 0 construction au format JSON sur 9, état « résiduel » (cf. `geometrie/constructions.md:451`).
- `utilitaires-et-demos.md:405` [M] `/dev/saisie-naturelle` : prototype jetable, candidat à la suppression.
- `utilitaires-et-demos.md:407` [M] Scripts d'essai de constructions et brouillons de `/constructions` : doublon possible.
- `utilitaires-et-demos.md:449` [M] Prop `listNumberingOverride` de `MarkdownRenderer` sans appelant.
- `utilitaires-et-demos.md:513` [M] Exports sans appelant hors tests (`flyAndScale`, `formatNumber`, `formatDate`, `deleteChatAttachment`, `getFileIcon`, constantes de `deadlines.ts`...).
- `utilitaires-et-demos.md:528` [M] Fichiers morts : `JsonViewer.svelte`, `supabase-test.ts`/`supabaseClient.ts`, `src/lib/index.ts`.
- `utilitaires-et-demos.md:534` [M] `formatDate` défini 81 fois ; `slugify` en double.
- `utilitaires-et-demos.md:538` [M] Trois enveloppes CodeMirror presque identiques.
- `srs.md:469` [M] `reviewedToday` (`course-card-attempts.ts`) sans appelant hors tests.
- `coquille-et-caches.md:311` [M] `depends('teacher:classes')` sans `invalidate` correspondant.
- `coquille-et-caches.md:316` [M] Profil élève en cache jamais lu (`getProfile`, `refetch*` sans appelant).
- `coquille-et-caches.md:336` [M] Code sans importeur : `auth.svelte.ts`, `input-capability.svelte.ts`, `LoadingDashboard`, `LoadingTable`, `FontSelector`, `ExampleModal`, `Skeleton*`.
- `coquille-et-caches.md:344` [M] `teacher/documents/+page.server.ts` relit le rôle dans `profiles` au lieu de `locals.profile`.
- `coquille-et-caches.md:358` [M] Effet vide dans le layout racine (`+layout.svelte:81-85`).
- `exercices.md:246` [M] `exerciseFont.svelte.ts` sans effet (`FontSelector.svelte` sans importeur).
- `cours-et-chapitres.md:624` [M] API REST sans appelant : `api/teacher/chapters/**`, `api/student/chapters/**`, `api/student/checklist/**` (risque de doublon de règles).
- `cours-et-chapitres.md:635` [M] Fonctions sans appelant : `reorderDocuments`, `reorderExercises`, `getTeacherJournalEntries`, `getTimeSlots`..., action `reorder` sans formulaire.
- `cours-et-chapitres.md:642` [M] `types/academic_periods_types.ts` mort, déclare sa propre `Database`.
- `tableaux-de-bord-et-navigation.md:185` [M] `RewardsBlock` reçoit `riddlesSolved` sans s'en servir.
- `messagerie-et-moderation.md:437` [M] Modèles de messages jamais utilisés pour envoyer (`compose/` ne les lit pas).
- `messagerie-et-moderation.md:440` [M] Méthodes du store `privateMessages` sans appelant (`moveToFolder`, `loadUnreadCount`, `searchMessages`).
- `messagerie-et-moderation.md:442` [M] `auto-notifications.ts` : 7 fonctions sur 10 sans appelant ; `cleanupExpiredNotifications`.
- `messagerie-et-moderation.md:445` [M] `POST /api/warnings` sans appelant.
- `evaluations.md:546` [M] `validateAttempt` n'est appelé que par les tests ; `startEvaluationAttempt` refait les contrôles à sa façon.
- `tuteur-ia.md:280` [M] Code sans appelant : `TutorWidget`, `TutorHelpButton`, `help-escalation.ts`, `searchSimilarExercises`, `batchIndexDocuments`, `reindexAllDocuments`.
- `mathast/README.md:1874` [M] `detectSymmetry` conclut « aucune, prouvé » pour `cbrt(x)`, `x^{1/3}`, `x^{2/3}`, `ln(x+sqrt(x^2+1))` (sans appelant en production).
- `geometrie/constructions.md:414` [M] `PPU = 40` codé deux fois dans l'exécuteur, en double de `INITIAL_PPU`.
- `geometrie/constructions.md:415` [M] Le genre `compass-measure` sert aussi de « déplacement sans tracé » de l'équerre et de la règle.
- `geometrie/constructions.md:432` [M] `applyTraceStyle` écrit dans la `Map` privée de `Figure` par un transtypage.
- `geometrie/constructions.md:451` [M] Les constructions au format JSON ne se jouent plus nulle part hors de l'aperçu de conversion ; l'ancien `src/lib/constructions/` fournit encore schéma, convertisseur, instruments.

### A-C. Commentaires / docs périmés (27)

- `surveillance-des-erreurs.md:431` [C] Notification critique : `system_event_type: 'assessment_graded'` faute de valeur adaptée (commentaire dans le code).
- `surveillance-des-erreurs.md:438` [C] Commentaire de `bugReportsConfigStore.load` faux (« seuls les admins ») : `GET /api/bug-reports/config` ne demande qu'un compte, table lisible par tous.
- `surveillance-des-erreurs.md:451` [C] OpenAPI : 11 chemins sur ~380 routes, dont 4 qui n'existent plus.
- `surveillance-des-erreurs.md:453` [C] En-tête de `healthStats.ts` périmé (dit que `server_cache`, vues `admin_*` manquent dans `database.ts`).
- `editeur-riche.md:188` [C] `config.ts` et `RichTextEditor.svelte` citent encore `FormRichTextEditor.svelte`, absent du dépôt.
- `comptes-classes-ecoles.md:380` [C] `teacher/classes/+page.server.ts` dit `day_of_week` borné 0-4 ; le schéma accepte 0-6.
- `comptes-classes-ecoles.md:382` [C] En-tête de `PATCH api/admin/users/[id]` liste `email` parmi les champs modifiables ; le schéma ne l'accepte pas.
- `comptes-classes-ecoles.md:384` [C] `class-composition-source` : commentaire contradictoire sur la portée entre écoles (le code ne filtre pas sur l'école).
- `comptes-classes-ecoles.md:386` [C] `send-welcome-email` dit vérifier que le prof « enseigne » à l'élève ; `verifyTeacherStudent` ne vérifie que les rôles.
- `comptes-classes-ecoles.md:388` [C] `admin/users/+page.server.ts` : « à cause de la RLS » le prof ne verrait que les comptes en attente ; en mono-prof il voit tous les élèves (à revérifier).
- `organisation-et-documents.md:184` [C] En-tête de `api/documents/[id]/+server.ts` annonce `/view` et `/download` qui n'existent pas.
- `utilitaires-et-demos.md:416` [C] Écart périmé : dit que `calculateNewStability` ignore la note après la 1re révision, or `srs.md:463` annonce FSRS-6 corrigé le 2026-11-15.
- `coquille-et-caches.md:355` [C] En-têtes périmés de `Header.svelte` et `student/+layout.svelte`.
- `cours-et-chapitres.md:649` [C] Chevauchement de couverture avec `fiches-et-pdf.md` (`cahier/*/fiche/**`).
- `cours-et-chapitres.md:651` [C] En-tête de l'éditeur de chapitre annonce un réordonnancement sans action.
- `tableaux-de-bord-et-navigation.md:187` [C] En-têtes périmés de `TeacherDashboard.svelte` et `StudentDashboard.svelte`.
- `tableaux-de-bord-et-navigation.md:190` [C] Deux barres latérales ; `Sidebar.svelte` a sa propre `isActive`, hors doc.
- `messagerie-et-moderation.md:455` [C] Commentaire de `api/student/warnings/[periodId]` périmé (l'élève voit ses avertissements via `RewardsBlock`).
- `messagerie-et-moderation.md:457` [C] `getClassWarnings` : `teacherId` inutilisé, commentaires périmés (mono-prof).
- `messagerie-et-moderation.md:465` [C] En-tête de `student-inbox.ts` : « quatre systèmes » pour six sources.
- `evaluations.md:564` [C] En-têtes de code anglais et anciens (« quiz », « Revision », « assessment »).
- `evaluations.md:566` [C] Écrans disent « contrôle » / « observation » mais URL, tables et identifiants gardent « évaluation ».
- `evaluations.md:570` [C] Couverture mal rangée (`grades.ts`, `student/reports`).
- `tuteur-ia.md:278` [C] Aucun lien vers `/tuteur`, `/dashboard/tutor-stats`, `/dashboard/teacher/documents` ; `/pere-ubu` garde un bouton « Retour » non `BackLink`.
- `tuteur-ia.md:283` [C] `base-de-donnees.md` dit que le prof lit les conversations de tous les élèves : faux pour `tutor_messages` sans `class_id`.
- `mathast/README.md:1863` [C] `.résoudre cos(pi/5) x = 1` titre « On divise par cos(1/5 pi) » (écriture du solveur).
- `geometrie/constructions.md:436` [C] Journaux archivés périmés (`ctx.sub`, `transporte` 6/7 sous-étapes, « constructions JSON fonctionnent toujours »).

## B. Fermés dans le suivi mais encore écrits comme ouverts (ou en désaccord) dans la doc

Total B : **17**

- `jeux-et-economie.md:455` — suivi **L11** : Navadra (pause) : gains de combat hors journal, à reprendre avec la réécriture.
- `statistiques.md:298` — suivi **M16** : Trois ajustements affines (`fitAffine`, `bivariateFit`, `decimalFit`) : moindres carrés écrits trois fois.
- `statistiques.md:302` — suivi **M16** : `exponentialProbability` / `normalProbability` en `number`, leurs moments en `Fraction`.
- `statistiques.md:306` — suivi **M16** : `atMost`, `findThreshold` exportés sans usage externe.
- `fiches-et-pdf.md:923` — suivi **K1 (V1/V2)** : Plus de copie individuelle à imprimer pour une affectation individualisée (le lot ZIP vit sur la page de la fiche, même copie pour tous) ; sans effet aujourd'hui.
- `carte-des-fonctionnalites.md:282` — suivi **K19/D18** : Accessibilité : anneau de focus 2:1 (D16), `muted-foreground` 4,4:1 (D17), pas de lien d'évitement (D18).
- `atelier.md:3229` — suivi **L13** : Dettes : saisie des unités sans palette.
- `geometrie/README.md:484` — suivi **T5** : `challenge-variables.ts` évalue encore par `new Function` (liste blanche arithmétique depuis T5).
- `grapheur.md:395` — suivi **M7** : Ré-exports `viewport.ts`, `bezier.ts`, `colors.ts` de `src/lib/grapheur/` : survivances de rétrocompatibilité.
- `questions.md:1790` — suivi **M2** : `InstanceBlank.type` admet `'graphical'` sans générateur (`NumberLineInput` retiré).
- `questions.md:1801` — suivi **M20** : `question_templates.type` existe en base mais le code déduit le type de la structure.
- `questions.md:1802` — suivi **retiré 2026-10-10** : CONTEXT.md liste encore des types TinyMath (`numerical_exact`...).
- `architecture-generale.md:184` — suivi **C1** : En-tête de `(protected)/+layout.server.ts` documente `/login` et `await parent()` (réel : `/auth/login`, `locals`).
- `conformite/README.md:219` — suivi **rgpd C11** : Rétention pédagogique non appliquée (Haute) : contredit `rgpd.md:304` (`run_retention_c11`).
- `mathast/README.md:1892` — suivi **M10** : `pedagogical-evaluate/` réduit à des types.
- `mathast/README.md:1909` — suivi **L22** : Les filtres de noms qui écartent `e` et `i` de `getVariables` traitent à tort `e_1`, `i_1`, `u_i` comme constantes.
- `mathast/README.md:1920` — suivi **V71** : VALEUR FAUSSE antérieure : `1/(e^{-1/x} sin(1/x))` en 0+ rend +inf (fenêtre dense de `oscillatesUnboundedNear`, e^{-1/x} = 0 en flottant).

Observation : les identifiants V13, V42, V44, V45, V46, V51, V52, V54, V56, V58-V60, V62, V66, L8, L21, L22, L27, L28, L31 sont marqués « corrigé » dans `ecarts-a-trier.md` mais pas barrés ; la méthode du fichier (« barré = clos ») les compte donc encore ouverts. Le bilan du 2026-11-04 ne les liste pas comme ouverts : c'est un défaut de typographie, pas de fond.

## C. Ouverts dans le suivi, absents de la doc source

Vérifié par `grep` sur tout `docs/systeme/` (pas seulement les sections d'écarts).

- **V34** — `mathast/tidy-spec.md` : Aucune mention de `x+iy` écrit `\imaginaryI y + x` : la doc ne parle plus de l'écart (§ ordre canonique l.121 n'en dit rien).
- **V35** — `mathast/tidy-spec.md` : Aucune mention de la partie imaginaire `\dfrac{\imaginaryI\sqrt3}{2}` ni du choix « i derrière » (décision 2026-11-03 non reportée).
- **L20** — `ubumark.md` : `ubumark.md:1803` décrit la notation scientifique >= 10^15, mais pas la limite « un décimal juste sous 10^15 perd sa partie décimale » (la décision du 2026-11-03 était de l'écrire dans la doc : non faite).
- **L25** — `mathast/pattern-matching.md` : Rien sur `factoriser` d'une somme longue (30 termes) ni une étape par facteur sorti.
- **L28 bis** — `mathast/README.md` : `limits/composition.ts` (`evaluationResultToNode`) et `limits/evaluate.ts` (`cleanNumberString`) absents ; la doc ne cite que `shiftedLinearRoot` (domaine, l.1905), pas suivi, voir A.
- **L36** — `srs.md` : Rien sur le message brut `flagErr.message` de `GET .../anti-fraud/flags` (srs.md:127-131 décrit la route sans le défaut).
- **L12 (partiel)** — `atelier.md` § État : Restent écrits : « Renommer » désactivée, `recomputeAll` (mesuré, pas un poste). Disparus : provenance D10 non passée à `ObjectPanel`/`DataView`, curseur recréé par `build()`.

Présents dans la doc (donc rien à signaler) : V17 (`mathast/README.md:1366`), V31/L32/L33 (`tuteur-ia.md:259,265,270`), V39 (`README:528`, « décision en attente »), V40 (`README:390`, déjà rédigé : vérifier que le suivi à faire existe encore), V48 (`README:599`, `atelier.md:2559`), V64 (`README:1466`, `atelier.md:1502`), L9 (`fiches-et-pdf.md:942`), L15 (`README:1893`, `pattern-matching.md:282`), M4 (`fiches-et-pdf.md:928`), M19 (`geometrie/README.md:492`), C13 (`univers-chiphre.md:224`), C14 (`univers-chiphre.md:228`), D6 (`grapheur.md:404`).

### C-bis. Ouverts dans le suivi (T…), clos ou tranchés dans la doc

`ecarts-a-trier.md` liste encore ouverts T1, T2, T3, T6, T7, T8, T9, T12, T13, T14, T15. Les docs disent :

- T1 (`realtime.md:229`) réglé le 2026-11-03 ; T2 (`:232`) décidé, garde de test ; T3 (`:238`) limite acceptée.
- T7 (`serveur.md:285`) et T8 (`serveur.md:287`) corrigés le 2026-11-03 ; T9 (`serveur.md:286`) toujours écrit « CSRF en double ».
- T12 (`conformite/README.md:222`) fait (30 jours glissants) ; T13 (`:221`) reste Groq ; T14 (`:224`) et T15 (`:225`) ouverts ; T6 (`geometrie/README.md:490`) ouvert.

## Tableau par doc

Points relevés = points ouverts ou doutes décrits dans les sections d'écarts (les points barrés/corrigés dans la doc ne sont pas comptés). « Suivis » = suivi existant, y compris B. Date = dernier commit sur le fichier ; « depuis 11-04 » = nombre de commits sur le fichier après la synchro.

| doc                                   | relevés | suivis | nouveaux | dernière modif. | commits depuis 2026-11-04 |
| ------------------------------------- | ------: | -----: | -------: | --------------- | ------------------------: |
| surveillance-des-erreurs.md           |      10 |      0 |       10 | 2026-11-22      |                        14 |
| base-de-donnees.md                    |       3 |      0 |        3 | 2026-11-22      |                        35 |
| jeux-et-economie.md                   |       5 |      4 |        1 | 2026-11-22      |                         7 |
| editeur-riche.md                      |       7 |      0 |        7 | 2026-11-21      |                        14 |
| comptes-classes-ecoles.md             |       9 |      0 |        9 | 2026-11-16      |                         8 |
| statistiques.md                       |       5 |      3 |        2 | 2026-11-18      |                         1 |
| ubumark.md                            |      10 |      0 |       10 | 2026-11-23      |                       103 |
| fiches-et-pdf.md                      |       7 |      3 |        4 | 2026-11-22      |                        44 |
| page-erreur.md                        |       1 |      0 |        1 | 2026-11-18      |                         1 |
| outils-prof.md                        |       3 |      2 |        1 | 2026-11-20      |                         1 |
| organisation-et-documents.md          |       9 |      0 |        9 | 2026-10-14      |                         0 |
| carnet-de-liaison.md                  |       7 |      0 |        7 | 2026-11-17      |                        15 |
| utilitaires-et-demos.md               |      15 |      0 |       15 | 2026-11-23      |                        26 |
| srs.md                                |       3 |      2 |        1 | 2026-11-22      |                        21 |
| coquille-et-caches.md                 |      22 |      1 |       21 | 2026-11-24      |                        14 |
| exercices.md                          |       2 |      0 |        2 | 2026-10-24      |                         0 |
| cours-et-chapitres.md                 |       7 |      0 |        7 | 2026-11-23      |                        14 |
| tableaux-de-bord-et-navigation.md     |       4 |      0 |        4 | 2026-11-22      |                         5 |
| mathast/pattern-matching.md           |       3 |      1 |        2 | 2026-11-18      |                         1 |
| carte-des-fonctionnalites.md          |       2 |      2 |        0 | 2026-11-21      |                        11 |
| atelier.md                            |       3 |      2 |        1 | 2026-11-24      |                        13 |
| geometrie/README.md                   |       6 |      3 |        3 | 2026-11-24      |                         5 |
| realtime.md                           |       3 |      3 |        0 | 2026-11-20      |                         4 |
| grapheur.md                           |       5 |      2 |        3 | 2026-11-23      |                         7 |
| seo.md                                |       2 |      0 |        2 | 2026-11-21      |                         2 |
| messagerie-et-moderation.md           |      18 |      0 |       18 | 2026-11-22      |                         4 |
| qr-codes.md                           |       1 |      0 |        1 | 2026-11-19      |                         2 |
| univers-chiphre.md                    |       3 |      3 |        0 | 2026-11-21      |                         1 |
| questions.md                          |       7 |      3 |        4 | 2026-11-23      |                       141 |
| analytique-prof.md                    |       3 |      1 |        2 | 2026-11-22      |                        15 |
| evaluations.md                        |      11 |      0 |       11 | 2026-11-22      |                        52 |
| architecture-generale.md              |       1 |      1 |        0 | 2026-11-19      |                         3 |
| programmes/arbre-des-notions.md       |       4 |      0 |        4 | 2026-10-24      |                         0 |
| tuteur-ia.md                          |      13 |      3 |       10 | 2026-10-13      |                         0 |
| serveur.md                            |       3 |      3 |        0 | 2026-11-22      |                        12 |
| conformite/rgpd.md                    |       3 |      2 |        1 | 2026-11-22      |                        15 |
| conformite/README.md                  |       5 |      5 |        0 | 2026-11-22      |                         9 |
| conformite/violation-de-donnees.md    |       3 |      1 |        2 | 2026-11-03      |                         0 |
| programmes/transcriptions-du-bo.md    |       1 |      0 |        1 | 2026-10-24      |                         0 |
| python/worker.md                      |       4 |      4 |        0 | 2026-11-18      |                         1 |
| python/README.md                      |       1 |      1 |        0 | 2026-11-18      |                         1 |
| mathast/README.md                     |      36 |      6 |       30 | 2026-11-23      |                         5 |
| geometrie/constructions.md            |      16 |      0 |       16 | 2026-11-24      |                         3 |
| blockly.md                            |       0 |      0 |        0 | 2026-11-17      |                        31 |
| export-competences.md                 |       0 |      0 |        0 | 2026-11-01      |                         0 |
| dictionnaire.md                       |       0 |      0 |        0 | 2026-11-23      |                         8 |
| programmes/terminale-spe-programme.md |       0 |      0 |        0 | 2026-10-10      |                         0 |
| programmes/bornes/lycee/tspe.md       |       0 |      0 |        0 | 2026-11-14      |                         3 |
| python/executor-pattern.md            |       0 |      0 |        0 | 2026-11-18      |                         2 |
| python/store.md                       |       0 |      0 |        0 | 2026-11-18      |                         1 |
| **Total**                             | **286** | **61** |  **225** |                 |                           |

Docs à 0 point : `blockly.md` (« Aucun » depuis le ménage du 2026-11-16), `export-competences.md` (« Aucun »), `dictionnaire.md` (seul écart voulu), et les 4 faux positifs ci-dessus.
