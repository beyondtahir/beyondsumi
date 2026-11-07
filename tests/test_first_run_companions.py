from pathlib import Path
import sys,json,tempfile,unittest,importlib.util,io
from unittest.mock import patch
R=Path(__file__).resolve().parents[1];S=R/'skills/sumi';sys.path.insert(0,str(S/'scripts'))
import first_run,sumi_memory

def load(name,path):
 spec=importlib.util.spec_from_file_location(name,path);mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod);return mod
voicebox=load('voicebox_probe',R/'skills/sumi-voicebox/scripts/probe.py');installer=load('suite_installer',R/'install.py')

class SetupTests(unittest.TestCase):
 def setUp(self):self.tmp=tempfile.TemporaryDirectory();self.root=Path(self.tmp.name)
 def tearDown(self):self.tmp.cleanup()
 def inspect(self,cap=None):
  with patch.object(first_run,'doctor',return_value={'tools':{}}):return first_run.inspect(cap,self.root/'state')
 def test_first_run_reads_without_marking_or_installing(self):
  d=self.inspect();self.assertTrue(d['welcome_needed']);self.assertEqual(d['image_generation']['status'],'unknown');self.assertFalse(d['automatic_installs']);self.assertFalse((self.root/'state').exists())
 def test_available_image_is_explicit_attestation(self):
  f=self.root/'cap.json';f.write_text(json.dumps({'image_generation':{'status':'available','evidence':'callable image tool seen'}}));d=self.inspect(f);self.assertEqual(d['image_generation']['status'],'available')
 def test_no_image_is_distinct_from_unknown(self):
  f=self.root/'cap.json';f.write_text(json.dumps({'image_generation':{'status':'unavailable','evidence':'current tool inventory has no image tool'}}));self.assertEqual(self.inspect(f)['image_generation']['status'],'unavailable')
 def test_empty_capability_evidence_rejected(self):
  f=self.root/'cap.json';f.write_text('{"image_generation":{"status":"available"}}')
  with self.assertRaises(ValueError):self.inspect(f)
 def test_nonsecret_audio_preferences_validate(self):
  sumi_memory.validate('audio_mode','library-first','User selected library sounds');sumi_memory.validate('sound_library_path','/my/private-bank','User-selected local cache')


 def test_voicebox_metadata_uses_only_local_gets(self):
  calls=[]
  class Opener:
   def open(self,url,timeout):
    calls.append(url);return io.BytesIO(json.dumps({'models':[{'model_name':'test','downloaded':True,'secret':'omit'}]} if url.endswith('status') else {'paths':{'/generate':{}}}).encode())
  with patch.object(voicebox.urllib.request,'build_opener',return_value=Opener()):d=voicebox.probe(17493)
  self.assertEqual(len(calls),2);self.assertTrue(all(x.startswith('http://127.0.0.1:17493/') for x in calls));self.assertNotIn('secret',d['models'][0]);self.assertFalse(d['generation_or_download_started'])
 def test_voicebox_invalid_port_rejected(self):
  with self.assertRaises(ValueError):voicebox.probe(0)
 def test_saved_image_choices_do_not_trigger_a_second_welcome_or_generation(self):
  state=self.root/'state';data={'schema_version':1,'preferences':{'image_route':{'value':'images'},'image_tool':{'value':'host-image-tool'},'narration_provider':{'value':'supplied'}},'onboarding':{'first_run':{'version':'5.1.0'}}}
  sumi_memory.write(state/'user.json',data)
  with patch.object(first_run,'doctor',return_value={'tools':{}}):result=first_run.inspect(None,state)
  self.assertFalse(result['welcome_needed']);self.assertEqual(result['saved_choices']['image_tool'],'host-image-tool');self.assertFalse(result['first_sample']['generation_started']);self.assertEqual(sumi_memory.read(state/'user.json'),data)
 def test_image_preferences_remain_nonsecret(self):
  sumi_memory.validate('image_route','vector','User chose SVG');sumi_memory.validate('image_model','image-model-id','User selected image tool')
  with self.assertRaises(ValueError):sumi_memory.validate('image_tool','api_key=sk_test123456789012345','Secret must not be stored')
 def fixture(self):
  source=self.root/'suite'
  for name in installer.NAMES:
   f=source/'skills'/name/'SKILL.md';f.parent.mkdir(parents=True);f.write_text('new authored skill')
  return source
 def test_suite_installs_every_authored_folder(self):
  d=installer.install(self.fixture(),self.root/'target');self.assertEqual(len(d['installed']),len(installer.NAMES));self.assertEqual(d['model_downloads'],0)
 def test_existing_installs_preserved_and_backup_exact(self):
  source=self.fixture();target=self.root/'target';(target/'sumi').mkdir(parents=True);(target/'sumi/SKILL.md').write_text('old')
  with self.assertRaises(ValueError):installer.install(source,target)
  d=installer.install(source,target,True);self.assertEqual((Path(d['backup'])/'sumi/SKILL.md').read_text(),'old');self.assertEqual((target/'sumi/SKILL.md').read_text(),'new authored skill')
 def test_upgrade_retires_old_skills(self):
  source=self.fixture();target=self.root/'target';(target/'sumi-svg').mkdir(parents=True);(target/'sumi-svg/SKILL.md').write_text('old')
  d=installer.install(source,target,True);self.assertEqual(d['retired'],['sumi-svg']);self.assertFalse((target/'sumi-svg').exists());self.assertTrue((Path(d['backup'])/'sumi-svg/SKILL.md').exists())
 def test_version_one_users_see_the_new_welcome(self):
  self.assertTrue(first_run.needs_welcome(None));self.assertTrue(first_run.needs_welcome({'version':'1.0.1'}));self.assertFalse(first_run.needs_welcome({'version':'2.0.0'}))
 def test_source_destination_overlap_rejected(self):
  source=self.fixture()
  with self.assertRaises(ValueError):installer.install(source,source/'bad')

if __name__=='__main__':unittest.main()
