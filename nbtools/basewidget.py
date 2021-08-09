from ipywidgets import DOMWidget
from traitlets import Bool, Unicode, Dict
from ._frontend import module_name, module_version
import warnings


class BaseWidget(DOMWidget):
    _model_name = Unicode('BaseWidgettModel').tag(sync=True)
    _model_module = Unicode(module_name).tag(sync=True)
    _model_module_version = Unicode(module_version).tag(sync=True)

    _view_name = Unicode('BaseWidgetView').tag(sync=True)
    _view_module = Unicode(module_name).tag(sync=True)
    _view_module_version = Unicode(module_version).tag(sync=True)

    name = Unicode('').tag(sync=True)
    subtitle = Unicode('').tag(sync=True)
    description = Unicode('').tag(sync=True)
    collapsed = Bool(False).tag(sync=True)
    color = Unicode('var(--jp-layout-color4)').tag(sync=True)
    logo = Unicode('').tag(sync=True)
    info = Unicode('', sync=True)
    error = Unicode('', sync=True)
    extra_menu_items = Dict(sync=True)

    def handle_messages(self, _, content, buffers):
        """Handle messages sent from the client-side"""
        if content.get('event', '') == 'method':  # Handle method call events
            method_name = content.get('method', '')
            if method_name and hasattr(self, method_name):
                getattr(self, method_name)()

    def __init__(self, **kwargs):
        super(BaseWidget, self).__init__(**kwargs)

        # Assign keyword parameters to this object
        recognized_keys = dir(self.__class__)
        for key, value in kwargs.items():
            if key not in recognized_keys and f'_{key}' not in recognized_keys:
                warnings.warn(RuntimeWarning(f'Keyword parameter {key} not recognized'))
            setattr(self, key, value)

        # Attach the callback event handler
        self.on_msg(self.handle_messages)
