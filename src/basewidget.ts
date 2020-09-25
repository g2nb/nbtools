import '../style/basewidget.css';
import { ContextManager } from "./context";
import { toggle } from "./utils";
import { DOMWidgetModel, DOMWidgetView, reject, WidgetView } from "@jupyter-widgets/base";
import { MODULE_NAME, MODULE_VERSION } from "./version";

export class BaseWidgetModel extends DOMWidgetModel {
    static model_name = 'BaseWidgetModel';
    static model_module = MODULE_NAME;
    static model_module_version = MODULE_VERSION;
    static view_name = 'BaseWidgetView';
    static view_module = MODULE_NAME;
    static view_module_version = MODULE_VERSION;

    defaults() {
        return {
            name: '',
            description: '',
            collapsed: false,
            color: 'var(--jp-layout-color4)',
            logo: 'https://notebook.genepattern.org/hub/logo', // FIXME: Find some way to host locally
            info: '',
            error: '',
            extra_menu_items: {}
        };
    }
}


export class BaseWidgetView extends DOMWidgetView {
    dom_class = '';
    element:HTMLElement = document.createElement('div');
    traitlets:string[] = ['name', 'description', 'info', 'error'];
    renderers:any = {
        "description": this.render_description,
        "error": this.render_error,
        "info": this.render_info
    };
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
    body:string = `<div class="nbtools-description" data-traitlet="description"></div>
                   <div class="nbtools-error" data-traitlet="error"></div>
                   <div class="nbtools-info" data-traitlet="info"></div>`;
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

        // Apply the color
        this.set_color();
        this.model.on('change:color', this.set_color, this);

        // Apply the logo
        this.set_logo();
        this.model.on('change:logo', this.set_logo, this);

        // Set the traitlet values
        this.traitlets.forEach(traitlet => this.traitlet_changed(traitlet));

        // Hook in the traitlet change events
        this.traitlets.forEach(traitlet => this.model.on(`change:${traitlet}`, this.traitlet_changed, this));

        // Hook in the expand / collapse events
        this.model.on('change:collapsed', this.toggle_collapse, this);
        if (this.model.get('collapsed')) this.toggle_collapse();

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

        // Attach collapse event
        const collapse = this.element.querySelector("button.nbtools-collapse") as HTMLButtonElement;
        collapse.addEventListener("click", () => {
            this.model.set('collapsed', !this.model.get('collapsed'));
            this.model.save_changes();
        });

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

    set_logo() {
        const logo = this.element.querySelector("img.nbtools-logo") as HTMLImageElement;
        logo.src = this.model.get('logo');
    }

    set_color() {
        const color = this.model.get('color').trim();
        this.element.style.borderColor = color;
        this.element.querySelectorAll('.nbtools-body button, .nbtools-header').forEach((e) => {
            (e as HTMLElement).style.backgroundColor = color;
        });
    }

    render_description(description:string, widget:BaseWidgetView) {
        return widget._render_or_hide('.nbtools-description', description, widget);
    }

    render_error(message:string, widget:BaseWidgetView) {
        return widget._render_or_hide('.nbtools-error', message, widget);
    }

    render_info(message:string, widget:BaseWidgetView) {
        return widget._render_or_hide('.nbtools-info', message, widget);
    }

    _render_or_hide(selector:string, message:string, widget:BaseWidgetView) {
        (widget.element.querySelector(selector) as HTMLElement).style.display = message.trim() ? 'block': 'none';
        return message;
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

        return item;
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
                this.el.closest('.lm-Widget.jp-OutputPrompt.jp-OutputArea-prompt'),
                this.el.closest('.lm-Widget.lm-Panel.jp-OutputArea'),
                this.el.closest('.lm-Widget.lm-Panel.jp-OutputArea-child'),
                this.el.closest('.lm-Widget.lm-Panel.jp-OutputArea-output'),
                this.el.closest('.lm-Widget.jp-OutputArea.jp-Cell-outputArea')
            ];

            elements.forEach((e:HTMLElement) => {
                if (e) e.style.overflow = 'visible';
            });
        };

        this.el.addEventListener('click', fix_cell, { once: true });
    }

    /**
     * Recursively trigger the 'displayed' event for all child widgets
     *
     * @param {DOMWidgetModel} model
     * @param {DOMWidgetView | any} view
     * @private
     */
    static _initialize_display(model:DOMWidgetModel, view:DOMWidgetView|any) {
        // Trigger the display for this widget
        view.trigger('displayed');

        // Recursively trigger the display for all child widgets
        if ('children_views' in view) {
            view.children_views.update(model.get('children')).then((children:DOMWidgetView[]) => {
                children.forEach((child) => {
                    BaseWidgetView._initialize_display(child.model, child);
                    child.el.widget = child;
                });
            });
        }
    }

    /**
     * Add the specified child widget to the view and initialize
     *
     * @param {string} element_selector
     * @param {string} model_name
     */
    attach_child_widget(element_selector:string, model_name:string) {
        const element = this.element.querySelector(element_selector) as HTMLElement;
        const model = this.model.get(model_name);

        this.create_child_view(model).then((view:any) => {
            element.appendChild(view.el);
            BaseWidgetView._initialize_display(model, view);
            return view;
        }).catch(reject(`Could not add ${model_name} to ${element_selector}`, true));
    }

    basics() { return this.traitlets; } // Return the list of basic traitlets

    post_render() {} // Empty function, can be overridden in subclasses
}