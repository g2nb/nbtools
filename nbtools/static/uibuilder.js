/**
 * Define the UI Builder widget for Jupyter Notebook
 *
 * @author Thorin Tabor
 * @requires - jQuery
 *
 * Copyright 2019 Regents of the University of California and the Broad Institute
 */

define("nbtools/uibuilder", ["base/js/namespace",
                             "nbextensions/jupyter-js-widgets/extension",
                             "nbtools",
                             "nbtools/variables",
                             "nbtools/metadata",
                             "nbtools/utils",
                             "nbtools/text",
                             "nbtools/choice",
                             "nbtools/file",
                             "nbtools/typeahead"], function (Jupyter, widgets, NBToolManager, VariableManager, MetadataManager, Utils) {

    /**
     * Widget for turning any Python function into a interactive forms
     */
    $.widget("nbtools.uibuilder", {
        // Flags for whether events have been called on the widget
        _widgetRendered: false,
        _paramsLoaded: false,

        options: {
            name: null,
            origin: null,
            description: null,
            output_var: null,
            append_output: true,
            register_tool: true,
            collapse: true,
            params: null,
            events: null,
            function_import: null,
            cell: null
        },

        /**
         * Constructor
         *
         * @private
         */
        _create: function() {
            // Set variables
            const widget = this;
            const identifier = this.options.name;

            // Add data pointer
            this.element.data("widget", this);

            // Add classes and scaffolding
            this.element.addClass("panel panel-default nbtools-widget nbtools-uibuilder");
            this.element.append( // Attach header
                $("<div></div>")
                    .addClass("panel-heading nbtools-widget-task-header")
                    .append(
                        $("<div></div>")
                            .addClass("nbtools-widget-right")
                            .append(
                                $("<button></button>")
                                    .addClass("btn btn-default btn-sm widget-slide-indicator")
                                    .css("padding", "2px 7px")
                                    .attr("title", "Expand or Collapse")
                                    .attr("data-toggle", "tooltip")
                                    .attr("data-placement", "bottom")
                                    .append(
                                        $("<span></span>")
                                            .addClass("fa fa-minus")
                                    )
                                    .tooltip()
                                    .click(function() {
                                        widget.expandCollapse();
                                    })
                            )
                            .append(" ")
                            .append(
                                    $("<div></div>")
                                        .addClass("btn-group")
                                        .append(
                                            $("<button></button>")
                                                .addClass("btn btn-default btn-sm")
                                                .css("padding", "2px 7px")
                                                .attr("type", "button")
                                                .attr("data-toggle", "dropdown")
                                                .attr("aria-haspopup", "true")
                                                .attr("aria-expanded", "false")
                                                .append(
                                                    $("<span></span>")
                                                        .addClass("fa fa-cog")
                                                )
                                                .append(" ")
                                                .append(
                                                    $("<span></span>")
                                                        .addClass("caret")
                                                )
                                        )
                                        .append(
                                            $("<ul></ul>")
                                                .addClass("dropdown-menu")
                                                .append(
                                                    $("<li></li>")
                                                        .append(
                                                            $("<a></a>")
                                                                .attr("title", "View Documentation")
                                                                .attr("href", "#")
                                                                .append("Documentation")
                                                                .click(function() {
                                                                    widget.show_documentation();
                                                                })
                                                        )
                                                )
                                                .append(
                                                    $("<li></li>")
                                                        .append(
                                                            $("<a></a>")
                                                                .attr("title", "Reset Parameters")
                                                                .attr("href", "#")
                                                                .append("Reset Parameters")
                                                                .click(function() {
                                                                    widget.reset_parameters();
                                                                })
                                                        )
                                                )
                                                .append(
                                                    $("<li></li>")
                                                        .append(
                                                            $("<a></a>")
                                                                .attr("title", "Toggle Code View")
                                                                .attr("href", "#")
                                                                .append("Toggle Code View")
                                                                .click(function() {
                                                                    widget.toggle_code();
                                                                })
                                                        )
                                                )
                                        )
                            )
                    )
                    .append(
                        $("<img/>")
                            .addClass("nbtools-widget-logo")
                            .attr("src", NBToolManager.options.logo)
                    )
                    .append(
                        $("<h3></h3>")
                            .addClass("panel-title")
                            .append(
                                $("<span></span>")
                                    .addClass("nbtools-widget-task-name")
                                    .append(identifier + " { }")
                            )
                    )
            );
            this.element.append( // Attach header
                $("<div></div>")
                    .addClass("panel-body")
                    .css("position", "relative")
                    .append( // Attach message box
                        $("<div></div>")
                            .addClass("alert nbtools-widget-task-message")
                            .css("display", "none")
                    )
                    .append( // Attach subheader
                        $("<div></div>")
                            .addClass("nbtools-uibuilder-subheader")
                            .append(
                                $("<div></div>")
                                    .addClass("nbtools-uibuilder-run")
                                    .append(
                                        $("<button></button>")
                                            .addClass("btn btn-primary")
                                            .text("Run")
                                            .click(function() {
                                                if (widget.validate()) {
                                                    widget.submit();
                                                }
                                            })
                                    )
                            )
                            .append(
                                $("<div></div>")
                                    .addClass("nbtools-widget-task-desc")
                            )
                            .append(
                                $("<div></div>").css("clear", "both")
                            )
                    )
                    .append(
                        $("<div></div>") // Attach form placeholder
                            .addClass("form-horizontal nbtools-uibuilder-form")
                    )
                    .append( // Attach footer
                        $("<div></div>")
                            .addClass("nbtools-uibuilder-footer")
                            .append(
                                $("<div></div>")
                                    .addClass("form-horizontal nbtools-widget-ui-output")
                            )
                            .append(
                                $("<div></div>")
                                    .addClass("nbtools-uibuilder-run")
                                    .append(
                                        $("<button></button>")
                                            .addClass("btn btn-primary")
                                            .text("Run")
                                            .click(function() {
                                                if (widget.validate()) {
                                                    widget.submit();
                                                }
                                            })
                                    )
                            )
                            .append(
                                $("<div></div>").css("clear", "both")
                            )
                    )
            );

            // Make call to build the header & form
            widget._buildHeader();
            widget._buildForm();
            widget._buildFooter();
            widget._handle_metadata();

            // Register the widget with the Tool Manager
            widget.register_tool();

            // Trigger gp.widgetRendered event on cell element
            setTimeout(function() {
                widget._widgetRendered = true;
                widget.element.closest(".cell").trigger("nbtools.widget_rendered");
                widget._init_events();
            }, 10);

            return this;
        },

        /**
         * Destructor
         *
         * @private
         */
        _destroy: function() {
            this.element.removeClass("nbtools-uibuilder");
            this.element.empty();
        },

        /**
         * Update all options
         *
         * @param options - Object contain options to update
         * @private
         */
        _setOptions: function(options) {
            this._superApply(arguments);
            const widget = this;
            widget._buildHeader();
            widget._buildForm();
            widget._buildFooter();
            widget._handle_metadata();
        },

        /**
         * Update for single options
         *
         * @param key - The name of the option
         * @param value - The new value of the option
         * @private
         */
        _setOption: function(key, value) {
            this._super(key, value);
        },

        /**
         * Initialize any custom events, if any are specified
         * @private
         */
        _init_events: function() {
            const widget = this;

            // Attach the events, if any are specified
            if (!!widget.options.events) {
                Object.keys(widget.options.events).forEach(function(key) {
                    const str_func = widget.options.events[key];
                    const func = new Function(str_func);

                    // Handle load event as a special case (run now)
                    if (key === 'load') func.call();

                    // Handle the run event as a special case (bind as click on Run button)
                    else if (key === 'run') widget.element.find('.nbtools-uibuilder-run > button').on('click', func);

                    // Otherwise, attach the event
                    else widget.element.on(key, func); // Apply the event
                });
            }
        },

        /**
         * Register the widget with the Tool Manager
         */
        register_tool: function() {
            const widget = this;
            const code = widget.options.cell.get_text();

            // Skip registering with the Tool Manager, if register_tool flag is false
            if (!widget.options.register_tool) return;

            const UIBuilderTool = new NBToolManager.NBTool({
                origin: widget.options.origin,
                id: widget.options.name,
                name: widget.options.name,
                description: widget.options.description,
                load: function() { return true; },
                render: function() {
                    let cell = Jupyter.notebook.get_selected_cell();
                    const is_empty = cell.get_text().trim() === "";

                    // If this cell is not empty, insert a new cell and use that
                    // Otherwise just use this cell
                    if (!is_empty) {
                        cell = Jupyter.notebook.insert_cell_below();
                        Jupyter.notebook.select_next();
                    }

                    cell.set_text(code);
                    cell.execute();

                    return cell;
                }
            });

            // Does a UI Builder tool by this name already exist?
            Object.keys(NBToolManager.instance()._tools).forEach(function(key) {
                let tool = NBToolManager.instance()._tools[key];

                // If so, unregister that tool first
                if (tool.origin === "Notebook" && tool.id === widget.options.name) {
                    NBToolManager.instance().unregister(key);
                }
            });

            // Register the tool
            NBToolManager.instance().register(UIBuilderTool);
        },

        /**
         * Receives a file of the specified kind and sets the first matching param of that type
         * Report an error to the console if no matching parameter found.
         *
         * @param url
         * @param kind
         */
        receive_file: function(url, name, kind) {
            const uiParams = this.element.find(".nbtools-uibuilder-param");
            let matched = false;
            $.each(uiParams, function(i, uiParam) {
                const paramWidget = $(uiParam).find(".nbtools-uibuilder-param-input").data("widget");
                const param = paramWidget._param;
                if (param.kinds !== undefined) {
                    const kinds = param.kinds();
                    if (kinds !== undefined && kinds !== null) {
                        kinds.every(function(k) {
                            if (Utils.wildcard_match(name, k)) {
                                // Found a match!
                                matched = true;
                                // Set the value
                                paramWidget.value(url);
                                // Update the code
                                paramWidget._updateCode();
                                // Return and stop looping
                                return false;
                            }
                            else return true;
                        });
                        // Break from the $.each loop if a match has been found
                        if (matched) return false;
                    }
                }
            });

            // No match was found
            if (!matched) {
                const name = this.options.name;
                console.log("ERROR: No kind match found for " + url + " of kind " + kind + " in " + name);
            }
        },

        /**
         * Returns a list of allkKinds accepted by the function.
         *
         * @returns {Array}
         */
        acceptedKinds: function() {
            const kinds = new Set();

            this.options.params.forEach(function(param) {
                if (param.kinds) for (let k of param.kinds) kinds.add(k)
            });
            return Array.from(kinds);
        },

        reset_parameters: function() {
            const widget = this;
            const cell = this.options.cell;

            // Reset each of the input variables
            const param_doms = widget.element.find(".nbtools-uibuilder-form").find(".nbtools-text, .nbtools-file, .nbtools-choice");
            param_doms.each(function(i, dom) {
                const param_widget = $(dom).data("widget");
                if (param_widget) {
                    let default_value = param_widget.options.param.defaultValue().toString();
                    const param_name = param_widget.options.param.name();

                    param_widget.value(default_value, true);
                    MetadataManager.set_parameter_metadata(cell, param_name, default_value);
                }
                else {
                    console.log("ERROR: Unknown widget in reset_parameters()");
                }
            });

            // Reset the output variable
            const output_dom = widget.element.find(".nbtools-widget-ui-output").find(".nbtools-text");
            const output_widget = $(output_dom).data("widget");
            let default_value = output_widget.options.param.defaultValue().toString();

            // Special case for blank default values
            if (default_value === "") default_value = " ";

            output_widget.value(default_value);
            MetadataManager.set_parameter_metadata(cell, "output_var", default_value.trim());
        },

        _get_parameter: function(name) {
            const param_dom = this.element.find(".nbtools-uibuilder-param[name='" + name + "']").find(".nbtools-text, .nbtools-choice, .nbtools-file");
            if (param_dom) return param_dom.data("widget");
            else console.log("Parameter cannot be found to obtain value: " + name);
        },

        _get_parameter_metadata: function(name) {
            const cell = this.options.cell;
            if (cell.metadata.nbtools.param_values) return cell.metadata.nbtools.param_values[name];
            else return null;
        },

        _handle_metadata: function() {
            const widget = this;
            const cell = this.options.cell;

            // If the metadata has not been set, set it
            if (!MetadataManager.is_tool_cell(cell)) {
                MetadataManager.make_tool_cell(cell, "uibuilder", {
                    show_code: false
                });
            }

            // Read the metadata and alter the widget accordingly

            // Add the current name and description of the widget
            cell.metadata.nbtools.name = widget.options.name;
            cell.metadata.nbtools.origin = widget.options.origin;
	    cell.metadata.nbtools.description = widget.options.description;

            // Hide or show code
            if (!cell.metadata.nbtools.show_code) {
                cell.element.find(".input").hide();
            }

            // Set parameters in the metadata
            if (widget.options.params) {
                if (!cell.metadata.nbtools.param_values) cell.metadata.nbtools.param_values = {};
                widget.options.params.forEach(function(p) {
                    const param = widget._get_parameter(p.name);
                    const value = widget._get_parameter_metadata(p.name);
                    if (param && !value) MetadataManager.set_parameter_metadata(cell, p.name, param.value());

                    // Always set the output_var in the metadata
                    if (p.name === "output_var") MetadataManager.set_parameter_metadata(cell, p.name, param.value());
                });
            }

            // Current values of parameters
            if (cell.metadata.nbtools.param_values) {
                const params = Object.keys(cell.metadata.nbtools.param_values);
                params.forEach(function(key) {
                    const value = widget._get_parameter_metadata(key);
                    const param = widget._get_parameter(key);
                    if (param) param.value(value);
                });
            }
        },

        toggle_code: function() {
            // Get the code block
            const code = this.element.closest(".cell").find(".input");
            const is_hidden = code.is(":hidden");
            const cell = this.options.cell;

            if (is_hidden) {
                // Show the code block
                //code.removeAttr("style");
                code.slideDown();
                MetadataManager.set_metadata(cell, "show_code", true);
            }
            else {
                // Hide the code block
                //code.css("height", "0").css("overflow", "hidden");
                code.slideUp();
                MetadataManager.set_metadata(cell, "show_code", false);
            }
        },

        /**
         * Displays the Python help doc for the function
         */
        show_documentation: function() {
            const widget = this;

            // Handle the case when the import couldn't be found
            const code = this.options.function_import === '' ? this.options.name + '?' : this.options.function_import + '?';

            // Display the help pager
            Jupyter.notebook.kernel.execute(
                code,
                {
                    shell : {
                        payload : {
                            page : function(payload) { widget.options.cell.events.trigger('open_with_text.Pager', payload); }
                        }
                    }
                }
            );
        },

        /**
         * Expand or collapse the task widget
         *
         *     expand - optional parameter used to force an expand or collapse,
         *         leave undefined to toggle back and forth
         */
        expandCollapse: function(expand) {
            const toSlide = this.element.find(".panel-body");
            const indicator = this.element.find(".widget-slide-indicator").find("span");
            const isHidden = toSlide.is(":hidden");

            if (expand !== true && (expand === false || !isHidden)) {
                toSlide.slideUp();
                indicator.removeClass("fa-minus");
                indicator.addClass("fa-plus");
            }
            else if (isHidden || expand) {
                toSlide.slideDown();
                indicator.removeClass("fa-plus");
                indicator.addClass("fa-minus");
            }
        },

        /**
         * Returns an identifier for attaining the Task object from the server
         *
         * @returns {string|null}
         * @private
         */
        _getIdentifier: function() {
            if (this.options.lsid) { return this.options.lsid; }
            else if (this.options.name) { return this.options.name }
            else {
                throw "Error creating Call widget! No LSID or name!";
            }
        },

        /**
         * Build the header and return the Task object
         *
         * @private
         */
        _buildHeader: function() {
            const widget = this;

            // Trim lengthy docstrings
            let lines = widget.options.description.split('\n');
            if (lines.length > 10) {
                lines = lines.slice(0,10);
                lines.push("...");
            }
            const description = lines.join("\n");

            widget.element.find(".nbtools-uibuilder-subheader").show();
            widget.element.find(".nbtools-uibuilder-footer").show();
            widget.element.find(".nbtools-widget-task-desc").empty().text(description);
        },

        /**
         * Make the call to the server to get the params and build the form
         *
         * @private
         */
        _buildForm: function() {
            const widget = this;
            const params = widget.options.params;
            const form = widget.element.find(".nbtools-uibuilder-form");
            let override_output_var = false;

            for (let i = 0; i < params.length; i++) {
                const p = params[i];

                // Special case for output_var
                if (p['name'] === 'output_var') {
                    override_output_var = p;
                    continue;
                }

                try {
                    const param = {
                        _name: p["name"],
                        _label: p["label"],
                        _optional: p["optional"],
                        _description: p["description"],
                        _defaultValue: p["default"],
                        _hidden: p["hide"],
                        _choices: p["choices"] && Object.keys(p["choices"]).length ? p["choices"] : false,
                        _type: p["type"],
                        _maxValues: 1,
                        _kinds: p["kinds"],
                        _id: !!p["id"] ? p["id"] : false,
                        _events: p["events"] && Object.keys(p["events"]).length ? p["events"] : false,

                        name: function() { return this._name; },
                        label: function() { return this._label; },
                        optional: function() { return this._optional; },
                        type: function() { return this._type; },
                        description: function() { return this._description; },
                        choices: function() { return this._choices; },
                        defaultValue: function() { return this._defaultValue; },
                        hidden: function() { return this._hidden; },
                        maxValues: function() { return this._maxValues; },
                        kinds: function() { return this._kinds; },
                        id: function() { return this._id; },
                        events: function() { return this._events; }
                    };

                    const pDiv = widget._addParam(param, form);
                }
                catch(exception) {
                    console.log(exception);
                }
            }

            // Hide the form if no parameters
            const collapse = !params.length || (params.length === 1 && override_output_var);
            if (collapse) form.hide();

            // Hide footer if output var is hidden
            if (collapse && override_output_var['hide']) {
                widget.element.find('.nbtools-uibuilder-footer').hide();
                widget.element.find('.nbtools-uibuilder-subheader').css("border-bottom", "none");
            }

            // Otherwise, hide the lower run button only
            if (collapse && !override_output_var['hide']) widget.element.find('.nbtools-uibuilder-run:last').hide();

            // Trigger the paramLoad event
            $(widget.element).trigger("runTask.paramLoad");
        },

        /**
         * Adds the output variable field to the footer
         *
         * @private
         */
        _buildFooter: function() {
            const widget = this;

            // Get the output_var parameter, if defined
            let output_var_param = null;
            widget.options.params.forEach(function(p) {
                if (p['name'] === 'output_var') output_var_param = p;
            });

            const v_label = output_var_param && output_var_param['label'] ? output_var_param['label'] : 'output_variable';
            const v_desc = output_var_param && output_var_param['description'] ? output_var_param['description'] : "The returned value of the function will be assigned to this variable, if provided.";
            const v_hide = output_var_param && output_var_param['hide'] ? output_var_param['hide'] : false;
            const v_default = output_var_param && output_var_param['default'] ? output_var_param['default'] : widget.options.output_var;
            const v_id = output_var_param && output_var_param['id'] ? output_var_param['id'] : false;
            const v_events = output_var_param && output_var_param['events'] ? output_var_param['events'] : false;

            try {
                const output_param = {
                    name: function() {return "output_var"; },
                    label: function() {return v_label; },
                    optional: function() {return true; },
                    type: function() {return "text"; },
                    description: function() {return v_desc; },
                    choices: function() {return false; },
                    defaultValue: function() { return v_default; },
                    hidden: function() { return v_hide; },
                    id: function() { return v_id; },
                    events: function() { return v_events; }
                };

                const footer = this.element.find(".nbtools-widget-ui-output");
                const pDiv = this._addParam(output_param, footer);
            }
            catch(exception) {
                console.log(exception);
            }
        },

        /**
         * Escape the quotes in a string so it can be safely included in code generation
         *
         * @param srcString
         * @returns {string}
         * @private
         */
        _escapeQuotes: function(srcString) {
            return (srcString + '').replace(/[\\"']/g, '\\$&').replace(/\u0000/g, '\\0');
        },

        /**
         * Unescape quotes in a string so an escaped value can be retrieved from code
         *
         * @param srcString
         * @returns {string}
         * @private
         */
        _unescapeQuotes: function(srcString) {
            return (srcString + '').replace(/\\/g, "");
        },

        /**
         * Mirrors updateCode() in GPTaskWidget, named for compatibility
         * Actually updates the parameter value in the cell metadata
         *
         * @param paramName
         * @param value
         */
        updateCode: function(paramName, value) {
            MetadataManager.set_parameter_metadata(this.options.cell, paramName, value);
        },

        /**
         * Add the parameter to the form and return the widget
         *
         * @param param
         * @param addTo
         * @private
         */
        _addParam: function(param, addTo) {
            const required = param.optional() ? "" : "*";

            const paramBox = $("<div></div>")
                .addClass(" form-group nbtools-uibuilder-param")
                .attr("name", param.name())
                .attr("title", param.name())
                .append(
                    $("<label></label>")
                        .addClass("col-sm-3 control-label nbtools-uibuilder-param-name")
                        .text(Utils.display_name(param.label()) + required)
                )
                .append(
                    $("<div></div>")
                        .addClass("col-sm-9 nbtools-uibuilder-param-wrapper")
                        .append(
                            $("<div></div>")
                                .addClass("nbtools-uibuilder-param-input")
                        )
                        .append(
                            $("<div></div>")
                                .addClass("nbtools-uibuilder-param-desc")
                                .text(param.description())
                        )
                );
            if (param.id()) paramBox.attr("id", param.id());
            if (required) paramBox.addClass("nbtools-widget-task-required");

            // Add the correct input widget
            if (param.type() === "java.io.File" || param.type() === "file") {
                paramBox.find(".nbtools-uibuilder-param-input").fileInput({
                    runTask: this,
                    allowJobUploads: true,
                    param: param
                });
            }
            else if (param.choices() || param.type() === "choice") {
                paramBox.find(".nbtools-uibuilder-param-input").choiceInput({
                    runTask: this,
                    param: param,
                    choices: param.choices(),
                    default: param.defaultValue()
                });
            }
            else if (param.type() === "java.lang.String" || param.type() === "text") {
                paramBox.find(".nbtools-uibuilder-param-input").textInput({
                    runTask: this,
                    param: param,
                    default: param.defaultValue()
                });
            }
            else if (param.type() === "java.lang.Integer" || param.type() === "java.lang.Float" || param.type() === "number") {
                paramBox.find(".nbtools-uibuilder-param-input").textInput({
                    runTask: this,
                    param: param,
                    default: param.defaultValue(),
                    type: "number"
                });
            }
            else if (param.type() === "password") {
                paramBox.find(".nbtools-uibuilder-param-input").textInput({
                    runTask: this,
                    param: param,
                    default: param.defaultValue(),
                    type: "password"
                });
            }
            else {
                console.log("Unknown input type for Call widget: " + param.name() + " " + param.type());
                this.errorMessage("Type error in parameter " + param.name() + ", defaulting to text input.");

                paramBox.find(".nbtools-uibuilder-param-input").textInput({
                    runTask: this,
                    param: param,
                    default: param.defaultValue()
                });
            }

            // Hide the parameter if param.hidden() is true
            if (param.hidden()) paramBox.hide();

            // Attach the events, if any are specified
            if (param.events()) {
                Object.keys(param.events()).forEach(function(key) {
                    const str_func = param.events()[key];
                    const func = new Function(str_func);
                    paramBox.on(key, func); // Apply the event
                });
            }

            addTo.append(paramBox);
            return paramBox.find(".nbtools-uibuilder-param-input");
        },

        /**
         * From the input widget's element get the input widget's value
         *
         * @param inputDiv - The element that has been made into the widget
         * @returns {*}
         * @private
         */
        _getInputValue: function(inputDiv) {
            if ($(inputDiv).hasClass("nbtools-file")) {
                return $(inputDiv).fileInput("value");
            }
            else if ($(inputDiv).hasClass("nbtools-text")) {
                return $(inputDiv).textInput("value");
            }
            else if ($(inputDiv).hasClass("nbtools-choice")) {
                return $(inputDiv).choiceInput("value");
            }
            else {
                console.log("Unknown input widget type.");
                return null;
            }
        },

        /**
         * Show a success message to the user
         *
         * @param message - String containing the message to show
         */
        successMessage: function(message) {
            const messageBox = this.element.find(".nbtools-widget-task-message");
            messageBox.removeClass("alert-danger");
            messageBox.addClass("alert-success");
            messageBox.text(message);
            messageBox.show("shake", {}, 500);
        },

        /**
         * Show an error message to the user
         *
         * @param message - String containing the message to show
         */
        errorMessage: function(message) {
            const messageBox = this.element.find(".nbtools-widget-task-message");
            messageBox.removeClass("alert-success");
            messageBox.addClass("alert-danger");
            messageBox.text(message);
            messageBox.show("shake", {}, 500);
        },

        /**
         * Validate the current Call form
         */
        validate: function() {
            let validated = true;
            const missing = [];
            const params = this.element.find(".nbtools-uibuilder-param");

            // Validate each required parameter
            for (let i = 0; i < params.length; i++) {
                const param = $(params[i]);
                const required = param.hasClass("nbtools-widget-task-required");
                if (required) {
                    const input = param.find(".nbtools-uibuilder-param-input");
                    let value = this._getInputValue(input);
                    if (typeof value === "string") value = value.trim();
                    if (value === null || value === "" || value.length === 0) {
                        param.addClass("nbtools-uibuilder-param-missing");
                        missing.push(param.attr("name"));
                        validated = false;
                    }
                    else {
                        param.removeClass("nbtools-uibuilder-param-missing");
                    }
                }
            }

            // Display message to user
            if (validated) {
                this.clearError();
            }
            else {
                this.errorMessage("Missing required parameters: " + missing.join(", "));
            }

            return validated;
        },

        clearError: function() {
            const messageBox = this.element.find(".nbtools-widget-task-message");
            messageBox.removeClass("alert-danger");
            messageBox.hide();
        },

        escape_quotes: function(str) {
            return str.replace(/\"/g, '\\"').replace(/\'/g, '\\\'');
        },

        buildFunctionCode: function(input, output_variable) {
            let import_path = null;
            let toReturn = '';

            if (output_variable) {
                toReturn += output_variable + " = ";
            }

            // Handle the case when the import couldn't be found
            if (this.options.function_import === '') {
                // toReturn += '# Unable to determine function import path. Please manually correct.\n';
                import_path = this.options.name
            }
            else {
                import_path = this.options.function_import;
            }

            toReturn += import_path + "(";
            let values = [];
            for (let i = 0; i < input.length; i++) {
                // Read the input object
                const in_obj = input[i];
                let value = in_obj.value[0];
                let reference = in_obj.reference;
                let literal = in_obj.string_literal;

                // Handle numbers
                if (!isNaN(value) && !!value.trim()) {
                    reference = true;
                }

                // Handle booleans
                try {
                    if (typeof JSON.parse(value.toLowerCase()) === "boolean") {
                        value = JSON.parse(value.toLowerCase()) ? "True" : "False";
                        reference = true;
                    }
                }
                catch (e) {} // Not a boolean, do nothing

                // Handle strings
                if (literal || (typeof value === "string" && !reference)) value = '"' + this.escape_quotes(value) + '"';

                // Hack fix for empty lists
                if (value === undefined) value = '[]';

                values.push(in_obj.name + "=" + value);
            }

            toReturn += values.join(", ");
            toReturn += ")";

            return toReturn;
        },

        /**
         * Retrieves the output variable from metadata and escapes invalid characters
         * Returns null if no valid value is defined.
         *
         * @private
         */
        _get_valid_output_variable: function() {
            // Get the output in the metadata
            let output = this._get_parameter_metadata("output_var");

            // Return null if the value is not defined
            if (output === null || output === undefined) return null;

            // Convert to string and trim
            output = output.toString().trim();

            // Remove invalid characters
            output = output.replace(/\W/g, '');

            // Return null if the converted value is the empty string
            if (output === "") return null;

            // Return null for the special cases of None, True, False
            if (output === "None" || output === "True" || output === "False") return null;

            // Return null for numerical values
            if (/^\d+$/.test(output)) return null;

            return output;
        },

        /**
         * Submit the Call form to the kernel
         */
        submit: function() {
            const widget = this;

            widget.uploadAll({
                success: function() {
                    widget.evaluateAllVars({
                        success: function (globals) {
                            let code;
                            try {
                                // Get the output variable, if one is defined
                                const funcOutput = widget._get_valid_output_variable();

                                // Assign values from the inputs to the job input
                                let funcInput = [];
                                const uiParams = widget.element.find(".nbtools-uibuilder-form").find(".nbtools-uibuilder-param");
                                for (let i = 0; i < uiParams.length; i++) {
                                    const uiParam = $(uiParams[i]);
                                    const uiInput = uiParam.find(".nbtools-uibuilder-param-input");
                                    let uiValue = widget._getInputValue(uiInput);

                                    // Handle leading and trailing whitespace
                                    if (typeof uiValue === "string") uiValue = uiValue.trim();

                                    let name = uiParam.attr("name");
                                    let quotes = widget.is_string_literal(uiInput.find("input:last, select").val());

                                    // Check for variable references
                                    let reference = false;
                                    if (typeof uiValue === "string") reference = globals.indexOf(uiValue) >= 0 && !quotes;          // Handle string values
                                    if (uiValue.constructor === Array) reference = globals.indexOf(uiValue[0]) >= 0 && !quotes;     // Handle array values

                                    if (uiValue !== null) {
                                        // Wrap value in list if not already wrapped
                                        if (uiValue.constructor !== Array) {
                                            uiValue = [uiValue];
                                        }

                                        funcInput.push({
                                            name: name,
                                            value: uiValue,
                                            reference: reference,
                                            string_literal: quotes
                                        });
                                    }
                                }

                                // Scroll to the new cell
                                $('#site').animate({
                                    scrollTop: $(widget.options.cell.element).position().top
                                }, 500);

                                if (widget.options.collapse) widget.expandCollapse(false);
                                code = widget.buildFunctionCode(funcInput, funcOutput);
                            }
                            catch(e) {
                                widget._add_output_area(widget.options.cell, "ERROR: Client-side issue building output code. " + e);
                                return;
                            }

                            // Display the code either in a new cell or in the same cell
                            widget._display_output(code);
                        },
                        error: function (exception) {
                            widget.errorMessage("Error evaluating kernel variables in preparation of job submission: " + exception.statusText);
                        }
                    });
                },
                error: function(exception) {
                    widget.errorMessage("Error uploading in preparation of job submission: " + exception.statusText);
                }
            });
        },

        _display_output: function(code) {
            const widget = this;
            const cell = widget.options.cell;

            try {
                // If append_output is false, display the code in a new cell (the old way)
                if (!this.options.append_output) {
                    widget._new_cell_output(code);
                    return;
                }

                // Otherwise, clear output and append to this cell
                cell.element.find(".nbtools-uibuilder-output").remove();

                // Execute the code in the background
                Jupyter.notebook.kernel.execute(code, {
                        iopub: {
                            output: function (response) {
                                // Handle errors
                                if (response.msg_type === "error") widget._add_output_error(cell, response.content);

                                // Handle standard response
                                else widget._add_output_area(cell, response.content)
                            }
                        }
                    },
                    {
                        silent: false,
                        store_history: true,
                        stop_on_error: true
                    });
            }
            catch (e) {
                widget._add_output_area(widget.options.cell, "ERROR: Client-side issue handling code execution. " + code + "\n | \n" + e);
            }
        },

        escape_return_text: function(raw_text) {
            const utils = require("base/js/utils");

            // Escape HTML tags
            let fixed_text = utils.fixConsole(raw_text);

            // Replace URLs links with links
            fixed_text = utils.autoLinkUrls(fixed_text);

            return fixed_text;
        },

        /**
         * Appends an error response to the UI Builder cell with the returned error info
         *
         * @param cell
         * @param content
         * @private
         */
        _add_output_error: function(cell, content) {
            const widget = this;

            // Create the output_area structure
            let uibuilder_output = this._output_area_structure(cell);

            // Build the stack trace message
            let error_message;
            if (content.traceback) {
                error_message = '';
                content.traceback.forEach(function(e) {
                    error_message += widget.escape_return_text(e) + '\n';
                });
            }

            else {
                error_message = content.ename && content.evalue ? content.ename + ": " + content.evalue : content;
            }

            $(uibuilder_output)
                .addClass("output_text output_error")
                .append(
                    $("<pre></pre>").html(error_message)
                );
        },

        /**
         * Build the basic structure of the output area and return the right div for appending
         *
         * @param cell
         * @returns {*|jQuery}
         * @private
         */
        _output_area_structure: function(cell) {
            // Create the output_area structure
            const output_subarea = $("<div></div>").addClass("output_subarea jupyter-widgets-view");
            const output = cell.element.find(".output:first");
            output.append(
                $("<div></div>")
                    .addClass("output_area nbtools-uibuilder-output")
                    .append($("<div></div>").addClass("prompt"))
                    .append(output_subarea)
            );

            // Add the new output to the output_subarea
            return $("<div></div>").appendTo(output_subarea);
        },

        /**
         * Appends an output area to the UI Builder cell with the returned output of the function.
         * This will be called multiple times if the function has repeated output.
         *
         * @param cell
         * @param content
         * @private
         */
        _add_output_area: function(cell, content) {
            // Create the output_area structure
            let uibuilder_output = this._output_area_structure(cell);

            // Handle string error message
            if (typeof content === "string") {
                $(uibuilder_output)
                    .addClass("output_text")
                    .append(
                        $("<pre></pre>").text(content)
                    );
            }

            // Handle text output without returned data
            else if (content.text) {
                const escaped_text = this.escape_return_text(content.text);

                $(uibuilder_output)
                    .addClass("output_text")
                    .append(
                        $("<pre></pre>")
                            .html(escaped_text)
                    );
            }

            // Handle png output
            else if (content.data && content.data["image/png"]) {
                $(uibuilder_output)
                    .addClass("output_png")
                    .append(
                        $("<img />")
                            .attr("alt", content.data["text/plain"])
                            .attr("src", "data:image/png;base64, " + content.data["image/png"])
                    );
            }

            // Handle jpeg output
            else if (content.data && content.data["image/jpeg"]) {
                $(uibuilder_output)
                    .addClass("output_jpeg")
                    .append(
                        $("<img />")
                            .attr("alt", content.data["text/plain"])
                            .attr("src", "data:image/jpeg;base64, " + content.data["image/jpeg"])
                    );
            }

            // Handle widget output
            else if (content.data && content.data["application/vnd.jupyter.widget-view+json"]) {
                // Retrieve the model ID and use this to look up the widget manager and model promise
                const model_id = content.data["application/vnd.jupyter.widget-view+json"]["model_id"];
                const widget_manager = Jupyter.WidgetManager._managers[0];
                const model_promise = widget_manager._models[model_id];

                model_promise
                    // Resolve the model promise, creating a new output area object and view promise
                    .then(function(model) {
                        const output_area = requirejs("notebook/js/outputarea");
                        const output = new output_area.OutputArea({
                            selector: uibuilder_output,
                            config: {data: {OutputArea: {}}},
                            prompt_area: false,
                            events: widget_manager.notebook.events,
                            keyboard_manager: widget_manager.keyboard_manager
                        });

                        return model.widget_manager.create_view(model, {
                            cell: cell,
                            output: output
                        });
                    }, console.error.bind(console))

                    // Resolve the view promise, creating a new promise for the display
                    .then(function(view) {
                        return widget_manager.display_view(null, view);
                    }, console.error.bind(console))

                    // Resolve the display promise and append the widget to the output area
                    .then(function(display) {
                        display.$el.appendTo(uibuilder_output);

                        // Make sure parents are visible
                        uibuilder_output.parents().show()
                    });
            }

            // Handle returned Javascript data
            else if (content.data && content.data["application/javascript"]) {
                $(uibuilder_output)
                    .addClass("output_javascript");
                eval(content.data["application/javascript"]);
            }

            // Handle returned HTML data
            else if (content.data && content.data["text/html"]) {
                $(uibuilder_output)
                    .addClass("rendered_html")
                    .html(content.data["text/html"])
            }

            // Handle returned text data
            else if (content.data && content.data["text/plain"]) {
                const fixed_text = this.escape_return_text(content.data["text/plain"]);

                $(uibuilder_output)
                    .addClass("output_text")
                    .append(
                        $("<pre></pre>")
                            .html(fixed_text)
                    );
            }

            // If none of these types match, log an error
            else {
                console.log("Unknown return type in UIBuilder");
                console.log(content);
            }
        },

        _new_cell_output: function(code) {
            const index = Utils.cell_index(this.options.cell) + 1;
            const cell = Jupyter.notebook.insert_cell_at_index("code", index);
            cell.code_mirror.setValue(code);
            cell.execute();
        },

        /**
         * Query the kernel for the list of global names, then make a callback,
         *      passing as a parameter the list of global names
         *
         * @param callback
         */
        get_globals: function(callback) {
            const code = "import json\njson.dumps(list(globals().keys()))";

            VariableManager.getKernelValue(code, function(raw_text) {
                let globals = [];

                try {
                    globals = JSON.parse(raw_text);
                }
                catch (e) {
                    console.log("Error parsing JSON from globals()");
                }

                callback(globals);
            });
        },

        /**
         * Test if the value is surrounded by matching quotes
         *
         * @param test_string
         * @returns {boolean}
         */
        is_string_literal: function(test_string) {
            if (test_string === null) return false;
            const quote_test = new RegExp("^\'.*\'$|^\".*\"$");
            return quote_test.test(test_string.trim())
        },

        /**
         * Calls the Jupyter contents API to upload the file
         *
         * @param pObj - Object containing the following params:
         *                  file: The file object to upload
         *                  success: Callback for success, expects response and url
         *                  error: Callback on error, expects exception
         * @private
         */
        _jupyter_upload: function (pObj) {
            // Get the notebook's current directory
            const dir_path = Jupyter.notebook.notebook_path.substring(0, Jupyter.notebook.notebook_path.lastIndexOf("\/") + 1);

            // Create the base model object
            const model = {
                format: 'base64',
                type: 'file'
            };

            // Instantiate the file reader
            const reader = new FileReader();

            // Closure to capture the file information.
            reader.onload = (function (the_file) {
                return function (e) {
                    // Construct the path to the uploaded file
                    const path = dir_path + the_file.name;

                    // Attach the file data to the model
                    model.content = btoa(e.target.result);

                    // Start the file upload
                    const promise = Jupyter.notebook.contents.save(path, model);

                    // Make the success callback
                    promise.then(function(response) {
                        pObj.success(response, the_file.name);
                    });
                };
            })(pObj.file);

            // Begin reading the file
            try {
                reader.readAsBinaryString(pObj.file);
            }
            catch (e) {
                // Make the error callback if something goes wrong
                pObj.error(e);
            }
        },

        /**
         * Upload all the file inputs that still need uploading
         *
         * @param pObj - Object containing the following params:
         *                  success: Callback for success, expects no arguments
         *                  error: Callback on error, expects exception
         * @returns {boolean} - Whether an upload was just initiated or not
         */
        uploadAll: function(pObj) {
            const fileWidgets = this.element.find(".nbtools-file");
            const widget = this;
            const uploadList = [];
            let error = false;

            // Create upload list
            for (let i = 0; i < fileWidgets.length; i++) {
                const fileWidget = $(fileWidgets[i]).data("widget");
                let values = fileWidget.values();

                // Protect against nulls
                if (values === null || values === undefined) values = [];

                $.each(values, function(i, e) {
                    if (typeof e === 'object') {
                        uploadList.push({
                            file: e,
                            widget: fileWidget
                        });
                    }
                });
            }

            // Declare finalizeUploads()
            const finalizeUploads = function() {
                if (error) {
                    pObj.error(error);
                }
                else {
                    pObj.success();
                }
            };

            // Declare grabNextUpload()
            const grabNextUpload = function() {
                // Pop the upload off the list
                const upload = uploadList.shift();

                // If it's not undefined, upload
                if (upload !== undefined) {
                    widget.successMessage("Uploading file " + upload.file.name);
                    widget._jupyter_upload({
                        file: upload.file,
                        success: function(response, url) {
                            // Mark the file as uploaded
                            const display = upload.widget._singleDisplay(upload.file);
                            upload.widget._replaceValue(display, url);
                            widget.updateCode(upload.widget._param.name(), [url]);

                            // On the success callback call grabNextUpload()
                            grabNextUpload();
                        },
                        error: function(exception) {
                            // On the error callback set the error and call finalize
                            error = exception;
                            finalizeUploads();
                        }
                    });
                }

                // If it is undefined, call finalizeUploads()
                else {
                    finalizeUploads();
                }
            };

            // Start the uploads
            grabNextUpload();
        },

        /**
         * Iterate through every input parameter and replace input string with
         * kernel variables, if any, then make a callback
         *
         * @param pObj - Object containing the following params:
         *                  success: Callback for success, expects no arguments
         *                  error: Callback on error, expects exception
         */
        evaluateAllVars: function(pObj) {
            const widget = this;
            const inputWidgets = this.element.find(".nbtools-uibuilder-form").find(".nbtools-uibuilder-param-input");
            let evalCallsFinished = false;
            let evalsNeeded = 0;
            let evalsFinished = 0;

            widget.get_globals(function(globals) {
                // Iterate over each widget
                for (let i = 0; i < inputWidgets.length; i++) {
                    const iWidget = $(inputWidgets[i]).data("widget");

                    // Update widget values, do not call for files that already possess a value
                    if (!(iWidget.element.hasClass("nbtools-file") && iWidget.values() !== null && iWidget.values().length > 0)) {
                        iWidget.element.find("input").change(); // Update widget values
                    }

                    let value = iWidget.value();

                    // Protect against nulls
                    if (value === null || value === undefined) value = [];

                    const makeCall = function(iWidget, value, valueIndex) {
                        // If surrounding quote, treat as string literal and skip variable evaluation
                        if (widget.is_string_literal(value)) {
                            const evalValue = value.trim().substring(1, value.trim().length-1);
                            if (valueIndex === undefined) iWidget._value = evalValue;
                            else iWidget._values[valueIndex] = evalValue;

                            // Count this as an eval finished
                            evalsFinished++;

                            // Make the final callback once ready
                            if (evalCallsFinished && evalsFinished === evalsNeeded) pObj.success(globals);
                            return; // Return now, don't evaluate the string literal for variables
                        }

                        // Otherwise, evaluate the variables
                        VariableManager.evaluateVariables(value, function(evalValue) {
                            if (valueIndex === undefined) iWidget._value = evalValue;
                            else iWidget._values[valueIndex] = evalValue;

                            // Count this as an eval finished
                            evalsFinished++;

                            // Make the final callback once ready
                            if (evalCallsFinished && evalsFinished === evalsNeeded) pObj.success(globals);
                        });
                    };

                    // If value is not a list, evaluate and set
                    if (!Array.isArray(value)) {
                        // Count this as an eval needed
                        evalsNeeded++;

                        makeCall(iWidget, value.toString());
                    }
                    // Otherwise, iterate over the list, evaluate and set
                    else {
                        evalsNeeded += value.length;

                        for (let j = 0; j < value.length; j++) {
                            const valueIndex = j;
                            const innerValue = value[j];

                            makeCall(iWidget, innerValue.toString(), valueIndex);
                        }
                    }
                }

                // All calls for evaluation have been made
                evalCallsFinished = true;

                // Check one last time to see if we need to make the final callback
                if (evalCallsFinished && evalsFinished === evalsNeeded) pObj.success(globals);
            });
        },

        /**
         * Extract a list of kernel variables from the given string
         *
         * @param raw_string
         * @returns {*}
         */
        _getVariableList: function(raw_string) {
            // Handle the case of not being a string
            if (typeof raw_string !== "string") return [];

            // Handle the case of there being no variables
            if (!raw_string.includes("{{") || !raw_string.includes("}}")) return [];

            return raw_string
                .match(/{{\s*[\w\.]+\s*}}/g)
               .map(function(x) { return x.match(/[\w\.]+/)[0]; });
        },

        _prepare_variables: function(value) {
            // Handle numbers
            if (!isNaN(value) && !!value.trim()) return parseFloat(value);

            console.log(value);

            // Handle booleans
            if ((typeof value === "boolean" && value) || value.toLowerCase() === "true") return true;
            if ((typeof value === "boolean" && !value) || value.toLowerCase() === "false") return false;

            // Handle strings
            if (typeof value === "string") return this._escapeQuotes(value);
        }
    });

    const UIBuilderView = widgets.DOMWidgetView.extend({
        render: function () {
            const widget = this;
            let cell = widget.options.cell;

            // Ugly hack for getting the Cell object in ipywidgets 7
            if (!cell) cell = widget.options.output.element.closest(".cell").data("cell");

            // Render the view.
            if (!this.el) widget.setElement($('<div></div>'));

            const name = widget.model.get('name');
            const description = widget.model.get('description');
            const origin = widget.model.get('origin');
            const output_var = widget.model.get('output_var');
            const params = widget.model.get('params');
            const events = widget.model.get('events');
            const function_import = widget.model.get('function_import');
            const register_tool = widget.model.get('register_tool');
            const collapse = widget.model.get('collapse');

            // Render the cell and hide code by default
            const element = widget.$el;
            const hideCode = function() {
                const cell_div = element.closest(".cell");
                if (cell_div.length > 0) {
                    // Initialize the widget
                    $(widget.$el).uibuilder({
                        name: name,
                        description: description,
			origin: origin,
                        output_var: output_var,
                        params: params,
                        events: events,
                        function_import: function_import,
                        register_tool: register_tool,
                        collapse: collapse,
                        cell: cell
                    });
                }
                else {
                    setTimeout(hideCode, 10);
                }
            };
            setTimeout(hideCode, 1);

            // Double-check to make sure the widget renders
            Utils.ensure_rendering(cell);
        }
    });

    return {
        UIBuilderView: UIBuilderView
    }
});
