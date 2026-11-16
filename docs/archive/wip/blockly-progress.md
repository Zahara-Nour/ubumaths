# blockly — Blockly devient une fonctionnalité élève

## Reprendre ici

_Mis à jour le 2026-11-16, après #2727 et les publications en prod — **chantier clos**._

- **État** : clos le 2026-11-16 ; découpage validé recompté contre les PR mergées : PR 1 (#2627), tortue, bac à sable, geste « programme » tortue (4a / 4b) et calcul (5a / 5b), premiers modèles CM2 → 5e, nombre maximal de blocs (#2700, #2704), bac à sable des programmes de calcul, étanchéité (#2715), piste 4e / 3e (#2716, #2719, #2723, #2727) ; `deploy:prod` v0.91.0 ; 9 modèles 4e / 3e publiés ; doc durable : `docs/systeme/blockly.md`, ADR 0039 · **Prochaine action** : aucune · **En attente de David** : vérifications manuelles en prod (`verifications-manuelles.md`) · **Pièges en cours** : la base locale porte les 9 modèles 4e / 3e avec des ids LOCAUX · **Worktree / branche** : aucun

## Suites (futurs chantiers, non ouverts — clôture du 2026-11-16)

- **Tortue avec variables** (Q8 de la piste 4e / 3e) : piste à part.
- **Blocs imposés** (« plus tard » du découpage de la PR 4) : jamais faits.
- **Nombre maximal de blocs pour les programmes de calcul** : seulement si un modèle en a besoin
  (« un bloc » y est flou).
- **3-050 « Structurer des programmes »** : ni fonction ni bloc personnalisé ; classé « hors appli »
  dans `outils-manquants.md` § 3.
- **Ménage mineur** : README du module et types / constantes hérités de l'exécuteur retiré
  (`OutputLine`, `ExecutionContext`, `TIMEOUT_JS`), notés dans `blockly.md`.

## Phase 0 — validée par David le 2026-11-14

Point de départ : le prototype `/dev/blockly` (`$lib/components/blockly`, `$lib/shared/blockly`,
`$lib/workers/js-sandbox.worker.ts`). Blocs Blockly de base (Logique, Boucles, Math, Texte, Listes,
Variables, Fonctions), code JavaScript / Python généré, exécution en worker, sortie en console. Rien
n'est enregistré ; ni tortue ni dessin.

Programme (BO, `src/lib/server/programmes/transcriptions/cycle-3|4/*informatique.md`) : CM1 à 6e,
séquences, répétitions, « programmer la construction d'un chemin simple », figures ; 5e, entrées /
sorties, formules et programmes de calcul en blocs ; 4e, écrire et modifier un programme ; 3e,
structurer.

Décisions :

1. **Forme** : cible = **geste de réponse « programme » dans les modèles de questions** (fiches,
   devoirs, suivi existants ; pas de troisième système à côté des questions et des Python exercices).
   Étape intermédiaire : **bac à sable public**, issu de `/dev/blockly`, pour montrer vite aux élèves.
2. **Tortue dès le départ** : avancer de n, tourner de n°, lever / baisser le stylo, répéter ; tracé
   sur quadrillage. Correction par comparaison des **segments tracés**, sans ordre ni chemin
   (deux programmes qui font le même carré sont justes).
3. **Niveaux d'abord** : cycle 3 et 5e (tortue + programmes de calcul) ; 4e / 3e ensuite avec les
   mêmes outils ; le code Python généré reste un bonus, pas un objectif.
4. **Enregistrement** : pas de nouvelle table. Bac à sable : rien d'enregistré. Geste de réponse :
   le programme est la réponse de l'élève, rangé avec les autres réponses, mêmes règles d'accès
   (à vérifier dans le code avant de le confirmer).

Découpage :

| PR  | Contenu                                                                                                                      |
| --- | ---------------------------------------------------------------------------------------------------------------------------- |
| 1   | Blockly 13 (remplace la PR Dependabot #2074), médias servis par nous — #2627                                                 |
| 2   | Tortue : blocs, tracé sur quadrillage, tests                                                                                 |
| 3   | Bac à sable public à partir de `/dev/blockly`                                                                                |
| 4+  | Geste de réponse « programme » (correction par tracé ou par sortie), puis premiers modèles CM1 → 5e (sessions `questions-*`) |

## PR 1 — Blockly 13

- `blockly` 12.5.1 → 13.4.0. Changements cassants lus (notes de la 13.0.0) : renderer par défaut
  `geras` → `thrasos` (désormais explicite dans `DEFAULT_WORKSPACE_OPTIONS`), icônes en SVG, médias
  par défaut sur blockly.com, nouveaux raccourcis clavier, son au dépôt (nos sons sont coupés).
- `media` pointait vers `https://unpkg.com/blockly@12.5.1/media/` : requête vers un tiers depuis le
  navigateur des élèves, et dossier d'une autre version. Médias copiés dans `static/blockly/media`
  (68 Ko) ; `src/lib/shared/blockly/__tests__/media.test.ts` vérifie que la copie est identique au
  paquet installé (vérifié rouge avec un octet ajouté à `sprites.svg`).

### Vu à l'essai (`/dev/blockly`, port 5178) — défauts ANTÉRIEURS à Blockly 13

- Affichage, glisser-déposer et code généré : OK en 13 ; aucune requête vers unpkg.
- **L'exécution JavaScript n'a jamais marché** : `js-sandbox.worker.ts` passe les globales interdites
  (`eval`, …) en **paramètres** d'une fonction en mode strict → `SyntaxError: Unexpected eval or
arguments in strict mode`, quel que soit le programme. Présent depuis 4e3c2f7d5 (2025-12-06).
- **L'exécution Python échoue** : `Cannot access 'BasePythonExecutor' before initialization`
  (import circulaire, `$lib/shared/python/execution`).
- **Blocs en anglais** (« print », « create text with ») : aucune locale française chargée.
- Proposé : une PR 1b qui répare les deux exécutions et charge le français, avant la tortue (qui a
  besoin d'exécuter). Le sandbox est du code de sécurité → revue `security-auditor`.

## PR 1b — exécution réparée (rattachée à #2627, accord de David le 2026-11-14)

- **JS** : `js-sandbox-source.ts` (`construireSourceSandbox`) construit la fonction sandbox et refuse
  `eval` / `arguments` en paramètre ; `eval` est retiré de la portée globale du worker au démarrage.
  Variable `_blocked` (jamais utilisée) supprimée.
- **Sortie avalée** : `wrapJavaScriptCode` capturait `console.log` et les erreurs dans une valeur de
  retour que personne ne lisait. Enveloppe réduite aux aides math ; les tests qui exigeaient la
  capture (ils assertaient le défaut) remplacés par des tests qui exécutent le code enveloppé.
- **Bloc print** : Blockly génère `window.alert` → `installerGenerateursChiphre` le remplace par
  `console.log` (rouge vérifié : `window.alert('abc')` sans le remplacement).
- **Python** : `base-executor.svelte.ts` importait des valeurs du barrel `$lib/shared/python`
  (cycle → `Class extends value undefined`) ; import depuis `../config` et `../worker/messages`.
- **Français** : `Blockly.setLocale` avec `blockly/msg/fr` (« afficher », « répéter 10 fois »).
- Essai `/dev/blockly` : « abc » affiché en JS et en Python.
- Doc d'abord : `docs/systeme/blockly.md` écrite, zone Blockly retirée de `trous` (la
  calculatrice y reste).

## Revues de #2627 (2026-11-14)

- `code-reviewer` : rien de bloquant. Mineurs : `text_prompt_ext` génère `window.prompt` (hors
  boîte à outils) ; numéros de ligne d'erreur faux (comme avant).
- `security-auditor` : rien de bloquant tant que la page est admin seule. **Avant la page
  publique** :
  1. **Évasion** : `(() => {}).constructor('return this')()` → portée globale du worker → `fetch`
     same-origin avec les cookies de l'élève, `importScripts`. Regex `checkDangerousPatterns`
     contournables. Risque réel seulement si le code exécuté vient d'un autre que l'élève
     (programme partagé, exemple, devoir). **Question pour David** : durcir le worker
     (neutraliser `.constructor` des quatre prototypes de fonctions, supprimer `fetch` /
     `importScripts`… du global, CSP du worker), ou exécuter par un **interpréteur** (JS-Interpreter,
     QuickJS-wasm), ou — pour la tortue — interpréter les blocs nous-mêmes, sans JavaScript.
  2. **Boucle infinie jamais tuée** → corrigé dans #2627 (`relancerWorker`, test navigateur rouge
     puis vert).
  3. CSP du worker absente (fichier statique) : défense en profondeur, avec le point 1.

## Décision du 2026-11-14 : exécution sûre

David suit la recommandation (option 3) : les blocs tortue et calcul sont exécutés par un
**interpréteur de blocs écrit par Chiphre** (parcours de l'arbre des blocs, pas de JavaScript
évalué) — rien à évader ; il sert aussi à rejouer le tracé pour la correction par segments. Le JS /
Python généré reste affiché en aperçu. Options écartées : durcir le worker (course aux
contournements), interpréteur JS isolé (dépendance, lenteur). Figée : [ADR 0039](../../adr/0039-blocs-interpretes-par-chiphre.md).

## PR 2 — la tortue (branche `feat/blockly-tortue`, worktree `ubumaths-wt-blockly`)

Phase 0 présentée le 2026-11-14 ; David a tranché les trois questions ouvertes (ses réponses
suivent les recommandations).

- **Blocs** : avancer de n, reculer de n, tourner à droite de n°, tourner à gauche de n°, lever le
  stylo, baisser le stylo ; « répéter n fois » et « nombre » de Blockly, exécutés par
  l'interpréteur ([ADR 0039](../../adr/0039-blocs-interpretes-par-chiphre.md)).
- **Unité** : 1 = **un carreau** (tranché). **Quadrillage fixe 20 × 20** (tranché), tortue au
  centre, orientée vers la droite, stylo baissé ; ce qui sort du cadre est coupé et signalé.
- **Tracé instantané** (tranché) ; l'animation viendra avec le bac à sable (PR 3).
- L'interpréteur rend les segments tracés et la tortue finale ; segments normalisés pour la
  correction future (arrondis nettoyés, sens et ordre indifférents, segments alignés fusionnés).
- Limites : programme vide → rien, sans erreur ; stylo levé → déplacement sans trait ; angle
  quelconque ; répétitions négatives → 0.
- Erreurs : bloc inconnu → « Ce bloc n'est pas pris en charge par la tortue », rien n'est tracé ;
  plus de 10 000 pas → arrêt, message, tracé partiel affiché.

### Essai et revue (2026-11-14)

- Essai `/dev/blockly` (port 5176) : carré, stylo levé, dépassement du cadre signalé, arrêt à
  10 000 pas, bloc inconnu refusé — conformes.
- `code-reviewer` (Sonnet) : rien de bloquant. Corrigé : une distance énorme donnait `NaN`
  (→ erreur `trop-loin` au-delà de 1 000 000 carreaux) ; un nombre posé seul faisait refuser tout
  le programme (→ ignoré) ; en mode Programme, des blocs tortue partaient au worker (→ message) ;
  une pile de plus de 2 000 blocs était « illisible » (→ suivants lus en boucle, seule
  l'imbrication est bornée) ; toute exception rend `programme-illisible`. Choix faits sans David,
  à lui signaler : seuil `trop-loin`, nombre isolé ignoré, répétitions à virgule arrondies à
  l'entier inférieur (Scratch arrondit au plus proche).
- Écarté : la clé de regroupement de `normaliserSegments` (arrondi 1e-6) peut séparer deux
  droites identiques à une frontière d'arrondi (~0,2 % sur des irrationnels, non reproduit) ; à
  revoir avec la correction par tracé (PR 4).

## PR 3 — bac à sable public (branche `feat/blockly-bac-a-sable`, worktree `ubumaths-wt-blockly`)

Phase 0 présentée le 2026-11-14 ; David : « je te suis » sur les cinq recommandations.

- **Page publique `/tortue`, « La Tortue »**, sans connexion, rien d'enregistré. `/dev/blockly`
  reste l'atelier de l'admin (deux modes).
- **Tortue seule** : aucun JavaScript exécuté sur la page publique, seul l'interpréteur
  (ADR 0039) ; les programmes de calcul passeront eux aussi par l'interpréteur, plus tard.
- **Aperçu Python replié** (« Voir en Python »), en bonus.
- **Liens** : Header + Sidebar + sitemap ; pas de Tour du Royaume pour l'instant.
- **Animation** : vitesse fixe (~0,3 s par pas), bouton « Tout de suite » ; modifier les blocs
  pendant l'animation l'arrête et remet le quadrillage à zéro ; erreur → tracé partiel joué puis
  message.
- **Boucle** : `controls_repeat` (champ entier ≥ 0) dans la boîte à outils tortue, à la place de
  `controls_repeat_ext` (l'interpréteur garde les deux).

### Essai et revue (2026-11-14)

- Essai `/tortue` (port 5176, fenêtre étroite) : carré animé (tracé partiel à 1 s, complet
  ensuite), « Tracé terminé : 4 segments. », « Tout de suite », bloc sorti de la boucle pendant
  l'animation → quadrillage vidé ; aperçu Python juste. Corrigé à l'essai : en colonne, `flex-1`
  écrasait la hauteur de l'espace de blocs (0 px).
- `code-reviewer` (Sonnet) : rien de bloquant. Corrigé : première étape affichée dès « Lancer » ;
  test des étapes pour `trop-loin`. Laissé : « Lancer » sur un espace vide affiche « Tracé
  terminé : 0 segment. » (phase 0 : « rien, sans erreur »).
- Question posée à David : vitesse fixe → un long programme dure longtemps (`répéter 360` de
  « avancer 1, tourner 1 » = 720 étapes ≈ 3 min 30 ; 10 000 étapes ≈ 50 min).

## PR 3b — rythme de l'animation (branche `feat/blockly-animation-rythme`)

- **Tranché par David le 2026-11-14** (« oui » à ma recommandation) : 300 ms par étape jusqu'à
  40 étapes ; au-delà, l'animation entière dure 12 s, plusieurs étapes par tic quand une étape
  durerait moins d'une image (16 ms) ; pas de curseur de vitesse ; PR séparée après #2634.
- `rythmeAnimation(n)` dans `tortue/animation.ts`, testée (8, 40, 41, 720, 10 000, 0 étapes).
- `code-reviewer` (Sonnet) : rien de bloquant (total ≤ 12 s, pas ≥ 16 ms vérifiés). Mergée : #2636.

## PR 3c — La Tortue sur téléphone (branche `feat/blockly-onglets-telephone`)

- Essai de David sur iPhone (lien Tailscale, `--host`) : le tracé s'affichait **sous** les blocs,
  hors de l'écran. Options présentées (onglets, panneaux empilés, défilement au « Lancer ») ;
  **David : onglets, sous `lg`** (« oui », 2026-11-14).
- Onglets « Blocs » / « Tortue » sous `lg` ; « Lancer » bascule sur Tortue ; espace de blocs
  masqué, jamais démonté. Boutons au-dessus des deux panneaux (aussi sur ordinateur).
- Retour de David : pas de pause entre la bascule et le premier pas → **pause de 600 ms** au
  départ, tortue visible, rien de tracé (aussi sur ordinateur). « ça marche ! » (2026-11-14).
- Test navigateur `tortue-telephone.svelte.test.ts` (rouge vérifié pour les onglets et la pause).
- `code-reviewer` (Sonnet) : rien de bloquant ; nom du `tablist`, marge du test de pause, test
  « Tout de suite » pendant la pause ajoutés. Laissé : sur ordinateur, `tabpanel` sans onglet
  visible. Mergée : #2647.

## PR 4 — geste de réponse « programme » tortue (branche `feat/blockly-geste-reponse`)

Phase 0 présentée le 2026-11-14 ; David suit les quatre recommandations (« je suis tes recos »).

- **Bloc ubumark** ```tortue : `attendu:` (programme de référence en notation texte,
  `répéter 4 [ avancer 3 ; tourner à droite 90 ]`, variables tirées admises), `montrer: oui|non`
  (figure à reproduire en gris), `comparer: position|forme`.
- **Réponse enregistrée** (tranché, reco 1) : le programme de l'élève en notation texte (≤ 2 000
  caractères), rangé avec les autres réponses (aucune table, aucune règle d'accès nouvelle) ;
  reconverti en blocs à la réouverture.
- **Jugement** : les deux programmes rejoués par l'interpréteur, `memesTraces` (ni ordre ni chemin).
  **Comparaison** (tranché, reco 2) : `position` par défaut (même figure, même endroit) ;
  `forme` : à un quart de tour, un retournement ou une translation près (8 symétries du quadrillage).
- Élève : blocs + quadrillage dans la carte (onglets sur téléphone), Lancer à volonté, Valider ;
  programme vide → Valider grisé ; sortie du cadre → jugée sur le tracé, signalée ; erreur de la
  tortue → faux + message ; programme trop long → refusé avant l'envoi.
- Après validation : tracé de l'élève en couleur, attendu en pointillés, verdict ; corrigé :
  programme de référence en texte + figure. Évaluation notée : `attendu:` jamais envoyé, figure
  modèle seulement si `montrer: oui`. Contrôle du modèle : référence lisible et non vide à chaque
  tirage, sinon publication refusée.
- **PDF** (tranché, reco 3) : consigne + figure modèle + « À faire sur Chiphre ».
- **Découpage** (tranché, reco 4) : tortue seule ; correction par sortie (programmes de calcul,
  5e) = PR 5 ; blocs imposés, nombre maximal de blocs, premiers modèles : plus tard.
- Revoir la clé arrondie de `normaliserSegments`.

### PR 4a — logique, sans écran (branche `feat/blockly-geste-reponse`)

PR 4 coupée en deux (la chaîne d'un bloc à geste touche ~30 fichiers, cf. l'horloge `a244bd665`) :
**4a** = notation texte, jugement, bloc ```tortue (parseur), chaîne des questions (génération,
validation, corrigé, masquage), éditeur riche ; **4b** = écran (blocs dans la carte, corrigé
dessiné, aperçu de l'éditeur), PDF (« À faire sur Chiphre »), catalogue des blocs.

- `notation.ts` (texte ↔ état Blockly), `jugement.ts` (`position` / `forme`), `memesFormes`
  (8 symétries du quadrillage + translation) ; `normaliserSegments` : cases de 1e-6 + voisines
  (la frontière d'arrondi ne sépare plus une droite, test ajouté).
- Case : `construire: 'tortue'`, type `text`, attendu `position | <programme>`
  (`ubumark/utils/tortue-answer.ts`), message de la tortue en `feedback`. Masquage : `attendu: ?`
  - `figure: x1 y1 x2 y2 ; …` si `montrer: oui`.
- **Choix faits sans David, à lui signaler** : `montrer:` vaut `non` par défaut ; `forme`
  n'accepte que les 8 symétries du quadrillage (pas une rotation de 45°) ; une réponse de plus de
  2 000 caractères est tronquée par l'envoi (`toAnswer`) → l'écran (4b) doit la refuser avant.
- **Revue (code-reviewer Opus, 2026-11-14)** : aucun programme faux jugé juste, aucune fuite de
  `attendu:`. Corrigés, tests rouges sans le correctif vérifiés : figure `montrer: oui` de plus
  de 500 segments refusée à l'auteur (l'énoncé masqué ne se relisait plus) ; `\r\n` et
  « espace + retour à la ligne » lus comme séparateurs ; `LONGUEUR_MAX_PROGRAMME` =
  `MAX_ANSWER_LENGTH - 1` (une réponse tronquée par l'envoi est refusée côté serveur, plus jugée
  comme un autre programme) ; bloc cité ou en retrait masqué et vu par la garde. Reste, à dire à
  David : **entre 4a et 4b, une question tortue publiée n'a aucun écran pour répondre** (ni
  carte, ni PDF) → ne pas publier de modèle tortue avant la 4b.

### PR 4b — écran, corrigé, PDF, catalogue (branche `feat/blockly-geste-ecran`)

- Carte : `TortueProgramme.svelte` (quadrillage tout de suite, figure `montrer: oui` en gris ;
  éditeur `TortueEditeur.svelte` chargé par `import()`, Blockly hors des autres questions).
  Réponse = `etatVersTexte` ; vide, trop long (message) ou illisible → `''`. Verrouillé : blocs
  en lecture seule, tracé final vert / rouge, attendu en pointillés (réponse attendue de la case,
  sinon `attendu:` ; jamais en évaluation notée). Onglets Blocs / Tortue sous `lg`.
- Corrigé : `TortueCorrige.svelte` (sans Blockly) via `BuildAnswer` ; la ligne `build` porte
  `expected` (seul endroit où un énoncé masqué garde la référence).
- PDF : `tortue-typst.ts`, figure recadrée + « À faire sur Chiphre », cadre seul sans `montrer:`.
  Compilé pour de vrai dans le test.
- Catalogue : fiche `tortue` (3 exemples, 3 erreurs), aide à l'écriture et vitrine des blocs.
- Essai navigateur (vitrine `/demo/questions`, question ajoutée le temps de l'essai puis retirée) :
  blocs posés à la souris, Lancer, Valider → corrigé dessiné et programmes en texte. La forme
  « Saisie » laisse valider à vide (exprès, « valider à vide montre la réponse ») ; `QuestionCard`
  grise Valider sur réponse vide.
- **À dire à David** : une série d'automatismes **refuse** une question tortue (« 0 case(s) dans
  l'énoncé pour 1 réponse(s) ») : pas de règle de série écrite (que mettre au corrigé imprimé ?).

## PR 5 — geste de réponse « programme de calcul » (5e)

Phase 0 présentée le 2026-11-14 ; David suit toutes les recommandations (« je te suis »), y compris
celles laissées en attente aux PR 4a / 4b.

- **Élève** : assemble un programme de calcul en blocs, le lance à volonté sur un nombre qu'il
  tape (« Essayer avec »), voit ce qu'il affiche, valide.
- **Blocs** (tranché, Q1), tous interprétés (ADR 0039) : `nombre choisi` (entrée, lecture seule,
  BO 5e), nombres, les 4 opérations, **une seule variable** `résultat` (« mettre résultat à … » +
  lecture), `afficher`, `répéter n fois`. Pas de variable créée par l'élève (4e).
- **Jugement par sortie** : référence et programme de l'élève rejoués sur chaque nombre d'essai ;
  juste si mêmes affichages, dans l'ordre, pour chaque essai (`nombre × 4 + 8` juste pour
  `(nombre + 2) × 4`). Égalité à une très petite marge (0,1 + 0,2 = 0,3). Rien d'affiché → faux,
  « Ton programme n'affiche rien » ; division par zéro ou programme trop long sur un essai → faux +
  message ; bloc inconnu refusé ; programme vide → Valider grisé ; trop long → refusé avant l'envoi.
- **Bloc ubumark** (tranché, Q2) : ```calcul, `attendu:` (référence en notation texte, variables
  tirées admises), `essais:` facultatif ; défaut −3 ; 0 ; 1 ; 2 ; 5 ; 10 ; 0,5 (un seul essai ne
  sépare pas `× 2` de `+ 2`). Réponse = programme en notation texte (≤ `LONGUEUR_MAX_PROGRAMME`),
  rangée avec les autres réponses. Contrôle du modèle : référence lisible, qui affiche quelque chose
  sur chaque essai, sinon publication refusée.
- **`départ:`** (tranché, Q3, maintenant) : programme de départ à modifier (BO « modifier ses
  paramètres »), pour `calcul et `tortue.
- **Écran** (Q4, PR 5b) : blocs + « Essayer avec » + Lancer + affichages ; corrigé = programme de
  référence + tableau nombre → résultat sur les essais ; PDF = consigne + « À faire sur Chiphre ».
- **Découpage** (Q5) : **5a** = interpréteur, notation, jugement, bloc ubumark, chaîne des
  questions, `départ:` (parseur) ; **5b** = écran, corrigé, PDF, catalogue. Plus tard : mode Calcul
  du bac à sable, questions « prévoir la valeur » (programme en blocs dans l'énoncé).
- **Tranché aussi (en attente depuis 4a / 4b)** : `montrer:` reste à `non` par défaut ; `forme`
  reste aux 8 symétries du quadrillage ; une question à programme (tortue, calcul) reste refusée
  par les séries d'automatismes, mais avec un message clair pour le prof (« Une question à
  programme (tortue, calcul) ne peut pas entrer dans une série d'automatismes. ») — en 5a.

### PR 5a — logique, sans écran (branche `feat/blockly-calcul-logique`)

- `shared/blockly/lecture.ts` : lecture des blocs commune à la tortue et au calcul (sortie de
  `tortue/interpreteur.ts`, API de la tortue inchangée).
- `shared/blockly/calcul/` : `interpreteur.ts` (`executerCalcul(etat, nombre)`), `notation.ts`
  (texte ↔ blocs, priorités, parenthèses minimales qui gardent l'arbre), `jugement.ts`
  (`jugerProgrammeCalcul`, `lireEssais`). Blocs : `calcul_nombre_choisi`, `calcul_operation`
  (champ `OP`, 4 opérations ; pas `math_arithmetic`, qui offre la puissance), `calcul_resultat`,
  `calcul_mettre_resultat`, `calcul_afficher`, `math_number`, `controls_repeat(_ext)`. Les
  définitions Blockly (`blocs.ts`, boîte à outils) viennent en 5b avec l'écran.
- Bloc ``calcul : parseur, chaîne des questions (case `construire: 'calcul'`, attendu
`<essais> | <programme>`, `calcul-answer.ts`), masquage `attendu: ?`, éditeur riche, garde
nocturne. `départ:` lu par les parseurs ``calcul et ```tortue (`spec.depart`) ; l'écran le
  posera en 5b.
- Séries d'automatismes : refus clair d'une question à programme (`figer`).
- **Choix faits sans David, à lui signaler** : écriture canonique `résultat = …` (lecture de
  `mettre résultat à …` aussi) ; `:` lu comme une division ; `−` seulement devant un nombre
  (`0 − …` sinon) ; marge d'égalité relative 1e-9 ; `essais:` de 1 à 20 nombres distincts ;
  le programme est muet seulement s'il n'affiche rien sur AUCUN essai (sinon simplement faux).
- **Revue (code-reviewer Opus, 2026-11-14)** : rien de bloquant ; aucune fuite de `attendu:`,
  aller-retours et priorités sûrs, tortue inchangée. Corrigés, tests rouges sans le correctif
  vérifiés : une opération compte un pas (`répéter 4999 [ afficher nombre+1+…+1 ]` coûtait
  2 s de serveur par jugement) ; `controls_repeat_ext` retiré du calcul (un nombre de tours
  calculé s'écrivait `répéter 0`) ; nombre trop grand pour être lu refusé (lu 0, donc jugé
  juste contre `afficher 0`) ; marge absolue 1e-12 près de 0 (`nombre ÷ 10¹¹` était jugé égal à 0).

### PR 5b — écran, corrigé, PDF, catalogue (branche `feat/blockly-calcul-ecran`)

- Blocs : `calcul/blocs.ts` (`definirBlocsCalcul`, appelé par `BlocklyWorkspace` comme la tortue,
  sans générateur de code) ; `calcul/toolbox.ts` (`CALCUL_TOOLBOX` : Calcul — nombre choisi, les 4
  opérations à ombres, nombre —, Résultat, Afficher, Boucles avec `controls_repeat` seul).
- Carte : `CalculProgramme.svelte` → `CalculEditeur.svelte` par `import()` : « Essayer avec »
  (champ focalisé à l'ouverture, Entrée lance), Lancer, « Avec 2,5, le programme affiche : 18 ;
  4,5 », messages (rien d'affiché, division par zéro, nombre illisible). Verrouillé : blocs en
  lecture seule, cadre vert / rouge, on peut encore essayer.
- Corrigé : `CalculCorrige.svelte` via `BuildAnswer` : programmes en texte + tableau nombre →
  « Ton programme affiche / Il fallait afficher », lignes fausses en rouge ; `attendu: ?` → colonne
  de l'élève seule.
- PDF : `calcul-typst.ts`, cadre « À faire sur Chiphre » seul (ni référence ni départ). Compilé.
- Catalogue : fiche `calcul` (3 exemples, 3 erreurs) ; `départ:` ajouté à la fiche tortue.
- `départ:` (calcul ET tortue) posé dans l'espace de blocs quand la case est vide et pas
  jugée (projeté en classe aussi).
- **Choix faits sans David, à lui signaler** : le programme de départ ne devient la réponse qu'au
  premier changement (Valider grisé tant que l'élève n'y touche pas ; un départ non touché ne compte
  pas comme répondu dans un devoir) ; « Essayer avec » propose 5 ; 50 affichages montrés au plus ;
  pas de générateur JS / Python pour les blocs de calcul (le mode Calcul du bac à sable viendra
  plus tard).
- **Revue (code-reviewer Sonnet, 2026-11-14)** : aucun finding bloquant ; invariants vérifiés
  (référence jamais montrée avant validation ni en évaluation notée, blocs de la boîte à outils
  lus par l'interpréteur et la notation, `calcul/` sans Blockly, `départ:`, refus). Mineurs
  laissés : espace vidé → le départ revient à la recréation de la carte (documenté) ; double
  import `Blockly` / `BlocklyCore` et `math_number` posé seul ignoré, comme la tortue.

## Décisions après #2662 (David, 2026-11-14 : « je te suis »)

- **Choix de 5a gardés** : `:` = division ; `−` seulement devant un nombre (`0 − …` sinon) ;
  marges d'égalité ; `essais:` de 1 à 20 nombres. **Un seul changé** : l'écriture canonique est
  `mettre résultat à …` (les mots du bloc) et non plus `résultat = …`, qui en 5e se lit comme une
  égalité fausse (`résultat = résultat × 3`). `résultat = …` reste lu (plus court pour l'auteur
  d'`attendu:`). Le corrigé réécrit les deux programmes (`reecrireCalcul`), donc aussi une
  référence écrite `résultat = (nombre+2)*4`.
- **Choix de 5b gardés** : départ pas réponse tant qu'on n'y touche pas ; 5 proposé dans « Essayer
  avec » ; 50 affichages au plus ; pas d'aperçu JS / Python du calcul.
- **Piste suivante** : premiers modèles CM1 → 5e (fin du découpage validé), phase 0 d'abord.

## PR `fix/blockly-calcul-mettre-resultat` — #2664, mergée le 2026-11-14, en prod (0.88.0)

- `calcul/notation.ts` : `ecrirePile` écrit `mettre résultat à` ; `reecrireCalcul(texte)` (illisible
  → rendu tel quel). `CalculCorrige.svelte` : « Ton programme » et « Un programme juste » réécrits.
  Catalogue : exemples en `mettre résultat à`. Tests rouges sans le correctif vérifiés (notation,
  corrigé). Rien d'enregistré ne change de sens : les deux formes sont lues.
- Revue `code-reviewer` (Sonnet) : rien de bloquant (aucune comparaison de textes, réponses
  enregistrées rejouées comme avant, aucune fuite avec `attendu: ?`) ; +5 caractères par affectation
  sous `LONGUEUR_MAX_PROGRAMME` (1999), sans effet réel.

## Premiers modèles (David, 2026-11-14 : « je te suis »)

Relevé prod (lecture seule) : 0 modèle sur 5-100, 101, 102, 103, 104, 105, 106, 6-197, 6-210,
CM2-152 ; 6-194, 195, 196 en ont un (Algorithmique › Préalgorithmique).

- **Lot 11 de la 5e** (porté par CE chantier, David le 2026-11-14 ; numéro 11 et § 25 dans le journal
  `questions-5`), 6 modèles : 5-102 formule en
  blocs (calcul : a × nombre + b, (nombre + a) × b, nombre × nombre − a) ; 5-103 programme en
  étapes données en mots (calcul, 2 puis 3-4 étapes) ; 5-105 modifier un programme de calcul
  (`départ:`) ; 5-105 modifier un tracé (tortue, `départ:` carré 3 → carré 5, rectangle 4 × 2) ;
  5-106 répéter (tortue, `montrer:` : carré, escalier, créneaux ; nœud Boucles › boucle bornée) ;
  5-100 séquencer (tortue sans boucle : L, T, zigzag). Nœud par défaut : Algorithmique ›
  Variables et instructions.
- **Lot 6e** : 6-197 chemin sur quadrillage montré (tortue, 3 à 6 segments) ; 6-210 « pour 3,
  affiche 10 » (calcul, `essais:` d'un seul nombre : toute bonne réponse est juste).
- **Plus tard** : CM2-152 (comme 6-210, nombres simples) ; CM1-118 / CM2-104 laissés (déplacements
  dans le quartier). 5-101 et 5-104 attendent le programme en blocs affiché dans l'énoncé.
- **5-106** : (a) — la correction n'impose pas la boucle (un carré en 8 blocs est juste) ; les
  créneaux du niveau 3 la rendent presque nécessaire. « Nombre maximal de blocs » reste une piste.
- **Question d'accès** : rien de neuf (rattachement de modèles à un nœud et à un point).
- **Où** (David, 2026-11-14, « je te suis ») : les lots Blockly restent dans le chantier `blockly`
  (deux niveaux, suite directe du découpage), pas dans `questions-5` / `questions-6` ; le journal de
  la 5e garde un pointeur. Le chantier n'est pas clos : modèles, puis pistes (mode Calcul du bac à
  sable, « prévoir la valeur », nombre maximal de blocs, étanchéité du sandbox JS).

## Lot 11 de la 5e — écrit le 2026-11-14 (branche `feat/blockly-lot-5-11`)

Script `docs/wip/questions/lot-5-11-blockly.py` → `scripts/questions/5-lot11/` (6 modèles, 56 specs).

| #   | Point | Titre                               | Geste           | Variations                                        | Niveau |
| --- | ----- | ----------------------------------- | --------------- | ------------------------------------------------- | ------ |
| 01  | 5-100 | Séquencer des instructions (tortue) | tortue, montrer | L, T, zigzag (45°)                                | 1      |
| 02  | 5-102 | Écrire une formule en blocs         | calcul          | ax + b, b(x + a), x² − a                          | 1      |
| 03  | 5-103 | Programme de calcul en étapes       | calcul          | 2, 3, 4 étapes (la 4e réutilise le nombre choisi) | 2      |
| 04  | 5-105 | Modifier un programme de calcul     | calcul, départ  | changer 2 nombres ; changer + en −                | 2      |
| 05  | 5-105 | Modifier un tracé                   | tortue, départ  | carré 3 → c ; rectangle 4 × 2 → l × h             | 2      |
| 06  | 5-106 | Répéter des instructions (tortue)   | tortue, montrer | carré, escalier, créneaux                         | 1      |

- Nœuds (prod, relevé du 2026-11-14) : 01 à 05 → Algorithmique › Variables et instructions ;
  06 → Algorithmique › Boucles › boucle bornée (nœud du point 5-106).
- **Choix faits sans David, à lui signaler** : figure montrée → `comparer: position` ; figure décrite
  ou départ donné (05) → `comparer: forme` (le rectangle 3 × 6 est juste pour 6 × 3) ; zigzag
  tracé à 45° (« zigzag » à angles droits = créneau ou escalier, déjà au 06), l'énoncé donne
  l'angle de départ et la longueur des traits ; niveaux 1-2 ; délai 300 s.
- Vérifié : simulation 6/6 importable, 150 tirages par modèle ; une spec inversée → modèle refusé
  (specs bien jugées, calcul et tortue) ; base locale : 05 joué juste (départ posé, tracé, corrigé),
  04 joué faux (tableau des essais, correction).
- **#2667 mergée le 2026-11-14.** CI rouge d'abord : la garde de corpus
  `answer-complexity-corpus.test.ts` comptait les programmes (150 caractères et plus) alors qu'en
  prod une case tortue / calcul est jugée par son interpréteur avant `isAnswerTooComplex` ; test
  complété (comme `partage`), revue `code-reviewer` (Sonnet) sans bloquant.
- **Piste (revue de #2667)** : `validateBlanksOrderIndependent` (`answer-validator.ts` ~l. 2245)
  applique la garde à toutes les cases, programmes et `partage` compris : un modèle à cases
  interchangeables avec un programme de plus de ~130 caractères serait refusé. Aucun modèle
  concerné aujourd'hui.
- **#2669 mergée le 2026-11-15** : ids de prod commités, migration `20261115061153` (5 modèles sur la
  notion « Variables et instructions », sous-notions existantes admises ; 5-106 sur « Boucles ›
  boucle bornée »), test d'intégration 10/10, rouge sans la migration ; `security-auditor` sans
  bloquant ; `db:migrate` appliqué, vérifié en prod (nœud, un tag, brouillon, `updated_at` intact,
  trigger `O`). La base locale portait déjà les 6 modèles avec les ids de prod (copie) : le test les
  retire dans sa transaction annulée.
- **Page à cocher** : https://claude.ai/artifact/43MsAsgzEHGiLeC1G7qvqw (6 fiches, alerte « bloc non
  dessiné » sur chacune : `page-a-cocher.ts` ne dessine ni la tortue ni le calcul — piste pour
  `outils-manquants.md` si David le veut).
- **Publication** (2026-11-15) : 6 « ok » sur 6 à la page à cocher, aucun « À revoir » ; `publier-lot.ts --publier` lancé par David ; les 6 modèles sont `published` en prod (vérifié par requête).

## Lot 6e — écrit le 2026-11-15 (branche `feat/blockly-lot-6`)

Script `docs/wip/questions/lot-6-blockly.py` → `scripts/questions/6-blockly/` (2 modèles, 24 specs).
Avant : #2671 (ids du lot 10 de la 5e, restés non commités dans l'ancien worktree) mergée, ancien
worktree retiré.

| #   | Point | Titre                                | Geste                 | Variations                                       | Niveau |
| --- | ----- | ------------------------------------ | --------------------- | ------------------------------------------------ | ------ |
| 01  | 6-197 | Programmer un chemin sur quadrillage | tortue, montrer       | 3, 4, 5 (contourner un obstacle), 6 traits       | 1      |
| 02  | 6-210 | Programme pour un résultat donné     | calcul, un seul essai | + a ; × a ; × a puis + b (« pour n, affiche r ») | 1      |

- Nœud (prod, relevé du 2026-11-15) : 6-197 et 6-210 → Algorithmique › Préalgorithmique, les deux.
- **Choix faits sans David, à lui signaler** : 01 sans boucle, chemins à angles droits, tortue
  tournée vers la droite au départ (dit dans l'énoncé), chemin décrit en mots ET montré en gris
  (`comparer: position`) ; 02 : `essais: {{n}}` seul, donc `afficher 10` est juste (spec qui le dit)
  comme tout autre programme qui affiche r pour n ; l'énoncé suggère l'opération (« et une
  addition ») sans l'imposer ; niveau 1 ; délai 300 s.
- **#2674 mergée le 2026-11-15** (CI verte, contenu seul, pas de revue).
- Vérifié : simulation 2/2 importable ; une spec inversée → modèle refusé (01 et 02) ;
  `answer-complexity-corpus` et `student-answer-safety.render` verts. Pas joué en base locale.
- **#2685 mergée le 2026-11-15** (CI verte, contenu seul, pas de revue).
- **Création en prod** (2026-11-15, David, depuis le dépôt principal) : brouillon `42881663`, id
  reporté sur la branche (copie dans le scratchpad) ; relevé MCP : en {CM2}, sans nœud ni tag ; nœud
  visé = sous-notion (branch › notion › subnotion), sans enfant.
- **Migration** `20261115165220` (1 modèle sur « Algèbre › Premiers pas algébriques › programmes de
  calcul », un tag), calquée sur `20261115072353` ; test d'intégration 9/9, rouge sans la migration
  (5/9) ; garde « tout ou rien » sans objet à un modèle (test retiré), remplacée par « sous-notion
  archivée → échec ».
- `security-auditor` sans bloquant (non bloquants communs au gabarit : `set local lock_timeout` sans
  effet hors bloc explicite ; le rollback ne revérifie pas le nœud posé).
- **#2688 mergée le 2026-11-15** ; `db:migrate` (depuis le dépôt principal) appliqué, vérifié en
  prod : nœud `bd13a6e2`, un tag CM2-152, brouillon, `updated_at` intact (16:50:34), trigger `O`.
  ⚠️ Le même `db push` a appliqué `20261115165656_questions_ce1_robot_rangement_tags` (#2689,
  mergée juste avant par une autre session, pas encore appliquée) : sans erreur, contenu non vérifié
  par ce chantier — signalé à David.
- **Page à cocher** : https://claude.ai/artifact/X3HA2WHMiWNhUsu9QQF52x (1 fiche, alerte « bloc non
  dessiné », comme aux lots précédents).
- **Publication** (2026-11-15) : 1 « ok » sur 1 à la page à cocher, aucun « À revoir » ; `publier-lot.ts --publier` lancé par David ; le modèle est `published` en prod (vérifié par requête).
- **Création en prod** (2026-11-15, David) : 2 brouillons, ids commités aussitôt
  (01 → `94d75415`, 02 → `befab91c`). Relevé MCP : en {6}, sans nœud ni tag ; « Préalgorithmique »
  sans sous-notion.
- **#2676** : migration `20261115072353` (2 modèles sur « Algorithmique › Préalgorithmique », un tag
  chacun), calquée sur `20261115061153` ; test d'intégration 10/10, rouge sans la migration (6/10) ;
  `security-auditor` sans bloquant. CI : `Doc-inchangée:` doit être dans un COMMIT, pas dans la PR.
- **#2676 mergée le 2026-11-15** ; `db:migrate` (depuis le dépôt principal) appliqué, vérifié en
  prod : nœud, un tag chacun, brouillon, `updated_at` intact, trigger `O`. Garde des niveaux verte.
- **Page à cocher** : https://claude.ai/artifact/6gAfuvYSAHfgdYF8XBg4XW (2 fiches, alerte « bloc non
  dessiné » sur chacune, comme au lot 11).
- **Publication** (2026-11-15) : 2 « ok » sur 2 à la page à cocher, aucun « À revoir » ; `publier-lot.ts --publier` lancé par David ; les 2 modèles sont `published` en prod (vérifié par requête).

## Programme qui ne dépend pas du nombre — 2026-11-15 (branche `fix/blockly-calcul-programme-constant`)

- **Décisions de David (2026-11-15)** : ordre de la suite (« je te suis » sur mes recos) : corriger
  « afficher 10 », puis CM2-152, puis « prévoir la valeur » ; **règle générale** dans le jugement
  des cases calcul plutôt qu'une option de modèle (« je te suis » à cette question précise).
- Règle : attendu qui dépend du nombre (mesuré sur `ESSAIS_PAR_DEFAUT`, témoin en erreur ignoré)
  → la réponse doit en dépendre ; sinon faux, « Ton programme affiche toujours la même chose,
  quel que soit le nombre choisi. » Seulement quand les affichages coïncident sur les essais
  (verdict et message des réponses déjà fausses inchangés). Corrigé : le message sous le tableau.
- 6-210 : spec `afficher 10` → incorrect ; corrigé « …pourvu qu'ils utilisent le nombre choisi et
  affichent r avec n » ; source `lot-6-blockly.py` alignée. Specs rejouées sur une copie sans id
  (12/12 ; l'ancienne spec « juste » refusée).
- Tests : `jugement.test.ts` (rouges sans la règle), `CalculProgramme.svelte.test.ts` (corrigé, rouge
  sans la modification de `CalculCorrige.svelte`).
- **#2683** : revue `code-reviewer` (Opus) sans bloquant ; point 1 corrigé (corrigé : réponse vide
  avec référence connue gardait « n'affiche rien », test rouge d'abord), point 2 en commentaire
  (témoins fixes : un polynôme qui s'annule sur chacun tromperait la mesure, cas d'école).
  CI : `ubumark.md` couvre aussi `CalculCorrige.svelte` → `Doc-inchangée:` (il ne fait que le nommer).
- **#2683 mergée le 2026-11-15** (CI verte). **#2684 mergée** : instantané de `befab91c` (prod),
  corrigé, lot `blockly-6-210` ; simulation (diff = 3 corrigés + 1 spec, 12/12 vertes) puis
  `--publier` par David ; vérifié en base (publié, 3 corrigés, spec `incorrect`). Ligne ajoutée à
  `verifications-manuelles.md` (après `deploy:prod`).

## Lot CM2 — écrit le 2026-11-15 (branche `feat/blockly-lot-cm2`)

Phase 0 validée par David le 2026-11-15 (« je te suis ») : un modèle À PART (ADR 0020 ; point
d'Algèbre, pas d'Algorithmique), calqué sur 6-210 avec des nombres plus petits.

Relevé prod (lecture seule, 2026-11-15) : CM2-152 « Produire un programme de calcul pour obtenir un
résultat donné » (moitié « produire » de « Exécuter ou produire un programme de calcul », BO CM2,
Nombres › Algèbre), 0 modèle ; nœud **Algèbre › Premiers pas algébriques › programmes de calcul**
(sous-notion, aucun modèle rangé, aucun sous-nœud). CM2-067 (exécuter) : 0 modèle aussi → piste
« prévoir la valeur ».

Script `docs/wip/questions/lot-cm2-blockly.py` → `scripts/questions/CM2-blockly/` (1 modèle, 12 specs).

| #   | Point   | Titre                                      | Geste                 | Variations                                           | Niveau |
| --- | ------- | ------------------------------------------ | --------------------- | ---------------------------------------------------- | ------ |
| 01  | CM2-152 | Programme de calcul pour un résultat donné | calcul, un seul essai | + a (2..9) ; × a (2..5) ; × a (2..3) puis + b (1..5) | 1      |

- Titre distinct de 6-210 (même niveau) : `create-questions` refuse un homonyme.
- Énoncé : « Écris un programme de calcul qui donne r quand on choisit le nombre n », opération
  suggérée, pas imposée ; `afficher r` faux (règle de #2683) ; délai 300 s.
- Vérifié : simulation 1/1 (12 specs) ; une spec inversée → modèle refusé ;
  `answer-complexity-corpus` et `student-answer-safety.render` verts. Pas joué en base locale.

## Prévoir la valeur — écrit le 2026-11-15 (branche `feat/blockly-prevoir-valeur`)

**Phase 0** (David, 2026-11-15, « je te suis » à chaque fois). D'abord validé : un bloc Blockly
neuf en lecture seule dans l'énoncé (case ordinaire + contrôle de publication, corrigé pas à pas
calculé, PDF en texte), calcul seul, deux PR (bloc puis modèles). **Puis abandonné avant tout
code** : le bloc ``scratch (chantier `bloc-scratch`, #2122, en prod) montre déjà un programme dans
l'énoncé, et 7 modèles s'en servent, dont « Exécuter un programme pour un nombre de départ » (6e,
6-195, publié) — exactement « prévoir la valeur ». Décision : **aucun outil neuf**, un lot de
modèles en ``scratch (ou en mots, BO CM2), case ordinaire ou case choix. Perdu par rapport au
bloc neuf : corrigé écrit à la main (vérifié par les specs) et contrôle automatique case /
programme ; apparence Scratch et non Blockly.

Relevé prod (lecture seule) : CM2-067 « Exécuter un programme de calcul (résultat pour un nombre
de départ donné) » sur **Algèbre › Premiers pas algébriques › programmes de calcul** (sous-notion) ;
5-101 « Identifier les entrées et sorties d'un programme » et 5-104 « Prévoir la valeur d'une
expression informatique avant son exécution » sur la **notion Algorithmique › Variables et
instructions** (comme le lot 11). Aucun modèle sur les trois. BO CM2 : « jusqu'à trois
instructions », exemple en liste, « peuvent aussi être codés … comme Scratch ».

Script `docs/wip/questions/lot-prevoir-valeur.py` → `scripts/questions/blockly-prevoir-valeur/`
(3 modèles, 25 specs).

| #   | Point   | Titre                              | Variations                                                          | Niveau |
| --- | ------- | ---------------------------------- | ------------------------------------------------------------------- | ------ |
| 01  | CM2-067 | Exécuter un programme de calcul    | 3 instructions en mots (BO) ; 2 en mots ; Scratch (× a puis − b)    | 1      |
| 02  | 5-104   | Prévoir la valeur d'une expression | (x + a) × b imbriqué ; x + x × a ; x − a + b à intermédiaire < 0    | 1      |
| 03  | 5-101   | Entrées et sorties d'un programme  | choix « l'entrée ? » ; choix « la sortie ? » ; 2 entrées, 2 sorties | 1      |

- 5e : négatifs seulement en addition / soustraction (produit de relatifs en 4e) ; résultats
  entiers. Corrigés : « le bloc le plus intérieur se calcule en premier ».
- Vérifié : simulation 3/3 (25 specs, base prod, aucun homonyme) ; une spec inversée → chaque
  modèle refusé ; `check:ubumark` sur les énoncés et corrigés (Scratch reconnu, `dire … pendant
(2) secondes` compris ; témoin d'instruction inconnue bien signalé) ; `audit-question-draws`
  200 tirages par variation sans alerte ; `answer-complexity-corpus` et
  `student-answer-safety.render` verts. Pas joué en base locale (comme les lots précédents).
- **#2693 mergée le 2026-11-15** (CI verte, revue : aucune, contenu).
- **Création en prod** (2026-11-15, David) : 3 brouillons, ids commités aussitôt (01 → `98f54315`,
  02 → `55615796`, 03 → `b9e88a6e`). Relevé MCP : CM2 / 5 / 5, brouillons, sans nœud ni tag.
- **Migration** `20261115185327` (3 modèles ; CM2-067 sur la sous-notion « programmes de calcul »,
  5-104 et 5-101 sur la notion « Variables et instructions », `sous_notions_admises` = ses 4
  sous-notions), calquée sur `20261115061153` avec une colonne `grade` (deux niveaux dans le lot) ;
  test d'intégration 10/10, rouge sans la migration (6/10).
- **#2696 mergée le 2026-11-15** (CI verte, `check:migrations` 0, `security-auditor` sans bloquant ;
  son point non bloquant — commentaire du niveau inexact — corrigé avant le merge ; piste : garde
  `r.grade = any(q.grades)` dans les prochains lots). `db:migrate` depuis le dépôt principal (mis à
  jour par `merge --ff-only` : une autre session y avait `outils-manquants.md` en cours) ; il a
  aussi appliqué `20261115183239` (lot 13 de `questions-5`, #2692 mergée, vérifié : 9 sur 9 rangés
  et tagués). Vérifié en prod : 3 brouillons sur leur nœud, un tag chacun, `updated_at` intact.
- **Page à cocher** : https://claude.ai/artifact/54wTXeFmRnqVhRADrwT4mx (3 fiches, alerte « bloc
  scratch non dessiné » sur chacune : le programme y est montré en texte ; à jouer dans l'aperçu
  pour le dessin). Collection `verdicts` vide à la publication.
- **Publication** (2026-11-15) : 3 « ok » sur 3 à la page à cocher, aucun « À revoir » ;
  `publier-lot.ts --publier` lancé par David ; les 3 modèles sont `published` en prod (vérifié par
  requête).

## Nombre maximal de blocs — phase 0 validée par David le 2026-11-15

Besoin : 5-106 (carré, escalier, créneaux) ne force pas la boucle (un carré en 8 blocs est juste).
Pistes restantes après celle-ci : mode Calcul du bac à sable, étanchéité du sandbox JS.

- **Où** : bloc ```tortue seulement (calcul : « un bloc » y est flou ; plus tard si un modèle en a
  besoin). Clé `blocs: N` = au plus N blocs ; absente → rien ne change (modèles publiés compris).
- **Refus à la publication** : valeur non entière ou < 1 ; `attendu:` qui dépasse lui-même la limite.
- **Compte** : les blocs posés, pas les nombres écrits dedans (un carré en `répéter` = 3 blocs) ;
  compté sur le texte enregistré (blocs désactivés ou posés seuls exclus, comme à l'exécution) :
  le serveur juge sans Blockly.
- **Élève** : consigne « Au plus N blocs » affichée par la carte, compteur « Blocs : 5 / 3 », rouge
  au-delà ; **dépasser est permis** (option a : Blockly ne bloque pas) ; jugé faux, message « Ton
  programme utilise 8 blocs ; il en faut au plus 3. », même si le tracé est juste. Corrigé : la même
  phrase. Évaluation notée (`attendu: ?`) : la limite reste visible (consigne). `départ:` peut
  dépasser. Vide → faux sans message.
- **Question d'accès** : aucune (pas de migration). **Revue** : `code-reviewer` (Opus), correction
  des réponses.
- **Découpage** : PR A = l'outil ; PR B = 5-106 (carré 3, escalier 5, créneaux 9 = le nombre de
  blocs de l'attendu, déjà minimal), mise à jour du modèle publié lancée par David.
- **PR A écrite le 2026-11-15** (`feat/blockly-max-blocs`) : `nombreDeBlocs` (notation), `depassementDeBlocs` /
  `messageTropDeBlocs` (jugement), réponse attendue `position | blocs 3 | …`, clé `blocs:` (1 à 500,
  `TORTUE_BLOCS_MAX`), consigne + compteur (`data-compteur-blocs`), message au corrigé, catalogue.
  Tests rouges avant (11 serveur, 3 navigateur), verts après ; 15 538 tests serveur verts.
  Revue `code-reviewer` (Opus) : aucun bloquant ; deux mineurs corrigés (« 1 bloc » au singulier,
  commentaire de `blocsPoses`). PDF inchangé : le cadre « À faire sur Chiphre » suffit.
- **#2700 mergée le 2026-11-15** (CI verte ; la garde de doc a demandé aussi `questions.md` et
  `utilitaires-et-demos.md`, faits avant le merge).
- **PR B** (`feat/blockly-5-106-blocs`) : instantané de prod de 5-106 (`51636342`) dans
  `scripts/questions/5-blockly-existants/`, `blocs: 3 / 5 / 9`, une étape de corrigé par variation
  (« doit tenir en N blocs au plus… »), specs : carré sans répéter (7 blocs) devient faux, + carré
  bon tracé en 4 blocs, escalier et créneaux sans répéter (faux). Lot `blockly-5-106` dans
  `update-published-questions.ts`. Vérifié en local (`checkTemplate` 12 specs vertes ; les 4
  nouvelles rouges sur l'ancien contenu). La simulation du script (lecture de la prod) a été refusée
  par le classifieur du mode auto : **David la lance**, puis `--publier`.
- **#2704 mergée le 2026-11-15** (CI verte, revue : aucune, contenu). Publication du lot : David,
  **après** le `deploy:prod` qui livre #2700.

## Bac à sable des programmes de calcul — 2026-11-15 (branche `feat/blockly-bac-a-sable-calcul`)

Phase 0 présentée le 2026-11-15 ; David : « je te suis » sur les trois recommandations.

- **Page à part `/programmes-de-calcul`, « Programmes de calcul »**, publique, sans connexion, rien
  d'enregistré ; pas un second mode de `/tortue` (« La Tortue » qui calcule serait incohérent).
- **Contenu** : `CalculEditeur` tel quel (blocs de calcul, « Essayer avec », Lancer, Effacer,
  affichages) ; interpréteur seul (ADR 0039), rien de jugé.
- **Comportements** : nominal « mettre résultat à nombre choisi × 3 ; afficher résultat + 2 »,
  essayer avec 4 → 14 ; vide → « n'affiche rien » ; programme constant permis ; > 50 affichages
  coupés « … » ; 0,5 accepté ; boucle trop longue / division par zéro → message de l'interpréteur ;
  nombre illisible → refus du geste ; Blockly non chargé → message de rechargement.
- **Liens** : Header + Sidebar + sitemap, pas de Tour du Royaume ; renvoi croisé sous chaque page
  (« Essaie aussi … »).
- **Pas d'aperçu Python** (aucun générateur pour les blocs de calcul) ; un nombre à la fois, pas de
  tableau de valeurs.
- **Revue** : `code-reviewer` (Sonnet). Doc : `docs/systeme/blockly.md`.
- **#2707 mergée le 2026-11-15** : page `/programmes-de-calcul` (`CalculEditeur` tel quel), liens
  Header / Sidebar / sitemap, renvois croisés, 6 tests navigateur. Revue `code-reviewer` (Sonnet) :
  aucun bloquant, deux mineurs corrigés (guillemets insécables, test « pas d'aperçu Python » sur le
  rendu). CI d'abord rouge : la garde de doc demandait `coquille-et-caches.md` et
  `carte-des-fonctionnalites.md` (verte en local car lancée avant le commit du code).

## Étanchéité du sandbox JS — 2026-11-16 (branche `refactor/blockly-retirer-dev`)

Phase 0 présentée le 2026-11-16 (options : 1 garder `/dev/blockly` avec un mode Calcul, 2 la
supprimer, 3 ne rien faire). Constat : seul le mode Programme de `/dev/blockly` exécutait encore
le JavaScript généré ; les pages élèves passent par l'interpréteur ; la page n'apportait plus rien
au débogage (interpréteur couvert par les tests, mêmes éditeurs sur les pages publiques). Le
programme du cycle 4 n'exige que des blocs (pas de Python avant la seconde) : la 4e / 3e passera
par l'interpréteur, pas par ce worker. **David : option 2.**

- Retirés : la page et `+page.server.ts`, `BlocklyPlayground` / `BlocklyToolbar` /
  `BlocklyOutput` / `BlocklyCodePreview`, `blocklyPlayground.svelte.ts` (déjà mort), dossiers
  `shared/blockly/execution/` et `shared/blockly/worker/`, `js-sandbox.worker.ts`,
  `js-sandbox-source.ts` et leurs tests ; la carte de `/dev` ; la redirection `/blockly/playground`
  (elle menait à la page retirée) ; `QUICK_REFERENCE.md` et les deux `EXAMPLES.md` du module
  (recettes d'exécution du code généré dans un worker).
- Gardés : générateurs JS / Python (aperçu « Voir en Python » de `/tortue`), Pyodide (exercices
  Python du lycée, hors chantier).
- Garde **rouge vérifiée** avant le retrait (17 fichiers) : `aucun-javascript-execute.test.ts`.
- Tests d'aperçu adaptés : `print.test.ts` vérifie `console.log('abc')` dans le code ; les deux
  tests de `generators.test.ts` qui exécutaient le code dans la fonction sandbox sont retirés.
- Laissés (écart noté dans `blockly.md`) : types et messages hérités de l'exécuteur
  (`OutputLine`, `ExecutionContext`, `TIMEOUT_JS`…).
- Doc : `docs/systeme/blockly.md`, `utilitaires-et-demos.md`, ligne datée dans l'ADR 0039.
- Revue : `code-reviewer` (Sonnet), retrait de code.
- **#2715 mergée le 2026-11-16** (CI verte). Revue : rien de bloquant ; mineurs laissés : README du
  module et constantes `TIMEOUT_JS` / `OutputLine` périmés (déjà notés dans `blockly.md`), garde
  limitée à `src/` et aux noms connus. Garde de doc : `auth.md` demandé (worker Blockly hors CSP).

## Piste 4e / 3e — ouverte le 2026-11-16 (phase 0 à faire)

BO (`src/lib/server/programmes/transcriptions/cycle-4/*informatique.md`) : programmation **par
blocs** seulement. 4e : conditions simples, instructions conditionnelles, manipuler une variable,
écrire / modifier un programme. 3e : variables approfondies, conditions composées, boucle
conditionnelle, structurer des programmes.

- Tout passe par l'**interpréteur** (ADR 0039) : variables créées par l'élève, « si … alors …
  sinon », comparaisons, ET / OU / NON, « répéter jusqu'à » ; `controls_repeat_ext` revient avec
  les variables. Boucle conditionnelle → borne de pas comme `LIMITE_PAS`.
- À trancher en phase 0 : interpréteur de calcul étendu ou troisième famille ; notation texte des
  nouveaux blocs ; jugement (affichages sur des essais, comme le calcul ?) ; geste de réponse ;
  bac à sable (`/programmes-de-calcul` élargi ou page à part) ; aperçu Python ; premiers modèles
  (lesquels de 4e et 3e).

### Phase 0 — validée par David le 2026-11-16 (« je te suis »)

- **Q1** : même bloc ``calcul, même interpréteur ; clé `niveau: 5e | 4e | 3e` (absente = 5e,
modèles publiés inchangés) qui choisit les blocs proposés **et** admis (un bloc d'un niveau
au-dessus = bloc inconnu du niveau). Pas de bloc ``programme à part.
- **Q2** : variables créées par l'élève (« mettre x à », « ajouter … à x », lecture) ; `résultat`
  non proposé en 4e / 3e (lu en 5e) ; variable jamais mise vaut 0 ; 20 variables au plus, nom
  ≤ 20 caractères ; mots du langage refusés comme noms. Notation `mettre prix à nombre × 3 ;
ajouter 1 à compteur`.
- **Q3** : 4e « si … alors » et « si … alors … sinon » (deux blocs, comme Scratch) ; = ≠ < > ≤ ≥,
  égalité à la marge du jugement ; 3e ET / OU / NON ; une condition ne s'affiche pas.
  Notation `si nombre > 10 alors [ … ] sinon [ … ]`.
- **Q4** : « reste de la division de a par b » dès la 4e ; reste par 0 → erreur comme ÷ 0.
- **Q5** : 3e « répéter jusqu'à » (pas « tant que ») ; boucle infinie → « trop long » ; 4e
  `controls_repeat_ext` (tours calculés) revient, notation corrigée ; tours arrondis à l'entier
  le plus proche, négatif → 0.
- **Q6** : refus à la publication si une branche d'un « si » de la référence n'est jamais
  parcourue sur les essais (message : ajouter des `essais:`).
- **Q7** : `/programmes-de-calcul` garde une page, sélecteur « Blocs : 5e · 4e · 3e » (5e par
  défaut) ; pas d'aperçu Python.
- **Q8** : la tortue avec variables = piste à part, plus tard.
- **Comportements** : nominal `mettre x à nombre × 2 ; si x > 10 alors [ afficher x − 10 ] sinon
[ afficher x ]` (7 → 4, 3 → 6) ; limite : variable non mise = 0, « si » vide ne fait rien,
  « jusqu'à » déjà vrai = 0 tour, `répéter 2,6` = 3 tours ; erreur : boucle infinie, ÷ ou reste
  par 0, nom réservé, bloc au-dessus du niveau.
- **Découpage** : **PR A** logique (interpréteur, notation, jugement, `niveau:`, contrôle des
  branches ; revue `code-reviewer` Opus) ; **PR B** blocs Blockly, boîtes à outils, écran, corrigé,
  catalogue, sélecteur du bac à sable ; **PR C** premiers modèles 4e / 3e (relevé des points
  d'abord, liste proposée à David). Pas de migration.

### PR A — logique, sans écran (branche `feat/blockly-calcul-4e-3e`)

- `calcul/interpreteur.ts` : `NIVEAU_DES_BLOCS`, `executerCalcul(etat, nombre, niveau = '5e')`,
  variables (`nomsDesVariables`, `verifierNomDeVariable`, `VARIABLES_MAX`), `calcul_si`,
  `calcul_si_sinon`, `logic_compare` (égalité `egauxCalcul`, déplacée du jugement),
  `math_modulo` (euclidien), `controls_repeat_ext` (arrondi), `logic_operation` (courte),
  `logic_negate`, `calcul_repeter_jusqua` ; `branchesNonParcourues`, `siDuProgramme`.
- `lecture.ts` : `ALORS`, `SINON` sont des entrées d'instructions.
- `calcul/notation.ts` : grammaire 4e / 3e, liste `variables` dans l'état (seulement s'il y en a),
  `messageNiveau`, `conditionsDuProgramme`. `x = 3` et `répéter 2,5` se lisent maintenant (blocs
  de 4e), refusés en 5e par le niveau.
- Jugement, réponse attendue (`4e | essais | programme`), parseur (`niveau:`, refus hors niveau,
  branches), `build-answer`, `CalculCorrige` (rejoue au niveau).
- Tests rouges vérifiés avant (65), verts après : `niveaux.test.ts`, `calcul-niveaux.test.ts`.
- **Choix faits sans David, à lui signaler** : `résultat` réservé comme nom de variable (c'est le
  bloc de 5e) ; « reste » noté `reste de a par b` (opérande : nombre, nom ou parenthèses) ;
  condition vide écrite `faux` ; `non (…)` toujours entre parenthèses ; noms : lettres, chiffres,
  `_`, sans espace ; un état qui dépasse le niveau est refusé même si le bloc est désactivé (comme
  un bloc inconnu) ; le message à l'auteur nomme le bloc du niveau le plus haut.
- **Revue `code-reviewer` (Opus, 2026-11-16)** : aucun bloquant (aucun juste à tort, niveau
  étanche, 5e inchangée, allers-retours idempotents, bornes tenues). Corrigé (test rouge avant) :
  variable lue jamais mise dans `attendu:` / `départ:` refusée (« faute de frappe ? »), dite avant
  le niveau (en 5e, `afficher nombr` proposait de monter en 4e). Documenté : `afficher` seul
  dans un « si » sans « sinon » → référence refusée (muette sur un essai). **Pour la PR B** :
  Blockly distingue `Côté` et `cote` (accents), l'interpréteur non → refuser à la création un
  nom qui ne diffère que par les accents ; `CalculEditeur` doit passer le niveau à
  `executerCalcul` ; **aucun modèle 4e / 3e publié avant la PR B** (l'élève n'aurait pas les blocs).
- **#2716 mergée le 2026-11-16** (CI verte, revue `code-reviewer` Opus traitée).

### PR B — écran (branche `feat/blockly-calcul-4e-3e-ecran`)

- `calcul/blocs.ts` : `calcul_si`, `calcul_si_sinon`, `calcul_repeter_jusqua` (Blockly) ;
  `francaiserBlocsCalcul` (textes des blocs génériques comme la notation : « mettre x à »,
  « ajouter 1 à x », « reste de la division de 7 par 2 ») ; `surveillerNomsDeVariables`.
- `calcul/toolbox.ts` : `toolboxCalcul(niveau)` ; 5e inchangée ; 4e : Calcul + reste, Variables
  (catégorie dynamique de Blockly), Afficher, Conditions, Boucles (`controls_repeat_ext`), sans
  Résultat ; 3e : + et / ou / non, « répéter jusqu'à ».
- `CalculEditeur` : prop `niveau` (boîte à outils, `executerCalcul`), boîte à outils changée sans
  perdre les blocs, nom refusé affiché sous les blocs ; `CalculProgramme` passe `spec.niveau`.
- `/programmes-de-calcul` : sélecteur « Blocs : 5e · 4e · 3e » (boutons `aria-pressed`).
- `interpreteur.ts` : `refusDeNouveauNom` (accents / majuscules, revue #2716).
- Catalogue : clé `niveau`, exemples 4e (« si ») et 3e (« jusqu'à »), erreurs « bloc au-dessus
  du niveau » et « branche jamais parcourue ».
- **Vu à l'essai** (Chrome, port 5176) : la boîte « Créer une variable… » de Blockly 13 est un
  `<dialog>` natif que la remise à zéro de Tailwind collait en haut à gauche, sans marge →
  restylé dans `app.css`. Comparaisons bleues sous une catégorie marron → couleurs Conditions et
  Variables alignées sur le thème Classic.
- **Piège trouvé** : Blockly envoie ses événements au tour suivant ; comparer un nouveau nom aux
  variables présentes retirait la PREMIÈRE de deux créations rapprochées → comparaison aux
  variables déjà acceptées (test rouge avant).
- Tests rouges avant, verts après : `calcul/__tests__/blocs.test.ts` (14), 5 tests navigateur du
  bac à sable, 1 de la carte (`niveau: 4e`, rouge vérifié sans le passage du niveau).
- **Revue `code-reviewer` (Sonnet, 2026-11-16)** : un point important, corrigé (test rouge
  avant) : après un nom refusé, Ctrl+Z restait bloqué (la correction entrait dans l'historique,
  annuler recréait la variable refusée) → correction événements coupés, événement refusé retiré de
  la pile d'annulation ; la réponse est refaite au refus (le renommage remis sans événement
  l'aurait laissée vide, test rouge avant). Mineurs corrigés : message de nom masqué après la
  validation et effacé par « Effacer » ; dernier lancer effacé au changement de niveau ;
  `francaiserBlocsCalcul` commenté (réglage global).
- **Choix faits sans David, à lui signaler** : la boîte de saisie reste celle de Blockly
  (restylée), pas un dialogue Shadcn ; un nom refusé est retiré sans redemander ; le sélecteur
  garde les blocs posés en changeant de niveau ; en 4e / 3e, la boucle proposée est
  `controls_repeat_ext` seule (un nombre écrit dedans redevient le bloc de 5e au rechargement,
  même aspect) ; « reste » dans la catégorie Calcul.

### PR C — premiers modèles 4e / 3e (branche `feat/blockly-modeles-4e-3e`)

**Phase 0 validée par David le 2026-11-16** (« je valide », sur mes recommandations).

Relevé prod (lecture seule) des 10 points d'informatique du cycle 4 : 4-065, 066, 067 ont un
modèle **publié** qui fait LIRE un programme (QCM, valeur à prévoir) ; 3-047, 048, 049, 050 un
**brouillon** Scratch qui fait lire (pas de ce chantier, laissés) ; 4-068, 4-069, 3-051 aucun.
Aucun modèle ne fait ÉCRIRE un programme en blocs.

- **Décisions** : modèles « écrire » ajoutés à côté des « lire » ; 3-050 « Structurer des
  programmes » laissé (ni fonction ni bloc personnalisé dans nos blocs ; piste à noter dans
  `outils-manquants.md` si David le veut) ; Syracuse retiré (cas exotique) → « nombre de
  divisions par 2 » ; « afficher le nombre s'il est multiple, sinon 0 » plutôt qu'un 1 / 0 ;
  une PR modèles, puis une PR ids de prod + migration (nœud du point + tag), comme #2667 / #2669.

Script `docs/wip/questions/lot-blockly-4e-3e.py` → `scripts/questions/blockly-4e-3e/`
(9 modèles, 88 specs).

| #   | Point | Titre                                              | Bloc       | Variations                                                | Niv. |
| --- | ----- | -------------------------------------------------- | ---------- | --------------------------------------------------------- | ---- |
| 01  | 4-065 | Écrire une condition                               | 4e         | multiple de a ; âge ≥ a ; gel (< 0)                       | 1    |
| 02  | 4-066 | Programme avec « si … sinon »                      | 4e         | tarif de groupe ; distance à a ; impair + a               | 1    |
| 03  | 4-067 | Utiliser une variable                              | 4e         | prix ; table de a ; bactéries (doubler n fois)            | 2    |
| 04  | 4-068 | Écrire un programme pour résoudre un problème (4e) | 4e         | photocopies ; livraison ; somme 1..n                      | 2    |
| 05  | 4-069 | Modifier un programme avec condition               | 4e, départ | seuil ; > → ≥ ; ajouter le « sinon »                      | 2    |
| 06  | 3-047 | Plusieurs variables en blocs                       | 3e         | échange ; suite (somme des deux précédents) ; max         | 2    |
| 07  | 3-048 | Conditions composées en blocs                      | 3e         | entre a et b ; multiple de 3 ou 5 ; pair et > a ; ni … ni | 2    |
| 08  | 3-049 | Boucle « répéter jusqu'à » en blocs                | 3e         | reste par soustractions ; doublements ; multiple > n      | 2    |
| 09  | 3-051 | Écrire un programme pour résoudre un problème (3e) | 3e         | nombre de chiffres ; divisions par 2 ; épargne            | 3    |

- **Choix faits sans David, à lui signaler** : `essais:` toujours écrits (entiers, chaque
  branche parcourue, aucun essai qui ferait tourner sans fin la référence : énoncés « entier
  positif » pour 08 / 09) ; la variable n'est pas imposée (jugement par les affichages, comme
  la boucle au lot 11) ; 1 / 0 gardés pour âge, gel, intervalle (oui / non sans texte affichable) ;
  délai 300 s, 600 s pour 09 ; « Plusieurs variables **en blocs** » (un brouillon de 3e porte
  déjà « Plusieurs variables »).
- **Vérifié** : simulation 9/9 importable, base prod, aucun homonyme ; une spec « incorrect »
  inversée → chacun des 9 modèles refusé ; essais privés d'une branche → modèle refusé (50
  tirages en échec sur 150) ; base locale (copie des fichiers, ids locaux non commités), serveur
  5176 : 02 joué juste avec une autre écriture (≥, branches échangées), 05 départ posé puis joué
  faux (= au lieu de ≥, ligne rouge dans le tableau), 08 (3e) blocs « répéter jusqu'à » rendus,
  joué juste.
- **Publication** : aucune avant le `deploy:prod` qui livre #2719.
- **#2723 mergée le 2026-11-16** (CI verte, sans revue : contenu).

### PR D — ids de prod + rangement des 9 modèles 4e / 3e (branche `feat/blockly-4e-3e-rangement`)

- **Création en prod** (2026-11-16, David) : 9 brouillons, ids commités aussitôt (01 → `c3db6174`,
  02 → `81ab97a2`, 03 → `01109f75`, 04 → `f91149f2`, 05 → `d43fda5a`, 06 → `dbab36af`,
  07 → `a63f24b7`, 08 → `ee87b7b1`, 09 → `6e99d291`). Relevé MCP : 5 en {4}, 4 en {3},
  brouillons, sans nœud ni tag.
- **Nœuds des points** (prod, relevé du 2026-11-16), tous sous « Algorithmique » :
  4-065, 4-066, 3-048 → Variables et instructions › instructions conditionnelles ;
  4-067, 3-047 → Variables et instructions › variables et affectation ;
  3-049 → Boucles › boucle non bornée ;
  4-068, 4-069, 3-051 → notion « Variables et instructions » (4 sous-notions : blocs
  personnalisés, instructions conditionnelles, types, variables et affectation).
- **Question d'accès** (2026-11-16) : « qui pourra lire quoi, qu'il ne pouvait pas lire avant ? » →
  personne (rattachement de 9 brouillons à un nœud et à un point, aucune règle ne change) ; David : « oui ».
- **Migration** `20261116183439` générée par `docs/wip/questions/lot-blockly-4e-3e-rangement.py`
  (gabarit : `docs/wip/questions-5/lot-15-rangement.py`, qui garde aussi niveaux et statut, rollback
  gardé), relevé `docs/wip/questions/etat-prod-2026-11-16-blockly-4e-3e/` (`releve-prod.ts`, lecture
  seule). Test d'intégration 19/19, rouge sans la migration (11 en échec, 7 sautés).
- **#2727 mergée le 2026-11-16** (CI verte, `check:migrations` 0, `security-auditor` sans bloquant ;
  deux non bloquants hérités du gabarit, laissés). `db:migrate` depuis le dépôt principal ; vérifié en
  prod : 9 brouillons sur leur nœud, un tag chacun, niveaux inchangés, `updated_at` intact, trigger `O`.
- **Page à cocher** : https://claude.ai/artifact/HhrEdtV5TE2YPYZbCaXQFT (9 fiches, alerte « bloc calcul
  non dessiné » sur chacune : à jouer dans l'aperçu). Collection `verdicts` vide à la publication.
