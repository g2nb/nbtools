// Copyright (c) Thorin Tabor
// Distributed under the terms of the Modified BSD License.
import './style.css'
import { DOMWidgetModel, DOMWidgetView, ISerializers } from '@jupyter-widgets/base';
import { MODULE_NAME, MODULE_VERSION } from './version';


export class ExampleModel extends DOMWidgetModel {
    defaults() {
        return {
            ...super.defaults(),
            _model_name: ExampleModel.model_name,
            _model_module: ExampleModel.model_module,
            _model_module_version: ExampleModel.model_module_version,
            _view_name: ExampleModel.view_name,
            _view_module: ExampleModel.view_module,
            _view_module_version: ExampleModel.view_module_version,
            value: 'UIOutput'
        };
    }

    static serializers: ISerializers = {
        ...DOMWidgetModel.serializers,
        // Add any extra serializers here
    };

    static model_name = 'ExampleModel';
    static model_module = MODULE_NAME;
    static model_module_version = MODULE_VERSION;
    static view_name = 'ExampleView';   // Set to null if no view
    static view_module = MODULE_NAME;   // Set to null if no view
    static view_module_version = MODULE_VERSION;
}


export class ExampleView extends DOMWidgetView {
    render() {
        const display = document.createElement('h3');
        this.setElement(display);
        this.value_changed();
        this.model.on('change:value', this.value_changed, this);
    }

    value_changed() {
        this.el.textContent = this.model.get('value');
    }
}

export class UIOutputModel extends DOMWidgetModel {
    defaults() {
        return {
            ...super.defaults(),
            _model_name: UIOutputModel.model_name,
            _model_module: UIOutputModel.model_module,
            _model_module_version: UIOutputModel.model_module_version,
            _view_name: UIOutputModel.view_name,
            _view_module: UIOutputModel.view_module,
            _view_module_version: UIOutputModel.view_module_version,
            name: 'Python Results',
            description: '',
            status: '',
            files: [],
            text: '',
            visualization: ''
        };
    }

    static serializers: ISerializers = {
        ...DOMWidgetModel.serializers,
        // Add any extra serializers here
    };

    static model_name = 'UIOutputModel';
    static model_module = MODULE_NAME;
    static model_module_version = MODULE_VERSION;
    static view_name = 'UIOutputView';   // Set to null if no view
    static view_module = MODULE_NAME;   // Set to null if no view
    static view_module_version = MODULE_VERSION;
}


/**
 * Widget for representing Python output as an interactive interface
 *
 * @author Thorin Tabor
 *
 * Copyright 2019 Regents of the University of California and the Broad Institute
 */
export class UIOutputView extends DOMWidgetView {
    element:HTMLElement = document.createElement('div');
    traitlets = ['name', 'description', 'status', 'files', 'text', 'visualization'];

    render() {
        // Build the widget
        this.build();

        // Set the traitlet values
        this.traitlets.forEach(traitlet => this.traitlet_changed(traitlet));

        // Hook in the traitlet change events
        this.traitlets.forEach(traitlet => this.model.on(`change:${traitlet}`, this.traitlet_changed, this));

        // Hide the code
        this.hide_code();
    }

    build() {
        // Create and parse the template
        const template = `
            <div class="nbtools-widget nbtools-output">
                <div class="nbtools-widget-header">
                    <img class="nbtools-widget-logo" src="" />
                    <h3 class="nbtools-widget-title nbtools-traitlet" name="name"></h3>
                    <div class="nbtools-widget-controls">
                        <button class="nbtools-widget-collapse">
                            <span class="fa fa-minus"></span>
                        </button>
                        <button class="nbtools-widget-gear">
                            <span class="fa fa-cog"></span>
                            <span class="fa fa-caret-down"></span>
                        </button>
                        <ul class="nbtools-widget-menu">
                            <li>Toggle Code View</li>
                        </ul>
                    </div>
                </div>
                <div class="nbtools-widget-body">
                    <div class="nbtools-traitlet" name="description"></div>
                    <div class="nbtools-traitlet" name="status"></div>
                    <div class="nbtools-traitlet" name="files"></div>
                    <div class="nbtools-traitlet" name="text"></div>
                    <div class="nbtools-traitlet" name="visualization"></div>
                </div>
            </div>
        `;
        this.element = new DOMParser().parseFromString(template, "text/html")
            .querySelector('div.nbtools-widget') as HTMLElement;

        // Set the logo
        const logo = this.element.querySelector("img.nbtools-widget-logo") as HTMLImageElement;
        logo.src = "https://notebook.genepattern.org/hub/logo"; // FIXME: NBToolManager.options.logo;

        // Attach collapse event
        const collapse = this.element.querySelector("button.nbtools-widget-collapse") as HTMLButtonElement;
        collapse.addEventListener("click", () => this.toggle_collapse());

        // Attach the gear event
        const gear = this.element.querySelector("button.nbtools-widget-gear") as HTMLButtonElement;
        gear.addEventListener("click", () => console.log('GEAR'));

        // Set the element
        this.setElement(this.element);
    }

    traitlet_changed(event:any) {
        const name = typeof event === "string" ? event : Object.keys(event.changed)[0];
        const elements = this.element.querySelectorAll(`.nbtools-traitlet[name=${name}]`);
        elements.forEach(element => element.textContent = this.model.get(name));
    }

    hide_code() {
        // TODO: Implement better event handling for this
        // const element = this.element;
        // setTimeout(() => {
        //     let input_block = element.closest('.jp-Cell') as HTMLElement;
        //     if (input_block) input_block = input_block.querySelector('.jp-Cell-inputWrapper') as HTMLElement;
        //     if (input_block) input_block.style.display = "none";
        // }, 100);
    }

    toggle_collapse() {
        const body = this.element.querySelector(".nbtools-widget-body") as HTMLElement;
        const collapsed = body.style.display === "none";

        // Hide or show widget body
        if (collapsed) body.style.display = "block";
        else body.style.display = "none";

        // Toggle the collapse button
        const button = this.element.querySelector(".nbtools-widget-collapse > span") as HTMLElement;
        if (collapsed) {
            button.classList.add('fa-minus');
            button.classList.remove('fa-plus');
        }
        else {
            button.classList.remove('fa-minus');
            button.classList.add('fa-plus');
        }
    }
}

    //         this.element.append(
    //             $("<div></div>")
    //                 .addClass("panel-body")
    //                 .append(
    //                     $("<div></div>")
    //                         .addClass("nbtools-element-job-body-wrapper")
    //                         .append( // Attach message box
    //                             $("<div></div>")
    //                                 .addClass("nbtools-element-task-desc")
    //                                 .css("display", element.options.description ? 'block' : 'none')
    //                                 .append(element.options.description)
    //                         )
    //                         .append(
    //                             $("<div></div>")
    //                                 .addClass("row")
    //                                 .append(
    //                                     $("<div></div>")
    //                                         .addClass("nbtools-output-status col-md-3")
    //                                         .append(element.options.status ? element.options.status : input_number)
    //                                 )
    //                                 .append(
    //                                     $("<div></div>")
    //                                         .addClass("nbtools-element-job-outputs col-md-9")
    //                                         .append(element._build_file_links())
    //                                 )
    //                         )
    //                         .append(
    //                             $("<div></div>")
    //                                 .addClass("output_text nbtools-output-text")
    //                                 .css("display", element.options.text ? 'block' : 'none')
    //                                 .append(
    //                                     $("<pre></pre>")
    //                                         .append(element.options.text)
    //                                 )
    //                         )
    //                         .append(
    //                             $("<div></div>")
    //                                 .addClass("nbtools-output-visualize")
    //                                 .append(element._handle_visualization())
    //                         )
    //                 )
    //         );
    //
    //         // Handle the metadata
    //         element._handle_metadata();
    //
    //         // Trigger gp.widgetRendered event on cell element
    //         setTimeout(function () {
    //             element.element.closest(".cell").trigger("nbtools.widget_rendered");
    //         }, 10);
    //
    //         return this;
    //     },
    //
    //
    //     /**
    //      * Update the status in the element
    //      *
    //      * @param new_status
    //      */
    //     update_status: function(new_status) {
    //         this.element.find('.nbtools-output-status').html(new_status);
    //     },
    //
    //     /**
    //      * Insert a cell with code referencing the output file
    //      *
    //      * @param path
    //      * @param file_name
    //      */
    //     code_cell: function(path, file_name) {
    //         const open_string = Utils.is_url(path) ? path : file_name;
    //
    //         const var_name = Utils.make_python_safe(file_name.toLowerCase() + "_file");
    //         const code = "# More information can be obtained by calling help(" + var_name + ").\n" +
    //                    var_name + " = nbtools.open(\"" + open_string + "\")\n" +
    //                    var_name;
    //         const cell = Jupyter.notebook.insert_cell_below();
    //         cell.code_mirror.setValue(code);
    //
    //         // Select and run the cell
    //         cell.execute();
    //         setTimeout(function() {
    //             $(cell.element).click();
    //         }, 100);
    //     },
    //
    //     // TODO: FIXME MOVE DATAFRAME OPTION TO GPNB PACKAGE
    //     dataframe_cell: function(path, file_name, kind) {
    //         const to_open = Utils.is_url(path) ? path : file_name;
    //         const var_name = Utils.make_python_safe(file_name.toLowerCase() + "_dataframe");
    //         const kind_import = kind === "gct" ? "gct" : "odf";
    //         const code = "# The code below will only run if pandas is installed: http://pandas.pydata.org\n" +
    //                    "import nbtools\n" +
    //                    "from gp.data import " + kind_import.toUpperCase() + "\n" +
    //                    var_name + " = " + kind_import.toUpperCase() + "(nbtools.open(\"" + to_open + "\"))\n" +
    //                    var_name;
    //         const cell = Jupyter.notebook.insert_cell_below();
    //         cell.code_mirror.setValue(code);
    //
    //         // Select and run the cell
    //         cell.execute();
    //         setTimeout(function() {
    //             $(cell.element).click();
    //         }, 100);
    //     },
    //
    //     /**
    //      * Construct the file links for the output element
    //      *
    //      * @returns {*|jQuery}
    //      * @private
    //      */
    //     _build_file_links: function() {
    //         const element = this;
    //         const outputs = element.options.files;
    //         const outputsList = $("<div></div>")
    //             .addClass("nbtools-element-job-outputs-list");
    //
    //         if (outputs) {
    //             for (let i = 0; i < outputs.length; i++) {
    //                 const wrapper = $("<div></div>");
    //                 const output = outputs[i];
    //
    //                 const name = Utils.extract_file_name(output);
    //                 const kind = element._extract_file_kind(output);
    //                 const href = element._build_url(output);
    //
    //                 const link = $("<a></a>")
    //                     .text(name + " ")
    //                     .addClass("nbtools-element-job-output-file")
    //                     .attr("data-kind", kind)
    //                     .attr("href", href)
    //                     .attr("onclick", "return false;")
    //                     .attr("data-toggle", "popover")
    //                     .append(
    //                         $("<i></i>")
    //                             .addClass("fa fa-info-circle")
    //                             .css("color", "gray")
    //                     )
    //                     .click(function() {
    //                         $(".popover").popover("hide");
    //                     });
    //
    //                 // Build and attach the file menu
    //                 // TODO: FIXME MOVE FILE MENUS FROM THE GPNB PACKAGE
    //                 if (typeof GPNotebook !== 'undefined') GPNotebook.menus.build_menu(element, link, name, href, kind, true);
    //
    //                 link.appendTo(wrapper);
    //                 wrapper.appendTo(outputsList);
    //             }
    //         }
    //         else {
    //             outputsList.text("No output files.");
    //         }
    //
    //         return outputsList;
    //     },
    //
    //     /**
    //      * Handle any visualization passed to the output element
    //      *
    //      * @returns {*|jQuery|HTMLElement}
    //      * @private
    //      */
    //     _handle_visualization: function() {
    //         // In the future, implement in a smarter way than simply appending the value as HTML
    //         return $(this.options.visualization);
    //     },
    //
    //     _build_url: function(path) {
    //         if (Utils.is_url(path)) return path;
    //         else return this._get_current_dir_url() + path;
    //     },
    //
    //     _get_current_dir_url: function() {
    //         return Jupyter.notebook.base_url + 'notebooks/' + Jupyter.notebook.notebook_path.substring(0, Jupyter.notebook.notebook_path.length - (Jupyter.notebook.notebook_name.length));
    //     },
    //
    //     _extract_file_kind: function(path) {
    //         return path.split('.').pop();
    //     },
    //
    //     toggle_code: function() {
    //         // Get the code block
    //         const code = this.element.closest(".cell").find(".input");
    //         const is_hidden = code.is(":hidden");
    //         const cell = this.options.cell;
    //
    //         if (is_hidden) {
    //             // Show the code block
    //             code.slideDown();
    //             MetadataManager.set_metadata(cell, "show_code", true);
    //         }
    //         else {
    //             // Hide the code block
    //             code.slideUp();
    //             MetadataManager.set_metadata(cell, "show_code", false);
    //         }
    //     },
    //
    //     /**
    //      * Expand or collapse the output element
    //      *
    //      *     expand - optional parameter used to force an expand or collapse,
    //      *         leave undefined to toggle back and forth
    //      */
    //     expandCollapse: function(expand) {
    //         const toSlide = this.element.find(".panel-body");
    //         const indicator = this.element.find(".element-slide-indicator").find("span");
    //         const isHidden = toSlide.is(":hidden");
    //
    //         if (expand === false || !isHidden) {
    //             toSlide.slideUp();
    //             indicator.removeClass("fa-minus");
    //             indicator.addClass("fa-plus");
    //         }
    //         else if (isHidden || expand) {
    //             toSlide.slideDown();
    //             indicator.removeClass("fa-plus");
    //             indicator.addClass("fa-minus");
    //         }
    //     },
    //
    //     _handle_metadata: function() {
    //         const element = this;
    //         const cell = this.options.cell;
    //
    //         // If the metadata has not been set, set it
    //         if (!MetadataManager.is_tool_cell(cell)) {
    //             MetadataManager.make_tool_cell(cell, "uioutput", {
    //                 show_code: false
    //             });
    //         }
    //
    //         // Read the metadata and alter the element accordingly
    //
    //         // Add the current name and description of the element
    //         cell.metadata.nbtools.name = element.options.name;
    //         cell.metadata.nbtools.description = element.options.description;
    //
    //         // Hide or show code
    //         if (!cell.metadata.nbtools.show_code) {
    //             cell.element.find(".input").hide();
    //         }
    //     }
    // });
    //
    // const UIOutputView = widgets.DOMWidgetView.extend({
    //     render: function () {
    //         let cell = this.options.cell;
    //
    //         // Ugly hack for getting the Cell object in ipywidgets 7
    //         if (!cell) cell = this.options.output.element.closest(".cell").data("cell");
    //
    //         // Render the view.
    //         if (!this.el) this.setElement($('<div></div>'));
    //
    //         const name = this.model.get('name');
    //         const description = this.model.get('description');
    //         const status = this.model.get('status');
    //         const files = this.model.get('files');
    //         const text = this.model.get('text');
    //         const visualization = this.model.get('visualization');
    //
    //         // Initialize the element
    //         $(this.$el).outputWidget({
    //             name: name,
    //             description: description,
    //             status: status,
    //             files: files,
    //             text: text,
    //             visualization: visualization,
    //             cell: cell
    //         });
    //
    //         // Hide the code by default
    //         const element = this.$el;
    //         const hideCode = function() {
    //             const cell = element.closest(".cell");
    //             if (cell.length > 0) {
    //                 // Protect against the "double render" bug in Jupyter 3.2.1
    //                 element.parent().find(".nbtools-uibuilder:not(:first-child)").remove();
    //             }
    //             else {
    //                 setTimeout(hideCode, 10);
    //             }
    //         };
    //         setTimeout(hideCode, 1);
    //     },
    //
    //     update: function() {
    //         // Update the element with what's changed
    //         Object.keys(this.model.changed).forEach(i => $(this.$el).outputWidget('option', i, this.model.changed[i]));
    //     }
    // });
    //
    // return {
    //     UIOutputView: UIOutputView
    // }
// });