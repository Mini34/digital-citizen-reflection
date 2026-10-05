"""Generate the portable, static presentation website. No participant inputs."""
from pathlib import Path
from html import escape
import argparse, hashlib, json, sys
ROOT=Path(__file__).resolve().parent.parent
sys.path.insert(0,str(ROOT/'activity'))
from render import reflection_content

def render_site(root=ROOT):
    config=json.loads((root/'site.json').read_text(encoding='utf8'))
    data=json.loads((root/'activity/reflection.json').read_text(encoding='utf8'))
    base=config['url']
    if config['mode'] not in {'presentation','retired'}:raise ValueError('Unsupported site mode')
    if config['mode']=='retired':
        target=config['returnUrl']
        redirect=f'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Digital Citizen Reflection has moved</title><meta name="robots" content="noindex"><link rel="canonical" href="{escape(target)}"><meta http-equiv="refresh" content="0;url={escape(target)}"></head><body><h1>Digital Citizen Reflection</h1><p>The activity is now available in Signal &amp; Self.</p><a href="{escape(target)}">Open the activity</a><script>window.location.replace({json.dumps(target)});</script></body></html>\n'
        return {name:redirect for name in ['index.html','evidence.html','resources.html','privacy.html','script.html','404.html']}|{'sitemap.xml':'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"/>\n','robots.txt':'User-agent: *\nDisallow: /\n'}
    def asset(path):
        digest=hashlib.sha256((root/path).read_bytes()).hexdigest()[:10]
        return path+'?v='+digest
    nav=[('Activity','index.html#reflection-activity'),('Evidence','evidence.html'),('Resources','resources.html'),('Privacy','privacy.html')]
    def page(title,body,name,activity=False):
        links=''.join(f'<a href="{href}"'+(' aria-current="page"' if name==href.split('#')[0] else '')+f'>{label}</a>' for label,href in nav)
        scripts=f'<script src="{asset("assets/scripts/ui.js")}" defer></script>'
        if activity:scripts+=f'<script src="{asset("activity/reflection.js")}" defer></script><script src="{asset("activity/guidance.js")}" defer></script>'
        canonical=base+('' if name=='index.html' else name)
        description='A private four-step activity to observe an online habit, evaluate evidence, identify a risk, and choose a realistic change.'
        schema={'@context':'https://schema.org','@type':'WebApplication','name':'Digital Citizen Reflection','url':base,'applicationCategory':'EducationalApplication','isAccessibleForFree':True,'inLanguage':'en'}
        return f'''<!doctype html><html lang="en" data-theme="signal"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{escape(title)} — Digital Citizen Reflection</title><meta name="description" content="{description}"><meta name="theme-color" content="#f4f0e8"><meta name="referrer" content="no-referrer"><link rel="canonical" href="{canonical}"><meta property="og:title" content="{escape(title)} — Digital Citizen Reflection"><meta property="og:description" content="{description}"><meta property="og:url" content="{canonical}"><meta property="og:type" content="website"><link rel="preload" href="assets/fonts/newsreader-600.woff2" as="font" type="font/woff2" crossorigin><link rel="preload" href="assets/fonts/manrope-400.woff2" as="font" type="font/woff2" crossorigin><link rel="stylesheet" href="{asset('assets/styles/fonts.css')}"><link rel="stylesheet" href="{asset('assets/styles/base.css')}"><link rel="stylesheet" href="{asset('assets/styles/project.css')}"><link rel="stylesheet" href="{asset('assets/styles/reflection.css')}">{scripts}<script type="application/ld+json">{json.dumps(schema).replace('<',chr(92)+'u003c')}</script></head><body id="top"><a class="skip-link" href="#main-content">Skip to content</a><header class="site-header site-shell"><a class="wordmark" href="index.html">Digital Citizen Reflection</a><nav class="site-nav" aria-label="Primary navigation">{links}</nav><div class="theme-control"><label for="theme">Theme</label><select id="theme"><option value="signal">Signal</option><option value="midnight">Midnight</option><option value="quiet">Quiet</option></select></div></header><main id="main-content" tabindex="-1">{body}</main><footer class="site-footer site-shell"><span>Digital Citizen Reflection</span><a href="privacy.html">Privacy &amp; your controls</a><a href="resources.html">Worksheet &amp; session materials</a><a href="#top">Back to top</a></footer></body></html>\n'''
    def intro(title,text):return f'<section class="page-hero site-shell"><p class="eyebrow">Digital Citizen Reflection</p><h1>{title}</h1><p class="page-lede">{text}</p></section>'
    cards=''
    for s in data['sources']:
        cards+=f'<article class="reflection-source"><p class="mono-label">{escape(s["publisher"])}</p><h2>{escape(s["title"])}</h2><p><strong>Date:</strong> {escape(s["date"])}</p><p>{escape(s["finding"])}</p><p><strong>Population / audience:</strong> {escape(s["population"])}</p><p><strong>Limit:</strong> {escape(s["limit"])}</p><p>{escape(s["prompt"])}</p><a href="{escape(s["url"])}" rel="noreferrer">Read the original source</a></article>'
    downloads=[('digital-citizen-worksheet.pdf','One-page worksheet','Printable prompts and sentence starters for all four steps.','PDF'),('digital-citizen-presentation.pptx','Editable presentation','Ten slides with speaker notes and screenshots for an offline demonstration.','PowerPoint'),('digital-citizen-presentation.pdf','Presentation slides','The ten slides, with speaker notes attached as PDF comments.','PDF'),('digital-citizen-presenter-guide.pdf','Presenter guide','Readable notes, live-demo cues, and the five-minute condensed script.','PDF')]
    resource_list=''.join(f'<li><h2>{label}</h2><p>{text}</p><a class="button button-quiet" href="assets/downloads/{file}">Download {label.lower()} ({kind})</a></li>' for file,label,text,kind in downloads)
    privacy=intro('Your answers stay with you','The activity and guided helper run in this browser. No sign-in is required.')+'''<section class="section site-shell"><h2>Temporary unless you choose to save</h2><p>Reflection answers stay in memory until you enable Save on this device. Then drafts save automatically in this browser. Choose Resume to open a saved draft. Disabling saving removes it while keeping the current answers on the page. Clear reflection removes both.</p><p>Saved reflections do not sync between devices. People sharing this browser profile may see saved drafts. GitHub project sites on the same host share a browser storage origin; the activity keeps its existing reflection key so compatible drafts can resume when it returns to Signal &amp; Self. It does not read portfolio identity, names, goals, saved items, or personalization.</p><h2>Help that you control</h2><p>Guided help uses prepared questions and sentence starters, not an external AI service. It opens only when you request it or accept an offer. An empty focused field or repeated missing-answer checks can trigger a small offer; this does not judge your writing. No thanks stops proactive offers for this visit.</p><p>Timers and offer counts remain in memory. No typing history is recorded. Unfinished helper responses are temporary; only a draft you explicitly use becomes part of the reflection and its saving controls.</p><h2>No reflection submission</h2><p>Answers, helper responses, and difficulty signals are never added to URLs, analytics, network requests, or sign-in state. This website has no analytics beacon, Google identity scripts, cloud account, or submission endpoint. GitHub Pages serves the public files and may keep standard hosting security logs; those requests do not contain reflection answers.</p><p>Source links leave the site with no referrer. Downloads and printouts contain the answers you choose to keep. Keep or share them as you prefer.</p><h2>If saving is unavailable</h2><p>The activity remains usable temporarily and explains that draft saving failed. You can still download or print an action plan. Clearing browser data also removes saved drafts.</p></section>'''
    outputs={
        'index.html':page('Activity',reflection_content(data,worksheet='assets/downloads/digital-citizen-worksheet.pdf',project_only=True),'index.html',True),
        'evidence.html':page('Evidence',intro('Evidence and its limits','A credible source can help you think without answering every question about your own situation.')+f'<section class="section site-shell reflection-sources">{cards}</section>','evidence.html'),
        'resources.html':page('Resources',intro('Take the framework with you','Use the worksheet, editable slides, or an offline presentation backup.')+f'<section class="section site-shell"><ul class="resource-list">{resource_list}</ul><p><a href="script.html">Read the presentation scripts as accessible web text</a></p></section>','resources.html'),
        'privacy.html':page('Privacy',privacy,'privacy.html'),
        '404.html':page('Page not found',intro('Page not found','Start again with the activity, evidence, or resources.')+'<p class="site-shell"><a href="index.html">Open the activity</a></p>','404.html').replace('<head>','<head><base href="'+base+'">'),
    }
    scripts_file=root/'docs/presentation/speaker-scripts.json'
    scripts=json.loads(scripts_file.read_text(encoding='utf8')) if scripts_file.exists() else {'slides':[],'backup':[]}
    script_body=intro('Presentation scripts','Ten-minute session and five-minute offline version.')
    for title,items,key in [('Ten-minute session',scripts.get('slides',[]),'notes'),('Five-minute backup',scripts.get('backup',[]),'text')]:
        script_body+=f'<section class="section site-shell"><h2>{title}</h2>'
        for s in items:script_body+=f'<h3>{escape(s.get("title",s.get("time","")))}</h3><p>{escape(s.get(key,""))}</p>'
        script_body+='</section>'
    outputs['script.html']=page('Presentation scripts',script_body,'script.html')
    outputs['robots.txt']='User-agent: *\nAllow: /\nSitemap: '+base+'sitemap.xml\n'
    outputs['sitemap.xml']='<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+''.join('<url><loc>'+base+('' if p=='index.html' else p)+'</loc></url>' for p in outputs if p.endswith('.html') and p!='404.html')+'</urlset>\n'
    return outputs

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true');args=parser.parse_args()
    outputs=render_site();different=[]
    for name,text in outputs.items():
        path=ROOT/name
        if args.check:
            if not path.exists() or path.read_text(encoding='utf8')!=text:different.append(name)
        else:path.write_text(text,encoding='utf8')
    if different:raise SystemExit('Generated files differ: '+', '.join(different))
    print(('Checked' if args.check else 'Generated')+f' {len(outputs)} public files.')
if __name__=='__main__':main()
