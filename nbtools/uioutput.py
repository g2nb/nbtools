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
    extra_file_menu_items = Dict().tag(sync=True)

    def __init__(self, **kwargs):
        # Initialize the child widget container
        self.appendix = VBox()

        BaseWidget.__init__(self, **kwargs)     # Call the superclass
        self.register_data()                    # Register any output files

    def register_data(self):
        if len(self.files):
            for f in self.files:
                from .tool_manager import DataManager, Data
                DataManager.instance().register(Data(origin=self.origin, group=self.name, uri=f))
                DataManager.instance().group_widget(origin=self.origin, group=self.name, widget=self)
