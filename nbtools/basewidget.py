from ipywidgets import DOMWidget
from .tool_manager import NBTool


class BaseWidget(DOMWidget, NBTool):
    id = None
    origin = None

    def __init__(self, **kwargs):
        super(BaseWidget, self).__init__(**kwargs)

        # Set origin and id defaults
        self.origin = 'Notebook'
        self.id = self.__hash__() if self.id is None else self.id

        for key, value in kwargs.items():
            setattr(self, key, value)
