import inspect
import functools
import warnings

from IPython.core.display import display
from traitlets import Unicode, List, Bool, Dict, Instance, observe
from ipywidgets import widget_serialization, Output
from ._frontend import module_name, module_version
from .form import InteractiveForm
from .basewidget import BaseWidget
from .tool_manager import ToolManager, NBTool


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
        # Display if decorator with no arguments
        if len(args) > 0:
            self.func = args[0]                                 # Set the function
            self.__widget__ = UIBuilder(self.func)              # Set the widget
            self.func.__dict__["__widget__"] = self.__widget__  # Ensure function has access to widget
            if self.__widget__.register_tool:
                ToolManager.instance().register(self.__widget__)

            # Display if defined directly in a notebook
            # Don't display if loading from a library
            if self.func.__module__ == "__main__":
                display(self.__widget__)
        else:
            # Save the kwargs for decorators with arguments
            self.kwargs = kwargs

    def __call__(self, *args, **kwargs):
        # Decorators with arguments make this call at define time, while decorators without
        # arguments make this call at runtime. That's the reason for this madness.

        # Figure out what type of call this is
        if self.func is None:
            # This is a call at define time for a decorator with arguments
            self.func = args[0]                                                  # Set the function
            self.__widget__ = UIBuilder(self.func, **self.kwargs)                # Set the widget
            self.func.__dict__["__widget__"] = self.__widget__                   # Ensure function has access to widget
            self.func._ipython_display_ = self._ipython_display_                 # Render widget when function returned
            if self.__widget__.register_tool:
                ToolManager.instance().register(self.__widget__)

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


class UIBuilder(BaseWidget, NBTool):
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
    output_var = Unicode(sync=True)
    _parameters = List(sync=True)
    parameter_groups = List(sync=True)
    function_import = Unicode(sync=True)  # Deprecated
    register_tool = Bool(True, sync=True)
    collapse = Bool(sync=True)
    events = Dict(sync=True)
    buttons = Dict(sync=True)
    license = Dict(sync=True)
    display_header = Bool(True, sync=True)
    display_footer = Bool(True, sync=True)
    run_label = Unicode('Run', sync=True)
    busy = Bool(False, sync=True)
    form = Instance(InteractiveForm, (None, [])).tag(sync=True, **widget_serialization)
    output = Instance(Output, ()).tag(sync=True, **widget_serialization)

    # Declare other properties
    function_or_method = None
    upload_callback = None
    license_callback = None

    def __init__(self, function_or_method, **kwargs):
        # Apply defaults based on function docstring/annotations
        self._apply_defaults(function_or_method)

        # Set the function and call superclass constructor
        self.function_or_method = function_or_method
        BaseWidget.__init__(self, **kwargs)

        # Give deprecation warnings
        self._deprecation_warnings(kwargs)

        # Force the parameters setter to be called before instantiating the form
        # This is a hack necessary to prevent interact from throwing an error if parameters override is given
        if not self.parameters: self.parameters = self.parameters

        # Create the form and output child widgets
        self.form = InteractiveForm(function_or_method, self.parameters, parent=self, upload_callback=self.upload_callback)
        self.output = self.form.out

        # Display the output underneath the UI Builder widget
        self.on_displayed(lambda widget: display(widget.output))

    def _apply_defaults(self, function_or_method):
        # Set the name based on the function name
        self.name = function_or_method.__qualname__
        self.id = function_or_method.__qualname__

        # Set the description based on the docstring
        self.description = inspect.getdoc(function_or_method) or ''

        # Set the origin based on the package name or "Notebook"
        self.origin = 'Notebook' if function_or_method.__module__ == '__main__' else function_or_method.__module__

        # register_tool and collapse are True by default
        self.register_tool = True
        self.collapse = True

    @property
    def parameters(self):
        return self._parameters

    @parameters.setter
    def parameters(self, value):
        # Read parameters, values and annotations from the signature
        sig = inspect.signature(self.function_or_method)
        defaults = self._param_defaults(sig)

        # Merge the default parameter values with the custom overrides
        self._parameters = self._param_customs(defaults, value)

    @observe('license')
    def execute_license_callback(self, change):
        new_model = change["new"]  # Get the new license model being saved
        # If a callback is defined and the license['callback'] is True, make the callback
        if 'callback' in new_model and new_model['callback'] and self.license_callback: self.license_callback()

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

        # Special case for output_var
        params.append({
            "name": 'output_var',
            "label": 'output variable',
            "optional": True,
            "default": '',
            "value": '',
            "description": '',
            "hide": True,
            "type": 'text',
            "kinds": None,
            "choices": {},
            "id": None,
            "events": None
        })

        return params

    def _param_customs(self, defaults, customs):
        """Apply custom overrides to parameter defaults"""
        for param in defaults:   # Iterate over parameters
            if param['name'] in customs:  # If there are custom values
                for key, value in customs[param['name']].items():
                    if key == 'name': param['label'] = value  # Override display name only
                    else:
                        param[key] = value

        return defaults

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
            return {}

    @staticmethod
    def _deprecation_warnings(kwargs):
        if 'function_import' in kwargs:
            warnings.warn(DeprecationWarning('UI Builder specifies function_import, which is deprecated'))

    def id(self):
        """Return the function name regardless of custom display name"""
        return self.function_or_method.__qualname__
