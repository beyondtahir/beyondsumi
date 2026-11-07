"""Offline contract tests. No installs, real account calls, model downloads or media generation."""
import importlib.util
import io
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT=Path(__file__).resolve().parents[1]
SKILL=ROOT/'skills/sumi'
sys.path.insert(0,str(SKILL/'scripts'))
import sumi_memory as memory
import sumi_setup as setup

def load_voice():
    spec=importlib.util.spec_from_file_location('sumi_test_voice',SKILL.parent/'sumi-elevenlabs/scripts/elevenlabs_voice.py')
    module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module);return module

class Contracts(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.root=Path(self.tmp.name)
    def tearDown(self):self.tmp.cleanup()
    def project(self):
        p=self.root/'film';p.mkdir();(p/'package.json').write_text(json.dumps({'dependencies':{'remotion':'4.0.516'}}));(p/'package-lock.json').write_text('{}');return p
    def cli(self,script,*args,ok=True):
        r=subprocess.run([sys.executable,str(SKILL/'scripts'/script),*map(str,args)],capture_output=True,text=True)
        if ok:self.assertEqual(r.returncode,0,r.stderr)
        else:self.assertNotEqual(r.returncode,0)
        return r

    def test_memory_read_does_not_create_files(self):
        p=self.root/'new/user.json';self.assertEqual(memory.read(p)['preferences'],{});self.assertFalse(p.parent.exists())

    def test_explicit_preferences_persist_and_forget_only_target(self):
        state=self.root/'state'
        self.cli('sumi_memory.py','--state-dir',state,'set','narration_provider','none','--reason','User asked for no voice by default')
        self.cli('sumi_memory.py','--state-dir',state,'set','storage','local','--reason','User wants local work')
        self.cli('sumi_memory.py','--state-dir',state,'forget','narration_provider')
        data=memory.read(state/'user.json');self.assertNotIn('narration_provider',data['preferences']);self.assertEqual(data['preferences']['storage']['value'],'local')

    def test_credentials_and_unknown_fields_rejected_without_write(self):
        for key,value in [('api_key','private'),('narration_model','sk_abcdefghijklmnop123456')]:
            self.cli('sumi_memory.py','--state-dir',self.root/'state','set',key,value,'--reason','Test rejection',ok=False)
        self.assertFalse((self.root/'state/user.json').exists())

    def test_install_and_first_run_markers_are_independent(self):
        self.cli('sumi_memory.py','--state-dir',self.root,'mark','installation')
        data=memory.read(self.root/'user.json');self.assertIn('installation',data['onboarding']);self.assertNotIn('first_run',data['onboarding'])
        self.cli('sumi_memory.py','--state-dir',self.root,'mark','first_run')
        self.assertEqual(set(memory.read(self.root/'user.json')['onboarding']),{'installation','first_run'})

    def test_bad_memory_preserved(self):
        p=self.root/'user.json';p.write_text('{broken')
        self.cli('sumi_memory.py','--state-dir',self.root,'set','storage','local','--reason','Explicit choice',ok=False)
        self.assertEqual(p.read_text(),'{broken')






    def test_local_voicebox_detection_gets_only_status(self):
        calls=[]
        class Opener:
            def open(self,url,timeout):
                calls.append(url);return io.BytesIO(b'{"models":[{"model_name":"kokoro","downloaded":true,"loaded":false,"secret":"omit"}]}')
        with patch.object(setup.urllib.request,'build_opener',return_value=Opener()):result=setup.voicebox_status(17493)
        self.assertEqual(calls,['http://127.0.0.1:17493/models/status']);self.assertTrue(result['models'][0]['downloaded']);self.assertNotIn('secret',result['models'][0])



    def test_v4_route_stops_before_credentials_or_paid_request(self):
        voice=load_voice()
        with patch.object(voice,'get_preferences',return_value={}),patch.object(voice,'require_key') as key,patch.object(voice,'api_request') as api:
            with self.assertRaises(voice.PluginError) as error:voice.generate_narration('Hello',str(self.root),voice_id='example',model_id='eleven_v4')
        self.assertEqual(error.exception.code,'endpoint_not_supported');key.assert_not_called();api.assert_not_called();self.assertEqual(list(self.root.iterdir()),[])

if __name__=='__main__':unittest.main(verbosity=2)
