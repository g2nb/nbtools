from numbers import Integral, Real
from ipython_genutils.py3compat import string_types, unicode_type
from ipywidgets import interactive, Text, GridBox, Label, Layout, ValueWidget, FloatText, IntText, Dropdown, Password


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

        # Create required suffix
        required_suffix = '' if spec['optional'] else '*'

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


class TextFormInput(BaseFormInput):
    dom_class = 'nbtools-textinput'
    input_class = Text


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

        # Use specified type, or fall back on default from value
        type = spec['type']

        if type == 'text':
            return TextFormInput(spec, value=unicode_type(default_value))
        elif type == 'password':
            return PasswordFormInput(spec, value=default_value)
        elif type == 'choice':
            return SelectFormInput(spec, value=default_value)
        elif type == 'number' and isinstance(default_value, Integral):
            return IntegerFormInput(spec, value=default_value)
        elif type == 'number' and isinstance(default_value, Real):
            return FloatFormInput(spec, value=default_value)

        # No known type specified, guess based on default value
        elif isinstance(default_value, string_types):
            return TextFormInput(spec, value=unicode_type(default_value))
        elif isinstance(default_value, bool):
            return SelectFormInput(spec, value=default_value)
        elif isinstance(default_value, Integral):
            return IntegerFormInput(spec, value=default_value)
        elif isinstance(default_value, Real):
            return FloatFormInput(spec, value=default_value)
        else:
            return Text(value=unicode_type(default_value))
