"""The three Beyondsumi styles, read from the shared assets/catalog.json."""
import json
from pathlib import Path

_DATA = json.loads((Path(__file__).resolve().parents[1] / 'assets/catalog.json').read_text())
VERSION = _DATA['version']
CATALOG_ID = _DATA['catalog_id']
OUTPUT_FPS = _DATA['output_fps']
CELLS_PER_SHEET = _DATA['cells_per_sheet']
STYLES = _DATA['styles']

# Style ids from version 1. A saved preference using one is reported as old, never silently translated.
LEGACY_METHODS = {"sumi-original": "v1", "sumi-light": "v1", "sumi-dark": "v1", "living-ink": "v1", "drawn-acting": "v1",
                  "sumi-brush": "v1", "sumi-graphic": "v1"}
