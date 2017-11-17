"""
Notebook Tool Manager
"""
from __future__ import print_function
from .jsobject import JSObject
import json
import IPython

__author__ = 'Thorin Tabor'
__copyright__ = 'Copyright 2016-2017, Regents of the University of California & Broad Institute'
__version__ = '0.1.6'
__status__ = 'Beta'
__license__ = 'BSD'

window = None
cache_time = None
tools = None
_py_funcs = {}


class NBTool:
    origin = None
    id = None
    name = None
    description = None
    attributes = None
    tags = None
    version = None
    load = None     # Return value of function is printed to JavaScript console after running
    render = None   # Return value of function is printed to JavaScript console after running

    def __init__(self, origin=None, id=None, name=None, description=None, attributes=None, tags=None, version=None,
                 load=None, render=None, tool_dict={}):
        # Load from tool_dict first
        if 'origin' in tool_dict:
            self.origin = tool_dict['origin']
        if 'id' in tool_dict:
            self.id = tool_dict['id']
        if 'name' in tool_dict:
            self.name = tool_dict['name']
        if 'description' in tool_dict:
            self.description = tool_dict['description']
        if 'attributes' in tool_dict:
            self.attributes = tool_dict['attributes']
        if 'tags' in tool_dict:
            self.tags = tool_dict['tags']
        if 'version' in tool_dict:
            self.version = tool_dict['version']

        # Load from named parameters second
        if origin is not None:
            self.origin = origin
        if id is not None:
            self.id = id
        if name is not None:
            self.name = name
        if description is not None:
            self.description = description
        if attributes is not None:
            self.attributes = attributes
        if tags is not None:
            self.tags = tags
        if version is not None:
            self.version = version
        if load is not None:
            self.load = load
        if render is not None:
            self.render = render


def _lazy_init():
    global window, cache_time, tools

    # Init DOM object
    if window is None:
        window = JSObject()

    # Init last modified date
    if cache_time is None:
        cache_time = window.NBToolManager.instance().modified().toString()

    # Get the current last modified date
    current_modified = window.NBToolManager.instance().modified().toString()

    # Init the tools list
    if tools is None or cache_time != current_modified:
        tools = json.loads(window.JSON.stringify(window.NBToolManager.instance().list()))


def list():
    """
    Get the list of registered tools
    :return:
    """
    global tools
    _lazy_init()
    return tools


def modified():
    """
    Get the timestamp of when the tool list was last modified
    """
    global cache_time
    _lazy_init()
    return cache_time


def register(nbtool):
    """
    Register the provided NBTool object
    """
    global _py_funcs
    _lazy_init()

    # Save references to the tool's load() and render() functions
    load_key = nbtool.origin + '|' + nbtool.id + '|load'
    render_key = nbtool.origin + '|' + nbtool.id + '|render'
    _py_funcs[load_key] = nbtool.load
    _py_funcs[render_key] = nbtool.render

    # Clean optional metadata for inclusion in JavaScript
    clean_description = "null" if nbtool.description is None else '"' + nbtool.description.replace('"','\\"') + '"'
    clean_version = "null" if nbtool.version is None else '"' + nbtool.version.replace('"','\\"') + '"'
    clean_tags = "null" if nbtool.tags is None else json.dumps(nbtool.tags)
    clean_attributes = "null" if nbtool.attributes is None else json.dumps(nbtool.attributes)

    # Pass the metadata to JavaScript
    IPython.display.display_javascript("""
        console.log('ok');
        NBToolManager.instance().register(new NBToolManager.NBTool({
            origin: "%s",
            id: "%s",
            name: "%s",
            description: %s,
            version: %s,
            tags: %s,
            attributes: %s,
            load: function() {
                var x = Jupyter.notebook.kernel.execute('nbtools._py_funcs["%s"]()',
                    {
                        iopub: {
                            output: function(response) {
                                // Print the return value of the Python code to the console
                                console.log(response.content.data["text/plain"]);
                            }
                        }
                    },
                    {
                        silent: false,
                        store_history: false,
                        stop_on_error: true
                    });
                return true;
            },
            render: function() {
                var x = Jupyter.notebook.kernel.execute('nbtools._py_funcs["%s"]()',
                    {
                        iopub: {
                            output: function(response) {
                                // Print the return value of the Python code to the console
                                console.log(response.content.data["text/plain"]);
                            }
                        }
                    },
                    {
                        silent: false,
                        store_history: false,
                        stop_on_error: true
                    });
                return null;
            },
        }));
    """ % (nbtool.origin, nbtool.id, nbtool.name,
           clean_description, clean_version, clean_tags, clean_attributes,
           load_key, render_key), raw=True)
    return True


def unregister(id):
    """
    Unregister the tool with the associated id
    """
    _lazy_init()
    window.NBToolManager.instance().unregister(id)


def load_ipython_extension(ipython):
    ipython.log.info("Notebook Tool Manager ipython loaded!")


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
