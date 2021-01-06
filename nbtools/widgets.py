import builtins
import inspect
import functools
import re
import urllib.request
from IPython.core.display import display
from ipywidgets import widgets
from traitlets import Unicode, List, Bool, Dict
from .manager import register


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
        # Display if decorator with no arguments
        if len(args) > 0:
            self.func = args[0]                                 # Set the function
            self.__widget__ = UIBuilder(self.func)              # Set the widget
            self.func.__dict__["__widget__"] = self.__widget__  # Ensure function has access to widget

            # Display if defined directly in a notebook
            # Don't display if loading from a library
            if self.func.__module__ == "__main__":
                display(self.__widget__)

            # Register the widget with the tool manager
            register(self.__widget__)

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

            if self.func.__module__ == "__main__":  # Don't automatically display if loaded from library
                display(self.__widget__)            # Display if defined in a notebook

            # Register the widget with the tool manager
            register(self.__widget__)

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


class UIBuilder(widgets.DOMWidget):
    """
    Widget used to render Python functions in as an input form
    """
    _view_name = Unicode('UIBuilderView').tag(sync=True)
    _view_module = Unicode('nbtools/uibuilder').tag(sync=True)

    # Declare the Traitlet values for the widget
    name = Unicode('', sync=True)
    description = Unicode('', sync=True)
    output_var = Unicode('', sync=True)
    origin = Unicode('', sync=True)
    params = List(sync=True)
    function_import = Unicode('', sync=True)
    register_tool = Bool(True, sync=True)
    collapse = Bool(True, sync=True)
    events = Dict(sync=True)
    function_or_method = None

    def __init__(self, function_or_method, **kwargs):
        widgets.DOMWidget.__init__(self, **kwargs)

        import nbtools

        # Read call signature
        sig = inspect.signature(function_or_method)

        # Read params, values and annotations from the signature
        params = self._params(sig)

        # Read docstring
        docstring = self._docstring(function_or_method)

        # Do arguments override the default name, description or output?
        custom_name = kwargs['name'] if 'name' in kwargs else None
        custom_desc = kwargs['description'] if 'description' in kwargs else None
        custom_output = kwargs['output_var'] if 'output_var' in kwargs else None
        custom_origin = kwargs['origin'] if 'origin' in kwargs else self._determine_origin(function_or_method)
        custom_import = kwargs['function_import'] if 'function_import' in kwargs else None
        custom_register = kwargs['register_tool'] if 'register_tool' in kwargs else True
        custom_collapse = kwargs['collapse'] if 'collapse' in kwargs else True

        # Apply output_var deprecation warning
        if 'output_var' in kwargs:
            print('Specifying the output variable using the output_var argument is deprecated. Use the parameters argument.')

        # Read parameter metadata
        if 'parameters' in kwargs:
            self._apply_custom_parameter_info(params, kwargs['parameters'])

        # Set the Traitlet values for the call
        self.name = custom_name or function_or_method.__qualname__
        self.description = custom_desc or docstring
        self.output_var = custom_output or ''
        self.origin = custom_origin or 'Notebook'
        self.params = params
        self.function_import = custom_import or self._import(function_or_method)
        self.register_tool = custom_register
        self.collapse = custom_collapse
        self.events = self.events
        self.function_or_method = function_or_method

        # Add widget reference to function
        if hasattr(function_or_method, '__dict__'): function_or_method.__dict__["__widget__"] = self

        # Store reference to widget
        nbtools.manager._py_funcs[self.origin + '|' + self.name + '|widget'] = self

    @staticmethod
    def _determine_origin(function_or_method):
        """Use the library name for the origin, or "Notebook" for tools defined in a notebook"""
        return "Notebook" if function_or_method.__module__ == '__main__' else function_or_method.__module__

    @staticmethod
    def _safe_type(raw_type):
        """Ensure that the provided type is a known type, defaulting to text"""
        if raw_type == 'text' or raw_type == 'number' or raw_type == 'password' or raw_type == 'choice' or raw_type == 'file':
            return raw_type
        else:
            return 'text'

    @staticmethod
    def _apply_custom_parameter_info(params, metadata):
        # If output_var is overridden as a parameter, add to the parameters list as a special case
        if 'output_var' in metadata and not any(p['name'] == 'output_var' for p in params):
            params.append({
                "name": 'output_var',
                "label": 'output_variable',
                "optional": True,
                "default": '',
                "description": 'The returned value of the function will be assigned to this variable, if provided.',
                "hide": False,
                "type": 'text',
                "kinds": None,
                "choices": [],
                "id": None,
                "events": None
            })

        # Iterate through each parameters in the function
        for param in params:  # Iterate through each parameter
            if param['name'] in metadata:  # If there is something to override
                p_meta = metadata[param['name']]

                # Handle overriding the display name
                if 'name' in p_meta:
                    param['label'] = p_meta['name']

                # Handle overriding the description
                if 'description' in p_meta:
                    param['description'] = p_meta['description']

                # Handle overriding the default value
                if 'default' in p_meta:
                    param['default'] = UIBuilder._safe_default(p_meta['default'])

                # Handle hiding the parameter
                if 'hide' in p_meta:
                    param['hide'] = p_meta['hide']

                # Handle optional parameters
                if 'optional' in p_meta:
                    param['optional'] = p_meta['optional']

                # Handle specifying the parameter's type
                if 'type' in p_meta:
                    param['type'] = UIBuilder._safe_type(p_meta['type'])

                # Handle specifying the parameter's accepted kinds
                if 'kinds' in p_meta:
                    param['kinds'] = p_meta['kinds']

                # Handle giving the parameter a list of choices
                if 'choices' in p_meta:
                    param['choices'] = p_meta['choices']

                # Handle assigning the parameter an ID
                if 'id' in p_meta:
                    param['id'] = p_meta['id']

                # Handle giving the parameter a dict of events
                if 'events' in p_meta:
                    param['events'] = p_meta['events']

    @staticmethod
    def _docstring(function_or_method):
        """Read docstring and protect against None"""
        docstring = inspect.getdoc(function_or_method)
        if docstring is None:
            docstring = ''
        return docstring

    @staticmethod
    def _is_primitive(thing):
        """Determine if the value is a primitive"""
        primitive = (int, str, bool, float)
        return isinstance(thing, primitive)

    @staticmethod
    def _safe_default(default):
        """If not safe to serialize in a traitlet, cast to a string"""

        # If the value is not a primitive, cast to string
        if not UIBuilder._is_primitive(default):
            default = str(default)
        return default

    @staticmethod
    def _guess_type(val):
        """Guess the input type of the parameter based off the default value, if unknown use text"""
        if isinstance(val, bool):
            return "choice"
        elif isinstance(val, int):
            return "number"
        elif isinstance(val, float):
            return "number"
        elif isinstance(val, str):
            return "text"
        elif hasattr(val, 'read'):
            return "file"
        else:
            return "text"

    @staticmethod
    def _params(sig):
        """Read params, values and annotations from the signature"""
        params = []
        for p in sig.parameters:
            param = sig.parameters[p]
            optional = param.default != inspect.Signature.empty
            default = UIBuilder._safe_default(param.default) if param.default != inspect.Signature.empty else ''
            annotation = param.annotation if param.annotation != inspect.Signature.empty else ''
            type = UIBuilder._guess_type(default)

            # Create the parameter attribute dict
            p_attr = {
                "name": param.name,
                "label": param.name,
                "optional": optional,
                "default": default,
                "description": annotation,
                "hide": False,
                "type": type,
                "kinds": None,
                "choices": [],
                "id": None,
                "events": None
            }

            # Special choices handling for boolean parameters
            if isinstance(default, bool):
                p_attr['choices'] = {
                    'True': 'true',
                    'False': 'false'
                }

            # Append it to the list
            params.append(p_attr)
        return params

    def _import(self, func):
        """Return the namespace path to the function"""
        # # If defined in notebook / main script, return function name
        # if func.__module__ == "__main__":
        #     return func.__name__
        #
        # # If defined in a module and the module name is in globals() return module.function()
        # if func.__module__ in globals():  # WARNING: globals() may be bugged in IPython
        #     return func.__module__ + "." + func.__name__
        #
        # # If module is not in globals(), assume the function was imported directly
        # return func.__name__

        return f'nbtools.tool(id="{self.name}", origin="{self.origin}").function_or_method'


class UIOutput(widgets.DOMWidget):
    """
    Widget used to render Python output in a UI
    """
    _view_name = Unicode('UIOutputView').tag(sync=True)
    _view_module = Unicode("nbtools/uioutput").tag(sync=True)

    name = Unicode('', sync=True)
    description = Unicode('', sync=True)
    status = Unicode('', sync=True)
    files = List(sync=True)
    text = Unicode('', sync=True)
    visualization = Unicode('', sync=True)

    def __init__(self, **kwargs):
        widgets.DOMWidget.__init__(self, **kwargs)

        # Assign the traitlets, if specified
        self.name = kwargs['name'] if 'name' in kwargs else 'Python Results'
        self.description = kwargs['description'] if 'description' in kwargs else ''
        self.status = kwargs['status'] if 'status' in kwargs else ''
        self.files = kwargs['files'] if 'files' in kwargs else []
        self.text = kwargs['text'] if 'text' in kwargs else ''
        self.visualization = kwargs['visualization'] if 'visualization' in kwargs else ''

