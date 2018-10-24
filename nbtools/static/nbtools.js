/**
 * @author Thorin Tabor
 *
 * Bootstraps the nbtools nbextension for Jupyter Notebook
 */
define(["base/js/namespace",
        "nbextensions/jupyter-js-widgets/extension",
        "jquery",
        "jqueryui",

        // Bootstrap loading the nbtools requirejs modules
        "nbextensions/nbtools/tool_manager",
        "nbextensions/nbtools/metadata_manager",
        "nbextensions/nbtools/variable_manager",
        "nbextensions/nbtools/utils",
        "nbextensions/nbtools/toolbox",
        "nbextensions/nbtools/text",
        "nbextensions/nbtools/choice",
        "nbextensions/nbtools/file",
        "nbextensions/nbtools/typeahead",
        "nbextensions/nbtools/uibuilder",
        "nbextensions/nbtools/uioutput"], function (Jupyter, widgets, $) {

    // Has the Tool Manager been initialized yet?
    let done_init = false;

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
        require(["nbtools"], function(NBToolManager) {
            console.log("Notebook Tools loaded");

            // Register global reference
            window.NBToolManager = NBToolManager;

            // Wait for the kernel to be ready and then call load() on registered tools
            const interval = setInterval(function() {
                wait_for_kernel(interval);
            }, 500);
        });
    }

    /**
     * Return the nbextension load function
     */
    return {
        load_ipython_extension: load_ipython_extension
    }
});