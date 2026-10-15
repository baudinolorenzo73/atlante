#!/usr/bin/env python3
"""Rigenera js/version.js: numero di versione, codice build ed elenco dei file da salvare nel telefono.
Da lanciare DOPO ogni modifica, prima di pubblicare (funziona anche in Termux, solo libreria standard).

  python tools/build.py              -> stessa versione, nuovo codice build
  python tools/build.py 1.4          -> imposta la versione 1.4
  python tools/build.py --zip        -> crea anche ../atlante-lago-piccolo.zip pronto per «Pubblica»
by Lollo ®2026"""
import hashlib, os, re, sys, zipfile
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SKIP_DIRS={'tools','dist','.git','node_modules'}
SKIP_FILES={'sw.js','README.md','.nojekyll','js/version.js'}
def files():
    out=[]
    for d,ds,fs in os.walk(ROOT):
        ds[:]=sorted(x for x in ds if x not in SKIP_DIRS and not x.startswith('.'))
        for f in sorted(fs):
            rel=os.path.relpath(os.path.join(d,f),ROOT).replace(os.sep,'/')
            if rel in SKIP_FILES or f.startswith('.'):continue
            out.append(rel)
    return out
vf=os.path.join(ROOT,'js','version.js')
old=open(vf,encoding='utf-8').read() if os.path.exists(vf) else ''
m=re.search(r"var VERSION='([^']+)'",old)
ver=m.group(1) if m else '1.0'
args=[a for a in sys.argv[1:] if not a.startswith('--')]
if args: ver=args[0]
lst=files()
h=hashlib.sha1(ver.encode())
for f in lst: h.update(f.encode()); h.update(open(os.path.join(ROOT,f),'rb').read())
build=h.hexdigest()[:8]
assets=['./']+lst+['js/version.js']
js=("/* Generato da tools/build.py: non modificare a mano (tranne VERSION, se vuoi). */\n"
    "var VERSION='%s';\nvar BUILD='%s';\nvar ASSETS=[\n%s\n];\n")%(ver,build,',\n'.join("  '%s'"%a for a in assets))
open(vf,'w',encoding='utf-8',newline='\n').write(js)
print('Versione %s · build %s · %d file nell\'elenco'%(ver,build,len(assets)))
if '--zip' in sys.argv:
    zp=os.path.join(os.path.dirname(ROOT),'atlante-lago-piccolo.zip')
    with zipfile.ZipFile(zp,'w',zipfile.ZIP_DEFLATED) as z:
        for d,ds,fs in os.walk(ROOT):
            ds[:]=sorted(x for x in ds if x not in {'.git','node_modules','dist'})
            for f in sorted(fs):
                p=os.path.join(d,f); z.write(p,os.path.relpath(p,ROOT).replace(os.sep,'/'))
    print('ZIP creato:',zp)
