"""Generates every original SVG sprite and WAV cue in public/assets. Run from the project root: python3 scripts/assets.py"""
from pathlib import Path
import math, random, struct, wave

out = Path('public/assets'); out.mkdir(exist_ok=True)
INK = '#2c3a33'

def svg(name, body, defs='', w=80, h=80):
    (out / f'{name}.svg').write_text(f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}"><defs>{defs}</defs>{body}</svg>')

def rg(id, light, base, dark, cx='35%', cy='30%'):
    return f'<radialGradient id="{id}" cx="{cx}" cy="{cy}" r="75%"><stop offset="0" stop-color="{light}"/><stop offset=".55" stop-color="{base}"/><stop offset="1" stop-color="{dark}"/></radialGradient>'

def lg(id, top, bottom, x2=0, y2=1):
    return f'<linearGradient id="{id}" x1="0" y1="0" x2="{x2}" y2="{y2}"><stop offset="0" stop-color="{top}"/><stop offset="1" stop-color="{bottom}"/></linearGradient>'

def eyes(lx, rx, y, r=6.5, angry=True, look=1.5, ink=INK):
    s = ''
    for x in (lx, rx):
        s += f'<ellipse cx="{x}" cy="{y}" rx="{r}" ry="{r*1.15}" fill="#fffdf4" stroke="{ink}" stroke-width="1.6"/><circle cx="{x+look}" cy="{y+1}" r="{r*.52}" fill="{ink}"/><circle cx="{x+look-1.3}" cy="{y-.6}" r="{r*.2}" fill="#fff"/>'
    if angry:
        s += f'<path d="M{lx-r-1} {y-r-4} L{lx+r} {y-r+1}" stroke="{ink}" stroke-width="3.2" stroke-linecap="round"/><path d="M{rx+r+1} {y-r-4} L{rx-r} {y-r+1}" stroke="{ink}" stroke-width="3.2" stroke-linecap="round"/>'
    return s

def shine(x, y, w=9, h=5, rot=-30, o=.55):
    return f'<ellipse cx="{x}" cy="{y}" rx="{w}" ry="{h}" fill="#fff" opacity="{o}" transform="rotate({rot} {x} {y})"/>'

shadow = f'<ellipse cx="40" cy="71" rx="25" ry="6" fill="#1d2b22" opacity=".22"/>'

# ---------------------------------------------------------------- tower bases (shared, one per level)
base_defs = rg('pot', '#f7b98a', '#d97f4f', '#9c4f2c') + lg('stone', '#e9e4d8', '#9c9a8f') + lg('gold', '#fff1a8', '#d39b2a') + lg('marble', '#ffffff', '#cfd5e6')
bases = [
    # terracotta planter
    shadow + '<path d="M17 50 H63 L58 70 Q40 75 22 70 Z" fill="url(#pot)" stroke="#5e3420" stroke-width="2.5"/><rect x="14" y="44" width="52" height="10" rx="5" fill="#e69766" stroke="#5e3420" stroke-width="2.5"/><path d="M19 47 H40" stroke="#ffd2b0" stroke-width="2.5" stroke-linecap="round" opacity=".8"/>',
    # mossy stone pedestal
    shadow + '<path d="M13 52 L18 70 Q40 76 62 70 L67 52 Z" fill="url(#stone)" stroke="#4a4b44" stroke-width="2.5"/><path d="M22 58h10m6 6h12m4-8h8" stroke="#7d7b70" stroke-width="2" stroke-linecap="round"/><ellipse cx="40" cy="50" rx="28" ry="8" fill="#d8d3c4" stroke="#4a4b44" stroke-width="2.5"/><path d="M14 52 Q20 58 27 53 Q33 59 40 54" fill="none" stroke="#6aa84f" stroke-width="4" stroke-linecap="round"/><circle cx="58" cy="55" r="2.5" fill="#6aa84f"/>',
    # marble & gold pedestal with gems
    shadow + '<path d="M11 52 L17 70 Q40 77 63 70 L69 52 Z" fill="url(#marble)" stroke="#3d4560" stroke-width="2.5"/><path d="M15 62 Q40 70 65 62" fill="none" stroke="url(#gold)" stroke-width="4"/><ellipse cx="40" cy="50" rx="30" ry="8.5" fill="url(#gold)" stroke="#7a5512" stroke-width="2.5"/><circle cx="24" cy="63" r="3.2" fill="#ef5f7c" stroke="#5a2232" stroke-width="1.2"/><circle cx="40" cy="67" r="3.6" fill="#57c5e8" stroke="#1f4b5a" stroke-width="1.2"/><circle cx="56" cy="63" r="3.2" fill="#8ee05a" stroke="#2c5a1a" stroke-width="1.2"/>',
]
for i, b in enumerate(bases):
    svg(f'base-{i}', b, base_defs)

# ---------------------------------------------------------------- tower heads (aimed to the right, pivot at 40,40)
crowns = [
    '',
    '<path d="M27 19 Q31 9 38 15 Q42 6 47 15 Q53 9 55 19" fill="#7ccf5a" stroke="#2f5a26" stroke-width="2"/>',
    '<path d="M26 20 L28 7 L34 14 L40 4 L46 14 L52 7 L54 20 Z" fill="url(#gold)" stroke="#7a5512" stroke-width="2"/><circle cx="40" cy="12" r="2.4" fill="#ef5f7c"/>',
]

def pea_head(lv):
    d = rg('pea', '#d9ff9c', '#7cc84a', '#3c7d27') + lg('gold', '#fff1a8', '#d39b2a') + lg('barrel', '#a5e06e', '#4f8f30')
    barrels = [(40, 0)] if lv < 2 else [(40, -6), (40, 6)]
    b = ''
    for _, off in barrels:
        L = 24 + lv * 2
        b += f'<rect x="44" y="{34+off}" width="{L}" height="12" rx="5" fill="url(#barrel)" stroke="{INK}" stroke-width="2.5"/><ellipse cx="{44+L}" cy="{40+off}" rx="4.5" ry="7.5" fill="#3b6b26" stroke="{INK}" stroke-width="2.5"/><ellipse cx="{44+L}" cy="{40+off}" rx="2" ry="4" fill="#1b2e14"/>'
    leaves = '' if lv == 0 else '<path d="M22 54 Q10 60 8 50 Q18 46 24 52Z" fill="#5fae3e" stroke="#2f5a26" stroke-width="2"/>'
    band = '<path d="M47 33 v14" stroke="url(#gold)" stroke-width="4"/>' if lv == 2 else ''
    body = b + band + leaves + f'<circle cx="38" cy="40" r="{19+lv}" fill="url(#pea)" stroke="{INK}" stroke-width="3"/>' + shine(30, 30) + eyes(33, 45, 38, 5.5, True, 2) + f'<path d="M33 50 Q39 53 45 49" fill="none" stroke="{INK}" stroke-width="2.5" stroke-linecap="round"/>' + crowns[lv]
    svg(f'pea-head-{lv}', body, d)

def berry_head(lv):
    d = rg('berry', '#ffc4d4', '#e8577e', '#9b2346') + lg('gold', '#fff1a8', '#d39b2a') + lg('tube', '#ff9fb8', '#b83a5f')
    r = 20 + lv * 1.5
    seeds = ''.join(f'<ellipse cx="{40+math.cos(a)*r*.6:.1f}" cy="{42+math.sin(a)*r*.6:.1f}" rx="1.6" ry="2.4" fill="#ffe9a8" opacity=".9"/>' for a in [0.3, 1.2, 2.2, 3.4, 4.3, 5.4])
    tube = f'<g transform="rotate(-25 46 36)"><rect x="46" y="28" width="{24+lv*2}" height="15" rx="6" fill="url(#tube)" stroke="{INK}" stroke-width="2.5"/><rect x="{64+lv*2}" y="25" width="9" height="21" rx="4" fill="#c13d63" stroke="{INK}" stroke-width="2.5"/></g>'
    leaf = '<path d="M30 22 Q36 10 44 20 Q52 12 54 24 Q42 28 30 22Z" fill="#5fae3e" stroke="#2f5a26" stroke-width="2"/>'
    body = tube + f'<circle cx="38" cy="43" r="{r}" fill="url(#berry)" stroke="{INK}" stroke-width="3"/>' + seeds + leaf + shine(29, 33) + eyes(32, 45, 42, 5.5, True, 2) + f'<path d="M34 53 Q39 50 45 53" fill="none" stroke="{INK}" stroke-width="2.5" stroke-linecap="round"/>' + crowns[lv]
    svg(f'berry-head-{lv}', body, d)

def frost_head(lv):
    d = lg('ice', '#f4ffff', '#6fd3e6') + lg('ice2', '#c9f6ff', '#3aa6c9') + lg('gold', '#fff1a8', '#d39b2a')
    h = 30 + lv * 5
    shards = ''
    if lv >= 1:
        shards += f'<path d="M22 50 L12 {34-lv*3} L28 42Z" fill="url(#ice2)" stroke="{INK}" stroke-width="2"/><path d="M58 50 L68 {34-lv*3} L52 42Z" fill="url(#ice2)" stroke="{INK}" stroke-width="2"/>'
    if lv == 2:
        shards += '<path d="M30 58 L20 70 L36 62Z M50 58 L60 70 L44 62Z" fill="url(#ice2)" stroke="#2c3a33" stroke-width="2"/>'
    body = shards + f'<path d="M24 58 Q40 66 56 58 L46 {58-h} Q40 {50-h} 34 {58-h} Z" fill="url(#ice)" stroke="{INK}" stroke-width="3" stroke-linejoin="round"/>' + f'<path d="M33 {54-h*.6} L37 {60-h}" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".8"/>' + eyes(34, 46, 46, 5, False, 1) + '<path d="M36 55 Q40 58 44 55" fill="none" stroke="#2c3a33" stroke-width="2.2" stroke-linecap="round"/><path d="M27 51 h4 M49 51 h4" stroke="#ff9fb8" stroke-width="3" stroke-linecap="round" opacity=".7"/>'
    if lv == 2:
        body += f'<circle cx="40" cy="{54-h}" r="5" fill="#fff" stroke="{INK}" stroke-width="2"/><path d="M40 {44-h} v20 M30 {54-h} h20" stroke="#bff6ff" stroke-width="2"/>'
    svg(f'frost-head-{lv}', body, d)

def zap_head(lv):
    d = rg('core', '#fff7c2', '#ffd84a', '#d58a12') + rg('petal', '#f4e6ff', '#b07cff', '#6532c2', '50%', '50%')
    n = 7 + lv * 2
    petals = ''.join(f'<ellipse cx="40" cy="{40-17-lv}" rx="7" ry="{12+lv}" fill="url(#petal)" stroke="{INK}" stroke-width="2" transform="rotate({i*360/n:.1f} 40 40)"/>' for i in range(n))
    ring = f'<circle cx="40" cy="40" r="{33+lv}" fill="none" stroke="#c9a6ff" stroke-width="2" stroke-dasharray="4 6" opacity=".9"/>' if lv == 2 else ''
    bolt = '<path d="M41 27 L33 42 H40 L36 54 L48 36 H41 Z" fill="#fff" stroke="#2c3a33" stroke-width="1.6" opacity=".95"/>'
    body = ring + petals + f'<circle cx="40" cy="40" r="{14+lv}" fill="url(#core)" stroke="{INK}" stroke-width="3"/>' + bolt + eyes(33, 48, 40, 4, True, 1)
    svg(f'zap-head-{lv}', body, d)

def sun_head(lv):
    d = rg('disc', '#9a6a3a', '#6b3f1d', '#3d2210') + lg('petalg', '#fff6b0', '#ffb81c') + rg('lens', '#ffffff', '#9ff3ff', '#2f8fb8')
    n = 12 + lv * 2
    petals = ''.join(f'<path d="M40 40 L{40-6} {40-18} Q40 {40-32-lv*3} {40+6} {40-18} Z" fill="url(#petalg)" stroke="{INK}" stroke-width="1.8" transform="rotate({i*360/n:.1f} 40 40)"/>' for i in range(n))
    scope = f'<rect x="50" y="35" width="{18+lv*2}" height="10" rx="4" fill="#ffcf3f" stroke="{INK}" stroke-width="2.4"/><circle cx="{68+lv*2}" cy="40" r="6.5" fill="url(#lens)" stroke="{INK}" stroke-width="2.4"/>'
    seeds = ''.join(f'<circle cx="{40+math.cos(a)*7:.1f}" cy="{40+math.sin(a)*7:.1f}" r="1.3" fill="#d9a35c"/>' for a in [i * .9 for i in range(7)])
    body = petals + scope + f'<circle cx="40" cy="40" r="{15+lv}" fill="url(#disc)" stroke="{INK}" stroke-width="3"/>' + seeds + f'<circle cx="35" cy="37" r="4" fill="#fffdf4" stroke="{INK}" stroke-width="1.5"/><circle cx="36" cy="37.5" r="2" fill="{INK}"/><circle cx="46" cy="37" r="4.5" fill="url(#lens)" stroke="{INK}" stroke-width="1.8"/><path d="M34 46 Q40 49 46 45" fill="none" stroke="#ffe7a0" stroke-width="2" stroke-linecap="round"/>'
    if lv == 2:
        body += '<path d="M28 23 L31 15 L36 21 L40 13 L44 21 L49 15 L52 23Z" fill="#fff1a8" stroke="#7a5512" stroke-width="1.8"/>'
    svg(f'sun-head-{lv}', body, d)

for lv in range(3):
    pea_head(lv); berry_head(lv); frost_head(lv); zap_head(lv); sun_head(lv)

# Composite card portraits (base + level 0 head) for the DOM arsenal.
def composite(kind, lv=0):
    head = (out / f'{kind}-head-{lv}.svg').read_text()
    base = (out / f'base-{lv}.svg').read_text()
    strip = lambda s: s.split('>', 1)[1].rsplit('</svg>', 1)[0]
    svg(kind, f'<g>{strip(base)}</g><g transform="translate(0 -15)">{strip(head)}</g>')
for k in ['pea', 'berry', 'frost', 'zap', 'sun']:
    composite(k)

# ---------------------------------------------------------------- enemies (face right)
feet = lambda c='#2c3a33', y=66: f'<ellipse cx="29" cy="{y}" rx="9" ry="5" fill="{c}"/><ellipse cx="51" cy="{y}" rx="9" ry="5" fill="{c}"/>'
mouth_grr = f'<path d="M35 52 Q42 47 50 52" fill="none" stroke="{INK}" stroke-width="3" stroke-linecap="round"/>'
mouth_teeth = f'<path d="M33 50 H51 Q47 58 42 58 Q36 58 33 50Z" fill="#5a1f2b" stroke="{INK}" stroke-width="2.4" stroke-linejoin="round"/><path d="M36 50 l2.5 3.5 l2.5 -3.5 l2.5 3.5 l2.5 -3.5 l2.5 3.5 l2 -3.5" fill="#fff" stroke="none"/>'

def enemy(name, defs, body, w=80, h=80):
    svg(name, body, defs, w, h)

enemy('wobbler', rg('b', '#ffd2b0', '#f08a54', '#b8502a'),
      shadow + feet() + f'<path d="M14 60 Q6 20 34 14 Q70 8 68 48 L67 61 Q40 72 14 60Z" fill="url(#b)" stroke="{INK}" stroke-width="3"/><path d="M38 14 Q36 4 44 3" fill="none" stroke="{INK}" stroke-width="2.5"/><circle cx="45" cy="3.5" r="3.5" fill="#ffd25e" stroke="{INK}" stroke-width="2"/>' + shine(26, 25) + eyes(32, 50, 35, 6.5) + mouth_grr)
enemy('dasher', rg('b', '#fff6b8', '#f2cf3d', '#b88d10') + lg('shoe', '#ff7a7a', '#c73b3b'),
      shadow + '<path d="M4 34 H18 M2 44 H14 M6 54 H16" stroke="#e9c534" stroke-width="3" stroke-linecap="round" opacity=".8"/>' + '<path d="M18 62 Q22 54 34 58 L36 66 H20Z M44 62 Q48 54 60 58 L62 66 H46Z" fill="url(#shoe)" stroke="#2c3a33" stroke-width="2.2"/>' + f'<path d="M16 58 Q14 30 36 12 Q58 6 66 26 Q72 44 62 60 Q40 68 16 58Z" fill="url(#b)" stroke="{INK}" stroke-width="3"/><path d="M30 18 L48 10" stroke="#ff7a7a" stroke-width="6" stroke-linecap="round"/>' + shine(30, 26, 8, 4) + eyes(38, 54, 34, 6, True, 2.5) + f'<path d="M40 49 Q48 53 56 47" fill="none" stroke="{INK}" stroke-width="3" stroke-linecap="round"/>')
enemy('chunky', rg('b', '#e3d1ff', '#9d7ccc', '#5d3f8c') + lg('plate', '#d2d6e0', '#7d8394'),
      shadow + feet('#2c3a33', 67) + f'<rect x="10" y="14" width="60" height="52" rx="16" fill="url(#b)" stroke="{INK}" stroke-width="3"/><path d="M14 30 Q40 20 66 30 V22 Q40 10 14 22Z" fill="url(#plate)" stroke="{INK}" stroke-width="2.5"/><circle cx="22" cy="24" r="2" fill="#4a4f5c"/><circle cx="58" cy="24" r="2" fill="#4a4f5c"/><path d="M18 50 l6 -4 M60 54 l4 -6" stroke="#5d3f8c" stroke-width="3" stroke-linecap="round"/>' + eyes(30, 50, 40, 6.5) + mouth_teeth)
enemy('bubble', rg('b', '#c8fff6', '#4fd1c1', '#1f8c86'),
      shadow + feet('#2c3a33', 66) + f'<ellipse cx="40" cy="46" rx="22" ry="20" fill="url(#b)" stroke="{INK}" stroke-width="3"/><path d="M26 32 Q22 22 28 20 M54 32 Q58 22 52 20" fill="none" stroke="{INK}" stroke-width="2.5" stroke-linecap="round"/><circle cx="28" cy="19" r="3" fill="#ff9fd0" stroke="{INK}" stroke-width="1.6"/><circle cx="52" cy="19" r="3" fill="#ff9fd0" stroke="{INK}" stroke-width="1.6"/>' + shine(31, 36, 6, 3.5) + eyes(33, 48, 44, 5.5) + f'<circle cx="41" cy="56" r="3.5" fill="#5a1f2b" stroke="{INK}" stroke-width="2"/>')
enemy('mender', rg('b', '#ffe3b8', '#d9a066', '#9b6532') + rg('top', '#ffd8ec', '#ff8fc0', '#c94f8a'),
      shadow + feet() + f'<path d="M16 42 H64 L58 66 Q40 72 22 66Z" fill="url(#b)" stroke="{INK}" stroke-width="3"/><path d="M24 46 V64 M32 46 V67 M40 46 V68 M48 46 V67 M56 46 V64" stroke="#a87038" stroke-width="2" opacity=".6"/><path d="M12 44 Q8 22 28 18 Q40 6 52 18 Q72 22 68 44 Q40 50 12 44Z" fill="url(#top)" stroke="{INK}" stroke-width="3"/><rect x="31" y="6" width="18" height="12" rx="3" fill="#fff" stroke="{INK}" stroke-width="2"/><path d="M40 8 V16 M36 12 H44" stroke="#ef4f6c" stroke-width="3"/><circle cx="24" cy="32" r="2" fill="#fff"/><circle cx="56" cy="30" r="2" fill="#7fe0ff"/><circle cx="46" cy="24" r="2" fill="#fff4a0"/>' + eyes(31, 49, 54, 5, False, 1.5) + f'<path d="M35 63 Q40 60 45 63" fill="none" stroke="{INK}" stroke-width="2.4" stroke-linecap="round"/>')
enemy('splitter', rg('b', '#e6ffd2', '#8be067', '#3f9a34'),
      shadow + feet('#2c3a33', 67) + f'<path d="M12 60 Q4 30 24 18 Q40 8 56 18 Q76 30 68 60 Q40 72 12 60Z" fill="url(#b)" stroke="{INK}" stroke-width="3" opacity=".96"/><path d="M40 12 L36 26 L44 34 L38 46" fill="none" stroke="#3f9a34" stroke-width="2.4" stroke-linecap="round"/><circle cx="24" cy="48" r="4" fill="#c9f7b0" opacity=".8"/><circle cx="58" cy="44" r="3" fill="#c9f7b0" opacity=".8"/>' + shine(24, 26) + eyes(27, 53, 36, 5.5) + f'<ellipse cx="40" cy="31" rx="4.5" ry="5" fill="#fffdf4" stroke="{INK}" stroke-width="1.6"/><circle cx="41" cy="32" r="2.4" fill="{INK}"/>' + mouth_teeth.replace('50', '52', 1))
enemy('jellet', rg('b', '#e6ffd2', '#8be067', '#3f9a34'),
      '<ellipse cx="40" cy="70" rx="20" ry="5" fill="#1d2b22" opacity=".22"/>' + f'<path d="M16 64 Q12 30 40 24 Q68 30 64 64 Q40 72 16 64Z" fill="url(#b)" stroke="{INK}" stroke-width="3.5"/>' + shine(28, 36, 7, 4) + eyes(32, 50, 46, 6.5) + f'<path d="M35 59 Q41 55 47 59" fill="none" stroke="{INK}" stroke-width="3" stroke-linecap="round"/>')

# Bosses (96x96 canvas so crowns and capes fit)
bshadow = '<ellipse cx="48" cy="88" rx="32" ry="7" fill="#1d2b22" opacity=".25"/>'
bfeet = '<ellipse cx="34" cy="83" rx="11" ry="6" fill="#2c3a33"/><ellipse cx="62" cy="83" rx="11" ry="6" fill="#2c3a33"/>'
def beyes(y=46, r=8):
    return eyes(36, 60, y, r, True, 2.5)
enemy('captain', rg('b', '#ffc0c0', '#e0606a', '#9c2a37') + lg('gold', '#fff1a8', '#d39b2a'),
      bshadow + bfeet + f'<path d="M14 76 Q4 30 40 22 Q86 16 84 60 L82 78 Q48 92 14 76Z" fill="url(#b)" stroke="{INK}" stroke-width="3.5"/><path d="M18 30 Q48 4 80 26 L74 34 Q48 20 24 38Z" fill="#2c3a33"/><path d="M42 14 Q48 6 54 14 L50 24 H46Z" fill="#fff" stroke="{INK}" stroke-width="2"/><circle cx="48" cy="17" r="2.6" fill="#2c3a33"/><path d="M20 34 Q48 22 78 32" fill="none" stroke="url(#gold)" stroke-width="4"/>' + shine(28, 44, 9, 5) + beyes() + f'<path d="M38 66 H62 Q56 76 50 76 Q42 76 38 66Z" fill="#5a1f2b" stroke="{INK}" stroke-width="2.6"/><path d="M40 66 l3 4 l3 -4 l3 4 l3 -4 l3 4 l3 -4" fill="#fff"/><path d="M60 54 Q72 50 74 58" fill="none" stroke="{INK}" stroke-width="2"/>', 96, 96)
enemy('baron', rg('b', '#f3f6fb', '#a8b1c2', '#5b6577') + lg('gold', '#fff1a8', '#d39b2a') + rg('face', '#ffd2b0', '#e89a6a', '#b25c34'),
      bshadow + bfeet + f'<path d="M12 78 Q6 34 48 24 Q90 34 84 78 Q48 92 12 78Z" fill="url(#b)" stroke="{INK}" stroke-width="3.5"/><path d="M18 46 Q48 30 78 46 L76 60 Q48 50 20 60Z" fill="url(#face)" stroke="{INK}" stroke-width="2.6"/><path d="M48 8 Q60 10 58 26 H38 Q36 10 48 8Z" fill="#e8576a" stroke="{INK}" stroke-width="2.6"/><path d="M14 64 Q48 54 82 64" stroke="url(#gold)" stroke-width="5" fill="none"/><circle cx="24" cy="72" r="3" fill="#6d7586"/><circle cx="72" cy="72" r="3" fill="#6d7586"/><path d="M48 60 V86" stroke="#6d7586" stroke-width="2.4"/>' + shine(28, 36, 9, 4) + eyes(37, 59, 50, 6.5, True, 2.5) + '<path d="M40 58 h16" stroke="#2c3a33" stroke-width="3" stroke-linecap="round"/>', 96, 96)
enemy('duchess', rg('b', '#f2d6ff', '#b46ae0', '#6a2b94') + lg('wing', '#e9fbff', '#9fd8f0') + lg('gold', '#fff1a8', '#d39b2a'),
      bshadow + '<path d="M30 40 Q2 10 8 50 Q16 62 34 52Z M66 40 Q94 10 88 50 Q80 62 62 52Z" fill="url(#wing)" stroke="#2c3a33" stroke-width="2.4" opacity=".92"/>' + bfeet + f'<path d="M20 78 Q10 40 48 30 Q86 40 76 78 Q48 92 20 78Z" fill="url(#b)" stroke="{INK}" stroke-width="3.5"/><path d="M26 70 Q48 62 70 70 M28 80 Q48 72 68 80" stroke="#6a2b94" stroke-width="3" fill="none" opacity=".6"/><path d="M30 30 L32 14 L40 22 L48 8 L56 22 L64 14 L66 30Z" fill="url(#gold)" stroke="#7a5512" stroke-width="2.4"/><circle cx="48" cy="18" r="3" fill="#57c5e8"/><path d="M38 30 Q34 20 28 22 M58 30 Q62 20 68 22" fill="none" stroke="{INK}" stroke-width="2"/>' + shine(32, 46, 8, 4) + beyes(52, 7.5) + f'<path d="M40 68 Q48 63 56 68" fill="none" stroke="{INK}" stroke-width="3" stroke-linecap="round"/><path d="M33 61 h5 M58 61 h5" stroke="#ff8fc0" stroke-width="3" stroke-linecap="round"/>', 96, 96)
enemy('king', rg('b', '#ff9a8a', '#c83a3a', '#6e1420') + lg('gold', '#fff1a8', '#d39b2a') + lg('cape', '#5b2a86', '#2b1240'),
      bshadow + '<path d="M10 40 Q4 80 20 86 H76 Q92 80 86 40Z" fill="url(#cape)" stroke="#2c3a33" stroke-width="3"/>' + bfeet + f'<path d="M14 78 Q6 36 48 28 Q90 36 82 78 Q48 92 14 78Z" fill="url(#b)" stroke="{INK}" stroke-width="3.5"/><path d="M22 32 L20 6 L32 18 L40 2 L48 16 L56 2 L64 18 L76 6 L74 32 Q48 24 22 32Z" fill="url(#gold)" stroke="#7a5512" stroke-width="2.6"/><circle cx="34" cy="22" r="3" fill="#ef5f7c"/><circle cx="48" cy="18" r="3.6" fill="#57c5e8"/><circle cx="62" cy="22" r="3" fill="#8ee05a"/><path d="M30 72 Q48 64 66 72" fill="none" stroke="#6e1420" stroke-width="2" opacity=".6"/>' + shine(28, 46, 9, 5) + eyes(36, 60, 50, 8.5, True, 2.5) + f'<path d="M34 64 H62 Q58 78 48 78 Q38 78 34 64Z" fill="#3a0f17" stroke="{INK}" stroke-width="2.6"/><path d="M36 64 l3.5 5 l3.5 -5 l3.5 5 l3.5 -5 l3.5 5 l3.5 -5 l3.5 5" fill="#fff"/><path d="M26 42 l8 4 M70 42 l-8 4" stroke="#ffd25e" stroke-width="2" opacity=".7"/>', 96, 96)

# ---------------------------------------------------------------- projectiles
svg('shot-pea', f'<circle cx="40" cy="40" r="24" fill="url(#s)" stroke="{INK}" stroke-width="5"/>' + shine(32, 31, 8, 5, -30, .8), rg('s', '#f4ffd6', '#8ddb55', '#3c7d27'))
svg('shot-berry', f'<circle cx="40" cy="44" r="24" fill="url(#s)" stroke="{INK}" stroke-width="5"/><path d="M40 20 Q44 8 54 8" fill="none" stroke="#7a5512" stroke-width="5"/><circle cx="56" cy="8" r="6" fill="#ffd25e"/>' + shine(31, 35, 8, 5, -30, .8), rg('s', '#ffd0dd', '#ea5f86', '#9b2346'))
svg('shot-frost', f'<path d="M40 8 L56 40 L40 72 L24 40Z" fill="url(#s)" stroke="{INK}" stroke-width="4" stroke-linejoin="round"/><path d="M36 20 L32 38" stroke="#fff" stroke-width="5" stroke-linecap="round"/>', lg('s', '#ffffff', '#5ccbe0'))
svg('shot-sun', '<ellipse cx="40" cy="40" rx="38" ry="12" fill="url(#s)"/><ellipse cx="44" cy="40" rx="20" ry="6" fill="#fff"/>', rg('s', '#ffffff', '#ffe066', '#ff9a1f', '60%', '50%').replace('stop-color="#ff9a1f"', 'stop-color="#ff9a1f" stop-opacity="0"'))
svg('shot-zap', '<circle cx="40" cy="40" r="20" fill="#fff"/>')

# ---------------------------------------------------------------- UI icons
svg('icon-bomb', f'<circle cx="38" cy="46" r="24" fill="url(#s)" stroke="{INK}" stroke-width="4"/><path d="M50 26 Q56 12 66 14" fill="none" stroke="#7a5512" stroke-width="5" stroke-linecap="round"/><path d="M66 6 l2 6 l6 -2 l-4 5 l5 4 l-6 0 l-1 6 l-3 -5 l-5 3 l2 -6 l-6 -2 l6 -1z" fill="#ffd25e" stroke="#c76b12" stroke-width="1.5"/>' + shine(29, 37, 8, 5, -30, .7), rg('s', '#ffd0ec', '#f05fa8', '#8b1f5b'))
svg('icon-chill', f'<g stroke="{INK}" stroke-width="4" stroke-linecap="round"><path d="M40 8 V72 M12 24 L68 56 M12 56 L68 24"/></g><g stroke="#bff6ff" stroke-width="7" stroke-linecap="round"><path d="M40 12 V68 M15 26 L65 54 M15 54 L65 26"/></g><circle cx="40" cy="40" r="10" fill="#fff" stroke="{INK}" stroke-width="3"/>')
svg('coin', f'<circle cx="40" cy="40" r="30" fill="url(#s)" stroke="#7a5512" stroke-width="5"/><circle cx="40" cy="40" r="19" fill="none" stroke="#b37d17" stroke-width="3"/><path d="M40 28 L43 36 L52 36 L45 42 L48 51 L40 46 L32 51 L35 42 L28 36 L37 36Z" fill="#fff6c4"/>', rg('s', '#fff8c9', '#ffcf3f', '#d39b2a'))

# ---------------------------------------------------------------- audio
RATE = 22050
rnd = random.Random(7)

def write(name, samples):
    peak = max(1e-6, max(abs(v) for v in samples))
    gain = min(1.0, .9 / peak)
    with wave.open(str(out / f'{name}.wav'), 'w') as w:
        w.setparams((1, 2, RATE, 0, 'NONE', 'not compressed'))
        w.writeframes(b''.join(struct.pack('<h', int(max(-1, min(1, v * gain)) * 32767)) for v in samples))

def tone(f0, f1, dur, wave_='sine', vol=.5, attack=.005, curve=2.0, vibrato=0):
    n = int(dur * RATE); out_ = []; ph = 0
    for i in range(n):
        t = i / RATE; f = f0 + (f1 - f0) * (t / dur)
        f *= 1 + vibrato * math.sin(2 * math.pi * 6 * t)
        ph += 2 * math.pi * f / RATE
        if wave_ == 'sine': v = math.sin(ph)
        elif wave_ == 'square': v = 1 if math.sin(ph) > 0 else -1
        elif wave_ == 'saw': v = (ph / math.pi) % 2 - 1
        else: v = 2 / math.pi * math.asin(math.sin(ph))
        env = min(1, t / attack) * (1 - t / dur) ** curve
        out_.append(v * env * vol)
    return out_

def noise(dur, vol=.5, curve=3.0, smooth=0.0):
    n = int(dur * RATE); out_ = []; last = 0
    for i in range(n):
        t = i / RATE; v = rnd.uniform(-1, 1); last = last * smooth + v * (1 - smooth)
        out_.append(last * vol * (1 - t / dur) ** curve)
    return out_

def mix(*tracks, offsets=None):
    offsets = offsets or [0] * len(tracks)
    n = max(int(o * RATE) + len(t) for t, o in zip(tracks, offsets))
    res = [0.0] * n
    for t, o in zip(tracks, offsets):
        s = int(o * RATE)
        for i, v in enumerate(t): res[s + i] += v
    return res

note = lambda n: 440 * 2 ** ((n - 69) / 12)

write('shot-pea', tone(900, 380, .09, 'triangle', .6))
write('shot-berry', mix(tone(180, 70, .18, 'sine', .9), noise(.08, .3, 2, .6)))
write('shot-frost', mix(tone(1800, 2200, .18, 'sine', .25), tone(2700, 3100, .14, 'sine', .18)))
write('shot-zap', mix(tone(90, 60, .2, 'saw', .35, curve=1), noise(.2, .35, 1.5, .2)))
write('shot-sun', mix(tone(1400, 2600, .16, 'sine', .4, curve=1.5), tone(700, 1300, .16, 'triangle', .2)))
write('impact', noise(.07, .6, 3, .55))
write('boom', mix(tone(110, 40, .45, 'sine', 1, curve=2.5), noise(.4, .7, 3, .7)))
write('pop', mix(tone(500, 1300, .07, 'sine', .7), tone(1300, 1800, .04, 'sine', .3), offsets=[0, .06]))
write('coin', mix(tone(note(83), note(83), .08, 'square', .18, curve=1), tone(note(88), note(88), .25, 'square', .18), offsets=[0, .07]))
write('placed', mix(tone(160, 90, .12, 'sine', .9), noise(.05, .3, 2, .7), tone(note(76), note(76), .18, 'triangle', .3), offsets=[0, 0, .06]))
write('upgrade', mix(*[tone(note(n), note(n), .16, 'square', .16, curve=1.2) for n in (72, 76, 79, 84)], tone(note(88), note(88), .35, 'triangle', .3), offsets=[0, .06, .12, .18, .24]))
write('sold', mix(*[tone(note(n), note(n), .1, 'square', .15) for n in (88, 84, 79)], offsets=[0, .06, .12]))
write('wave', mix(*[tone(note(n), note(n), .5, 'saw', .18, attack=.03, curve=1.2, vibrato=.006) for n in (60, 64, 67)], tone(note(72), note(72), .6, 'saw', .2, attack=.03, vibrato=.006), noise(.12, .3, 2, .5), offsets=[0, 0, 0, .18, 0]))
write('boss', mix(*[tone(note(n), note(n) * .97, 1.1, 'saw', .22, attack=.05, curve=1.5, vibrato=.01) for n in (36, 43, 48, 49)], tone(70, 40, .5, 'sine', .8), tone(70, 40, .5, 'sine', .8), offsets=[0, 0, 0, .3, 0, .45]))
write('leak', mix(tone(420, 260, .22, 'square', .25), tone(300, 180, .3, 'square', .25), offsets=[0, .14]))
write('win', mix(*[tone(note(n), note(n), .22, 'square', .16, curve=1) for n in (72, 76, 79, 84, 79, 84)], tone(note(88), note(88), .8, 'triangle', .3, vibrato=.01), offsets=[0, .11, .22, .33, .5, .6, .75]))
write('lose', mix(*[tone(note(n), note(n) * .96, .45, 'saw', .2, curve=1, vibrato=.02) for n in (67, 66, 65)], tone(note(64), note(62), 1.0, 'saw', .22, vibrato=.03), offsets=[0, .4, .8, 1.2]))
write('ability-bomb', mix(tone(2200, 500, .5, 'sine', .25, curve=.5), tone(90, 30, .7, 'sine', 1, curve=2), noise(.6, .8, 2.5, .75), offsets=[0, .45, .45]))
write('ability-chill', mix(*[tone(note(n), note(n), .9, 'sine', .18, attack=.02, curve=1.5) for n in (84, 88, 91, 96)], noise(.9, .15, 1.2, .1), offsets=[0, .08, .16, .24, 0]))
write('heal', mix(tone(note(79), note(79), .15, 'sine', .2), tone(note(84), note(84), .2, 'sine', .2), offsets=[0, .08]))
write('shield', mix(tone(1200, 300, .12, 'triangle', .4), noise(.1, .3, 3, .2)))
write('combo', mix(*[tone(note(n), note(n), .12, 'square', .14) for n in (79, 83, 86, 91)], offsets=[0, .05, .1, .15]))

# Music: a bouncy 16-bar chiptune loop (bass, arpeggio, lead, drums) at 132 bpm.
bpm = 132; beat = 60 / bpm; bars = 16; total = int(bars * 4 * beat * RATE)
music = [0.0] * total
def put(samples, at):
    s = int(at * RATE)
    for i, v in enumerate(samples):
        if s + i < total: music[s + i] += v
chords = [(60, 64, 67), (57, 60, 64), (53, 57, 60), (55, 59, 62)] * 4
lead = [76, 79, 81, 79, 76, 74, 72, 74, 76, None, 72, 74, 76, 79, 76, None,
        74, 72, 69, 72, 74, None, 77, 76, 74, 72, 74, 76, 72, None, None, None]
for bar, chord in enumerate(chords):
    t0 = bar * 4 * beat
    root = chord[0] - 24
    for b in range(4):
        put(tone(note(root if b % 2 == 0 else root + 7), note(root if b % 2 == 0 else root + 7), beat * .9, 'triangle', .32, curve=1.3), t0 + b * beat)
        put(tone(60, 35, .14, 'sine', .55, curve=2), t0 + b * beat) if b % 2 == 0 else put(noise(.12, .22, 3, .3), t0 + b * beat)
        put(noise(.03, .07, 4, 0), t0 + b * beat + beat / 2)
    for s in range(8):
        n = chord[s % 3] + (12 if s >= 4 else 0)
        put(tone(note(n), note(n), beat / 2 * .8, 'square', .045, curve=1.5), t0 + s * beat / 2)
    if bar >= 4:
        for s in range(2):
            n = lead[((bar - 4) * 2 + s) % len(lead)]
            if n: put(tone(note(n), note(n), beat * 1.8, 'square', .07, attack=.01, curve=.8, vibrato=.004), t0 + s * 2 * beat)
write('music', music)
