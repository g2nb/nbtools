/**
 * Widget for text input into a notebook
 * Used for text, number and password inputs by the UI Builder.
 *
 * @author Thorin Tabor
 * @requires - jQuery
 *
 * Supported Features:
 *      Text input
 *      Password input
 *      Number input
 *
 * Non-Supported Features:
 *      Directory input
 *
 * Copyright 2015-2018 Regents of the University of California & The Broad Institute
 */

define("nbtools/text", ["base/js/namespace",
                        "nbextensions/jupyter-js-widgets/extension",
                        "jquery",
                        "nbextensions/nbtools/nbtools"], function (Jupyter, widgets, $) {

    // Define the widget
    $.widget("nbtools.textInput", {
        options: {
            type: "text", // Accepts: text, number, password
            default: "",

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
            //noinspection JSValidateTypes
            this._value = this.options.default;

            // Clean the type option
            this._cleanType();

            // Add data pointer
            this.element.data("widget", this);

            // Add classes and child elements
            this.element.addClass("nbtools-text");
            this.element.append(
                $("<input />")
                    .addClass("form-control nbtools-text-input")
                    .attr("type", this.options.type)
                    .val(this._value)
                    .change(function() {
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
            this.element.removeClass("nbtools-text");
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
            this._cleanType();
            this.element.find(".nbtools-text-input").prop("type", this.options.type);
        },

        /**
         * Removes bad type listings, defaulting to text
         *
         * @private
         */
        _cleanType: function() {
            if (typeof this.options.type !== 'string') {
                console.log("Type option for text input is not a string, defaulting to text");
                this.options.type = "text";
            }
            if (this.options.type.toLowerCase() !== "text" &&
                this.options.type.toLowerCase() !== "password" &&
                this.options.type.toLowerCase() !== "number") {
                console.log("Type option for text input is not 'text', 'password' or 'number', defaulting to text");
                this.options.type = "text";
            }
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
                this.element.find(".nbtools-text-input").val(val);
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
        widget: $.textInput
    }
});