from ipywidgets import DOMWidget
from traitlets import Bool, Unicode
from ._frontend import module_name, module_version
from .tool_manager import NBTool
import warnings


class BaseWidget(DOMWidget, NBTool):
    _model_name = Unicode('BaseWidgettModel').tag(sync=True)
    _model_module = Unicode(module_name).tag(sync=True)
    _model_module_version = Unicode(module_version).tag(sync=True)

    _view_name = Unicode('BaseWidgetView').tag(sync=True)
    _view_module = Unicode(module_name).tag(sync=True)
    _view_module_version = Unicode(module_version).tag(sync=True)

    collapsed = Bool(False).tag(sync=True)

    id = None
    origin = None

    def __init__(self, **kwargs):
        super(BaseWidget, self).__init__(**kwargs)

        # Set origin and id defaults
        self.origin = 'Notebook'
        self.id = self.__hash__() if self.id is None else self.id

        for key, value in kwargs.items():
            if key not in self.keys and f'_{key}' not in self.keys:
                warnings.warn(RuntimeWarning(f'Keyword parameter {key} not recognized'))
            setattr(self, key, value)
