# UI Builder

The UI Builder is a way to display any Python function or method call as an interactive widget. This will render the parameters of the function as a web form.

The UI Builder will use any existing docstring for the function as a description, will infer parameter types from default values and will display parameter
annotations as helpful text near each input.

## Building the UI

The simplest way to render a function using the UI Builder is to import the `nbtools` package and then attach the `@build_ui` decorator to the function's
definition. A code example for this is given below:

```python
import nbtools

@nbtools.build_ui
def example_function(first_parameter, second_parameter):
    . . .
```

Alternatively, the UI Builder widget may defined and referenced directly. To render a function in this way, simply import the `UIBuilder` class from the
`nbtools` package and pass the function to the `UIBuilder` constructor. To display the widget, just return the `UIBuilder` object in a Jupyter code cell or call
`IPython.display.display()`, passing the `UIBuilder` object as a parameter. A code example is provided below:

```python
from nbtools import UIBuilder

def example_function(first_parameter, second_parameter):
    . . .

# Create the UIBuilder object and immediately
# return it for display in Jupyter
UIBuilder(example_function)
```

## Python Variables & String Literals

Python variables may be used as input when filling out a UI Builder form. To do this, simply type the name of the variable into the input field. When the form
is submitted, the widget will pass a reference to the variable to the resulting function call.

Conversely, to ensure that an input value is evaluated as a string literal rather than a variable name, a user can wrap the input to a particular field in
either single or double quotes (' or "). This tells the UI Builder to skip checking for variable names and to treat the value in quotes as a literal string. For
example, forcing the string foo to be treated as a string literal would be entered in the input field as:

```python
"foo"
```

## String Serialization

The input to a UI Builder form may include a string representation of a variable's value rather than a reference to the variable itself. This is useful for
embedding the value inside a larger string, or when passing a variable reference would be unwanted.

This functionality can be achieved by placing the variable name inside double curly brackets. For example, embedding the string serialization of the variable
`foo` would be entered into an input field as:

```
{{ foo }}
```

## Rendering Existing Functions

Existing Python functions, such as those included in third-party Python libraries, can also be used with the UI Builder. To display an existing function first
import it and then pass the function into the constructor of the `UIBuilder` object. Return this object in a cell to display the resulting widget. For example,
the code for displaying scikit-learn's `KMeans` function is given below.

```python
import nbtools
import sklearn.cluster

nbtools.UIBuilder(sklearn.cluster.KMeans)
```

## Overriding Properties

By default, the widget name will be the function name, the description will be the docstring of the function and the parameter names will be the same as the
parameters defined in the code. All of these, however, can be manually overridden. This is particularly useful whe providing better names or descriptions that
users would find helpful.

To override the default values, optional parameters may be passed into the `build_ui` decorator or into the `UIBuilder` constructor. Examples overriding the
widget name and description are given below.

The bottom example also demonstrates overriding the canonical name of the function being rendered. This is sometimes helpful if the function has been imported
into the code in a non-top level namespace.

```
@nbtools.build_ui(name="Simple Example", description="This is an example function.")
def example_function(param_1, param_2):
    . . .
```

The same effect can be also achieved when directly instantiating the UIBuilder object.

```python
nbtools.UIBuilder(sklearn.cluster.KMeans,
                  name="KMeans Clustering",
                  description="Groups data into K clusters",
                  function_import="sklearn.cluster.KMeans")
```

## Overriding Parameters

The names and descriptions of individual parameters may also be overridden. In this case, a dictionary may be passed to the `build_ui` decorator or the
`UIBuilder` constructor with the parameter's name as the key and the properties to override as the value.

A code example is given below which overrides the name of a parameter, the description of the parameter and the default value of the parameter.

```python
@nbtools.build_ui(parameters={
    "param_1": {
        "name": "foo",
        "description": "This parameter has been renamed.",
        "default": "bar"
    }
})
def example_function(param_1, param_2):
    . . .
```

## Hiding Parameters

Sometimes a particular function has parameters that shouldn't be changed in the current context. The UI Builder has the ability to hide the input for these
parameters, simplifying the user interface and allowing users to focus only on the relevant inputs. When the function is called, the hidden parameters will
automatically use their default values. This may be combined with overriding the default value for the parameter in question in order to force a particular
input.

A code example is given below in which several parameters of scikit-learn's KMeans implementation are hidden.

```python
nbtools.UIBuilder(sklearn.cluster.KMeans, parameters={
    "init": { "hide": True },
    "verbose": { "hide": True },
    "random_state": { "hide": True, "default": 1234 },
    "copy_x": { "hide": True }
})
```

## Output Variable

The result of a UI Builder function can optionally be assigned to a Python variable. By default, a text field for this variable will appear at the bottom of
each UI Builder widget. This field can be overridden just like any other parameter using the `output_var` parameter name. This includes the ability to change
the label, description, assign a default value or hide the parameter. A code example is given below.

```python
@nbtools.build_ui(parameters={
    "output_var": {
        "name": "results",
        "description": "The results of the function",
        "default": "variable_name",
        "hide": False,
    }
})
def example_function(a_text_param, a_number_param,
                     a_password_param, a_bool_param=True):
    . . .
```

## Parameter Types

The UI Builder supports a number of parameter types and implements features to make handling those types easier. Supported types include:

* **Text:** Supports any text value. Unless referencing an existing Python variable, any input gets cast to a Python string value. Text is also the default
  parameter type if no other type information has been specified or can be determined.
* **Number:** Accepts any numerical value and renders in a notebook as an HTML number input.
* **Password:** Works exactly like a text input, but obfuscates the input value as a password field.
* **Choice:** When provided with a list of choices, this input will render as a dropdown parameter, with the default value selected. Choice parameters are
  described in their own section below.
* **Bool:** A boolean input representing True and False. Renders as a choice parameter with those two choices.
* **File:** An input intended to receive a file or file-like object. File parameters are described in their own section below.

The UI Builder will infer a parameter's type from its default value, defaulting to a text parameter if no value is available or if the default value's type
doesn't match one of the known types above. Alternatively, the developer can specify a parameter's type in the code. A code example is provided below,
illustrating how to specify each type - except for choice and file parameters, which are each detailed in their own sections.

```python
@nbtools.build_ui(parameters={
    "a_text_param": {
        "type": "text"
    },
    "a_number_param": {
        "type": "number"
    },
    "a_password_param": {
        "type": "password"
    },
    "a_bool_param": {
        "type": "bool"
    },
})
def example_function(a_text_param, a_number_param,
                     a_password_param, a_bool_param=True):
    . . .
```

### Choice Parameters

Sometimes a parameter only accepts a limited set of valid input values. This is often represented in a user interface as a dropdown (select) input. The UI
Builder has support for this functionality. To change a particular parameter into a dropdown input, simply provide the parameter with a dictionary of available
choices. A code example is given below.

```python
@nbtools.build_ui(parameters={
    "param_1": {
        "default": "some_value",
        "type": "choice",
        "choices": {
            "foo label": "foo value",
            "bar label": "bar value",
            "some_label": "some_value"
        }
    }
})
def example_function(param_1, param_2):
    . . .
```

### File Parameters

File parameters are intended to handle input representing a file or file-like object. They are integrated with [UI Output](uioutput.md) widgets, such that
available files will appear in a menu when a file parameter is first selected, thereby allowing the user to easily select the desired file.

Optionally, the developer can specify the kinds of files that a file parameter accepts. This is accomplished by providing a list of file extension strings. For
example, a parameter that expects a gct, odf or res files would list: ["gct", "odf", "res"].

It is worth noting that when a file is selected in the menu, the value provided to the function will actually be a string containing a path or URL to the
specified  file. The developer may then take this string and use it to create a file-like object, pass it to a function that will download the file or otherwise
perform any desired tasks.

A code example is provided below.

```python
@nbtools.build_ui(parameters={
    "param_1": {
        "type": "file",
        "kinds": ["gct", "odf"]
    }
})
def example_function(param_1, param_2):
    . . .
```

Similar to choice parameters, a file parameter may likewise be given a list of possible options. These options will appear in a dropdown when the parameter it selected.

```python
@nbtools.build_ui(parameters={
    "param_1": {
        "type": "file",
        "choices": {
            "Example Label #1": "ftp://fake.example.com/example_1.csv",
            "Example Label #2": "ftp://fake.example.com/example2.csv",
            "Example Label #3": "ftp://fake.example.com/example_3.csv"
        }
    }
})
def file_choice_example(param_1):
    . . .
```

## Client-side Interactivity

Notebook authors who wish to integrate the UI Builder with client-side programmatic functionality can make use of the `id` and `events` attribute of parameters.

The `id` attribute allows the author to specify an ID for the parameter's element in the DOM. As with all DOM IDs, it must be both unique and [adhere to the naming rules in the HTML specification](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/id).

The `events` attribute allows the author to attach Javascript functionality to the parameter. It should be specified a a dict, where the keys are Javascript events and the values are strings containing the Javascript code to be executed.

An example of using both of these attributes is given below.

```python
@nbtools.build_ui(parameters={
    "param_1": {
        "id": "example_function_param_1",
        "events": {
            "click": "console.log('Hello World!');"
        }
    }
})
def example_function(first_parameter, second_parameter):
    . . .
```

Additionally, the top-level `events` attribute is available for handling events associated with the UI Builder widget itself, rather than individual parameters. It accepts a dictionary pairing event names to strings containing Javscript to be executed when the event occurs. Supported events are presented below:
                
* **load:** Executed when the widget is initialized.
* **run:** Event fires when the Run button is clicked.
* **click:** Executed when the widget is clicked.
* **focus:** Event fires when the widget obtains focus.
                
```python
@nbtools.build_ui(
    events={
        "load": "console.log('Write to the Javascript console when the widget is loaded.')",
        "run": "console.log('Write to the Javascript console when the Run button is clicked.')"
    }
)
def example_function(first_parameter, second_parameter):
    . . .
```

### Send to Text

Specific text options can be made easily accessible from a text input by annotating them with the nbtools-text-option class. Any text annotated in this way will appear in a dropdown whenever a text input parameter is selected.

```html
<span class="nbtools-text-option">Text to send to parameter</span>
```

### Look and Feel

*(JupyterLab Only)*

The look and feel of a UI Builder widget can customized by setting any of the following options:

* **color:** Sets the header and border color of the widget. (default based on the current JupyterLab theme)
* **logo:** A URL pointing to the logo to display in the UI Builder header. 
* **run_label:** Change the label on the Run buttons. (default='Run')
* **display_header:** Toggle whether to display the UI Builder header. (default=True)
* **display_footer:** Whether or not to display the UI Builder footer. (default=True)

```python
@nbtools.build_ui(color='#0000FF', logo='http://custom.logo', run_label='Execute', display_header=False, display_footer=False)
def example_function(first_parameter, second_parameter):
    . . .
```

### Messages

*(JupyterLab Only)*

These values can be set in order to display a message to the user. Usually they are used to bring attention to an error or to highlight important feedback.

* **info:** Sets an informative message to display to the user in a highlighted info callout.
* **error:** Sets an error message to display to the user in an error callout.

```python
@nbtools.build_ui(info='You must do something before running this method', error='An error was encountered performing method')
def example_function(first_parameter, second_parameter):
    . . .
```

```python
uibuilder = UIBuilder(f)
uibuilder.info = 'You must do something before running this method'
uibuilder.error = 'An error was encountered performing method'
```

### Menu Items

*(JupyterLab Only)*

Set `extra_menu_items` to a dict of additional menu items to display in the widget's gear menu. The key should be the label to display in the menu and the value should be a dict containing the action to perform and the code to execute. Valid actions are:

* **cell:** Creates a new cell below the current one, inserts the provided Python code and executes that cell.
* **method:** Executes the indicated function in Python kernel.

A code example is provided below.

```python
@nbtools.build_ui(extra_menu_items={
    'Show Help Information': {
        'action': 'cell',
        'code': 'help(nbtools)'
    }
})
def example_function(first_parameter, second_parameter):
    . . .
```

```python
@nbtools.build_ui(extra_menu_items={
    'Call Function': {
        'action': 'method',
        'code': 'method_name'
    }
})
def example_function(first_parameter, second_parameter):
    . . .
```

## Other Options

The following minor features are available available in the UI Builder.

* **register_tool:** Sets whether to register this function with the Notebook Tool Manager. Defaults to True.
* **function_import:** Override the import name of an existing function.
* **collapse:** Set whether the widget collapses upon submission (default=True).
* **collapsed:** Set whether the widget is currently expanded or collapsed (default=False). *(JupyterLab Only)*
* **busy:** Set whether the widget controls are disabled because it is busy. (default=False) *(JupyterLab Only)*
                
```python
@nbtools.build_ui(register_tool=False, function_import='example_package.example_function', collapse=False, collapsed=False, busy=True)
def example_function(first_parameter, second_parameter):
    . . .
```
