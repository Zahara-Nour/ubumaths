---
name: exporter-session
description: Exporter la conversation en cours en Markdown lisible dans docs/session-transcripts/ (messages de David et réponses de Claude, sans sorties de commandes ni rapports d'agents). Utiliser quand David tape /exporter-session, demande d'« exporter la session », de « garder la trace de la conversation » ou d'en faire une version md.
model: haiku
---

# Exporter la session en Markdown

`/export` de Claude Code ne sait produire que du texte brut. Cette skill relit la transcription de la session (`~/.claude/projects/<dossier>/<session>.jsonl`) et en écrit une version Markdown : les messages de David (y compris ceux envoyés pendant le travail) et les réponses de Claude. Elle laisse de côté les sorties de commandes, les rapports bruts des agents, les rappels système et le texte des skills.

## 1. Lancer la conversion

**L'identifiant de la session en cours** est le dernier dossier du chemin du scratchpad, donné dans le prompt système (`…/scratchpad` : le dossier juste avant, un UUID comme `39434a52-fe88-…`). Le passer en dernier argument. Ne jamais prendre « la transcription la plus récente » : une autre session qui tourne en parallèle dans le même dossier l'emporte (incident du 2026-10-22).

Une seule commande, depuis le dépôt (principal ou worktree) :

```bash
python3 -I - "$(git rev-parse --show-toplevel)" "$PWD" "<identifiant-de-session>" <<'EOF'
import json, os, re, sys, datetime
root, cwd, sid = sys.argv[1], sys.argv[2], sys.argv[3]
projets = os.path.expanduser("~/.claude/projects/" + re.sub(r"[/.]", "-", cwd))
src = os.path.join(projets, sid + ".jsonl")
if not os.path.isfile(src): sys.exit(f"Pas de transcription {src}")
titre, debut = None, None
for line in open(src, encoding="utf-8"):
    try: e = json.loads(line)
    except Exception: continue
    if e.get("type") == "custom-title" and e.get("customTitle"): titre = e["customTitle"]
    if debut is None and e.get("timestamp"): debut = e["timestamp"]
nom = titre or sid[:8]
# Horodatage = début de la session, heure locale : deux sessions du même nom le même jour ne se percutent plus
quand = datetime.datetime.fromisoformat(debut.replace("Z", "+00:00")).astimezone() if debut else datetime.datetime.now()
date = quand.strftime("%Y-%m-%d-%Hh%M")
dst_dir = os.path.join(root, "docs", "session-transcripts")
os.makedirs(dst_dir, exist_ok=True)
dst = os.path.join(dst_dir, f"{nom}-{date}.md")
marque = f"<!-- session: {sid} -->"
# Un fichier existant n'est remplacé que s'il vient de la MÊME session
if os.path.exists(dst) and marque not in open(dst, encoding="utf-8").read(400):
    sys.exit(f"⛔ {dst} existe et vient d'une autre session : rien écrit")

def clean(t):
    t = re.sub(r"<system-reminder>.*?</system-reminder>", "", t, flags=re.S)
    t = re.sub(r"<(command-name|command-message|command-args|local-command-stdout|local-command-caveat)>.*?</\1>", "", t, flags=re.S)
    return t.strip()
BRUIT = ("Base directory for this skill", "[Subagent hand-back]", "Another Claude session", "The user sent a new message")
def bruit(t): return t.startswith(BRUIT) or "<agent-message" in t or "<task-notification>" in t
out = [f"# Session {nom} — {quand.strftime('%Y-%m-%d %H:%M')}\n", marque + "\n"]
def add(qui, t):
    if len(out) >= 2 and out[-2] == qui + "\n": out.append(t + "\n")
    else: out.extend([qui + "\n", t + "\n"])
for line in open(src, encoding="utf-8"):
    try: e = json.loads(line)
    except Exception: continue
    if e.get("type") == "queue-operation" and e.get("operation") == "enqueue" and isinstance(e.get("content"), str):
        t = clean(e["content"])
        if t and not bruit(t): add("## 🧑 David (pendant le travail)", t)
        continue
    if e.get("type") not in ("user", "assistant") or e.get("isSidechain"): continue
    c = (e.get("message") or {}).get("content")
    if isinstance(c, str): textes = [c]
    elif isinstance(c, list): textes = [b.get("text", "") for b in c if isinstance(b, dict) and b.get("type") == "text"]
    else: textes = []
    t = clean("\n\n".join(textes))
    if t and not bruit(t): add("## 🧑 David" if e["type"] == "user" else "## 🤖 Claude", t)
open(dst, "w", encoding="utf-8").write(re.sub(r"\n{3,}", "\n\n", "\n".join(out)))
print(dst, "—", sum(1 for l in out if l.startswith("## 🧑")), "messages de David")
EOF
```

- Le nom du fichier vient du nom de la session (`/rename`), sinon des 8 premiers caractères de son identifiant, suivi de la date et de l'heure locales du **début** de la session : `simplify-carte-2026-10-22-14h36.md`. Après un `/clear`, la nouvelle session a sa propre heure : l'export de la précédente n'est pas touché.
- Réexporter la même session **remplace** son fichier : c'est voulu, l'export suit la conversation. Le fichier porte l'identifiant de sa session (`<!-- session: … -->`) ; un fichier d'une autre session n'est jamais écrasé.
- Le dernier argument est l'identifiant de la session en cours (chemin du scratchpad), jamais deviné par la date de modification.

## 2. Rendre compte

Donner à David le chemin complet du fichier et le nombre de messages. **Rien à commiter** : `docs/session-transcripts/` est dans le `.gitignore` (dépôt public, décision de David du 2026-10-22). Les transcriptions restent sur la machine.
