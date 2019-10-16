/**
 * Widget for representing Python output as an interactive interface
 *
 * @author Thorin Tabor
 *
 * Copyright 2019 Regents of the University of California and the Broad Institute
 */
import './uioutput.css'
import { DOMWidgetModel, ISerializers } from '@jupyter-widgets/base';
import { MODULE_NAME, MODULE_VERSION } from './version';
import { BaseWidgetView } from "./basewidget";
import { extract_file_name, extract_file_type, is_url } from './utils';


export class UIOutputModel extends DOMWidgetModel {
    static model_name = 'UIOutputModel';
    static model_module = MODULE_NAME;
    static model_module_version = MODULE_VERSION;
    static view_name = 'UIOutputView';
    static view_module = MODULE_NAME;
    static view_module_version = MODULE_VERSION;

    static serializers: ISerializers = { ...DOMWidgetModel.serializers, };

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
    element:HTMLElement = document.createElement('div');
    traitlets = ['name', 'description', 'status', 'files', 'text', 'visualization'];
    renderers:any = {
        "files": this.render_files,
        "visualization": this.render_visualization
    };
    template:string = `
            <div class="nbtools nbtools-output">
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
                    <div class="nbtools-status nbtools-traitlet" data-traitlet="status"></div>
                    <div class="nbtools-files nbtools-traitlet" data-traitlet="files"></div>
                    <pre class="nbtools-text nbtools-traitlet" data-traitlet="text"></pre>
                    <div class="nbtools-visualization nbtools-traitlet" data-traitlet="visualization"></div>
                </div>
            </div>
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