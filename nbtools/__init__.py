import json
from pathlib import Path

from .tool_manager import ToolManager, NBTool, tool
from .event_manager import EventManager
from .nbextension import _jupyter_nbextension_paths
from .uioutput import UIOutput
from .uibuilder import UIBuilder, build_ui
from .settings import load_settings, import_defaults
from .utils import open, python_safe
from .handlers import setup_handlers


HERE = Path(__file__).parent.resolve()

with (HERE / "labextension" / "package.json").open() as fid:
    data = json.load(fid)

def _jupyter_labextension_paths():
    return [{
        "src": "labextension",
        "dest": data["name"]
    }]


def _jupyter_server_extension_points():
    return [{
        "module": "nbtools"
    }]


def _load_jupyter_server_extension(server_app):
    """Registers the API handler to receive HTTP requests from the frontend extension.

    Parameters
    ----------
    server_app: jupyterlab.labapp.LabApp
        JupyterLab application instance
    """
    setup_handlers(server_app.web_app)
    name = "nbtools"
    server_app.log.info(f"Registered {name} server extension")


def _fetch_version():
    for settings in HERE.rglob("package.json"):
        try:
            with settings.open() as f:
                return json.load(f)["version"]
        except FileNotFoundError:
            pass

    raise FileNotFoundError(f"Could not find package.json under dir {HERE!s}")


__version__ = _fetch_version()
