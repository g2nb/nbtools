/**
 * Define the Type Ahead widget
 *
 * @author Thorin Tabor
 * @requires - jQuery
 *
 * Copyright 2015-2018 Regents of the University of California & The Broad Institute
 */

define("nbtools/typeahead", ["base/js/namespace",
                            "nbextensions/jupyter-js-widgets/extension",
                            "jqueryui",
                            "nbtools/utils"], function (Jupyter, widgets, $, Utils) {

    const widget = $.widget("nbtools.type_ahead", {
        options: {
            placeholder: "Add File or URL...",
            width: "400px",
            data: [],
            click: function(widget) {},
            blur: function(widget) {}
        },

        _create: function() {
            const widget = this;

            this.element
                .addClass("nbtools-typeahead")
                .css("width", this.options.width)
                .data("widget", this)
                .append(
                    $("<div></div>")
                        .addClass("form-group has-feedback nbtools-typeahead-group")
                        .append(
                            $("<input/>")
                                .addClass("form-control nbtools-typeahead-input")
                                .attr("placeholder", this.options.placeholder)
                                .attr("autocomplete", "off")
                                .click(this._click)
                                .blur(this._blur)
                        )
                        .append(
                            $("<span></span>")
                                .addClass("fa fa-caret-down form-control-feedback nbtools-typeahead-arrow")
                        )
                        .append(
                            $("<ul></ul>")
                                .addClass("dropdown-menu nbtools-typeahead-list")
                                .attr("tabindex", 0) // Marks as control element, so that the blur event works correctly
                        )
                );
        },
        _destroy: function() {},
        _setOptions: function(options) {},
        _setOption: function(key, value) {},

        _click: function(event) {
            const typeahead_input = $(event.target);
            const widget = typeahead_input.closest(".nbtools-typeahead").data("widget");
            const menu = widget.element.find(".nbtools-typeahead-list");

            // Make the click callback if one is defined
            if (widget.options.click) {
                widget.options.click(widget);
            }

            // Show the menu
            menu.show();
        },

        _blur: function(event) {
            const typeahead_input = $(event.target);
            const typeahead = typeahead_input.closest(".nbtools-typeahead");
            const menu = typeahead.find(".nbtools-typeahead-list");

            // Don't go any of this if they clicked on the menu's scrollbar
            if (menu.length && event.relatedTarget === menu[0]) {
                typeahead_input.focus();
                return;
            }

            // Hide the menu
            const widget = typeahead_input.closest(".nbtools-typeahead").data("widget");
            menu.hide();

            // Make the blur callback if one is defined
            if (widget.options.blur) {
                widget.options.blur(widget);
            }
        },

        _update_menu: function(menu, kind, choices={}, markdown={}) {
            // Clear the menu
            menu.empty();

            // Get the latest output file data
            let output_files = Utils.output_files_by_kind(kind);

            // Handle the special case of no matching output files
            if (output_files.length === 0 && Object.keys(choices).length === 0 && Object.keys(markdown).length === 0) {
                menu.append(this._create_menu_header("No Matching Files"));
                return;
            }

            // Structure the data by job
            output_files = this._files_by_job(output_files);

            // Add files to the menu
            for (let job in output_files) {
                menu.append(this._create_menu_header(job));
                const job_files = output_files[job];
                for (let i in job_files) {
                    menu.append(this._create_menu_file(job_files[i]));
                }
            }

            // Add the dynamic choices to the menu, if available
            if (Object.keys(choices).length > 0) {
                menu.append(this._create_menu_header("FTP Server Files", "ftp"));
                for (let key in choices) {
                    const choice = {
                        name: key,
                        url: choices[key]
                    };
                    menu.append(this._create_menu_file(choice, "ftp"));
                }
            }

            // Add markdown file links, if available
            if (Object.keys(markdown).length > 0) {
                menu.append(this._create_menu_header("Notebook Instructions", "markdown"));
                for (let key in markdown) {
                    const choice = {
                        name: key,
                        url: markdown[key]
                    };
                    menu.append(this._create_menu_file(choice, "markdown"));
                }
            }
        },

        /**
         * Create a file listing to add to the typeahead menu
         *
         * @param file
         * @param type
         * @returns {*|jQuery}
         * @private
         */
        _create_menu_file: function(file, type="job") {
            const widget = this;
            let type_class = "";
            if (type === "job") type_class = "nbtools-typeahead-job-file";
            if (type === "ftp") type_class = "nbtools-typeahead-ftp-file";
            if (type === "markdown") type_class = "nbtools-typeahead-markdown-file";

            return $("<li></li>")
                .append(
                    $("<a></a>")
                        .addClass("dropdown-file")
                        .addClass(type_class)
                        .attr("href", "#")
                        .attr("tabindex", 0) // Marks as control element, so that the blur event works correctly
                        .attr("data-value", file.url)
                        .text(file.name)
                        .mousedown(function() {
                            const typeahead_input = widget.element.find(".nbtools-typeahead-input");
                            const val = $(this).attr("data-value");
                            $(typeahead_input).val(val);

                            // Hide the menu, if necessary
                            typeahead_input.focus();
                        })
                );
        },

        /**
         * Create a header in the typeahead menu.
         *
         * @param text
         * @param type - job or ftp
         * @returns {*|jQuery}
         * @private
         */
        _create_menu_header: function(text, type="job") {
            let type_class = "";
            if (type === "job") type_class = "nbtools-typeahead-job-header";
            if (type === "ftp") type_class = "nbtools-typeahead-ftp-header";
            if (type === "markdown") type_class = "nbtools-typeahead-markdown-header";

           return $("<li></li>")
               .addClass("dropdown-header")
               .addClass(type_class)
               .text(text);
        },

        _files_by_job: function(output_files) {
            const by_job = {};

            for (let i in output_files) {
                const file = output_files[i];

                if (!(file.job in by_job)) {
                    by_job[file.job] = [];

                }

                by_job[file.job].push(file);
            }

            return by_job;
        }
    });

    return {
        widget: widget
    }
});