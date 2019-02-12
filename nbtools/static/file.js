/**
 * Widget for file input in a notebook.
 * Used for file inputs by the UI Builder.
 *
 * @author Thorin Tabor
 * @requires - jQuery
 *
 * Supported Features:
 *      External URLs
 *      Uploading New Files
 *      Pasted Internal File Paths
 *      Pasted Job Result URLs
 *
 * Non-Supported Features:
 *      GenomeSpace Files
 *      Browsing Uploaded Files
 *
 * Copyright 2015-2018 Regents of the University of California & The Broad Institute
 */

define("nbtools/file", ["base/js/namespace",
                        "nbextensions/jupyter-js-widgets/extension",
                        "jquery",
                        "nbtools/variables",
                        "nbtools/utils"], function (Jupyter, widgets, $, VariableManager, Utils) {

    // Define the widget
    $.widget("nbtools.fileInput", {
        options: {
            allowFilePaths: true,
            allowExternalUrls: true,
            allowJobUploads: true,

            // Pointers to associated runTask widget
            runTask: null,
            param: null
        },

        /**
         * Constructor
         *
         * @private
         */
        _create: function() {
            // Save pointers to associated Run Task widget or parameter
            this._setPointers();

            // Set variables
            const widget = this;
            this._values = null;
            this._displays = null;

            // Add data pointer
            this.element.data("widget", this);

            // Add classes and child elements
            this.element.addClass("nbtools-file");
            this.element.append(
                $("<div></div>")
                    .addClass("nbtools-file-upload")
                    .append(
                        $("<button></button>")
                            .addClass("btn btn-default nbtools-file-upload-file")
                            .text("Upload File...")
                            .click(function () {
                                $(this).parents(".nbtools-file").find(".nbtools-file-input-file").click();
                            })
                    )
                    .append(
                        $("<input />")
                            .addClass("nbtools-file-input-file")
                            .attr("type", "file")
                            .change(function () {
                                const files = widget.element.find(".nbtools-file-input-file")[0].files;
                                const list = [];
                                for (let i = 0; i < files.length; i++) {
                                    list.push(files[i]);
                                }

                                // Throw an error if this would overflow max values
                                if (!widget._valNumGood(list)) {
                                    widget._runTask.errorMessage(widget._param.name() + " cannot handle that many values. Max values: " + widget._param.maxValues());
                                    return;
                                }

                                widget.addValues(list);
                            })
                    )
                    .append(
                        $("<div></div>").type_ahead({
                            placeholder: "Add File or URL...",
                            data: [],
                            click: function(twidget) {
                                const menu = twidget.element.find(".nbtools-typeahead-list");
                                let kinds = widget.kinds();         // Get list of kinds this param accepts
                                if (!kinds) kinds = "*";            // If none are defined, accepts everything

                                // Get the list of dynamic dropdown choices, if available
                                let choices = null;
                                if (widget.options.param) choices = widget.options.param.choices();
                                if (!choices) choices = {};

                                // Get the list of embedded markdown file links
                                const markdown = Utils.markdown_files();

                                // Update the menu
                                twidget._update_menu(menu, kinds, choices, markdown);
                            },
                            blur: function(twidget) {
                                const typeahead_input = twidget.element.find(".nbtools-typeahead-input");
                                const typeahead_value = typeahead_input.val().trim();

                                // Clear the input
                                twidget.element.find(".nbtools-typeahead-input").val("");

                                // Disregard if the value is blank
                                if (typeahead_value === "") {
                                    return;
                                }

                                // Throw an error if this would overflow max values
                                if (!widget._valNumGood(typeahead_value)) {
                                    widget._runTask.errorMessage(widget._param.name() + " cannot handle that many values. Max values: " + widget._param.maxValues());
                                    return;
                                }

                                // Update the values
                                widget.addValues(typeahead_value);
                                widget._updateCode();
                            }
                        })
                    )
                    .append(
                        $("<span></span>")
                            .addClass("nbtools-file-drop")
                            .text("Drag Files Here")
                            .hide()
                    )
            );
            this.element.append(
                $("<div></div>")
                    .addClass("nbtools-file-listing")
                    .css("display", "none")
            );
            this.element.append(
                $("<div></div>")
                    .addClass("nbtools-file-warning alert alert-warning")
                    .hide()
            );

            // Initialize the drag & drop functionality
            if (this.options.allowJobUploads) {
                this._initDragDrop();
            }

            // Hide elements if not in use by options
            this._setDisplayOptions();
        },

        /**
         * Destructor
         *
         * @private
         */
        _destroy: function() {
            this.element.removeClass("nbtools-file");
            this.element.empty();
        },

        _kindsListString: function() {
            const kinds = this._param.kinds();
            if (!kinds || kinds === '*') return "anything";
            else return kinds.join(", ");
        },

        /**
         * Initializes the drag & drop functionality in the widget
         *
         * @private
         */
        _initDragDrop: function() {
            const widget = this;
            const dropTarget = this.element[0];

            dropTarget.addEventListener("dragenter", function(event) {
                widget.element.css("background-color", "#dfeffc");
                widget.element.find(".nbtools-file-drop").show();
                event.stopPropagation();
                event.preventDefault();
            }, false);
            dropTarget.addEventListener("dragexit", function(event) {
                widget.element.css("background-color", "");
                widget.element.find(".nbtools-file-drop").hide();
                event.stopPropagation();
                event.preventDefault();
            }, false);
            dropTarget.addEventListener("dragover", function(event) {
                event.stopPropagation();
                event.preventDefault();
            }, false);
            dropTarget.addEventListener("drop", function(event) {
                // If there is are files assume this is a file drop
                if (event['dataTransfer'].files.length > 0) {
                    const files = event['dataTransfer'].files;
                    const list = [];
                    for (let i = 0; i < files.length; i++) {
                        list.push(files[i]);
                    }

                    // Throw an error if this would overflow max values
                    if (!widget._valNumGood(list)) {
                        widget._runTask.errorMessage(widget._param.name() + " cannot handle that many values. Max values: " + widget._param.maxValues());

                        widget.element.css("background-color", "");
                        event.stopPropagation();
                        event.preventDefault();
                        return;
                    }

                    widget.addValues(list);
                }
                // If not, assume this is a text drop
                else {
                    const html = event['dataTransfer'].getData('text/html');
                    let htmlList = $(html);

                    // Path for Firefox
                    if (htmlList.length === 1) {
                        const tag = $(htmlList).prop("tagName");
                        if (tag.toLowerCase() !== "a") {
                            htmlList = $(htmlList).find("a");
                        }
                        const text = $(htmlList).attr("href");
                        if (text !== undefined && text !== null) {

                            // Throw an error if this would overflow max values
                            if (!widget._valNumGood(text)) {
                                widget._runTask.errorMessage(widget._param.name() + " cannot handle that many values. Max values: " + widget._param.maxValues());

                                widget.element.css("background-color", "");
                                event.stopPropagation();
                                event.preventDefault();
                                return;
                            }

                            widget.addValues(text);
                            widget._updateCode();
                        }
                    }

                    // Path for Chrome
                    else if (htmlList.length > 1) {
                        $.each(htmlList, function(i, e) {
                            const text = $(e).attr("href");
                            if (text !== undefined && text !== null) {

                                // Throw an error if this would overflow max values
                                if (!widget._valNumGood(text)) {
                                    widget._runTask.errorMessage(widget._param.name() + " cannot handle that many values. Max values: " + widget._param.maxValues());

                                    widget.element.css("background-color", "");
                                    event.stopPropagation();
                                    event.preventDefault();
                                    return;
                                }

                                widget.addValues(text);
                                widget._updateCode();
                            }
                        });
                    }

                    // Path for Safari
                    else if (html === "") {
                        text = event['dataTransfer'].getData('text/uri-list');
                        if (text !== undefined && text !== null) {

                                // Throw an error if this would overflow max values
                                if (!widget._valNumGood(text)) {
                                    widget._runTask.errorMessage(widget._param.name() + " cannot handle that many values. Max values: " + widget._param.maxValues());

                                    widget.element.css("background-color", "");
                                    event.stopPropagation();
                                    event.preventDefault();
                                    return;
                                }

                                widget.addValues(text);
                                widget._updateCode();
                            }
                    }
                }

                widget.element.css("background-color", "");

                event.stopPropagation();
                event.preventDefault();
            }, false);
        },

        /**
         * Ensures that new values won't violate max value constraints.
         * Return true if it's all good, false otherwise.
         *
         * @param newVals
         * @returns {boolean}
         * @private
         */
        _valNumGood: function(newVals) {
            // Ensure newVals is a list
            if (newVals.constructor !== Array) {
                newVals = [newVals];
            }

            const maxVals = this._param.maxValues();
            const currentVals = this._values ? this._values.length : 0;
            const addVals = newVals.length;

            // Handle case of unlimited max
            if (maxVals === -1) return true;

            return currentVals + addVals <= maxVals;
        },

        /**
         * Creates or destroys the box of selected files
         *
         * @param files - A string or File if to show, undefined or null if to hide
         * @private
         */
        _fileBox: function(files) {
            const displays = this._valuesToDisplay(files);

            if (files) {
                const widget = this;
                $.each(files, function (i, e) {
                    const display = displays[i];
                    const model = files[i];

                    widget.element.find(".nbtools-file-listing").append(widget._createFileBox(display, model));
                });
                this.element.find(".nbtools-file-listing").show();

                // Display file warning, if necessary
                this._setFileWarning(files);

                // Hide upload stuff if at max
                const maxVals = this._param.maxValues();
                const currentVals = this._values ? this._values.length : 0;
                if (maxVals === currentVals) {
                    this.element.find(".nbtools-file-upload").hide();
                }
            }
            else {
                this.element.find(".nbtools-file-upload").show();
                this.element.find(".nbtools-file-listing").hide();
                this.element.find(".nbtools-file-listing").empty();
                this._hideWarning();
            }
        },

        /**
         * Displays or hides the file type warning message, as appropriate
         *
         * @param files
         * @private
         */
        _setFileWarning: function(files) {
            // Transform File objects to strings
            const displays = this._valuesToDisplay(files);

            if (this._needRepoWarning(displays)) {
                this._displayFileWarning("Files uploaded directly to the Notebook Repository workspace are not accessible to GenePattern jobs. Please remove the file and upload it using the Upload button on this widget.");
            }
            else if (this._needTypeWarning(displays)) {
                this._displayFileWarning("File may not be an acceptable format. This input expects " + this._kindsListString() + ".");
            }
            else { this._hideWarning(); }
        },

        /**
         * Determines if the file URL matches the Notebook Repository upload
         *
         * @param files
         * @private
         */
        _needRepoWarning: function(files) {
            let foundWarning = false;

            for (let i in files) {
                const file = files[i];

                if (file.startsWith("https://notebook.genepattern.org/")) {
                    foundWarning = true;
                }
            }

            return foundWarning;
        },

        /**
         * Determines if the file type doesn't match the expected input type
         *
         * @param files
         * @private
         */
        _needTypeWarning: function(files) {
            let foundWarning = false;
            const accepts = this._param.kinds();

            // Special case for empty kind lists
            if (!accepts) return false;

            for (let i in files) {
                const file = files[i];
                const file_name = Utils.extract_file_name(file);
                let match = false;

                accepts.forEach(function(kind) {
                    if (Utils.wildcard_match(file_name, kind)) match = true;

                    // Special case for ODF files
                    if (file.toLowerCase().endsWith("odf") && kind.length > 5) match = true;
                });

                if (!match) foundWarning = true;
            }

            return foundWarning;
        },

        /**
         * Displays a warning message that the file type doesn't match the expected input type
         *
         * @private
         */
        _displayFileWarning: function(message) {
            this.element.find(".nbtools-file-warning")
                .empty()
                .append(message)
                .show();
        },

        /**
         * Hides the warning message about the input file
         *
         * @private
         */
        _hideWarning: function() {
            this.element.find(".nbtools-file-warning").hide();
        },

        /**
         * Creates a file box element for the selected file value
         *
         * @param file_display
         * @param file_model
         * @returns {jQuery} - the jQuery wrapped file box element
         * @private
         */
        _createFileBox: function(file_display, file_model) {
            const widget = this;
            return $("<div></div>")
                .addClass("nbtools-file-value" + (file_model instanceof File ? " nbtools-file-value-upload" : ""))
                .attr("name", file_display)
                .append(
                    $("<div></div>")
                        .addClass("btn btn-default btn-sm nbtools-file-value-erase")
                        .append(
                            $("<span></span>")
                                .addClass("fa fa-times")
                                .click(function() {
                                    $(this).parent().click();
                                })
                        )
                        .click(function() {
                            widget._removeValue(file_display);
                            widget.element.find(".nbtools-file-value[name='" + file_display + "']").remove();
                            widget.element.find(".nbtools-file-upload").show();
                            widget._setFileWarning(widget._values);
                            widget._updateCode();
                        })
                )
                .append(
                    $("<span></span>")
                        .addClass("nbtools-file-value-text")
                        .text(file_display)
                        .dblclick(function(event) {
                            $(event.target).parent().trigger("dblclick");
                        })
                )
                .dblclick(function(event) {
                    // Ignore this event for file uploads
                    if (file_model instanceof File) return;

                    // Ignore this event for multiple values
                    if (widget._values && widget._values.length > 1) return;

                    // Get the parent element
                    const file_element = $(event.target).closest(".nbtools-file");

                    // Remove the value
                    $(event.target).find(".nbtools-file-value-erase").click();

                    // Add the value to the text box
                    setTimeout(function() {
                        const input = file_element.find(".nbtools-typeahead-input");
                        input.val(file_display);
                        input.focus();
                    }, 10);
                });
        },

        /**
         * Takes a set of values and returns the display strings for the values
         *
         * @param values - the list of values
         * @returns {Array} - the display value list
         * @private
         */
         _valuesToDisplay: function(values) {
             // If values is null, return no displays
            if (values === null || values === undefined) return [];

            const displays = [];
            const that = this;
            $.each(values, function(index, val) {
                const aDisplay = that._singleDisplay(val);
                displays.push(aDisplay);
            });
            return displays;
        },

        /**
         * Turns a single value for the file into a display value
         *
         * @param value - the value, either a string or File object
         * @returns {string}
         * @private
         */
        _singleDisplay: function(value) {
            if (typeof value === 'string') {
                return value;
            }
            else {
                return value.name;
            }
        },

        /**
         * Removes the specified display value from the values list
         *
         * @param value
         * @private
         */
        _removeValue: function(value) {
            const widget = this;

            // Handle special case of Python variables
            if (VariableManager.getVariableList(value).length > 0) {
                // Assume the first value matches the variable and remove it
                widget._values.splice(0, 1);
                return;
            }

            $.each(this._values, function(i, e) {
                const display = widget._singleDisplay(e);
                if (display === value) {
                    widget._values.splice(i, 1);
                    return false;
                }
            });

            // Cannot find exact value to remove, could have uploaded the file
            // This changes the value from the file name to the uploaded URL
            // Try removing the matching URL
            $.each(this._values, function(i, e) {
                // If no GP server is available, skip this value
                if (!widget.options.runTask.options.session) return true;

                const parser = document.createElement('a');
                parser.href = widget.options.runTask.options.session.server();

                const display = widget._singleDisplay(e);
                const foundHost = display.indexOf(parser.host) === 7 || display.indexOf(parser.host) === 8;

                if (foundHost && display.endsWith(value)) {
                    widget._values.splice(i, 1);
                    return false;
                }
            });
        },

        /**
         * Replace the indicated display value with the new value
         *
         * @param value
         * @param replacement
         * @private
         */
        _replaceValue: function(value, replacement) {
            const widget = this;
            $.each(this._values, function(i, e) {
                const display = widget._singleDisplay(e);
                if (display === value) {
                    widget._values[i] = replacement;
                    return false;
                }
            });
        },

        /**
         * Update the pointers to the Run Task widget and parameter
         *
         * @private
         */
        _setPointers: function() {
            if (this.options.runTask) { this._runTask = this.options.runTask; }
            if (this.options.param) { this._param = this.options.param; }

            // Add data pointer
            this.element.data("widget", this);
        },

        /**
         * Update the display of the UI to match current options
         *
         * @private
         */
        _setDisplayOptions: function() {
            if (!this.options.allowJobUploads) {
                this.element.find(".nbtools-file-upload-file").hide();
                this.element.find(".nbtools-typeahead").css("padding-left", "0");
                this.element.css("border", "none");
                this.element.css("padding", 0);
            }
            else {
                this.element.find(".nbtools-file-upload-file").show();
                this.element.find(".nbtools-typeahead").css("padding-left", "110px");
                this.element.removeAttr("style");
            }
        },

        /**
         * Update all options
         *
         * @param options - Object contain options to update
         * @private
         */
        _setOptions: function(options) {
            this._superApply(arguments);
            this._setPointers();
            this._setDisplayOptions();
        },

        /**
         * Update individual option
         *
         * @param key - The name of the option
         * @param value - The new value of the option
         * @private
         */
        _setOption: function(key, value) {
            this._super(key, value);
            this._setPointers();
            this._setDisplayOptions();
        },

        /**
         * Upload the specified file file to the server. If this file widget
         * holds a list with multiple files awaiting upload, this function
         * will need to be called repeatedly for all files awaiting upload.
         *
         * @param pObj - Object containing the following params:
         *                  file: the file to upload
         *                  success: Callback for success, expects url to file
         *                  error: Callback on error, expects exception
         * @returns {object} - Returns a reference to the file which was just
         *      uploaded, returns null if no file upload was initiated
         */
        upload: function(pObj) {
            const file = pObj.file;
            let currentlyUploading = null;
            const widget = this;

            // Value is a File object
            if (typeof file === 'object' && file) {
                widget.options.runTask.options.session.upload({
                    file: file,
                    success: function(response, url) {
                        // Mark the file as uploaded
                        const display = widget._singleDisplay(file);
                        widget._replaceValue(display, url);
                        widget._updateCode();

                        if (pObj.success) {
                            pObj.success(response, url);
                        }
                    },
                    error: function(exception) {
                        console.log("Error uploading file from file input widget: " + exception.statusText);
                        if (pObj.error) {
                            pObj.error(exception);
                        }
                    }
                });
                currentlyUploading = file;
            }
            // If the value is not set, give an error
            else if (!file) {
                console.log("Cannot upload from file input: value is null.");
                if (pObj.error) {
                    pObj.error({statusText: "Cannot upload from file input: value is null."});
                }
            }
            // If the value is a string, do nothing
            else {
                // Else assume we have a non-upload value selected
            }

            return currentlyUploading;
        },

        /**
         * Updates the Run Task Widget code to include the new value
         *
         * @private
         */
        _updateCode: function() {
            // Update the code
            this._runTask.updateCode(this._param.name(), this._values);
        },

        /**
         * Getter for associated RunTask object
         *
         * @returns {object|null}
         */
        runTask: function() {
            return this._runTask;
        },

        /**
         * Getter for associated parameter
         * @returns {string|null|object}
         */
        param: function() {
            return this._param;
        },

        /**
         * Returns the list of kinds accepted by the file input
         *
         * @returns {Array|null}
         */
        kinds: function() {
            return this.options.param.kinds();
        },

        /**
         * This is just a clone of values() for compatibility with other widgets
         *
         * @param val
         * @param force_setter - optional parameter to force setting an empty value
         * @returns {object|string|null}
         */
        value: function(val, force_setter=false) {
            return this.values(val, force_setter);
        },

        /**
         * Gets or sets the values of this widget
         *
         * @param [val=optional] - String value for file (undefined is getter)
         * @param force_setter - optional parameter to force setting an empty value
         * @returns {object|string|null} - The value of this widget
         */
        values: function(val, force_setter=false) {
            // Do setter
            if (val || force_setter) {
                // Handle empty string
                if (val === '') val = [];

                // Handle wrapping lists
                if (val.constructor !== Array) val = [val];

                this._values = val;
                this._displays = this._valuesToDisplay(val);
                this._fileBox(null);
                this._fileBox(val);
            }
            // Do getter
            else {
                return this._values;
            }
        },

        /**
         * Adds the indicated values to the existing value array
         *
         * @param val
         */
        addValues: function(val) {
            // Handle wrapping lists
            if (val.constructor !== Array) {
                val = [val];
            }

            // Handle null or undefined value array
            if (this._values === undefined || this._values === null) {
                this._values = [];
            }

            // Handle null or undefined display array
            if (this._displays === undefined || this._displays === null) {
                this._displays = [];
            }

            // Display list
            const displayList = this._valuesToDisplay(val);

            this._values = this._values.concat(val);
            this._displays = this._displays.concat(displayList);
            this._fileBox(val);
        }
    });

    // Expose the widget using AMD
    return {
        $: $,
        widget: $.fileInput
    }
});