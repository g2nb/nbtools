import inspect
from IPython.display import display
from .jobwidget import GPJobWidget
from nbtools import NBTool, UIBuilder, python_safe


class GPTaskWidget(UIBuilder):
    """A widget for representing the status of a GenePattern job"""
    default_color = 'rgba(10, 45, 105, 0.80)'
    task = None

    def create_function_wrapper(self, task):
        if task is None: return lambda: None  # Dummy function for null task
        name_map = {}  # Map of Python-safe parameter names to GP parameter names

        # Function for submitting a new GenePattern job based on the task form
        def submit_job(**kwargs):
            spec = task.make_job_spec()
            for name, value in kwargs.items():
                spec.set_parameter(name_map[name], value)
            job = task.server_data.run_job(spec, wait_until_done=False)
            display((GPJobWidget(job),))

        # Generate function signature programmatically
        submit_job.__qualname__ = task.name
        submit_job.__doc__ = task.description
        params = []
        for p in task.params:
            safe_name = python_safe(p.name)
            name_map[safe_name] = p.name
            default = GPTaskWidget.form_value(p.get_default_value())
            description = GPTaskWidget.form_value(p.description)
            param = inspect.Parameter(safe_name, inspect.Parameter.KEYWORD_ONLY, default=default, annotation=description)
            params.append(param)
        submit_job.__signature__ = inspect.Signature(params)

        return submit_job

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
        UIBuilder.__init__(self, self.function_wrapper, color=self.default_color, **kwargs)
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

# TODO  - Respect parameter types
#       - Required & optional
