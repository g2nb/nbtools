"""
Notebook Tool Manager
"""

__author__ = 'Thorin Tabor'
__version__ = '0.1.0'
__status__ = 'Beta'
__license__ = 'BSD-style'


from traitlets import Unicode, Integer, Dict, List
from ipywidgets import widgets


class NBToolWidget(widgets.DOMWidget):
    """
    Widget object used to coordinate Python and JavaScript components of the Notebook Tool Manager
    """
    _view_name = Unicode('NBToolView').tag(sync=True)
    _view_module = Unicode('nbtools').tag(sync=True)

    tools = Dict(sync=True)
    next_id = Integer(0).tag(sync=True)

    def __init__(self, **kwargs):
        widgets.DOMWidget.__init__(self, **kwargs)
        self.errors = widgets.CallbackDispatcher(accepted_nargs=[0, 1])
        self.on_msg(self._handle_custom_msg)

    def _handle_custom_msg(self, content, **kwargs):
        if 'event' in content and content['event'] == 'error':
            self.errors()
            self.errors(self)


def _jupyter_server_extension_paths():
    return [{
        "module": "nbtools"
    }]


def _jupyter_nbextension_paths():
    return [dict(
        section="notebook",
        # the path is relative to the `my_fancy_module` directory
        src="static",
        # directory in the `nbextension/` namespace
        dest="nbtools",
        # _also_ in the `nbextension/` namespace
        require="nbtools/nbtools")]


def load_jupyter_server_extension(nbapp):
    nbtool_manager = NBToolWidget()
    nbapp.log.info("Notebook Tool Manager enabled!")
