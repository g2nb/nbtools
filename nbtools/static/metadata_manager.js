/**
 * Module for managing the cell matadata used by nbtools
 *
 */
define("nbtools/metadata", ["base/js/namespace",
                            "nbextensions/jupyter-js-widgets/extension",
                            "jquery",
                            "nbextensions/nbtools/nbtools"], function (Jupyter, widgets, $) {

    /**
     * Return the value matching the provided key from the nbtools cell metadata
     *
     * @param cell
     * @param key
     * @returns {*}
     */
    function get_metadata(cell, key) {
        // Check for valid input
        if (typeof cell !== 'object') {
            console.log('ERROR reading cell to get metadata');
            return null;
        }

        // Check if nbtools metadata is missing
        if (!('nbtools' in cell.metadata)) {
            console.log('ERROR metadata missing nbtools flag');
            return null;
        }

        return cell.metadata.nbtools[key];
    }

    /**
     * Set the value matching the provided key in the nbtools cell metadata
     *
     * @param cell
     * @param key
     * @param value
     */
    function set_metadata(cell, key, value) {
        // Check for valid input
        if (typeof cell !== 'object') {
            console.log('ERROR reading cell to set metadata');
            return;
        }

        // Add nbtools metadata if it is missing
        if (!('nbtools' in cell.metadata)) {
            cell.metadata.nbtools = {};
        }

        // Set the value
        cell.metadata.nbtools[key] = value;
    }

    /**
     * Set the new value in the cell metadata
     *
     * @param cell
     * @param param_name
     * @param value
     * @private
     */
    function set_parameter_metadata(cell, param_name, value) {
        // Get the existing param values
        let params = get_metadata(cell, "param_values");

        // Initialize the parameter map if not defined
        if (!params) params = {};

        // Set the new value
        params[param_name] = value;

        // Write to the cell metadata
        set_metadata(cell, "param_values", params)
    }

    /**
     * Check the cell metadata to determine if this cell is a tool cell
     *
     * @param cell
     * @returns {boolean}
     */
    function is_tool_cell(cell) {
        // TODO: Move auto_run_widgets to NBTOOLS
        // Check for valid input
        if (typeof cell !== 'object' || cell.metadata === undefined) {
            console.log('ERROR reading cell metadata');
            return;
        }

        return 'nbtools' in cell.metadata;
    }

    /**
     * Add the metadata to this cell to identify it as an nbtools cell
     *
     * Valid types:
     *      auth - auth cell
     *      task - task cell
     *      job - job cell
     *      uibuilder - UI builder cell
     *
     * Valid options:
     *      server: default GP server URL (used in auth cell)
     *      show_code: hide or show the input code (default is false)
     *      param_values: a map of the current parameter values (used in uibuilder) (not set means use the function's default)
     *      hide_params: a map of whether parameters are hidden (default is false)
     *      name: The name of the tool cell
     *      description: Description of the widget
     *
     * @param cell
     * @param type
     * @param options
     */
    function make_tool_cell(cell, type, options) {
        // Check for valid input
        if (typeof cell !== 'object') {
            console.log('ERROR applying metadata to cell');
            return;
        }

        // Add nbtools metadata if it is missing
        if (!('nbtools' in cell.metadata)) {
            cell.metadata.nbtools = {};
        }

        // Set the tool cell type
        cell.metadata.nbtools.type = type;

        // If the server has been passed in, set it too
        if (options) {
            const opts = Object.keys(options);
            opts.forEach(function(key) {
                cell.metadata.nbtools[key] = options[key];
            });
        }
    }

    /**
     * Return references to the Metadata Manager functions
     */
    return {
        get_metadata: get_metadata,
        set_metadata: set_metadata,
        set_parameter_metadata: set_parameter_metadata,
        is_tool_cell: is_tool_cell,
        make_tool_cell: make_tool_cell
    };
});