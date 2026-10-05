"""Retirement deploys only after the restored portfolio activity is publicly available."""
from pathlib import Path
from urllib.request import urlopen
import json
config=json.loads((Path(__file__).resolve().parent.parent/'site.json').read_text())
if config['mode']=='retired':
    with urlopen(config['returnUrl'],timeout=30) as response:page=response.read().decode('utf8')
    for marker in ('id="reflection-form"','id="helper-notice-panel"','assets/scripts/guidance.js'):
        if marker not in page:raise SystemExit('Restore and verify the latest portfolio activity before retiring this site.')
    print('Restored portfolio activity verified.')
else:print('Presentation mode: no retirement scheduled.')
