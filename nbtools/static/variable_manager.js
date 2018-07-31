/**
 * Module for managing kernel variables and their evaluation
 *
 */
define("nbtools/variables", ["base/js/namespace",
                             "nbextensions/jupyter-js-widgets/extension",
                             "jquery",
                             "nbextensions/nbtools/nbtools"], function (Jupyter, widgets, $) {

    /**
     * Remove surrounding single quotes from Python strings
     *
     * @param raw_text
     * @returns {*}
     */
    function cleanVariableText(raw_text) {
        return raw_text.replace(/^\'|\'$/g, "");
    }

    /**
     * Call the kernel and get the value of a variable,
     * then make callback, passing in the value
     *
     * @param code
     * @param callback
     */
    function getKernelValue(code, callback) {
        Jupyter.notebook.kernel.execute(
            code,
            {
                iopub: {
                    output: function(response) {
                        // See if there is any output
                        if (response.content.data) {
                            let return_text = response.content.data["text/plain"];
                            return_text = cleanVariableText(return_text);
                            callback(return_text);
                        }
                        else {
                            // Return null if there was no output
                            callback(null);
                        }
                    }
                }
            },
            { silent: false, store_history: false, stop_on_error: true }
        );
    }

    /**
     * Extract a list of kernel variables from the given string
     *
     * @param raw_value
     * @returns {*}
     */
    function getVariableList(raw_value) {
        // Ensure that the value is a string
        const raw_string = typeof raw_value !== "string" ? raw_value.toString() : raw_value;

        // Handle the case of there being no variables
        if (!raw_string.includes("{{") || !raw_string.includes("}}")) return [];

        try {
            return raw_string
                .match(/{{\s*[\w\.\[\]]+\s*}}/g)
                .map(function(x) { return x.match(/[\w\.\[\]]+/)[0]; });
        }
        catch(e) {
            console.log("Unable to parse for variables in: " + raw_string);
            return [];
        }
    }

    /**
     * Given a string with kernel variables and a map of variable/value pairs,
     * replace all variable instances with their values
     *
     * @param raw_string
     * @param replace_map
     * @returns {*}
     */
    function replaceVariables(raw_string, replace_map) {
        function interpolate(str) {
            return function interpolate(o) {
                return str.replace(/{{([^{}]*)}}/g, function (a, b) {
                    const r = o[b.trim()];
                    return typeof r === 'string' || typeof r === 'number' ? r : a;
                });
            }
        }

        const terped = interpolate(raw_string)(replace_map);
        return terped;
    }

    /**
     * Given a list of variable names, look up the value of each and then make
     * a callback once the values of all are known
     *
     * @param var_list
     * @param parse_custom_syntax
     * @param final_callback
     */
    function evaluateList(var_list, parse_custom_syntax, final_callback) {
        // Initialize the callback counter
        const callbacks_needed = var_list.length;
        let current_callbacks = 0;

        // Declare and populate map with undefined values
        const return_map = {};
        var_list.forEach(function(e) {
            return_map[e] = undefined;
            getKernelValue(e, function(value) {
                // If no matching variable, attempt to parse as module output
                if (value === null && !!parse_custom_syntax) value = parse_custom_syntax(e);

                return_map[e] = value; // Assign the evaluated value
                current_callbacks++;   // Increment the callback counter

                // Once ready, make the final callback
                if (current_callbacks === callbacks_needed) {
                    final_callback(return_map);
                }
            });
        });

        // Check one last time for the final callback
        if (current_callbacks === callbacks_needed) {
            final_callback(return_map);
        }
    }

    /**
     * Evaluate a string and replace all kernel variables with their values,
     * then make a callback.
     *
     * @param raw_string
     * @param callback
     */
    function evaluateVariables(raw_string, callback) {
        const var_list = getVariableList(raw_string);
        evaluateList(var_list, function(syntax) {
            // TODO: FIXME ADD MODULE SYNTAX FROM GPNB PACKAGE
            if (typeof GPNotebook !== 'undefined') return GPNotebook.tasks.getModuleOutput(syntax);
            else return null;
        }, function(value_map) {
            const final_string = replaceVariables(raw_string, value_map);
            callback(final_string);
        });
    }

    /**
     * Return references to the Variable Manager functions
     */
    return {
        cleanVariableText: cleanVariableText,
        getKernelValue: getKernelValue,
        getVariableList: getVariableList,
        replaceVariables: replaceVariables,
        evaluateList: evaluateList,
        evaluateVariables: evaluateVariables
    };
});