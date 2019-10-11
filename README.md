
# nbtools-lab-prototype

[![Build Status](https://travis-ci.org/genepattern/nbtools-lab-prototype.svg?branch=master)](https://travis-ci.org/genepattern/nbtools)
[![codecov](https://codecov.io/gh/genepattern/nbtools-lab-prototype/branch/master/graph/badge.svg)](https://codecov.io/gh/genepattern/nbtools-lab-prototype)


NBTools is a framework for creating user-friendly Jupyter notebooks that are assessible to both programming and non-programming users alike.

## Installation

You can install using `pip`:

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
