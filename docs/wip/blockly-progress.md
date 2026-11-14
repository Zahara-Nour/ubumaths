# blockly — Blockly devient une fonctionnalité élève

## Reprendre ici

_Mis à jour le 2026-11-14, après #2657._

- **État** : PR 1 à 4b mergées (#2627, #2632, #2634, 3b, #2647, #2651, #2657) ; plus de worktree · **Prochaine action** : phase 0 de la PR 5 (correction par sortie, programmes de calcul de 5e), à valider par David avant tout code, dans un worktree neuf `ubumaths-wt-blockly` · **En attente de David** : avis sur les choix listés au § PR 4a (`montrer:` à `non` par défaut, `forme` = 8 symétries) ; une question tortue est refusée par les séries d'automatismes (§ PR 4b) · **Après le prochain `deploy:prod`** : lignes #2627, #2632, #2634 / 3b / 3c et 4b de `verifications-manuelles.md` · **Pièges en cours** : montée de Blockly → recopier `node_modules/blockly/media` dans `static/blockly/media` (`media.test.ts`) ; `index.ts` de `tortue/` importe Blockly : hors éditeur, importer `notation.ts` / `jugement.ts` / `segments.ts` directement (l'éditeur est chargé par `import()`) ; tout fichier `src/lib` neuf atteint par l'intégration → motif dans `nightly-integration.yml` ; suite navigateur complète en local : le navigateur se ferme en route (machine), la CI fait foi · **Worktree / branche** : aucun (à recréer pour la PR 5)

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
contournements), interpréteur JS isolé (dépendance, lenteur). Figée : [ADR 0039](../adr/0039-blocs-interpretes-par-chiphre.md).

## PR 2 — la tortue (branche `feat/blockly-tortue`, worktree `ubumaths-wt-blockly`)

Phase 0 présentée le 2026-11-14 ; David a tranché les trois questions ouvertes (ses réponses
suivent les recommandations).

- **Blocs** : avancer de n, reculer de n, tourner à droite de n°, tourner à gauche de n°, lever le
  stylo, baisser le stylo ; « répéter n fois » et « nombre » de Blockly, exécutés par
  l'interpréteur ([ADR 0039](../adr/0039-blocs-interpretes-par-chiphre.md)).
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
