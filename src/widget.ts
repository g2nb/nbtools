/**
 * Widget for representing Python output as an interactive interface
 *
 * @author Thorin Tabor
 *
 * Copyright 2019 Regents of the University of California and the Broad Institute
 */

import './style.css'
import { DOMWidgetModel, DOMWidgetView, ISerializers } from '@jupyter-widgets/base';
import { MODULE_NAME, MODULE_VERSION } from './version';
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

export class UIOutputView extends DOMWidgetView {
    element:HTMLElement = document.createElement('div');
    traitlets = ['name', 'description', 'status', 'files', 'text', 'visualization'];
    renderers:any = {
        "files": this.render_files,
        "visualization": this.render_visualization
    };

    render() {
        // Build the widget
        this.build();

        // Set the traitlet values
        this.traitlets.forEach(traitlet => this.traitlet_changed(traitlet));

        // Hook in the traitlet change events
        this.traitlets.forEach(traitlet => this.model.on(`change:${traitlet}`, this.traitlet_changed, this));

        // Hide the code
        this.toggle_code(false);
    }

    build() {
        // Create and parse the template
        const template = `
            <div class="nbtools-widget nbtools-output">
                <div class="nbtools-widget-header">
                    <img class="nbtools-widget-logo" src="" />
                    <label class="nbtools-widget-title nbtools-traitlet" data-traitlet="name"></label>
                    <div class="nbtools-widget-controls">
                        <button class="nbtools-widget-collapse">
                            <span class="fa fa-minus"></span>
                        </button>
                        <button class="nbtools-widget-gear">
                            <span class="fa fa-cog"></span>
                            <span class="fa fa-caret-down"></span>
                        </button>
                        <ul class="nbtools-widget-menu" style="display: none;">
                            <li class="nbtools-widget-toggle-code">Toggle Code View</li>
                        </ul>
                    </div>
                </div>
                <div class="nbtools-widget-body">
                    <div class="nbtools-widget-description nbtools-traitlet" data-traitlet="description"></div>
                    <div class="nbtools-widget-status nbtools-traitlet" data-traitlet="status"></div>
                    <div class="nbtools-widget-files nbtools-traitlet" data-traitlet="files"></div>
                    <pre class="nbtools-widget-text nbtools-traitlet" data-traitlet="text"></pre>
                    <div class="nbtools-widget-visualization nbtools-traitlet" data-traitlet="visualization"></div>
                </div>
            </div>
        `;
        this.element = new DOMParser().parseFromString(template, "text/html")
            .querySelector('div.nbtools-widget') as HTMLElement;

        // Set the logo
        const logo = this.element.querySelector("img.nbtools-widget-logo") as HTMLImageElement;
        logo.src = "https://notebook.genepattern.org/hub/logo"; // FIXME: NBToolManager.options.logo;

        // Attach collapse event
        const collapse = this.element.querySelector("button.nbtools-widget-collapse") as HTMLButtonElement;
        collapse.addEventListener("click", () => this.toggle_collapse());

        // Attach the gear event
        const gear = this.element.querySelector("button.nbtools-widget-gear") as HTMLButtonElement;
        gear.addEventListener("click", () => this.toggle_menu());

        // Attach toggle code event
        const toggle_code = this.element.querySelector("li.nbtools-widget-toggle-code") as HTMLLIElement;
        toggle_code.addEventListener("click", () => this.toggle_code());

        // Set the element
        this.setElement(this.element);
    }

    render_files(files:string[]) {
        let to_return = '';
        files.forEach(path => {
            const name = extract_file_name(path);
            const type = extract_file_type(path);
            to_return += `<a class="nbtools-widget-file" href="${path}" data-type="${type}">${name}</a>`
        });
        return to_return;
    }

    render_visualization(visualization:string) {
        // If URL, display an iframe
        if (is_url(visualization)) return `<iframe class="nbtools-widget-visualization-iframe" src="${visualization}"></iframe>`;

        // Otherwise, embed visualization as HTML
        else return visualization;
    }

    traitlet_changed(event:any) {
        const name = typeof event === "string" ? event : Object.keys(event.changed)[0];
        const elements = this.element.querySelectorAll(`.nbtools-traitlet[data-traitlet=${name}]`);
        elements.forEach(element => {
            if (name in this.renderers) element.innerHTML = this.renderers[name](this.model.get(name));
            else element.innerHTML = this.model.get(name)
        });
    }

    toggle_code(display?:boolean) {
        const element = this.element;

        // TODO: Implement better event handling for this
        setTimeout(() => {
            let input_block = element.closest('.jp-Cell') as HTMLElement;
            if (input_block) input_block = input_block.querySelector('.jp-Cell-inputWrapper') as HTMLElement;

            // Set display to toggle if not specified
            if (display === undefined) display = input_block.style.display === "none";

            if (input_block) input_block.style.display = display ? "block" : "none";
        }, 100);
    }

    toggle_collapse() {
        const body = this.element.querySelector(".nbtools-widget-body") as HTMLElement;
        const collapsed = body.style.display === "none";

        // Hide or show widget body
        if (collapsed) body.style.display = "block";
        else body.style.display = "none";

        // Toggle the collapse button
        const button = this.element.querySelector(".nbtools-widget-collapse > span") as HTMLElement;
        if (collapsed) {
            button.classList.add('fa-minus');
            button.classList.remove('fa-plus');
        }
        else {
            button.classList.remove('fa-minus');
            button.classList.add('fa-plus');
        }
    }

    toggle_menu() {
        const gear = this.element.querySelector("button.nbtools-widget-gear") as HTMLButtonElement;
        const menu = this.element.querySelector(".nbtools-widget-menu") as HTMLElement;
        const collapsed = menu.style.display === "none";

        // Hide or show the menu
        if (collapsed) menu.style.display = "block";
        else menu.style.display = "none";

        // Hide the menu with the next click
        const hide_next_click = function(event:Event) {
            if (gear.contains(event.target as Node)) return;
            menu.style.display = "none";
            document.removeEventListener('click', hide_next_click);
        };
        document.addEventListener('click', hide_next_click)

    }
}
