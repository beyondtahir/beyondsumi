"""A film can be marked ready only with a passing Checker report and a person who approved it."""
import json
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

R = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(R / 'skills/sumi/scripts'))
import build_delivery


@unittest.skipUnless(shutil.which('ffmpeg'), 'FFmpeg is required')
class Delivery(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self.film = self.root / 'film.mp4'
        subprocess.run(['ffmpeg', '-v', 'error', '-f', 'lavfi', '-i', 'color=c=gray:s=64x64:d=1:r=24', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', str(self.film)], check=True)
        (self.root / 'bad.json').write_text('{"status": "fail"}')
        (self.root / 'note.txt').write_text('not a report')
        (self.root / 'good.json').write_text('{"status": "pass"}')
        (self.root / 'open.md').write_text('- [x] the blade\n- [ ] the hand\n')
        (self.root / 'ticked.md').write_text('- [x] the blade\n- [x] the hand\n')
        (self.root / 'panel.json').write_text(json.dumps(dict(viewers=[dict(score=8, **{'pass': True})] * 5)))
        (self.root / 'qa.json').write_text('{"status": "pass"}')
        (self.root / 'weak.json').write_text(json.dumps(dict(viewers=[dict(score=5, **{'pass': False})] * 5)))

    def tearDown(self):
        self.tmp.cleanup()

    def attempt(self, name, **extra):
        film = build_delivery.sha(self.film)
        for name_ in ('panel.json', 'qa.json', 'weak.json'):
            data = json.loads((self.root / name_).read_text()); data.setdefault('film_sha256', film); (self.root / name_).write_text(json.dumps(data))
        item = dict(style='Sumi Dark', source='film.mp4', status='ready', review_note='Watched', reviewed_sha256=build_delivery.sha(self.film), **extra)
        manifest = self.root / f'{name}.json'
        manifest.write_text(json.dumps(dict(title='T', films=[item])))
        build_delivery.build(manifest, self.root / f'{name}-out')

    def test_failed_report_is_refused(self):
        with self.assertRaisesRegex(ValueError, 'passing'):
            self.attempt('a', review_file='bad.json', approved_by='Tahir')

    def test_any_old_file_is_refused(self):
        with self.assertRaisesRegex(ValueError, 'JSON report'):
            self.attempt('b', review_file='note.txt', approved_by='Tahir')

    def test_a_person_must_approve(self):
        with self.assertRaisesRegex(ValueError, 'approved_by'):
            self.attempt('c', review_file='good.json', detail_file='ticked.md', audience_file='panel.json', qa_file='qa.json')

    def test_the_detail_check_must_be_finished(self):
        with self.assertRaisesRegex(ValueError, 'detail_file'):
            self.attempt('e', review_file='good.json', approved_by='Tahir')
        with self.assertRaisesRegex(ValueError, 'not finished'):
            self.attempt('f', review_file='good.json', detail_file='open.md', approved_by='Tahir')

    def test_the_audience_must_pass(self):
        with self.assertRaisesRegex(ValueError, 'audience_file'):
            self.attempt('g', review_file='good.json', detail_file='ticked.md', approved_by='Tahir')
        with self.assertRaisesRegex(ValueError, 'audience panel'):
            self.attempt('h', review_file='good.json', detail_file='ticked.md', audience_file='weak.json', approved_by='Tahir')

    def test_quality_assurance_must_pass(self):
        with self.assertRaisesRegex(ValueError, 'qa_file'):
            self.attempt('i', review_file='good.json', detail_file='ticked.md', audience_file='panel.json', approved_by='Tahir')

    def test_a_review_of_an_older_film_is_refused(self):
        (self.root / 'qa.json').write_text(json.dumps(dict(status='pass', film_sha256='old')))
        with self.assertRaisesRegex(ValueError, 'different version'):
            self.attempt('j', review_file='good.json', detail_file='ticked.md', audience_file='panel.json', qa_file='qa.json', approved_by='Tahir')

    def test_ready_with_both(self):
        self.attempt('d', review_file='good.json', detail_file='ticked.md', audience_file='panel.json', qa_file='qa.json', approved_by='Tahir')
        self.assertTrue((self.root / 'd-out/data.js').is_file())


if __name__ == '__main__':
    unittest.main()
