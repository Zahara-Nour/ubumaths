---
couvre:
  - src/lib/seo/sitemap-pages.ts
  - 'src/routes/(public)/+page.svelte'
  - 'src/routes/(public)/royaume/**'
  - 'src/lib/kingdom-tour/**'
  - 'src/lib/components/kingdom-tour/**'
  - 'src/routes/(public)/eleves/**'
  - 'src/routes/(public)/parents/**'
  - 'src/routes/(public)/professeurs/**'
---

# Carte des fonctionnalités : ce que Chiphre offre, à qui, par où

> Vérifié contre le code le 2026-10-11 (branche `feat/sitemap-complet`). Inventaire **vu de l'utilisateur** :
> chaque fonctionnalité sous son libellé réel, sa route, son accès, et la preuve de ses points forts.
> Le fonctionnement de chaque système est dans sa propre doc (carte : [docs/README.md](../README.md)) ;
> le lore utilisable en vitrine est dans [univers-chiphre.md](univers-chiphre.md#le-lore-en-vitrine).

## À quoi ça sert

- Savoir ce qu'un **visiteur** peut faire sans compte, ce qu'un **élève** obtient, ce qu'on ne
  montre pas.
- **Étayer chaque promesse** d'une page de présentation : ce qui n'est pas prouvé ici ne se promet
  pas (voir [Ce qu'il ne faut pas promettre](#ce-quil-ne-faut-pas-promettre)).
- Repérer les fonctionnalités **mal exposées** (absentes du menu ou du sitemap).

Termes : [CONTEXT.md](../../CONTEXT.md). Modèle mono-professeur : un seul prof, ses classes, des
élèves hors classe ([ADR 0002](../adr/0002-mono-professeur-ecole-frontiere-sociale.md)). Les
fonctions du professeur ne sont donc **pas** un argument de vitrine pour d'autres enseignants.

## Sans compte (visiteur)

« Menu » = barre latérale d'un visiteur (`src/lib/components/Sidebar.svelte:30-60`). « Sitemap » =
`src/lib/seo/sitemap-pages.ts` (la même liste nourrit « Tu cherchais peut-être… » de la
[page d'erreur](page-erreur.md)).

Toute page hors `(protected)` est soit dans `SITEMAP_PAGES`, soit générée par une source dynamique
(`SITEMAP_DYNAMIC_ROUTES` : les articles du Shtam parus, les exercices cochés « Afficher sur
Google »), soit dans `SITEMAP_EXCLUSIONS` avec sa
raison (démos, parcours d'authentification, pages à compte ou à jeton, routes dynamiques sans
source). La garde `src/lib/seo/__tests__/sitemap-pages.test.ts` parcourt le disque et échoue sur
toute nouvelle page publique qui n'est dans aucune des trois listes.

| Libellé dans l'interface                   | Route                                              | Ce que ça fait                                                                                                                                                                 | Menu                    | Sitemap  |
| ------------------------------------------ | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------- | -------- |
| Automaths                                  | `/automaths` → `/automaths/panier`                 | Banque de questions ; une série se lance en **En classe**, **Entraînement**, **Course aux nombres** ou **Flash-cards** (`src/lib/components/test/TestModeDialog.svelte:48-73`) | oui                     | oui      |
| Atelier (vues Calcul, Graphe, Données)     | `/atelier` (`/grapheur` y mène)                    | Calcul formel en français avec étapes, grapheur, statistiques et probabilités ; partage par lien. Rien ne quitte le navigateur (`src/routes/(public)/atelier/+page.svelte:6`)  | oui                     | oui      |
| Chiffrement — le Cabinet Noir de Turingrad | `/chiffrement`, 9 établis, `/chiffrement/depeches` | Chiffrer, déchiffrer, décrypter (César → RSA), calculs pas à pas ; campagne des 9 Dépêches du Czar (`src/lib/ciphers/dispatches.ts`). 100 % navigateur                         | oui                     | oui      |
| Upsilon                                    | `/upsilon`                                         | Simulateur de la calculatrice graphique Upsilon                                                                                                                                | oui                     | oui      |
| Python Playground                          | `/python`                                          | Python dans le navigateur (Pyodide), débogueur pas à pas, diagramme mémoire (`src/lib/components/python/debug/`)                                                               | **non** (élève, prof)   | oui      |
| Jeux : Trio, Mathémo, Démineur, 2048       | `/games/*`                                         | Jeux mathématiques ; gidouilles gagnées si l'élève est connecté (`public: true`, `src/routes/(public)/games/+page.svelte`)                                                     | oui                     | oui      |
| Glossaire Mathématique                     | `/glossaire`                                       | Dictionnaire, définitions par niveau (671 entrées dans la copie figée `tests/fixtures/lexique/dictionnaire-reference.ts` ; la base fait foi)                                   | **non**                 | oui      |
| Le Shtam                                   | `/shtam`, `/shtam/[slug]`                          | Gazette parodique du Royaume ; chaque article finit par son « Vrai du faux »                                                                                                   | oui                     | oui      |
| L'Almanach des Chiphres                    | `/almanach`                                        | Calendrier pataphysique, date du jour, convertisseur                                                                                                                           | **non**                 | oui      |
| Zygomatics (« Les presques évaluations »)  | `/presques-evaluations`                            | Parodies d'évaluations en PDF                                                                                                                                                  | oui                     | oui      |
| Chiphre, c'est quoi ?                      | `/a-propos`                                        | Le manifeste, pour les parents                                                                                                                                                 | non (panneau « Infos ») | oui      |
| Exercice partagé                           | `/exercice/[slug]`                                 | Variantes, graine partageable, export PDF, solution ; le tuteur seulement pour un élève connecté. Indexé seulement si coché « Afficher sur Google » (sinon `noindex`)          | non (lien partagé)      | si coché |
| Cahier de textes public                    | `/cahier/[token]`                                  | Séances et devoirs d'une classe, par lien                                                                                                                                      | non (lien du prof)      | non      |
| Cours public                               | `/cours/[token]`                                   | Cours publié d'une classe (chapitres, documents, fiches, objectifs, séries), par lien                                                                                          | non (lien du prof)      | non      |
| Figure géométrique partagée                | `/figures/[id]`                                    | Figure du prof, interactive (curseurs) ; titre, niveaux, description. Une figure privée ou inexistante rend la même 404. Toujours `noindex` (ADR 0027)                         | non (lien du prof)      | non      |
| Le Trône Royal (Père Ubu)                  | `/pere-ubu`                                        | Père Ubu et ses répliques ; **son chat exige un compte** : un visiteur est invité à se connecter                                                                               | non                     | oui      |

## Avec un compte élève

Inscription **par code de classe** (`src/routes/(public)/auth/register/+page.svelte:121`) ;
connexion Google désactivée (`GOOGLE_LOGIN_ENABLED`, `src/routes/(public)/auth/login/+page.svelte:5`).

- **Mon Cabinet** : cours, progression, travail, cahier de textes, Conjurés, chat, Trappe à Trésors,
  Marché Polonais si activé (`src/lib/config/dashboard-nav.ts`).
- **Révisions espacées** (FSRS-6, `src/lib/srs/fsrs.ts`) : une nouvelle variante de la question à
  chaque révision ([srs.md](srs.md)).
- **Tuteur Père Ubu**, dans l'exercice : guide sans donner la réponse (15 méthodes d'aide,
  `src/lib/config/tutor-help-methods.ts`), plafonds de 15 messages par exercice, 30 par heure, 100
  par jour (`src/lib/config/tutor-limits.ts`).
- **Énigmes, tournois de Démineur, cartes VIP, gidouilles** ([jeux-et-economie.md](jeux-et-economie.md)).
- **Corvées Python** (`/python-exercises`, le reste exige un compte).

## Points forts, avec leur preuve

| Point fort                                                       | Preuve dans le code                                                                                                                                                             |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **La forme de la réponse est corrigée**, pas seulement sa valeur | 5 statuts `correct · unoptimal_form · bad_form · incorrect · empty`, crédit partiel (`src/lib/questions/types.ts:1034`) ; forme exigée ([questions.md](questions.md))           |
| **Étapes expliquées en français**, selon le niveau               | `src/lib/mathAST/pedagogical-*/` ; dans l'Atelier, `solve-steps.ts`, `derive-steps.ts`, `simplify-steps.ts`                                                                     |
| **Correction concise puis détaillée**, écran et papier           | `src/lib/questions/correction-detail.ts`, [ADR 0017](../adr/0017-correction-concise-et-detaillee.md)                                                                            |
| **Mots cliquables** : un mot de l'énoncé ouvre sa définition     | niveau du lecteur (`src/lib/lexicon/reader-grade.ts`) ; éteints en évaluation notée (`src/lib/components/markdown/lexicon-context.ts:9`)                                        |
| **Atelier et Cabinet Noir sans compte, sans envoi de données**   | `src/routes/(public)/atelier/+page.svelte:6` ; `src/lib/ciphers/` 100 % client ([univers-chiphre.md](univers-chiphre.md))                                                       |
| **PDF compilés dans le navigateur**                              | Typst en WASM ([fiches-et-pdf.md](fiches-et-pdf.md))                                                                                                                            |
| **Base de données à Paris**, fonctions en région Paris           | Supabase `eu-west-3` (`src/routes/(public)/legal/mentions-legales/+page.svelte:53`), Vercel `cdg1` (`svelte.config.js:10`) — [ADR 0003](../adr/0003-donnees-hebergees-en-ue.md) |
| **Cookies strictement nécessaires**, pas de publicité            | `mentions-legales/+page.svelte:112` ; Compendium : ni publicité ni avantage pédagogique payant                                                                                  |
| **Consentement parental, export et suppression du compte**       | `/consent/[token]`, `src/routes/api/account/{export,delete}` ([conformite/](conformite/README.md))                                                                              |
| **Confort de lecture**                                           | taille du texte de 75 % à 150 % (`src/lib/stores/fontSize.svelte.ts:20-21`), mode sombre qui suit le système                                                                    |

## Ce qu'il ne faut pas promettre

- **« Toutes les données restent en Europe »** : faux. La page de confidentialité déclare Vercel
  « USA/EU », et Google, Groq (le tuteur IA, modèle `llama-3.3-70b-versatile`,
  `src/routes/api/chat/+server.ts:178`) et Hugging Face aux USA. Dire « base de données hébergée à
  Paris », qui est exact.
- **Un suivi « accessible aux parents »** : aucun rôle parent ni vue de progression pour eux ; le
  seul accès famille est le lien du cahier de textes et celui du cours (ADR 0025). `/a-propos` dit
  désormais exactement cela (D12, 2026-10-12).
- **Une interface multilingue** : l'interface est en français seulement ; seuls certains contenus
  (fiches) existent en anglais.
- **Parler à Père Ubu sans compte** : le chat de `/pere-ubu` exige un compte ; un visiteur y voit
  une invitation à se connecter (`?redirectTo=/pere-ubu`), pas le chat.
- **Des chiffres en dur** (nombre de questions, de définitions) : ils périment. Les compter à la
  requête, ou ne pas les donner.

## Ne pas mettre en avant

- Démos et pages de mise au point : `/demo/*`, `/geometry-demo/*`, `/construction-demo`,
  tout `/dev/*` (admin seul : polices, cadres, pages d'erreur, Blockly, diaporama, structure…).
- Héritage remplacé par l'Atelier : `/calc` ([atelier.md](atelier.md)). `/cas` est retirée
  (2026-10-13) : l'adresse mène à `/atelier`.
- Routes sans lien ou en sommeil : `/tuteur`, `/calculatrice`, `/games/evoland`, Navadra,
  `/spreadsheet` ([jeux-et-economie.md](jeux-et-economie.md), [outils-prof.md](outils-prof.md)).
- Tout `/dashboard/admin/*`.

## Comment un visiteur entre

- **Accueil** (`src/routes/(public)/+page.svelte`, épuré le 2026-10-06) : titre, Père Ubu au
  centre, une dépêche du Shtam tirée au hasard. Pour un visiteur **anonyme**, la
  [roue des publics](#la-roue-des-publics-et-les-trois-vues) dérive autour de Père Ubu et mène aux
  trois vues. Père Ubu mène au [Tour du Royaume](#le-tour-du-royaume-royaume) (le lien texte
  « Visiter le Royaume » a été retiré le 2026-10-11). Le bouton « Infos et confidentialité »
  (pages légales, `/a-propos`) est dans le coin inférieur droit (`src/routes/+layout.svelte`).
- **En-tête** (`src/lib/components/Header.svelte`) : « Connexion » en haut à droite ; l'inscription
  n'est atteinte que depuis la page de connexion (« Créer un compte »).
- **Menu** : Accueil, Automaths, Jeux, Upsilon, Atelier, Chiffrement, Le Shtam, Zygomatics
  (D13, D14 : Géométrie retirée, Automaths et le Shtam ajoutés, 2026-10-12).

## La roue des publics et les trois vues

Décisions de David du 2026-10-11 (journal : `docs/wip/roue-des-publics-progress.md`). Un
aiguillage, Élève / Parent / Professeur, vers trois vues courtes : `/eleves`, `/parents`,
`/professeurs` (au sitemap). Peu de texte, des phrases directes ; le lore détaillé reste au
[Tour du Royaume](#le-tour-du-royaume-royaume).

**Carte du code**

| Fichier                                                | Rôle                                                                                               |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| `src/lib/kingdom-tour/audiences.ts`                    | `AUDIENCES` : les trois publics, leur libellé et leur adresse                                      |
| `src/lib/kingdom-tour/views.ts`                        | Le contenu des trois vues (`STUDENT_VIEW`, `PARENT_VIEW`, `TEACHER_VIEW`)                          |
| `src/lib/kingdom-tour/drift.ts`                        | `driftGeometry`, `driftAt` : la dérive autour de Père Ubu (pures)                                  |
| `src/lib/components/kingdom-tour/AudienceWheel.svelte` | La roue : la chandelle verte, sa lumière, ses trois choix ; `placement` `corner` (vues) ou `orbit` |
| `src/lib/components/kingdom-tour/AudienceView.svelte`  | La mise en page d'une vue : Père Ubu, blocs, démos du Tour, portes d'entrée, autres vues en liens  |
| `src/routes/(public)/{eleves,parents,professeurs}/`    | Une page par vue ; le serveur choisit l'ambiance du mois (jamais prérendue)                        |

**Invariants**

- **La roue** : sur l'accueil, **pour un visiteur anonyme seulement** (`data.user` absent) ; sur les
  trois vues, pour tout le monde, fixée en bas à droite, le choix courant marqué (`aria-current`).
  Un vrai bouton (`aria-expanded`) et trois liens ordinaires, inertes tant qu'elle est fermée ;
  Échap la referme et rend le focus. **À la souris, le survol l'ouvre** (un clic ne la referme pas) ;
  au doigt et au clavier, on clique. Sans JavaScript, chaque vue garde les deux autres en liens.
  À l'ouverture autour de Père Ubu, les choix se déroulent vers le haut s'il y a la place, sinon
  vers le bas, sinon en colonne du côté le plus large (écran bas : la zone coupe ce qui dépasse).
  Seul un focus **clavier** immobilise la roue (un clic lui laisse le focus sans la figer).
- **L'emblème** : la chandelle verte à flamme verte (« Viridis Candela »), sans fond ni bord, sur un
  bougeoir de laiton cerné d'encre comme le dessin de Père Ubu. Sa lumière lui est **propre**
  (indépendante du halo du mois) et passe **devant** celui de Père Ubu (la roue est en `z-20`).
- **La dérive** (accueil) : lente (≤ 50 px/s), irrégulière (sinus de périodes sans commune mesure),
  avec des escales de durée aléatoire où l'invitation « Tu es… ? » revient. Le tour complet
  seulement s'il y a la place au-dessus et au-dessous ; sinon elle longe le flanc droit sans mordre
  sur le dessin. Elle s'arrête quand on la survole, la focalise ou l'ouvre. **Une seule fois**, elle
  se dérobe quand la souris approche (glissement adouci, retour lent). Rien ne bouge en « moins
  d'animations ».
- **Au bout d'une minute, tout se pose pour de bon** (WCAG 2.2.2, décision de David du 2026-10-11) :
  la dérive s'arrête (une dernière escale, l'horloge `requestAnimationFrame` s'éteint), la flamme
  ne vacille plus et la lumière ne scintille plus, sur l'accueil comme sur les vues. Les effets de
  survol restent : c'est le visiteur qui les déclenche.
- **L'argent** : seulement ce qui restera vrai quand le site sera payant hors des classes de son
  créateur — « Sans publicité », « En accès libre, sans compte » + la liste, « Pour les élèves des
  classes de son créateur, Chiphre est entièrement gratuit ». Jamais « gratuit » seul ni « pour
  toujours ». Le niveau est dit partout : du CM1 à la Terminale.
- **Le registre** : élèves tutoyés ; parents et professeurs vouvoyés (les descriptions du Tour,
  qui tutoient, sont réécrites pour les professeurs).
- **Les parents** lisent franchement : pas de compte parent (les liens du cahier de textes et du
  cours, par le professeur), et le tuteur passe par un prestataire aux États-Unis.

**Comment étendre** : un bloc → une entrée de `blocks` dans `views.ts` (son icône dans `ViewIcon`
et dans `AudienceView.svelte`) ; un lien → une page publique qui existe (le test le vérifie).

**Tests** : `src/lib/kingdom-tour/__tests__/views.test.ts` (liens, registre, argent, niveau),
`drift.test.ts` (zone libre, flanc, vitesse) ; `src/lib/components/kingdom-tour/__tests__/`
(`AudienceWheel` : clavier, survol, invitation ; `AudienceView` : titre, roue, autres vues, pas de
débord à 320, 375 et 1280 px) ; `src/routes/(public)/__tests__/page.svelte.test.ts` (roue pour
l'anonyme seulement, Père Ubu vers `/royaume`).

## Le Tour du Royaume (`/royaume`)

La page de présentation de Chiphre (décisions de David du 2026-10-11 ; terme : [CONTEXT.md](../../CONTEXT.md)).
Une visite guidée par Père Ubu, qui ne promet que ce que cette carte prouve.

**Carte du code**

| Fichier                                                | Rôle                                                                                         |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| `src/lib/kingdom-tour/tour.ts`                         | Le contenu : `PROVINCES`, `PLACES`, `STRENGTHS`, `FORM_DEMO`, `PARENT_FACTS`, liens d'entrée |
| `src/lib/kingdom-tour/spiral.ts`                       | `buildSpiral` : la gidouille de Sandomir (tracé, étapes à intervalles réguliers, centre)     |
| `src/lib/kingdom-tour/reveal.ts`                       | Action `use:reveal` : apparition au défilement                                               |
| `src/lib/components/kingdom-tour/PereUbuFigure.svelte` | Père Ubu dans le halo du mois (partagé avec l’accueil ; taille : propriété `size`)           |
| `src/lib/components/kingdom-tour/ProvinceMap.svelte`   | Spirale + fiches des Provinces ; la spirale se dessine jusqu'à la fiche lue (grand écran)    |
| `src/lib/components/kingdom-tour/FormDemo.svelte`      | « La forme compte » : quatre réponses, quatre verdicts                                       |
| `src/lib/components/kingdom-tour/CipherDemo.svelte`    | Le chiffre de César en direct (`caesarEncrypt`)                                              |
| `src/routes/(public)/royaume/+page.server.ts`          | Date du jour (Almanach, Paris), ambiance du mois, dépêche du Shtam parue                     |
| `src/routes/(public)/royaume/+page.svelte`             | La mise en scène : ouverture, Provinces, lieux, rigueur, dépêche, parents, entrée            |

**Invariants**

- **Rien n'est promis sans preuve** : une ligne de `tour.ts` s'appuie sur ce document. Les parents
  sont vouvoyés, les élèves tutoyés ; jamais « Mathres », ni les mots bannis du Compendium (§ IX).
- **La démo de la forme ne ment pas** : statuts, points et remarques sont ceux du correcteur
  (`gradeQuestion`, `validateAnswer`), sur le cas réel #553. Les remarques sont recopiées (importer
  `REQUIRED_FORM_FEEDBACK` tirerait le moteur de calcul dans la page) ; le test vérifie qu'elles
  n'ont pas divergé.
- **Lisible sans JavaScript** : seul `reveal` cache un bloc, et seulement s'il est sous l'écran,
  hors « moins d'animations ». La spirale est un décor (`aria-hidden`) : tout est dans les fiches.
- **Jamais prérendue** (`prerender = false`) : date et dépêche suivent le jour de la requête.
- **Contrastes mesurés au pire pixel, sur les halos des 7 mois** (audit du 2026-10-11) : texte
  d'accent en orange brûlé `--accent-text` en clair (l'orange du thème est à 2,2:1), halo atténué
  en sombre ; anneaux de focus en couleur du texte (`ring-foreground`), bordures de contrôle
  `border-foreground/50` (≥ 3:1). Pas de mouvement sans fin : le halo dérive une fois, la gidouille
  ne tourne qu'au survol.
- **Démo de la forme : un groupe radio** (flèches, une tabulation) ; César : le résultat n'est pas
  annoncé à chaque frappe (`aria-live="off"`, nom accessible), un émoji reste un caractère.
- `app.css` impose sa taille à `main h1…h6, p, li` et à **tout ce que contient un `<header>`** :
  la page n'emploie pas `<header>`, et surcharge ses titres par classe, en gardant `--font-scale`.

**Comment étendre** : un lieu → une entrée de `PLACES` (+ son icône dans la page) et une ligne dans
« Sans compte » ci-dessus ; un point fort → `STRENGTHS`, avec `access: 'account'` s'il exige un compte.

**Tests** : `src/lib/kingdom-tour/__tests__/` (Provinces fidèles au Compendium, liens vers des pages
publiques existantes et non exclues par `robots.txt`, garde du lore, démo contre le correcteur,
spirale, apparition) ; `src/routes/(public)/royaume/__tests__/` (chargement, rendu, démos, pas de
débord) ; `src/routes/(public)/__tests__/page.svelte.test.ts` (Père Ubu mène à la visite).

## Écarts connus

Consignés dans [ecarts-a-trier.md](../wip/ecarts-a-trier.md) (chantier K19 ; V15 corrigé par le Tour du
Royaume, D19 par la chandelle qui se pose au bout d'une minute ; V14, C16, C17, D12-D15 corrigés le
2026-10-12) :

- Glossaire et Almanach : absents du menu (décision de David du 2026-10-12 : le menu garde
  Automaths et le Shtam, les plus vivants).
- `/calc` reste au sitemap (avant le 2026-10-11) alors que « Ne pas mettre en avant » le range en
  héritage remplacé par l'Atelier ; `/games/evoland` en est exclu pour cette raison (`/cas`,
  retirée le 2026-10-13, n'est plus une page).
- Accessibilité, tout le site : anneau de focus clair à 2:1 (D16), `muted-foreground` à 4,4:1 sur fonds
  teintés (D17), pas de lien d'évitement (D18).
