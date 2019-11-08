from numbers import Integral, Real
from ipython_genutils.py3compat import string_types, unicode_type
from ipywidgets import interactive, Text, GridBox, Label, Layout, ValueWidget, FloatText, IntText, Dropdown, Password


class TextFormInput(GridBox, ValueWidget):
    dom_class = 'nbtools-textinput'
    input_class = Text

    def __init__(self, spec, **kwargs):
        # Initialize label, input & description, if not already initialized by subclass
        if not hasattr(self, 'label'): self.label = Label(layout=Layout(width='auto', grid_area='label'))
        if not hasattr(self, 'input'): self.input = self.input_class(layout=Layout(width='auto', grid_area='input'))
        if not hasattr(self, 'description'): self.description = Label(layout=Layout(width='auto', grid_area='description'))

        self._apply_spec(spec)
        GridBox.__init__(self, [self.label, self.input, self.description], _dom_classes=[self.dom_class],
             layout=Layout(
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


class PasswordFormInput(TextFormInput):
    dom_class = 'nbtools-passwordinput'
    input_class = Password


class IntegerFormInput(TextFormInput):
    dom_class = 'nbtools-numberinput'
    input_class = IntText


class FloatFormInput(TextFormInput):
    dom_class = 'nbtools-numberinput'
    input_class = FloatText


class SelectFormInput(TextFormInput):
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
        # TODO: Handle type override

        if isinstance(default_value, string_types):
            return TextFormInput(spec, value=unicode_type(default_value))
        elif isinstance(default_value, bool):
            return SelectFormInput(spec, value=default_value)
        elif isinstance(default_value, Integral):
            return IntegerFormInput(spec, value=default_value)
        elif isinstance(default_value, Real):
            return FloatFormInput(spec, value=default_value)
        else:
            return Text(value=unicode_type(default_value))