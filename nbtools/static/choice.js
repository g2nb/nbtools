/**
 * Widget for choice input in a notebook
 * Used for choice inputs by the UI Builder.
 *
 * @author Thorin Tabor
 * @requires - jQuery
 *
 * Supported Features:
 *      Simple Choice Input
 *
 * Non-Supported Features:
 *      File choice input
 *      Dynamic choice parameters
 *
 * Copyright 2015-2019 Regents of the University of California & The Broad Institute
 */

define("nbtools/choice", ["base/js/namespace",
                        "nbextensions/jupyter-js-widgets/extension",
                        "jquery"], function (Jupyter, widgets, $) {

    // Define the widget
    $.widget("nbtools.choiceInput", {
        options: {
            choices: [], // Assumes an object of key, value pairs
            default: null,

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

            // Add data pointer
            this.element.data("widget", this);

            // Add classes and child elements
            this.element.addClass("nbtools-choice");
            this.element.append(
                $("<select></select>")
                    .addClass("form-control nbtools-choice-select")
                    .change(function() {
                        // Special case for a custom value
                        const selected = $(this).find("option:selected");
                        if (selected.text() === "Custom Value (developer)") {
                            widget.customValueDialog(selected);
                            return;
                        }

                        // The general case
                        widget._value = $(this).val();
                        widget._updateCode();
                    })
            );

            // Hide elements if not in use by options
            this._setDisplayOptions();
        },

        /**
         * Destructor
         *
         * @private
         */
        _destroy: function() {
            this.element.removeClass("nbtools-choice");
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
            this._setPointers();
            this._setDisplayOptions();
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
            this._setPointers();
            this._setDisplayOptions();
        },

        /**
         * Update the pointers to the Run Task widget and parameter
         *
         * @private
         */
        _setPointers: function() {
            if (this.options.runTask) { this._runTask = this.options.runTask; }
            if (this.options.param) { this._param = this.options.param; }
        },

        /**
         * Update the display of the UI to match current options
         *
         * @private
         */
        _setDisplayOptions: function() {
            this._applyChoices();
            this._applyDefault();
        },

        /**
         * Applies the choices options, setting them to the provided values
         *
         * @private
         */
        _applyChoices: function() {
            if (typeof this.options.choices !== 'object') {
                console.log("Error reading choices in Choice Input, aborting");
                return;
            }

            const select = this.element.find(".nbtools-choice-select");
            select.empty();

            for (let key in this.options.choices) {
                if (this.options.choices.hasOwnProperty(key)) {
                    const value = this.options.choices[key];

                    select.append(
                        $("<option></option>")
                            .text(key)
                            .val(value)
                    );
                }
            }

            // Add the custom value option
            select.append(
                $("<option></option>")
                    .text("Custom Value (developer)")
                    .val("")
            );
        },

        /**
         * Applies the option for default, resetting the selected option
         *
         * @private
         */
        _applyDefault: function() {
            // If the default is not in the list of options, select Custom Value
            if (Object.values(this.options.choices).indexOf(this.options.default.toString()) < 0) {
                this.element.find("option:last").val(this.options.default);
            }

            this.element.find(".nbtools-choice-select").val(this.options.default.toString());
            this._value = this.element.find(".nbtools-choice-select").val();
        },

        /**
         * Updates the Run Task Widget code to include the new value
         *
         * @private
         */
        _updateCode: function() {
            this._runTask.updateCode(this._param.name(), this._value);
        },

        /**
         * Prompts the user for a custom value, sets the value on the dropdown
         *
         * @param option - the option element in the dropdown
         */
        customValueDialog: function(option) {
            const dialog = require('base/js/dialog');

            // Get Current Custom Value
            const currentValue = $(option).val();

            dialog.modal({
                notebook: Jupyter.notebook,
                keyboard_manager: this.keyboard_manager,
                title : "Custom Parameter Value",
                body : $("<div></div>")
                    .append($("<div></div>")
                        .addClass("alert alert-warning")
                        .append("Setting a custom value for a choice parameter is considered an " +
                            "advanced developer feature. If you don't know what you're doing, this " +
                            "will likely result in an error after the job is launched.")
                    )
                    .append($("<div></div>")
                            .addClass("form-group")
                            .append($("<label>")
                                .attr("for", "nbtools-uibuilder-custom-value")
                                .css("font-weight", "bold")
                                .text("Enter Custom Value")
                            )
                            .append(
                                $("<input>")
                                    .attr("type", "text")
                                    .attr("name", "nbtools-uibuilder-custom-value")
                                    .attr("placeholder", "Enter Value")
                                    .addClass("form-control")
                                    .val(currentValue)
                                    .keydown(function(event) {
                                        event.stopPropagation();
                                    })
                            )
                    ),
                buttons : {
                    "Cancel" : {
                        "click": function() {
                        }
                    },
                    "Set Value" : {
                        "class" : "btn-warning",
                        "click" : function() {
                            const customValue = $(".modal-dialog").find("[name=nbtools-uibuilder-custom-value]").val();
                            $(option).val(customValue);
                            const widget = $(option).closest(".nbtools-choice").data("widget");
                            widget.value(customValue);
                            widget._updateCode();
                        }
                    }
                }
            });
        },

        /**
         * Gets or sets the value of the input
         *
         * @param val - the value for the setter
         * @param force_setter - optional parameter to force setting an empty value
         * @returns {_value|string}
         */
        value: function(val, force_setter=false) {
            // Do setter
            if (val || force_setter) {
                this._value = val;
                this.element.find(".nbtools-choice-select").val(val);
            }
            // Do getter
            else {
                return this._value;
            }
        }
    });

    // Expose the widget using AMD
    return {
        $: $,
        widget: $.choiceInput
    }
});