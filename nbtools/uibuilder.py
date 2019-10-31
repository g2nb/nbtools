import builtins
import inspect
import functools
import re
import urllib.request
from IPython.core.display import display
from traitlets import Unicode, List, Bool, Dict, Instance
from ipywidgets import DOMWidget, interactive, widget_serialization, Output
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


class UIForm(interactive):
    def __init__(self, function_or_method, **kwargs):
        interactive.__init__(self, function_or_method, {
            'manual': True,
            'manual_name': 'Run',
            'auto_display': False
        }, **kwargs)

        self.children = self.children[:len(self.children)-1]


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
    form = Instance(interactive, (None, )).tag(sync=True, **widget_serialization)
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
        self.form = interactive(function_or_method, { 'manual': True, 'manual_name': 'Run', 'auto_display': False, })
        self.form.children = self.form.children[:len(self.form.children) - 1]  # Don't display output in the form
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


        # TODO: Old code below this -- UPDATE IT!
    #     import nbtools
    #
    #     # Read call signature
    #     sig = inspect.signature(function_or_method)
    #
    #     # Read params, values and annotations from the signature
    #     params = self._params(sig)
    #
    #     # Read docstring
    #     docstring = self._docstring(function_or_method)
    #
    #     # Do arguments override the default name, description or output?
    #     custom_name = kwargs['name'] if 'name' in kwargs else None
    #     custom_desc = kwargs['description'] if 'description' in kwargs else None
    #     custom_output = kwargs['output_var'] if 'output_var' in kwargs else None
    #     custom_origin = kwargs['origin'] if 'origin' in kwargs else self._determine_origin(function_or_method)
    #     custom_import = kwargs['function_import'] if 'function_import' in kwargs else None
    #     custom_register = kwargs['register_tool'] if 'register_tool' in kwargs else True
    #     custom_collapse = kwargs['collapse'] if 'collapse' in kwargs else True
    #
    #     # Apply output_var deprecation warning
    #     if 'output_var' in kwargs:
    #         print('Specifying the output variable using the output_var argument is deprecated. Use the parameters argument.')
    #
    #     # Read parameter metadata
    #     if 'parameters' in kwargs:
    #         self._apply_custom_parameter_info(params, kwargs['parameters'])
    #
    #     # Set the Traitlet values for the call
    #     self.name = custom_name or function_or_method.__qualname__
    #     self.description = custom_desc or docstring
    #     self.output_var = custom_output or ''
    #     self.origin = custom_origin or 'Notebook'
    #     self.params = params
    #     self.function_import = custom_import or self._import(function_or_method)
    #     self.register_tool = custom_register
    #     self.collapse = custom_collapse
    #     self.events = self.events
    #     self.function_or_method = function_or_method
    #
    #     # Add widget reference to function
    #     function_or_method.__dict__["__widget__"] = self
    #
    #     # Store reference to widget
    #     nbtools.manager._py_funcs[self.origin + '|' + self.name + '|widget'] = self
    #
    # @staticmethod
    # def _determine_origin(function_or_method):
    #     """Use the library name for the origin, or "Notebook" for tools defined in a notebook"""
    #     return "Notebook" if function_or_method.__module__ == '__main__' else function_or_method.__module__
    #
    # @staticmethod
    # def _safe_type(raw_type):
    #     """Ensure that the provided type is a known type, defaulting to text"""
    #     if raw_type == 'text' or raw_type == 'number' or raw_type == 'password' or raw_type == 'choice' or raw_type == 'file':
    #         return raw_type
    #     else:
    #         return 'text'
    #
    # @staticmethod
    # def _apply_custom_parameter_info(params, metadata):
    #     # If output_var is overridden as a parameter, add to the parameters list as a special case
    #     if 'output_var' in metadata and not any(p['name'] == 'output_var' for p in params):
    #         params.append({
    #             "name": 'output_var',
    #             "label": 'output_variable',
    #             "optional": True,
    #             "default": '',
    #             "description": 'The returned value of the function will be assigned to this variable, if provided.',
    #             "hide": False,
    #             "type": 'text',
    #             "kinds": None,
    #             "choices": [],
    #             "id": None,
    #             "events": None
    #         })
    #
    #     # Iterate through each parameters in the function
    #     for param in params:  # Iterate through each parameter
    #         if param['name'] in metadata:  # If there is something to override
    #             p_meta = metadata[param['name']]
    #
    #             # Handle overriding the display name
    #             if 'name' in p_meta:
    #                 param['label'] = p_meta['name']
    #
    #             # Handle overriding the description
    #             if 'description' in p_meta:
    #                 param['description'] = p_meta['description']
    #
    #             # Handle overriding the default value
    #             if 'default' in p_meta:
    #                 param['default'] = UIBuilder._safe_default(p_meta['default'])
    #
    #             # Handle hiding the parameter
    #             if 'hide' in p_meta:
    #                 param['hide'] = p_meta['hide']
    #
    #             # Handle optional parameters
    #             if 'optional' in p_meta:
    #                 param['optional'] = p_meta['optional']
    #
    #             # Handle specifying the parameter's type
    #             if 'type' in p_meta:
    #                 param['type'] = UIBuilder._safe_type(p_meta['type'])
    #
    #             # Handle specifying the parameter's accepted kinds
    #             if 'kinds' in p_meta:
    #                 param['kinds'] = p_meta['kinds']
    #
    #             # Handle giving the parameter a list of choices
    #             if 'choices' in p_meta:
    #                 param['choices'] = p_meta['choices']
    #
    #             # Handle assigning the parameter an ID
    #             if 'id' in p_meta:
    #                 param['id'] = p_meta['id']
    #
    #             # Handle giving the parameter a dict of events
    #             if 'events' in p_meta:
    #                 param['events'] = p_meta['events']
    #
    # @staticmethod
    # def _docstring(function_or_method):
    #     """Read docstring and protect against None"""
    #     docstring = inspect.getdoc(function_or_method)
    #     if docstring is None:
    #         docstring = ''
    #     return docstring
    #
    # @staticmethod
    # def _is_primitive(thing):
    #     """Determine if the value is a primitive"""
    #     primitive = (int, str, bool, float)
    #     return isinstance(thing, primitive)
    #
    # @staticmethod
    # def _safe_default(default):
    #     """If not safe to serialize in a traitlet, cast to a string"""
    #
    #     # If the value is not a primitive, cast to string
    #     if not UIBuilder._is_primitive(default):
    #         default = str(default)
    #     return default
    #
    # @staticmethod
    # def _guess_type(val):
    #     """Guess the input type of the parameter based off the default value, if unknown use text"""
    #     if isinstance(val, bool):
    #         return "choice"
    #     elif isinstance(val, int):
    #         return "number"
    #     elif isinstance(val, float):
    #         return "number"
    #     elif isinstance(val, str):
    #         return "text"
    #     elif hasattr(val, 'read'):
    #         return "file"
    #     else:
    #         return "text"
    #
    # @staticmethod
    # def _params(sig):
    #     """Read params, values and annotations from the signature"""
    #     params = []
    #     for p in sig.parameters:
    #         param = sig.parameters[p]
    #         optional = param.default != inspect.Signature.empty
    #         default = UIBuilder._safe_default(param.default) if param.default != inspect.Signature.empty else ''
    #         annotation = param.annotation if param.annotation != inspect.Signature.empty else ''
    #         type = UIBuilder._guess_type(default)
    #
    #         # Create the parameter attribute dict
    #         p_attr = {
    #             "name": param.name,
    #             "label": param.name,
    #             "optional": optional,
    #             "default": default,
    #             "description": annotation,
    #             "hide": False,
    #             "type": type,
    #             "kinds": None,
    #             "choices": [],
    #             "id": None,
    #             "events": None
    #         }
    #
    #         # Special choices handling for boolean parameters
    #         if isinstance(default, bool):
    #             p_attr['choices'] = {
    #                 'True': 'true',
    #                 'False': 'false'
    #             }
    #
    #         # Append it to the list
    #         params.append(p_attr)
    #     return params
    #
    # def _import(self, func):
    #     """Return the namespace path to the function"""
    #     # # If defined in notebook / main script, return function name
    #     # if func.__module__ == "__main__":
    #     #     return func.__name__
    #     #
    #     # # If defined in a module and the module name is in globals() return module.function()
    #     # if func.__module__ in globals():  # WARNING: globals() may be bugged in IPython
    #     #     return func.__module__ + "." + func.__name__
    #     #
    #     # # If module is not in globals(), assume the function was imported directly
    #     # return func.__name__
    #
    #     return f'nbtools.tool(id="{self.name}", origin="{self.origin}").function_or_method'
