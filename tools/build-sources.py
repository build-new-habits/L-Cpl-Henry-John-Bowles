#!/usr/bin/env python3
"""Build content/sources.json: every source cited anywhere in the exhibition,
grouped for the Sources and credits page. Run it after editing any chapter:

    python3 tools/build-sources.py
"""
import glob
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)

# Sources that are signposts inside the exhibition, not sources.
SKIP = re.compile(r'^(Ask the historian|See Chapter|Jobs list|Map legend|IWM)$|^(Ask the historian|See Chapter)', re.I)

# Many small citations roll up into one bibliography entry.
MERGE = [
    (re.compile(r"^(Grandma Angela's memoir|Memories of Grandad, by Angela Wright)"),
     "Angela Wright, Memories of Grandad"),
    (re.compile(r'^(Wyrall, page|Everard Wyrall)'),
     'Everard Wyrall, The History of the Somerset Light Infantry (Prince Albert\'s) 1914–1919'),
    (re.compile(r'^(Pöppinghege|Christoph Pöppinghege)'),
     'Christoph Pöppinghege, Leben im Lager (1999)'),
    (re.compile(r'^(25th Division history|The 25th Division in France)'),
     'The 25th Division in France and Flanders'),
    (re.compile(r'^1st Wiltshires war diary'), '1st Battalion, Wiltshire Regiment, war diary'),
    (re.compile(r'(Translated by Ralph J\. Whitehead|Reichsarchiv, Somme-Nord|translation by Ralph J\. Whitehead)'),
     'Reichsarchiv, Somme-Nord, translated by Ralph J. Whitehead (Great War Forum)'),
    (re.compile(r'^(Redan Ridge \(Battleground Europe\)|A soldier\'s account, quoted in Redan Ridge)'),
     'Redan Ridge (Battleground Europe series)'),
    (re.compile(r'^Storm of Steel, translated'), 'Ernst Jünger, Storm of Steel, translated by Michael Hofmann (Penguin, 2003)'),
    (re.compile(r'^Storm of Steel \(Wikipedia'), 'Storm of Steel (Wikipedia)'),
    (re.compile(r'^(His casualty record|His service and casualty records)'),
     'His service and casualty records'),
    (re.compile(r'^(Museum letter|Rifles Berkshire and Wiltshire Museum$|Family memory; The Rifles)'),
     'Letter from The Rifles Berkshire and Wiltshire Museum to the family'),
    (re.compile(r'^Operation Michael'), 'Operation Michael (Wikipedia)'),
    (re.compile(r'^UK Parliament: Conscription'), 'UK Parliament, Conscription: the First World War'),
    (re.compile(r'^1900s\.org\.uk'), '1900s.org.uk, Rationing and shortages in WW1'),
    (re.compile(r'^(Family photograph|Family photographs)'), 'Family photographs'),
    (re.compile(r'^(His birth certificate|Their marriage certificate|His death certificate|Family papers$)', re.I),
     'His birth, marriage and death certificates (family papers)'),
    (re.compile(r"(Tristan Cobb's family research|Joyce Bush's memory)"),
     "Tristan Cobb, family research notes (census, newspaper reports, probate and family stories)"),
    (re.compile(r'^Newspaper cutting'),
     "Newspaper cutting: Arthur and Eliza Ann Bowles's diamond wedding, December 1953 (kept by the family)"),
    (re.compile(r'^Somerset Historic Environment Record'), 'Somerset Historic Environment Record, Stoford'),
    (re.compile(r'^Quoted in the British Official History'),
     'Military Operations, France and Belgium, 1916, volume 1 (the British Official History)'),
    (re.compile(r'^Veterans Affairs Canada'), 'Veterans Affairs Canada, Beaumont-Hamel and Vimy memorials'),
]

GROUPS = [
    ('records', "Henry's own records"),
    ('family', 'Family papers and photographs'),
    ('histories', 'War diaries, regimental histories and books'),
    ('museums', 'Museums, archives and public bodies'),
    ('iwm-images', 'Photographs and objects from Imperial War Museums'),
    ('reference', 'Reference websites and articles'),
]

def group_of(title):
    t = title.lower()
    if t.startswith(('image: iwm', '© harold robson/iwm')) or re.match(r'iwm, q \d', t):
        return 'iwm-images'
    if t.startswith(('his service', 'letter from the rifles', 'his birth, marriage')):
        return 'records'
    if t.startswith(('angela wright', 'family', "the family's", 'from the family', 'newspaper cutting', 'tristan cobb')):
        return 'family'
    if any(k in t for k in ('war diary', 'wyrall', '25th division', 'reichsarchiv', 'redan ridge (', 'storm of steel, translated',
                            'leben im lager', 'official history', 'western front of the first world war', 'storm of steel, trans')):
        return 'histories'
    if any(k in t for k in ('iwm', 'national army museum', 'national archives', 'cwgc', 'heritage', 'museum', 'archives',
                            'war memorial', 'red cross', 'parliament', 'met office', 'dorset council', 'veterans affairs',
                            'the rooms', 'archaeolog', 'local history society', 'historic environment', 'the wardrobe')):
        return 'museums'
    return 'reference'

def where_label(f):
    name = os.path.basename(f)[:-5]
    m = re.match(r'chapter-(\d+)', name)
    if m:
        n = int(m.group(1))
        return ('Chapter %d' % n, 'chapter.html#%d' % n, n)
    if name == 'historian':
        return ('Ask the historian', 'historian.html', 99)
    if name == 'chapters':
        return ('Chapter summaries', 'journey.html', 98)
    return (name, 'index.html', 100)

entries = {}

def add(title, url, f):
    title = re.sub(r'\s+', ' ', title).strip().rstrip('.')
    if not title or SKIP.search(title):
        return
    title = title.replace('IWM: ', 'IWM, ').replace('The Long, Long Trail: ', 'The Long, Long Trail, ') \
                 .replace('National Army Museum: ', 'National Army Museum, ').replace('Canadian War Museum: ', 'Canadian War Museum, ')
    for pat, to in MERGE:
        if pat.search(title):
            title = to
            break
    e = entries.setdefault(title, {'title': title, 'urls': [], 'where': {}})
    if url and not url.startswith(('historian.html', 'chapter.html')) and url not in e['urls']:
        e['urls'].append(url)
    lab, href, order = where_label(f)
    e['where'][lab] = (href, order)

def walk(o, f):
    if isinstance(o, dict):
        for k in ('source', 'recordSource', 'credit'):
            if isinstance(o.get(k), str):
                add(o[k], o.get('url'), f)
        if isinstance(o.get('sources'), list):
            for x in o['sources']:
                if isinstance(x, dict) and 'source' in x:
                    add(x['source'], x.get('url'), f)
                elif isinstance(x, str):
                    add(x, None, f)
        for v in o.values():
            walk(v, f)
    elif isinstance(o, list):
        for v in o:
            walk(v, f)

for f in sorted(glob.glob('content/*.json')):
    if f.endswith('sources.json'):
        continue
    walk(json.load(open(f, encoding='utf-8')), f)

out = {'groups': []}
for gid, gtitle in GROUPS:
    items = [e for e in entries.values() if group_of(e['title']) == gid]
    items.sort(key=lambda e: re.sub(r'^(the|image: iwm \()', '', e['title'].lower()))
    out['groups'].append({
        'id': gid, 'title': gtitle,
        'items': [{'title': e['title'], 'urls': e['urls'],
                   'where': [{'label': l, 'href': h} for l, (h, o) in sorted(e['where'].items(), key=lambda kv: kv[1][1])]}
                  for e in items]})

with open('content/sources.json', 'w', encoding='utf-8') as fh:
    json.dump(out, fh, ensure_ascii=False, indent=1)
    fh.write('\n')
print('sources:', sum(len(g['items']) for g in out['groups']),
      {g['id']: len(g['items']) for g in out['groups']})
