# Chantier `surveillance-machine`

## Reprendre ici

_Mis à jour le 2026-11-24, après #3072._

- **État** : #2906 … #2931, #3069 (`pnpm machine:bilan`), #3072 (4 alertes : processus emballé quelconque et programme bloqué sur 2 passages, ≥ 10 sessions Claude de plus de 7 j, disque > 5 Go perdus en 24 h — ces deux-là 1×/jour) mergés ; dépôt principal à jour, launchd lance les nouveaux scripts.
- **À vérifier** : premières vraies alertes des 4 nouvelles (faux positifs ? WindowServer, zombies) ; ajuster les seuils au besoin (en tête de `surveillance-machine.sh` et de `machine-commun.sh`).
- **À reprendre à tête reposée** (§ « 2026-11-20 — disque et worktrees ») : 6 worktrees à travail unique (2 articles du Shtam jamais commités) ; Time Machine non configuré ; mise à jour de macOS (Preboot 20 Go).
- **Prochaine action** : idée 2 (alerte sauvegarde) une fois Time Machine configuré par David ; sinon clore le chantier (archivage du journal ; doc dans `docs/pratiques/environnement-de-dev.md`).
- **Pièges** : CI sous Linux → `date_modif` / `date_de`, jamais `stat -f` ni `date -r` nus ; faux `ps` des tests aiguillés par les champs demandés (`ppid=` contient `pid=`) ; `git -C ""` = dossier courant ; `kern.boottime` bouge de quelques secondes ; disque = `/System/Volumes/Data`.
- **Worktree / branche** : aucun.

## Contexte

2026-11-19 : le Mac mini gèle (62 onglets Chrome à ~1 170 % CPU, `vite dev` de 2,5 Go dans le dépôt principal depuis 4 h 20, swap 11,5 Go / 12). Règle écrite dans `CLAUDE.md` (commit a86e876). David valide : alerte ntfy.sh sur l'iPhone, action automatique seulement sur le cas sûr (serveur de dev dans le dépôt principal → arrêté).

## 2026-11-20 — orphelins, RAS, disque

- Phase 0 validée : orphelin = vitest, svelte-check, tsgo ou navigateur de Playwright au parent mort (ppid 1) depuis plus de 30 min → fermé par la surveillance elle-même (David a préféré « fermer » à « prévenir » : un orphelin léger ne déclencherait jamais le ménage du swap) ; `pnpm menage` les ferme aussi.
- Mesure réelle du 2026-11-20 : un Chrome for Testing seul depuis 10 jours (+ 2 crashpad) ; disque 24-27 Go libres sur 228 → seuil 15 Go (20 aurait sonné au premier gros install).
- « RAS » : premier passage après 9 h, marque `~/.local/state/surveillance-machine/ras` (date), posée seulement si l'envoi réussit.

## 2026-11-20 — disque et worktrees

**Disque** : 29 Go libres sur 228 → **41 Go** après les nettoyages validés par David : `pnpm store prune` (5,1 Go), `docker image prune -a` (2,2 Go ; 9,7 annoncés, couches partagées), Chromium 1243 de Playwright (utilisé par aucun projet : worktrees en 1217, 1248, 1254), `brew cleanup` (35 Mo).

Restent, côté David :

- **mise à jour de macOS préparée** : volume Preboot à 21,7 Go (5 à 7 d'habitude), instantané `com.apple.os.update-MSUPrepareUpdate` → l'installer libérerait sans doute ~15 Go (déduction, pas mesuré) ;
- cache de Brave (~5 Go, depuis ses réglages) ; 11 anciennes versions de Claude Code (3,1 Go, `~/.local/share/claude/versions`) ;
- ~60 Go invisibles pour moi (disque virtuel d'OrbStack, Photos, Mail, iCloud : accès refusé par macOS) → Réglages → Général → Stockage ;
- ⚠️ **Time Machine non configuré** (`tmutil destinationinfo` : « No destinations configured ») : aucune sauvegarde de la machine.

**Worktrees** (relevé du 2026-11-20 ; rien n'a été touché). Gain réel incertain : les ~1,4 Go par worktree sont surtout des `node_modules` en partie partagés avec le magasin pnpm.

1. ⚠️ **Travail qui n'existe que dans un worktree — à sauver avant toute suppression** :
   - `shtam-rsa` : article `czar-cle-publique.md` (« Le Czar Alexis grave sa clé de chiffrement… », 2026-10-06), non suivi, jamais commité ;
   - `relecture` : article `pifometrie-cigognes.md` (« Les cigognes apportent bien les bébés… », 2026-10-10), renommage indexé jamais commité ;
   - `boutique-avatars` : `static/avatars/phynance_hook.webp` (2026-11-18), non suivi ;
   - `presentation-eleves` : 2 commits non poussés (chantier ouvert le 2026-11-19, en attente du point 1 de David) ;
   - `evaluation-numerique` : branche locale différente de la poussée (7 commits hors `main`) ;
   - `questions-2de` : HEAD détaché, une ligne modifiée dans `scripts/questions/calcul-1spe/01-tableau-signes-affine.json`.
   - Proposition faite : commiter les 2 articles sur `main` (comme un article validé) ou les faire relire d'abord — **question ouverte**.
2. **Finis, rien à perdre — supprimables sur go explicite de David** : `automaths`, `automaths-serie` (#2866, #2875 mergées), `fiche-sections` (#1455), `registre-reference` (#2501 ; la suite `.intégrer` partira d'une nouvelle branche), `navadra` (#2822 ; reste `.tmp-seed/`, 12 Ko), `corrige-acces` (aucun commit, intact depuis le 2026-10-15) ; dossiers vides (`.vite` seul, non enregistrés comme worktrees) : `atelier-relever`, `fleches-focus`, `regularite`, `simplify-carte`.
3. **Vivants ou en suspens — à garder, à trancher chantier par chantier** :
   - PR ouvertes depuis plus de 10 jours : `ecarts-a-trier` (#2451, 2026-11-08), `questions-2de-demonstrations` (#2525, 2026-11-09) ;
   - commits poussés sans PR : `script-koch` (exercice « Le flocon de Von Koch », 2026-10-13), `verifs-auto` (lot 10, 5 commits, 2026-10-26), `corrections-modeles` (page de démo, 2026-11-18) ;
   - en attente de David : `boutique-avatars` (images de la PR 3), `evaluation-numerique` (son point suivant, depuis le 2026-10-28), `fusion-moteurs` (phase 0 jamais commencée) ;
   - `diaporama-reglages` : créé le 2026-11-20, sans commit — session sans doute active, ne pas toucher.

**2026-11-22** : go de David → les 6 worktrees du point 2 supprimés (`git worktree remove`, `--force` pour `navadra` à cause de `.tmp-seed/`, script jetable de la base locale) avec leurs branches locales (`git branch -d`, toutes mergées) ; les 4 dossiers vides supprimés. Revérifié avant : 0 commit hors `main`, 0 non poussé, aucun fichier non suivi hors `.tmp-seed/`, aucun stash lié.

## 2026-11-20 — worktrees en danger, redémarrage

- Idées proposées : (1) travail en danger dans les worktrees, (2) alerte sauvegarde (après configuration de Time Machine), (3) redémarrage imprévu ; bilan hebdomadaire et disque qui fond vite, moins prioritaires. David : « je te suis » → 1 et 3 en une PR, 2 plus tard.
- Phase 0 : « en danger » = fichiers non commités ou commits poussés nulle part, intouchés depuis 7 jours, dépôt principal exclu, worktrees d'agents compris. Question posée : rappel quotidien dans le « RAS » (ma recommandation) ou notification du lundi → David : « je te suis » en réponse à cette question → rappel dans le « RAS ».
- Redémarrage : `kern.boottime` comparé à la marque `demarrage` ; premier passage = noté sans envoi ; « (plantage du système) » si `*panic*` ou `Kernel*` dans `/Library/Logs/DiagnosticReports` est plus récent que le démarrage précédent.
- Essai réel : 4 worktrees en danger (relecture 40 j, shtam-rsa 44 j, questions-2de 14 j, evaluation-numerique 18 j), les mêmes que le relevé à la main ; 2,3 s pour les 18 worktrees (une fois par jour seulement).

## 2026-11-24 — bilan à la demande

- 2026-11-22 : Chrome bloqué depuis 12 jours — processus graphique et 2 extensions à 100 % chacun, processus morts jamais ramassés, « Quitter » sans réponse (AppleEvent -1712). Les 3 processus arrêtés puis Chrome fermé de force (`kill -KILL`) et relancé. La surveillance ne voyait que les extensions, pas le processus graphique ni le blocage.
- `pnpm machine:bilan` (`scripts/bilan-machine.sh`, lecture seule) : l'état en une page, dont deux choses que la surveillance ne regarde pas — processus emballé quel qu'il soit, parent qui ne ramasse plus ses processus morts (≥ 3) — plus sessions Claude par âge, Preboot, Time Machine, tendance 24 h. Tests : `scripts/__tests__/bilan-machine.test.ts` (vérifiés rouges en cassant le seuil et le nom du processus graphique).
- Premier passage réel (2026-11-24) : **Brave bloqué** (15 processus morts non ramassés, AppleEvent sans réponse en 10 s), 35 sessions Claude (6,9 Go, 11 de plus de 7 jours), swap 85-96 % sur 24 h, disque 21 → 16 Go libres en 24 h, Preboot 20 Go.
- Proposé à David, en attente : faire entrer dans la SURVEILLANCE (alertes) le processus emballé quelconque et le navigateur bloqué ; sessions Claude anciennes ; disque qui fond vite.
- #3069 mergée (revue Sonnet : 5 points corrigés — `lsof` muet, `tmutil` sans pipe, ancien historique, navigateurs à part, `LC_ALL=C ps`). Brave relancé de force le 2026-11-24 (TERM ignoré).

## 2026-11-24 — 4 alertes

- David : « ajoute les 4 ». Fonctions partagées bilan / surveillance dans `machine-commun.sh` : `processus_emballes`, `parents_bloques`, `sessions_claude`, `nom_lisible`, `nom_pour_notification` (hors `PROGRAMMES_CONNUS` → « un processus »).
- L'alerte « Extension X bloquée » devient « X (extension) emballé » et couvre tout processus. `a_renvoyer <clé> [minutes]` : sessions et disque qui fond, une fois par jour.
- Essai à blanc sur le Mac : « Sessions Claude : 10 ouvertes depuis plus de 7 jours (35 en tout, 6 Go) ». Disque : 20 → 19 Go en 24 h, rien.
- Tests vérifiés rouges sur le script de `main` (4 nouveaux).
- Revue Sonnet : emballé et bloqué exigent 2 passages de suite (`emballes-vus`, `bloques-vus`, < 11 min) — WindowServer ou un zombie ramassé juste après le passage ; disque : « plus de 5 » strict ; Mac éteint dans la fenêtre 20-24 h → rien, documenté. Laissés : sessions `claude` enfants comptées (léger surplus), marques par pid jamais nettoyées.
