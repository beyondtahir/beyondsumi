#!/usr/bin/env python3
"""Small, external Sumi preference store. Never accepts credentials or full transcripts."""
import argparse
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import re
import sys
import tempfile
from sumi_catalog import VERSION, CATALOG_ID, STYLES, LEGACY_METHODS

CHOICES = {
    'audio_mode': {'library-first','supplied','ask'},
    'image_route': {'images','vector','supplied','ask'},
    'animation_identity': {'japanese-sumi'},
    'animation_catalog': {CATALOG_ID},
    'character_workflow': {'complete-reference-first'},
    'animation_economy': {'selective','full','ask'},
    'preferred_style': set(STYLES) | {'auto'},
    'aspect_ratio': {'16:9','9:16','1:1','ask'},
    'narration_provider': {'elevenlabs','voicebox','supplied','none','ask'},
    'background_audio': {'library','supplied','ask'},
    'storage': {'local','ask'},
    'runtime_rule': {'ask_before_change'},
    'captions': {'auto','on','off','ask'},
}
TEXT_KEYS = {'language','narration_voice_id','narration_model','voicebox_profile_id','sound_library_path','image_tool','image_model'}

def legacy_preferences(data):
    """Expose preserved old choices without inventing a replacement preference."""
    prefs=data.get('preferences',{})
    legacy={}
    for key,values in [('preferred_style',set(LEGACY_METHODS)),
                       ('animation_catalog',{'four-methods'})]:
        record=prefs.get(key,{})
        if isinstance(record,dict) and record.get('value') in values:
            legacy[key]={'record':record,'status':'historical-not-a-current-style',
                         'action':'Keep as history; choose a current style for the next project.'}
    return legacy

def default_dir():
    if os.environ.get('SUMI_STATE_DIR'):
        return Path(os.environ['SUMI_STATE_DIR']).expanduser()
    if sys.platform == 'darwin':
        return Path.home()/'Library/Application Support/Sumi'
    if os.name == 'nt':
        return Path(os.environ.get('APPDATA', str(Path.home()/'AppData/Roaming')))/'Sumi'
    return Path(os.environ.get('XDG_CONFIG_HOME', str(Path.home()/'.config')))/'sumi'

def now():
    return datetime.now(timezone.utc).isoformat()

def read(path):
    if not path.exists():
        return {'schema_version':1,'preferences':{},'onboarding':{}}
    data=json.loads(path.read_text(encoding='utf-8'))
    if data.get('schema_version') != 1 or not isinstance(data.get('preferences'),dict) or not isinstance(data.get('onboarding'),dict):
        raise ValueError('Unsupported or damaged memory; preserve it and inspect before editing.')
    return data

def write(path, data):
    path.parent.mkdir(parents=True,exist_ok=True,mode=0o700)
    fd,tmp=tempfile.mkstemp(prefix='.sumi-',dir=path.parent)
    try:
        with os.fdopen(fd,'w',encoding='utf-8') as f:
            json.dump(data,f,indent=2,ensure_ascii=False); f.write('\n')
        os.chmod(tmp,0o600)
        os.replace(tmp,path)
    finally:
        if os.path.exists(tmp): os.unlink(tmp)

def validate(key,value,reason):
    if key not in CHOICES and key not in TEXT_KEYS:
        raise ValueError('Not a supported preference. Secrets and arbitrary notes are not accepted.')
    if key in CHOICES and value not in CHOICES[key]:
        raise ValueError('Choose one of: '+', '.join(sorted(CHOICES[key])))
    if not value.strip() or len(value)>160 or any(ord(c)<32 for c in value):
        raise ValueError('Use a short single-line preference.')
    if re.search(r'(?i)(sk[-_][a-z0-9]{12,}|bearer\s|api[_ -]?key\s*[:=]|password\s*[:=])',value+' '+reason):
        raise ValueError('This resembles a credential; use an OS credential store instead.')
    if not reason.strip() or len(reason)>240 or '\n' in reason:
        raise ValueError('Give a short source/reason for this explicit user preference.')

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--state-dir',type=Path)
    sub=p.add_subparsers(dest='action',required=True)
    sub.add_parser('show')
    a=sub.add_parser('set'); a.add_argument('key'); a.add_argument('value'); a.add_argument('--reason',required=True)
    a=sub.add_parser('forget'); a.add_argument('key',choices=sorted(set(CHOICES)|TEXT_KEYS))
    a=sub.add_parser('mark'); a.add_argument('event',choices=['installation','first_run']); a.add_argument('--version',default=VERSION)
    args=p.parse_args(); path=(args.state_dir or default_dir()).expanduser().resolve()/'user.json'
    try:
        data=read(path)
        if args.action=='set':
            validate(args.key,args.value,args.reason)
            data['preferences'][args.key]={'value':args.value,'reason':args.reason,'updated_at':now()}
        elif args.action=='forget': data['preferences'].pop(args.key,None)
        elif args.action=='mark': data['onboarding'][args.event]={'shown_at':now(),'version':args.version}
        if args.action!='show': write(path,data)
        print(json.dumps({'path':str(path),'memory':data,
                          'current_styles':list(STYLES),
                          'legacy_preferences':legacy_preferences(data)},indent=2,ensure_ascii=False))
    except (ValueError,OSError) as e: p.exit(1,f'Memory not changed: {e}\n')

if __name__=='__main__': main()
