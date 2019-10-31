/**
 * Define the UI Builder widget for Jupyter Notebook
 *
 * @author Thorin Tabor
 *
 * Copyright 2019 Regents of the University of California and the Broad Institute
 */
import './uibuilder.css'
import { DOMWidgetModel, DOMWidgetView, ISerializers, reject, unpack_models } from '@jupyter-widgets/base';
import { MODULE_NAME, MODULE_VERSION } from './version';
import { BaseWidgetView } from "./basewidget";
import { ManagerBase } from '@jupyter-widgets/base/lib/manager-base';


export class UIBuilderModel extends DOMWidgetModel {
    static model_name = 'UIBuilderModel';
    static model_module = MODULE_NAME;
    static model_module_version = MODULE_VERSION;
    static view_name = 'UIBuilderView';
    static view_module = MODULE_NAME;
    static view_module_version = MODULE_VERSION;

    static serializers: ISerializers = {
        ...DOMWidgetModel.serializers,
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
    element:HTMLElement = document.createElement('div');
    traitlets = ['name', 'description', 'origin', 'params', 'function_import', 'register_tool', 'collapse', 'events', 'form', 'output'];
    renderers:any = {};
    template:string = `
            <div class="nbtools nbtools-uibuilder">
                <div class="nbtools-header">
                    <img class="nbtools-logo" src="" />
                    <label class="nbtools-title nbtools-traitlet" data-traitlet="name"></label>
                    <div class="nbtools-controls">
                        <button class="nbtools-collapse">
                            <span class="fa fa-minus"></span>
                        </button>
                        <button class="nbtools-gear">
                            <span class="fa fa-cog"></span>
                            <span class="fa fa-caret-down"></span>
                        </button>
                        <ul class="nbtools-menu" style="display: none;">
                            <li class="nbtools-toggle-code">Toggle Code View</li>
                        </ul>
                    </div>
                </div>
                <div class="nbtools-body">
                    <div class="nbtools-description nbtools-traitlet" data-traitlet="description"></div>
                    <div class="nbtools-form"></div>
                </div>
            </div>
        `;

    render() {
        super.render();

        // Add the interactive form widget
        const form_element = this.element.querySelector('.nbtools-form') as HTMLElement;
        const form_model = this.model.get('form');
        this.create_child_view(form_model).then((view: DOMWidgetView) => {
            form_element.appendChild(view.el);
            return view;
        }).catch(reject('Could not add form to the UI Builder', true));
    }
}