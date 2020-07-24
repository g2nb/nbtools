import os
from numbers import Integral, Real
from IPython import get_ipython
from ipython_genutils.py3compat import string_types, unicode_type
from ipywidgets import interactive, Text, GridBox, Label, Layout, ValueWidget, FloatText, IntText, Dropdown, Password, \
    FileUpload, HBox, Combobox as BaseCombobox, SelectMultiple, VBox
from traitlets import List, Dict
from .parsing_manager import ParsingManager


class Combobox(BaseCombobox):
    """More dropdown-like implementation of the Combobox widget; use instead of ipywidgets.Combobox"""
    kinds = List(default_value=[]).tag(sync=True)
    choices = Dict(default_value={}).tag(sync=True)


class BaseFormInput(GridBox, ValueWidget):
    """Base class for UI Builder form elements

    This class is not intended to be instantiated directly. Use its subclasses instead."""
    dom_class = 'nbtools-input'
    input_class = Text

    def __init__(self, spec, **kwargs):
        # Initialize label, input & description, if not already initialized by subclass
        if not hasattr(self, 'label'): self.label = Label(layout=Layout(width='auto', grid_area='label'))
        if not hasattr(self, 'input'): self.input = self.input_class(layout=Layout(width='auto', grid_area='input'))
        if not hasattr(self, 'description'): self.description = Label(layout=Layout(width='auto', grid_area='description'))

        # Build the GridBox
        GridBox.__init__(self, [self.label, self.input, self.description], _dom_classes=['nbtools-input', self.dom_class],
             layout=Layout(
                width='100%',
                grid_template_rows='auto auto',
                grid_template_columns='25% 75%',
                grid_template_areas='''
                    "label input"
                    ". description"
                '''), **kwargs)

        # Apply overrides from the parameters={} spec
        self._apply_spec(spec)

    @property
    def value(self):
        return self.input.value

    @value.setter
    def value(self, val):
        self.input.value = val

    def _apply_spec(self, spec):
        """Apply the parameter spec to the widget"""

        # If the spec if empty, ignore this call
        if not spec: return

        # Create required suffix
        required_suffix = '' if spec['optional'] else '*'
        if not spec['optional']: self.add_class('required')

        # Set the display name
        self.label.value = spec['label'] + required_suffix
        self.label.description = spec['label']

        # Set the default value
        self.input.value = self.__class__.type_safe(spec['default'], spec['type'])

        # Set the description
        self.description.value = spec['description']
        self.description.description = spec['description']

        # Hide the parameter if hide=True
        if spec['hide']: self.layout.display = 'none'

    @staticmethod
    def type_safe(val, to_type):
        # Handle casting to numbers, default to 0 on an error
        if to_type == 'number':
            try: return int(val)
            except (ValueError, TypeError):
                try: return float(val)
                except (ValueError, TypeError): return 0
        # Handle casting to strings, default to empty string
        if to_type == 'text' or to_type == 'password':
            try:
                return str(val)
            except (ValueError, TypeError):
                return ''
        # Otherwise, just return the value
        else:
            return val

    def get_interact_value(self):
        """Parse the raw parameter value for supported syntax and pass to the wrapped function"""
        return ParsingManager.parse_value(self.value)


class TextFormInput(BaseFormInput):
    dom_class = 'nbtools-textinput'
    input_class = Text

    def __init__(self, spec, **kwargs):
        super(TextFormInput, self).__init__(spec, **kwargs)
        self.input.add_class('nbtools-menu-attached')


class PasswordFormInput(BaseFormInput):
    dom_class = 'nbtools-passwordinput'
    input_class = Password


class IntegerFormInput(BaseFormInput):
    dom_class = 'nbtools-numberinput'
    input_class = IntText


class FloatFormInput(BaseFormInput):
    dom_class = 'nbtools-numberinput'
    input_class = FloatText


class SelectFormInput(BaseFormInput):
    dom_class = 'nbtools-selectinput'
    input_class = Dropdown

    def __init__(self, spec, **kwargs):
        choices = spec['choices']  # Special handling of choices for dropdown
        self.input = Dropdown(options=choices, layout=Layout(width='auto', grid_area='input'))
        super(SelectFormInput, self).__init__(spec, **kwargs)


class ComboFormInput(BaseFormInput):
    dom_class = 'nbtools-comboinput'
    input_class = Combobox

    def __init__(self, spec, **kwargs):
        choices = spec['choices']  # Special handling of choices for dropdown
        no_send_to = 'sendto' in spec and not spec['sendto']
        self.input = Combobox(choices=choices, layout=Layout(width='auto', grid_area='input'))
        self.input.add_class('nbtools-menu-attached')
        if no_send_to: self.input.add_class('nbtools-nosendto')
        super(ComboFormInput, self).__init__(spec, **kwargs)


class MultiselectFormInput(BaseFormInput):
    dom_class = 'nbtools-multiselectinput'
    input_class = Dropdown

    def __init__(self, spec, **kwargs):
        choices = spec['choices']  # Special handling of choices for dropdown
        self.input = SelectMultiple(options=choices, layout=Layout(width='auto', grid_area='input'))
        super(MultiselectFormInput, self).__init__(spec, **kwargs)

    @staticmethod
    def type_safe(val, to_type):
        """Override parent class' method to handle non-lists and blanks"""
        base_val = BaseFormInput.type_safe(val, to_type)  # Call base class

        if not base_val and isinstance(base_val, str): return []       # Handle empty values
        if not isinstance(base_val, (list, tuple)): return [base_val]  # Ensure val is a list
        if isinstance(base_val, list) and len(base_val) == 1 and isinstance(base_val[0], str) and not base_val[0]:
            return []                                                  # Special case for ['']
        return base_val


class FileFormInput(BaseFormInput):
    class FileOrURL(HBox):
        def __init__(self, spec, upload_callback=None, **kwargs):
            # Set child widgets
            self.spec = spec
            self._value = ''
            self.upload = FileUpload(accept=self.accepted_kinds(spec), multiple=False)

            # Set up the file list
            self.file_list = VBox()
            self.urls = []
            self.file_list.children = self.urls

            # Set up menu support for url widgets
            if 'kinds' in spec and spec['kinds']:
                for i in self.file_list.children:
                    i.kinds = spec['kinds']
                    i.choices = self.choices_dict(spec)

            # Set up the upload function
            self.upload_callback = self.default_upload_callback if upload_callback is None else upload_callback

            # Add the child widgets and initialize events
            HBox.__init__(self, **kwargs)
            self.children = (self.upload, self.file_list)
            self.init_events()

        def maximum(self):
            return int(self.spec['maximum']) if 'maximum' in self.spec else 1

        def minimum(self):
            return int(self.spec['minimum']) if 'minimum' in self.spec else 1

        @staticmethod
        def default_upload_callback(values):
            """By default, upload files to the current directory"""
            for k in values:
                with open(k, 'wb') as f:
                    f.write(values[k]['content'])
                    return os.path.realpath(f.name)

        @property
        def value(self):
            if len(self._value) == 1: return self._value[0]
            elif len(self._value) == 0: return ''
            else: return self._value

        @value.setter
        def value(self, value):
            if not isinstance(value, list): value = [value]  # Handle non-lists
            if len(value) > self.maximum():  # Make sure the list isn't too long
                raise RuntimeError('List exceeds maximum number of values')

            # Set the value in the correct widgets
            self._value = value
            if self._value != self._file_list_values():
                self._set_file_list_values(self._value)

        @staticmethod
        def choices_dict(spec):
            if 'choices' in spec and spec['choices'] is not None: return spec['choices']
            else: return {}

        @staticmethod
        def accepted_kinds(spec):
            if 'kinds' in spec and spec['kinds'] is not None:
                return ', '.join([f'.{x}' for x in spec['kinds']])
            else:  # If not specified, accept all kinds
                return ''

        def _file_list_values(self, append=None):
            """Return a values from the file list widgets, stripping blank values and with an optional value appended"""
            value_list = [i.value for i in self.file_list.children if i.value != '']
            if append: return value_list + [append]
            else: return value_list

        def _set_file_list_values(self, values):
            """Set the values in each of the file list widgets"""
            if len(values) > self.maximum():  # Make sure the list isn't too long
                raise RuntimeError('List exceeds maximum number of values')

            # If the number of values doesn't match the current number of widgets, rebuild them
            if len(values) != len(self.file_list.children):
                widget_number = min(max(len(values) + 1, self.minimum()), self.maximum())
                self.file_list.children = [Combobox() for i in range(widget_number)]
                for i in self.file_list.children:
                    i.observe(self.change_url)

            # Set the values
            for i in range(len(values)): self.file_list.children[i].value = values[i]
            for i in range(len(values), len(self.file_list.children)): self.file_list.children[i].value = ''

        def change_file(self, change):
            if isinstance(change['owner'].value, dict) and change['name'] == 'data':
                path = self.upload_callback(change['owner'].value)
                if path not in self.value:
                    values_length = len(self._file_list_values())
                    if values_length == self.maximum():  # Handle uploads when the max values has been reached
                        self.file_list.children[values_length-1].value = path
                        self._set_file_list_values(self._file_list_values())
                    else:  # Otherwise append the uploaded value to the current list
                        self._set_file_list_values(self._file_list_values(append=path))

        def change_url(self, change):
            if change['name'] == 'value':
                widget_values = self._file_list_values()
                if self.value != widget_values:
                    self.value = widget_values

                # Add a blank widget if all widgets and full and not at max
                if len(widget_values) == len(self.file_list.children) and len(widget_values) != self.maximum():
                    new_widget = Combobox()
                    new_widget.observe(self.change_url)
                    self.file_list.children = list(self.file_list.children) + [new_widget]
                if len(widget_values) < len(self.file_list.children)-1 and len(self.file_list.children) > self.minimum():
                    self.file_list.children = list(self.file_list.children)[:-1]

        def init_events(self):
            """Connect value change events of children to parent widget"""
            self.upload.observe(self.change_file)

    def __init__(self, spec, upload_callback=None, **kwargs):
        self.input = self.FileOrURL(spec, upload_callback=upload_callback, layout=Layout(width='auto', grid_area='input'))
        super(FileFormInput, self).__init__(spec, **kwargs)

    dom_class = 'nbtools-fileinput'
    input_class = FileOrURL


class InteractiveForm(interactive):
    def __init__(self, function_or_method, parameter_specs, upload_callback=None, **kwargs):
        self.upload_callback = upload_callback  # Set the upload callback

        # Create parameter widgets from spec and add to kwargs
        self.widgets_from_spec(parameter_specs, kwargs)

        # Call the superclass constructor
        interactive.__init__(self, function_or_method, {
            'manual': True,
            'manual_name': 'Run',
            'auto_display': False
        }, **kwargs)

        # Hide the default Run button
        self.children[-2]._dom_classes = ['hidden']

        # Don't display the output as a child widget and add the output variable to the form
        if parameter_specs:
            self.children = self.children[:len(self.children)-1] + (self.output_var_widget(parameter_specs), )

    def output_var_widget(self, parameter_specs):
        """Create a widget from the output_var spec"""
        for p in parameter_specs:
            if p['name'] == 'output_var':
                return self.widget_from_spec(p)

    def widgets_from_spec(self, parameter_specs, kwargs):
        """Iterate over each parameter spec and create a form widget"""
        for spec in parameter_specs:
            param_name = spec['name']
            kwargs[param_name] = self.widget_from_spec(spec)

    @staticmethod
    def is_combo(spec):
        return 'combo' in spec and spec['combo']

    @staticmethod
    def is_multiple(spec):
        return 'multiple' in spec and spec['multiple']

    def widget_from_spec(self, spec):
        """Instantiate a widget based on the default value in the spec"""
        default_value = spec['default']

        # Use specified type, or fall back on default from value
        param_type = spec['type']

        if param_type == 'text':
            return TextFormInput(spec, value=unicode_type(default_value))
        elif param_type == 'password':
            return PasswordFormInput(spec, value=default_value)
        elif param_type == 'choice' and InteractiveForm.is_combo(spec):
            return ComboFormInput(spec, value=default_value)
        elif param_type == 'choice' and InteractiveForm.is_multiple(spec):
            return MultiselectFormInput(spec, value=default_value)
        elif param_type == 'choice':
            return SelectFormInput(spec, value=default_value)
        elif param_type == 'number' and isinstance(default_value, Integral):
            return IntegerFormInput(spec, value=default_value)
        elif param_type == 'number' and isinstance(default_value, str) and default_value.lstrip('-').isnumeric():
            return IntegerFormInput(spec, value=default_value)
        elif param_type == 'number' and isinstance(default_value, Real):
            return FloatFormInput(spec, value=default_value)
        elif param_type == 'number' and (default_value is None or default_value == ''):
            return FloatFormInput(spec, value=0)
        elif param_type == 'file':
            return FileFormInput(spec, value=unicode_type(default_value), upload_callback=self.upload_callback)

        # No known type specified, guess based on default value
        elif isinstance(default_value, string_types):
            return TextFormInput(spec, value=unicode_type(default_value))
        elif isinstance(default_value, bool):
            return SelectFormInput(spec, value=default_value)
        elif isinstance(default_value, Integral):
            return IntegerFormInput(spec, value=default_value)
        elif isinstance(default_value, Real):
            return FloatFormInput(spec, value=default_value)
        elif hasattr(default_value, 'read'):
            return FileFormInput(spec, value=default_value, upload_callback=self.upload_callback)
        else:
            return Text(value=unicode_type(default_value))

    def update(self, *args):
        """Call the superclass update() method after manipulating the call"""
        super(InteractiveForm, self).update(*args)

        # Assign value to output_var
        get_ipython().push({self.children[-1].value: self.result})
