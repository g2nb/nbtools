import os
import json
import logging
from pathlib import Path
from IPython import get_ipython


def load_settings():
    """Attempt to load the nbtools settings file, fall back to default if not loaded"""
    try:
        with open(os.path.join(str(Path.home()), '.ipython', 'nbtools.json'), 'r') as settings_file:
            return json.load(settings_file)
    except FileNotFoundError as e:
        logging.debug(f'nbtools setting file not found: {e}')
    except json.JSONDecodeError as e:
        logging.debug(f'unable to parse nbtools setting file: {e}')

    # If it couldn't be loaded, return the default settings
    return {"load": ["nbtools", "genepattern"]}  # FIXME: Special case for genepattern should be removed


def import_defaults():
    settings = load_settings()
    for module in settings['load']:
        get_ipython().run_cell(f'import {module}')
