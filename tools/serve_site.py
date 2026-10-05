from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
import argparse
ROOT=Path(__file__).resolve().parent.parent
class Handler(SimpleHTTPRequestHandler):
    def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(ROOT),**kwargs)
    def end_headers(self):self.send_header('Cache-Control','no-store');super().end_headers()
    def do_GET(self):
        if self.path.startswith('/digital-citizen-reflection/'):self.path=self.path.removeprefix('/digital-citizen-reflection')
        super().do_GET()
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--port',type=int,default=8001);p.add_argument('--host',default='127.0.0.1');a=p.parse_args()
    print(f'Preview: http://{a.host}:{a.port}/digital-citizen-reflection/',flush=True)
    ThreadingHTTPServer((a.host,a.port),Handler).serve_forever()
