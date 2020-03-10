/**
 * Define the UI Builder widget for Jupyter Notebook
 *
 * @author Thorin Tabor
 *
 * Copyright 2020 Regents of the University of California and the Broad Institute
 */
import './uibuilder.css'
import { MODULE_NAME, MODULE_VERSION } from './version';
import { DOMWidgetModel, DOMWidgetView, ISerializers, ManagerBase, reject, unpack_models } from "@jupyter-widgets/base";
import { BaseWidgetModel, BaseWidgetView } from "./basewidget";
import { element_rendered } from "./utils";

export class UIBuilderModel extends BaseWidgetModel {
    static model_name = 'UIBuilderModel';
    static model_module = MODULE_NAME;
    static model_module_version = MODULE_VERSION;
    static view_name = 'UIBuilderView';
    static view_module = MODULE_NAME;
    static view_module_version = MODULE_VERSION;

    static serializers: ISerializers = {
        ...BaseWidgetModel.serializers,
        form: {
            deserialize: (value: any, manager: ManagerBase<any>|undefined) =>
                unpack_models(value, manager as ManagerBase<any>)
        }
    };

    defaults() {
        return {
            ...super.defaults(),
            _model_name: UIBuilderModel.model_name,
            _model_module: UIBuilderModel.model_module,
            _model_module_version: UIBuilderModel.model_module_version,
            _view_name: UIBuilderModel.view_name,
            _view_module: UIBuilderModel.view_module,
            _view_module_version: UIBuilderModel.view_module_version,
            name: 'Python Function',
            description: '',
            origin: '',
            _parameters: [],
            function_import: '',
            register_tool: true,
            collapse: true,
            events: {},
            form: undefined,
            output: undefined
        };
    }
}

export class UIBuilderView extends BaseWidgetView {
    dom_class = 'nbtools-uibuilder';
    traitlets = ['name', 'description', 'origin', '_parameters', 'function_import', 'register_tool', 'collapse', 'events', 'form', 'output'];
    renderers:any = {};
    body:string = `
        <button class="nbtools-run">Run</button>
        <div class="nbtools-description" data-traitlet="description"></div>
        <div class="nbtools-form"></div>
        <div class="nbtools-footer"></div>
        <button class="nbtools-run">Run</button>`;

    render() {
        super.render();

        // Attach the Reset Parameters gear option
        this.add_menu_item('Reset Parameters', () => this.reset_parameters());

        // Attach the Run button callbacks
        this.activate_run_buttons();

        // Add the interactive form widget
        this.attach_child_widget('.nbtools-form', 'form');

        // Attach ID and event callbacks once the view is rendered
        element_rendered(this.el).then(() => this._attach_callbacks());
    }

    /**
     * Add the specified child widget to the view and initialize
     *
     * @param {string} element_selector
     * @param {string} model_name
     */
    attach_child_widget(element_selector:string, model_name:string) {
        const element = this.element.querySelector(element_selector) as HTMLElement;
        const model = this.model.get(model_name);

        this.create_child_view(model).then((view:any) => {
            element.appendChild(view.el);
            UIBuilderView._initialize_display(model, view);
            return view;
        }).catch(reject(`Could not add ${model_name} to ${element_selector}`, true));
    }

    /**
     * Attach the click event to each Run button
     */
    activate_run_buttons() {
        this.el.querySelectorAll('.nbtools-run').forEach((button:HTMLElement) =>
            button.addEventListener('click', () => {
                // Validate required parameters and return if not valid
                if(!this.validate()) return;

                // Execute the interact instance
                this.el.querySelector('.widget-interact > .jupyter-button').click();

                // Collapse the widget, if collapse=True
                if (this.model.get('collapse')) this.el.querySelector('.nbtools-collapse').click();
            })
        )
    }

    /**
     * Check to make sure required parameters are checked out.
     * Highlight missing parameters. Return whether valid.
     */
    validate() {
        let valid = true;

        const form = this.el.querySelector('.nbtools-form');
        form.querySelectorAll('.nbtools-input').forEach((param:HTMLElement) => {
            if (!param.classList.contains('required')) return;  // Ignore optional parameters
            const input = param.querySelector('input, select') as HTMLFormElement;
            if (input.value.trim() === '') {                    // If empty
                param.classList.add('missing');                 // Add missing style
                valid = false;                                  // Not all params are valid
            }
            else param.classList.remove('missing');      // Remove missing style
        });

        return valid;
    }

    /**
     * Attach ID and event callbacks to the UI Builder
     *
     * @private
     */
    _attach_callbacks() {
        // Handle widget events
        const widget_events = this.model.get('events');
        UIBuilderView._attach_all_events(this.el, widget_events);

        // Handle parameter IDs and parameter events
        const json_parameters = this.model.get('_parameters');
        const dom_parameters = this.el.querySelectorAll('.nbtools-input');
        for (let i = 0; i < json_parameters.length; i++) {
            const param_spec = json_parameters[i];
            const param_el = dom_parameters[i];

            // Attach specified ID as a data-id attribute
            if (!!param_spec.id) param_el.setAttribute('data-id', param_spec.id);

            // Attach parameter events
            if (!!param_spec.events) {
                UIBuilderView._attach_all_events(param_el, param_spec.events);
            }

            // Resize footer, if necessary
            if (param_spec.name === 'output_var' && param_spec.description) {
                // noinspection JSConstantReassignment
                this.el.querySelector('.nbtools-footer').style.height = '50px';
            }
        }

        // Attach send to / come from menus
        this._attach_menus();
    }

    /**
     * Attach sent to / come from menu support to the UI Builder widget
     *
     * @private
     */
    _attach_menus() {
        const models = this.all_input_models();
        this.el.querySelectorAll('.nbtools-menu-attached').forEach((attach_point:any) => {
            this._combobox_fix(attach_point);

            attach_point.addEventListener("click", function(event:Event) {
                const target = event.target as HTMLElement;

                models.forEach(model => {
                    if (model.name === 'ComboboxModel') {
                        // Get the list of compatible kinds
                        const kinds = model.get('kinds');
                        attach_point.setAttribute('data-type', kinds.join(', '));

                        // Get all compatible outputs
                        const compatible = UIBuilderView.get_compatible_outputs(target, kinds);

                        // Attach the chevron to the input... or not
                        if (compatible.length > 0) attach_point.classList.add('nbtools-dropdown');
                        else attach_point.classList.remove('nbtools-dropdown');

                        // Update the options in the combobox
                        model.set('options', compatible);
                        model.save_changes();
                    }
                });
            });

            // Initial menu attachment
            attach_point.dispatchEvent(new Event('click'));
        });
    }

    /**
     * Given a list of kinds and a DOM node within a notebook, return the list of compatible outputs within that notebook
     *
     * @param target
     * @param kinds_list
     */
    static get_compatible_outputs(target:HTMLElement, kinds_list:any) {
        // Get the notebook's parent node
        const notebook = target.closest('.jp-Notebook') as HTMLElement;

        // Get all possible outputs
        const markdown_outputs = [...notebook.querySelectorAll('.nbtools-markdown-file') as any];
        const widget_outputs = [...notebook.querySelectorAll('.nbtools-file') as any];

        // Build list of compatible outputs
        const compatible_outputs = [] as Array<string>;
        markdown_outputs.concat(widget_outputs).forEach((output:HTMLElement) => {
            const href = output.getAttribute('href') as string;
            const kind = UIBuilderView.get_kind(href) as string;
            if (kinds_list.length === 0 || kinds_list.includes(kind)) compatible_outputs.push(href);
        });

        return compatible_outputs;
    }

    /**
     * Get the kind based on a given URL
     *
     * @param url
     */
    static get_kind(url:any): any {
        return url.split(/\#|\?/)[0].split('.').pop().trim();
    }

    /**
     * Make this text element behave more like a combobox when clicked
     *
     * @param element
     * @private
     */
    _combobox_fix(element:HTMLElement) {
        const input = element.querySelector('input') as HTMLElement;
        input.setAttribute('onmouseover', 'focus();old = value;');
        input.setAttribute('onmousedown', 'value="";');
        input.setAttribute('onmouseup', 'value = old;');
    }

    /**
     * Attach a map of events to the given DOM element (widget or parameter)
     *
     * @param {HTMLElement} element
     * @param event_map
     * @private
     */
    static _attach_all_events(element:HTMLElement, event_map:any) {
        Object.keys(event_map).forEach((key) => {
            const str_func = event_map[key];
            const func = new Function(str_func) as EventListener;

            // Handle the load event as a special case (run now)
            if (key === 'load') func.call(this);

            // Handle the run event as a special case (bind as click to the Run button)
            else if (key === 'run') {
                const run_button = element.querySelector('.jupyter-button');
                if (!!run_button) run_button.addEventListener('click', func);
            }

            // Otherwise, attach the event
            else element.addEventListener(key, func);
        });
    }

    /**
     * Recursively trigger the 'displayed' event for all child widgets
     *
     * @param {DOMWidgetModel} model
     * @param {DOMWidgetView | any} view
     * @private
     */
    static _initialize_display(model:DOMWidgetModel, view:DOMWidgetView|any) {
        // Trigger the display for this widget
        view.trigger('displayed');

        // Recursively trigger the display for all child widgets
        if ('children_views' in view) {
            view.children_views.update(model.get('children')).then((children:DOMWidgetView[]) => {
                children.forEach((child) => {
                    UIBuilderView._initialize_display(child.model, child);
                });
            });
        }
    }

    all_input_models() {
        const get_all_recursively = (model: any, value_list: Array<any>) => {
            const value = model.get('value');
            const children = model.get('children');

            if (model.name === 'DropdownModel' || (value !== undefined && model.name !== "LabelModel")) value_list.push(model);
            if (children !== undefined) children.forEach((child: any) => {
                get_all_recursively(child, value_list)
            });
        };

        const input_models:Array<any> = [];
        const form = this.model.get('form');
        get_all_recursively(form, input_models);
        return input_models;
    }

    set_input_model(model: any, spec: any) {
        // Special case for DropdownModel
        if (model.name === 'DropdownModel') {
            const labels = Object.keys(spec['choices']);
            for (let i = 0; i < labels.length; i++) {
                const label = labels[i];
                const value = spec['choices'][label];
                if (value === spec['default']) {
                    model.set('index', i);
                    break;
                }
            }
        }
        else {  // Otherwise just set the value traitlet
            model.set('value', spec['default']);
        }

        // Save the model
        model.save_changes();
    }

    reset_parameters() {
        const params = this.model.get('_parameters');
        const models = this.all_input_models();

        for (let i = 0; i < params.length; i++) {
            const spec = params[i];
            const model = models[i];

            this.set_input_model(model, spec);
        }
    }
}