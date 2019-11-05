import builtins
import inspect
import functools
import re
import urllib.request
from numbers import Integral, Real

from IPython.core.display import display
from traitlets import Unicode, List, Bool, Dict, Instance
from ipython_genutils.py3compat import string_types, unicode_type
from ipywidgets import DOMWidget, interactive, widget_serialization, Output, Text, Checkbox, IntSlider, FloatSlider, GridBox, Label, Layout, ValueWidget
from ._frontend import module_name, module_version


def open(path_or_url):
    """
    Wrapper for opening an IO object to a local file or URL
    :param path_or_url:
    :return:
    """
    is_url = re.compile(
        r'^(?:http|ftp)s?://'  # http:// or https://
        r'(?:(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+(?:[A-Z]{2,6}\.?|[A-Z0-9-]{2,}\.?)|'  # domain...
        r'localhost|'  # localhost...
        r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})'  # ...or ip
        r'(?::\d+)?'  # optional port
        r'(?:/?|[/?]\S+)$', re.IGNORECASE)

    if re.match(is_url, path_or_url):
        return urllib.request.urlopen(path_or_url)
    else:
        return builtins.open(path_or_url)


class build_ui:
    """
    Decorator used to display the UI Builder upon definition of a function.

    Example:
        @nbtools.build_ui
        def example_function(arg1, arg2):
            return (arg1, arg2)

    Example:
        @nbtools.build_ui(name="custom name", description="custom description")
        def example_function(arg1, arg2):
            return (arg1, arg2)
    """
    func = None
    kwargs = None
    __widget__ = None

    def __init__(self, *args, **kwargs):
        import nbtools

        # Display if decorator with no arguments
        if len(args) > 0:
            self.func = args[0]                                 # Set the function
            self.__widget__ = UIBuilder(self.func)              # Set the widget
            self.func.__dict__["__widget__"] = self.__widget__  # Ensure function has access to widget
            nbtools.register(self.__widget__)

            # Display if defined directly in a notebook
            # Don't display if loading from a library
            if self.func.__module__ == "__main__":
                display(self.__widget__)
        else:
            # Save the kwargs for decorators with arguments
            self.kwargs = kwargs

    def __call__(self, *args, **kwargs):
        import nbtools

        # Decorators with arguments make this call at define time, while decorators without
        # arguments make this call at runtime. That's the reason for this madness.

        # Figure out what type of call this is
        if self.func is None:
            # This is a call at define time for a decorator with arguments
            self.func = args[0]                                                  # Set the function
            self.__widget__ = UIBuilder(self.func, **self.kwargs)                # Set the widget
            self.func.__dict__["__widget__"] = self.__widget__                   # Ensure function has access to widget
            self.func._ipython_display_ = self._ipython_display_                 # Render widget when function returned
            nbtools.register(self.__widget__)

            if self.func.__module__ == "__main__":  # Don't automatically display if loaded from library
                display(self.__widget__)            # Display if defined in a notebook

            # Return wrapped function
            @functools.wraps(self.func)
            def decorated(*args, **kwargs):
                return self.func(*args, **kwargs)
            return decorated

        # This is a call at runtime for a decorator without arguments
        else:
            # Just call the function
            return self.func(*args, **kwargs)

    def _ipython_display_(self):
        """Display widget when returned in a notebook cell"""
        display(self.__widget__)


class TextFormInput(GridBox, ValueWidget):
    label = Label(layout=Layout(width='auto', grid_area='label'))
    input = Text(layout=Layout(width='auto', grid_area='input'))
    description = Label(layout=Layout(width='auto', grid_area='description'))

    def __init__(self, spec, **kwargs):
        self._apply_spec(spec)
        GridBox.__init__(self, [self.label, self.input, self.description], _dom_classes=['nbtools-textinput'], layout=Layout(
                width='100%',
                grid_template_rows='auto auto',
                grid_template_columns='25% 75%',
                grid_template_areas='''
                    "label input"
                    ". description"
                '''), **kwargs)

    @property
    def value(self):
        return self.input.value

    @value.setter
    def value(self, val):
        self.input.value = val

    def _apply_spec(self, spec):
        """Apply the parameter spec to the widget"""
        # TODO: Handle other parameter attributes like hide=True here
        # Set self.label.description=spec.name etc.?
        self.label.value = spec['label']
        self.label.description = spec['label']

        self.input.value = spec['default']

        self.description.value = spec['description']
        self.description.description = spec['description']


class InteractiveForm(interactive):
    def __init__(self, function_or_method, parameter_specs, **kwargs):
        # Create parameter widgets from spec and add to kwargs
        self.widgets_from_spec(parameter_specs, kwargs)

        # Call the superclass constructor
        interactive.__init__(self, function_or_method, {
            'manual': True,
            'manual_name': 'Run',
            'auto_display': False
        }, **kwargs)

        # Don't display the output as a child widget
        self.children = self.children[:len(self.children)-1]

    def widgets_from_spec(self, parameter_specs, kwargs):
        """Iterate over each parameter spec and create a form widget"""
        for spec in parameter_specs:
            param_name = spec['name']
            kwargs[param_name] = self.widget_from_spec(spec)

    @staticmethod
    def widget_from_spec(spec):
        """Instantiate a widget based on the default value in the spec"""
        default_value = spec['default']
        # TODO: Handle type override

        if isinstance(default_value, string_types):
            return TextFormInput(spec, value=unicode_type(default_value))
        elif isinstance(default_value, bool):
            return Checkbox(value=default_value)
        elif isinstance(default_value, Integral):
            min, max, value = super._get_min_max_value(None, None, default_value)
            return IntSlider(value=default_value, min=min, max=max)
        elif isinstance(default_value, Real):
            min, max, value = super._get_min_max_value(None, None, default_value)
            return FloatSlider(value=default_value, min=min, max=max)
        else:
            return Text(value=unicode_type(default_value))


class UIBuilder(DOMWidget):
    """
    Widget used to render Python output in a UI
    """
    _model_name = Unicode('UIBuilderModel').tag(sync=True)
    _model_module = Unicode(module_name).tag(sync=True)
    _model_module_version = Unicode(module_version).tag(sync=True)

    _view_name = Unicode('UIBuilderView').tag(sync=True)
    _view_module = Unicode(module_name).tag(sync=True)
    _view_module_version = Unicode(module_version).tag(sync=True)

    # Declare the Traitlet values for the widget
    name = Unicode(sync=True)
    description = Unicode(sync=True)
    output_var = Unicode(sync=True)
    origin = Unicode(sync=True)
    parameters = List(sync=True)
    function_import = Unicode(sync=True)  # Deprecated
    register_tool = Bool(sync=True)
    collapse = Bool(sync=True)
    events = Dict(sync=True)
    form = Instance(InteractiveForm, (None, [])).tag(sync=True, **widget_serialization)
    output = Instance(Output, ()).tag(sync=True, **widget_serialization)
    function_or_method = None

    def __init__(self, function_or_method, **kwargs):
        DOMWidget.__init__(self, **kwargs)

        # Apply defaults based on function docstring/annotations
        self._apply_defaults(function_or_method)

        # Apply custom overrides
        kwargs['function_or_method'] = function_or_method
        for key, value in kwargs.items():
            if key == 'parameters': self._param_customs(value)  # Special handling for params
            else: setattr(self, key, value)

        # Create the form and output child widgets
        self.form = InteractiveForm(function_or_method, self.parameters)
        self.output = self.form.out

        # Display the output underneath the UI Builder widget
        self.on_displayed(lambda widget: display(widget.output))

    def _apply_defaults(self, function_or_method):
        # Set the name based on the function name
        self.name = function_or_method.__qualname__

        # Set the description based on the docstring
        self.description = inspect.getdoc(function_or_method) or ''

        # Set the origin based on the package name or "Notebook"
        self.origin = 'Notebook' if function_or_method.__module__ == '__main__' else function_or_method.__module__

        # register_tool and collapse are True by default
        self.register_tool = True
        self.collapse = True

        # Read parameters, values and annotations from the signature
        sig = inspect.signature(function_or_method)
        self.parameters = self._param_defaults(sig)

    @staticmethod
    def _param_defaults(sig):
        """Read params, values and annotations from the signature"""
        params = []  # Return a list of parameter dicts

        for param in sig.parameters.values():
            params.append({
                "name": param.name,
                "label": param.name,
                "optional": param.default != inspect.Signature.empty,
                "default": UIBuilder._safe_default(param.default),
                "value": UIBuilder._safe_default(param.default),
                "description": param.annotation if param.annotation != inspect.Signature.empty else '',
                "hide": False,
                "type": UIBuilder._guess_type(param.default),
                "kinds": None,
                "choices": UIBuilder._choice_defaults(param),
                "id": None,
                "events": None
            })

        return params

    def _param_customs(self, customs):
        """Apply custom overrides to parameters"""
        for param in self.parameters:   # Iterate over parameters
            if param['name'] in customs:  # If there are custom values
                for key, value in customs.items():
                    if key == 'name': customs['label'] = value  # Override display name only
                    else: setattr(param, key, value)

        # TODO: Special handling for output_var

    @staticmethod
    def _safe_default(default):
        """If not safe to serialize in a traitlet, cast to a string"""
        if default == inspect.Signature.empty: return ''
        elif isinstance(default, (int, str, bool, float)): return default
        else: return str(default)

    @staticmethod
    def _guess_type(val):
        """Guess the input type of the parameter based off the default value, if unknown use text"""
        if isinstance(val, bool): return "choice"
        elif isinstance(val, int): return "number"
        elif isinstance(val, float): return "number"
        elif isinstance(val, str): return "text"
        elif hasattr(val, 'read'): return "file"
        else: return "text"

    @staticmethod
    def _choice_defaults(param):
        # Handle boolean parameters
        if isinstance(param.default, bool):
            return { 'True': True, 'False': False }
        # TODO: Handle enums here in the future
        else:
            return None
