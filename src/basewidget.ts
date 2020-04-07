import '../style/basewidget.css';
import { ContextManager } from "./context";
import { toggle } from "./utils";
import { DOMWidgetModel, DOMWidgetView, WidgetView } from "@jupyter-widgets/base";

export class BaseWidgetModel extends DOMWidgetModel {
    // Placeholder in the inheritance tree, in case it is needed later
}


export class BaseWidgetView extends DOMWidgetView {
    dom_class = '';
    element:HTMLElement = document.createElement('div');
    traitlets:string[] = [];
    renderers:any = {};
    template:string = `<div class="nbtools">
                           <div class="nbtools-header"></div>
                           <div class="nbtools-body"></div>
                       </div>`;
    header:string = `<img class="nbtools-logo" src="" />
                     <label class="nbtools-title" data-traitlet="name"></label>
                     <div class="nbtools-controls">
                         <button class="nbtools-collapse">
                             <span class="fa fa-minus"></span>
                         </button>
                         <button class="nbtools-gear">
                             <span class="fa fa-cog"></span>
                             <span class="fa fa-caret-down"></span>
                         </button>
                         <ul class="nbtools-menu" style="display: none;"></ul>
                     </div>`;
    body:string = ``;
    disconnected:string = `<div class="nbtools-disconnected">
                               <div class="nbtools-panel">
                                   <div class="nbtools-header">Widget Disconnected From Kernel</div>
                                   <div class="nbtools-body">
                                       <p>You need to run this cell before it can connect to the notebook kernel. Please click the Connect to Kernel button below.</p>
                                       <div class="nbtools-connect"><button class="nbtools-connect">Connect to Kernel</button></div>
                                   </div>
                               </div>
                           </div>`;

    render() {
        super.render();

        // Build the widget
        this.build();

        // Set the traitlet values
        this.traitlets.forEach(traitlet => this.traitlet_changed(traitlet));

        // Hook in the traitlet change events
        this.traitlets.forEach(traitlet => this.model.on(`change:${traitlet}`, this.traitlet_changed, this));

        // Hide the code
        this.toggle_code(false);

        // Allow menus to overflow the container
        this.float_menus();

        // Initialize the widget
        this.initialize(<WidgetView.InitializeParameters>{ options: {} });

        // Call any post render events
        this.post_render();
    }

    build() {
        // Parse the template
        this.element = new DOMParser().parseFromString(this.template, "text/html")
            .querySelector('div.nbtools') as HTMLElement;

        // Apply the DOM class
        if (this.dom_class) this.element.classList.add(this.dom_class);

        // Apply the header
        (this.element.querySelector('div.nbtools-header') as HTMLElement).innerHTML = this.header;

        // Set the logo
        const logo = this.element.querySelector("img.nbtools-logo") as HTMLImageElement;
        logo.src = "https://notebook.genepattern.org/hub/logo"; // FIXME: NBToolManager.options.logo;

        // Attach collapse event
        const collapse = this.element.querySelector("button.nbtools-collapse") as HTMLButtonElement;
        collapse.addEventListener("click", () => this.toggle_collapse());

        // Attach the gear event
        const gear = this.element.querySelector("button.nbtools-gear") as HTMLButtonElement;
        gear.addEventListener("click", () => this.toggle_menu());

        // Attach toggle code event
        this.add_menu_item('Toggle Code View', () => this.toggle_code());

        // Apply the body
        (this.element.querySelector('div.nbtools-body') as HTMLElement).innerHTML = this.body;

        // Attach the disconnected cover
        this.element.appendChild(new DOMParser().parseFromString(this.disconnected, "text/html")
            .querySelector('body > :first-child') as HTMLElement);
        this.attach_connect_event();

        // Set the element
        this.setElement(this.element);
    }

    attach_connect_event() {
        const button = this.element.querySelector('button.nbtools-connect') as HTMLElement;
        button.addEventListener("click", () => {
            // Run all cells with disconnected nbtools widgets
            // ContextManager.context().run_cell();
            ContextManager.context().run_tool_cells();
        });
    }

    add_menu_item(label:string, callback:any, dom_class:string|null=null, menu:HTMLUListElement|null=null, prepend:boolean=true) {
        // Create the menu item
        const item = new DOMParser().parseFromString(`<li>${label}</li>`, "text/html")
            .querySelector('li') as HTMLElement;

        // Apply the class if one is specified
        if (dom_class) item.classList.add(dom_class);

        // Attach the menu item
        if (!menu) menu = this.element.querySelector('.nbtools-menu') as HTMLUListElement;
        if (prepend) menu.prepend(item);
        else menu.append(item);

        // Attach the click event
        item.addEventListener('click', () => callback());
    }

    traitlet_changed(event:any) {
        const widget = this;
        const name = typeof event === "string" ? event : Object.keys(event.changed)[0];
        const elements = this.element.querySelectorAll(`[data-traitlet=${name}]`);
        elements.forEach(element => {
            if (name in this.renderers) element.innerHTML = this.renderers[name](this.model.get(name), widget);
            else element.innerHTML = this.model.get(name)
        });
    }

    toggle_code(display?:boolean) {
        const element = this.element;
        ContextManager.context().toggle_code(element, display);
    }

    toggle_collapse() {
        const body = this.element.querySelector(".nbtools-body") as HTMLElement;
        const collapsed = body.style.display === "none";

        // Hide or show widget body
        toggle(body);

        // Toggle the collapse button
        const button = this.element.querySelector(".nbtools-collapse > span") as HTMLElement;
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
        const gear = this.element.querySelector("button.nbtools-gear") as HTMLButtonElement;
        const menu = this.element.querySelector(".nbtools-menu") as HTMLElement;
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

    float_menus() {
        const fix_cell = () => {
            const elements = [
                this.el.closest('.p-Widget.jp-OutputPrompt.jp-OutputArea-prompt'),
                this.el.closest('.p-Widget.p-Panel.jp-OutputArea-child'),
                this.el.closest('.p-Widget.jp-OutputArea.jp-Cell-outputArea')
            ];

            elements.forEach((e:HTMLElement) => {
                if (e) e.style.overflow = 'visible';
            });
        };

        this.el.addEventListener('click', fix_cell, { once: true });
    }

    post_render() {} // Empty function, can be overridden in subclasses
}