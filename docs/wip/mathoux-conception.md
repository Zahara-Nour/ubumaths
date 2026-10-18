# Mathoux et motivation des élèves — phase 0

> Analyse du 2026-10-18 (session « mathoux »). **Les recommandations du § 7 ont été validées par
> David le 2026-10-18** ; elles sont décisions. Rien n'est codé. Étape 1 en phase 0 : § 8.

## 1. Demande (David, 2026-10-18)

David commence des cours particuliers avec Chiphre et cherche des moyens de motiver l'élève à
continuer de travailler. Trois demandes :

- analyser la gamification existante, en **distinguant les élèves en classe et les élèves en cours
  particulier** ;
- poursuivre le buddy system (les Palotins) ;
- concevoir les **Mathoux** (nom officiel) : des chats à collectionner, avec des pouvoirs et des
  actions possibles (combat à la Navadra ?). À ne pas confondre avec les cartes VIP.

## 2. L'existant, et ce qui sert vraiment

Mesures en production, en lecture seule, le 2026-10-18 :

| Dispositif                                | En code                                       | Activité réelle                                                     |
| ----------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------- |
| Gidouilles (monnaie)                      | jeux, bonus de la semaine, gestes du prof     | 5 mouvements sur les 30 derniers jours                              |
| Cartes VIP (49 modèles) + Marché Polonais | tirage, achat, activation validée par le prof | 158 échanges au total, 0 sur les 30 derniers jours                  |
| Palotins (buddy system)                   | MVP complet, phases 1 à 9                     | **57 élèves en ont choisi un ; tous à 0 XP, niveau 1, série 0**     |
| Succès (23 définitions)                   | infrastructure prête                          | 0 succès débloqué ; widget commenté (`StudentDashboard.svelte:361`) |
| Énigmes                                   | énigme du jour par cron                       | 0 tentative                                                         |
| Démineur, 2048, Mathémo                   | classements, tournois                         | 13 909 parties au total, 0 sur les 30 derniers jours                |
| Navadra (combats)                         | 464 défis, monstres, sorts                    | en pause (2026-10-13), retiré du catalogue                          |

Références : `docs/systeme/jeux-et-economie.md`, `docs/systeme/buddy-palotins.md`.

**Palotins.**

- **Les gains d'XP sont branchés, mais personne ne les a déclenchés.** Ils sont appelés par
  `api/tests/save` (Entraînement, Course aux nombres ; pas les séances flash ni les cartes de cours,
  décision du 2026-09-28), `api/riddles/[id]/submit` et `src/lib/server/evaluation-attempts.ts`.
  _Correction du 2026-10-18 : la première version de cette analyse parlait de « boucle cassée ». La
  mesure dit autre chose : aucun élève ne s'est connecté depuis le 2026-09-11, et les 3 séances en
  base sont celles d'un professeur. Le 0 XP montre l'absence d'usage, pas une panne prouvée._
- Le bonus « nouveau thème » n'est jamais donné : `api/tests/save` passe `theme: undefined` (TODO).
- Ni la révision espacée (`api/srs/review/submit`) ni les fiches (consultation seule) ne donnent
  d'XP.
- **Les images n'existent pas.** `BuddyAvatar` cherche `/images/buddies/<palotin>-<expression>.png`,
  absent de `static/` : l'affichage se rabat sur un cercle coloré.
- La suite de la spec (v1.1 à v3 : skins, indices, mini-quêtes) n'est pas commencée.
- `student/+layout.server.ts` remet la série à 0 sans `.select()` : un refus RLS passerait en
  silence.

**Cartes VIP.** Leur nom de lore est « Carte Pataphysique » (`src/lib/config/lore.ts`, clé
`learning.vipCard`), mais ce nom n'est utilisé nulle part : le code et `CONTEXT.md` disent « carte
VIP ».

**Diagnostic.** Il y a six systèmes de récompense, et **aucun n'est relié au travail mathématique** :
les gidouilles viennent des jeux, les cartes VIP du comportement en classe, et la boucle des Palotins
n'a jamais tourné. Avant d'ajouter les Mathoux, il faut une boucle unique : _je fais des maths → quelque
chose de visible progresse_.

## 3. En classe et en cours particulier, la situation n'est pas la même

|                       | En classe                                                   | En cours particulier                                                                           |
| --------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Présence du prof      | tous les jours                                              | 1 à 2 séances par semaine. **Le vrai enjeu, c'est le temps entre les séances**                 |
| Social                | camarades, amis, Marché, classements                        | **aucun pair** : l'école est la frontière sociale, l'élève particulier est seul dans la sienne |
| Leviers forts         | le groupe, le statut, les privilèges en classe (cartes VIP) | la relation avec le prof, **les parents** (ils paient, veulent voir des progrès), soi-même     |
| Ce qui ne marche plus | —                                                           | classements, Marché, cartes VIP de privilège en classe, tournois de classe                     |

Conséquence : tout ce qui vise les élèves particuliers doit fonctionner **seul et en asynchrone**.

## 4. Les Mathoux

### Ancrage dans le lore (déjà présent dans le Compendium)

- Le Docteur Faustroll, gouverneur de Patatovie, « vouvoie tout le monde, y compris ses chats »
  (`docs/Chiphres/lore-pataphysique.md:440`). Les Mathoux peuvent être **les chats de Faustroll**.
- Le **Chat Noir de Steinlen** est l'emblème visuel canonique (§ XI, palette `--chat-noir-*`), et
  une « mascotte secondaire muette » qui « n'interagit jamais avec le Galopin » (ligne 1837).
  Jamais codé.
- Nom : _matou_ + _maths_. Pluriel « Mathoux », singulier « un Mathou ».

### Principe : la collection est la carte de ce que l'élève maîtrise

Un Mathou s'obtient **en travaillant une notion**, pas au hasard (règle d'or du Compendium : pas de
pay-to-win mathématique). Branchements sur l'existant :

- **Arbre des notions** : 19 branches, 137 notions, 543 sous-notions (prod, 2026-10-18) → **19 races**
  (une par branche) et **jusqu'à 137 Mathoux** (un par notion).
- **Acquisition des points** (`student_point_state` : ◯ / 🟠 / 🟢 / ✨) pilote la croissance :
  première réussite sur la notion → **chaton** ; points acquis → **matou** ; notion maîtrisée →
  **grand matou**, pelage rare.
- **Révision espacée** : une notion « à revoir » (calculée depuis `last_success_at`, décision 70)
  met son Mathou **en sieste**. Il n'est jamais perdu ; une révision le réveille. Entre deux
  séances, c'est une raison de revenir.

RGPD : la collection peut être **calculée** depuis l'acquisition déjà stockée. Seuls les choix
cosmétiques (nom donné, pelage choisi) demandent une table.

### Pouvoirs et combats : la réécriture de Navadra

Décision déjà prise : Navadra sera réécrit sur le système de questions de Chiphre. Les Mathoux en
sont le support :

- **Chaque attaque est une question de la notion du Mathou.** Équipe de 3 Mathoux.
- **Les monstres sont des erreurs typiques** (« le Carré Fourbe » : (a+b)² = a²+b²). Les battre
  demande des questions qui ciblent l'erreur : de la remédiation déguisée.
- **Pouvoirs = confort, jamais avantage pédagogique** : indice, second essai, passer une question,
  en Entraînement seulement, **jamais en contrôle ni en évaluation** ; ou pouvoirs propres au combat.
- **Solo contre l'IA d'abord** (jouable par l'élève particulier) ; duel entre élèves plus tard, dans
  l'école seulement.

### Ce qui reste distinct

- **Palotin ≠ Mathou** : un compagnon qui parle, contre une collection. Voir § 6, question 1.
- **Carte VIP ≠ Mathou** : les cartes VIP restent des privilèges de classe, tirés et échangeables.
  Les Mathoux de notion ne s'échangent pas ; les accessoires (colliers, pelages) s'achètent en
  gidouilles.
- **Vocabulaire affiché** : le Compendium (§ IX, lignes 840 et 1648) interdit les anglicismes
  _affichés aux élèves_ (XP, level, boss, streak, score, leaderboard). Il garde les mécaniques et
  les renomme (« Constance Royale », « Tableau des Honneurs Royaux »). Il faudra un lexique propre
  aux Mathoux : grandir, sieste, pelage, Chatterie…

### Coût : les illustrations

19 races × 3 stades = 57 visuels minimum, avant pelages et monstres. Option économe : une silhouette
par race façon Steinlen (domaine public), déclinée en couleurs. Usage décoratif sans souci ; la
recherche INPI n'est exigée que pour un élément de marque (Compendium § IV).

### Suite de livraison proposée

1. Réparer la boucle des Palotins : XP sur Entraînement, fiches et révisions ; images.
2. Mathoux v1 : collection et sieste, calculées depuis l'acquisition ; page « Chatterie », sans combat.
3. Pelages et accessoires en gidouilles.
4. Combats contre les erreurs typiques (= réécriture de Navadra).

## 5. Autres idées

### Élèves en cours particulier

- **Mission de la semaine** : fixée en fin de séance (2-3 objectifs), jauge jusqu'à la suivante.
- **Bilan pour les parents** : temps passé, Mathoux, mission tenue. Question d'accès à trancher.
- **Progresser contre soi-même** : records personnels (Course aux nombres), « il y a un mois… ».
- **Défi du prof** : l'élève essaie de battre le temps du prof sur une série, en asynchrone.
- **Constance Royale douce** : objectif hebdomadaire (« 4 jours sur 7 ») avec un jour de grâce.
- **Grades de l'Ordre de la Grande Passoire** (7 grades écrits, jamais codés) avec un diplôme PDF.
- **Récit débloqué par le travail** : Dépêches du Czar, articles du Shtam, page `/chat-noir`.

### Élèves en classe

- **Chatterie de classe** : objectif collectif, sans opposer les élèves.
- **Tournois sur la Course aux nombres** (la mécanique des tournois existe pour le démineur).
- **Cartes VIP inchangées**, avec éventuellement des cartes « Mathou » (pelage rare, chaton bonus).

### Transversal

- **Raccorder les gidouilles au travail mathématique** : aujourd'hui on gagne plus au démineur qu'en
  faisant des maths.

## 6. Questions pour David

1. **Palotins et Mathoux** : côte à côte, Palotin gardien de la Chatterie, ou fusion ?
2. **Obtention d'un Mathou** : uniquement par le travail, ou aussi par le hasard ou l'achat pour
   certains rares ?
3. **Élèves particuliers** : seuls dans leur « école », ou une école commune des particuliers
   (safeguarding entre mineurs qui ne se connaissent pas) ?
4. **Parents** : voient-ils un bilan, et lequel ?

## 7. Décisions (recommandations validées par David le 2026-10-18)

1. **Palotin gardien de la Chatterie, pas de fusion.** Le Compendium sépare déjà les rôles : le
   Palotin parle, le Chat Noir est « muet ». Les Mathoux muets, le Palotin les commente et signale
   les siestes : une seule voix, pas de concurrence. La fusion jetterait un MVP fait et le choix des
   57 élèves.
2. **Les Mathoux de notion uniquement par le travail ; quelques rares par des efforts non notés**
   (énigmes, Dépêches du Czar, fêtes provinciales) ; **aucun tirage, aucun achat.** Un tirage au
   hasard payable en monnaie est une loot box : risque réglementaire avec des mineurs (interdites en
   Belgique, encadrées ailleurs) dès que la monétisation arrive, et contraire à la règle d'or. Le
   hasard reste aux cartes VIP ; l'achat aux accessoires.
3. **Seuls, sans école commune.** Le social n'est pas le levier des particuliers (prof, parents,
   soi-même le sont), et mettre en contact des mineurs inconnus les uns des autres est le risque
   maximal de safeguarding pour un gain faible. Au plus, plus tard, un compteur collectif anonyme
   (« les Galopins du Royaume ont réveillé 1 000 Mathoux »), sans identité ni contact. À vérifier
   dans le code : si plusieurs particuliers partagent une même école, les amis et le Marché les
   relieraient ; il faudra pouvoir les couper.
4. **Oui, un bilan d'effort et de progrès, sans nouvelle donnée au départ.** Contenu : temps de
   travail, mission tenue, notions acquises, Mathoux réveillés ; jamais le détail des erreurs, ni le
   chat. Première étape : un bilan que le prof génère (PDF) et envoie lui-même, ou que l'élève
   montre : aucune adresse de parent stockée. Un compte parent viendra avec le modèle de
   consentement parental.

## 8. Étape 1 — la boucle du Palotin tourne (phase 0, à valider)

Constats du 2026-10-18, en plus du § 2 :

- le serveur renvoie le gain (`buddy_xp` dans la réponse de `api/tests/save`), mais **aucun écran ne
  le lit** et `updateBuddyXpOptimistic` n'est jamais appelé : l'élève ne voit pas son Palotin
  progresser à la fin d'une séance ;
- l'affichage dit « XP » et « Niveau » (`BuddyStatusPanel.svelte`, `ChangePalotinModal.svelte`),
  mots que le Compendium interdit à l'écran ;
- la Constance Royale est perdue dès qu'un jour passe sans activité (`student/+layout.server.ts`),
  remise à zéro sans `.select()`.

### Comportements proposés

**A. Gagner en travaillant (preuve de la boucle).**

- Nominal : un élève avec Palotin envoie un Entraînement ou une Course aux nombres → son Palotin
  gagne, et la base le montre (test d'intégration, vérifié rouge sans le branchement).
- Limite : séance flash et cartes de cours → rien (décision du 2026-09-28) ; plafond du jour atteint
  → rien de plus, sans erreur.
- Erreur : élève sans Palotin → la séance s'enregistre normalement, aucun gain.

**B. Voir son gain à la fin de la séance.** L'écran de résultat montre ce que le Palotin a gagné,
une phrase du Palotin, et la montée de niveau quand elle a lieu. Le widget se met à jour sans
recharger.

**C. Nouveau thème.** Le bonus « nouveau thème » est réellement donné : le thème d'une question est
le thème du programme du point qu'elle valide (`question_template_points` → `curriculum_points` →
`curriculum_themes`, à vérifier). Une question sans point validé → pas de bonus, sans erreur.

**D. Révision espacée.** Voir question 1.

**E. Constance Royale.** Voir question 2. Dans tous les cas, la remise à zéro vérifie la ligne
modifiée (`.select()`).

**F. Mots affichés.** « XP » et « Niveau » remplacés par des mots du lore. Voir question 3.

**G. Images.** 3 Palotins × 6 expressions = 18 images (`/images/buddies/<palotin>-<expression>.png`).
Voir question 4.

**Hors étape 1** : les fiches (consultation seule, aucun signal de travail à récompenser sans un
bouton « j'ai fini » auto-déclaré).

### Questions pour David

1. **Révision espacée** : les cartes sont auto-évaluées, d'où « sans XP » le 2026-09-28. Proposition :
   récompenser l'**effort** et non la réussite : un forfait par séance de révision terminée (toutes
   les cartes dues passées), une fois par jour. Oui / non ?
2. **Constance Royale** : aujourd'hui perdue après un jour sans travail. Un élève particulier qui a
   cours une ou deux fois par semaine la perdra sans cesse. Proposition : compter en **semaines**
   (« au moins 3 jours de travail dans la semaine »). Ou garder les jours avec 1 jour de grâce par
   semaine ?
3. **Mots** : l'XP du Palotin le fait grossir, comme la gidouille d'Ubu. Proposition :
   « **Embonpoint** » pour l'XP et « **Tour de taille** » pour le niveau (« Tour de taille 4 —
   120 / 200 d'embonpoint »). Ou d'autres mots ?
4. **Images** : qui les dessine ? Toi ou un illustrateur ; ou moi, en SVG à silhouette simple façon
   Steinlen (même style que les futurs Mathoux), remplaçables plus tard.

## 9. Mathoux v1 — la Chatterie (phase 0, à valider)

> Rédigé le 2026-10-18, après la première étape (Palotins, #1471 → #1484).

### Constats en prod (2026-10-18)

- Chaque point du programme est rattaché à un nœud de l'arbre (`curriculum_points.node_id`, notion
  ou sous-notion) : 2 124 points sur 3 131, 130 notions touchées sur 137.
- Deux signaux existent déjà : l'**acquisition** d'un point (`student_point_state.is_acquired`,
  nourrie par les réponses aux questions taguées) et l'état **« à revoir »** (badges FSRS
  `a_renforcer` / `a_remedier` de `src/lib/server/srs/capacity-badge.ts` : une question taguée sur
  le point est due).
- ⚠️ **Seuls les niveaux du lycée ont des questions taguées.** Points travaillables (au moins une
  question taguée) / points, et notions travaillables :

  | Niveau   | Points travaillables | Notions travaillables |
  | -------- | -------------------- | --------------------- |
  | 2de      | 27 / 201             | 14 / 39               |
  | 1re spé  | 78 / 165             | 19 / 27               |
  | Tle spé  | 90 / 239             | 28 / 35               |
  | Tle exp  | 49 / 153             | 17 / 17               |
  | Tle comp | 57 / 129             | 21 / 29               |

  Du CP à la 3e et en voie technologique : **aucune** question taguée, donc aucun Mathou ne peut
  naître tant que le tagage n'est pas fait.

### Comportements proposés

- **Un Mathou par notion** de l'arbre, de la **race de sa branche** (19 races). Seuls comptent les
  points **du niveau de l'élève** (`profiles.grade`) **qui ont au moins une question taguée**.
- **Croissance** :
  - **chaton** : première réussite sur un point de la notion ;
  - **matou** : la moitié des points travaillables de la notion acquis ;
  - **grand matou** : tous acquis.
- **Sieste** : au moins un point de la notion « à revoir » (badge FSRS dû). Le Mathou n'est jamais
  perdu ; une révision le réveille.
- **À découvrir** : les notions travaillables pas encore commencées apparaissent en **silhouette**,
  pour donner un but.
- **Page « la Chatterie de Faustroll »** (`/dashboard/student/chatterie`) : les Mathoux rangés par
  race, avec le stade, la sieste, et un lien « Réveiller » vers la révision.
- **Le Palotin, gardien** : dans le widget, « 3 Mathoux font la sieste » quand c'est le cas.
- **Calculé, pas stocké** : aucune table, aucune migration ; la collection se déduit de
  l'acquisition et des badges, à chaque affichage.
- **Dessins** : un composant SVG paramétré (couleur et motif par race, taille et détails par stade,
  yeux fermés et « Zzz » pour la sieste) ; images IA plus tard.
- **Noms** : « le Mathou des Fractions » (nom de la notion). Pas de nom donné par l'élève en v1
  (texte libre d'un mineur : modération).

**Hors v1** : annonce d'un nouveau chaton en fin de séance, combats, accessoires, vue de la
Chatterie par le prof.

### Questions pour David

1. **Seuils** : chaton à la 1re réussite, matou à la moitié, grand matou à tous les points
   travaillables acquis. D'accord ?
2. **Niveaux** : tes élèves particuliers sont-ils au lycée ? Sinon, la Chatterie restera vide pour
   eux tant que les questions du collège ne sont pas taguées : faut-il le faire d'abord ?
3. **Silhouettes à découvrir** visibles : oui ?
4. **Noms** : « le Mathou des Fractions » en v1, des noms pataphysiques plus tard ?
