
# nbtools for JupyterLab

[![Binder](https://mybinder.org/badge_logo.svg)](https://mybinder.org/v2/gh/genepattern/nbtools/lab?urlpath=lab)
[![Build Status](https://travis-ci.org/genepattern/nbtools.svg?branch=lab)](https://travis-ci.org/genepattern/nbtools)
[![Documentation Status](https://img.shields.io/badge/docs-latest-brightgreen.svg?style=flat)](https://gpnotebook-website-docs.readthedocs.io/en/latest/)
[![Docker Pulls](https://img.shields.io/docker/pulls/genepattern/genepattern-notebook.svg)](https://hub.docker.com/r/genepattern/genepattern-notebook/)
[![Join the chat at https://gitter.im/genepattern](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/genepattern/genepattern-notebook?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

**nbtools** is a framework for creating user-friendly Jupyter notebooks that are accessible to both programming and non-programming users. It is a core component of the [GenePattern Notebook environment](https://notebook.genepattern.org). The package provides:

* A decorator which can transform any Python function into an interactive user interface.
* A toolbox interface for encapsulating and adding new computational steps to a notebook.
* Flexible theming and APIs to extend the nbtools functionality.
* A WYSIWYG editor for markdown cells (provided as part of the accompanying `juptyter-wyswyg` package and coming soon to JupyterLab).

**Prerequisites**

* JupyterLab >= 2.0.0
* ipywidgets >= 7.0.0

## Installation

This is a beta version that has not yet been released to PIP or conda. For now you will need to install from GitHub:

```bash
# Install ipywidgets, if you haven't already
jupyter nbextension enable --py widgetsnbextension
jupyter labextension install @jupyter-widgets/jupyterlab-manager

# Clone the nbtools repository
git clone https://github.com/genepattern/nbtools-lab-prototype.git
cd nbtools-lab-prototype

# Install the nbtools JupyterLab prototype
pip install .
jupyter labextension install .
jupyter nbextension install --py nbtools --sys-prefix
jupyter nbextension enable --py nbtools --sys-prefix
```

In the future you will be able to install using pip:

```bash
pip install nbtools
```

Or if you use jupyterlab:

```bash
pip install nbtools
jupyter labextension install @jupyter-widgets/jupyterlab-manager
jupyter labextension install @genepattern/nbtools
```

If you are using Jupyter Notebook 5.2 or earlier, you may also need to enable
the nbextension:
```bash
jupyter nbextension enable --py [--sys-prefix|--user|--system] nbtools
```

## Development

For a development install (requires npm version 4 or later), do the following in the repository directory:

```bash
npm install
jupyter labextension link .
```

To rebuild the package and the JupyterLab app:

```bash
npm run build:all
jupyter lab build
```

## Getting Started

Let's start by writing a simple Hello World function and turning it into an interactive widget. Go ahead and install nbtools, launch
Jupyter and open a new, blank notebook.

Once that's completed, let's write a basic function. The function below accepts a string and prints a brief message. By default, the message addresses the world. For good measure we will also add a docstring to document the function.

```python
def say_hello(to_whom='World'):
    """Say hello to the world or whomever."""
    print('Hello ' + to_whom)
```

This is pretty basic Python and hopefully everything so far is familiar. Next, we will turn this function into an interactive widget with just an import statement and one line of code. Update your code to what is shown below and execute the cell.

```python
import nbtools

@nbtools.build_ui
def say_hello(to_whom='World'):
    """Say hello to the world or whomever."""
    print('Hello ' + to_whom)
```

You should now see a widget containing a web form. This form will prompt for the value of the `to_whom` parameter. The docstring will also appear as a description near the top of the widget. Go ahead and change the `to_whom` value, then click the "Run" button. This will execute the function and print the results below. Meanwhile, the form will also collapse, making more room on your screen.

With the push of a button, you've run the `say_hello` function!

This is exciting, but it is far from the only feature of the nbtools package. You can edit markdown cells using a WYSIWYG editor, customize how your function displays, chain together multiple related functions, make widgets from existing third-party methods, create a library of interactive tools (just click the Tools button on the toolbar and you will see `say_hello` has already added itself) and more! Just see the documentation links below.

## Features

* [UI Builder](docs/uibuilder.md)
* [UI Output](docs/uioutput.md)
* [Tool Manager API](docs/toolmanager.md)
* [WYSWYG Editor](docs/wysiwyg.md)
