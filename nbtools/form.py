import os
from numbers import Integral, Real
from IPython import get_ipython
from ipython_genutils.py3compat import string_types, unicode_type
from ipywidgets import interactive, Text, GridBox, Label, Layout, ValueWidget, FloatText, IntText, Dropdown, Password, \
    FileUpload, HBox, Combobox as BaseCombobox
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
        self.input.value = BaseFormInput.type_safe(spec['default'], spec['type'])

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


class FileFormInput(BaseFormInput):
    class FileOrURL(HBox):
        def __init__(self, spec, **kwargs):
            # Set child widgets
            self._value = ''
            self.upload = FileUpload(accept=self.accepted_kinds(spec), multiple=False)
            self.url = Combobox()

            # Set up menu support for url widget
            if 'kinds' in spec and spec['kinds']: self.url.kinds = spec['kinds']
            self.url.choices = self.choices_dict(spec)

            HBox.__init__(self, **kwargs)
            self.children = (self.upload, self.url)
            self.init_events()

        @property
        def value(self):
            return self._value

        @value.setter
        def value(self, value):
            self._value = value
            if self._value != self.url.value:
                self.url.value = self._value

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

        def change_file(self, change):
            if isinstance(change['owner'].value, dict):
                for k in change['owner'].value:
                    with open(k, 'wb') as f:
                        f.write(change['owner'].value[k]['content'])
                        self.value = os.path.realpath(f.name)

        def change_url(self, change):
            if self.value != change['owner'].value:
                self.value = change['owner'].value

        def init_events(self):
            """Connect value change events of children to parent widget"""
            self.url.observe(self.change_url)
            self.upload.observe(self.change_file)

    def __init__(self, spec, **kwargs):
        self.input = self.FileOrURL(spec, layout=Layout(width='auto', grid_area='input'))
        super(FileFormInput, self).__init__(spec, **kwargs)

    dom_class = 'nbtools-fileinput'
    input_class = FileOrURL


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
    def widget_from_spec(spec):
        """Instantiate a widget based on the default value in the spec"""
        default_value = spec['default']

        # Use specified type, or fall back on default from value
        type = spec['type']

        if type == 'text':
            return TextFormInput(spec, value=unicode_type(default_value))
        elif type == 'password':
            return PasswordFormInput(spec, value=default_value)
        elif type == 'choice' and InteractiveForm.is_combo(spec):
            return ComboFormInput(spec, value=default_value)
        elif type == 'choice':
            return SelectFormInput(spec, value=default_value)
        elif type == 'number' and isinstance(default_value, Integral):
            return IntegerFormInput(spec, value=default_value)
        elif type == 'number' and isinstance(default_value, Real):
            return FloatFormInput(spec, value=default_value)
        elif type == 'number' and (default_value is None or default_value == ''):
            return FloatFormInput(spec, value=0)
        elif type == 'file':
            return FileFormInput(spec, value=unicode_type(default_value))

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
            return FileFormInput(spec, value=default_value)
        else:
            return Text(value=unicode_type(default_value))

    def update(self, *args):
        """Call the superclass update() method after manipulating the call"""
        super(InteractiveForm, self).update(*args)

        # Assign value to output_var
        get_ipython().push({self.children[-1].value: self.result})
