/**
 * Define the UI Builder widget for Jupyter Notebook
 *
 * @author Thorin Tabor
 *
 * Copyright 2019 Regents of the University of California and the Broad Institute
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
        <button class="nbtools-run">Run</button>`;

    render() {
        super.render();

        // Attach the Reset Parameters gear option
        this.add_menu_item('Reset Parameters', () => this.reset_parameters());

        // Attach the Run button callbacks
        this.activate_run_buttons();

        // Add the interactive form widget
        const element = this.element.querySelector('.nbtools-form') as HTMLElement;
        const model = this.model.get('form');

        this.create_child_view(model).then((view:any) => {
            element.appendChild(view.el);
            UIBuilderView._initialize_display(model, view);
            return view;
        }).catch(reject('Could not add form to the UI Builder', true));

        // Attach ID and event callbacks once the view is rendered
        element_rendered(this.el).then(() => this._attach_callbacks());
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
                this.el.querySelector('.jupyter-button').click();

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
        }
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

        // Recursively trigger th display for all child widgets
        if ('children_views' in view) {
            view.children_views.update(model.get('children')).then((children:DOMWidgetView[]) => {
                children.forEach((child) => {
                    UIBuilderView._initialize_display(child.model, child);
                });
            });
        }
    }

    reset_parameters() {
        const params = this.model.get('params');
        params.forEach((spec:any) => {
            // TODO: Get input element and set value to default
            // const name = spec['name'];
            // const value = spec['default'];
            // this.element.querySelector('.xxx');
            console.log('reset_parameters')
        });
    }
}