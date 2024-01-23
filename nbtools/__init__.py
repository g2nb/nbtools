import json
from pathlib import Path

from .tool_manager import ToolManager, NBTool, tool, DataManager, Data
from .event_manager import EventManager
from .nbextension import _jupyter_nbextension_paths
from .uioutput import UIOutput
from .uibuilder import UIBuilder, build_ui
from .settings import load_settings, import_defaults
from .utils import open, python_safe
from ._version import __version__

HERE = Path(__file__).parent.resolve()

with (HERE / "labextension" / "package.json").open() as fid:
    data = json.load(fid)

def _jupyter_labextension_paths():
    return [{
        "src": "labextension",
        "dest": data["name"]
    }]

