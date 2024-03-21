import { PanelLayout, Widget } from '@lumino/widgets';
import { escape_quotes, toggle } from "./utils";
import { ContextManager } from "./context";
import { SearchBox, Toolbox } from "./toolbox";

export class DataBrowser extends Widget {
    public search:SearchBox|null = null;
    public databank:Databank|null = null;

    constructor() {
        super();
        this.addClass('nbtools-data-browser');
        this.layout = new PanelLayout();
        this.search = new SearchBox('#nbtools-data-browser > .nbtools-databank');
        this.databank = new Databank(this.search);

        (this.layout as PanelLayout).addWidget(this.search);
        (this.layout as PanelLayout).addWidget(this.databank);
    }
}

export class Databank extends Widget {
    last_update = 0;
    update_waiting = false;
    search:SearchBox;

    constructor(associated_search:SearchBox) {
        super();
        this.search = associated_search;
        this.addClass('nbtools-databank');
        this.addClass('nbtools-wrapper');

        // Update the databank when the data registry changes
        ContextManager.data_registry.on_update(() => {
            // If the last update was more than 3 seconds ago, update the databank
            if (this.update_stale()) this.fill_databank();
            else this.queue_update();  // Otherwise, queue an update if not already waiting for one
        });

        // Fill the databank with the registered data
        this.fill_databank();
    }

    update_stale() {
        return this.last_update + (3 * 1000) < Date.now();
    }

    queue_update() {
        // If no update is waiting, queue an update
        if (!this.update_waiting) {
            setTimeout(() => {           // When an update happens
                this.fill_databank();           // Fill the databank
                this.update_waiting = false;    // And mark as no update queued
            }, Math.abs(this.last_update + (3 * 1000) - Date.now()));  // Queue for 3 seconds since last update
            this.update_waiting = true;                                   // And mark as queued
        }
    }

    fill_databank() {
        this.last_update = Date.now();

        // First empty the databank
        this.empty_databank();

        // Get the list of data
        const data = ContextManager.data_registry.list();

        // Organize by origin and sort
        const origins = Object.keys(data);
        origins.sort((a:any, b:any) => {
            const a_name = a.toLowerCase();
            const b_name = b.toLowerCase();
            return (a_name < b_name) ? -1 : (a_name > b_name) ? 1 : 0;
        });

        // Add each origin
        origins.forEach((origin) => {
            const origin_box = this.add_origin(origin);
            const groups = this.origin_groups(data[origin]);
            Object.keys(groups).reverse().forEach((key) => {
                this.add_group(origin_box, key, groups[key].reverse());
            })
        });

        // Apply search filter after refresh
        this.search.filter(this.search.node.querySelector('input.nbtools-search') as HTMLInputElement);
    }

    origin_groups(origin: any) {
        const organized:any = {};

        // Organize data by group
        Object.keys(origin).forEach((uri) => {
            const data = origin[uri][0];
            if (data.group in organized) organized[data.group].push(data);    // Add data to group
            else organized[data.group] = [data];                              // Lazily create group
        });

        // Return the organized set of groups
        return organized
    }

    empty_databank() {
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

        // Add to the databank
        this.node.append(origin_wrapper);
        return origin_wrapper;
    }

    add_group(origin:HTMLElement, group_name:String, group_data:any) {
        const list = origin.querySelector('ul');
        if (!list) return;

        const group_wrapper = document.createElement('li');
        group_wrapper.classList.add('nbtools-tool');
        group_wrapper.setAttribute('title', 'Click to add to notebook');
        group_wrapper.innerHTML = `
            <div class="nbtools-add">+</div>
            <div class="nbtools-header nbtools-group">
                <span class="nbtools-expanded nbtools-collapse jp-Icon jp-Icon-16 jp-ToolbarButtonComponent-icon"></span>
                ${group_name}
            </div>
            <ul class="nbtools-group"></ul>`;
        for (const data of group_data) this.add_data(group_wrapper, data);

        // Attach the expand / collapse functionality
        const collapse = group_wrapper.querySelector('span.nbtools-collapse') as HTMLElement;
        collapse.addEventListener("click", (event) => {
            this.toggle_collapse(group_wrapper);
            event.stopPropagation();
            return false;
        });
        list.append(group_wrapper);

        // Add the click event
        group_wrapper.addEventListener("click", () => {
            Databank.add_group_cell(list.getAttribute('title'), group_name, group_data);
        });
    }

    add_data(origin:HTMLElement, data:any) {
        const group_wrapper = origin.querySelector('ul.nbtools-group');
        if (!group_wrapper) return;
        const data_wrapper = document.createElement('a');
        data_wrapper.setAttribute('href', data.uri);
        data_wrapper.setAttribute('title', 'Drag to add parameter or cell');
        data_wrapper.classList.add('nbtools-data');
        data_wrapper.innerHTML = `<i class="${data.icon ? data.icon : 'far fa-bookmark'}"></i> ${data.label}`;
        group_wrapper.append(data_wrapper);

        // Add the click event
        data_wrapper.addEventListener("click", event => {
            if (data.widget) Databank.add_data_cell(data.origin, data.uri);
            event.preventDefault();
            event.stopPropagation();
            return false;
        });

        // Add the drag event
        data_wrapper.addEventListener("dragstart", event => {
            event.dataTransfer.setData("text/plain", data.uri);
        })
    }

    static add_data_cell(origin:String, data_uri:String) {
        // Check to see if nbtools needs to be imported
        const import_line = ContextManager.tool_registry.needs_import() ? 'import nbtools\n\n' : '';

        // Add and run a code cell with the generated tool code
        Toolbox.add_code_cell(import_line + `nbtools.data(origin='${escape_quotes(origin)}', uri='${escape_quotes(data_uri)}')`);
    }

    static add_group_cell(origin:String, group_name:String, group_data:any) {
        // Check to see if nbtools needs to be imported
        const import_line = ContextManager.tool_registry.needs_import() ? 'import nbtools\n\n' : '';

        // Add and run a code cell with the generated tool code
        const files = group_data.map((d:any) => `'${d.uri}'`).join(", ");
        Toolbox.add_code_cell(import_line + `nbtools.data(origin='${escape_quotes(origin)}', group='${escape_quotes(group_name)}', uris=[${files}])`);
    }

    // TODO: Move to utils.ts and refactor so both this and toolbox.ts calls the function?
    toggle_collapse(origin_wrapper:HTMLElement) {
        const list = origin_wrapper.querySelector("ul.nbtools-origin, ul.nbtools-group") as HTMLElement;
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
