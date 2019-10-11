// Copyright (c) Thorin Tabor
// Distributed under the terms of the Modified BSD License.

import {
    DOMWidgetModel, DOMWidgetView, ISerializers
} from '@jupyter-widgets/base';

import {
    MODULE_NAME, MODULE_VERSION
} from './version';


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
    }

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
    }

    static model_name = 'UIOutputModel';
    static model_module = MODULE_NAME;
    static model_module_version = MODULE_VERSION;
    static view_name = 'UIOutputView';   // Set to null if no view
    static view_module = MODULE_NAME;   // Set to null if no view
    static view_module_version = MODULE_VERSION;
}

export class UIOutputView extends DOMWidgetView {
    render() {
        const display = document.createElement('h1');
        this.setElement(display);
        this.name_changed();
        this.model.on('change:name', this.name_changed, this);
    }

    name_changed() {
        this.el.textContent = this.model.get('name');
    }
}