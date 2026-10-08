from pathlib import Path
from shutil import copy2,copytree
import json
ROOT=Path(__file__).resolve().parent.parent
DEST=ROOT/'.site-dist'
if DEST.exists():raise SystemExit('Use a clean output directory to package the site.')
DEST.mkdir()
for name in ['index.html','evidence.html','resources.html','privacy.html','accessibility.html','script.html','404.html','robots.txt','sitemap.xml','.nojekyll']:copy2(ROOT/name,DEST/name)
if json.loads((ROOT/'site.json').read_text())['mode']=='presentation':
    copytree(ROOT/'assets',DEST/'assets');(DEST/'activity').mkdir()
    for name in ['reflection.js','guidance.js','reflection.json']:copy2(ROOT/'activity'/name,DEST/'activity'/name)
print('Public files packaged; authoring, QA, and development files excluded.')
