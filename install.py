#!/usr/bin/env python3
"""Install the authored Sumi skill suite into a chosen host skills folder; no third-party installs."""
import argparse,json,shutil,subprocess,sys,tempfile,uuid
from datetime import datetime,timezone
from pathlib import Path

RETIRED=['sumi-svg']
NAMES=['sumi','sumi-writer','sumi-director','sumi-artist','sumi-animator','sumi-sound','sumi-checker','sumi-elevenlabs','sumi-voicebox','sumi-vector']

def install(source,root,replace=False,names=None):
    names=names or NAMES
    source=source.resolve();root=root.expanduser().absolute()
    if root.is_symlink():raise ValueError('Choose the intended real skills folder, not a symlink')
    root=root.resolve()
    if source==root or source in root.parents or root in source.parents:raise ValueError('Installation must be outside this source suite')
    for name in names:
        if name not in NAMES or not (source/'skills'/name/'SKILL.md').is_file():raise ValueError('Incomplete requested skill: '+name)
        if (root/name).is_symlink():raise ValueError('Refuse symlink skill destination')
        if (root/name).exists() and not replace:raise ValueError('Existing skill preserved; use --replace for a backed-up update')
    root.mkdir(parents=True,exist_ok=True);backup=root.parent/'sumi-suite-backups'/(datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')+'-'+uuid.uuid4().hex[:8])
    staged=Path(tempfile.mkdtemp(prefix='.sumi-suite-',dir=root.parent));moved=[];installed=[]
    try:
        for name in RETIRED if replace else []:
            old=root/name
            if old.exists() or old.is_symlink():backup.mkdir(parents=True,exist_ok=True);old.rename(backup/name);moved.append(name)
        for name in names:shutil.copytree(source/'skills'/name,staged/name,ignore=shutil.ignore_patterns('__pycache__','*.pyc','node_modules','.DS_Store'))
        for name in names:
            target=root/name
            if target.exists():backup.mkdir(parents=True,exist_ok=True);target.rename(backup/name);moved.append(name)
            (staged/name).rename(target);installed.append(name)
    except Exception:
        for name in reversed(installed):shutil.rmtree(root/name)
        for name in reversed(moved):(backup/name).rename(root/name)
        raise
    finally:shutil.rmtree(staged,ignore_errors=True)
    return {'installed':[str(root/name) for name in names],'retired':[n for n in moved if n in RETIRED],'backup':str(backup) if moved else None,'third_party_software_installed':False,'model_downloads':0,'paid_calls':0}

def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--skills-root',type=Path,required=True,help="The current host's documented skills directory; no guessed agent-specific location.");p.add_argument('--replace',action='store_true');p.add_argument('--state-dir',type=Path);p.add_argument('--only',nargs='+',choices=NAMES);a=p.parse_args()
    try:result=install(Path(__file__).resolve().parent,a.skills_root,a.replace,a.only)
    except (ValueError,OSError) as e:p.exit(1,f'Installation stopped: {e}\n')
    print(json.dumps(result,indent=2));main=a.skills_root.expanduser()/'sumi'
    if main.is_dir():
        print((main/'assets/WELCOME.txt').read_text());print('Read-only requirements check:')
        state_args=['--state-dir',str(a.state_dir)] if a.state_dir else []
        marker=subprocess.run([sys.executable,str(main/'scripts/sumi_memory.py'),*state_args,'mark','installation'],capture_output=True,text=True)
        if marker.returncode:print('Installed source; setup memory marker was not changed: '+marker.stderr.strip(),file=sys.stderr)
        subprocess.run([sys.executable,str(main/'scripts/first_run.py'),*state_args],check=True)
    else:print('Companion installed. Ask your agent to read its SKILL.md; no app/model was installed.')
    print('Ask your agent to display the welcome in chat and check its image tools. A silent ZIP import cannot display chat by itself.')
if __name__=='__main__':main()
