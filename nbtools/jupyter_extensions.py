from IPython.core.magic import Magics, magics_class, line_magic

"""
Jupyter-related extensions for nbtools
"""


def load_ipython_extension(ipython):
    ipython.log.info("Notebook Tool Manager IPython loaded!")


def _jupyter_server_extension_paths():
    return [{
        "module": "nbtools"
    }]


def _jupyter_nbextension_paths():
    return [dict(
        section="notebook",
        # the path is relative to the `my_fancy_module` directory
        src="static",
        # directory in the `nbextension/` namespace
        dest="nbtools",
        # _also_ in the `nbextension/` namespace
        require="nbtools/nbtools")]


def load_jupyter_server_extension(nbapp):
    nbapp.log.info("Notebook Tool Manager enabled!")