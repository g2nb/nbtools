/**
 * Widget for representing Python output as an interactive interface
 *
 * @author Thorin Tabor
 * @requires - jQuery
 *
 * Copyright 2019 Regents of the University of California and the Broad Institute
 */

define("nbtools/uioutput", ["base/js/namespace",
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
     * Widget for representing Python output as an interactive interface
     */
    $.widget("nbtools.outputWidget", {
        options: {
            name: null,             // Widget name
            description: null,      // Widget description
            status: null,           // Widget status
            files: [],              // List of result files
            text: null,             // Text output
            visualization: null,    // Output visualization
            cell: null
        },

        /**
         * Constructor
         *
         * @private
         */
        _create: function () {
            const widget = this;
            const cell = this.options.cell;

            // Add data pointer
            this.element.data("widget", this);

            // Get the input text
            const input_number = cell.element.find(".input_prompt").text();

            // Add class and child elements
            this.element.addClass("panel panel-default nbtools-widget nbtools-output");
            this.element.append(
                $("<div></div>")
                    .addClass("nbtools-output-right")
                    .append(
                        $("<div></div>")
                            .addClass("nbtools-widget-job-buttons")
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
                                    .click(function () {
                                        widget.expandCollapse();
                                    })
                            )
                            .append(" ")
                            .append(
                                $("<div></div>")
                                    .addClass("btn-group nbtools-widget-job-group")
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
                                            .addClass("dropdown-menu gear-menu")
                                            .append(
                                                $("<li></li>")
                                                    .append(
                                                        $("<a></a>")
                                                            .attr("title", "Toggle Code View")
                                                            .attr("href", "#")
                                                            .append("Toggle Code View")
                                                            .click(function () {
                                                                widget.toggle_code();
                                                            })
                                                    )
                                            )
                                    )
                            )
                    )
            );
            this.element.append(
                $("<div></div>")
                    .addClass("panel-heading nbtools-widget-job-header")
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
                                    .addClass("nbtools-widget-job-task")
                                    .append(widget.options.name)
                            )
                    )
            );
            this.element.append(
                $("<div></div>")
                    .addClass("panel-body")
                    .append(
                        $("<div></div>")
                            .addClass("nbtools-widget-job-body-wrapper")
                            .append( // Attach message box
                                $("<div></div>")
                                    .addClass("nbtools-widget-task-desc")
                                    .css("display", widget.options.description ? 'block' : 'none')
                                    .append(widget.options.description)
                            )
                            .append(
                                $("<div></div>")
                                    .addClass("row")
                                    .append(
                                        $("<div></div>")
                                            .addClass("nbtools-output-status col-md-3")
                                            .append(widget.options.status ? widget.options.status : input_number)
                                    )
                                    .append(
                                        $("<div></div>")
                                            .addClass("nbtools-widget-job-outputs col-md-9")
                                            .append(widget._build_file_links())
                                    )
                            )
                            .append(
                                $("<div></div>")
                                    .addClass("output_text nbtools-output-text")
                                    .css("display", widget.options.text ? 'block' : 'none')
                                    .append(
                                        $("<pre></pre>")
                                            .append(widget.options.text)
                                    )
                            )
                            .append(
                                $("<div></div>")
                                    .addClass("nbtools-output-visualize")
                                    .append(widget._handle_visualization())
                            )
                    )
            );

            // Handle the metadata
            widget._handle_metadata();

            // Trigger gp.widgetRendered event on cell element
            setTimeout(function () {
                widget.element.closest(".cell").trigger("nbtools.widget_rendered");
            }, 10);

            return this;
        },

        /**
         * Destructor
         *
         * @private
         */
        _destroy: function () {
            this.element.removeClass("nbtools-widget nbtools-output panel panel-default");
            this.element.empty();
        },

        /**
         * Update all options
         *
         * @param options - Object contain options to update
         * @private
         */
        _setOptions: function (options) {
            this._superApply(arguments);
        },

        /**
         * Update for single options
         *
         * @param key - The name of the option
         * @param value - The new value of the option
         * @private
         */
        _setOption: function (key, value) {
            this._super(key, value);

            if (key === 'status') this.update_status(value);
        },

        /**
         * Update the status in the widget
         *
         * @param new_status
         */
        update_status: function(new_status) {
            this.element.find('.nbtools-output-status').text(new_status);
        },

        /**
         * Insert a cell with code referencing the output file
         *
         * @param path
         * @param file_name
         */
        code_cell: function(path, file_name) {
            const open_string = Utils.is_url(path) ? path : file_name;

            const var_name = Utils.make_python_safe(file_name.toLowerCase() + "_file");
            const code = "# More information can be obtained by calling help(" + var_name + ").\n" +
                       var_name + " = nbtools.open(\"" + open_string + "\")\n" +
                       var_name;
            const cell = Jupyter.notebook.insert_cell_below();
            cell.code_mirror.setValue(code);

            // Select and run the cell
            cell.execute();
            setTimeout(function() {
                $(cell.element).click();
            }, 100);
        },

        // TODO: FIXME MOVE DATAFRAME OPTION TO GPNB PACKAGE
        dataframe_cell: function(path, file_name, kind) {
            const to_open = Utils.is_url(path) ? path : file_name;
            const var_name = Utils.make_python_safe(file_name.toLowerCase() + "_dataframe");
            const kind_import = kind === "gct" ? "gct" : "odf";
            const code = "# The code below will only run if pandas is installed: http://pandas.pydata.org\n" +
                       "import nbtools\n" +
                       "from gp.data import " + kind_import.toUpperCase() + "\n" +
                       var_name + " = " + kind_import.toUpperCase() + "(nbtools.open(\"" + to_open + "\"))\n" +
                       var_name;
            const cell = Jupyter.notebook.insert_cell_below();
            cell.code_mirror.setValue(code);

            // Select and run the cell
            cell.execute();
            setTimeout(function() {
                $(cell.element).click();
            }, 100);
        },

        /**
         * Construct the file links for the output widget
         *
         * @returns {*|jQuery}
         * @private
         */
        _build_file_links: function() {
            const widget = this;
            const outputs = widget.options.files;
            const outputsList = $("<div></div>")
                .addClass("nbtools-widget-job-outputs-list");

            if (outputs) {
                for (let i = 0; i < outputs.length; i++) {
                    const wrapper = $("<div></div>");
                    const output = outputs[i];

                    const name = Utils.extract_file_name(output);
                    const kind = widget._extract_file_kind(output);
                    const href = widget._build_url(output);

                    const link = $("<a></a>")
                        .text(name + " ")
                        .addClass("nbtools-widget-job-output-file")
                        .attr("data-kind", kind)
                        .attr("href", href)
                        .attr("onclick", "return false;")
                        .attr("data-toggle", "popover")
                        .append(
                            $("<i></i>")
                                .addClass("fa fa-info-circle")
                                .css("color", "gray")
                        )
                        .click(function() {
                            $(".popover").popover("hide");
                        });

                    // Build and attach the file menu
                    // TODO: FIXME MOVE FILE MENUS FROM THE GPNB PACKAGE
                    if (typeof GPNotebook !== 'undefined') GPNotebook.menus.build_menu(widget, link, name, href, kind, true);

                    link.appendTo(wrapper);
                    wrapper.appendTo(outputsList);
                }
            }
            else {
                outputsList.text("No output files.");
            }

            return outputsList;
        },

        /**
         * Handle any visualization passed to the output widget
         *
         * @returns {*|jQuery|HTMLElement}
         * @private
         */
        _handle_visualization: function() {
            // In the future, implement in a smarter way than simply appending the value as HTML
            return $(this.options.visualization);
        },

        _build_url: function(path) {
            if (Utils.is_url(path)) return path;
            else return this._get_current_dir_url() + path;
        },

        _get_current_dir_url: function() {
            return Jupyter.notebook.base_url + 'notebooks/' + Jupyter.notebook.notebook_path.substring(0, Jupyter.notebook.notebook_path.length - (Jupyter.notebook.notebook_name.length));
        },

        _extract_file_kind: function(path) {
            return path.split('.').pop();
        },

        toggle_code: function() {
            // Get the code block
            const code = this.element.closest(".cell").find(".input");
            const is_hidden = code.is(":hidden");
            const cell = this.options.cell;

            if (is_hidden) {
                // Show the code block
                code.slideDown();
                MetadataManager.set_metadata(cell, "show_code", true);
            }
            else {
                // Hide the code block
                code.slideUp();
                MetadataManager.set_metadata(cell, "show_code", false);
            }
        },

        /**
         * Expand or collapse the output widget
         *
         *     expand - optional parameter used to force an expand or collapse,
         *         leave undefined to toggle back and forth
         */
        expandCollapse: function(expand) {
            const toSlide = this.element.find(".panel-body");
            const indicator = this.element.find(".widget-slide-indicator").find("span");
            const isHidden = toSlide.is(":hidden");

            if (expand === false || !isHidden) {
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

        _handle_metadata: function() {
            const widget = this;
            const cell = this.options.cell;

            // If the metadata has not been set, set it
            if (!MetadataManager.is_tool_cell(cell)) {
                MetadataManager.make_tool_cell(cell, "uioutput", {
                    show_code: false
                });
            }

            // Read the metadata and alter the widget accordingly

            // Add the current name and description of the widget
            cell.metadata.nbtools.name = widget.options.name;
            cell.metadata.nbtools.description = widget.options.description;

            // Hide or show code
            if (!cell.metadata.nbtools.show_code) {
                cell.element.find(".input").hide();
            }
        }
    });

    const UIOutputView = widgets.DOMWidgetView.extend({
        render: function () {
            let cell = this.options.cell;

            // Ugly hack for getting the Cell object in ipywidgets 7
            if (!cell) cell = this.options.output.element.closest(".cell").data("cell");

            // Render the view.
            if (!this.el) this.setElement($('<div></div>'));

            const name = this.model.get('name');
            const description = this.model.get('description');
            const status = this.model.get('status');
            const files = this.model.get('files');
            const text = this.model.get('text');
            const visualization = this.model.get('visualization');

            // Initialize the widget
            $(this.$el).outputWidget({
                name: name,
                description: description,
                status: status,
                files: files,
                text: text,
                visualization: visualization,
                cell: cell
            });

            // Hide the code by default
            const element = this.$el;
            const hideCode = function() {
                const cell = element.closest(".cell");
                if (cell.length > 0) {
                    // Protect against the "double render" bug in Jupyter 3.2.1
                    element.parent().find(".nbtools-uibuilder:not(:first-child)").remove();
                }
                else {
                    setTimeout(hideCode, 10);
                }
            };
            setTimeout(hideCode, 1);
        },

        update: function() {
            // Update the widget with what's changed
            Object.keys(this.model.changed).forEach(i => $(this.$el).outputWidget('option', i, this.model.changed[i]));
        }
    });

    return {
        UIOutputView: UIOutputView
    }
});