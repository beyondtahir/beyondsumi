#!/usr/bin/env python3
"""Read-only dependency doctor. Installs nothing."""
import argparse
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import platform
import re
import shutil
import subprocess
import sys
import urllib.request
from sumi_catalog import VERSION, CATALOG_ID, STYLES

def command_argv(argv, windows=None):
    """npm is a .cmd launcher on Windows; invoke it through the OS command interpreter."""
    windows = os.name == 'nt' if windows is None else windows
    if windows and str(argv[0]).lower().endswith(('.cmd','.bat')):
        return [os.environ.get('COMSPEC','cmd.exe'),'/d','/s','/c',subprocess.list2cmdline(argv)]
    return argv

def run(argv, cwd=None):
    try:
        r=subprocess.run(command_argv(argv),cwd=cwd,capture_output=True,text=True,timeout=15)
        return {'exit_code':r.returncode,'output':(r.stdout or r.stderr).strip()[:2500]}
    except (OSError,subprocess.TimeoutExpired) as e:
        return {'exit_code':None,'output':type(e).__name__}

def command(name,args=('--version',),minimum=None):
    path=shutil.which(name)
    if not path: return {'status':'not_found_on_PATH','path':None}
    result=run([path,*args]); out=result['output']
    status='available' if result['exit_code']==0 else 'needs_checking'
    match=re.search(r'(\d+)\.(\d+)',out)
    if status=='available' and minimum:
        if not match: status='needs_checking'
        elif tuple(map(int,match.groups()))<minimum: status='incompatible'
    return {'status':status,'path':path,'version':out.splitlines()[0] if out else None}

def app_paths():
    home=Path.home()
    chrome=[Path('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'),home/'Applications/Google Chrome.app/Contents/MacOS/Google Chrome']
    voicebox=[Path('/Applications/Voicebox.app'),home/'Applications/Voicebox.app']
    if os.name=='nt':
        for env in ['LOCALAPPDATA','PROGRAMFILES','PROGRAMFILES(X86)']:
            base=os.environ.get(env)
            if base:
                chrome.append(Path(base)/'Google/Chrome/Application/chrome.exe')
                voicebox += [Path(base)/'Voicebox/Voicebox.exe',Path(base)/'voicebox/voicebox.exe']
    for name in ['google-chrome','google-chrome-stable','chromium','chromium-browser']:
        found=shutil.which(name)
        if found: chrome.append(Path(found))
    found=shutil.which('voicebox')
    if found: voicebox.append(Path(found))
    return {'chrome':next((str(p) for p in chrome if p.is_file()),None),
            'voicebox':next((str(p) for p in voicebox if p.exists()),None)}

def memory_gib():
    try:
        if sys.platform=='darwin':
            return round(int(run(['/usr/sbin/sysctl','-n','hw.memsize'])['output'])/2**30,1)
        if sys.platform.startswith('linux'):
            return round(int(re.search(r'MemTotal:\s+(\d+)',Path('/proc/meminfo').read_text()).group(1))*1024/2**30,1)
        if os.name=='nt':
            import ctypes
            class Status(ctypes.Structure):
                _fields_=[('length',ctypes.c_ulong),('load',ctypes.c_ulong)]+[(name,ctypes.c_ulonglong) for name in ['total','available','page_total','page_available','virtual_total','virtual_available','extended']]
            s=Status();s.length=ctypes.sizeof(s)
            if ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(s)): return round(s.total/2**30,1)
    except (OSError,ValueError,AttributeError): pass
    return None

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self,*args,**kwargs): return None

def voicebox_status(port=17493):
    # Only loopback, no proxy, no model downloads or generation. Do not return profile/audio data.
    opener=urllib.request.build_opener(urllib.request.ProxyHandler({}),NoRedirect())
    result={'url':f'http://127.0.0.1:{port}','status':'not_reachable','models':[]}
    try:
        with opener.open(result['url']+'/models/status',timeout=2) as response:
            raw=response.read(1024*1024+1)
        if len(raw)>1024*1024: raise ValueError('Oversized local response')
        data=json.loads(raw)
        models=data.get('models') if isinstance(data,dict) else None
        if not isinstance(models,list): raise ValueError('Unknown model status schema')
        result['status']='responding'
        result['models']=[{k:m.get(k) for k in ['model_name','display_name','downloaded','loaded','size_mb']} for m in models if isinstance(m,dict)]
    except (OSError,ValueError): pass
    return result

def doctor(project=None,check_voicebox=False,port=17493):
    apps=app_paths()
    tools={n:command(n,args=('-version',)) for n in ['ffmpeg','ffprobe']}
    tools['node']=command('node',minimum=(22,0))
    tools['python']={'status':'available' if sys.version_info>=(3,9) else 'incompatible','path':sys.executable,'version':platform.python_version()}
    for name,path in apps.items(): tools[name]={'status':'found_not_runtime_tested' if path else 'not_found_in_known_locations','path':path}
    result={'version':VERSION,'catalog':CATALOG_ID,'styles':[{'id':key,'name':value['name']} for key,value in STYLES.items()],
            'checked_at':datetime.now(timezone.utc).isoformat(),'system':platform.system(),'architecture':platform.machine(),
            'ram_gib':memory_gib(),'free_disk_gib':round(shutil.disk_usage(project or Path.cwd()).free/2**30,1),'tools':tools,
            'image_generation':{'status':'unknown','next_action':'Host agent must inspect callable image tools/MCP before selecting artwork route.'},
            'cost_notes':{'library_music':'Free bundled music themes','voicebox':'Optional free local app; selected model download and hardware required','elevenlabs':'Optional account allowance/paid usage; no key is read by this doctor'}}
    if check_voicebox: result['voicebox_server']=voicebox_status(port)
    return result

def main():
    p=argparse.ArgumentParser(description=__doc__);sub=p.add_subparsers(dest='action',required=True)
    d=sub.add_parser('doctor');d.add_argument('--voicebox',action='store_true');d.add_argument('--voicebox-port',type=int,default=17493)
    a=p.parse_args()
    try:
        if not 1<=a.voicebox_port<=65535: raise ValueError('Invalid local port.')
        result=doctor(None,a.voicebox,a.voicebox_port)
        print(json.dumps(result,indent=2,ensure_ascii=False))
    except (OSError,ValueError,subprocess.SubprocessError) as e:p.exit(1,f'Setup stopped: {e}\n')

if __name__=='__main__':main()
