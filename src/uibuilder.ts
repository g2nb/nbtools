/**
 * Define the UI Builder widget for Jupyter Notebook
 *
 * @author Thorin Tabor
 *
 * Copyright 2020 Regents of the University of California and the Broad Institute
 */
import '../style/uibuilder.css'
import { MODULE_NAME, MODULE_VERSION } from './version';
import { ISerializers, unpack_models } from "@jupyter-widgets/base";
import { BaseWidgetModel, BaseWidgetView } from "./basewidget";
import { element_rendered, toggle } from "./utils";
import { ContextManager } from "./context";

// noinspection JSAnnotator
export class UIBuilderModel extends BaseWidgetModel {
    static model_name = 'UIBuilderModel';
    static model_module = MODULE_NAME;
    static model_module_version = MODULE_VERSION;
    static view_name = 'UIBuilderView';
    static view_module = MODULE_NAME;
    static view_module_version = MODULE_VERSION;

    static serializers: ISerializers = {
        ...BaseWidgetModel.serializers,
        form: { deserialize: unpack_models }
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
            _parameters: [] as any,
            parameter_groups: [] as any,
            accept_origins: [] as any,
            function_import: '',
            register_tool: true,
            collapse: true,
            events: {},
            buttons: {},
            license: {},
            display_header: true,
            display_footer: true,
            busy: false,
            run_label: 'Run',
            form: undefined as any,
            output: undefined as any
        };
    }
}

// noinspection JSAnnotator
export class UIBuilderView extends BaseWidgetView {
    dom_class = 'nbtools-uibuilder';
    traitlets = [...super.basics(), 'origin', '_parameters', 'function_import', 'register_tool', 'collapse',
        'events', 'run_label', 'form', 'output'];
    renderers:any = {
        "error": this.render_error,
        "info": this.render_info
    };
    body:string = `
        <div class="nbtools-buttons">
            <button class="nbtools-run" data-traitlet="run_label"></button>
        </div>
        <div class="nbtools-description" data-traitlet="description"></div>
        <div class="nbtools-busy">
            <div>
                <i class="fas fa-circle-notch fa-spin"></i>
            </div>
        </div>
        <div class="nbtools-error" data-traitlet="error"></div>
        <div class="nbtools-info" data-traitlet="info"></div>
        <div class="nbtools-form"></div>
        <div class="nbtools-footer"></div>
        <div class="nbtools-buttons">
            <button class="nbtools-run" data-traitlet="run_label"></button>
        </div>`;
    dialog:string = `<div class="nbtools-dialog">
                           <div class="nbtools-panel">
                               <div class="nbtools-header"></div>
                               <div class="nbtools-body">
                                   <p></p>
                                   <div class="nbtools-panel-button">
                                       <button class="nbtools-panel-cancel">Cancel</button>
                                       <button class="nbtools-panel-button"></button>
                                   </div>
                               </div>
                           </div>
                       </div>`;

    render() {
        super.render();

        // Hide the header or footer, if necessary
        this.display_header_changed();
        this.display_footer_changed();
        this.model.on(`change:display_header`, this.display_header_changed, this);
        this.model.on(`change:display_footer`, this.display_footer_changed, this);

        // Show or hide the "busy" UI
        this.busy_changed();
        this.model.on(`change:busy`, this.busy_changed, this);

        // Attach the Reset Parameters gear option
        this.add_menu_item('Reset Parameters', () => this.reset_parameters());

        // Attach the Run button callbacks
        this.activate_run_buttons();

        // Attach custom buttons
        this.activate_custom_buttons();

        // Display the license, if any
        this.display_license();

        // Add the interactive form widget
        this.attach_child_widget('.nbtools-form', 'form');

        // After the view is rendered
        element_rendered(this.el).then(() => {
            // Attach ID and event callbacks
            this._attach_callbacks();

            // Create parameter groups
            this._init_parameter_groups();

            // Attach the Advanced Options gear option, if necessary
            if (this.has_advanced()) this.add_menu_item('Advanced Options', () => this.toggle_advanced());
        });
    }

    busy_changed() {
        const display = this.model.get('busy') ? 'block': 'none';
        (this.element.querySelector('.nbtools-busy') as HTMLElement).style.display = display;
    }

    display_header_changed() {
        const display = this.model.get('display_header') ? 'block': 'none';
        (this.element.querySelector('.nbtools-buttons:first-of-type') as HTMLElement).style.display = display;
        (this.element.querySelector('.nbtools-description') as HTMLElement).style.display = display;
    }

    display_footer_changed() {
        const display = this.model.get('display_footer') ? 'block': 'none';
        (this.element.querySelector('.nbtools-buttons:last-of-type') as HTMLElement).style.display = display;
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
     * Displays a EULA to the user, who must agree before continuing.
     *
     * License should be a dict with the following keys:
     *      text: The text of the license
     *      title: The name of the license (optional)
     *      callback: Whether the license has been agreed to (boolean)
     */
    display_license() {
        const license = this.model.get('license');  // Get the license model
        if (!license || !license['text']) return;   // If there is no license, skip

        this.widget_dialog({title: license['title'] ||
                'You must agree below to the following end-user license agreement',
            body: license['text'],
            button_label: 'Agree',
            callback: () => {
                license['callback'] = true;         // Set to true to trigger callback function
                this.model.set('license', license);
                this.model.save();
            }});
    }

    activate_custom_buttons() {
        (this.el.querySelectorAll('.nbtools-buttons') as NodeListOf<HTMLElement>).forEach((box:HTMLElement) => {
            const buttons = this.model.get('buttons');
            Object.keys(buttons).forEach((label) => {
                const button = new DOMParser().parseFromString(`<button>${label}</button>`, "text/html")
                    .querySelector('button') as HTMLElement;
                const button_event = new Function(buttons[label]) as EventListener;

                button.addEventListener('click', button_event);
                box.prepend(button);
            });
        });
    }

    /**
     * Attach the click event to each Run button
     */
    activate_run_buttons() {
        (this.el.querySelectorAll('.nbtools-run') as NodeListOf<HTMLElement>).forEach((button:HTMLElement) =>
            button.addEventListener('click', () => {
                // Validate required parameters and return if not valid
                if(!this.validate()) return;

                // Execute the interact instance
                (this.el.querySelector('.widget-interact > .jupyter-button') as HTMLElement).click();

                // Collapse the widget, if collapse=True
                if (this.model.get('collapse')) (this.el.querySelector('.nbtools-collapse') as HTMLElement).click();
            })
        )
    }

    /**
     * Check to make sure required parameters are checked out.
     * Highlight missing parameters. Return whether valid.
     */
    validate() {
        let valid = true;

        const form = this.el.querySelector('.nbtools-form') as HTMLElement;
        form.querySelectorAll<HTMLElement>('.nbtools-input').forEach((param:HTMLElement) => {
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

    widget_dialog({title='', body = '', button_label = 'OK', callback = null}: any) {
        this.element.appendChild(new DOMParser().parseFromString(this.dialog, "text/html")
            .querySelector('body > :first-child') as HTMLElement);
        const dialog = this.element.querySelector('.nbtools-dialog');
        const header = dialog.querySelector('.nbtools-header') as HTMLElement;
        const button = dialog.querySelector('button.nbtools-panel-button') as HTMLElement;
        header.style.backgroundColor = this.model.get('color');
        header.textContent = title;
        dialog.querySelector('.nbtools-body > p').textContent = body;
        dialog.querySelector('.nbtools-panel-cancel').addEventListener('click', () => dialog.remove());
        button.textContent = button_label;
        button.style.backgroundColor = this.model.get('color');
        button.addEventListener('click', () => {
            dialog.remove();
            callback();
        });
    }

    /**
     * Create group headers and reorder the form widget according to the group spec
     *
     * @private
     */
    _init_parameter_groups() {
        // Get the parameter groups
        const groups = this.model.get('parameter_groups');
        if (!groups || !groups.length) return; // No groups are defined, skip this step

        // Get the UI Builder form container
        const form = this.el.querySelector('.nbtools-form > .widget-interact') as HTMLElement;
        if (!form) return; // If no container is found, skip this step

        // Iterate over each group, create headers and add parameters
        groups.reverse().forEach((group: any) => {
            const hidden = !!group['hidden'];       // Is the group collapsed by default?
            const advanced = !!group['advanced'];   // Toggle on with advanced options call?

            // Create and add the header
            const header = this._create_group_header(group['name'], hidden, advanced);
            const body = this._create_group_body(header, group['description'], hidden, advanced);
            form.prepend(body);
            form.prepend(header);

            // Add the parameters
            group['parameters'] && group['parameters'].forEach((param_name: string) => {
                const param = this._param_dom_by_name(form, param_name);
                if (!param) return; // If the parameter is not found, skip
                body.append(param);
            });
        });
    }

    _create_group_header(name: string|null, hidden: boolean, advanced: boolean) {
        // Create the expand / collapse button
        const controls = document.createElement('controls');
        const button = document.createElement('button');
        const icon = document.createElement('span');
        controls.classList.add('nbtools-controls');
        button.classList.add('nbtools-collapse');
        icon.classList.add('fa', 'fa-minus');
        button.append(icon);
        controls.append(button);

        // Create the header
        const header = document.createElement('div');
        header.classList.add('nbtools-header', 'nbtools-group-header');
        if (advanced) header.classList.add('nbtools-advanced');
        header.append(name || '');
        header.append(controls);

        // Apply the color
        header.style.backgroundColor = this.model.get('color');

        // Hide the header if no name is given and not collapsed
        if (!name && !hidden) header.style.display = 'none';

        // Return the container
        return header;
    }

    _create_group_body(header:HTMLElement, description:string|null, hidden?: boolean, advanced?: boolean) {
        // Create the container
        const box = document.createElement('div');
        box.classList.add('nbtools-group');
        if (advanced) box.classList.add('nbtools-advanced');

        // Create the description
        if (description) {
            const desc = document.createElement('div');
            desc.classList.add('nbtools-description');
            desc.append(description || '');
            box.append(desc);
        }

        // Add controls to the expand / collapse button
        const button = header.querySelector('button') as HTMLElement;
        const icon = button.querySelector('span') as HTMLElement;
        button.addEventListener('click', () => {
            this._group_toggle_collapse(box, icon);
        });

        // Collapse if hidden
        if (hidden) this._group_toggle_collapse(box, icon);

        return box
    }

    _group_toggle_collapse(group_box:HTMLElement, button:HTMLElement) {
        const collapsed = group_box.style.display === "none";

        // Hide or show widget body
        toggle(group_box);

        // Toggle the collapse button
        if (collapsed) {
            button.classList.add('fa-minus');
            button.classList.remove('fa-plus');
        }
        else {
            button.classList.remove('fa-minus');
            button.classList.add('fa-plus');
        }
    }

    _param_dom_by_name(form: HTMLElement, name: string) {
        // First attempt: Try to get parameter by data-name attribute (created by attach_callbacks() method)
        let param = form.querySelector(`.nbtools-input[data-name='${name}']`);
        if (param) return param; // Found it! Return the parameter

        // Second attempt: Try to locate by parameter name label
        const label = form.querySelector(`.nbtools-input > .widget-label:first-child`);
        if (!label) return null; // No matching label found, return null
        const match = name.toLowerCase().replace(/[^a-zA-Z]/g, '') ===
            (label.textContent as string).toLowerCase().replace(/[^a-zA-Z]/g, '');
        if (match) return label.closest('.nbtools-input');

        // Match not found, return null
        return null;
    }

    /**
     * Attach ID and event callbacks to the UI Builder
     *
     * @private
     */
    _attach_callbacks() {
        // Handle widget events
        const widget_events = this.model.get('events');
        this._attach_all_events(this.el, widget_events);

        // Handle parameter IDs and parameter events
        const json_parameters = this.model.get('_parameters');
        const dom_parameters = this.el.querySelectorAll('.nbtools-input') as NodeListOf<HTMLElement>;
        for (let i = 0; i < json_parameters.length; i++) {
            const param_spec = json_parameters[i];
            const param_el = dom_parameters[i];

            // Attach the data-name attribute
            param_el.setAttribute('data-name', param_spec.name);

            // Attach specified ID as a data-id attribute
            if (!!param_spec.id) param_el.setAttribute('data-id', param_spec.id);

            // Attach parameter events
            if (!!param_spec.events) {
                this._attach_all_events(param_el, param_spec.events);
            }

            // Resize footer, if necessary
            if (param_spec.name === 'output_var' && param_spec.description) {
                // noinspection JSConstantReassignment
                (this.el.querySelector('.nbtools-footer') as HTMLElement).style.height = '50px';
            }
        }

        // Attach send to / come from menus
        this._attach_menus();

        // Attach enter key submit event
        this._submit_keypress();
    }

    _submit_keypress() {
        (this.el.querySelectorAll('.nbtools-form input, .nbtools-form select') as NodeListOf<HTMLElement>).forEach((element:HTMLElement) => {
            element.addEventListener("keydown", (event:KeyboardEvent) => {
                if (event.keyCode === 13) {
                    (this.el.querySelector('.nbtools-run') as HTMLElement).click();
                }
            });
        });
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

            // Special case for text "send to"
            if (group_name === "Text Options") {
                if (kinds.includes('text')) compatible_outputs[label] = href;
                kind = 'text';
            }

            // Include if matching kind
            if (UIBuilderView.matching_kind(kinds, kind)) compatible_outputs[label] = href;
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
        const origins:string[] = this.supported_origins();
        const compatible_outputs = ContextManager.data_registry.get_data({kinds:kinds, origins:origins});
        if (Object.keys(compatible_outputs).length > 0) {
            for (let origin of Object.keys(compatible_outputs)) display_value_map[origin] = compatible_outputs[origin];
        }
    }

    supported_origins(): string[] {
        // Get the list of supported origins for data
        let this_origin = this.model.get('origin');
        let accept_origins = this.model.get('accept_origins');

        // If supported origins is empty or undefined, accept same origins and "Notebook" by default
        if (accept_origins === null || accept_origins.length < 1) {
            accept_origins = [this_origin];
            if (this_origin !== 'Notebook') accept_origins.push('Notebook');
        }

        // Unless... if this origin is empty or undefined, accept all origins
        if (this_origin === null || this_origin.length < 1) accept_origins = [];

        // Otherwise, return the list
        return accept_origins;
    }

    _attach_kinds(attach_point:any) {
        const view = attach_point.widget;
        const model = view.model;  // Get the model from the view
        const kinds = model.get('kinds') || ['text'];
        attach_point.setAttribute('data-type', kinds.join(', '));
    }

    _attach_name(attach_point:any) {
        let name = '';
        let param_element = null;
        let name_element = null;
        param_element = attach_point.closest('.nbtools-input');
        if (param_element) name_element = param_element.querySelector('div:first-child');
        if (name_element) name = name_element.textContent.replace(/\*/g, '');
        attach_point.setAttribute('data-name', name);
    }

    _attach_accept_origins(attach_point:any) {
        const origins = this.supported_origins();
        attach_point.setAttribute('data-origins', origins.join(', '));
    }

    /**
     * Attach sent to / come from menu support to the UI Builder widget
     *
     * @private
     */
    _attach_menus() {
        this.el.querySelectorAll('.nbtools-menu-attached').forEach((attach_point:any) => {
            this._attach_kinds(attach_point);
            this._attach_name(attach_point);
            this._attach_accept_origins(attach_point);
            attach_point.addEventListener("click", (event:Event) => {
                // Get all compatible outputs and build display -> value map
                const display_value_map = this.build_display_map(attach_point);
                if (display_value_map === null) return;  // No view found, return

                // Update and attach the menu
                const target = attach_point.querySelector('input, select');
                this.attach_combobox_menu(target, display_value_map);

                // Attach the chevron to the input... or not
                this.update_chevron(attach_point, display_value_map);
            });

            // Initial menu attachment
            this.update_chevron(attach_point);
        });
    }

    build_display_map(attach_point:any):any {
        const view = attach_point.widget;                                           // Get widget view or abort
        if (!view) return null;

        const model = attach_point.widget.model;                                    // Get the model from the view
        const sendto = !attach_point.classList.contains('nbtools-nosendto');        // Send if sendto enabled
        const kinds = model.get('kinds') || ['text'];                               // Get the list of compatible kinds

        // Build the map
        const display_value_map = {};
        this._add_default_choices(display_value_map, model);
        if (sendto) this._add_output_files(display_value_map, attach_point, kinds);
        if (sendto) this._add_markdown_files(display_value_map, attach_point, kinds);
        if (sendto) this._add_markdown_text(display_value_map, attach_point, kinds);

        return display_value_map;
    }

    update_chevron(attach_point:any, display_value_map:any=null) {
        if (!display_value_map) display_value_map = this.build_display_map(attach_point)

        if (Object.keys(display_value_map).length > 0) attach_point.classList.add('nbtools-dropdown');
        else attach_point.classList.remove('nbtools-dropdown');
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
            if (group !== 'Default Choices')
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

    static matching_kind(kinds:Array<string>, kind:string) {
        let match = false;
        kinds.forEach((k) => {
            if (k.trim().endsWith(kind.trim())) match = true;
        });
        return match;
    }

    /**
     * Attach a map of events to the given DOM element (widget or parameter)
     *
     * @param {HTMLElement} element
     * @param event_map
     * @private
     */
    _attach_all_events(element:HTMLElement, event_map:any) {
        Object.keys(event_map).forEach((key) => {
            const str_func = event_map[key];
            const func = new Function(str_func) as EventListener;

            // Handle the load event as a special case (run now)
            if (key === 'load') func.call(this, new CustomEvent('load'));

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

    has_advanced() {
        return !!this.element.querySelector('.nbtools-advanced')
    }

    toggle_advanced() {
        (this.element.querySelectorAll('.nbtools-advanced') as NodeListOf<HTMLElement>).forEach((e) => {
            const hidden = !e.classList.contains('nbtools-advanced-show');
            if (hidden) e.classList.add('nbtools-advanced-show');
            else        e.classList.remove('nbtools-advanced-show');
        });
    }

    reset_parameters() {
        const params = this.model.get('_parameters');

        for (let i = 0; i < params.length; i++) {
            const spec = params[i];
            const name = spec['name'];
            const param_element = this.element.querySelector(`[data-name='${name}']:not(.nbtools-input)`);

            if (!param_element) { // Protect against nulls
                if (name !== 'output_var') console.log(`Error finding ${name} in reset_parameters()`);
                return;
            }

            const view = (param_element as any).widget;
            this.set_input_model(view.model, spec);

            // Special case for file lists
            const all_inputs:any = param_element.parentNode ? param_element.parentNode.querySelectorAll('input') : [];
            if (all_inputs.length > 1) {
                let first = true;
                all_inputs.forEach((input:HTMLInputElement) => {
                    if (first) first = false;
                    else (input as any).value = '';
                });
            }
        }
    }
}