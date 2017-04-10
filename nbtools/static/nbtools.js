/**
 * @author Thorin Tabor
 *
 * Loads the Notebook Tool Manager extension for Jupyter Notebook
 */


/**
 * Notebook Tools Manager package
 *
 * To use, load using require.js like so:
 *      require(["nbtools"], function (NBToolManager) {
 *          // Your code using the notebook tools manager here
 *          ...
 *          NBToolManager.instance().register(...)
 *      }
 */
define("nbtools", ["base/js/namespace",
                   "nbextensions/jupyter-js-widgets/extension",
                   "nbextensions/nbtools/toolbox",
                   "jquery"], function (Jupyter, widgets, NBToolbox, $) {

    // Store a reference to the NBToolManager singleton
    var _instance = null;

    /**
     * Base Notebook Tool class
     *
     * The intention is that tool developers can create an object of this
     * class when building their own notebook tools. Objects of this class
     * can be passed to the register() function of the NBToolManager.
     *
     * This function accepts a JavaScript object with the following
     * methods and properties:
     *
     * Two methods need to be implemented:
     *      load(): Called when the kernel is loaded
     *      render(): Called when the tool has been clicked in the navigation
     *
     * In addition, some metadata for the tool should be provided in an object:
     *      origin: Identifier for the origin of the tool (local execution, specific remote domain, etc.)
     *      id: Identifier unique within an origin (example: LSID)
     *      name: What we display to the user
     *      description: Brief description of the tool (optional)
     *      version: To identify particular versions of a tool (optional)
     *      tags: Categories or other navigation aids (optional)
     *      attributes: Tool-specific metadata which may be useful to the tool. (optional)
     */
    function NBTool(pObj) {
        // Parameter validation
        if (!pObj) throw "NBTool properties either null or undefined";
        if (typeof pObj === 'object' && (!pObj.load || !pObj.render)) throw "NBTool parameter does not contain load() or render()";
        if (typeof pObj === 'object' && (!pObj.origin || !pObj.id ||!pObj.name)) throw "NBTool parameter does not contain origin, id or name";
        if (typeof pObj.origin !== 'string') throw "NBTool.origin must be a string";
        if (typeof pObj.id !== 'string') throw "NBTool.id must be a string";
        if (typeof pObj.name !== 'string') throw "NBTool.name must be a string";

        /**
         * Function to call when the notebook kernel is first loaded
         * Override and implement this method for the specific tool.
         *
         * @returns {boolean} - Return true if successfully loaded, false otherwise
         */
        this.load = pObj.load;

        /**
         * Function to call when a tool has been selected in the navigation
         * Override and implement this method for the specific tool.
         * Returns a reference to the cell the tool has been rendered in, if any.
         * Otherwise returns null.
         *
         * @returns {Object}
         */
        this.render = pObj.render;

        // Identifier for the origin of the tool (local execution, specific GenePattern server, GenomeSpace, etc.)
        this.origin = pObj.origin;

        // Identifier unique within an origin (example: LSID)
        this.id = pObj.id;

        // What we display to the user
        this.name = pObj.name;

        // Brief description of the tool (optional)
        this.description = typeof pObj.description === 'string' ? pObj.description : null;

        // To identify particular versions of a tool (optional)
        this.version = typeof pObj.version === 'string' || typeof pObj.version === 'number' ? pObj.version : null;

        // Categories or other navigation aids (optional)
        this.tags = typeof pObj.tags === 'object' ? pObj.tags : null;

        // Tool-specific metadata which may be useful to the tool. (optional)
        this.attributes = typeof pObj.attributes === 'object' ? pObj.attributes : null;
    }

    /**
     * Notebook Tool Manager singleton for registering, unregistering and listing
     * tools available in the Jupyter Notebook
     *
     * @type {{instance}}
     */
    class Singleton {
        constructor() {
            // List of registered tools
            this._tools = {};
            // The next ID value to return
            this._next_id = 1;
            // Whether the Jupyter kernel has been loaded yet
            this._kernel_loaded = false;
            // Timestamp of when the tool list was last modified
            this._modified = new Date();
        }

        /**
         * Register a notebook tool with the manager
         * Return null if the provided tool is not valid
         *
         * @param tool - Object implementing the Notebook Tool interface
         * @returns {number|null} - Returns the tool ID or null if invalid
         */
        register(tool) {
            if (Singleton._valid_tool(tool)) {
                var id = this._generate_id();
                this._tools[id] = tool;
                this._modified = new Date();

                // If the kernel has already been loaded, immediately call load() for the tool
                if (this._kernel_loaded) {
                    var success = tool.load();

                    // Log error to console if tool had trouble loading
                    if (!success) console.log("Problem loading tool: " + tool.name);
                }

                return id;
            }
            else {
                return null;
            }
        }

        /**
         * Unregister a notebook tool from the manager
         *
         * @param id - Unique tool ID returned when registering the tool
         * @returns {boolean} - Returns whether the tool was successfully registered
         */
        unregister(id) {
            if (id in this._tools) {
                delete this._tools[id];
                this._modified = new Date();
                return true;
            }
            else {
                return false;
            }
        }

        /**
         * Returns a list of all currently registered tools
         *
         * @returns {Array} - A list of registered tools
         */
        list() {
            var tools = this._tools;
            return Object.keys(this._tools).map(function(key){
                return tools[key];
            });
        }

        /**
         * Returns a Date() object representing when the tool
         * list was last modified. Useful when caching.
         *
         * @returns {*}
         */
        modified() {
            return this._modified;
        }

        /**
         * Tells the Tool Manager that the Jupyter kernel has been loaded.
         * At this point it should call load() on all registered tools.
         * Any tools registered after this point should have load() called
         * immediately upon registration.
         *
         * @private
         */
        _load_kernel() {
            // Get the list to load
            var to_load = this.list();

            // Update manager state
            this._kernel_loaded = true;

            // Load each tool in the list
            for (var i in to_load) {
                var success = to_load[i].load();

                // Log error to console if tool had trouble loading
                if (!success) console.log("Problem loading tool: " + to_load[i].name);
            }

            // Load the Toolbox UI
            NBToolManager.toolbox();
        }

        /**
         * Increment and return the next tool id number
         *
         * @returns {number} - The generated ID
         * @private
         */
        _generate_id() {
            return this._next_id++;
        }

        /**
         * Tests whether the provided tool specification is valid
         *
         * @param tool
         * @returns {boolean}
         * @private
         */
        static _valid_tool(tool) {
            return  tool !== undefined &&
                    tool !== null &&
                    typeof tool === "object" &&
                    typeof tool.load === "function" &&
                    typeof tool.render === "function" &&
                    typeof tool.origin === "string" &&
                    typeof tool.id === "string" &&
                    typeof tool.name === "string";
        }
    }

    /**
     * Initialize the default Toolbox UI
     */
    function toolbox() {
        require(["nbtoolbox"], function(NBToolbox) {
            NBToolbox.init();
        })
    }

    /**
     * Return reference to the Notebook Tool Manager widget
     * and to the Notebook Tool Manager singleton instance
     */
    return {
        NBTool: NBTool,
        toolbox: toolbox,
        instance: function () {
            if (!_instance) {
                _instance = new Singleton();
            }
            return _instance;
        }
    };
});

define(["base/js/namespace",
        "nbextensions/jupyter-js-widgets/extension",
        "nbtools",
        "jquery"], function (Jupyter, widgets, NBToolManager, $) {
    // Has the Tool Manager been initialized yet?
    var done_init = false;

    /**
     * Poll, waiting for the kernel to be loaded, then inform the Tool Manager
     * so that it can call load() on already registered tools
     *
     * @param id - ID of JavaScript interval
     */
    function wait_for_kernel(id) {
        if (!done_init  && Jupyter.notebook.kernel) {
            NBToolManager.instance()._load_kernel();
            done_init = true;
        }
        else if (done_init) {
            clearInterval(id);
        }
    }

    /**
     * Function to call when the nbextension is loaded
     */
    function load_ipython_extension() {
        console.log("Notebook Tool Manager loaded");

        // Register global reference
        window.NBToolManager = NBToolManager;

        // Wait for the kernel to be ready and then call load() on registered tools
        var interval = setInterval(function() {
            wait_for_kernel(interval);
        }, 500);
    }

    /**
     * Return the nbextension load function
     */
    return {
        load_ipython_extension: load_ipython_extension
    }
});