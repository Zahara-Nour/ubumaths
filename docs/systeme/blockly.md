---
couvre:
  - 'src/lib/shared/blockly/**'
  - 'src/lib/components/blockly/**'
  - src/lib/stores/blocklyPlayground.svelte.ts
  - 'src/routes/(protected)/dev/blockly/**'
  - src/lib/workers/js-sandbox.worker.ts
  - src/lib/workers/js-sandbox-source.ts
  - 'static/blockly/**'
---

# Blockly — programmation par blocs

> Écrite à partir du code le 2026-11-14 (chantier `blockly`, journal
> `docs/wip/blockly-progress.md`). Vérifié contre le code le 2026-11-14.

## À quoi ça sert

L'élève assemble des **blocs** (Blockly) ; Chiphre en tire du **JavaScript** ou du **Python** et
l'exécute, la sortie s'affiche dans une console. Programme visé : algorithmique par blocs du cycle 3
et du cycle 4 (Scratch au BO), relais vers Python au lycée.

État au 2026-11-14 : **prototype**, page `/dev/blockly` (réservée à l'admin). Rien n'est
enregistré. Le chantier `blockly` en fait une fonctionnalité élève (tortue, bac à sable public,
geste de réponse dans les modèles de questions) ; décisions dans son journal.

## Carte du code

| Fichier                                                       | Rôle                                                                                                                                             |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/routes/(protected)/dev/blockly/+page.svelte`             | Page de test, monte `BlocklyPlayground`                                                                                                          |
| `src/lib/components/blockly/BlocklyPlayground.svelte`         | Assemble espace de travail, barre d'outils, aperçu du code, console                                                                              |
| `src/lib/components/blockly/BlocklyWorkspace.svelte`          | `Blockly.inject` ; charge la locale française (`blockly/msg/fr`) avant                                                                           |
| `src/lib/stores/blocklyPlayground.svelte.ts`                  | État de la page (langage, code, sortie)                                                                                                          |
| `src/lib/shared/blockly/config.ts`                            | `BLOCKLY_CONFIG` (délais, limites), `DEFAULT_WORKSPACE_OPTIONS`, thème `CHIPHRE_THEME`, messages d'erreur                                        |
| `src/lib/shared/blockly/toolbox/standard.ts`                  | Boîte à outils : Logique, Boucles, Math, Texte, Listes, Variables, Fonctions                                                                     |
| `src/lib/shared/blockly/generators/`                          | `generateCode` / `getRawCode` (générateurs Blockly), enveloppes `wrapJavaScriptCode` / `wrapPythonCode`, garde-fous (longueur, boucles infinies) |
| `src/lib/shared/blockly/execution/blockly-executor.svelte.ts` | Aiguille vers `JsExecutor` ou, chargé à la demande, le `PlaygroundExecutor` Python (Pyodide, cf. [python/](python/))                             |
| `src/lib/shared/blockly/execution/js-executor.svelte.ts`      | Pilote le worker JavaScript                                                                                                                      |
| `src/lib/workers/js-sandbox.worker.ts`                        | Sandbox JavaScript : globales filtrées, délai de 10 s, sortie limitée                                                                            |
| `src/lib/workers/js-sandbox-source.ts`                        | Source de la fonction sandbox (sans effet de bord, testable sous Node)                                                                           |
| `static/blockly/media/`                                       | Médias de Blockly (corbeille, sprites, icônes), servis par Chiphre                                                                               |

## Invariants

- **Aucune requête vers un tiers depuis le navigateur des élèves** : `DEFAULT_WORKSPACE_OPTIONS.media`
  vaut `BLOCKLY_MEDIA_PATH` (`/blockly/media/`). Une montée de Blockly recopie
  `node_modules/blockly/media` dans `static/blockly/media` ; `media.test.ts` échoue sinon. Sons
  coupés.
- **Sandbox JavaScript** : le code reçoit uniquement des globales sûres, en **paramètres** d'une
  fonction en mode strict ; les globales dangereuses (`window`, `fetch`, `Function`…) y valent
  `undefined`. `eval` et `arguments` ne peuvent pas être des paramètres en mode strict
  (`construireSourceSandbox` refuse) : `eval` est retiré de la portée globale du worker au
  démarrage. `checkDangerousPatterns` refuse `constructor` / `__proto__` / affectation de
  `prototype`.
- **Boucle infinie** : le délai dépassé (ou `cancel`) fait `terminate()` puis recrée le worker
  (`relancerWorker`, `js-executor.svelte.ts`) ; un worker bloqué ne lit plus ses messages.
- **La sortie passe par la console du worker** : `wrapJavaScriptCode` n'intercepte ni
  `console.log` ni les erreurs ; une erreur remonte au worker, qui l'affiche.
- **Générateurs remplacés** (`installerGenerateursChiphre`, appelée avant chaque génération, jamais
  au chargement du module) : `text_print` écrit par `console.log` (Blockly génère
  `window.alert`, bloqué dans le sandbox).
- **Python** : `base-executor.svelte.ts` n'importe aucune **valeur** du barrel
  `$lib/shared/python` (import circulaire quand Blockly charge l'exécuteur par son fichier).
- Renderer `thrasos` explicite (défaut depuis Blockly 13).

## Comment étendre

- Nouveau bloc : définition JSON + générateurs JavaScript **et** Python, entrée dans la boîte à
  outils ; un test qui génère le code depuis un `Blockly.Workspace` sans interface et l'exécute dans
  `construireSourceSandbox` (modèle : `generators/__tests__/print.test.ts`).
- Générateur Blockly inadapté au sandbox : le remplacer dans `installerGenerateursChiphre`.

## Tests

- `src/lib/shared/blockly/__tests__/` : types, médias.
- `src/lib/shared/blockly/generators/__tests__/` : enveloppes, garde-fous, bloc `print` exécuté.
- `src/lib/workers/__tests__/js-sandbox-source.test.ts` : la fonction sandbox compile et s'exécute.
- `src/lib/shared/blockly/execution/__tests__/js-executor-boucle.svelte.test.ts` (navigateur) :
  après une boucle infinie, la console répond de nouveau.
- `src/lib/shared/python/execution/__tests__/import-direct.test.ts` : exécuteur Python importé par
  son fichier.

## Écarts connus

- ⚠️ **Le sandbox JavaScript n'est pas étanche** (revue `security-auditor` de #2627, 2026-11-14) :
  `(() => {}).constructor('return this')()` rend la portée globale du worker (`fetch` vers l'API
  avec les cookies de l'utilisateur, `importScripts`, `postMessage`). `checkDangerousPatterns` se
  contourne (`x['constr' + 'uctor']`). Le worker, fichier statique, n'a pas de CSP propre. Sans
  gravité tant que l'élève n'exécute que ce qu'il a écrit (les blocs standard ne produisent pas ce
  code) ; **à régler avant d'exécuter un programme écrit par quelqu'un d'autre** (programme
  partagé, exemple, devoir du prof). Choix à faire au chantier `blockly`.
- Le bloc `text_prompt_ext` (absent de la boîte à outils) génère `window.prompt` : à remplacer dans
  `installerGenerateursChiphre` s'il y entre.

- Le numéro de ligne d'une erreur (`extractLineNumber`) se rapporte au code enveloppé, pas aux
  blocs.
- Doublons de doc dans le module (`README.md`, `QUICK_REFERENCE.md`, `EXAMPLES.md`, en anglais,
  de la création du prototype) : non vérifiés contre le code.
