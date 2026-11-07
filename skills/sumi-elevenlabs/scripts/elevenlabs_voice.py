#!/usr/bin/env python3
"""ElevenLabs Voice: dependency-free local MCP server and private key setup."""
import argparse
import base64
import binascii
from datetime import datetime, timezone
import getpass
import json
import math
import os
from pathlib import Path
import re
import socket
import subprocess
import sys
import tempfile
import urllib.error
import urllib.parse
import urllib.request
import uuid

VERSION = '1.1.1'
API = 'https://api.elevenlabs.io'
# Kept unchanged, so a key already saved in Keychain keeps working.
SERVICE = 'com.codex.personal.elevenlabs-voice'
ACCOUNT = 'elevenlabs-api-key'
MAX_TEXT = 5000
PREFERENCES = Path(os.environ.get('XDG_CONFIG_HOME', str(Path.home() / '.config'))) / 'codex-elevenlabs-voice' / 'preferences.json'

class PluginError(Exception):
    def __init__(self, message, code='request_failed', uncertain=False):
        super().__init__(message)
        self.code = code
        self.uncertain = uncertain


def keychain_key():
    if sys.platform != 'darwin':
        return None
    result = subprocess.run(['/usr/bin/security', 'find-generic-password', '-s', SERVICE,
                             '-a', ACCOUNT, '-w'], capture_output=True, text=True, timeout=30)
    return result.stdout.strip() if result.returncode == 0 else None


def read_key():
    return os.environ.get('ELEVENLABS_API_KEY', '').strip() or keychain_key()


def require_key():
    key = read_key()
    if not key:
        raise PluginError('ElevenLabs is not connected. Run '
                          'python3 scripts/elevenlabs_voice.py setup --gui from the project folder.', 'not_connected')
    return key


def store_key(key):
    if sys.platform != 'darwin':
        raise PluginError('On this platform, provide ELEVENLABS_API_KEY in the environment that starts your AI agent.', 'setup_required')
    if not re.fullmatch(r'[A-Za-z0-9_-]{16,256}', key):
        raise PluginError('Enter the API key alone, without spaces or a Bearer prefix.', 'invalid_key_format')
    # The secret enters security over stdin, never in process arguments or files.
    command = ('add-generic-password -U -s %s -a %s -l "ElevenLabs API key" '
               '-T /usr/bin/security -w %s\n' % (SERVICE, ACCOUNT, key))
    subprocess.run(['/usr/bin/security', '-i'], input=command,
                   capture_output=True, text=True, timeout=30)
    saved = keychain_key()
    if not saved or saved != key:
        raise PluginError('Could not save the key. Unlock your macOS login Keychain and retry.', 'keychain_failed')


class NoRedirect(urllib.request.HTTPRedirectHandler):
    # Do not forward a credential to a redirect target.
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def api_request(endpoint, payload=None, key=None, timeout=120):
    key = key or require_key()
    request = urllib.request.Request(API + endpoint,
        data=None if payload is None else json.dumps(payload, ensure_ascii=False).encode('utf-8'),
        headers={'xi-api-key': key, 'Accept': 'application/json', 'Content-Type': 'application/json',
                 'User-Agent': 'Beyondsumi-ElevenLabs-Voice/' + VERSION},
        method='GET' if payload is None else 'POST')
    try:
        with urllib.request.build_opener(NoRedirect()).open(request, timeout=timeout) as response:
            data = response.read(64 * 1024 * 1024 + 1)
            if len(data) > 64 * 1024 * 1024:
                raise PluginError('ElevenLabs returned more data than the local 64 MiB limit.', 'response_too_large', payload is not None)
            try:
                parsed = json.loads(data)
            except (ValueError, UnicodeError):
                raise PluginError('ElevenLabs returned an unreadable response. Do not automatically repeat a generation.', 'invalid_response', payload is not None) from None
            headers = {k.lower(): v for k, v in response.headers.items()}
            return parsed, headers
    except urllib.error.HTTPError as error:
        status = error.code
        # Error details can contain user text. Only preserve the provider's short status code.
        provider_code = ''
        try:
            detail = json.loads(error.read(16384)).get('detail', {})
            value = detail.get('status', '') if isinstance(detail, dict) else ''
            if isinstance(value, str) and re.fullmatch(r'[a-zA-Z0-9_-]{1,100}', value):
                provider_code = value
        except (ValueError, AttributeError, UnicodeError):
            pass
        message = {401: 'ElevenLabs rejected the key or a required permission. Check the API key scopes.',
                   403: 'The key does not have access to this resource or endpoint.',
                   404: 'The requested ElevenLabs voice or model was not found.',
                   422: 'ElevenLabs rejected the generation settings. Check the selected model and voice.',
                   429: 'ElevenLabs rate or credit limit reached. No automatic retry was made.'}.get(status,
                   'ElevenLabs returned HTTP %s. No automatic retry was made.' % status)
        if provider_code == 'ivc_not_permitted':
            message = 'ElevenLabs does not permit Instant Voice Cloning on this account/workspace. The API key can be valid while cloned-voice access is disabled. Use account_capabilities to check; enable cloned-voice access in ElevenLabs before retrying. Your selected voice has not been changed.'
        if provider_code:
            message += ' Provider status: ' + provider_code + '.'
        raise PluginError(message, provider_code or 'http_' + str(status), status >= 500 and payload is not None) from None
    except (urllib.error.URLError, TimeoutError, socket.timeout, ConnectionError):
        raise PluginError('Could not complete the connection to ElevenLabs. For generation requests the outcome may be unknown; inspect the saved receipt before retrying.',
                          'network_error', payload is not None) from None


def verify_key(key):
    if not re.fullmatch(r'[A-Za-z0-9_-]{16,256}', key):
        raise PluginError('Enter the API key alone, without spaces or a Bearer prefix.', 'invalid_key_format')
    data, _ = api_request('/v2/voices?page_size=1&include_total_count=false', key=key, timeout=25)
    if not isinstance(data, dict) or not isinstance(data.get('voices'), list):
        raise PluginError('ElevenLabs returned an unexpected voice-list response.', 'invalid_response')
    return True


def ask_key(gui):
    if gui:
        if sys.platform != 'darwin':
            raise PluginError('The private GUI prompt requires macOS. Run setup in your terminal instead.')
        script = '''try
set answer to display dialog "Paste your ElevenLabs API key. It will be verified with ElevenLabs and saved in macOS Keychain. Enable Voices: Read and Text to Speech: Access on this key. It will not appear in chat or plugin files." default answer "" with hidden answer buttons {"Cancel", "Connect"} default button "Connect" with title "Connect ElevenLabs Voice"
return text returned of answer
on error number -128
return ""
end try'''
        result = subprocess.run(['/usr/bin/osascript', '-e', script], capture_output=True, text=True)
        return result.stdout.strip() if result.returncode == 0 else ''
    if not sys.stdin.isatty():
        raise PluginError('Use setup --gui or run setup in your own terminal for private key entry.')
    return getpass.getpass('ElevenLabs API key (hidden): ').strip()


def connection_status(verify=False):
    key = read_key()
    result = {'configured': bool(key), 'credential_source': 'environment' if os.environ.get('ELEVENLABS_API_KEY') else 'macOS Keychain' if key else None,
              'verified': False, 'generation_tested': False}
    if verify and key:
        verify_key(key)
        result['verified'] = True
        result['verification'] = 'Voice-list access verified. Text-to-speech access is verified only by a successful generation.'
    if not key:
        result['next_step'] = 'Run python3 scripts/elevenlabs_voice.py setup --gui, or set ELEVENLABS_API_KEY.'
    return result


def list_voices(search='', page_size=20, next_page_token=None):
    query = {'page_size': page_size, 'include_total_count': 'false'}
    if search:
        query['search'] = search
    if next_page_token:
        query['next_page_token'] = next_page_token
    data, _ = api_request('/v2/voices?' + urllib.parse.urlencode(query), timeout=30)
    if not isinstance(data, dict) or not isinstance(data.get('voices'), list):
        raise PluginError('Unexpected voice-list response.', 'invalid_response')
    fields = ['voice_id', 'name', 'category', 'description', 'labels', 'preview_url', 'is_owner', 'high_quality_base_model_ids']
    return {'voices': [{k: voice.get(k) for k in fields if k in voice} for voice in data['voices']],
            'has_more': bool(data.get('has_more')), 'next_page_token': data.get('next_page_token')}


def list_models():
    data, _ = api_request('/v1/models', timeout=30)
    if not isinstance(data, list):
        raise PluginError('Unexpected model-list response.', 'invalid_response')
    fields = ['model_id', 'name', 'description', 'can_do_text_to_speech', 'can_use_style', 'can_use_speaker_boost',
              'maximum_text_length_per_request', 'max_characters_request_free_user', 'max_characters_request_subscribed_user', 'languages']
    return {'models': [{k: model.get(k) for k in fields if k in model} for model in data if model.get('can_do_text_to_speech')]}


def account_capabilities():
    data, _ = api_request('/v1/user/subscription', timeout=30)
    if not isinstance(data, dict):
        raise PluginError('Unexpected account-capabilities response.', 'invalid_response')
    fields = ['tier', 'status', 'can_use_instant_voice_cloning', 'can_use_professional_voice_cloning']
    return {k: data[k] for k in fields if k in data}


def get_preferences():
    if not PREFERENCES.exists():
        return {'default_voice': None, 'default_model_id': None}
    data = json.loads(PREFERENCES.read_text(encoding='utf-8'))
    return {'default_voice': data.get('default_voice'), 'default_model_id': data.get('default_model_id')}


def set_default_voice(voice_id, model_id=None):
    # Verify the actual saved voice. This changes only local preferences, not the ElevenLabs account.
    voice, _ = api_request('/v1/voices/' + urllib.parse.quote(voice_id, safe=''), timeout=30)
    if not isinstance(voice, dict) or voice.get('voice_id') != voice_id:
        raise PluginError('Could not verify that voice in your ElevenLabs account.', 'invalid_voice')
    data = get_preferences()
    if model_id:
        models = list_models()['models']
        if not any(m['model_id'] == model_id for m in models):
            raise PluginError('That model is not an available speech model.', 'invalid_model')
        data['default_model_id'] = model_id
    data['default_voice'] = {'voice_id': voice_id, 'name': voice.get('name'), 'category': voice.get('category')}
    PREFERENCES.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    write_json(PREFERENCES, data)
    return data


def timecode(seconds, sep=','):
    ms = round(max(0, seconds) * 1000)
    h, ms = divmod(ms, 3600000)
    m, ms = divmod(ms, 60000)
    s, ms = divmod(ms, 1000)
    return '%02d:%02d:%02d%s%03d' % (h, m, s, sep, ms)


def subtitle_cues(alignment):
    if not isinstance(alignment, dict):
        return []
    chars = alignment.get('characters', [])
    starts = alignment.get('character_start_times_seconds', [])
    ends = alignment.get('character_end_times_seconds', [])
    if not chars or not len(chars) == len(starts) == len(ends):
        return []
    if any(not isinstance(c, str) for c in chars) or any(not isinstance(n, (int, float)) or not math.isfinite(n) or n < 0 for n in starts + ends):
        return []
    if any(ends[i] < starts[i] or (i > 0 and starts[i] < starts[i-1]) for i in range(len(chars))):
        return []
    # Retain source timing, break at a word boundary, and preserve punctuation.
    text = ''.join(chars)
    expanded_start, expanded_end = [], []
    for c, a, b in zip(chars, starts, ends):
        expanded_start.extend([a]*len(c)); expanded_end.extend([b]*len(c))
    words = [(m.group(), expanded_start[m.start()], expanded_end[m.end()-1]) for m in re.finditer(r'\S+', text)]
    cues, buf, begin, end = [], [], 0, 0
    for word, a, b in words:
        if buf and (len(' '.join(buf))+1+len(word) > 72 or b-begin > 6 or a-end > .9):
            cues.append({'start': begin, 'end': max(begin+.05, end), 'text': ' '.join(buf)})
            buf = []
        if not buf:
            begin = a
        buf.append(word); end = b
        if re.search(r'[.!?。！？][”\'\"]?$', word) and end-begin >= 1:
            cues.append({'start': begin, 'end': max(begin+.05, end), 'text': ' '.join(buf)}); buf = []
    if buf:
        cues.append({'start': begin, 'end': max(begin+.05, end), 'text': ' '.join(buf)})
    return cues


def write_json(path, data):
    # Atomic receipt updates allow an interrupted paid request to be inspected.
    fd, tmp = tempfile.mkstemp(prefix='.receipt-', dir=path.parent)
    try:
        with os.fdopen(fd, 'w', encoding='utf-8') as handle:
            json.dump(data, handle, ensure_ascii=False, indent=2, allow_nan=False)
            handle.write('\n')
        os.replace(tmp, path)
    finally:
        if os.path.exists(tmp):
            os.unlink(tmp)


def generate_narration(text, output_directory, voice_id=None, name='narration', model_id=None,
                       stability=.5, similarity_boost=.75, style=None, speed=None, use_speaker_boost=None,
                       language_code=None, previous_text=None, next_text=None):
    prefs = get_preferences()
    voice_id = voice_id or (prefs.get('default_voice') or {}).get('voice_id')
    model_id = model_id or prefs.get('default_model_id') or 'eleven_multilingual_v2'
    if model_id in ('eleven_v4', 'eleven_v4_turbo'):
        raise PluginError('This bundled helper uses TTS-with-timestamps; current v4 requires a verified Text to Dialogue connector/adapter. No request was sent. Choose a supported route without changing the saved default.', 'endpoint_not_supported')
    key = require_key()
    if not voice_id or not re.fullmatch(r'[A-Za-z0-9_-]{1,100}', voice_id):
        raise PluginError('Choose an actual voice_id or configure your default with set_default_voice.', 'voice_required')
    voice_settings = {'stability': stability, 'similarity_boost': similarity_boost}
    if model_id in ('eleven_v4', 'eleven_v4_turbo'):
        if style is not None or speed is not None or use_speaker_boost is not None:
            raise PluginError('Eleven v4 supports stability and similarity_boost only. Omit style, speed and use_speaker_boost; use punctuation or supported audio tags for delivery.', 'unsupported_settings')
    else:
        if model_id.startswith('eleven_v3'):
            if stability not in (0, .5, 1):
                raise PluginError('Eleven v3 stability must be 0, 0.5 or 1.', 'unsupported_settings')
            if speed is not None:
                raise PluginError('Speed is not supported for Eleven v3. Omit speed.', 'unsupported_settings')
        for k, value in [('style', style), ('speed', speed), ('use_speaker_boost', use_speaker_boost)]:
            if value is not None:
                voice_settings[k] = value
    root = Path(output_directory).expanduser()
    if not root.is_absolute():
        raise PluginError('output_directory must be an absolute path.', 'invalid_arguments')
    root.mkdir(parents=True, exist_ok=True)
    # A fresh per-generation directory prevents accidental overwrite and preserves failures.
    job = root / (name + '-' + datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ') + '-' + uuid.uuid4().hex[:8])
    job.mkdir(mode=0o700)
    receipt_path = job / 'generation.json'
    payload = {'text': text, 'model_id': model_id, 'voice_settings': voice_settings}
    if language_code:
        payload['language_code'] = language_code
    if previous_text:
        payload['previous_text'] = previous_text
    if next_text:
        payload['next_text'] = next_text
    receipt = {'status': 'requesting', 'started_at': datetime.now(timezone.utc).isoformat(), 'voice_id': voice_id,
               'model_id': model_id, 'character_count': len(text), 'output_format': 'mp3_44100_128',
               'settings': payload['voice_settings'], 'receipt_path': str(receipt_path), 'files': {},
               'retry_policy': 'Never retry automatically. An interrupted or timed-out POST may already have consumed credits.'}
    write_json(receipt_path, receipt)
    (job / 'script.txt').write_text(text, encoding='utf-8')
    response_received = False
    try:
        data, headers = api_request('/v1/text-to-speech/' + urllib.parse.quote(voice_id, safe='') +
                         '/with-timestamps?output_format=mp3_44100_128', payload=payload, key=key)
        response_received = True
        receipt['provider_request_id'] = headers.get('request-id') or headers.get('x-request-id')
        receipt['history_item_id'] = headers.get('history-item-id')
        receipt['provider_character_cost'] = headers.get('character-cost')
        if not isinstance(data, dict) or not isinstance(data.get('audio_base64'), str):
            raise PluginError('ElevenLabs returned no audio. The request may have consumed credits.', 'missing_audio', True)
        try:
            audio = base64.b64decode(data['audio_base64'], validate=True)
        except (binascii.Error, ValueError):
            raise PluginError('ElevenLabs returned invalid audio encoding.', 'invalid_audio', True) from None
        if len(audio) < 32 or not (audio.startswith(b'ID3') or (audio[0] == 255 and audio[1] & 224 == 224)):
            raise PluginError('ElevenLabs returned data that is not a recognizable MP3.', 'invalid_audio', True)
        audio_path = job / (name + '.mp3')
        audio_path.write_bytes(audio)
        receipt['files']['audio'] = str(audio_path)
        receipt['audio_bytes'] = len(audio)
        alignment = data.get('normalized_alignment') or data.get('alignment')
        align_path = job / (name + '.timing.json')
        write_json(align_path, {'alignment': data.get('alignment'), 'normalized_alignment': data.get('normalized_alignment')})
        receipt['files']['timing'] = str(align_path)
        cues = subtitle_cues(alignment)
        receipt['timed_text_end_seconds'] = max((c['end'] for c in cues), default=None)
        # The last spoken character is not necessarily the full MP3 duration.
        if cues:
            srt = '\n\n'.join('%s\n%s --> %s\n%s' % (i+1, timecode(c['start']), timecode(c['end']), c['text']) for i,c in enumerate(cues))+'\n'
            vtt = 'WEBVTT\n\n'+'\n\n'.join('%s --> %s\n%s' % (timecode(c['start'],'.'), timecode(c['end'],'.'), c['text'].replace('-->', '→')) for c in cues)+'\n'
            for ext, body in [('srt', srt), ('vtt', vtt)]:
                f = job / (name + '.' + ext); f.write_text(body, encoding='utf-8'); receipt['files'][ext] = str(f)
        else:
            receipt['warning'] = 'Audio saved, but usable alignment was not returned. Subtitles were not fabricated.'
        receipt['files']['script'] = str(job / 'script.txt')
        receipt['status'] = 'completed'
        receipt['completed_at'] = datetime.now(timezone.utc).isoformat()
        write_json(receipt_path, receipt)
        return receipt
    except (PluginError, OSError, ValueError, TypeError) as error:
        uncertain = response_received or (isinstance(error, PluginError) and error.uncertain)
        receipt['status'] = 'outcome_unknown' if uncertain else 'failed'
        receipt['error_code'] = error.code if isinstance(error, PluginError) else 'local_write_error'
        receipt['error'] = str(error) if isinstance(error, PluginError) else 'A local output operation failed after the request began.'
        try:
            write_json(receipt_path, receipt)
        except OSError:
            pass
        raise PluginError(receipt['error']+' Inspect receipt: '+str(receipt_path), receipt['error_code'], uncertain) from None


def inspect_generation(receipt_path):
    path = Path(receipt_path).expanduser()
    if not path.is_absolute() or path.name != 'generation.json':
        raise PluginError('Use the absolute generation.json path returned by generate_narration.', 'invalid_arguments')
    if path.stat().st_size > 128000:
        raise PluginError('The receipt is unexpectedly large.', 'invalid_receipt')
    data = json.loads(path.read_text(encoding='utf-8'))
    if data.get('status') == 'requesting':
        data['warning'] = 'The request may still be running or may have been interrupted. Do not repeat the paid request automatically.'
    return data


def schema(properties=None, required=None):
    s = {'type': 'object', 'properties': properties or {}, 'additionalProperties': False}
    if required:
        s['required'] = required
    return s


def string(description, max_length=5000, **kwargs):
    return dict(type='string', description=description, maxLength=max_length, **kwargs)


def tool(name, description, inputs, readonly=True):
    return {'name': name, 'description': description, 'inputSchema': inputs,
            'annotations': {'readOnlyHint': readonly, 'destructiveHint': False, 'idempotentHint': readonly, 'openWorldHint': name != 'inspect_generation'}}

TOOLS = [
 tool('connection_status', 'Check whether ElevenLabs is connected. verify=true checks voice-list access without generating or consuming TTS credits.', schema({'verify': {'type':'boolean','default':False}})),
 tool('list_voices', 'List available ElevenLabs voices and existing preview URLs. Search names, descriptions and labels. Preserve has_more/next_page_token; a page is not the full library.', schema({'search': string('Search term.',300), 'page_size': {'type':'integer','minimum':1,'maximum':100,'default':20}, 'next_page_token': string('Pagination token from the prior result.',2000)})),
 tool('list_models', 'List currently available text-to-speech models and their capabilities. Use returned model IDs.', schema()),
 tool('account_capabilities', 'Read current plan status and whether instant/professional cloned voices are permitted. Use to diagnose ivc_not_permitted; requires account/subscription read permission. Does not purchase or change a plan.', schema()),
 tool('get_preferences', 'Read the saved default voice and model for this user. These preferences are local and persist across chats and plugin upgrades.', schema()),
 tool('set_default_voice', 'Save the user-requested default voice and optional model after verifying them with ElevenLabs. Changes only local plugin preferences; does not edit voices or generate audio.', schema({'voice_id': string('Actual voice ID returned by list_voices.',100,minLength=1,pattern='^[A-Za-z0-9_-]+$'), 'model_id': string('Optional available TTS model ID.',100,minLength=1,pattern='^[A-Za-z0-9_-]+$')}, ['voice_id']), False),
 tool('generate_narration', 'Generate ONE requested narration using the ElevenLabs API; this consumes account credits. Uses your saved default voice/model when IDs are omitted. Saves MP3, character alignment, SRT/VTT when timing is available, script and receipt to a new directory. No automatic retries. No voice cloning or account mutations.', schema({
  'text': string('Exact script to speak. Maximum 5000 characters; split longer work into intentional passages.',5000,minLength=1),
  'voice_id': string('Optional voice ID returned by list_voices. Omit to use your saved default voice.',100,minLength=1,pattern='^[A-Za-z0-9_-]+$'),
  'output_directory': string('Absolute directory for generated deliverables.',4096,minLength=1),
  'name': string('Short filename stem; no slashes or extension.',80,pattern='^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$',default='narration'),
  'model_id': string('Available TTS model ID. Uses your saved default, falling back to eleven_multilingual_v2 if none is saved.',100,pattern='^[A-Za-z0-9_-]+$'),
  'stability': {'type':'number','minimum':0,'maximum':1,'default':.5},
  'similarity_boost': {'type':'number','minimum':0,'maximum':1,'default':.75},
  'style': {'type':'number','minimum':0,'maximum':1,'description':'Optional. Omit for v4 and models without style support.'},
  'speed': {'type':'number','minimum':.7,'maximum':1.2,'description':'Optional. Omit for v3/v4. Conservative quality range for models that support speed.'},
  'use_speaker_boost': {'type':'boolean','description':'Optional. Omit for v4 and models without speaker boost.'},
  'language_code': string('Optional ISO 639-1 code, only for models that support it.',2,pattern='^[a-z]{2}$'),
  'previous_text': string('Optional preceding passage for continuity.',5000),
  'next_text': string('Optional following passage for continuity.',5000),
 }, ['text','output_directory']), False),
 tool('inspect_generation', 'Read a local generation receipt to recover saved audio paths or inspect interrupted requests without generating again.', schema({'receipt_path': string('Absolute path to generation.json from an earlier result.',4096,minLength=1)},['receipt_path']))
]
TOOL_MAP = {t['name']: t for t in TOOLS}


def validate_arguments(name, args):
    if name not in TOOL_MAP:
        raise PluginError('Unknown tool.', 'unknown_tool')
    if not isinstance(args, dict):
        raise PluginError('Tool arguments must be an object.', 'invalid_arguments')
    spec = TOOL_MAP[name]['inputSchema']
    if set(args) - set(spec['properties']):
        raise PluginError('Unknown tool argument.', 'invalid_arguments')
    for req in spec.get('required', []):
        if req not in args:
            raise PluginError('Missing required argument: '+req, 'invalid_arguments')
    for k, v in args.items():
        s = spec['properties'][k]; kind = s['type']
        valid = (isinstance(v, str) if kind == 'string' else isinstance(v, bool) if kind == 'boolean' else
                 isinstance(v, int) and not isinstance(v, bool) if kind == 'integer' else isinstance(v, (float,int)) and not isinstance(v, bool))
        if not valid:
            raise PluginError('Invalid type for '+k, 'invalid_arguments')
        if kind in ('number','integer') and (not math.isfinite(v) or v < s.get('minimum',-math.inf) or v > s.get('maximum',math.inf)):
            raise PluginError('Out-of-range value for '+k, 'invalid_arguments')
        if kind == 'string' and (len(v) < s.get('minLength',0) or len(v) > s.get('maxLength',math.inf) or ('pattern' in s and not re.fullmatch(s['pattern'],v))):
            raise PluginError('Invalid value for '+k, 'invalid_arguments')
    if name == 'generate_narration' and not args['text'].strip():
        raise PluginError('The narration text is empty.', 'invalid_arguments')
    return args


def call_tool(name, args):
    args = validate_arguments(name, args)
    return {'connection_status': connection_status, 'list_voices': list_voices, 'list_models': list_models,
            'account_capabilities': account_capabilities,
            'get_preferences': get_preferences, 'set_default_voice': set_default_voice,
            'generate_narration': generate_narration, 'inspect_generation': inspect_generation}[name](**args)


def handle_message(msg):
    if not isinstance(msg, dict) or msg.get('jsonrpc') != '2.0' or not isinstance(msg.get('method'),str):
        return {'jsonrpc':'2.0','id':msg.get('id') if isinstance(msg,dict) else None,'error':{'code':-32600,'message':'Invalid request'}}
    if 'id' not in msg:
        return None
    ident, method, params = msg['id'], msg['method'], msg.get('params', {})
    if not isinstance(params,dict):
        return {'jsonrpc':'2.0','id':ident,'error':{'code':-32602,'message':'Invalid params'}}
    if method == 'initialize':
        supported = ['2025-11-25','2025-06-18','2025-03-26','2024-11-05']
        requested = params.get('protocolVersion')
        result = {'protocolVersion':requested if requested in supported else supported[0],
                  'capabilities':{'tools':{'listChanged':False}}, 'serverInfo':{'name':'elevenlabs-voice','version':VERSION},
                  'instructions':'Read get_preferences first and use the saved default voice unless the user requests another. Use list_voices to choose a new voice. generate_narration consumes ElevenLabs credits. Never retry an uncertain generation automatically. Credentials stay in the local environment or macOS Keychain.'}
    elif method == 'ping':
        result = {}
    elif method == 'tools/list':
        result = {'tools':TOOLS}
    elif method == 'tools/call':
        try:
            data = call_tool(params.get('name'), params.get('arguments', {}))
            result = {'content':[{'type':'text','text':json.dumps(data,ensure_ascii=False)}], 'structuredContent':data,'isError':False}
        except (PluginError, OSError, ValueError, TypeError, subprocess.SubprocessError) as error:
            message = str(error) if isinstance(error,PluginError) else 'Local operation failed. Check the supplied paths or local Keychain availability.'
            data = {'error':message,'code':error.code if isinstance(error,PluginError) else 'local_error'}
            result = {'content':[{'type':'text','text':json.dumps(data)}], 'isError':True}
    else:
        return {'jsonrpc':'2.0','id':ident,'error':{'code':-32601,'message':'Method not found'}}
    return {'jsonrpc':'2.0','id':ident,'result':result}


def serve():
    # MCP stdio is newline-delimited JSON; stdout is reserved for protocol messages.
    for raw in sys.stdin.buffer:
        try:
            if len(raw) > 128000:
                raise ValueError('Request too large')
            response = handle_message(json.loads(raw))
        except (ValueError, UnicodeError):
            response = {'jsonrpc':'2.0','id':None,'error':{'code':-32700,'message':'Invalid JSON request'}}
        if response is not None:
            sys.stdout.write(json.dumps(response,ensure_ascii=False,allow_nan=False)+'\n'); sys.stdout.flush()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest='action',required=True)
    sub.add_parser('serve')
    p = sub.add_parser('setup'); p.add_argument('--gui',action='store_true')
    sub.add_parser('check')
    p = sub.add_parser('voices'); p.add_argument('--search',default=''); p.add_argument('--page-size',type=int,default=20); p.add_argument('--next-page-token')
    sub.add_parser('models')
    sub.add_parser('capabilities')
    sub.add_parser('preferences')
    p = sub.add_parser('set-default-voice'); p.add_argument('--voice-id',required=True); p.add_argument('--model-id')
    p = sub.add_parser('generate'); p.add_argument('--text-file',required=True); p.add_argument('--voice-id'); p.add_argument('--output-directory',required=True); p.add_argument('--name',default='narration'); p.add_argument('--model-id'); p.add_argument('--speed',type=float)
    p = sub.add_parser('inspect'); p.add_argument('receipt_path')
    args = parser.parse_args()
    try:
        if args.action == 'serve':
            serve(); return 0
        if args.action == 'setup':
            key = ask_key(args.gui)
            if not key:
                print('Setup cancelled. No key was saved.'); return 2
            verify_key(key); store_key(key)
            print('ElevenLabs connected. Voice-list access verified; API key saved in macOS Keychain. No speech was generated.'); return 0
        if args.action == 'check':
            result = connection_status(verify=True)
        elif args.action == 'voices':
            opts = {'search':args.search,'page_size':args.page_size}
            if args.next_page_token:
                opts['next_page_token'] = args.next_page_token
            result = call_tool('list_voices',opts)
        elif args.action == 'models':
            result = list_models()
        elif args.action == 'capabilities':
            result = account_capabilities()
        elif args.action == 'preferences':
            result = get_preferences()
        elif args.action == 'set-default-voice':
            opts = {'voice_id':args.voice_id}
            if args.model_id:
                opts['model_id'] = args.model_id
            result = call_tool('set_default_voice',opts)
        elif args.action == 'inspect':
            result = inspect_generation(args.receipt_path)
        elif args.action == 'generate':
            text = Path(args.text_file).read_text(encoding='utf-8')
            opts = {'text':text,'output_directory':args.output_directory,'name':args.name}
            for k in ('voice_id','model_id','speed'):
                if getattr(args,k) is not None:
                    opts[k] = getattr(args,k)
            result = call_tool('generate_narration',opts)
        print(json.dumps(result,ensure_ascii=False,indent=2))
        return 0
    except (PluginError,OSError,ValueError,subprocess.SubprocessError) as error:
        print('Error: '+(str(error) if isinstance(error,PluginError) else 'Local operation failed. Check paths, file permissions and Keychain availability.'),file=sys.stderr)
        return 1

if __name__ == '__main__':
    sys.exit(main())
