import copy, json, sys, tempfile, unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from validate_site import validate_records, ROOT
from build_site import render_site
class RecordsTest(unittest.TestCase):
    def setUp(self):self.data=json.loads((ROOT/'activity/reflection.json').read_text(encoding='utf8'))
    def test_valid(self):self.assertEqual(validate_records(self.data),[])
    def test_bad_topics(self):
        for value in (None,'unknown','attention'):
            d=copy.deepcopy(self.data);d['topics'][1]['id']=value;self.assertTrue(validate_records(d))
    def test_missing_prompts(self):
        del self.data['guidance']['notice'];self.assertTrue(validate_records(self.data))
    def test_retirement_removes_activity_and_keeps_fixed_redirect(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp);(root/'activity').mkdir();(root/'activity/reflection.json').write_text(json.dumps(self.data))
            config=json.loads((ROOT/'site.json').read_text());config['mode']='retired';(root/'site.json').write_text(json.dumps(config))
            files=render_site(root)
            self.assertIn(config['returnUrl'],files['index.html']);self.assertNotIn('reflection-form',files['index.html'])
            self.assertNotIn('location.search',files['index.html']);self.assertNotIn('digital-citizen-reflection/',files['sitemap.xml'])
if __name__=='__main__':unittest.main()
