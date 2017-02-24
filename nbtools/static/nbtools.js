define("nbtools", ["base/js/namespace",
                   "nbextensions/jupyter-js-widgets/extension",
                   "jquery"], function (Jupyter, widgets, $) {

    /**
     * Base Notebook Tool class
     *
     * The intention is that tool developers can extend this class when
     * building their own notebook tools. Objects that extend this class
     * can be passed to the register() function of the NBToolManager.
     *
     * Three methods need to be implemented:
     *      load(): Called when the kernel is loaded
     *      prepare(): Called when the tool has been clicked in the navigation
     *      render(): Called to render the tool in the notebook
     *
     * In addition, some metadata for the tool should be provided:
     *      origin: Identifier for the origin of the tool (local execution, specific remote domain, etc.)
     *      id: Identifier unique within an origin (example: LSID)
     *      name: What we display to the user
     *      description: Brief description of the tool (optional)
     *      version: To identify particular versions of a tool (optional)
     *      tags: Categories or other navigation aids (optional)
     *      attributes: Tool-specific metadata which may be useful to the tool. (optional)
     */
    class NBTool {
        constructor() {
            // Identifier for the origin of the tool (local execution, specific GenePattern server, GenomeSpace, etc.)
            this.origin = null;

            // Identifier unique within an origin (example: LSID)
            this.id = null;

            // What we display to the user
            this.name = null;

            // Brief description of the tool (optional)
            this.description = null;

            // To identify particular versions of a tool (optional)
            this.version = null;

            // Categories or other navigation aids (optional)
            this.tags = null;

            // Tool-specific metadata which may be useful to the tool. (optional)
            this.attributes = null;
        }

        /**
         * Function to call when the notebook kernel is first loaded
         * Override and implement this method for the specific tool.
         *
         * @returns {boolean} - Return true if successfully loaded, false otherwise
         */
        load() {}

        /**
         * Function to call when a tool has been selected in the navigation
         * or otherwise is preparing to be rendered.
         * Override and implement this method for the specific tool.
         *
         * @returns {Object} - The Jupyter cell where the tool will be rendered
         */
        prepare() {}

        /**
         * Function to call to render the tool in a Jupyter cell
         * Override and implement this method for the specific tool.
         *
         * @param cell - The Jupyter cell where the tool is being rendered
         * @returns {boolean}
         */
        render(cell) {}
    }

    /**
     * Notebook Tool Manager singleton for registering, unregistering and listing
     * tools available in the Jupyter Notebook
     *
     * @type {{instance}}
     */
    var NBToolManager = (function () {
        var _instance = null;

        /**
         * Define the Tool Manager singleton object
         */
        class Singleton {
            constructor() {
                this._tools = {};
                this._next_id = 0;
            }

            /**
             * Register a notebook tool with the manager
             * Return null if the provided tool is not valid
             *
             * @param tool - Object implementing the Notebook Tool interface
             * @returns {number|null} - Returns the tool ID or null if invalid
             */
            register(tool) {
                if (this._valid_tool(tool)) {
                    var id = this._generate_id();
                    this._tools[id] = tool;
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
                return Object.keys(this._tools).map(function(key){
                    return this._tools[key];
                });
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
            _valid_tool(tool) {
                // TODO: Implement
                return true;
            }
        }

        function init() {
            return new Singleton();
        }

        return {
            instance: function () {
                if (!_instance) {
                    _instance = init();
                }
                return _instance;
            }
        };
    })();

});