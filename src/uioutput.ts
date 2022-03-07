/**
 * Widget for representing Python output as an interactive interface
 *
 * @author Thorin Tabor
 *
 * Copyright 2020 Regents of the University of California and the Broad Institute
 */
import '../style/uioutput.css'
import { ISerializers, ManagerBase, unpack_models } from '@jupyter-widgets/base';
import { MODULE_NAME, MODULE_VERSION } from './version';
import { BaseWidgetModel, BaseWidgetView } from "./basewidget";
import { extract_file_name, extract_file_type, is_absolute_path, is_url } from './utils';
import { ContextManager } from "./context";
import { Data } from "./dataregistry";

// noinspection JSAnnotator
export class UIOutputModel extends BaseWidgetModel {
    static model_name = 'UIOutputModel';
    static model_module = MODULE_NAME;
    static model_module_version = MODULE_VERSION;
    static view_name = 'UIOutputView';
    static view_module = MODULE_NAME;
    static view_module_version = MODULE_VERSION;

    static serializers: ISerializers = {
        ...BaseWidgetModel.serializers,
        appendix: {
            deserialize: (value: any, manager: ManagerBase<any>|undefined) =>
                unpack_models(value, manager as ManagerBase<any>)
        }
    };

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
            visualization: '',
            appendix: undefined,
            extra_file_menu_items: {}
        };
    }
}

// noinspection JSAnnotator
export class UIOutputView extends BaseWidgetView {
    dom_class = 'nbtools-uioutput';
    traitlets = [...super.basics(), 'status', 'files', 'text', 'visualization'];
    renderers:any = {
        "description": this.render_description,
        "error": this.render_error,
        "info": this.render_info,
        "files": this.render_files,
        "visualization": this.render_visualization
    };
    body:string = `
        <div class="nbtools-description" data-traitlet="description"></div>
        <div class="nbtools-error" data-traitlet="error"></div>
        <div class="nbtools-info" data-traitlet="info"></div>
        <div class="nbtools-status" data-traitlet="status"></div>
        <div class="nbtools-files" data-traitlet="files"></div>
        <pre class="nbtools-text" data-traitlet="text"></pre>
        <div class="nbtools-visualization" data-traitlet="visualization"></div>
        <div class="nbtools-appendix"></div>`;
    file_cache:Data[] = [];

    render() {
        super.render();

        // Add the child widgets
        this.attach_child_widget('.nbtools-appendix', 'appendix');
    }

    remove() {
        super.remove();

        // Clean up data files from the cache
        for (let f of this.file_cache) ContextManager.data_registry.unregister({data: f});
    }

    sync_file_cache() {
        // Unregister old files associated with this widget
        for (let f of this.file_cache) ContextManager.data_registry.unregister({data: f});

        // Create the data objects and add them to the file cache
        this.file_cache = []
        const origin = this.model.get('origin');
        for (let f of this.model.get('files')) this.file_cache.push(new Data(origin, f));

        // Register the files currently associated with this widget
        for (let f of this.file_cache) ContextManager.data_registry.register({data: f});
    }

    render_files(files:string[], widget:UIOutputView) {
        // Sync the file cache with what is displayed
        widget.sync_file_cache();

        let to_return = '';
        files.forEach(path => {
            const name = extract_file_name(path);
            const type = extract_file_type(path) as string;
            const path_prefix = UIOutputView.pick_path_prefix(path);
            to_return += `<a class="nbtools-file" href="${path_prefix}${path}" data-type="${type}" onclick="return false;">${name} <i class="fa fa-info-circle"></i></a>`;
            to_return += `<ul class="nbtools-menu nbtools-file-menu" style="display: none;"></ul>`
        });

        setTimeout(() => widget.initialize_file_menus(widget), 100);
        return to_return;
    }

    render_visualization(visualization:string, widget:UIOutputView) {
        // Function for toggling pop out menu item on or off
        function toggle_open_visualizer(hide:boolean) {
            const controls = widget.element.querySelector('.nbtools-controls');
            if (!controls) return; // Get the gear menu buttons at the top and protect against null

            // Toggle or set the Pop Out Visualizer menu option's visibility
            controls.querySelectorAll('.nbtools-menu > li').forEach((item:any) => {
                if (item.textContent.includes('Pop Out Visualizer')) {
                    if (hide) item.style.display = 'none';
                    else item.style.display = 'block';
                }
            })
        }

        // Hide or show the open visualizer menu option, depending on whether there is a visualization
        if (!visualization.trim()) toggle_open_visualizer(true);
        else toggle_open_visualizer(false);

        // If URL, display an iframe
        if (is_url(visualization)) return `<iframe class="nbtools-visualization-iframe" src="${visualization}"></iframe>`;

        // Otherwise, embed visualization as HTML
        else return visualization;
    }

    traitlet_changed(event:any) {
        const widget = this;
        const name = typeof event === "string" ? event : Object.keys(event.changed)[0];
        const elements = this.element.querySelectorAll(`[data-traitlet=${name}]`);
        elements.forEach(element => {
            // Ignore traitlets in the appendix, unless this is a subwidget in the appendix
            if (!this.element.closest('.nbtools-appendix') && element.closest('.nbtools-appendix')) return;

            if (name in this.renderers) element.innerHTML = this.renderers[name](this.model.get(name), widget);
            else element.innerHTML = this.model.get(name)
        });
    }

    static pick_path_prefix(path:string) {
        if (is_url(path)) return '';                // is a URL
        else if (is_absolute_path(path)) return ''; // is an absolute
        else return 'files/' + ContextManager.context().notebook_path();  // is relative path
    }

    attach_menu_options() {
        // Attach the Open Visualizer gear option
        const visualizer_option = this.add_menu_item('Pop Out Visualizer', () => this.open_visualizer());
        visualizer_option.style.display = this.model.get('visualization').trim() ? 'block' : 'none';

        // Call the base widget's attach_menu_options()
        super.attach_menu_options();
    }

    open_visualizer() {
        window.open(this.model.get('visualization'));
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
        const file_name = link.textContent ? link.textContent.trim() as string : href;
        const widget_name = this.model.get('name');
        const origin = this.model.get('origin') || '';

        // Add the send to options
        this.get_input_list(type, origin).forEach(input => {
            this.add_menu_item(input['name'] + ' -> ' + input['param'], () => {
                const form_input = input['element'].querySelector('input') as HTMLFormElement;
                form_input.value = href;
                form_input.dispatchEvent(new Event('change', { bubbles: true} ));
                const widget = form_input.closest('.nbtools') as HTMLElement;
                widget.scrollIntoView();
            }, 'nbtools-menu-subitem', menu);
        });

        // Add send to header
        this.add_menu_item('Send to...', () => {},
            'nbtools-menu-header', menu);

        // Add the extra menu items
        const menu_items = this.model.get('extra_file_menu_items');
        const template_vars = {
            'widget_name': widget_name,
            'file_name': file_name,
            'href': href,
            'type': type
        };
        Object.keys(menu_items).forEach((name) => {
            const item = menu_items[name] as any;

            // Skip if this file doesn't match any type restrictions
            if (item['kinds'] && Array.isArray(item['kinds']) && !item['kinds'].includes(type)) return;

            // Create the callback and attach the menu item
            const callback = this.create_menu_callback(item, template_vars);
            this.add_menu_item(name,  callback, 'nbtools-menu-subitem', menu);
        });

        // Add download and new tab options
        this.add_menu_item('Download', () => window.open(link.getAttribute('href') + '?download=1'), '', menu);
        this.add_menu_item('Open in New Tab', () => window.open(link.getAttribute('href') as string), '', menu);
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

    get_input_list(type:string, origin:string) {
        // Get the notebook's parent node
        const notebook = this.el.closest('.jp-Notebook') as HTMLElement;

        // Get all possible outputs
        const parameters = [...notebook.querySelectorAll('.nbtools-menu-attached') as any];

        // Build list of compatible inputs
        const compatible_inputs = [] as Array<any>;
        parameters.forEach((input:HTMLElement) => {
            // Ignore hidden parameters
            if (input.offsetWidth === 0 && input.offsetHeight === 0) return;

            // Ignore parameters with sendto=False
            if (input.classList.contains('nbtools-nosendto')) return;

            // Ignore if this origin does not match the supported origins
            const origins_str = input.getAttribute('data-origins') || '';
            const origins_list = origins_str.split(', ') as any;
            if (!origins_list.includes(origin) && origins_str !== '') return;

            // Ignore incompatible inputs
            const kinds = input.getAttribute('data-type') || '';
            const param_name = input.getAttribute('data-name') || '';
            const kinds_list = kinds.split(', ') as any;
            if (!kinds_list.includes(type) && kinds !== '') return;

            // Add the input to the compatible list
            const widget_element = input.closest('.nbtools') as HTMLElement;
            let name = (widget_element.querySelector('.nbtools-title') as HTMLElement).textContent;
            if (!name) name = "Untitled Widget";
            compatible_inputs.push({
                'name': name,
                'param': param_name,
                'element': input
            });
        });

        return compatible_inputs;
    }
}