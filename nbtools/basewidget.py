from ipywidgets import DOMWidget


class BaseWidget(DOMWidget):
    id = None
    origin = None

    def __init__(self, **kwargs):
        super(BaseWidget, self).__init__(**kwargs)

        # Set origin and id defaults
        self.origin = 'Notebook'
        self.id = self.__hash__()

        for key, value in kwargs.items():
            setattr(self, key, value)
