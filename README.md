
# nbtools-lab-prototype

[![Binder](https://mybinder.org/badge_logo.svg)](https://mybinder.org/v2/gh/genepattern/nbtools-lab-prototype/master?urlpath=lab)
[![Build Status](https://travis-ci.org/genepattern/nbtools-lab-prototype.svg?branch=master)](https://travis-ci.org/genepattern/nbtools)

nbtools is a framework for creating user-friendly Jupyter notebooks that are accessible to both programming and non-programming users alike.

Prerequisites

* JupyterLab
* ipywidgets


## Installation

This is a prototype that has not yet been released to PIP or conda. For now you will need to install from GitHub:

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
