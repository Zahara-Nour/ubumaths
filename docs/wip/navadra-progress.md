# Chantier `navadra` — réécriture du jeu de combats

## Reprendre ici

_Mis à jour le 2026-11-21, bestiaire proposé._

- **État** : étapes 1 (#2808, #2810), 2 (#2817) et 3 (#2822 : combat de la recrue, page `/dashboard/student/descente/combat/[beastId]`) mergées. Aucune page n'y mène encore : sans carte, aucune Bête n'existe en prod.
- **Prochaine action** : lire les réponses de David sur la page à cocher (https://claude.ai/artifact/JNi8sKCy1uvJUnxqcD9qk6, collection `avis`, une fiche par clé) et corriger `navadra-bestiaire.md` (18 Bêtes, 6 coups, prompts d'image). Puis l'étape 4 (carte, entrée de menu, carnet), en phase 0, sur une branche neuve depuis `origin/main` (imports `#lib/….ts` depuis #2826).
- **En attente de David** : la relecture du bestiaire sur la page à cocher.
- **Façon de poser** : en mots simples, avec un exemple, sans noms de tables ni de colonnes.
- **Pièges en cours** :
  - **PostgREST tronque un message d'erreur SQL accentué** et rend un 500 sans code : `raise exception` sans accent dans les fonctions appelées par l'API.
  - Base locale : `supabase migration up --local` bute sur une migration de rangement ; appliquer un fichier par `psql -1` sous `scripts/with-db-lock.sh`, puis `notify pgrst, 'reload schema'`.
  - Le prof et l'admin peuvent écrire une trace `descente` (comme `evaluation`) : leurs policies ne filtrent pas le lieu.
  - « Quitter le combat » mène à `/dashboard/student/descente`, créée à l'étape 4.
  - Une réponse en combat n'est jamais renvoyée par la page (un 500 peut suivre l'écriture).
  - L'analyse du jeu d'origine est dans `extern/navadra-jeu/CLAUDE.md`, **non versionné**.
- **Worktree / branche** : `../ubumaths-wt-navadra` gardé pour le serveur de test (5177, arrêté faute de mémoire le 2026-11-19) ; à retirer quand David n'en a plus besoin (branche mergée, aucun code à y ajouter).

## Phase 0 de l'étape 3 : combat de la recrue (validée par David le 2026-11-18)

David a validé toutes les recommandations (« je te suis »), A à G comprises.

**Ce que l'étape livre** : la page de combat de la recrue (primaire), de la première question à la victoire ou à la défaite. Elle n'est reliée à rien : la carte et l'entrée de menu arrivent à l'étape 4, et aucune Bête n'existe en prod tant que la carte n'appelle pas l'apparition. On la teste en local, sur la base remplie.

**Nominal**

1. **L'élève ouvre le combat d'une de ses Bêtes.** Il voit la Bête, sa Province sensible, ses PV, ses propres cœurs et ses coups : un par Province, ceux des Provinces sans question à son niveau fermés avec un mot d'explication.
2. **Il choisit un coup** ; une question de la Province du coup s'affiche (QCM ou une seule case, pas de chrono).
   - Coup de la Province sensible : la question vient **du point de la Bête** (la notion à travailler).
   - Autre coup : un point de **son niveau** dans cette Province, en préférant les non acquis.
3. **Juste** : le coup part ; ×2 sur la Province sensible. **Faux** : « Tu as dévié », la correction s'affiche, le coup est raté.
4. **Après 3 coups, la Bête riposte** : une question d'esquive, tirée du point de la Bête. Réussie : esquivé. Ratée : l'élève perd un cœur.
5. **Chaque réponse s'enregistre aussitôt** comme une réponse faite ailleurs dans Chiphre (lieu « Descente ») : elle fait avancer la maîtrise du point. Le serveur tient les PV de la Bête.
6. **Victoire** (PV à 0) : la Bête entre dans le carnet, gidouilles versées (1, ou 3 pour la grosse Bête ; 4 au plus sur 24 h, un mot le dit au-delà).
7. **Défaite** (plus de cœurs) : aucun coût ; la Bête ordinaire reste sur la carte en pleine forme.

**Limites**

- Bête repartie, déjà vaincue, ou qui n'est pas à l'élève : pas de combat, retour avec un mot.
- Question tirée qui n'est finalement pas courte (une autre variation que la première a plusieurs cases) : on en tire une autre, sans que l'élève le voie.
- Point de la Bête sans question jouable aujourd'hui (modèle dépublié depuis) : on prend un autre point de la même Province et du même niveau.
- Un seul modèle jouable pour un point : la même question peut revenir, avec d'autres nombres.
- Grosse Bête : voir question C.

**Erreurs**

- Connexion perdue pendant une réponse : la réponse est renvoyée ; si elle n'arrive pas, le combat continue et un mot discret le dit.
- Page fermée en plein combat : combat abandonné ; une Bête ordinaire repart en pleine forme au combat suivant, la grosse garde ses blessures.
- Triche (réponse « juste » forgée) : correction côté client (ADR 0001), comme partout ; le serveur vérifie Bête, élève et question ; gidouilles plafonnées.

**Questions**

- **A. Cœurs plutôt que PV pour l'élève.** Recommandation : **3 cœurs** ; une esquive ratée en coûte un. Exemple : un élève de CE1 rate deux esquives, il lui reste un cœur ; une troisième et la Bête gagne ce combat. Plus lisible au primaire que des PV chiffrés.
- **B. Chiffres** (cible : 3 ou 4 tours, une dizaine de questions). Recommandation : un coup réussi fait **10**, **20 sur la Province sensible**, **8 ailleurs** ; Bête ordinaire **120 PV**, grosse Bête **360 PV** (au lieu de 100 / 300). Exemple : en tapant juste sur la bonne Province avec 7 réponses sur 10, la Bête tombe en 3 tours ; avec une autre Province, en 7 ou 8 tours, battable mais long.
- **C. Grosse Bête en plusieurs combats.** Recommandation : **un combat contre elle dure 4 tours au plus**, puis elle se replie en gardant ses blessures. Exemple : 360 PV, un bon élève en ôte environ 150 par combat, il la bat au 3e. Les Bêtes ordinaires n'ont pas de limite de tours.
- **D. Même coup plusieurs fois par tour.** Navadra l'interdisait (chaque sort une fois par tour). Recommandation : **l'autoriser**, pour que l'élève puisse taper trois fois sur la notion à travailler.
- **E. Question d'esquive tirée du point de la Bête** (recommandation) : même si l'élève choisit d'autres Provinces, il travaille la notion visée au moins une fois par tour.
- **F. Noms des 6 coups de départ.** Recommandation : des **noms provisoires dans le code** (« Coup de Nombrilie »…), écrits et validés avec les fiches du bestiaire, avant l'étape 4.
- **G. Coups gagnés en maîtrisant une notion (5a).** Le découpage ne les place dans aucune étape. Pour la recrue, un coup gagné ne ferait rien de plus qu'un coup de départ. Recommandation : **l'étape 3 ne livre que les 6 coups de départ** ; gagner des coups et sorts (et l'annonce) vient avec l'étape 5 (apprenti), où les sorts ont des effets différents.

### Étape 3 : ce qui a été codé (2026-11-18)

- Règles pures `combat-rules.ts` (tour, cœurs, dégâts 20 / 8, repli de la grosse Bête après 4 tours) ; PV 120 / 360 (`spawn-logic.ts`) ; coups de départ `moves.ts` (noms provisoires).
- Serveur `combat.ts` : `openCombat`, `drawCombatQuestion` (revérifie la question tirée : `isCombatInstance`), `recordCombatAnswer`, `claimBeastVictory`. Lectures partagées avec l'apparition déplacées dans `program.ts`.
- **Cœur commun extrait** : `src/lib/server/skill-attempts/record-attempt.ts` (`recordStudentAttempt`), utilisé par `api/skill-attempts` et par le combat (trace `descente` au client service) : une réponse en combat compte exactement comme ailleurs (FSRS, suivi, Programme).
- Routes `api/descente/combat/[beastId]/{question,answer,victory}` ; page `/dashboard/student/descente/combat/[beastId]` (`CombatArena.svelte`). « Quitter » mène à `/dashboard/student/descente`, **qui n'existe qu'à l'étape 4**.
- **Revues (code + sécurité), 2026-11-18 : aucun bloquant.** Corrigé : une question qui n'arrive pas (réseau) ne coupe plus le combat ; une Bête achevée par une réponse perdue plus tôt donne la victoire même à l'esquive ; verdict neutre quand une réponse juste n'arrive pas ; une réponse n'est **jamais** renvoyée (un 500 peut suivre l'écriture : doublon) ; victoire déjà payée par un autre onglet tracée en `warn` ; liste blanche du client service (`combat.ts`, `record-attempt.ts`) ; test d'accès à la Bête d'un autre élève.
- **Laissé en l'état, à garder en tête** : recharger la page remet les tours à 1 (la limite de 4 tours de la grosse Bête se contourne en rechargeant) et remet une Bête ordinaire en forme (conforme à « page fermée = abandon ») ; ouvrir la page (GET) écrit les PV ; aucune limite de débit sur les routes (comme `api/skill-attempts`) ; le serveur ne relie pas la réponse au modèle tiré ni à la Province du coup (ADR 0001, gidouilles plafonnées).
- Choix techniques non posés à David (sans effet visible) : le serveur ne vérifie pas que le modèle répondu est celui qu'il a tiré (une réponse forgée ne fait rien de plus qu'une trace forgée par `api/skill-attempts`) ; tour et cœurs tenus par la page, PV par le serveur.

## Phase 0 de l'étape 2 : apparition des Bêtes (validée par David le 2026-11-18)

David a validé toutes les recommandations (« je te suis »), A à E comprises.

**Ce que l'étape livre** : le calcul qui fait naître et repartir les Bêtes d'un élève, et l'ajout de ses Bêtes et de ses coups gagnés à l'export de ses données (RGPD). Rien de visible encore : la carte arrive à l'étape 4. Le calcul se lance quand l'élève ouvre la carte ; tant qu'aucune page ne l'appelle, aucune Bête n'apparaît en prod.

**Nominal**

1. **À la visite, le serveur rattrape le temps passé** (pas de tâche planifiée). Exemple : un élève ouvre la carte lundi à 8 h, puis mercredi à 8 h ; deux jours ont passé, soit 6 Bêtes dues, mais il en a déjà 2 : il en reçoit 3, pour arriver à 5.
2. **D'où naît chaque Bête** : d'un point du programme, dans cet ordre de priorité :
   - un point **à remédier** (de n'importe quel niveau) ;
   - un point **non acquis de son niveau** ;
   - un point **à revoir** (une carte de révision due).
     Dans un même rang, au hasard, en préférant une Province qui n'a pas encore de Bête sur la carte, et jamais deux Bêtes vivantes sur le même point.
3. **Seulement un point jouable en combat** : il faut au moins une question publiée, courte (QCM ou une seule case) et non exclue, rattachée à ce point. Sinon, pas de Bête.
4. **La Bête prend la Province de la branche de son point** (correspondance, question A).
5. **Départ** : une Bête ordinaire repart au bout de 3 jours si elle n'est pas vaincue ; celle d'un point à remédier reste jusqu'à sa défaite, même si l'élève remédie ailleurs entre-temps.
6. **Grosse Bête** : une tous les 7 jours, née du point le plus prioritaire ; elle reste 7 jours, ne compte pas dans les 5, et garde ses blessures d'un combat à l'autre.
7. **Export RGPD** : le fichier « mes données » contient ses Bêtes (vivantes, reparties, vaincues) et ses coups gagnés.

**Limites**

- Carte pleine (5 Bêtes ordinaires) : rien de plus, même après une longue absence.
- Carte pleine de Bêtes qui restent (5 points à remédier) : plus d'apparition tant qu'il n'en a pas vaincu une.
- Élève qui a tout acquis et n'a rien à revoir : pas de Bête ; la carte le dit (texte à l'étape 4).
- Province sans point jouable à son niveau (algorithmique au CE1) : jamais de Bête là.
- Sans niveau scolaire : aucune Bête (message de l'étape 4).
- Bête repartie : elle quitte la carte, n'entre pas dans le carnet, rien n'est perdu.
- Point archivé depuis la naissance de la Bête : elle reste jusqu'à son départ normal.

**Erreurs**

- La base ne répond pas : la carte s'affiche avec les Bêtes déjà là ; on réessaiera à la visite suivante.
- Deux onglets ouverts à la même seconde : voir question E.

**Questions**

- **A. Branches → Provinces.** Il y a 19 branches pour 6 Provinces ; rien ne les relie aujourd'hui. Proposition :
  - Nombrilie : nombres et calculs, arithmétique, nombres complexes, proportionnalité, algèbre ;
  - Bedonstan : géométrie, **grandeurs et mesures** ;
  - Yoyolande : fonctions, suites, intégration, équations différentielles ;
  - Pifométrie : probabilités, dénombrement, statistiques ;
  - Glitchistan : algorithmique, **graphes, matrices** ;
  - Patatovie : logique, ensembles.
    Les cas discutables sont en gras. Exemple : « calculer l'aire d'un rectangle » donne une Bête de Bedonstan.
- **B. Rythme** : recommandation **une Bête toutes les 8 heures**, ce qui fait 3 par jour sans dépendre d'un fuseau ni de minuit.
- **C. Durées** : recommandation **3 jours** pour une Bête ordinaire, **7 jours** pour la grosse Bête.
- **D. Noms des Bêtes** : recommandation **une liste provisoire de 3 Bêtes par Province** dans le code pour coder et tester cette étape ; les vraies fiches (nom, allure, caractère) sont écrites et validées avant l'étape 4, donc avant qu'un élève voie une Bête.
- **E. Deux onglets à la même seconde** : l'élève pourrait recevoir quelques Bêtes de trop, une seule fois. Recommandation : **l'accepter** (rare, sans gidouille en jeu, puisque le plafond reste tenu par le serveur, et la carte revient d'elle-même sous 5). L'autre choix est une petite fonction en base qui l'empêche : une migration et une PR de plus.

## Tranché

- **2026-11-09 — Combattant = l'avatar du joueur, accompagné d'un Mathou familier** (décision de David). Les Mathoux ne combattent pas façon Pokémon. Raison : un Mathou = une notion, ce qui empêchait de travailler tout le programme. Le jeu choisit la notion, le joueur ne choisit que la Province ou la Forme du sort.
- **2026-11-09 — Ajouter une magie au lore** (idée de David), inspirée d'Ars Magica : grille verbe × matière. ⚠️ Le texte d'Ars Magica est sous CC BY-SA 4.0 (partage à l'identique, https://atlas-games.com/openars) : on s'inspire de la mécanique, **sans copier ni texte ni noms**. Piste de David : **adapter le système à l'âge**, avec la grille pour le lycée et un système simple, façon Navadra, pour le collège. En discussion.

- **2026-11-09 — La magie s'apprend par étapes, avec un seul moteur.** David a retenu mes recommandations :
  - **Recrue**, au primaire : des coups seulement, sans magie. **Le primaire est inclus.**
  - **Apprenti**, au collège : des sorts tout faits, rattachés à une Province, façon Navadra.
  - **Mage**, au lycée : la grille verbe × matière, composée par l'élève.
  - Un sort tout fait est une case cachée de la grille.
  - **Le niveau scolaire** (`profiles.grade`) **ouvre l'étape** ; jouer en débloque le contenu progressivement. _(Précisé par la 5a du 2026-11-17 : c'est la maîtrise des notions qui débloque, et les combats en sont une des façons.)_
  - **Le verbe donne l'effet en combat** (soigner, frapper, entraver, transformer, révéler) ; **la matière seule décide du domaine** de la question. Pas d'étiquetage par compétence.

- **2026-11-09 — Adversaires : les Bêtes imprévues, et le Czar pour les grandes batailles** (choix de David). David préfère les monstres imaginaires de Navadra aux troupes du Czar :
  - **Combats courants** : un bestiaire imaginaire, chaque Province ayant sa faune. La Province de la Bête donne son allure et ses faiblesses. Le domaine de la question vient du coup ou du sort que choisit le joueur, comme le dit la décision sur l'avatar. _(Correction du 2026-11-09, confirmée par David le même jour.)_
  - **Origine dans le lore** : la « bête imprévue Clinamen » de Jarry (_Faustroll_, livre VI ; `lore-pataphysique.md:152`). Les bêtes naissent du **Clinamen en général**, la déviation qui fait exister les choses. Le rot du Père Ubu qui a révélé la dimension pataphysique de la Pologne (`lore-pataphysique.md:189`) en est le premier. **Elles ne naissent pas des erreurs des élèves** : David a écarté cette lecture, qui ferait de l'erreur un mal.
  - **La remédiation se fait en coulisse** : le jeu envoie plus souvent les bêtes des points à remédier, sans que le lore le raconte.
  - **Le Czar et ses troupes** ne viennent qu'aux grandes batailles (fin de campagne, Mobilisation Générale).
  - **Pas de catalogue d'erreurs** : rien dans Chiphre ne reconnaît quelle erreur l'élève a faite (statuts juste, faux, mal écrit seulement ; aucune mauvaise réponse étiquetée dans les QCM).
  - **À surveiller** : distinguer les bêtes des Mathoux au premier coup d'œil ; des bêtes drôles, pas effrayantes, puisque le primaire est inclus ; environ 3 ou 4 bêtes par Province pour la v1. Les images de Navadra ne sont pas réutilisables, faute de licence.

- **2026-11-09 — Riposte de la bête : elle dépend de l'étape** (choix de David, sur ma recommandation) :
  - **Recrue** (primaire, pas de magie) : la riposte s'esquive par une question. Si elle est réussie, le coup est évité. Cela fait 4 questions par round.
  - **Apprenti et mage** : la bête frappe, comme dans Navadra. Pour se défendre, il faut avoir lancé des sorts (entraver, protéger). Cela fait 3 questions par round.
  - Raison : sans esquive, la recrue regarderait la bête frapper sans rien pouvoir faire. À partir de l'apprenti, se défendre devient un choix tactique.

- **2026-11-09 — Nom : La Descente de la Vistule, un voyage initiatique** (choix de David ; mes recommandations sur le reste) :
  - **Pas de nom de produit.** L'entrée du menu s'appelle « La Descente de la Vistule ». Elle se présente comme un **voyage initiatique à travers le Royaume**.
  - **Appuis dans le Compendium** : « Le voyage Chiphre » (`lore-pataphysique.md:106`) ; l'Ordre de la Grande Passoire, ordre initiatique de navigateurs (l. 1058) ; la flottille de bateaux-passoires de Faustroll sur la Vistule (l. 1387) ; la Vistule traverse les 6 Provinces (l. 568) ; les quêtes principales, une par Province (l. 1185).
  - **Portée : une activité de Chiphre**, un lieu du menu à côté des exercices et des Mathoux, **pas le cadre de toute l'appli**. On pourra l'étendre plus tard.
  - « Tour du Royaume » est déjà pris par la page `/royaume`.
  - **À faire au moment du code** : ajouter le terme à `CONTEXT.md`.

- **2026-11-09 — La descente ne suit aucun ordre** (décision de David). La Vistule symbolise le voyage à travers tout le Royaume, pas un parcours imposé :
  - les Bêtes surgissent **n'importe où dans le Royaume**, et le joueur va combattre celle qu'il veut, là où elle se trouve, comme sur la carte de Navadra ;
  - le tracé du fleuve (`lore-pataphysique.md:568`) ne change pas, mais il n'impose **aucun ordre aux Provinces** ;
  - cela règle le problème de l'ordre des domaines et celui des Provinces vides au primaire ;
  - **Reste à écrire** : les règles d'apparition des Bêtes (combien, où, combien de temps). Dans Navadra, il y avait 3 nouveaux monstres par jour et les gros fuyaient au bout de 3 à 6 jours. Cela relève de la question 5.

- **2026-11-09 — Les Bêtes portent le besoin pédagogique** (David a validé mes 4 recommandations). Le problème : si le joueur choisit le domaine de chaque coup ou sort, il peut ne travailler que ses domaines favoris. Navadra ne s'en protégeait presque pas : faiblesses à ±15 %, et seul le mode classe imposait des notions.
  - **Les Bêtes naissent des besoins de l'élève**, d'après le sélecteur (`student_point_state`) : d'abord les points à remédier, puis les non acquis, puis ceux à revoir.
  - **Chaque Bête est nettement vulnérable au domaine à travailler**, sans y être limitée. Ordre de grandeur : ×2 avec le bon domaine, ×0,75 avec les autres, à régler à l'équilibrage. Avec le mauvais domaine, elle reste battable, mais le combat est plus long.
  - **Le joueur choisit toujours le domaine** par son coup ou son sort. **La recrue aussi** : elle choisit ses coups par Province, et la Bête l'oriente.
  - **Mode classe** (le prof impose les notions du moment, comme les créneaux de Navadra) : **plus tard**, pas en v1, avec la Bataille de Bataillon (idée n° 3).

- **2026-11-17 — 5a : on gagne des coups et des sorts en maîtrisant des notions** (David suit ma recommandation, question D du journal archivé `ordre-grande-passoire`) :
  - un coup, un sort ou une case de la grille se débloque quand l'élève **maîtrise une notion de son programme** (exemple : il maîtrise les fractions, il gagne un sort de Nombrilie). C'est la mesure de l'Ordre de la Grande Passoire : les points acquis, pas les gidouilles ;
  - **gagner un combat ne débloque rien en soi** ;
  - **les questions des combats comptent comme du travail** : une réponse en combat s'enregistre comme une réponse faite ailleurs dans Chiphre et fait avancer la maîtrise des notions (donc aussi l'Ordre). Un élève qui ne fait que combattre apprend et progresse quand même ;
  - **À régler au moment du code** : ce que débloque chaque notion (Province pour les coups et sorts, matière ou verbe pour la grille) ; un premier jeu de coups dès le départ, puisque personne ne maîtrise encore de notion à son arrivée.

- **2026-11-17 — 5b : une victoire rapporte des gidouilles, et rien d'autre** (David suit ma recommandation) :
  - les gidouilles restent une monnaie de boutique, sans effet sur l'Ordre ni sur la puissance de l'avatar ;
  - **plafond par jour, tenu par le serveur** : au-delà, les combats ne rapportent plus de gidouilles ce jour-là, mais comptent toujours pour la maîtrise des notions ;
  - le chiffre du plafond se règle au moment du code, en le comparant à ce que rapportent les autres activités (`docs/systeme/jeux-et-economie.md`), pour que la Descente ne rapporte pas plus que le reste de Chiphre.

- **2026-11-17 — 5c : le carnet de voyage** (David suit ma recommandation) :
  - un album personnel : pour chacune des 6 Provinces, les Bêtes vaincues avec leur dessin, et celles pas encore rencontrées en silhouette ;
  - **visible par l'élève seul** : aucune comparaison, aucun classement.

- **2026-11-17 — 5d : le Mathou familier, un petit coup de main** (David suit ma recommandation) :
  - il ne combat pas à la place de l'élève : c'est toujours l'élève qui gagne, en répondant ;
  - il aide un peu, par exemple **un indice par combat** ou **un coup de la Bête amorti** ; le choix exact se fait au moment du code ;
  - **son aide grandit avec son stade** (chaton, matou, grand matou), donc avec la maîtrise de sa notion.

- **2026-11-17 — 5e : l'apparition des Bêtes** (David suit ma recommandation ; chiffres à régler à l'usage) :
  - **3 nouvelles Bêtes par jour**, **5 au plus** en attente sur la carte ;
  - une Bête née d'une **notion à retravailler** (point à remédier) **reste jusqu'à sa défaite** ; les autres repartent au bout de quelques jours, comme dans Navadra ;
  - **une grosse Bête par semaine**, plus longue à vaincre.

- **2026-11-18 — Étape 1 : question d'accès et barème** (David suit mes recommandations) :
  - l'élève voit ses Bêtes, ses coups et sorts, son carnet ; **ni le prof ni l'admin** ; aucun accès sans compte ;
  - le prof voit, comme aujourd'hui, les réponses en combat dans son suivi (lieu « Descente ») et la ligne de gidouilles au journal ;
  - personne n'écrit depuis le navigateur : le serveur seul fait apparaître les Bêtes, enregistre les victoires et les réponses en combat ;
  - gidouilles : **1 par Bête ordinaire, 3 par grosse Bête, 0 pour le tutoriel, 4 au plus sur 24 heures** ; une récompense est coupée au plafond.
  - Le bestiaire (nom, allure) vit dans le code ; la base ne garde que la clé de la Bête. Les coups de départ (un par Province) ne sont pas écrits en base.

### Étape 2 : ce qui a été codé (2026-11-18)

- `src/lib/descente/` : `spawn-logic.ts` (règles, pur), `combat-templates.ts` (filtre « jouable » : une case ou `choix`, blocs admis `choix`/`courbe`/`figure`/`python`/`solide`, première variation seulement), `provinces.ts` (question A), `bestiary.ts` (**provisoire**). Serveur : `src/lib/server/descente/spawn.ts` (`spawnBeasts(client, studentId)`, niveau lu dans le profil). Aucune page ne l'appelle : branchement à l'étape 4.
- **Première grosse Bête 7 jours après l'arrivée** (première Bête ordinaire de l'élève), jamais à la première visite : choix de David du 2026-11-18, sur ma recommandation.
- Rattrapage sans perte du reste (revue) : la k-ième Bête due est datée de la dernière apparition + k × 8 h ; au-delà des places, datée de maintenant et le dû en trop est perdu.
- **Provisoire, à régler à l'étape 3** : PV 100 (ordinaire) et 300 (grosse). **Avant l'étape 4** : vraies fiches du bestiaire (les clés provisoires n'atteignent pas la prod tant qu'aucune page n'appelle l'apparition).
- Export RGPD : `gaming.descente` (Bêtes et coups, lus par pages).

## Phase 0 de la v1 (validée par David le 2026-11-18)

Page de relecture : https://claude.ai/artifact/3wLhJbVxMdQfWwPx7qzD5g. David a validé toutes les recommandations, y compris les points marqués « proposé ».

**Contenu de la v1** : une entrée de menu « La Descente de la Vistule » (du primaire au lycée) ; la carte du Royaume ; le combat de la recrue (primaire, coups) et de l'apprenti (collège, sorts tout faits) ; le Mathou familier ; la grosse Bête de la semaine ; le carnet ; le tutoriel de Bordure. **Après la v1** : le mage (la grille), la Bataille de Bataillon, la grande bataille contre le Czar.

**Nominal**

1. Première visite : combat guidé par Bordure contre une petite Bête facile, 2 ou 3 minutes, qu'on peut passer et qui ne revient pas.
2. Départ : **un coup ou un sort par Province** dès le premier jour, sans notion maîtrisée.
3. Carte : 6 Provinces, Bêtes du moment ; chaque Bête montre la Province à laquelle elle est sensible (la notion à travailler).
4. Combat : le coup ou le sort choisi donne la Province, donc le domaine de la question. Juste : l'effet part (×2 si c'est la Province sensible). Faux : coup raté, correction montrée. Après 3 actions, riposte (esquive par question pour la recrue ; défense par sorts pour l'apprenti).
5. Mathou : souffle un indice ; aide selon son stade.
6. Victoire en 3 ou 4 tours (une dizaine de questions) : gidouilles plafonnées par jour, Bête dans le carnet, réponses comptées comme travail, Mathou endormi réveillé si c'est sa notion.
7. Une notion maîtrisée (en combat ou ailleurs) ouvre un nouveau coup ou sort, annoncé par le jeu.
8. Apparition : 3 Bêtes par jour, 5 au plus ; les ordinaires repartent après quelques jours ; celle d'une notion à remédier reste ; une grosse Bête par semaine, en plusieurs combats, qui garde ses blessures.

**Limites**

- Élève qui arrive : Bêtes nées des notions non travaillées de son niveau.
- Tout maîtrisé : Bêtes des notions à revoir.
- Province sans questions à son niveau (algorithmique au primaire) : ni Bête ni coup, coups fermés avec un mot d'explication.
- Carte pleine (5) : plus d'apparition.
- Sans Mathou : on combat seul. **Mathou endormi : il vient mais n'aide pas** tant qu'il dort.
- Plafond de gidouilles atteint : un mot le dit ; les combats comptent toujours comme travail.
- Sans niveau scolaire (`profiles.grade` vide) : message « vois avec ton professeur ».

**Erreurs**

- Connexion perdue : chaque réponse est enregistrée au fil du combat ; la victoire se renvoie ; page fermée = combat abandonné, sans perte.
- Bête trop dure : perdre ne coûte rien ; elle reste battable avec le mauvais domaine, en plus long.
- Triche : correction côté client (ADR 0001) ; le serveur vérifie que la Bête existe, est à l'élève et n'est pas déjà vaincue ; gidouilles plafonnées.

**Les 7 questions (recommandations validées)**

1. Le mage vient **après la v1** ; un lycéen joue en apprenti, avec des sorts tout faits de son niveau.
2. L'élève **choisit son Mathou** avant le combat ; par défaut, celui de la notion de la Bête s'il l'a, sinon le dernier qui l'a accompagné.
3. **Perdre ne coûte rien** : la Bête reste, en pleine forme, sauf la grosse Bête qui garde ses blessures.
4. **Pas de chrono** en v1.
5. En combat, **seulement les QCM et les questions à une seule case**, avec une exclusion manuelle possible.
6. Dessins : **j'écris une fiche par Bête** (nom, Province, allure, caractère), **David les fait dessiner par l'IA d'image** (18 à 24 Bêtes ; copie des fiches dans `~/Downloads`).
7. **Rien de nouveau côté prof** en v1 ; le travail en combat apparaît dans son suivi habituel ; le carnet reste à l'élève seul.

**Découpage (une PR par étape, dans l'ordre)**

1. Fondations en base : Bêtes de l'élève, coups et sorts gagnés, carnet, versement plafonné des gidouilles. **Question d'accès à David avant tout SQL.**
2. Apparition des Bêtes (sélecteur sur les besoins, 3/jour, 5 max, départ, grosse Bête hebdo).
3. Combat de la recrue (coups, esquive, questions courtes, victoire, défaite).
4. Carte, entrée de menu, carnet. Premier jalon : un élève du primaire peut jouer.
5. Apprenti (sorts tout faits, riposte, défense).
6. Mathou familier (choix, indice, réveil).
7. Tutoriel de Bordure et dessins des Bêtes. Fin de la v1.
8. Suppression de l'ancien portage : migration destructive, arrêt et go de David.

Au code : ajouter « La Descente de la Vistule » à `CONTEXT.md` (et une ADR si l'architecture le justifie, skill `domain-modeling`).

## À trancher (posé à David le 2026-11-09)

1. ✅ _Tranché le 2026-11-09 (l'avatar, accompagné d'un Mathou familier)._ **Combattants** : les **Mathoux** servent-ils de combattants (équipe de 3, chaque attaque est une question de la notion du Mathou), à la place des sorts et du grimoire ? C'est la décision du 2026-10-18 (`mathoux-conception.md:98-109`) : la confirmer ou la rouvrir.
2. ✅ _Tranché le 2026-11-09 (Bêtes imprévues, voir § « Tranché »)._ **Adversaires** : des **erreurs typiques** (« le Carré Fourbe ») au service du **Czar Alexis**, ou autre chose ? Cela engage un catalogue d'erreurs rattachées aux modèles de questions, et des illustrations.
3. ✅ _Tranché : du primaire au lycée._ **Public de la première version** : quels niveaux ? Navadra visait la 6e.
4. ✅ _Tranché le 2026-11-09 (La Descente de la Vistule)._ **Nom du jeu** : David en a-t-il un, ou faut-il des propositions tirées du lore ?
5. ✅ _Tranché par la question 7 (5a à 5e)._ Question rattachée à la 1 : faut-il une progression propre au jeu (niveau, prestige personnel ou limité au Bataillon), ou le stade des Mathoux suffit-il ?

6. ✅ _Tranché le 2026-11-09 : aucun ordre, voir § « Tranché »._ **Ordre de la descente** (posé le 2026-11-09). D'après le Compendium (l. 568), le fleuve passe par Bedonstan (géométrie, source), Glitchistan (algorithmique), Patatovie (logique), Nombrilie (nombres), Pifométrie (probabilités et statistiques), puis Yoyolande (fonctions, delta). Faut-il suivre cet ordre, une Province après l'autre, ou chaque étape mêle-t-elle les domaines ?

7. **Progression (question 5)**, proposée le 2026-11-09. On n'ajoute pas de grade propre au jeu.
   - ✅ **5a. Puissance de l'avatar** : pas de niveau ni de chiffres qui gonflent ; on progresse par déblocage (coups, sorts, cases de la grille). _Tranché le 2026-11-17, voir § « Tranché »._
   - ✅ **5b. Récompenses** : gidouilles seulement, plafonnées côté serveur. _Tranché le 2026-11-17, voir § « Tranché »._
   - ✅ **5c. Carnet de route** : les Bêtes vaincues, Province par Province. _Tranché le 2026-11-17, voir § « Tranché »._
   - ✅ **5d. Le Mathou familier** : un appui modeste qui grandit avec son stade. _Tranché le 2026-11-17, voir § « Tranché »._
   - ✅ _Tranché le 2026-11-17._ **5e. Apparition des Bêtes** : 3 par jour, 5 en stock au plus. Une Bête née d'un point à remédier reste jusqu'à sa défaite. Une grosse Bête par semaine.
   - **Hors du jeu** : le grade de l'Ordre se fondera sur le travail réel, pas sur les gidouilles (décision de David du 2026-11-09). C'est le chantier `ordre-grande-passoire`, clos le 2026-11-17 : règle dans le Compendium (section VII), journal `docs/archive/wip/ordre-grande-passoire-progress.md`. La Descente ne doit pas être le moyen le plus rapide de monter dans l'Ordre.

## Existant dans Chiphre (portage d'octobre 2025, en pause depuis le 2026-10-13)

**Rien à garder dans le code.**

- Routes `src/routes/(protected)/dashboard/navadra/` : hub, `combat/`, `spells/`.
- `src/lib/utils/game/{combat,challenge-variables}.ts`, `src/lib/stores/game/`, `src/lib/components/game/{combat,challenges}/`.
- Les formules de combat sont **réinventées**, pas celles de l'original.
- 8 tables `game_*`, dont `game_challenges` (les 464 défis importés).
- Trigger `award_gidouilles_on_victory`, qui crédite sans écrire dans `gidouilles_activity` (écart L11).
- Prod mesurée le 2026-11-09 :
  - 79 `game_players` créés du 15 au 17/10/2025 ;
  - 13 combats ;
  - **0 tentative de défi**, 0 deck.
  - Aucune donnée n'est à conserver.
- À supprimer **après** le nouveau jeu. C'est une migration destructive : grep des usages et arrêt avant le `DROP`.

## Ce qu'on garde de Navadra (relu avec David le 2026-11-17)

**Validé :**

- **Un coup ou un sort = une question réussie** ; un échec fait seulement rater le coup.
  - Rendu par `QuestionCard` + `TestTimer`, instances générées par `generateInstance`.
  - Correction côté client, comme partout (ADR 0001). Les gains se plafonnent côté serveur (ADR 0014).
- **Round** : l'avatar agit 3 fois, puis la Bête riposte (la recrue a une question d'esquive en plus ; voir § « Tranché », riposte).
- **Tirage adaptatif** : ce sont les Bêtes nées des besoins de l'élève (§ « Tranché »), branchées sur `student_point_state` ; sélecteur à écrire.
- **Indices : le Mathou familier seul** (choix de David, 2026-11-17). Ni Conscience ni les Palotins dans les combats.
- **Tutoriel : un premier combat guidé par le Capitaine Bordure** (Sergent-Recruteur, `lore-pataphysique.md:614`) contre une petite Bête facile, 2 ou 3 minutes, qu'on peut passer et qui ne revient pas (choix de David, 2026-11-17).
- **Chiffres de départ : ceux de Navadra** (`extern/navadra-jeu/CLAUDE.md` § 5), adaptés à nos règles (vulnérabilité ×2, Mathou), réglés à l'usage. Cible : **un combat de quelques minutes** (Bête ordinaire en 3 ou 4 tours, une dizaine de questions) ; une grosse Bête demande plusieurs combats (choix de David, 2026-11-17).
- **Les 464 défis** servent de **réserve de contenu** pour le cycle 3 et la 6e (skill `couvrir-niveau`). Ce n'est pas un format à reprendre.
- **On abandonne** : les saisons et le classement ouvert ; le chat, la messagerie et les questions créées par les joueurs ; le multijoueur hors de l'école.

**Retiré (périmé par les décisions de David) :** l'équipe de 3 Mathoux combattants et « les Mathoux sont les sorts » (remplacés par l'avatar, son Mathou familier et les sorts gagnés par la maîtrise des notions) ; les faiblesses entre Provinces façon éléments (remplacées par la vulnérabilité de la Bête à la notion à travailler) ; pyrs et grimoire.

## Idées d'ajouts (relues avec David le 2026-11-17)

**Validé pour la v1 :**

- **Un combat réveille un Mathou en sieste** : réussir en combat des questions de la notion d'un Mathou endormi vaut révision, et il se réveille (choix de David ; suite de la 5a).
- **Gidouilles versées par une RPC serveur plafonnée**, sur le modèle de `record_game_reward` et `gidouilles_activity` (5b).

**Plus tard, pas en v1 :**

- **Bataille de Bataillon** : le prof lance une Bête commune à la classe, avec des PV partagés sur une semaine. Coopératif, dans l'école seulement (déjà renvoyé à plus tard avec le mode classe).
- **Grande bataille contre le Czar** : à la « Mobilisation Générale », avant le brevet ou le bac, au palais d'Hiver (choix de David, 2026-11-17). La v1 = Bêtes courantes, grosse Bête de la semaine, carnet, Mathou familier, tutoriel.

**Retiré :** le monstre né d'une erreur de l'élève (écarté par David : l'erreur n'est pas un mal) ; les indices des Palotins (le Mathou seul souffle).

## Contraintes repérées

- Il faut des **questions rapides** : une case, un QCM, du calcul court. Aucun champ ne mesure aujourd'hui la durée ou la difficulté d'un modèle ; un filtre est à concevoir.
- Couverture des modèles publiés (2026-11-09) :
  - 6e : 173 ; 5e : 167 ; 4e : 123 ; 3e : 82 ;
  - primaire : de 109 à 185 selon le niveau.
- Les liens entre modèles et points travaillables (`question_template_points`) **ne sont pas dans le cache public** `templates/all` : il faut une lecture dédiée.
- Ton :
  - jamais « faux » ni « boss » ;
  - « Tu as dévié », « Coup de Maître » ;
  - seul le Czar peut dire « mauvais » ;
  - le Czar n'est jamais monstrueux, et on ne nomme aucun pays réel.

## Historique

- **2026-11-18** : #2822 mergée (étape 3, combat de la recrue).
- **2026-11-18** : phase 0 de l'étape 3 posée (questions A à G) ; worktree `../ubumaths-wt-navadra`, branche `feat/navadra-combat`.
- **2026-11-18** : #2817 mergée (étape 2).
- **2026-11-18** : étape 2 codée (apparition des Bêtes, export RGPD), phase 0 validée par David (« je te suis ») ; revues code et sécurité corrigées.
- **2026-11-18** : phase 0 de la v1 validée par David (toutes les recommandations).
- **2026-11-18** : phase 0 de la v1 rédigée et publiée en page, 7 questions posées.
- **2026-11-17** : § « Idées d'ajouts » relue avec David : Mathou réveillé par un combat en v1 ; Czar et Bataillon après la v1.
- **2026-11-17** : § « Ce qu'on garde de Navadra » relue avec David : indices par le Mathou seul, tutoriel par Bordure, chiffres de Navadra au départ.
- **2026-11-17** : 5e tranchée ; la question 5 est close.
- **2026-11-17** : 5d tranchée (Mathou familier, aide modeste selon le stade).
- **2026-11-17** : 5c tranchée (carnet de voyage, élève seul).
- **2026-11-17** : 5b tranchée (gidouilles plafonnées par jour, rien d'autre).
- **2026-11-17** : 5a tranchée (maîtrise des notions ; les combats comptent comme du travail).

- **2026-11-09** :
  - dépôt `Navadra/navadra-jeu` ajouté à `extern/repos.md` (`ecafc4520`) ;
  - analyse du jeu d'origine dans `extern/navadra-jeu/CLAUDE.md` (non versionné) ;
  - état des lieux du portage, du lore et du système de questions ;
  - propositions et 4 questions posées à David.
