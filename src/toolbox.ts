// import { ISignal, Signal } from '@lumino/signaling';
import { PanelLayout, Widget } from '@phosphor/widgets';
import { toggle } from "./utils";

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

        // FIXME: This is test code
        const origin = this.add_origin('GenePattern Cloud');
        this.add_tool(origin, 'Example Tool A', 'An example tool');
        this.add_tool(origin, 'Example Tool B', 'An example tool');
        this.add_tool(origin, 'Example Tool C', 'An example tool');
        const origin2 = this.add_origin('Notebook');
        this.add_tool(origin2, 'Example Tool A', 'An example tool');
        this.add_tool(origin2, 'Example Tool B', 'An example tool');
        this.add_tool(origin2, 'Example Tool C', 'An example tool');
        const origin3 = this.add_origin('+');
        this.add_tool(origin3, 'Example Tool A', 'An example tool');
        this.add_tool(origin3, 'Example Tool B', 'An example tool');
        this.add_tool(origin3, 'Example Tool C', 'An example tool');
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

    toggle_collapse(origin_wrapper:HTMLElement) {
        const list = origin_wrapper.querySelector("ul.nbtools-origin") as HTMLElement;
        const collapsed = list.classList.contains('nbtools-hidden');

        // Toggle the collapse button
        const collapse = origin_wrapper.querySelector('span.nbtools-collapse') as HTMLElement;
        if (collapsed) {
            console.log('is collapsed');
            collapse.classList.add('nbtools-expanded');
            collapse.classList.remove('nbtools-collapsed');
        }
        else {
            console.log('is expanded');
            collapse.classList.remove('nbtools-expanded');
            collapse.classList.add('nbtools-collapsed');
        }

        // Hide or show widget body
        toggle(list);
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