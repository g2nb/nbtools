from ipywidgets import VBox, widget_serialization
from traitlets import Unicode, List, Dict, Instance
from ._frontend import module_name, module_version
from .basewidget import BaseWidget


class UIOutput(BaseWidget):
    """
    Widget used to render Python output in a UI
    """
    _model_name = Unicode('UIOutputModel').tag(sync=True)
    _model_module = Unicode(module_name).tag(sync=True)
    _model_module_version = Unicode(module_version).tag(sync=True)

    _view_name = Unicode('UIOutputView').tag(sync=True)
    _view_module = Unicode(module_name).tag(sync=True)
    _view_module_version = Unicode(module_version).tag(sync=True)

    name = Unicode('Python Results').tag(sync=True)
    status = Unicode('').tag(sync=True)
    files = List(Unicode, []).tag(sync=True)
    text = Unicode('').tag(sync=True)
    visualization = Unicode('').tag(sync=True)
    appendix = Instance(VBox).tag(sync=True, **widget_serialization)
    extra_menu_items = Dict().tag(sync=True)

    def __init__(self, **kwargs):
        # Initialize the child widget container
        self.appendix = VBox()

        BaseWidget.__init__(self, **kwargs)
