import json
from pathlib import Path

from .tool_manager import ToolManager, NBTool, tool
from .event_manager import EventManager
from .nbextension import _jupyter_nbextension_paths
from .uioutput import UIOutput
from .uibuilder import UIBuilder, build_ui
from .settings import load_settings, import_defaults
from .utils import open, python_safe
from ._version import __version__
from .handlers import setup_handlers


def _jupyter_labextension_paths():
    return [{
        "src": "labextension",
        "dest": "@g2nb/nbtools"
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

