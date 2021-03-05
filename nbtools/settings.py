import os
import json
import logging
import jupyter_core.paths
from IPython import get_ipython


def load_settings():
    """Attempt to load the nbtools settings files, fall back to default if not available"""
    load = []
    for p in jupyter_core.paths.jupyter_path():                                         # Get Jupyter data paths
        nbtools_path = os.path.join(p, 'nbtools')
        if os.path.exists(nbtools_path) and os.path.isdir(nbtools_path):                # Check for nbtools config
            json_files = [j for j in os.listdir(nbtools_path) if j.endswith('.json')]   # Check for json in config dir
            for jf in json_files:                                                       # Loop over json files
                try:
                    with open(os.path.join(nbtools_path, jf)) as json_file:             # Load and parse
                        data = json.load(json_file)
                        if 'load' in data and type(data['load']) is list:               # Ensure correct json format
                            load += data['load']                                        # Add packages to load list
                except FileNotFoundError as e:
                    logging.debug(f'nbtools setting file not found: {e}')
                except json.JSONDecodeError as e:
                    logging.debug(f'unable to parse nbtools setting file: {e}')

    # If packages were read, return the list to load
    if len(load): return {"load": list(set(load))}
    # If it couldn't be loaded, return the default settings
    else: return {"load": ["nbtools"]}


def import_defaults():
    settings = load_settings()
    for module in settings['load']:
        if module == 'nbtools':  # Special case so that nbtools import detection works
            get_ipython().run_cell(f'import nbtools as _nbtools')
        else:
            get_ipython().run_cell(f'import {module}')
