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
            params: [],
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
    traitlets = ['name', 'description', 'origin', 'params', 'function_import', 'register_tool', 'collapse', 'events', 'form', 'output'];
    renderers:any = {};
    body:string = `
        <div class="nbtools-description" data-traitlet="description"></div>
        <div class="nbtools-form"></div>`;

    render() {
        // super.render();
        //
        // // Add the interactive form widget
        // const form_element = this.element.querySelector('.nbtools-form') as HTMLElement;
        // const form_model = this.model.get('form');
        // this.create_child_view(form_model).then((view) => {
        //     form_element.appendChild(view.el);
        //     return view;
        // }).catch(reject('Could not add form to the UI Builder', true));

        super.render();

        // Attach the Reset Parameters gear option
        this.add_menu_item('Reset Parameters', () => this.reset_parameters());

        // Add the interactive form widget
        const element = this.element.querySelector('.nbtools-form') as HTMLElement;
        const model = this.model.get('form');

        this.create_child_view(model).then((view:any) => {
            element.appendChild(view.el);
            UIBuilderView._initialize_display(model, view);
            return view;
        }).catch(reject('Could not add form to the UI Builder', true));
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