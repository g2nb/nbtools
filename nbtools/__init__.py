"""
nbtools

A framework for creating user-friendly widgets and tools in Jupyter Notebook.
"""


# Import nbtools functionality
from .jupyter_extensions import (load_ipython_extension, load_jupyter_server_extension, _jupyter_server_extension_paths, _jupyter_nbextension_paths)
from .widgets import build_ui,UIBuilder, UIOutput, open
from .manager import NBTool, list, modified, register, unregister, tool
from .r_support import r_build_ui


__author__ = 'Thorin Tabor'
__copyright__ = 'Copyright 2016-2019, Regents of the University of California & Broad Institute'
__version__ = '19.09'
__status__ = 'Beta'
__license__ = 'BSD'