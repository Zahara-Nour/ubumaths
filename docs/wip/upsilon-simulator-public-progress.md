# Intégration simulateur Upsilon (route publique)

**Date** : 2026-05-09
**Statut** : ✅ Livré

## Objectif

Intégrer le simulateur web de la calculatrice graphique Upsilon (fork d'Epsilon par NumWorks) à UbuMaths, accessible publiquement à tous les visiteurs (anonymes ou connectés), avec icône dans la sidebar publique.

## Contexte

- Build d'origine : `extern/Upsilon/output/release/simulator/web/epsilon/` (3 fichiers : `simulator.html` 13 KB + `epsilon.js` 11 MB + `background.jpg` 318 KB).
- Cohabitation : la route existante `(protected)/calculatrice/` (officiel NumWorks, students+teachers seulement) reste intacte.
- Licence Upsilon : **CC BY-NC-SA 4.0** (non-commerciale + share-alike). Attribution obligatoire affichée dans la page.

## Décisions

| Décision                     | Choix retenu                                                                                         | Alternative écartée                                        |
| ---------------------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Cohabitation vs remplacement | Cohabitation (`/upsilon` + `/calculatrice` existant)                                                 | Remplacer `/calculatrice` par Upsilon                      |
| Visibilité                   | Route publique `(public)/upsilon/`                                                                   | Migrer `/calculatrice` en public                           |
| Intégration                  | Iframe vers `static/upsilon-simulator/simulator.html`                                                | Injection directe (conflits globals `Module`/`Calculator`) |
| Lazy-load                    | Bouton « Lancer le simulateur » avant chargement (économie 11 MB pour visiteurs qui ne cliquent pas) | Auto-load à l'arrivée                                      |
| Sidebar                      | Entrée sans `roles` → visible pour tout le monde                                                     | Conditionnel à un rôle                                     |

## Fichiers ajoutés / modifiés

### Ajoutés

- `static/upsilon-simulator/simulator.html` (copie inchangée d'Upsilon)
- `static/upsilon-simulator/epsilon.js` (11 MB — bundle Emscripten WASM en single-file base64)
- `static/upsilon-simulator/background.jpg`
- `src/routes/(public)/upsilon/+page.svelte` (nouvelle page Svelte 5)

### Modifiés

- `src/lib/components/Sidebar.svelte` — ajout entrée `{ label: 'Upsilon', href: '/upsilon', icon: Calculator }` + uncomment de l'import `Calculator` lucide-svelte

## Comportements implémentés

1. ✅ Route `/upsilon` accessible sans authentification
2. ✅ Gate de chargement explicite (preview `background.jpg` + bouton « Lancer le simulateur »)
3. ✅ Iframe vers `/upsilon-simulator/simulator.html` (chemins relatifs préservés)
4. ✅ Bouton plein écran (toggle Maximize2/Minimize2)
5. ✅ Sortie plein écran via touche Escape (`<svelte:window onkeydown>`)
6. ✅ Scroll lock du body en mode plein écran (`$effect` toggle `overflow-hidden`)
7. ✅ Footer attribution CC BY-NC-SA 4.0 avec liens vers Upsilon, NumWorks, et la licence
8. ✅ SEO : `<title>` + `<meta name="description">`
9. ✅ Icône dans Sidebar publique (lucide `Calculator`)

## Code review (code-reviewer agent)

**Verdict** : Ready to merge.

Suggestions appliquées :

- Scroll lock body en mode plein écran (`$effect` sur `document.body.classList`)
- Escape pour quitter le plein écran (refactoré en `<svelte:window onkeydown>` plutôt que `$effect` + addEventListener — plus idiomatique Svelte 5)

Non bloquant :

- 11 MB d'`epsilon.js` dans le repo Git : accepté (Git LFS n'est pas justifié pour un fichier unique).

## Quality checks

| Vérification                                                                            | Résultat                                                                                              |
| --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `mcp__svelte__svelte-autofixer` (2 fichiers)                                            | 0 issues. Suggestions restantes = faux positifs sur `$effect` DOM legitimate (`classList.toggle`)     |
| `npx eslint src/routes/(public)/upsilon/+page.svelte src/lib/components/Sidebar.svelte` | 0 errors                                                                                              |
| `pnpm check:incremental`                                                                | 9 errors / 46 warnings — **identique au baseline** (cf. `project_preexisting-svelte-check-errors.md`) |

## Tests manuels à faire (côté user)

- [ ] Visiter `/upsilon` en anonyme → page accessible, preview affichée
- [ ] Cliquer « Lancer le simulateur » → iframe charge, calculatrice apparaît après ~quelques secondes
- [ ] Tester quelques touches du clavier émulé (saisie, ENTER, OK)
- [ ] Toggle plein écran → écran couvre tout l'écran, sidebar masquée
- [ ] Touche Escape en plein écran → retour au mode normal
- [ ] Mobile : touch sur les touches émulées
- [ ] Sidebar : icône « Upsilon » visible pour anonyme et connecté

## Limitations connues / à surveiller

1. **Poids du repo Git** : `epsilon.js` 11 MB est dans `static/`, donc tracké. Si on doit re-build régulièrement Upsilon, envisager Git LFS plus tard.
2. **Cold load** : ~11 MB téléchargés à la première visite. Préférer un cache HTTP long via headers Vercel (`Cache-Control: public, max-age=31536000, immutable` sur le path `/upsilon-simulator/*`).
3. **Build Upsilon datée Oct 2022** : la fonctionnalité est OK mais on rate les fixes Upsilon plus récents. À recompiler depuis `extern/Upsilon/` avec emsdk si besoin.
4. **Pas de tests automatisés** : composant trivial (iframe + 2 booléens d'état). Couvert manuellement.
5. **Licence CC BY-NC-SA 4.0** : si UbuMaths bascule en modèle commercial à terme, l'embed Upsilon devient juridiquement problématique. À reconsidérer (revenir à Epsilon officiel MIT, ou licence commerciale spécifique avec NumWorks).

## Documents produits

- `docs/wip/upsilon-simulator-public-progress.md` (ce fichier)
