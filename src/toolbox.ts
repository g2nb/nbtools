import { PanelLayout, Widget } from '@phosphor/widgets';
import { toggle } from "./utils";
import { ContextManager } from "./context";

export class ToolBrowser extends Widget {
    constructor() {
        super();
        this.addClass('nbtools-browser');
        this.layout = new PanelLayout();

        (this.layout as PanelLayout).addWidget(new SearchBox());
        (this.layout as PanelLayout).addWidget(new Toolbox());
    }
}

export class Toolbox extends Widget {
    constructor() {
        super();
        this.addClass('nbtools-toolbox');
        this.addClass('nbtools-wrapper');

        // Update the toolbox when the tool registry changes
        ContextManager.tool_registry.on_update(() => {
            this.fill_toolbox();
        });

        // Fill the toolbox with the registered tools
        this.fill_toolbox();
    }

    fill_toolbox() {
        // First empty the toolbox
        this.empty_toolbox();

        // Get the list of tools
        const tools = ContextManager.tool_registry.list();

        // Organize by origin and sort
        const organized_tools = this.organize_tools(tools);
        const origins = Object.keys(organized_tools);
        origins.sort((a:any, b:any) => {
            const a_name = a.toLowerCase();
            const b_name = b.toLowerCase();
            return (a_name < b_name) ? -1 : (a_name > b_name) ? 1 : 0;
        });

        // Add each origin
        origins.forEach((origin) => {
            const origin_box = this.add_origin(origin);
            organized_tools[origin].forEach((tool:any) => {
                this.add_tool(origin_box, tool.name, tool.description);
            })
        });
    }

    organize_tools(tool_list:Array<any>):any {
        const organized:any = {};

        // Group tools by origin
        tool_list.forEach((tool) => {
            if (tool.origin in organized) organized[tool.origin].push(tool);    // Add tool to origin
            else organized[tool.origin] = [tool];                               // Lazily create origin
        });

        // Sort the tools in each origin
        Object.keys(organized).forEach((origin) => {
            organized[origin].sort((a:any, b:any) => {
                const a_name = a.name.toLowerCase();
                const b_name = b.name.toLowerCase();
                return (a_name < b_name) ? -1 : (a_name > b_name) ? 1 : 0;
            });
        });

        // Return the organized set of notebooks
        return organized
    }

    empty_toolbox() {
        this.node.innerHTML = '';
    }

    add_origin(name:string) {
        // Create the HTML DOM element
        const origin_wrapper = document.createElement('div');
        origin_wrapper.innerHTML = `
            <header class="nbtools-origin" title="${name}">
                <span class="nbtools-expanded nbtools-collapse jp-Icon jp-Icon-16 jp-ToolbarButtonComponent-icon"></span>
                ${name}
            </header>
            <ul class="nbtools-origin" title="${name}"></ul>`;

        // Attach the expand / collapse functionality
        const collapse = origin_wrapper.querySelector('span.nbtools-collapse') as HTMLElement;
        collapse.addEventListener("click", () => this.toggle_collapse(origin_wrapper));

        // Add to the toolbox
        this.node.append(origin_wrapper);
        return origin_wrapper;
    }

    add_tool(origin:HTMLElement, name:string, description:string) {
        const list = origin.querySelector('ul');
        const tool_wrapper = document.createElement('li');
        tool_wrapper.classList.add('nbtools-tool');
        tool_wrapper.innerHTML = `
            <div class="nbtools-header">${name}</div>
            <div class="nbtools-description">${description}</div>`;
        if (list) list.append(tool_wrapper);
    }

    toggle_collapse(origin_wrapper:HTMLElement) {
        const list = origin_wrapper.querySelector("ul.nbtools-origin") as HTMLElement;
        const collapsed = list.classList.contains('nbtools-hidden');

        // Toggle the collapse button
        const collapse = origin_wrapper.querySelector('span.nbtools-collapse') as HTMLElement;
        if (collapsed) {
            collapse.classList.add('nbtools-expanded');
            collapse.classList.remove('nbtools-collapsed');
        }
        else {
            collapse.classList.remove('nbtools-expanded');
            collapse.classList.add('nbtools-collapsed');
        }

        // Hide or show widget body
        toggle(list);
    }
}

export class SearchBox extends Widget {
    value:string;

    constructor() {
        super();
        this.value = '';
        this.node.innerHTML = `
            <div class="nbtools-wrapper">
                <div class="nbtools-outline">
                    <input type="search" class="nbtools-search" spellcheck="false" placeholder="SEARCH" />
                </div>
            </div>
        `;

        this.attach_events();
    }

    attach_events() {
        // Attach the change event to the search box
        const search_box = this.node.querySelector('input.nbtools-search') as HTMLInputElement;
        search_box.addEventListener("keyup", () => this.filter(search_box));
    }

    filter(search_box:HTMLInputElement) {
        // Update the value state
        this.value = search_box.value;

        // Get the toolbox
        const toolbox = document.querySelector('#nbtools-browser > .nbtools-toolbox') as HTMLElement;

        // Show any tool that matches and hide anything else
        toolbox.querySelectorAll('li.nbtools-tool').forEach((tool:any) => {
            if (tool.textContent.toLowerCase().includes(this.value.toLowerCase())) tool.style.display = 'block';
            else tool.style.display = 'none';
        });
    }
}