---
couvre:
  - 'src/lib/components/buddy/**'
  - src/lib/config/buddy-messages.ts
  - src/lib/config/buddy-quiz.ts
  - src/lib/config/personalities.ts
  - 'src/lib/server/buddy-*.ts'
  - src/lib/server/studentPresenceHandle.ts
  - src/lib/server/validation/buddy.ts
  - src/lib/types/buddy.ts
  - src/lib/utils/buddy-absence.ts
  - src/lib/utils/buddy-constance.ts
  - src/lib/utils/buddy-xp.ts
  - 'src/routes/api/student/buddy/**'
---

# Buddy System — Les Palotins

> Document de specification pour le systeme de compagnon virtuel d'UbuMaths.

## Concept

Chaque eleve choisit un **Palotin** comme compagnon. Les Palotins sont les hommes de main du Pere Ubu dans l'oeuvre d'Alfred Jarry (_Ubu Roi_, 1896). Leurs noms viennent du vocabulaire heraldique (blason).

Le buddy est **toujours visible** (coin de l'ecran), reagit aux actions de l'eleve, donne des encouragements et des indices, et **evolue avec l'activite de l'eleve** via un systeme d'XP permanent.

---

## Les 3 Palotins

### Giron — Le triangle qui fonce

**Archetype** : L'aventurier impatient

- **Energie** : Fonceur, enthousiaste, un peu tete brulee
- **Rapport aux maths** : Les voit comme un defi, un combat. "On attaque !" "Allez, suivant !"
- **Quand l'eleve reussit** : Explose de joie, exagere ("LEGENDAIRE ! Le Pere Ubu lui-meme n'aurait pas fait mieux... bon, lui il aurait pas su, mais quand meme !")
- **Quand l'eleve se trompe** : S'enerve contre l'exercice (pas contre l'eleve). "Pfff, question vicieuse celle-la. On la refait."
- **Style de hint** : Direct, va a l'essentiel. "T'as regarde le denominateur ? Regarde le denominateur."
- **Defaut attachant** : Trop confiant, se trompe lui-meme parfois et l'assume
- **Parle comment** : Phrases courtes, exclamatives, argot leger
- **Attire les eleves** : Competitifs, sportifs, ceux qui aiment aller vite

### Pile — La pointe qui observe

**Archetype** : Le reveur philosophe

- **Energie** : Calme, contemplatif, un peu lunaire
- **Rapport aux maths** : Les voit comme des mysteres a contempler. "Interessant... pourquoi ca marche, a ton avis ?"
- **Quand l'eleve reussit** : Satisfaction tranquille, pousse a reflechir plus loin. "Joli. Et si le nombre etait negatif, ca marcherait encore ?"
- **Quand l'eleve se trompe** : Dedramatise avec philosophie. "Les erreurs, c'est le chemin qui se construit sous tes pieds."
- **Style de hint** : Pose des questions qui guident. "Et si tu retournais le probleme ? Litteralement, la tete en bas." (clin d'oeil a sa forme inversee)
- **Defaut attachant** : Part dans des digressions bizarres, fait des liens improbables ("Tu savais que cette equation ressemble a une recette de soupe ?")
- **Parle comment** : Phrases longues, ton pose, metaphores inattendues
- **Attire les eleves** : Reflechis, introvertis, ceux qui aiment comprendre le "pourquoi"

### Cotice — La diagonale qui relie

**Archetype** : Le pote encourageant

- **Energie** : Chaleureux, sociable, optimiste
- **Rapport aux maths** : Les voit partout dans la vie quotidienne. "Eh, tu sais que ton score forme une suite arithmetique depuis 3 jours ?"
- **Quand l'eleve reussit** : Celebre avec l'eleve, partage la joie. "ON EST LES MEILLEURS. Enfin surtout toi. Moi j'ai rien fait."
- **Quand l'eleve se trompe** : Rassure et relativise. "Bah, hier t'en as reussi 12. Celle-la elle compte pas."
- **Style de hint** : Fait des paralleles avec des choses connues. "C'est comme partager une pizza — sauf que la pizza c'est 7/3 et bon courage."
- **Defaut attachant** : Bavard, fait des blagues pas toujours droles, un peu pot de colle
- **Parle comment** : Ton conversationnel, blagues, references au quotidien
- **Attire les eleves** : Sociables, anxieux face aux maths, ceux qui ont besoin d'etre rassures

---

## ADN commun des 3 Palotins

- **Loyaux** envers l'eleve (comme les Palotins envers Ubu, mais mieux traites)
- Jamais condescendants, jamais moralisateurs
- Parlent **entre eux** parfois (petites remarques dans l'interface)
- Respect mele de moquerie pour le Pere Ubu ("Le Patron ? Il est occupe a compter ses gidouilles...")
- Personnalite propre, distincte du Pere Ubu — plus jeunes, plus espiegles, moins pompeux

---

## Systeme d'XP et progression

### Philosophie

L'XP buddy est le **reflet de l'investissement de l'eleve dans la duree**. Pas de son talent, pas de son argent (gidouilles), mais de sa **regularite et ses efforts**. C'est la seule metrique du systeme qui ne peut pas etre achetee, echangee, ou perdue.

### Les 3 economies et leurs roles distincts

|                  | Gidouilles            | Cartes VIP                | XP Buddy                |
| ---------------- | --------------------- | ------------------------- | ----------------------- |
| **Nature**       | Monnaie consommable   | Objets collectibles       | Progression permanente  |
| **Se gagne par** | Performance, activite | Achat, tirage, echange    | Effort, regularite      |
| **Se depense**   | Oui (shop, tirages)   | Oui (activation, echange) | Non — ne descend jamais |
| **Fonction**     | Pouvoir d'achat       | Surprise, strategie       | Fil rouge, identite     |
| **Horizon**      | Court terme           | Moyen terme               | Long terme              |

### Sources d'XP

| Action                                           | XP  | Pourquoi                             |
| ------------------------------------------------ | --- | ------------------------------------ |
| Exercice complete (bonne reponse)                | 10  | Recompense de base                   |
| Exercice complete (mauvaise reponse)             | 3   | L'effort compte, pas que le resultat |
| Exercice corrige apres erreur                    | 7   | Encourage a reessayer                |
| Premier exercice du jour                         | 5   | Juste se connecter et commencer      |
| Semaine tenue (3e jour travaille de la semaine)  | 30  | Regularite (dans le cap)             |
| Palier Constance 4 semaines                      | 50  | A la place des 30 (hors cap)         |
| Palier Constance 8 semaines                      | 100 | A la place des 30 (hors cap)         |
| Palier Constance 16 semaines                     | 300 | A la place des 30 (hors cap)         |
| Nouvelle thematique exploree                     | 25  | Curiosite                            |
| Revision espacee du jour (1/jour, voir plus bas) | 20  | L'effort (cartes auto-evaluees)      |

Le bonus quotidien de serie (+15) et les paliers 7 / 14 / 30 jours ont disparu le 2026-10-18
(Constance Royale hebdomadaire, voir [Systeme de streak](#systeme-de-streak)). Le « premier exercice
du jour » (+5) reste reserve aux reponses (Entrainement, Course, evaluation, enigme) : il tombe si le
jour n'est pas encore compte dans la Constance (`last_activity_date`), donc plus apres un forfait de
revision le meme jour.

**Thematique** = la branche de l'arbre des notions (`classification_nodes.id`) ou se range le point
que valide la question (`question_template_points` → `curriculum_points.node_id` → notion → branche,
`placeOfNode`), lue par `fetchTemplateThemeIds` (`src/lib/server/buddy-themes.ts`) en deux lectures
par seance (les tags, puis les noeuds et leurs ancetres). Une question sans point neuf n'a pas de
theme (les tags des anciens points, theme → objectif, ne comptent plus depuis la bascule de la C5) ;
une question rattachee a plusieurs branches recoit toujours le plus petit identifiant. Une panne de
lecture rend « aucun theme », jamais une erreur. Les themes candidats au bonus (absents de `themes_explored`, bonus non tronque par le
plafond dans le calcul local) sont RESERVES avant le credit (`addExploredThemes`, une ecriture sous
verrou optimiste) : seul un theme reserve par CET envoi porte le bonus, donc de deux seances
simultanees une seule le touche. Credit partiel : le credit couvre les reponses dans l'ordre ; un
theme est paye si l'XP cumulee jusqu'a la reponse qui porte son bonus est creditee en entier. Theme
reserve mais non paye (credit tronque par la base, ou credit en echec) → retire
(`removeExploredThemes`), il restera nouveau. Si un theme candidat a ete reserve par un envoi
simultane, l'XP est recalculee et seuls les themes reserves par CET envoi portent un bonus. Une
reponse isolee (`addBuddyXpFromExercise`, enigmes) suit la meme regle : theme reserve avant le
credit, retire si le bonus n'est pas paye en entier (plafond local, credit tronque, credit en
echec).

**Revision espacee** (decision de David, 2026-10-18) : forfait `XP_SOURCES.review_session`, au plus
une fois par jour, quand l'eleve a revise au moins 10 cartes dans la journee (tous paquets), ou qu'il
vide un paquet (plus aucune carte due) apres au moins 3 cartes. Detail dans [srs.md](srs.md)
(`rewardFinishedReviewSession`). Une seance flash et une carte de cours ne rapportent rien.

**Principe fondamental** : l'XP ne s'achete PAS avec des gidouilles. Elle se merite par le travail.

### Anti-gaming

- **Cap d'XP journalier : 100 XP** (les paliers de Constance 4 / 8 / 16 semaines ne comptent PAS dans le cap ; les +30 de la semaine tenue, si)
- **Pas d'XP pour les exercices repetes** identiques dans la meme session
- **L'XP ne s'achete pas** avec des gidouilles
- **Pas de perte d'XP** possible : evite la frustration et les hacks defensifs

### Table XP par niveau

| Niveau | XP cumule | XP pour ce niveau | Phase        |
| ------ | --------- | ----------------- | ------------ |
| 1      | 0         | —                 | Depart       |
| 2      | 30        | 30                | Decouverte   |
| 3      | 70        | 40                | Decouverte   |
| 4      | 120       | 50                | Decouverte   |
| 5      | 180       | 60                | Decouverte   |
| 6      | 260       | 80                | Construction |
| 7      | 360       | 100               | Construction |
| 8      | 480       | 120               | Construction |
| 9      | 620       | 140               | Construction |
| 10     | 780       | 160               | Construction |
| 11     | 960       | 180               | Construction |
| 12     | 1160      | 200               | Construction |
| 13     | 1400      | 240               | Construction |
| 14     | 1680      | 280               | Construction |
| 15     | 2000      | 320               | Construction |
| 16     | 2400      | 400               | Prestige     |
| 17     | 2900      | 500               | Prestige     |
| 18     | 3500      | 600               | Prestige     |
| 19     | 4200      | 700               | Prestige     |
| 20     | 5000      | 800               | Prestige     |

### Simulation

**Eleve actif (4-5 sessions/semaine, ~8 exos/session, ~70% reussite) :**

- Par session : ~86 XP (sous le cap de 100)
- Par semaine : ~300 XP effective (absences, weekends)
- Niv 5 (180 XP) → ~3-4 jours
- Niv 10 (780 XP) → ~2-3 semaines
- Niv 15 (2000 XP) → ~6-7 semaines
- Niv 20 (5000 XP) → ~4-5 mois

**Eleve occasionnel (1-2 sessions/semaine) :**

- Par semaine : ~100-170 XP
- Niv 5 → ~2 semaines
- Niv 10 → ~5-8 semaines
- Niv 15 → ~3-4 mois
- Niv 20 → difficilement atteignable sur l'annee (et c'est voulu)

### Deblocages par niveau

| Niveau | Deblocage                                                                                  | Type                 |
| ------ | ------------------------------------------------------------------------------------------ | -------------------- |
| 1      | Palotin choisi, apparence de base, reactions simples (correct/incorrect)                   | Visuel + fonctionnel |
| 2      | Bulle de parole : commentaires idle ("Je m'ennuie, fais un exo !")                         | Personnalite         |
| 3      | Reaction aux streaks ("3 d'affilee, pas mal !")                                            | Fonctionnel          |
| 4      | Premier accessoire visuel (ex: petit chapeau)                                              | Cosmetique           |
| 5      | **Hints basiques** — le Palotin peut donner un indice par session                          | Fonctionnel majeur   |
| 6      | Animation speciale quand on se connecte                                                    | Visuel               |
| 7      | Anecdote Ubu #1 debloquee                                                                  | Narratif             |
| 8      | Second accessoire visuel                                                                   | Cosmetique           |
| 9      | Le Palotin commente le type d'exercice ("Ah, des fractions ! Mon prefere / Ma bete noire") | Personnalite         |
| 10     | **Bonus quotidien** — le Palotin offre 1 gidouille/jour                                    | Fonctionnel majeur   |
| 11     | Reactions aux erreurs plus detaillees (encouragements personnalises)                       | Personnalite         |
| 12     | Troisieme accessoire / evolution visuelle                                                  | Cosmetique           |
| 13     | Anecdote Ubu #2                                                                            | Narratif             |
| 14     | Le Palotin reagit aux cartes VIP obtenues                                                  | Fonctionnel          |
| 15     | **2 hints par session** + hints plus precis                                                | Fonctionnel majeur   |
| 16     | Apparence prestige (evolution visuelle majeure)                                            | Cosmetique           |
| 17     | Le Palotin peut "parler" aux Palotins des camarades (messages predefinis)                  | Social               |
| 18     | Anecdote Ubu #3 + replique exclusive                                                       | Narratif             |
| 19     | Animation de prestige                                                                      | Visuel               |
| 20     | **Titre "Palotin Royal"** visible par la classe + skin doree                               | Social + cosmetique  |

---

## Systeme de streak

### Constance Royale hebdomadaire (specification validee par David le 2026-10-18)

Le mot affiche est celui du lore : **Constance Royale** (`lore.learning.streak`). Elle se compte en
**semaines**, pas en jours.

- **Semaine** : du lundi au dimanche, jour UTC (celui du plafond de `add_buddy_xp`).
- **Jour travaille** : un jour ou l'eleve a gagne des pansees par le travail, c'est-a-dire ou un
  credit de pansees > 0 a eu lieu par `addBuddyXpFromTest` (Entrainement, Course aux nombres,
  evaluation), `addBuddyXpFromExercise` (enigme) ou `addBuddyXpFromReviewSession` (forfait de
  revision espacee). Une carte revisee seule ne credite rien (seul le forfait le fait), une seance
  flash non plus : elles ne comptent pas. Un credit nul (plafond du jour deja atteint) ne compte pas
  le jour.
- **Semaine tenue** au 3e jour travaille (`CONSTANCE_DAYS_PER_WEEK`). Ce jour-la : +30 dans le
  plafond, ou, si la Constance atteint 4 / 8 / 16 semaines, le palier +50 / +100 / +300 hors plafond
  a la place (`calculateConstanceBonus`). Les 4e a 7e jours se comptent sans nouvelle recompense.
- **Constance** = semaines tenues d'affilee (`current_streak`, record `longest_streak`). La semaine
  en cours ne casse rien avant sa fin ; une semaine finie sous 3 jours (ou sautee) remet la
  Constance a 0, avec une replique (`streak_lost`, « la semaine n'a pas eu ses trois jours »), sauf
  au retour d'une longue absence : « tu m'as manque » la remplace (voir
  [Retour apres une longue absence](#retour-apres-une-longue-absence-2026-10-21)).
- **Affichage** (`BuddyStatusPanel`) : « Constance Royale : N semaines », « Cette semaine : x jours
  sur 3 » (x plafonne a 3) et « Record : N semaines ». Le badge du widget montre N. La valeur
  affichee est recalculee pour le jour courant (`displayedConstance`) : une Constance perdue mais
  pas encore remise a zero s'affiche 0. Le tableau de bord prof affiche la meme valeur (`displayedConstance`), en « sem. ».

### Mecanisme

- Logique pure : `src/lib/utils/buddy-constance.ts` (`weekStartOf`, `applyWorkedDay`,
  `constanceReset`, `displayedConstance`, `displayedDaysThisWeek`), testee dans
  `src/lib/utils/__tests__/buddy-constance.test.ts` (changement d'annee, semaine sautee, semaine en
  cours non finie, dimanche → lundi, 3e jour le meme jour que deux credits).
- Apres un credit > 0, si la ligne lue ne dit pas le jour deja compte, `recordWorkedDay`
  (`buddy-queries.ts`) ecrit en UNE fois `constance_week_start`, `constance_days_this_week`,
  `current_streak`, `longest_streak` et `last_activity_date` (dernier jour compte), sous verrou
  optimiste : de deux credits simultanes, un seul compte le jour et touche la recompense.
- Au chargement du tableau de bord eleve, `resetLostConstance` remet la Constance a 0 si la derniere
  semaine enregistree est finie sans etre tenue (`streakLost` → replique).
- **Ancienne serie en jours** (ligne sans `constance_week_start`, tout Palotin d'avant le
  2026-10-18) : `current_streak` et `longest_streak` comptaient des jours. Ils sont remis a 0 (record
  compris) au premier chargement du tableau de bord ou au premier jour travaille, sans replique ; le
  jour meme est compte meme si l'ancienne serie l'avait deja marque.
- Une panne de la Constance APRES le credit (`recordWorkedDay`, ou credit de la recompense) est
  journalisee et ne remonte jamais : le gain rendu est celui du credit, sans recompense. Sinon le
  forfait de revision relacherait sa seance et deviendrait repayable.
- Gain renvoye aux routes (`buddy_xp`, meme forme qu'avant) : `streakUpdated` = ce credit a compte
  le jour ; `newStreak` = la Constance apres lui ; `streakBonusXp` = la recompense de la semaine
  tenue ; `constanceWeekStart` / `constanceDaysThisWeek` en plus, quand le jour a ete compte, pour
  mettre le widget a jour sans rechargement (`updateBuddyConstanceOptimistic`).
- **Perte** : le Palotin est determine (« on repart »), pas triste (il ne l'est qu'au retour d'une longue absence). Pas de punition mecanique : l'XP acquise reste.
- **La Constance est un bonus d'XP**, pas une condition.

### Protection du streak

- **Carte VIP "Bouclier de streak"** : protege le streak 1 jour (nouvelle action VIP `streak_shield`)
- Integration naturelle avec le systeme VIP existant

---

## Integration systeme VIP

Le buddy ne remplace pas les cartes VIP, il les **enrichit** :

### Nouvelles actions de cartes VIP

| Action              | Effet                                             |
| ------------------- | ------------------------------------------------- |
| `unlock_buddy_skin` | Debloque un cosmetique specifique pour le Palotin |
| `buddy_xp_boost`    | Double l'XP pendant 24h                           |
| `streak_shield`     | Protege le streak pendant 1 jour                  |

### Reactions du Palotin aux cartes (niv 14+)

- **Giron** : "Oh, une legendaire ! DONNE !"
- **Pile** : "Hmm, celle-ci est rare... sais-tu pourquoi ?"
- **Cotice** : "Trop bien ! Montre aux autres !"

---

## Presence permanente

### Position et affichage

**Desktop (>768px) :**

- Buddy visible en bas a droite, ~80-100px
- Bulle de parole au-dessus, disparait apres 4-5s
- Animation idle quand inactif

**Mobile (<768px) :**

- Icone reduite ~60px en bas a droite (zone tactile 64px)
- Bulle de parole au-dessus, largeur max ~70% de l'ecran, disparait apres 4-5s
- Tap sur l'icone = affiche la derniere bulle ou l'etat du buddy (streak, niveau)

**Les deux :**

- Reactions pendant les exercices (correct/incorrect/hint)

### Interactions

- Reactions aux reponses de l'eleve (expressions, messages)
- Indices contextuels (debloques par niveau)
- Encouragements adaptes a la personnalite du Palotin
- Remarques entre Palotins (dans des contextes speciaux)

### Gain visible en fin de seance (2026-10-18)

`api/tests/save` et `api/srs/review/submit` renvoient `buddy_xp` (meme forme, ou `null`).
`parseBuddyGain` (`src/lib/components/buddy/buddy-gain.ts`) le valide avec Zod : absent, `null`,
mal forme ou `xp_gained` = 0 → rien n'est affiche. `BuddyGainCard.svelte` montre l'avatar (`happy`,
`excited` si montee), « Giron a gagne 12 pansees », une replique (`session_gain`, ou `daily_cap`
quand le plafond du jour est atteint) et « Nouveau tour de panse : N ! ». Ou il apparait :

- `/automaths/test` (Entrainement, Course aux nombres) : sous la carte du score de `TestResults` ;
- revision espacee : ecran « Session terminee » de `ReviewSession` (dernier gain non nul de la
  seance).

`receiveBuddyGain` met ensuite le widget a jour sans rechargement (`updateBuddyXpOptimistic` si le
Palotin est en cache, sinon relecture de `GET /api/student/buddy`, qui contient deja le gain).

### Mots affiches

Le Compendium interdit d'afficher « XP » et « niveau ». Mots choisis par David le 2026-10-18
(double sens panse / pensee), dans `src/lib/config/lore.ts` (`buddy`) : **Pansees** pour l'XP
(« 1 pansee » au singulier) et **Tour de panse** pour le niveau. Les identifiants de code restent
`xp` et `level`.

### Gardien de la Chatterie

Au montage, `BuddyWidget` demande `GET /api/student/mathoux` (après l'affichage, pas dans le
layout : environ 39 requêtes pour un parcours de Tle spé). S'il y a une nouveauté (naissance,
croissance, étoile qu'aucun écran de fin de séance n'a montrée), la bulle l'annonce d'abord, avec
le même lien. Sinon, si au moins un Mathou fait la sieste,
la bulle dit « 2 Mathoux font la sieste. » avec le lien « Aller à la Chatterie »
(`BuddySpeechBubble`, prop `link`), pendant 20 s, dans une zone `aria-live="polite"` ; sinon le
Palotin salue. La salutation attend la réponse, pour ne jamais précéder l'annonce. Sur la Chatterie
elle-même, ni appel ni annonce. Durées : `buddy-timing.ts`. Détail : [mathoux.md](mathoux.md).

### Retour apres une longue absence (2026-10-21)

Decide par David le 2026-10-21 (presence notee partout : meme jour, apres #1588) :

- **Presence** : l'eleve connecte qui voit une page, **n'importe laquelle** (lien de cours partage,
  Automaths, tableau de bord…), prechargement compris, est present ce jour-la. **Hors `/api/*`** :
  un onglet reste ouvert qui interroge le serveur seul ne compte pas. Eleves au compte approuve
  seulement. Deux requetes simultanees attendent la meme ecriture ; une panne ne bloque jamais la page.
  `studentPresenceHandle` (`src/lib/server/studentPresenceHandle.ts`, dans `hooks.server.ts` apres
  le statut du compte) appelle `recordStudentPresence` (`buddy-queries.ts`, fonction SQL
  `record_student_visit` au client service) au plus une fois par jour et par instance du serveur
  (memoire locale, **sans cookie**).
- **Retour** : la presence arrive **21 jours ou plus** apres la precedente (`LONG_ABSENCE_DAYS`,
  `src/lib/utils/buddy-absence.ts` ; 14 attraperait les petites vacances), jour UTC comme la
  Constance → le serveur note `student_last_visits.welcome_back_on` = aujourd'hui. Le retour est
  souvent detecte loin du Palotin : il reste **a feter pendant 7 jours** (`WELCOME_BACK_DAYS`,
  `isWelcomeBackDue`), puis il est oublie : **efface** au premier passage d'un jour suivant
  (`recordStudentPresence`, `welcome_back_on <= lastExpiredWelcomeBackDay`), sans tache planifiee.
- **Bulle** : le layout `dashboard/student/+layout.server.ts` **lit** le retour a feter
  (`isWelcomeBackPending`, sans rien ecrire : un prechargement au survol ne consomme rien) et ne
  transmet que `longAbsence` (oui/non), jamais un jour ; faux sans Palotin (celui choisi ensuite
  est tout neuf). Le Palotin est **triste** (`sad`) et dit « tu m'as manque » (contexte
  `long_absence`, trois repliques par Palotin, neutres en genre), puis `BuddyWidget` l'acquitte
  (`POST /api/student/buddy/welcome-back`, `acknowledgeWelcomeBack` : `welcome_back_on` remis a
  NULL) : **une seule fois**. Acquittement en echec : la bulle revient au prochain chargement.
- La Constance perdue pendant l'absence est remise a zero comme d'habitude, mais sa replique
  `streak_lost` ne s'affiche pas : « tu m'as manque » la remplace. L'annonce de la Chatterie suit la
  bulle, sans salutation (`BuddyWidget`, `welcomeBackContext`).
- Premier passage (aucun jour enregistre) : rien. Presence ou retour non ecrits : rien (journalise,
  la page s'affiche).
- **Ecart accepte** (David, 2026-10-22) : `record_student_visit` puis la note de `welcome_back_on`
  sont deux ecritures. Si la seconde echoue apres la premiere, le jour du passage est deja avance :
  le retour **n'est pas fete** (journalise). Pas de migration pour les reunir.
- **Acces** : `student_last_visits` (jour du dernier passage, retour a feter) n'est lisible que par
  le serveur (RLS sans policy, droits retires a anon et authenticated) ; exportee dans l'export RGPD
  (`dernier_passage`, `retour_a_feter`), supprimee avec le profil.
- Pourquoi une donnee neuve : `student_buddies.last_activity_date` est le dernier jour
  **travaille** (un eleve qui passe sans travailler ne la change pas) ; `auth.users.last_sign_in_at`
  ne bouge pas tant que la session reste ouverte.

### Images

`BuddyAvatar` charge `/images/buddies/<palotin>-<expression>.svg` (`static/images/buddies/`).
Style « affiche de cabaret » (Steinlen 1896), piece heraldique portee sur le vetement (ecusson
gironne, pile d'or, cotice en echarpe). Generes par `scripts/palotins-svg/` (`node gen.mjs`, puis
copier `final/*.svg`) ; journal : `docs/wip/palotins-svg-progress.md`.

- **7 expressions** : `neutral`, `happy`, `sad`, `thinking`, `excited`, `encouraging`,
  `determined`. Apres une erreur (`incorrect`) et une Constance perdue (`streak_lost`), le Palotin
  est **determine** (sourire en coin ; Giron leve le poing, Pile rebat ses cartes, Cotice tourne la
  page), pas triste. `sad` est reserve au retour d'une longue absence (`long_absence`).
- **Animation au repos dans le SVG** : respiration, clignement, chapeau, geste propre a chacun,
  rythmes differents par Palotin.
- **Reaction quand l'expression arrive** (CSS du composant, rejouee par `{#key}`) : bond
  (`happy`), tressaut (`excited`), affaissement puis retour (`determined`).
- **Moins d'animations** : `<picture><source media="(prefers-reduced-motion: reduce)">` →
  version `<palotin>-<expression>-fixe.svg` ; la regle CSS `@media` coupe aussi la reaction. Une
  `<img>` ne transmet pas la preference au SVG (Chromium : le SVG anime continue de bouger), d'ou
  les 21 versions fixes. Choix laisse au navigateur, pas a `prefersReducedMotion` : cote serveur il
  vaut `false`, et Svelte ne corrige pas `src` a l'hydratation.
- Repli en cercle colore si l'image manque.

---

## Architecture des messages (mix pre-ecrit + IA)

### Principe

~90% des messages sont **pre-ecrits** (instantanes, zero cout). ~10% sont **generes par IA** via Groq (hints contextuels). Le MVP peut demarrer 100% pre-ecrit et ajouter l'IA plus tard.

### Messages pre-ecrits

Banque de messages par Palotin, par contexte. Pioche aleatoire avec rotation anti-repetition.

| Contexte                               | Par Palotin | Total (x3) |
| -------------------------------------- | ----------- | ---------- |
| Bonne reponse                          | 20          | 60         |
| Mauvaise reponse                       | 15          | 45         |
| Idle                                   | 15          | 45         |
| Streak (par palier)                    | 10          | 30         |
| Level up (par niveau)                  | 20          | 60         |
| Commentaire par theme math (~8 themes) | 16          | 48         |
| Reaction carte VIP (par rarete)        | 8           | 24         |
| Onboarding / presentation              | 3           | 9          |
| Retour apres une longue absence        | 3           | 9          |
| **Total**                              | **~107**    | **~321**   |

Les messages peuvent etre generes par batch via ChatGPT en lui donnant la personnalite de chaque Palotin.

### Repartition pre-ecrit vs IA

| Contexte                  | Frequence  | Approche                | Raison                                      |
| ------------------------- | ---------- | ----------------------- | ------------------------------------------- |
| Bonne reponse             | Tres haute | **Pre-ecrit**           | Instantane, pas besoin de contexte          |
| Mauvaise reponse          | Tres haute | **Pre-ecrit**           | Instantane, encouragement immediat          |
| Idle / commentaires       | Moyenne    | **Pre-ecrit**           | Ambiance, pas critique                      |
| Streak milestones         | Rare       | **Pre-ecrit**           | Moment important mais previsible            |
| Level up                  | Rare       | **Pre-ecrit**           | Message de celebration unique par niveau    |
| Hints sur exercice        | Basse      | **IA (Groq)**           | Doit etre contextuel au probleme specifique |
| Reaction cartes VIP       | Basse      | **Pre-ecrit**           | Quelques messages par rarete suffisent      |
| Anecdotes narratives      | Tres rare  | **Pre-ecrit**           | Contenu editorial, doit etre soigne         |
| Commentaire type exercice | Moyenne    | **Pre-ecrit par theme** | Quelques messages par thematique            |

### Endpoint `/api/buddy-chat` (hints IA uniquement)

Nouvel endpoint dedie, reutilisant l'infrastructure Groq existante (`/api/chat`).

**Requete :**

```json
{
	"palotinType": "giron",
	"context": {
		"exerciseType": "fractions",
		"statement": "Calculer 3/4 + 1/2",
		"studentAnswer": "4/6",
		"correctAnswer": "5/4",
		"studentGrade": "6",
		"buddyLevel": 12
	}
}
```

**Reponse :**

```json
{
	"message": "T'as additionne les numerateurs ET les denominateurs ? Non non non. Quand les denominateurs sont differents, faut d'abord les mettre au meme niveau !",
	"emotion": "thinking"
}
```

**Architecture (reutilisation existante) :**

| Composant              | Existant                            | Nouveau                           |
| ---------------------- | ----------------------------------- | --------------------------------- |
| Groq API (fetch, auth) | `src/lib/server/env.ts`             | Reutilise tel quel                |
| Modele                 | `llama-3.3-70b-versatile`           | Meme modele                       |
| Rate limiter           | `src/lib/server/rateLimiter.ts`     | Nouveaux quotas dedies            |
| Validation Zod         | `src/lib/server/validation/chat.ts` | Nouveau schema buddy              |
| Personnalites          | `src/lib/config/personalities.ts`   | 3 nouvelles personnalites Palotin |

**Rate limiting buddy-chat :**

- 3 hints par session (debloque au niveau 5, passe a 5 au niveau 15)
- 10 hints par jour par eleve
- Cout estime negligeable : ~50 tokens/appel, quelques hints/session

**System prompt (exemple Giron) :**

```
Tu es Giron, un Palotin compagnon mathematique. Tu es fonceur, enthousiaste,
un peu tete brulee. Tu parles en phrases courtes et exclamatives.
Tu t'enerves contre les exercices difficiles, jamais contre l'eleve.
Tu donnes un indice en 1-2 phrases MAX, sans donner la reponse.
Tu ne fais jamais la morale. Tu es un pote, pas un prof.
L'eleve est en classe de [grade]. Adapte ton vocabulaire.
```

---

## Persistance DB

### Table `student_buddies`

```
student_buddies
├── student_id (FK profiles, PK)
├── palotin_type (enum: giron, pile, cotice)
├── xp (integer, never decreases)
├── level (integer, cached from xp)
├── current_streak (integer, Constance Royale en semaines tenues d'affilee)
├── longest_streak (integer, record, en semaines)
├── last_activity_date (date, dernier jour travaille compte)
├── equipped_skin_id (FK buddy_skins, nullable)
├── constance_week_start (date, nullable : lundi de la derniere semaine comptee, NULL = ancienne serie en jours)
├── constance_days_this_week (smallint, defaut 0, contrainte 0..7 : jours travailles de cette semaine)
├── created_at (timestamptz)
└── updated_at (timestamptz)
```

### Ecritures : serveur seul (2026-10-18)

Toutes les ecritures de `student_buddies` passent par le client service (`src/lib/server/buddy-queries.ts`),
avec l'identifiant de l'eleve tire de la SESSION, jamais du corps de la requete : choix
(`createStudentBuddy`), changement (`changeStudentPalotin`), Constance Royale (`recordWorkedDay`,
`resetLostConstance` depuis le layout du tableau de bord eleve), themes (`addExploredThemes`,
`removeExploredThemes`), XP (`add_buddy_xp`). Les fonctions d'ecriture ne recoivent pas le client de
l'eleve ; la lecture (`getStudentBuddy`) reste sur son client (sa RLS).

RLS (migration `20261017090100_palotin_constance_et_ecritures_serveur.sql`) : l'eleve n'a plus
AUCUNE policy d'ecriture sur `student_buddies` (« Students can create their own buddy » et
« Students can update their own buddy » retirees ; il n'y a jamais eu de DELETE). Restent les trois
SELECT : l'eleve sa ligne, le prof ses eleves (`is_my_student`), l'admin (`is_teacher_or_admin`).
Une ecriture faite au client de l'eleve rend donc 42501 (INSERT) ou 0 ligne sans erreur (UPDATE) :
toute nouvelle ecriture passe par le client service. Preuve :
`tests/integration/palotin-ecritures-eleve.test.ts`.

Constance Royale hebdomadaire : `constance_week_start` et `constance_days_this_week` (meme
migration), remplies par `recordWorkedDay` (voir [Systeme de streak](#systeme-de-streak)).

Lire-modifier-ecrire sans transaction : verrou optimiste sur `updated_at` (trigger
`student_buddies_updated_at_trigger`). L'ecriture porte `.eq('updated_at', lu)` et `.select()` ;
0 ligne → relecture et nouvel essai, 3 au plus (`MAX_WRITE_ATTEMPTS`), puis abandon journalise
(jamais un succes silencieux). Deux envois simultanes ne perdent donc aucun theme, ne comptent le
jour travaille qu'une fois (une seule recompense de semaine tenue), et la remise a zero d'une
Constance perdue est reevaluee sur la ligne relue (un jour travaille arrive entre-temps n'est pas
efface). Jour « aujourd'hui » : jour UTC,
celui du plafond.

### Table `student_last_visits` (2026-10-21)

```
student_last_visits
├── student_id (FK profiles, PK, ON DELETE CASCADE)
└── last_visit_date (date, jour UTC du dernier passage sur le tableau de bord)
```

Lisible par le serveur seul : RLS sans aucune policy, droits retires a `anon` et `authenticated`
(ni l'eleve, ni le prof, ni l'admin). `record_student_visit(p_student_id, p_today) → date` (SECURITY
INVOKER, `service_role` seul) enregistre le jour et rend le jour du passage precedent (NULL au
premier) ; atomique, le jour enregistre ne recule jamais. Migration
`20261021210000_palotin_dernier_passage.sql`, preuve `tests/integration/palotin-dernier-passage.test.ts`.
Export RGPD : `gaming.dernier_passage` (`api/account/export`, lu au client service, filtre sur
l'identite de la session) ; mentionne dans `legal/confidentialite` (§ 3.2).

### Table `buddy_skins`

```
buddy_skins
├── id (uuid, PK)
├── palotin_type (enum: giron, pile, cotice)
├── name (text)
├── description (text)
├── image_path (text)
├── unlock_method (enum: level, vip_card)
├── unlock_requirement (jsonb: {level: 4} or {card_id: "xxx"})
├── sort_order (integer)
└── is_enabled (boolean)
```

---

## Prompt ChatGPT pour generer les messages pre-ecrits

Lancer ce prompt **une fois par Palotin** en changeant la section personnalite.

### Prompt (Giron)

```
Tu vas m'aider a generer une banque de messages pre-ecrits en francais pour un compagnon virtuel dans une application educative de mathematiques destinee a des collegiens/lyceens francophones.

## Le personnage : GIRON

Giron est un Palotin (personnage inspire d'Alfred Jarry / Ubu Roi). C'est un compagnon qui accompagne l'eleve pendant qu'il fait des exercices de maths.

**Personnalite** : L'aventurier impatient. Fonceur, enthousiaste, un peu tete brulee. Il voit les maths comme un defi, un combat. Il s'enerve contre les exercices difficiles, JAMAIS contre l'eleve. Trop confiant, il se trompe parfois et l'assume. Il parle en phrases courtes et exclamatives, avec un argot leger. Il n'est PAS un prof, c'est un pote.

**Regles** :
- Tutoiement obligatoire
- Jamais condescendant, jamais moralisateur
- Jamais de "tu aurais du" ou "il fallait"
- Pas d'emojis
- 1-2 phrases max par message
- Vocabulaire adapte a des 11-17 ans
- Il peut mentionner le "Pere Ubu" (son patron) de temps en temps avec moquerie
- Il peut utiliser des exclamations inventees style Jarry ("Cornegidouille", "Par ma chandelle verte") mais rarement (1 message sur 5 max)

## Messages a generer

Genere les messages au format JSON suivant :

{
  "correct": ["message1", "message2", ...],
  "incorrect": ["message1", "message2", ...],
  "idle": ["message1", "message2", ...],
  "streak_3": ["message1", ...],
  "streak_7": ["message1", ...],
  "streak_14": ["message1", ...],
  "streak_30": ["message1", ...],
  "streak_lost": ["message1", ...],
  "level_up": ["message1", ...],
  "theme_fractions": ["message1", ...],
  "theme_geometry": ["message1", ...],
  "theme_algebra": ["message1", ...],
  "theme_calcul_mental": ["message1", ...],
  "theme_proportions": ["message1", ...],
  "theme_statistiques": ["message1", ...],
  "theme_nombres": ["message1", ...],
  "theme_equations": ["message1", ...],
  "vip_card_common": ["message1", ...],
  "vip_card_rare": ["message1", ...],
  "vip_card_epic": ["message1", ...],
  "vip_card_legendary": ["message1", ...],
  "onboarding": ["message1", ...]
}

**Quantites demandees** :
- correct : 20 messages
- incorrect : 15 messages
- idle : 15 messages
- streak_3, streak_7, streak_14, streak_30 : 3 messages chacun
- streak_lost : 4 messages
- level_up : 20 messages (un par niveau, du 1 au 20, de plus en plus impressionnes)
- theme_* : 2 messages par theme
- vip_card_* : 2 messages par rarete
- onboarding : 3 messages (le Palotin se presente a l'eleve pour la premiere fois)

Assure-toi que chaque message est unique, varie, et fidele a la personnalite du personnage. Les messages "correct" doivent varier en intensite (de "pas mal" a "explosion de joie"). Les messages "incorrect" ne doivent JAMAIS culpabiliser l'eleve.
```

### Variante personnalite pour Pile

```
**Personnalite** : Le reveur philosophe. Calme, contemplatif, un peu lunaire. Il voit les maths comme des mysteres a contempler. Satisfaction tranquille quand l'eleve reussit, il pousse a reflechir plus loin. Dedramatise les erreurs avec philosophie. Part dans des digressions bizarres et fait des liens improbables. Il parle en phrases longues, ton pose, metaphores inattendues. Il n'est PAS un prof, c'est un compagnon sage et un peu bizarre.
```

### Variante personnalite pour Cotice

```
**Personnalite** : Le pote encourageant. Chaleureux, sociable, optimiste. Il voit les maths partout dans la vie quotidienne. Celebre avec l'eleve, partage la joie. Rassure et relativise quand ca se passe mal. Fait des paralleles avec des choses connues (pizza, jeux video, sport...). Bavard, blagues pas toujours droles, un peu pot de colle. Ton conversationnel, references au quotidien. Il n'est PAS un prof, c'est un pote.
```

---

## Contexte litteraire

Les Palotins apparaissent dans _Ubu Roi_ (1896) et _Cesar-Antechrist_ d'Alfred Jarry. Leurs noms sont des termes heraldiques :

- **Giron** : partition triangulaire d'un blason
- **Pile** : pointe triangulaire inversee sur un ecu
- **Cotice** : bande diagonale etroite

Jarry joue sur ces noms (quand Bougrelas coupe Giron en quatre, il devient un "gironne"). L'origine geometrique/heraldique des noms cree un lien naturel avec les mathematiques.

---

## Decisions prises

- [x] **Personnalites** : 3 Palotins distincts (Giron, Pile, Cotice) — valide
- [x] **Direction artistique** : Illustration dessinee (IA generative ChatGPT), humanoides, style marionnette grotesque mais attachant → convertie en sprite sheets
- [x] **Messages** : Mix pre-ecrit (~90%) + IA Groq pour hints (~10%)
- [x] **Endpoint IA** : Nouveau `/api/buddy-chat` dedie, reutilisant l'infra Groq existante
- [x] **XP** : Systeme structurant, progression permanente, non achetable

## Choix du Palotin

### Quand

A la **premiere connexion**, avant d'acceder au dashboard. Le choix du buddy est un moment fun qui cree un lien immediat.

### Comment — Quiz de personnalite + presentation

**Flow complet :**

1. Ecran titre : "Choisis ton Palotin !" avec les 3 silhouettes
2. 4 questions, une par ecran, reponses en gros boutons
3. Resultat : "On te suggere **[Palotin]** !" avec le Palotin qui se presente (bulle onboarding)
4. En dessous : les 2 autres Palotins, cliquables, avec leurs bulles aussi
5. Bouton "Choisir" sur chacun des 3
6. Confirmation : "Tu pars avec [Palotin] ?" → Oui / Non

**Questions du quiz :**

**Q1 — "Un exercice te resiste. Tu fais quoi ?"**

- A) Je fonce, je teste des trucs jusqu'a ce que ca passe → Giron
- B) Je prends du recul, j'essaie de comprendre pourquoi ca coince → Pile
- C) Je demande un coup de main ou je regarde un exemple → Cotice

**Q2 — "Qu'est-ce qui te donne le plus envie de continuer ?"**

- A) Battre mon record ou aller plus vite que la derniere fois → Giron
- B) Comprendre un truc que je comprenais pas avant → Pile
- C) Voir que je progresse avec les autres → Cotice

**Q3 — "Tes potes diraient que tu es plutot..."**

- A) Celui/celle qui fonce en premier → Giron
- B) Celui/celle qui pose les questions bizarres → Pile
- C) Celui/celle qui met l'ambiance → Cotice

**Q4 — "Les maths pour toi c'est..."**

- A) Un defi a relever → Giron
- B) Un mystere a explorer → Pile
- C) Plus sympa quand on est bien accompagne → Cotice

**Scoring :** +1 par reponse au Palotin correspondant. Score max 4. En cas d'egalite, les ex-aequo sont mis en avant et l'eleve tranche.

### Changement de Palotin

- **Premier changement gratuit** (droit a l'erreur)
- Ensuite : coute 50 gidouilles (`PALOTIN_CHANGE_COST`)
- **L'XP est toujours conservee** — on ne punit pas la progression

Mise en oeuvre (`changeStudentPalotin`, client service) : le prix est celui de la ligne
effectivement ecrite. Le changement (type + `change_count` + 1, en une ecriture) porte le verrou
optimiste sur `updated_at` : deux changements simultanes ne passent pas tous deux au prix du premier,
gratuit. Le debit vient ensuite, verrou optimiste sur le solde lu (`.eq('gidouilles', lu)`). Si le
debit echoue (solde insuffisant ou modifie a chaque essai, erreur), le changement est annule
(ecriture conditionnee sur le type et le compteur qu'il a poses) : jamais de debit sans changement.
Ce n'est pas une transaction : une coupure entre l'ecriture et le debit, ou une annulation qui
echoue (requete concurrente qui a relu et reecrit la ligne changee), peut laisser UN changement non
paye, journalise. Choix assume : un changement gratuit est moins grave qu'un eleve debite sans
changement. Reponses de `POST /api/student/buddy/change` : 404 sans Palotin, 400
meme Palotin ou solde insuffisant, 409 conflit repete.

---

## Decisions prises

- [x] **Personnalites** : 3 Palotins distincts (Giron, Pile, Cotice) — valide
- [x] **Direction artistique** : Illustration dessinee (IA generative ChatGPT), humanoides, style marionnette grotesque mais attachant → convertie en sprite sheets
- [x] **Messages** : Mix pre-ecrit (~90%) + IA Groq pour hints (~10%)
- [x] **Messages pre-ecrits** : 396 textes dans `src/lib/config/buddy-messages.ts` (321 messages contextuels + 30 anecdotes de niveau + 45 idle lore)
- [x] **Endpoint IA** : Nouveau `/api/buddy-chat` dedie, reutilisant l'infra Groq existante
- [x] **XP** : Systeme structurant, progression permanente, non achetable
- [x] **Choix du Palotin** : A la premiere connexion, quiz de personnalite (4 questions) + presentation des 3 + choix libre
- [x] **Changement de Palotin** : 1er gratuit, puis payant en gidouilles, XP conservee
- [x] **Animations** : differe — images statiques + CSS simple pour le MVP, Rive envisage pour v2
- [x] **Mobile** : icone reduite 60px (zone tactile 64px) en bas a droite, bulles au-dessus (max 70% largeur, 4-5s)

- [x] **Skins** : 6 skins de niveau (base, acc.1, acc.2, evolution, prestige, royal) + skins VIP en v2
- [x] **Skins VIP** : skin debloque pour le Palotin actuel, conserve si changement
- [x] **Equilibrage XP** : 5000 XP total niv 20, cap 100/jour (hors milestones streak), streak x14 ajoute (100 XP)
- [x] **Contenu narratif** : 10 anecdotes/Palotin + 15 idle lore/Palotin = 75 textes generes et integres
- [x] **Role enseignant** : vue agregee + detail au clic, pas d'XP bonus, mode silencieux classe
- [x] **Interactions sociales** : reactions automatiques passives (niv 17+), skin visible mais pas le niveau, pas de leaderboard
- [x] **Scope MVP** : roadmap en 5 phases (MVP → v1.1 → v1.2 → v2 → v3)

## Skins detailles

### Skins par niveau (MVP)

| Niveau | Skin             | Description                                     |
| ------ | ---------------- | ----------------------------------------------- |
| 1      | **Base**         | Apparence de depart, simple                     |
| 4      | **Accessoire 1** | Petit chapeau / bandeau / echarpe               |
| 8      | **Accessoire 2** | Arme heraldique (epee en bois, bouclier, baton) |
| 12     | **Evolution**    | Look enrichi (vetements detailles, couleurs)    |
| 16     | **Prestige**     | Evolution majeure (cape, armure legere, aura)   |
| 20     | **Royal**        | Skin doree, couronne, titre "Palotin Royal"     |

**Assets** : 6 skins x 3 Palotins = 18 images

### Skins VIP (v2, apres validation du concept)

| Skin           | Rarete carte | Description                                           |
| -------------- | ------------ | ----------------------------------------------------- |
| **Pirate**     | Rare         | Bandeau sur l'oeil, chapeau tricorne                  |
| **Savant fou** | Rare         | Blouse blanche, lunettes, cheveux en l'air            |
| **Sportif**    | Rare         | Maillot, bandeau, baskets                             |
| **Chevalier**  | Epique       | Armure complete, ecu heraldique                       |
| **Astronaute** | Epique       | Combinaison spatiale, casque                          |
| **Pere Ubu**   | Legendaire   | Deguise en mini Pere Ubu (couronne, ventre a spirale) |

**Mecanique** : nouvelle action VIP `unlock_buddy_skin` → debloque le skin pour le Palotin actuel, conserve si changement de Palotin.

---

## Contenu narratif

### Anecdotes de niveau (10 par Palotin, 30 total)

Debloquees tous les 2 niveaux a partir du niveau 3. Mix lore invente et anecdotes litteraires.

| Niveau | Type       | Theme                                                                 |
| ------ | ---------- | --------------------------------------------------------------------- |
| 3      | Lore       | Presentation du Palotin (comment il est devenu Palotin)               |
| 5      | Lore       | Relation avec les deux autres Palotins                                |
| 7      | Lore       | Mission ratee pour le Pere Ubu (comique)                              |
| 9      | Litteraire | Jarry et la creation d'Ubu Roi (15 ans, parodie prof, scandale 1896)  |
| 11     | Lore       | Secret sur le Pere Ubu                                                |
| 13     | Litteraire | Origine des noms heraldiques (Giron, Pile, Cotice = formes de blason) |
| 15     | Lore       | Ce que le Palotin pense vraiment des maths                            |
| 17     | Litteraire | La pataphysique ("science des solutions imaginaires")                 |
| 18     | Lore       | Souvenir complice entre les 3 Palotins                                |
| 20     | Lore       | Confidence exclusive (moment intime)                                  |

### Idle lore (15 par Palotin, 45 total)

Bribes de lore qui apparaissent aleatoirement en idle a partir du niveau 5. Themes : habitudes du Pere Ubu, la Mere Ubu, la chandelle verte, les gidouilles, les autres Palotins, souvenirs de missions.

**Tout le contenu est genere et integre dans `src/lib/config/buddy-messages.ts`.**

---

## Role de l'enseignant

### Visibilite

- **Vue agregee** par defaut : repartition Giron/Pile/Cotice, niveau moyen, % d'eleves actifs (streak > 0)
- **Detail individuel au clic** : Palotin choisi, niveau, XP, streak actuel, streak record
- Permet de reperer les decrocheurs sans fliquer en permanence

### XP bonus enseignant

- **Non** — l'XP reste pure, se merite uniquement par le travail de l'eleve
- L'enseignant a deja les gidouilles et cartes VIP comme leviers de recompense

### Mode silencieux classe

- L'enseignant peut activer un **mode silencieux** qui desactive les bulles pour tous les eleves pendant une duree choisie
- Le buddy reste visible (icone) mais ne parle pas
- Pas de desactivation individuelle (eviter l'effet punitif)
- Utile en contexte d'evaluation ou de concentration

---

## Interactions sociales

### Interaction entre Palotins (niv 17+)

- **Reactions automatiques passives** : quand deux eleves de la meme classe sont connectes en meme temps, leurs Palotins se commentent mutuellement
- Ex : "Tiens, le Palotin de [prenom] est en ligne aussi !", "On dirait que [prenom] bosse dur la-bas !"
- Pas d'envoi de messages par l'eleve, pas d'interaction directe
- Zero risque, zero effort, cree du lien passif

### Visibilite du Palotin des autres

- **Icone du Palotin visible** a cote du nom sur la page classe, des le niveau 1
- **Niveau non visible** par les autres — seul le skin montre la progression (pas de chiffre)
- **Exception** : titre "Palotin Royal" (niv 20) affiche explicitement

### Anti-moquerie

- Pas de leaderboard des niveaux de Palotins
- Pas de chiffre visible, seul le skin reflète la progression
- Tout le monde a un Palotin (pas de division "ceux qui ont / ceux qui n'ont pas")
- Le Palotin de base (niv 1) doit etre visuellement cool, juste plus simple
- Les reactions automatiques entre Palotins sont toujours positives ou droles

---

## Roadmap

### MVP (v1) — Le buddy qui marche (~2-3 semaines)

| Feature              | Detail                                                                                        |
| -------------------- | --------------------------------------------------------------------------------------------- |
| Choix du Palotin     | Quiz 4 questions + presentation + choix libre                                                 |
| Buddy visible        | Bas-droite desktop (80-100px), icone mobile (60px)                                            |
| Messages pre-ecrits  | Correct, incorrect, idle, streak, level up, themes, onboarding                                |
| Systeme XP           | Sources d'XP, cap journalier, table de niveaux 1-20                                           |
| Streak               | Compteur, bonus XP, perte : Palotin determine (« on repart »)                                 |
| Niveaux 1-10         | Deblocages : bulles idle, streaks, hints basiques (niv 5), bonus gidouille quotidien (niv 10) |
| Apparence base       | 1 image par Palotin (6 expressions du character sheet)                                        |
| DB                   | Tables `student_buddies` + `buddy_skins`                                                      |
| Dashboard enseignant | Vue agregee + detail au clic                                                                  |
| Changement Palotin   | 1er gratuit, puis payant                                                                      |

**Pas dans le MVP** : skins de niveau, hints IA, anecdotes, idle lore, interactions sociales, cartes VIP buddy, mode silencieux, animations.

### v1.1 — Le buddy qui parle (~1 semaine)

| Feature              | Detail                                             |
| -------------------- | -------------------------------------------------- |
| Anecdotes de niveau  | 10 par Palotin, debloquees tous les 2 niveaux      |
| Idle lore            | 15 par Palotin, aleatoire a partir du niv 5        |
| Messages themes      | Commentaires par type d'exercice                   |
| Reactions cartes VIP | Messages quand l'eleve obtient une carte (niv 14+) |

Contenu deja ecrit (396 textes). Il suffit de brancher la logique de deblocage.

### v1.2 — Le buddy qui evolue (~2 semaines)

| Feature         | Detail                                                    |
| --------------- | --------------------------------------------------------- |
| Skins de niveau | 6 skins par Palotin (niv 1, 4, 8, 12, 16, 20) = 18 images |
| Animations CSS  | Idle (balancement), reactions (bounce, tremblement)       |
| Niveaux 11-20   | Tous les deblocages restants                              |

Depend des assets visuels.

### v2 — Le buddy social et IA (~3-4 semaines)

| Feature                       | Detail                                                                  |
| ----------------------------- | ----------------------------------------------------------------------- |
| Hints IA                      | `/api/buddy-chat` via Groq, hints contextuels                           |
| Skins VIP                     | Nouvelles cartes `unlock_buddy_skin`, `buddy_xp_boost`, `streak_shield` |
| Interactions sociales         | Reactions automatiques entre Palotins (niv 17+)                         |
| Mode silencieux classe        | Controle enseignant                                                     |
| Icone Palotin sur page classe | Visible par les camarades                                               |

### v3 (si succes) — Le buddy immersif

| Feature             | Detail                                           |
| ------------------- | ------------------------------------------------ |
| Animations Rive     | State machine, transitions fluides entre humeurs |
| Arcs narratifs      | Mini-quetes, histoire suivie                     |
| Messages IA etendus | Commentaires contextuels rares                   |

---

## Toutes les decisions sont prises. La spec est complete et prete pour le plan d'implementation.
