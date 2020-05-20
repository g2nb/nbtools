/**
 * Define the UI Builder widget for Jupyter Notebook
 *
 * @author Thorin Tabor
 *
 * Copyright 2020 Regents of the University of California and the Broad Institute
 */
import '../style/uibuilder.css'
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
            display_header: true,
            display_footer: true,
            info: '',
            error: '',
            run_label: 'Run',
            form: undefined,
            output: undefined
        };
    }
}

export class UIBuilderView extends BaseWidgetView {
    dom_class = 'nbtools-uibuilder';
    traitlets = [...super.basics(), 'origin', '_parameters', 'function_import', 'register_tool', 'collapse',
        'events', 'info', 'error', 'run_label', 'form', 'output'];
    renderers:any = {
        "error": this.render_error,
        "info": this.render_info
    };
    body:string = `
        <button class="nbtools-run" data-traitlet="run_label"></button>
        <div class="nbtools-description" data-traitlet="description"></div>
        <div class="nbtools-error" data-traitlet="error"></div>
        <div class="nbtools-info" data-traitlet="info"></div>
        <div class="nbtools-form"></div>
        <div class="nbtools-footer"></div>
        <button class="nbtools-run" data-traitlet="run_label">Run</button>`;

    render() {
        super.render();

        // Hide the header or footer, if necessary
        this.display_header_changed();
        this.display_footer_changed();
        this.model.on(`change:display_header`, this.display_header_changed, this);
        this.model.on(`change:display_footer`, this.display_footer_changed, this);

        // Attach the Reset Parameters gear option
        this.add_menu_item('Reset Parameters', () => this.reset_parameters());

        // Attach the Run button callbacks
        this.activate_run_buttons();

        // Add the interactive form widget
        this.attach_child_widget('.nbtools-form', 'form');

        // Attach ID and event callbacks once the view is rendered
        element_rendered(this.el).then(() => this._attach_callbacks());
    }

    render_error(message:string, widget:UIBuilderView) {
        return widget._render_or_hide('.nbtools-error', message, widget);
    }

    render_info(message:string, widget:UIBuilderView) {
        return widget._render_or_hide('.nbtools-info', message, widget);
    }

    _render_or_hide(selector:string, message:string, widget:UIBuilderView) {
        (widget.element.querySelector(selector) as HTMLElement).style.display = message.trim() ? 'block': 'none';
        return message;
    }

    display_header_changed() {
        const display = this.model.get('display_header') ? 'block': 'none';
        (this.element.querySelector('.nbtools-run:first-of-type') as HTMLElement).style.display = display;
        (this.element.querySelector('.nbtools-description') as HTMLElement).style.display = display;
    }

    display_footer_changed() {
        const display = this.model.get('display_footer') ? 'block': 'none';
        (this.element.querySelector('.nbtools-run:last-of-type') as HTMLElement).style.display = display;
        (this.element.querySelector('.nbtools-footer') as HTMLElement).style.display = display;

        // If there is an output_var element, hide or show it as necessary
        if (!this.output_var_displayed()) return;
        (this.element.querySelector('.nbtools-input:last-of-type') as HTMLElement).style.display = display;
    }

    output_var_displayed() {
        const output_var = this.model.get('_parameters')['output_var'];
        return !!(output_var && output_var['hide'] == false);
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
     * Add default choices defined in with UI Builder choice parameter to the label -> value map
     *
     * @param display_value_map
     * @param model
     * @private
     */
    _add_default_choices(display_value_map:any, model: any) {
            const choices = model.get('choices');
            if (choices && Object.keys(choices).length) display_value_map['Default Choices'] = model.get('choices');
    }

    /**
     * Add all files matching a specific selector to the label -> value map under the specified name
     *
     * @param display_value_map
     * @param target
     * @param kinds
     * @param selector
     * @param group_name
     * @private
     */
    _add_notebook_files(display_value_map:any, target:HTMLElement, kinds:any, selector:string, group_name:string) {
        // Get the notebook's parent node
        const notebook = target.closest('.jp-Notebook') as HTMLElement;

        // Get all possible outputs
        const markdown_outputs = [...notebook.querySelectorAll(selector) as any];

        // Build list of compatible outputs
        const compatible_outputs = {} as any;
        markdown_outputs.forEach((output:HTMLElement) => {
            let href, label, kind;

            // Handle getting the kind and label from a link
            if (output.tagName.toLowerCase() === 'a') {
                href = output.getAttribute('href') as string;
                label = (output.textContent || href).trim();
                kind = UIBuilderView.get_kind(href) as string;
            }

            // Handle getting the kind and label from text
            else {
                label = (output.textContent || 'Blank Text Option').trim();
                href = (output.textContent || '').trim();
                kind = 'text';
            }

            // Include if matching kind
            if (kinds.includes(kind)) compatible_outputs[label] = href;
            // Include if kinds blank and not text
            else if (kinds.length === 0 && kind !== 'text') compatible_outputs[label] = href;
        });

        // Add to the label -> value map
        if (Object.keys(compatible_outputs).length > 0) display_value_map[group_name] = compatible_outputs;
    }

    /**
     * Add markdown input files to the label -> value map
     *
     * @param display_value_map
     * @param target
     * @param kinds
     * @private
     */
    _add_markdown_files(display_value_map:any, target:HTMLElement, kinds:any) {
        this._add_notebook_files(display_value_map, target, kinds,
            '.nbtools-markdown-file', 'Notebook Instructions');
    }

    /**
     * Add markdown text options to the label -> value map
     *
     * @param display_value_map
     * @param target
     * @param kinds
     * @private
     */
    _add_markdown_text(display_value_map:any, target:HTMLElement, kinds:any) {
        this._add_notebook_files(display_value_map, target, kinds,
            '.nbtools-text-option', 'Text Options');
    }

    /**
     * Add UIOutput files to the label -> value map
     *
     * @param display_value_map
     * @param target
     * @param kinds
     * @private
     */
    _add_output_files(display_value_map:any, target:HTMLElement, kinds:any) {
        this._add_notebook_files(display_value_map, target, kinds,
            '.nbtools-file', 'Output Files');
    }

    _attach_kinds(attach_point:any) {
        const view = attach_point.widget;
        const model = view.model;  // Get the model from the view
        const kinds = model.get('kinds') || ['text'];
        attach_point.setAttribute('data-type', kinds.join(', '));
    }

    /**
     * Attach sent to / come from menu support to the UI Builder widget
     *
     * @private
     */
    _attach_menus() {
        this.el.querySelectorAll('.nbtools-menu-attached').forEach((attach_point:any) => {
            this._attach_kinds(attach_point);
            attach_point.addEventListener("click", (event:Event) => {
                const target = event.target as HTMLElement;                                     // Get click target
                const element = target.closest('.nbtools-menu-attached') || target;    // Get parent widget
                const view = (element as any).widget;                                           // Get widget view

                if (view) {
                    const model = view.model;  // Get the model from the view

                    // Get the list of compatible kinds
                    const kinds = model.get('kinds') || ['text'];
                    // this._attach_kinds(attach_point);

                    // Get all compatible outputs and build display -> value map
                    const display_value_map = {};
                    this._add_default_choices(display_value_map, model);
                    this._add_output_files(display_value_map, target, kinds);
                    this._add_markdown_files(display_value_map, target, kinds);
                    this._add_markdown_text(display_value_map, target, kinds);

                    // Update and attach the menu
                    this.attach_combobox_menu(target, display_value_map);

                    // Attach the chevron to the input... or not
                    if (Object.keys(display_value_map).length > 0) attach_point.classList.add('nbtools-dropdown');
                    else attach_point.classList.remove('nbtools-dropdown');
                }
            });

            // Initial menu attachment
            // attach_point.dispatchEvent(new Event('click'));
        });
    }

    toggle_file_menu(link:HTMLElement, display_value_map:any) {
        const menu = link.nextElementSibling as HTMLElement;
        const collapsed = menu.style.display === "none";

        // If the menu is empty, don't show it
        if (menu.childElementCount === 0) return;

        // Hide or show the menu
        if (collapsed) menu.style.display = "block";
        else menu.style.display = "none";

        // Hide the menu with the next click
        const hide_next_click = function(event:Event) {
            if (link.contains(event.target as Node)) return;
            menu.style.display = "none";
            document.removeEventListener('click', hide_next_click);
        };
        document.addEventListener('click', hide_next_click)
    }

    /**
     * Create or update the menu based on the label -> value map
     *
     * @param target
     * @param display_value_map
     */
    attach_combobox_menu(target:HTMLElement, display_value_map:any) {
        // Get the menu and empty it, if it exists.
        let menu = target.nextSibling as HTMLUListElement;
        const menu_exists = menu && menu.classList.contains('nbtools-menu');
        if (menu_exists) menu.innerHTML = '';

        // Create and insert the menu, if necessary
        else {
            menu = document.createElement('ul') as HTMLUListElement;
            menu.classList.add('nbtools-menu', 'nbtools-file-menu');
            menu.style.display = 'none';
            target.parentNode ? target.parentNode.insertBefore(menu, target.nextSibling) : null;
        }

        // Iterate over display -> value map and insert menu items
        Object.keys(display_value_map).forEach((group) => {
            // Add the group label
            this.add_menu_item(group, () => {}, 'nbtools-menu-header', menu, false);

            // Loop over all files in the group
            Object.keys(display_value_map[group]).forEach((display_name) => {
                this.add_menu_item(display_name, () => {
                    (target as HTMLInputElement).value = display_value_map[group][display_name];
                    target.dispatchEvent(new Event('change', { 'bubbles': true }));
                }, 'nbtools-menu-subitem', menu, false);
            });
        });

        this.toggle_file_menu(target, display_value_map);
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

            // Special case to handle focus events, which are swallowed by the Jupyter UI
            else if (key === 'focus') element.addEventListener('focusin', func);

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
                    child.el.widget = child;
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