# Outils d'organisation et de gestion du temps pour les élèves : idées

## Reprendre ici

_Mis à jour le 2026-11-20, réflexion seulement, aucun chantier ouvert._

- **État** : liste d'idées, rien n'est tranché ni codé.
- **Prochaine action** : David valide (ou non) la § Sélection, puis phase 0 (comportements en français) avant tout code.
- **En attente de David** : le choix de la piste, et la question d'accès pour toute idée sociale ou partagée (« qui pourra voir quoi ? »).
- **Pièges** : le Kanban et le Pomodoro existent déjà, mais aucun élève ne peut les trouver (cf. § Existant).

## Existant (vérifié dans le code le 2026-11-20)

- **Kanban** : `src/routes/(protected)/organisation/kanban/`, serveur `src/lib/server/kanban.ts`, validation `src/lib/server/validation/kanban.ts`. Un tableau est personnel ou rattaché à une classe ; dans ce cas, le prof et tous les élèves de la classe en sont membres. Étiquettes de couleur, personnes assignées, glisser-déposer.
- **Pomodoro** : `src/routes/(protected)/organisation/pomodoro/`, store `src/lib/stores/pomodoro/`. Durées réglables. La sonnerie, la notification et l'annonce `aria-live` passent par `<PomodoroEffects />`, monté dans `src/routes/(protected)/+layout.svelte` : elles se déclenchent même hors de la page.
- ⚠️ **Aucun lien élève** : le seul lien vers `/organisation` est dans le menu admin (« Suivi du site », `src/lib/config/dashboard-nav.ts`). Le menu élève n'y renvoie pas.
- **Briques réutilisables** : devoirs (`dashboard/student/devoirs`), cahier de texte, Ma progression (« Ce que je sais faire »), paquets de révision (révision espacée), carnet de liaison (ADR 0040), boutique, Mathoux.
- **Futurs chantiers voisins** (mémoire, « Futurs chantiers ») : rappels du Palotin (devoirs à rendre, révisions dues) ; limite de temps sur les jeux (issu de `presentation-parents`).

## Idées

### 1. Planifier

1. **Agenda de l'élève** : une vue semaine ou mois qui regroupe automatiquement les devoirs, les contrôles du cahier de texte et ses propres événements.
2. **Planificateur de révisions avant un contrôle** : l'élève donne la date et le chapitre, l'outil découpe le travail en petites séances jusqu'au jour J, avec les notions tirées du programme.
3. **Rétroplanning de projet** : pour un exposé ou un DM long, on part de la date de rendu et on remonte les étapes (chercher, rédiger, relire).
4. **Emploi du temps personnel** : les créneaux fixes (cours, sport, musique) font apparaître les vrais créneaux libres.
5. **Budget temps de la semaine** : « j'ai 4 h pour les maths cette semaine », puis on le répartit.
6. **Estimation puis réalité** : l'élève estime la durée d'une tâche et la compare au temps réel, pour apprendre à s'estimer.
7. **Cartes Kanban liées aux devoirs** : un devoir donné par le prof devient tout seul une carte « À faire ».

### 2. Prioriser

8. **Matrice d'Eisenhower** (urgent / important) : quatre cases où l'on glisse ses tâches.
9. **« Les 3 choses du jour »** : trois priorités seulement, pour éviter la liste de 20 tâches qui paralyse.
10. **« Manger la grenouille »** : repérer la tâche la plus pénible et la faire en premier.
11. **Découpeur de tâche** : « réviser les fonctions » devient cinq micro-tâches de 15 min, avec une aide au découpage.
12. **Liste « à faire / en cours / fait » simplifiée** : un Kanban plus léger pour les plus jeunes.

### 3. Se concentrer (autour du Pomodoro)

13. **Pomodoro relié à une tâche** : on choisit une carte du Kanban avant de lancer le minuteur, et le temps s'y ajoute.
14. **Durées adaptées à l'âge** : par exemple 15/5 pour un collégien, 25/5 au lycée.
15. **Mode concentration** : l'appli masque le chat, la boutique et les jeux pendant une séance.
16. **Minuteur visuel** façon Time Timer (un disque qui se vide) : plus parlant qu'un compte à rebours pour les jeunes et les élèves avec des troubles de l'attention.
17. **Ambiance sonore** (bruit blanc, pluie) pendant la séance.
18. **Pauses guidées** : respiration, étirements, « lève-toi et bois un verre d'eau ».
19. **Carnet des distractions** : une pensée parasite arrive, on la note en un clic et on la traite plus tard.
20. **Séance en classe synchronisée** : le prof lance un Pomodoro collectif projeté au tableau.
21. **Révision silencieuse en groupe** : on voit les camarades « en séance » sans pouvoir leur parler. ⚠️ Social : borné à l'école, cadré pour des mineurs.

### 4. Suivre et réfléchir

22. **Suivi d'habitudes** : « 20 min de maths par jour », un calendrier qui se colorie, une série de jours.
23. **Bilan de la semaine** : trois questions le dimanche (ce que j'ai réussi, ce qui a coincé, ce que je change).
24. **Journal de séance** : après un Pomodoro, une ligne « j'ai fait… / je bloque sur… ».
25. **Statistiques de temps** : heures par matière, moments où l'élève est le plus efficace, sur un graphique simple.
26. **Météo de l'humeur ou de l'énergie** avant de travailler, mise en regard de l'efficacité.
27. **Objectifs SMART** : un assistant qui transforme « être meilleur en maths » en objectif précis, mesurable et daté.
28. **Lien avec Ma progression** : un objectif d'organisation (« réviser les fractions ») se ferme quand la notion est acquise dans l'appli.

### 5. Apprendre à apprendre

29. **Répétition espacée** : un calendrier « revoir cette notion à J+1, J+3, J+7, J+21 », branché sur les paquets de révision.
30. **Fiche « comment réviser »** : des méthodes efficaces (se tester, alterner les sujets) plutôt que relire.
31. **Préparation de contrôle** : une liste à cocher (j'ai refait les exercices, j'ai ma calculatrice, j'ai relu le cours…).
32. **Auto-évaluation avant / après** : « je pense savoir faire » puis « j'ai su faire », pour corriger l'excès de confiance.
33. **Cartable du lendemain** : une liste à cocher du matériel selon l'emploi du temps.

### 6. Motivation (univers Chiphre)

34. **Récompenses en jeu** : une séance Pomodoro finie ou une série tenue rapporte de la monnaie de la boutique, ou fait grandir un Mathoux.
35. **Défis de régularité** proposés par le prof à la classe (collectif, sans classement individuel).
36. **Badges d'organisation** : « 1re semaine planifiée », « grenouille mangée 5 fois »…
37. **Bulle de temps** : un minuteur dans un coin de l'écran pendant les exercices, sans quitter la page.

### 7. Côté prof et parents

38. **Vue prof de la charge** : combien de travail tombe sur une même semaine.
39. **Rappels automatiques** (J-3 et J-1 d'un rendu), en notification ou dans l'appli. Recoupe les rappels du Palotin.
40. **Carnet de liaison** : partager aux parents, si l'élève le veut, le bilan de la semaine ou le temps de travail. ⚠️ Question d'accès à trancher.

## Sélection : plus forte valeur et meilleure intégration à Chiphre (2026-11-20, non validée)

Critère : l'outil se nourrit de ce que l'appli sait déjà, pour que l'élève n'ait presque rien à saisir. Un outil d'organisation qu'il faut remplir à la main est abandonné en deux semaines.

Briques vérifiées dans le code :

- échéances des devoirs du cahier de texte, toujours un jour de cours de la classe (`src/lib/server/journal-homework.ts`, `src/lib/utils/class-sessions.ts`) ;
- contrôles assignés avec `deadline` et série (`evaluations`) ;
- cartes de révision dues (FSRS) ;
- les cinq formes de série ;
- jours travaillés et bonus de constance du Mathoux (`src/lib/server/buddy-xp-service.ts`) ;
- forfait du Palotin qui récompense l'effort et non la réussite (`src/lib/server/srs/review-session-reward.ts`, décision du 2026-10-18).

0. **Préalable : Kanban et Pomodoro dans le menu élève.**
1. **« Ma semaine »** (idées 1, 7, 39) : une page qui assemble toute seule les devoirs à rendre, les contrôles à venir et les cartes de révision dues, plus les tâches perso de l'élève. Les échéances tombent déjà sur les jours de cours. C'est le socle des autres.
2. **« Préparer mon contrôle »** (2, 29, 31, 32) : à partir d'un contrôle daté, un plan qui enchaîne les formes de série existantes. Par exemple J-7 flash-cards sur les notions, J-3 Saisie, J-1 Contrôle blanc. Auto-évaluation avant / après, reliée à Ma progression. C'est l'idée la plus propre à Chiphre.
3. **Séance de travail** (13, 15, 37) : on lance le Pomodoro depuis un devoir ou une carte, le temps est rattaché à la tâche, le mode concentration masque le chat, la boutique et les jeux, et un petit minuteur flotte pendant les exercices. Rejoint le futur chantier « limite de temps sur les jeux ».
4. **Régularité récompensée** (22, 34) : un calendrier des jours travaillés, à partir de ce que le Mathoux enregistre déjà. Une séance finie compte comme un effort pour le Mathoux ou le Palotin, dans la logique « effort, pas réussite ».
5. **Bilan de la semaine** (23, 6, 25) : ce qui a été fait, prérempli à partir des traces et des séances, avec l'estimation comparée au temps réel. L'élève ajoute trois phrases. Le partage au carnet de liaison viendrait plus tard (question d'accès).
6. **Le Palotin comme voix des rappels** (39) : « ton DM est pour jeudi », « 12 cartes t'attendent ». C'est le futur chantier « rappels du Palotin », qui se branche sur « Ma semaine ».
7. **Bonus peu coûteux : Pomodoro collectif en classe** (20) : la forme « En classe » a déjà un minuteur projeté.

Écartées pour l'instant :

- Eisenhower, grenouille, SMART, budget temps : génériques, sans lien avec les données de l'appli.
- Emploi du temps perso : les jours de cours sont déjà connus.
- Ambiance sonore, badges seuls : faible valeur.
- Révision silencieuse en groupe : social entre mineurs, coût RGPD élevé pour un gain faible.

## Ordre proposé (non validé)

1. **Kanban et Pomodoro dans le menu élève** : petit, valeur immédiate.
2. **Pomodoro relié au Kanban (13), devoirs relié au Kanban (7)** : deux outils isolés deviennent un système.
3. **Agenda (1) et planificateur de révisions (2, 29)** : le plus utile en maths, appuyé sur ce que l'appli connaît déjà (devoirs, notions, révisions).
4. Ensuite la réflexion (23, 6) et la motivation en jeu (34).

Les idées sociales ou partagées (21, 35, 40) touchent aux données de mineurs : question d'accès d'abord.
