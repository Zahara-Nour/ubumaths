# Chantier `surveillance-machine`

## Reprendre ici

_Mis à jour le 2026-11-20, après #2930._

- **État** : #2906, #2910, #2916, #2921, #2930 mergés ; le dépôt principal est à jour, launchd lance les scripts. #2930 : orphelins de test fermés d'office (reconnus par l'exécutable, crashpad épargné), « RAS » quotidien à 9 h, alerte disque sous 15 Go.
- **Écartés par David le 2026-11-20** : bouton « Faire le ménage » dans ntfy (canal sans authentification) ; nombre de sessions Claude.
- **À vérifier** : au prochain passage, le Playwright orphelin de 10 jours (pid 699) doit être fermé et signalé ; demain après 9 h, le premier « RAS » doit arriver sur l'iPhone.
- **À reprendre à tête reposée** (§ « 2026-11-20 — disque et worktrees ») : 6 worktrees portent du travail qui n'existe nulle part ailleurs (2 articles du Shtam jamais commités !) ; 7 worktrees finis + 4 dossiers vides supprimables sur go de David ; Time Machine non configuré.
- **Prochaine action** : clore le chantier (versement du durable dans `docs/systeme/` ou `docs/pratiques/environnement-de-dev.md`, déjà à jour ; archivage du journal).
- **Pièges** : `ps time=` sur macOS = « minutes:secondes.cc » ; noms de programmes = liste blanche ; disque = `/System/Volumes/Data`, pas `/` ; `chrome_crashpad_handler` toujours en ppid 1 ; index du dépôt principal : `git commit -- <mes fichiers>`.
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
