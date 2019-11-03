from .jsobject import JSObject
import json
import IPython


# Store tool manager state
window = None
cache_time = None
tools = None
_py_funcs = {}


class NBTool:
    """
    Tool class, used to register new tools with the manager
    """
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


def _send_to_frontend(origin, id, name, load, render, description=None, version=None, tags=None, attributes=None):
    # Clean optional metadata for inclusion in JavaScript
    clean_description = "null" if description is None else description.replace('"', '\\"')
    clean_version = "null" if version is None else version.replace('"', '\\"')
    clean_tags = "null" if tags is None else json.dumps(tags)
    clean_attributes = "null" if attributes is None else json.dumps(attributes)

    # Pass the metadata to JavaScript
    IPython.display.display_javascript(f"""
            NBToolManager.instance().register(new NBToolManager.NBTool({{
                origin: "{origin}",
                id: "{id}",
                name: "{name}",
                description: "{clean_description}",
                version: "{clean_version}",
                tags: {clean_tags},
                attributes: {clean_attributes},
                load: function() {{ {load} }},
                render: function() {{ {render} }},
            }}));""", raw=True)
    return True


def _register_nbtool(nbtool):
    """
    Register the provided NBTool object
    """

    # Save references to the tool's load() and render() functions
    load_key = nbtool.origin + '|' + nbtool.id + '|load'
    render_key = nbtool.origin + '|' + nbtool.id + '|render'
    _py_funcs[load_key] = nbtool.load
    _py_funcs[render_key] = nbtool.render

    load = f"""var x = Jupyter.notebook.kernel.execute('nbtools._py_funcs["{load_key}"]()',
                        {{
                            iopub: {{
                                output: function(response) {{
                                    // Print the return value of the Python code to the console
                                    console.log(response.content.data["text/plain"]);
                                }}
                            }}
                        }},
                        {{
                            silent: false,
                            store_history: false,
                            stop_on_error: true
                        }});
                    return true;"""

    render = f"""var x = Jupyter.notebook.kernel.execute('nbtools._py_funcs["{render_key}"]()',
                        {{
                            iopub: {{
                                output: function(response) {{
                                    // Print the return value of the Python code to the console
                                    console.log(response.content.data["text/plain"]);
                                }}
                            }}
                        }},
                        {{
                            silent: false,
                            store_history: false,
                            stop_on_error: true
                        }});
                    return null;"""


    _send_to_frontend(nbtool.origin, nbtool.id, nbtool.name, load, render, description=nbtool.description,
                      version=nbtool.version, tags=nbtool.tags, attributes=nbtool.attributes)


def _register_widget(widget):
    """Register a UI Builder widget with the manager"""
    _py_funcs[widget.origin + '|' + widget.name + '|widget'] = widget

    load = "return true;"
    render = f"""let code = "nbtools.tool(id='{widget.name}', origin='{widget.origin}')";
                let cell = Jupyter.notebook.get_selected_cell();
                const is_empty = cell.get_text().trim() === "";

                // If this cell is not empty, insert a new cell and use that
                // Otherwise just use this cell
                if (!is_empty) {{
                    cell = Jupyter.notebook.insert_cell_below();
                    Jupyter.notebook.select_next();
                }}

                cell.set_text(code);
                cell.execute();

                return cell;"""

    return _send_to_frontend(origin=widget.origin, id=widget.name, name=widget.name,
                             load=load, render=render, description=widget.description)


def register(tool):
    import nbtools

    """Register a NBTool or UIBuilder object"""
    if isinstance(tool, NBTool):
       return  _register_nbtool(tool)
    elif isinstance(tool, nbtools.UIBuilder):
        return _register_widget(tool)
    else:
        raise ValueError("register() must be passed an NBTool or UIBuilder object")


def unregister(id):
    """
    Unregister the tool with the associated id
    """
    _lazy_init()
    window.NBToolManager.instance().unregister(id)


def tool(id, origin='Notebook'):
    """
    Return reference to tool widget given the id and origin
    """
    return _py_funcs[origin + '|' + id + '|widget']