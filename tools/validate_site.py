"""Check generated pages, local references, evidence, and private static architecture."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
import json, re, sys
from build_site import render_site, ROOT

FIELDS={'observation','context','notice','evidenceResponse','riskDetail','benefit','change','check'}
TOPICS={'attention','social','news','ai'}
class Page(HTMLParser):
    def __init__(self):
        super().__init__(); self.ids=[]; self.refs=[]; self.labels=[]; self.canonical=[]; self.h1=0
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if a.get('id'):self.ids.append(a['id'])
        if tag=='h1':self.h1+=1
        if tag=='label' and a.get('for'):self.labels.append(a['for'])
        if tag=='link' and a.get('rel')=='canonical':self.canonical.append(a.get('href'))
        for key in ('href','src'):
            if a.get(key):self.refs.append(a[key])

def validate_records(data):
    errors=[];topics=data.get('topics',[]);sources=data.get('sources',[])
    if data.get('version')!=1 or len(topics)!=4 or {t.get('id') for t in topics}!=TOPICS:errors.append('Four unique topics and version 1 are required')
    if set(data.get('guidance',{}))!=FIELDS:errors.append('Guidance is required for all eight written fields')
    for field,config in data.get('guidance',{}).items():
        if not 1<=len(config.get('prompts',[]))<=3:errors.append('Guidance must have one to three prompts: '+field)
        for p in config.get('prompts',[]):
            if not all(isinstance(p.get(k),str) and p[k].strip() for k in ('question','starter','uncertain')):errors.append('Incomplete guidance prompt: '+field)
    if len({s.get('id') for s in sources})!=len(sources):errors.append('Source IDs must be unique')
    for s in sources:
        if not all(isinstance(s.get(k),str) and s[k].strip() for k in ('id','title','publisher','date','population','finding','limit','prompt','url')):errors.append('Incomplete evidence source')
        if not s.get('url','').startswith('https://') or not set(s.get('topics',[]))<=TOPICS:errors.append('Invalid evidence reference')
    for t in topics:
        if t.get('id') not in TOPICS:continue
        if len([s for s in sources if t['id'] in s.get('topics',[])])<2:errors.append('Each topic needs two relevant evidence cards')
        if not all(isinstance(t.get('example',{}).get(k),str) and t['example'][k].strip() for k in FIELDS-{'riskDetail'}|{'risk'}):errors.append('Incomplete fictional example')
        if t.get('example',{}).get('risk') not in t.get('risks',[]):errors.append('Invalid example risk')
    return errors

def main():
    config=json.loads((ROOT/'site.json').read_text());data=json.loads((ROOT/'activity/reflection.json').read_text(encoding='utf8'))
    errors=validate_records(data);outputs=render_site();parsers={}
    for name,expected in outputs.items():
        p=ROOT/name
        if not p.exists() or p.read_text(encoding='utf8')!=expected:errors.append('Generated file differs: '+name)
        if not name.endswith('.html'):continue
        parser=Page();parser.feed(expected);parsers[name]=parser
        if parser.h1!=1 or len(parser.ids)!=len(set(parser.ids)):errors.append('Heading or duplicate ID: '+name)
        canonical=config['returnUrl'] if config['mode']=='retired' else config['url']+('' if name=='index.html' else name)
        if parser.canonical!=[canonical]:errors.append('Wrong canonical: '+name)
        for label in parser.labels:
            if label not in parser.ids:errors.append('Broken label: '+label)
    for name,parser in parsers.items():
        for reference in parser.refs:
            u=urlsplit(reference)
            if u.scheme or u.netloc:continue
            target=unquote(u.path) or name
            if not (ROOT/target).is_file():errors.append('Broken reference: '+name+' -> '+reference)
            if u.fragment and target in parsers and unquote(u.fragment) not in parsers[target].ids:errors.append('Broken fragment: '+reference)
    if config['mode']=='presentation':
        for name in ('assets/scripts/ui.js','activity/reflection.js','activity/guidance.js'):
            text=(ROOT/name).read_text(encoding='utf8')
            if re.search(r'\b(fetch|XMLHttpRequest|WebSocket|sendBeacon|eval)\s*\(',text):errors.append('Unexpected external processing: '+name)
            if re.search(r'localStorage\.(key|clear)|sessionStorage|signal-and-self-google|personalization|viewer',text):errors.append('Unexpected identity or storage access: '+name)
        if 'All examples are fictional.' not in outputs['index.html']:errors.append('Fictional label missing')
        if 'Mina' in outputs['index.html']:errors.append('Personal habit attribution in activity')
        for p in parsers.values():
            if any(urlsplit(r).scheme for r in p.refs if r.endswith('.js')):errors.append('Remote script reference')
    else:
        if any('reflection-form' in x for x in outputs.values()):errors.append('Retired site still contains activity')
    if errors:
        print('\n'.join(errors));return 1
    print('Validated generation, evidence, labels, canonical URLs, local links, and privacy boundaries.');return 0
if __name__=='__main__':sys.exit(main())
