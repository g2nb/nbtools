# Notebook Tool Manager API

The Notebook Tool Manager API consists of two components: a singleton manager which registers and lists tools,
as well as a simple interface a tool can implement to provide its metadata and rendering instructions.

### Tool Manager Singleton
* **register(tool): id**
    * Registers a tool with the manager, passing in an object that implements the Notebook Tool interface (see below).
    Returns an ID unique to this tool’s registration.
* **unregister(id): boolean**
    * Unregisters a tool with the tool manager. Accepts the ID returned by the register() function and returns True
    if the tool was successfully unregistered
* **list(): list**
    * Lists all currently registered tools
* **modified(): timestamp**
    * Returns a timestamp of the last time the list of registered tools was modified (register or unregister). This is
    useful when caching the list of tools.

### Notebook Tool Interface
* **load(): boolean**
    * Function to call when a notebook first loads (for example, import dependencies, add new cell type to the menu,
    add buttons to the toolbar, etc.).
* **render(cell): boolean**
    * Function to call when you click on a tool in the navigation. Returns true if it successfully
    rendered.

> The following is metadata the tool defines and which may be used to render a description of the tool

* **origin: string**
    * Identifier for the origin of the tool (local execution, specific GenePattern server, GenomeSpace, etc.)
* **id: string**
    * identifier unique within an origin (example: LSID)
* **name: string**
    * What we display to the user
* **version: string** (optional)
    * To identify particular versions of a tool
* **description: string** (optional)
    * Brief description of the tool
* **tags: list** (optional)
    * Categories or other navigation aids
* **attributes: dict** (optional)
    * Tool-specific metadata which may be useful to the tool.

# Hello World Examples

Below are two examples of how to define and register a new notebook tool. One example uses Javascript; its intended use is to define tools inside an nbextension or within a Javascript cell. The other example uses Python, and its intended use is to define tools either inside a Jupyter server exension or within a cell in a specific notebook.

## Javascript Example

```javascript
// Import nbtools using RequireJS
require(["nbtools"], function(nbtools) {

    // Instantiate the NBTool object with necessary metadata
    const hello_tool = new nbtools.NBTool({
        id: 'hello_tool',
        name: 'Hello World Tool',
        origin: 'Notebook',

        load: function() {},  // Called when registered

        render: function() {  // Called when the tool is selected
            const cell = Jupyter.notebook.get_selected_cell();
            cell.set_text('Hello World');
        }
    });

    // Register the tool
    nbtools.instance().register(hello_tool);
});
```

## Python Example

```python
import nbtools

# Instantiate the NBTool object with necessary metadata
hello_tool = nbtools.NBTool(id='hello_tool', name='Hello World Tool', origin='Notebook')
hello.tool_load = lambda: None                    # Called when registered
hello_tool.render = lambda: print('Hello World')  # Called when the tool is selected

# Register the tool with the tool manager
nbtools.register(hello_tool)
```
