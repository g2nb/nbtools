/**
 * Widget for representing Python output as an interactive interface
 *
 * @author Thorin Tabor
 *
 * Copyright 2020 Regents of the University of California and the Broad Institute
 */
import '../style/uioutput.css'
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

    render_files(files:string[], widget:UIOutputView) {
        let to_return = '';
        files.forEach(path => {
            const name = extract_file_name(path);
            const type = extract_file_type(path) as string;
            to_return += `<a class="nbtools-file" href="${path}" data-type="${type}" onclick="return false;">${name} <i class="fa fa-info-circle"></i></a>`;
            to_return += `<ul class="nbtools-menu nbtools-file-menu" style="display: none;"></ul>`
        });

        setTimeout(() => widget.initialize_file_menus(widget), 100);
        return to_return;
    }

    render_visualization(visualization:string) {
        // If URL, display an iframe
        if (is_url(visualization)) return `<iframe class="nbtools-visualization-iframe" src="${visualization}"></iframe>`;

        // Otherwise, embed visualization as HTML
        else return visualization;
    }

    initialize_file_menus(widget:UIOutputView) {
        const files = widget.el.querySelectorAll('.nbtools-file');

        files.forEach((link:HTMLElement) => {
            link.addEventListener("click", function() {
                widget.toggle_file_menu(link);
            });
        });
    }

    initialize_menu_items(link:HTMLElement) {
        const menu = link.nextElementSibling as HTMLUListElement;
        if (!menu) return;  // Protect against null
        const type = link.getAttribute('data-type') as string;
        const href = link.getAttribute('href') as string;

        // Add the send to options
        this.get_input_list(type).forEach(input => {
            this.add_menu_item(input['name'], () => {
                const form_input = input['element'].querySelector('input') as HTMLFormElement;
                form_input.value = href;
                const widget = form_input.closest('.nbtools') as HTMLElement;
                widget.scrollIntoView();
            }, 'nbtools-menu-subitem', menu);
        });

        // Add send to header
        this.add_menu_item('Send to...', () => {},
            'nbtools-menu-header', menu);

        // Add download option
        this.add_menu_item('Open in New Tab', () => window.open(link.getAttribute('href') as string),
            '', menu);
    }

    toggle_file_menu(link:HTMLElement) {
        const menu = link.nextElementSibling as HTMLElement;
        const collapsed = menu.style.display === "none";

        // Build the menu lazily
        menu.innerHTML = ''; // Clear all existing children
        this.initialize_menu_items(link);

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

    get_input_list(type:string) {
        // Get the notebook's parent node
        const notebook = this.el.closest('.jp-Notebook') as HTMLElement;

        // Get all possible outputs
        const parameters = [...notebook.querySelectorAll('.nbtools-menu-attached') as any];

        // Build list of compatible inputs
        const compatible_inputs = [] as Array<any>;
        parameters.forEach((input:HTMLElement) => {
            // Ignore hidden parameters
            if (input.offsetWidth === 0 && input.offsetHeight === 0) return;

            // Ignore incompatible inputs
            const kinds = input.getAttribute('data-type') || '';
            const kinds_list = kinds.split(', ') as any;
            if (!kinds_list.includes(type) && kinds !== '') return;

            // Add the input to the compatible list
            const widget_element = input.closest('.nbtools') as HTMLElement;
            let name = (widget_element.querySelector('.nbtools-title') as HTMLElement).textContent;
            if (!name) name = "Untitled Widget";
            compatible_inputs.push({
                'name': name,
                'element': input
            });
        });

        return compatible_inputs;
    }
}