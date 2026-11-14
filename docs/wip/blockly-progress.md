# blockly — Blockly devient une fonctionnalité élève

## Reprendre ici

_Mis à jour le 2026-11-14, après #2632._

- **État** : #2627 (Blockly 13, exécution réparée) et **#2632 (la tortue)** mergées ; [ADR 0039](../adr/0039-blocs-interpretes-par-chiphre.md) : les blocs tortue et calcul sont **interprétés par Chiphre** (`executerTortue`), le code JS / Python n'est qu'un aperçu ; le sandbox JS ne doit jamais exécuter un programme écrit par un autre · **Prochaine action** : PR 3, bac à sable public à partir de `/dev/blockly` (mode Tortue seul ? animation du tracé, prévue là) — phase 0 à présenter avant de coder · **En attente de David** : trois choix pris sans lui dans #2632 (§ « Essai et revue ») : seuil `trop-loin` = 1 000 000 carreaux ; nombre posé seul ignoré ; « répéter 2,5 fois » = 2 tours (Scratch : 3) · **Après le prochain `deploy:prod`** : lignes #2627 et #2632 de `verifications-manuelles.md` · **Pièges en cours** : montée de Blockly → recopier `node_modules/blockly/media` dans `static/blockly/media` (`media.test.ts`) ; premier chargement de `blockly/msg/fr` en dev → page vide un instant ; ports 5176+ souvent pris ; `normaliserSegments` : clé arrondie à 1e-6, à revoir pour la correction par tracé (PR 4) · **Worktree / branche** : aucun (le prochain : `ubumaths-wt-blockly`, nouvelle branche)

---

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
