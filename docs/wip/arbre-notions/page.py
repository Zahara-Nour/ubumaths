import html
E=html.escape
# (branche, couleur, [(notion, niveaux, reprend)])
B=[]
W=880; ROW=58; BW=190; NX=290; NW=W-NX-8
def svg(name,cls,notions):
    H=len(notions)*ROW+12
    cy=H/2
    out=[f'<svg viewBox="0 0 {W} {H}" width="{W}" height="{H}" role="img" aria-label="Branche {E(name)} : {len(notions)} notions" class="{cls}">']
    out.append(f'<rect x="4" y="{cy-30:.0f}" width="{BW}" height="60" rx="10" class="bnode"/>')
    # wrap branch name
    words=name.split(); lines=[];cur=""
    for w in words:
        if len(cur+" "+w)>18 and cur: lines.append(cur);cur=w
        else: cur=(cur+" "+w).strip()
    lines.append(cur)
    for i,l in enumerate(lines):
        y=cy+6-(len(lines)-1)*10+i*20
        out.append(f'<text x="{4+BW/2}" y="{y:.0f}" class="btext" text-anchor="middle">{E(l)}</text>')
    for i,(n,niv,rep) in enumerate(notions):
        y=6+i*ROW; ny=y+ROW/2-3
        out.append(f'<path d="M{4+BW} {cy:.0f} C {4+BW+50} {cy:.0f}, {NX-50} {ny:.0f}, {NX} {ny:.0f}" class="link"/>')
        out.append(f'<rect x="{NX}" y="{y}" width="{NW}" height="{ROW-10}" rx="7" class="nnode"/>')
        out.append(f'<rect x="{NX}" y="{y}" width="5" height="{ROW-10}" rx="2" class="nbar"/>')
        out.append(f'<text x="{NX+61}" y="{y+20}" class="ntext">{E(n)}<tspan class="niv" dx="10">{E(niv)}</tspan></text>')
        out.append(f'<text x="{NX+61}" y="{y+38}" class="rtext">reprend : {E(rep)}</text>')
    out.append('</svg>')
    return '\n'.join(out)
total=sum(len(b[2]) for b in B)+114
sections=[open('./nc-section.html').read()]
for name,cls,notions in B:
    sections.append(f'<section class="branch"><h2><span class="dot {cls}"></span>{E(name)} <small>{len(notions)} notions</small></h2><div class="scroll">{svg(name,cls,notions)}</div></section>')
tpl=open('./tpl.html').read()
open('./arbre-notions.html','w').write(tpl.replace('%%SECTIONS%%','\n'.join(sections)).replace('%%NB%%',str(len(B)+19)).replace('%%NN%%',str(total)))
print(len(B),total)
