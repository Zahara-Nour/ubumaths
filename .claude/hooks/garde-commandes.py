#!/usr/bin/env python3
"""Garde-fou PreToolUse (Bash) : les interdits de CLAUDE.md, appliqués avant la commande.

Sortie 2 + explication sur stderr : Claude Code refuse la commande et renvoie
l'explication au modèle. `demander` rend la main à David pour confirmer : il
complète la liste `ask` de .claude/settings.json, qui fait foi pour les commandes
qui perdent du travail mais ne reconnaît qu'un début de commande.
Tout le reste (sortie 0, rien sur stdout) passe sans bruit. Une entrée illisible
ne bloque jamais : le garde-fou ne doit pas casser la session.

Tests : scripts/__tests__/garde-commandes.test.ts.
"""

import fcntl
import json
import os
import re
import subprocess
import sys


def refuser(raison: str) -> None:
    print(f"⛔ Garde-fou CLAUDE.md : {raison}", file=sys.stderr)
    sys.exit(2)


def demander(raison: str) -> None:
    print(
        json.dumps(
            {
                "hookSpecificOutput": {
                    "hookEventName": "PreToolUse",
                    "permissionDecision": "ask",
                    "permissionDecisionReason": raison,
                }
            },
            ensure_ascii=False,
        )
    )
    sys.exit(0)


try:
    entree = json.load(sys.stdin)
    commande = entree.get("tool_input", {}).get("command", "") or ""
    dossier = entree.get("cwd", "") or ""
except Exception:
    sys.exit(0)

# Le corps d'un heredoc (message de commit `-F -`, fichier écrit par cat) n'est pas une commande.
sans_heredoc = re.sub(r"<<-?\s*(['\"]?)(\w+)\1[^\n]*\n.*?\n\s*\2\s*(?=\n|$)", "", commande, flags=re.S)

# Le texte entre guillemets (messages de commit, corps de PR) n'est pas une commande :
# il devient un repère "Qn", qui ne ressemble à aucune option. Son contenu est rangé
# pour les chemins de `cd` et de `git -C`, qu'on écrit souvent entre guillemets.
citations: list = []


def ranger(m: "re.Match[str]") -> str:
    citations.append(m.group(0)[1:-1])
    return f'"Q{len(citations) - 1}"'


sans_texte = re.sub(r'"(?:\\.|[^"\\])*"|\'[^\']*\'', ranger, sans_heredoc)
segments = [s.strip() for s in re.split(r"&&|\|\||;|\||\n", sans_texte) if s.strip()]


def chemin(argument: str) -> str:
    """Un argument de chemin, guillemets retirés et `~` développé."""
    repere = re.fullmatch(r'"Q(\d+)"', argument)
    brut = citations[int(repere.group(1))] if repere else argument
    return os.path.expanduser(brut) if brut else ""


def git_dans(lieu: str, *args: str) -> str:
    """Sortie d'une commande git lancée dans `lieu` ; vide si elle échoue.

    Jamais avec un `lieu` vide : git agirait alors dans le dossier courant.
    """
    if not lieu:
        return ""
    try:
        r = subprocess.run(["git", "-C", lieu, *args], capture_output=True, text=True, timeout=5)
    except Exception:
        return ""
    return r.stdout.strip() if r.returncode == 0 else ""


def branche(lieu: str) -> str:
    return git_dans(lieu, "rev-parse", "--abbrev-ref", "HEAD")


def deploiement_en_cours(lieu: str) -> bool:
    """Vrai si `pnpm deploy:prod` tient le verrou noyau « deploy » (scripts/lib/lock.py).

    Le verrou vit dans le répertoire git COMMUN, partagé par tous les worktrees.
    On tente un verrou PARTAGÉ non bloquant : il échoue seulement si le déploiement
    tient le verrou exclusif ; sinon on le relâche aussitôt.
    """
    commun = git_dans(lieu, "rev-parse", "--path-format=absolute", "--git-common-dir")
    if not commun:
        return False
    try:
        fd = os.open(os.path.join(commun, ".locks", "deploy"), os.O_RDONLY)
    except OSError:
        return False
    try:
        fcntl.flock(fd, fcntl.LOCK_SH | fcntl.LOCK_NB)
    except OSError:
        return True
    else:
        fcntl.flock(fd, fcntl.LOCK_UN)
        return False
    finally:
        os.close(fd)


DEPLOIEMENT = (
    "`pnpm deploy:prod` est en cours (verrou « deploy ») : ni merge de PR, ni commit ou push sur main "
    "jusqu'à sa fin. Un main qui bouge fait refuser le push du commit de version, et chaque merge "
    "relance la CI qu'il attend. Attendre la fin du déploiement."
)


def mot(segment: str) -> str:
    """Le segment sans ses parenthèses ou accolades ouvrantes, ni ses affectations de
    variables en tête (`(cd x && …)`, FORCE=1 …)."""
    sans_groupe = re.sub(r"[)}\s]+$", "", re.sub(r"^[({\s]*", "", segment))
    return re.sub(r"^(?:[A-Za-z_][A-Za-z0-9_]*=\S*\s+)*", "", sans_groupe)


# Dossier où s'exécute chaque segment : celui de la session, puis les `cd` successifs.
ici = dossier
# Un `gh pr merge` plus tôt dans la même commande (suppression de branche chaînée).
merge_de_pr_vu = False

for brut in segments:
    s = mot(brut)

    aller = re.match(r"cd\s+(\S+)$", s)
    if aller:
        if chemin(aller.group(1)) and ici:
            ici = os.path.normpath(os.path.join(ici, chemin(aller.group(1))))
        continue

    if re.match(r"gh\s+pr\s+merge\b", s):
        if deploiement_en_cours(ici):
            refuser(DEPLOIEMENT)
        merge_de_pr_vu = True

    if re.match(r"pnpm\s+(?:run\s+)?check:fast\b", s) or re.search(r"\btsc\b.*--noEmit", s):
        refuser("meurt sur le tas V8 (~4 Go) et donne de faux positifs `$lib`. Utiliser `pnpm check:incremental`.")

    # Seule une EXÉCUTION compte : `npm view svelte-check` ou un grep ne lancent rien.
    lance_svelte_check = re.search(
        r"(?:^|\benv\s.*|\bnpx\s+|\bpnpm\s+(?:exec\s+|dlx\s+)?|\.bin/)svelte-check\b", s
    )
    if lance_svelte_check and "--incremental" not in s and "--tsgo" not in s:
        refuser("`svelte-check` sans `--tsgo` ni `--incremental` meurt sur le tas V8. Utiliser `pnpm check:incremental`.")

    if re.match(r"pnpm\s+(?:run\s+)?dev\b", s):
        if re.search(r"\s--\s", s + " "):
            refuser("le « -- » de `pnpm dev -- --port` fait ignorer le port : le serveur démarre sur 5173, celui de David. Écrire `pnpm dev --port 5175 --strictPort`.")
        port = re.search(r"--port[ =](\d+)", s)
        if not port or "--strictPort" not in s:
            refuser("`pnpm dev` sans `--port 5175 --strictPort` dérive en silence vers un autre port. Dépôt principal : 5175 ; worktree : un port libre à partir de 5176.")
        if port.group(1) == "5173":
            refuser("5173 est le port de David. Prendre 5175 (dépôt principal) ou un port libre à partir de 5176 (worktree).")

    if re.match(r"pnpm\s+(?:run\s+)?kill:servers\b", s) and "ubumaths-wt-" in dossier:
        refuser("`pnpm kill:servers` depuis un worktree tue le serveur de David (5173) et Supabase. Tuer seulement son propre port.")

    if re.match(r"(?:npx\s+)?supabase\s", s + " "):
        refuser("la CLI Supabase du projet se lance par `pnpm exec supabase …` (ou les scripts `pnpm db:*`), jamais directement.")

    if re.match(r"git\s+push\b", s) and "--no-verify" in s:
        refuser("`--no-verify` saute aussi `lint:fast` ; le hook pre-push est léger, il n'y a plus de raison de le contourner.")

    if re.match(r"pnpm\s+(?:run\s+)?release(?::\w+)?\b", s) and "--dry-run" not in s:
        refuser("la version se crée avec la mise en prod : `pnpm deploy:prod`, sur demande explicite de David (ADR 0021).")

    # Commandes qui perdent du travail : la liste `ask` de .claude/settings.json fait
    # foi, mais elle ne voit qu'un début de commande (`git push origin main --force`
    # lui échappe). Ici, l'option est cherchée n'importe où dans la commande git.
    # Options globales avant le verbe : `-C <dossier>`, `-c clé=valeur`, `--no-pager`…
    commande_git = re.match(r"git((?:\s+(?:-C\s*\S+|-c\s+\S+|--[\w-]+(?:=\S+)?))*)\s+(\w[\w-]*)\b(.*)", s)
    if commande_git:
        verbe, reste = commande_git.group(2), " " + commande_git.group(3) + " "
        lieu = ici
        for dossier_git in re.findall(r"-C\s*(\S+)", commande_git.group(1)):
            # `git -C ""` : git reste dans le dossier courant, le dépôt principal
            # (incident du 2026-10-10). Vu ici, sur la commande exécutée, et non dans
            # un heredoc ou un message qui le cite.
            if not chemin(dossier_git):
                refuser('`git -C ""` agit dans le dossier courant, souvent le dépôt principal. Vérifier que le dossier n\'est pas vide.')
            if lieu:
                lieu = os.path.normpath(os.path.join(lieu, chemin(dossier_git)))
        # Arguments hors options : chemins, remote, refspecs (un texte entre guillemets compte)
        arguments = [a for a in reste.split() if not a.startswith("-")]
        if verbe == "push" and re.search(r"\s(?:--force(?:-with-lease)?(?:=\S*)?|-f)\s", reste):
            demander("push forcé : il réécrit l'historique distant (liste `ask` de .claude/settings.json).")
        if verbe == "branch" and (
            re.search(r"\s-D\s", reste) or (re.search(r"\s--delete\s", reste) and re.search(r"\s--force\s", reste))
        ):
            demander("suppression forcée de branche (`-D`) : elle perd les commits non mergés. Préférer `git branch -d`.")

        # `gh pr merge` peut échouer (`Base branch was modified`, `BLOCKED`) : la suite
        # tourne quand même, et supprimer la branche distante d'une PR ouverte la FERME
        # sans merge (#1601, 2026-10-22).
        supprime_distante = verbe == "push" and (
            re.search(r"\s(?:--delete(?:=\S*)?|-d)\s", reste) or any(a.lstrip("+").startswith(":") for a in arguments)
        )
        # Options groupées comprises (`-vd`, `-fd`)
        supprime_locale = verbe == "branch" and re.search(r"\s(?:-[a-zA-Z]*[dD][a-zA-Z]*|--delete)\s", reste)
        if merge_de_pr_vu and (supprime_distante or supprime_locale):
            refuser("pas de suppression de branche dans la même commande que `gh pr merge` : s'il échoue, supprimer la branche distante ferme la PR sans merge. Lire `MERGED` (`gh pr view <n> --json state -q .state`), puis supprimer dans une commande séparée.")

        # Un chemin invalide fait échouer TOUT le `git add` ; masquer l'erreur laisse
        # des fichiers modifiés dans le dépôt principal (incident du 2026-10-14).
        if verbe == "add" and re.search(r"(?:2|&)>>?\s*/dev/null", s):
            refuser("jamais de `2>/dev/null` sur `git add` : un seul chemin invalide fait échouer tout l'ajout, et l'erreur masquée laisse des fichiers en plan.")

        # `-n` = `--no-verify` pour commit : il saute lint-staged ET garde-main-a-jour.sh.
        if verbe == "commit" and re.search(r"\s(?:--no-verify|-[a-zA-Z]*n[a-zA-Z]*)\s", reste):
            refuser("`git commit --no-verify` (ou `-n`) saute le formatage et le garde-fou du main en retard ; le pre-commit dure ~2 s, il n'y a pas de raison de le contourner.")

        # Une seule lecture de la branche, et seulement pour les verbes qui en dépendent.
        ici_branche = branche(lieu) if verbe in ("pull", "merge", "add", "commit", "push") else ""

        # Rebaser une branche déjà poussée sur une AUTRE branche réécrit ses commits
        # publiés : seul un push --force passerait (#1603, 2026-10-22). Tirer sa propre
        # branche en rebase (sans refspec, la même, ou HEAD) ne réécrit que le local.
        # « Poussée » = le distant la connaît : pas l'upstream, que `git worktree add -b
        # x … origin/main` règle sur origin/main pour une branche jamais poussée.
        if (
            verbe == "pull"
            and ici_branche not in ("", "main", "HEAD")
            and "--no-rebase" not in reste
            and re.search(r"\s(?:--rebase(?:=\S+)?|-r)\s", reste)
            and any(a.split(":")[0] not in ("", "HEAD", ici_branche) for a in arguments[1:])
            and git_dans(lieu, "rev-parse", "-q", "--verify", f"refs/remotes/origin/{ici_branche}")
        ):
            refuser("branche déjà poussée : jamais `git pull --rebase` d'une autre branche dessus, il réécrit les commits publiés et seul un push --force passerait. Pour la remettre à jour : `git merge origin/main` (ou rien, GitHub merge quand même).")

        # Le main du dépôt principal est PARTAGÉ par toutes les sessions, son index
        # aussi (incident du 2026-10-13 : main divergé, deploy:prod bloqué).
        if verbe in ("pull", "merge", "add", "commit", "push") and ici_branche == "main":
            if verbe == "pull" and (
                "--no-rebase" in reste or not re.search(r"\s(?:--rebase(?:=\S+)?|-r|--ff-only)\s", reste)
            ):
                refuser("sur main, `git pull` doit être `git pull --rebase` (ou `--ff-only`) : un pull qui fusionne crée un commit de merge dans le main partagé par toutes les sessions. S'il échoue, s'arrêter et prévenir David.")
            # --continue / --abort concluent ou annulent un merge déjà commencé
            if verbe == "merge" and not re.search(r"\s(?:--ff-only|--abort|--continue|--quit)\s", reste):
                refuser("sur main, seul `git merge --ff-only` est permis : un merge crée un commit dans le main partagé par toutes les sessions.")
            # `-A` / `-u` limités à des chemins (`git add -A docs/x/`) restent permis
            tout_l_index = re.search(r"\s(?:-A|--all|-u|--update)\s", reste) and not arguments
            if verbe == "add" and (tout_l_index or any(a in (".", "./", ":/") for a in arguments)):
                refuser("sur main, l'index est partagé par toutes les sessions : `git add` nomme ses propres fichiers, jamais `-A`, `-u` ni `.` sans chemin.")
            if verbe == "commit" and re.search(r"\s(?:--all|-[a-zA-Z]*a[a-zA-Z]*)\s", reste):
                refuser("sur main, `git commit -a` emporterait les modifications des autres sessions : nommer ses fichiers (`git commit -- <fichiers>`).")
            # Sur main, un push sans refspec pousse main
            pousse_main = verbe == "push" and (len(arguments) <= 1 or re.search(r"[\s:](?:refs/heads/)?main\s", reste))
            if (verbe == "commit" or pousse_main) and deploiement_en_cours(lieu):
                refuser(DEPLOIEMENT)
        elif verbe == "push" and re.search(r"[\s:](?:refs/heads/)?main\s", reste) and deploiement_en_cours(lieu):
            refuser(DEPLOIEMENT)

    # `pnpm deploy:prod` n'est plus soumis à confirmation (décision de David,
    # 2026-10-10) : la règle « seulement sur sa demande explicite » reste dans
    # CLAUDE.md, la fenêtre de confirmation faisait doublon avec elle.

sys.exit(0)
