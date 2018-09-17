# NBTools
NBTools is a framework for creating user-friendly Jupyter notebooks that are assessible to both programming and non-programming users alike. The framework provides:

* A widget and decorator which can transform any Python function into an interactive user interface.
* A toolbox interface for encapsulating and adding new computational steps to a notebook.
* Flexible theming and APIs to extend the NBTools functionality.
* A WYSWYG editor for markdown cells (provided as part of the accompanying `juptyter-wyswyg` package).

NBTools was developed as part of the [GenePattern Notebook](http://genepattern-notebook.org) environment. GenePattern Notebook also serves as an example of how NBTools can be extended and applied to a specific domain: in its case, bioinformatics.

## Installation

NBTools is available through [PIP](https://pypi.org/) and [conda](https://anaconda.org). Just run one of the following commands.

> pip install nbtools

or

> conda install -c genepattern nbtools

If using Jupyter Notebook version <= 5.2, you will need to execute to additional commands to install and enable the nbextension. This is not necessary in Jupyter 5.3+.

> jupyter nbextension install --py nbtools

> jupyter nbextension enable --py nbtools

## Getting Started

Let's start by writing a simple Hello World function and turning it into an interactive widget inside a Jupyter notebook. Go ahead and install NBTools, launch
Jupyter and open a new, blank notebook.

Next, let's write the function. The function below accepts a string and prints a brief hello message. By default, the message addresses the world. For good
measure we will also add a docstring to document the function.

```
def say_hello(to_whom='World'):
    """Say hello to the world or whomever."""
    print('Hello ' + to_whom)
```

This is pretty basic Python and hopefully so far everything is familiar. Next we will turn this function into an interactive widget with just an import
statement and one line of code. Update the code to what is shown below and execute the cell.

```
import nbtools

@nbtools.build_ui
def say_hello(to_whom='World'):
    """Say hello to the world or whomever."""
    print('Hello ' + to_whom)
```

You should now see a widget containing a web form. This form will prompt for the value of the `to_whom` parameter. The docstrong will also appear as a
description near the top of the widget. Go ahead and change the `to_whom` value or just leave it as "World," then click the "Run" button. This will execute the
function and print the results below the widget. Meanwhile, the form will also collapse, making more room on your screen.

With the push of a button, you've ran the `say_hello` function!

This is exciting, but it is far from the only feature of the NBTools framework. You can edit markdown cells using a WYSIWYG editor, customize how your function
displays, chain together multiple related functions, make widgets from existing third-party methods, create a library of interactive tools (just click the Tools
button on the toolbar and you will see `say_hello` has already added itself) and more! Just see the documentation links below.

## Features

* [UI Builder](doc/uibuilder.md)
* [UI Output](doc/uioutput.md)
* [Tool Manager API](doc/toolmanager.md)
* [WYSWYG Editor](wyswyg.md)
