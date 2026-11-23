# connexion-comptes-fictifs — se connecter en un geste sur le serveur de dev

## Reprendre ici

_Mis à jour le 2026-11-23, après #3030._

- **État** : **chantier clos le 2026-11-23**, #3030 mergée. Sur le serveur de dev, la page de connexion porte trois boutons « Prof », « Élève », « Admin » (comptes fictifs de la base locale) ; absents du build (garde de CI « Comptes fictifs absents du build »).
- **Où est le durable** : `docs/pratiques/tester-sur-un-autre-appareil.md` § « Se connecter sans rien taper », `docs/systeme/auth.md`.
- **Prochaine action** : aucune. **En attente de David** : rien.
- **Reste connu, non traité** : par le lien du tailnet, des appuis répétés sur « Élève » avec une base vide peuvent atteindre le limiteur de connexion (message 429 affiché) ; le message d'échec ne distingue pas « Supabase arrêté » de « base vide ».
- **Worktree / branche** : aucun (retirés par `pnpm pr:merger`).

## Phase 0 (validée par David le 2026-11-23)

- **Nominal** : sur la page de connexion du serveur de dev, trois boutons ; un appui connecte au compte fictif et mène au tableau de bord.
- **Limite** : déjà connecté → se déconnecter d'abord ; base non remplie → « Élève » essaie `student@local.test` après `eleve01@local.test` ; Supabase arrêté → message, rien d'autre.
- **Refus** : absents du build (garde de CI) ; cachés si le serveur ne vise pas la base locale.
- **Tranché** : boutons sur la page de connexion seulement (pas dans le panneau « Signaler ») ; trois comptes, pas de second élève.

## Journal

- **2026-11-23** : `src/lib/dev/local-accounts.ts` (source unique des comptes, `scripts/voir/logique.ts` la relit), `DevAccountButtons.svelte` (envoi à l'action `?/login` existante, aucune route nouvelle), chargement sous `import.meta.env.DEV` dans la page de connexion, garde de CI « Comptes fictifs absents du build ». Essais : 5 tests de l'ordre des comptes ; `e2e/verifs/connexion-dev.spec.ts` (3 verts : prof, élève, admin, compte lu dans le cookie) ; rendu vu par `pnpm voir /auth/login` (format iPhone) ; connexion « Élève » rejouée par le lien du tailnet en WebKit au format iPhone. Écart avec la phase 0 : pas de message propre à « base locale injoignable ».
- **2026-11-23 — revues avant la PR** (`code-reviewer`, `security-auditor`) : aucun bloquant. Sécurité : le composant et la liste des comptes ne sont importés que sous `import.meta.env.DEV`, la prod n'a aucun compte `@local.test` (mesuré : 0 sur 84), un serveur de dev qui viserait la prod cache les boutons. Corrigés : nom de la garde de CI dans deux commentaires, la garde vérifie elle-même que le build existe, résultat de l'action rendu par `signInWithFirst` (plus de variable partagée), réponse illisible distinguée de « serveur injoignable », tri des morceaux du cookie dans le test. Laissé : par le lien du tailnet, des appuis répétés sur « Élève » avec une base vide peuvent atteindre le limiteur de connexion (message 429 affiché).
