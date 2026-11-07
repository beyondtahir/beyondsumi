#!/usr/bin/env python3
"""Read-only setup summary plus explicit host image-capability attestation."""
import argparse,json
from pathlib import Path
from sumi_setup import doctor
from sumi_catalog import STYLES
from sumi_memory import default_dir,read


def needs_welcome(mark):
    # Someone from version 1 has a new studio to meet, so they see the welcome again.
    if not mark:return True
    version=str(mark.get('version','') if isinstance(mark,dict) else '')
    return version.split('.')[0]=='1'

def inspect(capabilities=None,state_dir=None):
    root=Path(__file__).resolve().parents[1]
    result=doctor();memory=read((state_dir or default_dir())/'user.json')
    image={'status':'unknown','evidence':'Host agent must inspect callable image tools/MCP; local Python cannot infer them.'}
    if capabilities:
        data=json.loads(capabilities.read_text());record=data.get('image_generation',{})
        status=record.get('status');evidence=record.get('evidence')
        if status not in {'available','unavailable','unknown'} or not isinstance(evidence,str) or not evidence.strip():raise ValueError('Record status and observed host evidence; do not infer model capability')
        image={'status':status,'evidence':evidence[:300],'source':'explicit host attestation, not a generation test'}
    bank=root/'assets/sound-library/bundled-bank/library.json'
    data=json.loads(bank.read_text()) if bank.exists() else {}
    result.update(welcome_text=(root/'assets/WELCOME.txt').read_text(),welcome_needed=needs_welcome(memory['onboarding'].get('first_run')),image_generation=image,
        packaged_sound_bank={'music_themes':len(data.get('music',{})),'effects':len(data.get('sfx',{})),'status':'bundled_not_audition_certified' if data else 'missing','default':'bundled music; effects from ElevenLabs or supplied files'},
        style_choices=[{'id':key,'name':value['name'],'description':value['short_description']} for key,value in STYLES.items()],
        saved_choices={key:value['value'] for key,value in memory['preferences'].items() if key in {'image_route','image_tool','image_model','narration_provider','audio_mode','preferred_style'} and isinstance(value,dict) and 'value' in value and (key!='preferred_style' or value['value'] in STYLES)},
        first_sample={"optional":True,"generation_started":False,"format":"one image in the chosen style"},
        narration_choices=['voicebox','elevenlabs','own_recording','none'],free_effects=['wind','rain','water','fire','whoosh','thud','knock','step'],no_narration_music=['library','supplied'],automatic_installs=False,paid_generation_started=False,
        next_step='Show the welcome and what is available, missing or unknown in plain words. Ask only missing choices. Offer one sample image, then start with the Writer. Mark first_run only after the welcome is really shown.')
    return result


def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--capabilities',type=Path);p.add_argument('--state-dir',type=Path);a=p.parse_args()
    try:print(json.dumps(inspect(a.capabilities,a.state_dir),indent=2,ensure_ascii=False))
    except (OSError,ValueError,TypeError) as e:p.exit(1,f'First-run check incomplete: {e}\n')
if __name__=='__main__':main()
