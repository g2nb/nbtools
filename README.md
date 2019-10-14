
# nbtools-lab-prototype

[![Build Status](https://travis-ci.org/genepattern/nbtools-lab-prototype.svg?branch=master)](https://travis-ci.org/genepattern/nbtools)
[![codecov](https://codecov.io/gh/genepattern/nbtools-lab-prototype/branch/master/graph/badge.svg)](https://codecov.io/gh/genepattern/nbtools-lab-prototype)


NBTools is a framework for creating user-friendly Jupyter notebooks that are accessible to both programming and non-programming users alike.

Prerequisites

* JupyterLab
* ipywidgets


## Installation

You can install using pip:

```bash
pip install nbtools
```

Or if you use jupyterlab:

```bash
pip install nbtools
jupyter labextension install @jupyter-widgets/jupyterlab-manager
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
