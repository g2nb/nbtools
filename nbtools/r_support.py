import ast
import inspect
import random


class RWrapper:
    spec = None
    code = None
    output = None

    def __init__(self, spec, code):
        self.spec = spec
        self.code = code
        self.ensure_imports()

    @staticmethod
    def generate_token():
        return ''.join(random.choice('0123456789ABCDEF') for i in range(32))

    def signature(self):
        # Create a dummy callable, the job of this callable is simply to hold
        # the custom signature and pass it to the UI Builder
        def dummy():
            pass

        # Get the dummy callable's empty signature
        sig = inspect.signature(dummy)

        # Modify the dummy signature to include the parameters in the spec
        if 'parameters' in self.spec:
            param_list = []
            for name in self.spec['parameters']:
                values = self.spec['parameters'][name]
                default = values['default'] if 'default' in values else ''
                param = inspect.Parameter(name, inspect.Parameter.POSITIONAL_ONLY, default=default)
                param_list.append(param)
            sig = sig.replace(parameters=tuple(i for i in param_list))

        # Attach the updated signature to the dummy
        dummy.__signature__ = sig

        # Return the dummy callable
        return dummy

    @staticmethod
    def ensure_imports():
        get_ipython().run_cell('import nbtools\nr_output=None')

    @staticmethod
    def wrap_var(to_wrap):
        if type(to_wrap) == type('str'):
            return f'"{to_wrap}"'
        else:
            return to_wrap

    @staticmethod
    def append_output(code):
        lines = code.strip().split('\n')
        lines[-1] = 'r_output <- ' + lines[-1]
        return '\n'.join(lines)

    def __call__(self, **kwargs):
        # Begin assembling R code
        r_code = ''

        # Read each kwarg and set R variable
        for key in kwargs:
            value = self.wrap_var(kwargs[key])
            r_code += f'{key} <- {value}\n'

        # Attach the code body
        r_code += self.append_output(self.code)

        # Send variable init and code to R and return the result
        get_ipython().run_cell_magic('R', '-o r_output', r_code)
        r_output  = get_ipython().run_cell('r_output').result
        #return r_output


def r_build_ui(spec, code):
    """
    read line, use this to create UI Builder
    on Run, turn parameters into R variables, send cell to R, the return value of R becomes Python var
    """
    import nbtools

    # Parse the UI Builder spec from the magics line
    spec = ast.literal_eval(spec)

    # Generate a token to identify the RWrapper
    token = RWrapper.generate_token()

    # Lazily initialize the RWrapper map
    if not hasattr(nbtools, '_r_wrappers'):
        nbtools._r_wrappers = {}

    # Create a wrapper object for the R call, assign to a temporary top-level name
    nbtools._r_wrappers[token] = RWrapper(spec, code)

    # Create and return the UIBuilder object
    uib = nbtools.UIBuilder(nbtools._r_wrappers[token].signature(), function_import=f'nbtools._r_wrappers["{token}"]', **spec)
    return uib

def load_ipython_extension(ipython):
    ipython.extension_manager.load_extension('rpy2.ipython')
    ipython.register_magic_function(r_build_ui, magic_kind='cell')