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

TBD

## Features

* [UI Builder](doc/uibuilder.md)
* [UI Output](doc/uioutput.md)
* [Tool Manager API](doc/toolmanager.md)
* [WYSWYG Editor](wyswyg.md)
