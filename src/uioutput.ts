/**
 * Widget for representing Python output as an interactive interface
 *
 * @author Thorin Tabor
 *
 * Copyright 2020 Regents of the University of California and the Broad Institute
 */
import './uioutput.css'
import { ISerializers } from '@jupyter-widgets/base';
import { MODULE_NAME, MODULE_VERSION } from './version';
import { BaseWidgetModel, BaseWidgetView } from "./basewidget";
import { extract_file_name, extract_file_type, is_url } from './utils';


export class UIOutputModel extends BaseWidgetModel {
    static model_name = 'UIOutputModel';
    static model_module = MODULE_NAME;
    static model_module_version = MODULE_VERSION;
    static view_name = 'UIOutputView';
    static view_module = MODULE_NAME;
    static view_module_version = MODULE_VERSION;

    static serializers: ISerializers = { ...BaseWidgetModel.serializers, };

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
}

export class UIOutputView extends BaseWidgetView {
    dom_class = 'nbtools-uioutput';
    traitlets = ['name', 'description', 'status', 'files', 'text', 'visualization'];
    renderers:any = {
        "files": this.render_files,
        "visualization": this.render_visualization
    };
    body:string = `
        <div class="nbtools-description" data-traitlet="description"></div>
        <div class="nbtools-status" data-traitlet="status"></div>
        <div class="nbtools-files" data-traitlet="files"></div>
        <pre class="nbtools-text" data-traitlet="text"></pre>
        <div class="nbtools-visualization" data-traitlet="visualization"></div>
        `;

    render_files(files:string[]) {
        let to_return = '';
        files.forEach(path => {
            const name = extract_file_name(path);
            const type = extract_file_type(path);
            to_return += `<a class="nbtools-file" href="${path}" data-type="${type}">${name}</a>`
        });
        return to_return;
    }

    render_visualization(visualization:string) {
        // If URL, display an iframe
        if (is_url(visualization)) return `<iframe class="nbtools-visualization-iframe" src="${visualization}"></iframe>`;

        // Otherwise, embed visualization as HTML
        else return visualization;
    }
}