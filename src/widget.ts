import './style.css'
import { DOMWidgetView } from '@jupyter-widgets/base';


export class BaseWidgetView extends DOMWidgetView {
    element:HTMLElement = document.createElement('div');
    traitlets:string[] = [];
    renderers:any = {};
    template:string = `<div class="nbtools-widget"></div>`;

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
        // Parse the template
        this.element = new DOMParser().parseFromString(this.template, "text/html")
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