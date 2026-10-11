---
couvre:
  - src/lib/seo/sitemap-pages.ts
---

# Carte des fonctionnalités : ce que Chiphre offre, à qui, par où

> Vérifié contre le code le 2026-10-11 (commit `6928c5056`). Inventaire **vu de l'utilisateur** :
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

| Libellé dans l'interface                   | Route                                              | Ce que ça fait                                                                                                                                                                 | Menu                    | Sitemap |
| ------------------------------------------ | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------- | ------- |
| Automaths                                  | `/automaths` → `/automaths/panier`                 | Banque de questions ; une série se lance en **En classe**, **Entraînement**, **Course aux nombres** ou **Flash-cards** (`src/lib/components/test/TestModeDialog.svelte:48-73`) | **non**                 | oui     |
| Atelier (vues Calcul, Graphe, Données)     | `/atelier` (`/grapheur` y mène)                    | Calcul formel en français avec étapes, grapheur, statistiques et probabilités ; partage par lien. Rien ne quitte le navigateur (`src/routes/(public)/atelier/+page.svelte:6`)  | oui                     | **non** |
| Chiffrement — le Cabinet Noir de Turingrad | `/chiffrement`, 9 établis, `/chiffrement/depeches` | Chiffrer, déchiffrer, décrypter (César → RSA), calculs pas à pas ; campagne des 9 Dépêches du Czar (`src/lib/ciphers/dispatches.ts`). 100 % navigateur                         | oui                     | oui     |
| Upsilon                                    | `/upsilon`                                         | Simulateur de la calculatrice graphique Upsilon                                                                                                                                | oui                     | oui     |
| Python Playground                          | `/python`                                          | Python dans le navigateur (Pyodide), débogueur pas à pas, diagramme mémoire (`src/lib/components/python/debug/`)                                                               | **non** (élève, prof)   | oui     |
| Jeux : Trio, Mathémo, Démineur, 2048       | `/games/*`                                         | Jeux mathématiques ; gidouilles gagnées si l'élève est connecté (`public: true`, `src/routes/(public)/games/+page.svelte`)                                                     | oui                     | oui     |
| Glossaire Mathématique                     | `/glossaire`                                       | Dictionnaire, définitions par niveau (671 entrées dans la copie figée `tests/fixtures/lexique/dictionnaire-reference.ts` ; la base fait foi)                                   | **non**                 | oui     |
| Le Shtam                                   | `/shtam`, `/shtam/[slug]`                          | Gazette parodique du Royaume ; chaque article finit par son « Vrai du faux »                                                                                                   | **non**                 | oui     |
| L'Almanach des Chiphres                    | `/almanach`                                        | Calendrier pataphysique, date du jour, convertisseur                                                                                                                           | **non**                 | oui     |
| Zygomatics (« Les presques évaluations »)  | `/presques-evaluations`                            | Parodies d'évaluations en PDF                                                                                                                                                  | oui                     | oui     |
| Chiphre, c'est quoi ?                      | `/a-propos`                                        | Le manifeste, pour les parents                                                                                                                                                 | non (panneau « Infos ») | oui     |
| Exercice partagé                           | `/exercice/[slug]`                                 | Variantes, graine partageable, export PDF, solution ; le tuteur seulement pour un élève connecté                                                                               | non (lien partagé)      | non     |
| Cahier de textes public                    | `/cahier/[token]`                                  | Séances et devoirs d'une classe, par lien                                                                                                                                      | non (lien du prof)      | non     |
| Le Trône Royal (Père Ubu)                  | `/pere-ubu`                                        | Père Ubu et ses répliques ; **son chat exige un compte** (écart, voir plus bas)                                                                                                | non                     | oui     |

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
  seul accès famille est le lien du cahier de textes. (`/a-propos` le promet : écart.)
- **Une interface multilingue** : l'interface est en français seulement ; seuls certains contenus
  (fiches) existent en anglais.
- **Parler à Père Ubu sans compte** : le chat de `/pere-ubu` exige un compte.
- **Des chiffres en dur** (nombre de questions, de définitions) : ils périment. Les compter à la
  requête, ou ne pas les donner.

## Ne pas mettre en avant

- Démos et pages de mise au point : `/demo/*`, `/geometry-demo/*`, `/construction-demo`,
  `/test-font`, `/test-cadres`, `/api-docs`, `/blockly/playground`, `/slides/*`.
- Héritages remplacés par l'Atelier : `/calc`, `/cas` ([atelier.md](atelier.md)).
- Routes sans lien ou en sommeil : `/tuteur`, `/calculatrice`, `/games/evoland`, Navadra,
  `/spreadsheet` ([jeux-et-economie.md](jeux-et-economie.md), [outils-prof.md](outils-prof.md)).
- Tout `/dashboard/admin/*`.

## Comment un visiteur entre

- **Accueil** (`src/routes/(public)/+page.svelte`, épuré le 2026-10-06) : titre, Père Ubu au centre,
  une dépêche du Shtam tirée au hasard. Le seul autre accès est le bouton « Infos et
  confidentialité » (pages légales, `/a-propos`).
- **En-tête** (`src/lib/components/Header.svelte`) : « Connexion » en haut à droite ; l'inscription
  n'est atteinte que depuis la page de connexion (« Créer un compte »).
- **Menu** : Accueil, Jeux, Upsilon, Atelier, Chiffrement, Géométrie, Zygomatics.

## Écarts connus

Consignés dans [ecarts-a-trier.md](../wip/ecarts-a-trier.md) (V14, V15, C16, C17, D12-D15 ; chantier K19) :

- Père Ubu, sur l'accueil, mène à `/dashboard/chat` (connexion forcée pour un visiteur ; c'est la
  messagerie entre élèves, pas un chat avec Ubu).
- Le chat de `/pere-ubu` répond par une erreur à un visiteur, alors que la page est au sitemap.
- `/a-propos` promet un suivi « accessible aux parents ».
- Automaths, Glossaire, Shtam, Almanach : absents du menu ; l'Atelier, absent du sitemap.
- « Géométrie » au menu mène à `/geometry-demo`, exclue par `robots.txt` et titrée en anglais.
- `/test-cadres` et `/slides` ne sont pas exclus par `robots.txt`.
- La description SEO de `/games` cite Navadra, retiré du catalogue.
