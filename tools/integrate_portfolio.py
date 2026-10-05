"""Prepare reintegration after the presenter confirms the event is finished.

Run against a clean portfolio branch. This prepares files for review; it never
commits, publishes, or retires the dedicated site.
"""
from pathlib import Path
from shutil import copy2
import argparse, json, subprocess, sys
ROOT=Path(__file__).resolve().parent.parent
def main():
    p=argparse.ArgumentParser();p.add_argument('portfolio',type=Path);args=p.parse_args();dest=args.portfolio.resolve()
    if not (dest/'reflection-site.json').is_file() or not (dest/'tools/build_site.py').is_file():raise SystemExit('Use the portfolio checkout containing the reviewed transition.')
    status=subprocess.run(['git','status','--porcelain'],cwd=dest,check=True,capture_output=True,text=True)
    if status.stdout.strip():raise SystemExit('Start from a clean portfolio branch; preserve unrelated work first.')
    paths={'activity/reflection.json':'assets/data/reflection.json','activity/render.py':'tools/reflection_page.py','activity/reflection.js':'assets/scripts/reflection.js','activity/guidance.js':'assets/scripts/guidance.js','activity/guidance.css':'assets/styles/guidance.css','assets/styles/reflection.css':'assets/styles/reflection.css','tools/qa/guidance.mjs':'tools/qa/guidance.mjs'}
    for source,target in paths.items():copy2(ROOT/source,dest/target)
    for file in (ROOT/'assets/downloads').iterdir():
        if file.is_file():copy2(file,dest/'assets/downloads'/file.name)
    helper=dest/'tools/qa/guidance.mjs';text=helper.read_text(encoding='utf8').replace("const base=process.env.SITE_URL||'http://127.0.0.1:8001/digital-citizen-reflection';", "const base=process.env.SITE_URL||'http://127.0.0.1:8000/pages/digital-citizen-reflection.html';").replace("base+'/index.html'","base")
    helper.write_text(text,encoding='utf8',newline='\n')
    config=json.loads((dest/'reflection-site.json').read_text());config['mode']='portfolio';(dest/'reflection-site.json').write_text(json.dumps(config,indent=2)+'\n')
    subprocess.run([sys.executable,'tools/build_site.py'],cwd=dest,check=True)
    print('Latest activity, helper, styles, tests, resources and listings prepared. Review and publish the portfolio first. The dedicated site is still active.')
if __name__=='__main__':main()
