import './basewidget.css';
import { ContextManager } from "./context";
import { DOMWidgetModel, DOMWidgetView } from "@jupyter-widgets/base";

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

        // Set the element
        this.setElement(this.element);
    }

    add_menu_item(label:string, callback:any) {
        // Create the menu item
        const item = new DOMParser().parseFromString(`<li>${label}</li>`, "text/html")
            .querySelector('li') as HTMLElement;

        // Attach the menu item
        const menu = this.element.querySelector('.nbtools-menu') as HTMLUListElement;
        menu.prepend(item);

        // Attach the click event
        item.addEventListener('click', () => callback());
    }

    traitlet_changed(event:any) {
        const name = typeof event === "string" ? event : Object.keys(event.changed)[0];
        const elements = this.element.querySelectorAll(`[data-traitlet=${name}]`);
        elements.forEach(element => {
            if (name in this.renderers) element.innerHTML = this.renderers[name](this.model.get(name));
            else element.innerHTML = this.model.get(name)
        });
    }

    toggle_code(display?:boolean) {
        const element = this.element;
        ContextManager.context().toggle_code(element);
    }

    toggle_collapse() {
        const body = this.element.querySelector(".nbtools-body") as HTMLElement;
        const collapsed = body.style.display === "none";

        // Hide or show widget body
        if (collapsed) body.style.display = "block";
        else body.style.display = "none";

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
}