# nbtools for JupyterLab

[![Binder](https://mybinder.org/badge_logo.svg)](https://mybinder.org/v2/gh/g2nb/nbtools/lab?urlpath=lab)
[![Build Status](https://travis-ci.org/g2nb/nbtools.svg?branch=lab)](https://travis-ci.org/genepattern/nbtools)
[![Documentation Status](https://img.shields.io/badge/docs-latest-brightgreen.svg?style=flat)](https://gpnotebook-website-docs.readthedocs.io/en/latest/)
[![Docker Pulls](https://img.shields.io/docker/pulls/genepattern/genepattern-notebook.svg)](https://hub.docker.com/r/genepattern/lab/)
[![Join the chat at https://gitter.im/g2nb](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/genepattern/genepattern-notebook?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
<!--- ![Github Actions Status](https://github.com/g2nb/nbtools/workflows/Build/badge.svg) -->

**nbtools** is a framework for creating user-friendly Jupyter notebooks that are accessible to both programming and non-programming users. It is a core component of the [g2nb project](https://g2nb.org). The package provides:

* A decorator which can transform any Python function into an interactive user interface.
* A toolbox interface for encapsulating and adding new computational steps to a notebook.
* Flexible theming and APIs to extend the nbtools functionality.

### **Looking for classic Jupyter Notebook support?**
**Jupyter Notebook support is available, albeit not in active development. You can find it in its own branch. [Just click here!](https://github.com/g2nb/nbtools/tree/notebook)**


## Requirements

* JupyterLab >= 3.0
* ipywidgets >= 7.5.0

## Docker

A Docker image with nbtools and the full JupyterLab stack is available through DockerHub.

```bash
docker pull g2nb/lab
docker run --rm -p 8888:8888 g2nb/lab
```

## Installation

At the moment you may install a prerelease version from pip or create a development install from GitHub:

```bash
pip install --pre nbtools
```

***OR***

```bash
# Install ipywidgets, if you haven't already
jupyter nbextension enable --py widgetsnbextension
jupyter labextension install @jupyter-widgets/jupyterlab-manager

# Clone the nbtools repository
git clone https://github.com/g2nb/nbtools.git
cd nbtools

# Install the nbtools JupyterLab prototype
pip install -e .
jupyter labextension develop . --overwrite
jupyter nbextension install --py nbtools --symlink --sys-prefix
jupyter nbextension enable --py nbtools --sys-prefix
```

## Development

To develop with nbtools, you will need to first install npm or yarn, as well as install nbtools' dependencies.

You can watch the source directory and run JupyterLab at the same time in different terminals to watch for changes in 
the extension's source and automatically rebuild the extension. To develop, run each of the following commands in a 
separate terminal. 

```bash
jlpm run watch
jupyter lab
```

The `jlpm` command is JupyterLab's pinned version of [yarn](https://yarnpkg.com/) that is installed with JupyterLab. You 
may use `yarn` or `npm` in lieu of `jlpm`.

With the watch command running, every saved change will immediately be built locally and available in your running 
JupyterLab. Refresh JupyterLab to load the change in your browser (you may need to wait several seconds for the 
extension to be rebuilt).

By default, the `jlpm run build` command generates the source maps for this extension to make it easier to debug using 
the browser dev tools. To also generate source maps for the JupyterLab core extensions, you can run the following command:

```bash
jupyter lab build --minimize=False
```

### Uninstall

```bash
pip uninstall nbtools
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
