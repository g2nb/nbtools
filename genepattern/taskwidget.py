import inspect
import os
import tempfile
from IPython.display import display
from .jobwidget import GPJobWidget
from nbtools import NBTool, UIBuilder, python_safe


class GPTaskWidget(UIBuilder):
    """A widget for representing the status of a GenePattern job"""
    default_color = 'rgba(10, 45, 105, 0.80)'
    task = None
    function_wrapper = None
    parameter_spec = None
    upload_callback = None

    def create_function_wrapper(self, task):
        """Create a function that accepts the expected input and submits a GenePattern job"""
        if task is None: return lambda: None  # Dummy function for null task
        name_map = {}  # Map of Python-safe parameter names to GP parameter names

        # Function for submitting a new GenePattern job based on the task form
        def submit_job(**kwargs):
            spec = task.make_job_spec()
            for name, value in kwargs.items():
                spec.set_parameter(name_map[name], value)
            job = task.server_data.run_job(spec, wait_until_done=False)
            display(GPJobWidget(job))

        # Generate function signature programmatically
        submit_job.__qualname__ = task.name
        submit_job.__doc__ = task.description
        params = []
        for p in task.params:
            safe_name = python_safe(p.name)
            name_map[safe_name] = p.name
            param = inspect.Parameter(safe_name, inspect.Parameter.POSITIONAL_OR_KEYWORD)
            params.append(param)
        submit_job.__signature__ = inspect.Signature(params)

        return submit_job

    def add_type_spec(self, task_param, param_spec):
        if task_param.attributes['type'] == 'java.io.File':
            param_spec['type'] = 'file'
            if task_param.is_choice_param():
                param_spec['choices'] = {c['label']: c['value'] for c in task_param.get_choices()}
        elif task_param.is_choice_param():
            param_spec['type'] = 'choice'
            param_spec['choices'] = {c['label']: c['value'] for c in task_param.get_choices()}
            if task_param.allow_choice_custom_value(): param_spec['combo'] = True
            if task_param.allow_multiple(): param_spec['multiple'] = True
        elif task_param.attributes['type'] == 'java.lang.Integer': param_spec['type'] = 'number'
        elif task_param.attributes['type'] == 'java.lang.Float': param_spec['type'] = 'number'
        elif task_param.attributes['type'].lower() == 'password': param_spec['type'] = 'password'
        else: param_spec['type'] = 'text'

    def create_param_spec(self, task):
        """Create the display spec for each parameter"""
        if task is None: return {}  # Dummy function for null task
        spec = {}
        for p in task.params:
            safe_name = python_safe(p.name)
            spec[safe_name] = {}
            spec[safe_name]['default'] = p.name
            spec[safe_name]['default'] = GPTaskWidget.form_value(p.get_default_value())
            spec[safe_name]['description'] = GPTaskWidget.form_value(p.description)
            spec[safe_name]['optional'] = p.is_optional()
            self.add_type_spec(p, spec[safe_name])
        return spec

    @staticmethod
    def generate_upload_callback(task):
        """Create an upload callback to pass to file input widgets"""
        def genepattern_upload_callback(values):
            for k in values:
                with tempfile.NamedTemporaryFile() as f:
                    f.write(values[k]['content'])
                    gpfile = task.server_data.upload_file(k, os.path.realpath(f.name))
                    return gpfile.get_url()
        return genepattern_upload_callback

    def handle_null_task(self):
        """Display an error message if the task is None"""
        if self.task is None:
            self.name = 'GenePattern Module'
            self.display_header = False
            self.display_footer = False
            self.error = 'No GenePattern module specified.'

    def __init__(self, task=None, **kwargs):
        """Initialize the task widget"""
        if task is not None and task.params is None: task.param_load()  # Load params from GP server
        self.task = task
        self.function_wrapper = self.create_function_wrapper(task)  # Create run task function
        self.parameter_spec = self.create_param_spec(task)
        UIBuilder.__init__(self, self.function_wrapper, parameters=self.parameter_spec, color=self.default_color,
                           upload_callback=GPTaskWidget.generate_upload_callback(self.task), **kwargs)
        self.handle_null_task()  # Set the right look and error message if task is None

    @staticmethod
    def form_value(raw_value):
        """Give the default parameter value in format the UI Builder expects"""
        if raw_value is not None: return raw_value
        else: return ''


class TaskTool(NBTool):
    """Tool wrapper for the authentication widget"""

    def __init__(self, server_name, task):
        NBTool.__init__(self)
        self.origin = server_name
        self.id = task.lsid
        self.name = task.name
        self.description = task.description
        self.load = lambda: GPTaskWidget(task)

