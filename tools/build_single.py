#!/usr/bin/env python3
"""Crea dist/atlante_di_campo.html: tutta l'app in un unico file (come le versioni precedenti),
utile da mandare a qualcuno o da aprire senza pubblicare. Per la PWA si usa invece la cartella intera.
  python tools/build_single.py
by Lollo ®2026"""
import os, re
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def rd(p): return open(os.path.join(ROOT,p),encoding='utf-8').read()
h=rd('index.html')
h=re.sub(r'<link rel="(manifest|icon|apple-touch-icon)"[^>]*>\n?','',h)
h=re.sub(r'<link rel="stylesheet" href="([^"]+)">',lambda m:'<style>\n'+rd(m.group(1))+'\n</style>',h)
h=re.sub(r'<script src="([^"]+)"></script>',lambda m:'<script>\n'+rd(m.group(1)).replace('</script','<\\/script')+'\n</script>',h)
os.makedirs(os.path.join(ROOT,'dist'),exist_ok=True)
out=os.path.join(ROOT,'dist','atlante_di_campo.html')
open(out,'w',encoding='utf-8',newline='\n').write(h)
print('Creato',out,'(%d kB)'%(len(h.encode())//1024))
