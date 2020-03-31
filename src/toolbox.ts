// import { FileBrowser } from '@jupyterlab/filebrowser';
// import { ISignal, Signal } from '@lumino/signaling';
import { PanelLayout, TabBar, Title, Widget } from '@phosphor/widgets';

export class ToolBrowser extends Widget {
    constructor() {
        super();
        this.addClass('nbtools-browser');
        this.layout = new PanelLayout();

        (this.layout as PanelLayout).addWidget(new SearchBox());
        // (this.layout as PanelLayout).addWidget(new OriginTabs());
        (this.layout as PanelLayout).addWidget(new Toolbox());
    }
}

export class Toolbox extends Widget {
    constructor() {
        super();
        this.addClass('nbtools-toolbox');
        this.addClass('nbtools-wrapper');

        // FIXME: This is test code
        const origin = this.add_origin('GenePattern');
        this.add_tool(origin, 'Example Tool A', 'An example tool');
        this.add_tool(origin, 'Example Tool B', 'An example tool');
        this.add_tool(origin, 'Example Tool C', 'An example tool');
    }

    add_origin(name:string) {
        const origin_wrapper = document.createElement('div');
        origin_wrapper.innerHTML = `
            <header class="nbtools-origin" title="${name}">
                <span class="nbtools-expanded jp-Icon jp-Icon-16 jp-ToolbarButtonComponent-icon"></span>
                ${name}
            </header>
            <ul class="nbtools-origin" title="${name}"></ul>`;
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
}

export class OriginTabs extends Widget {
    _tabs:TabBar<Widget>;

    constructor() {
        super();
        this._tabs = new TabBar<Widget>({ orientation: 'horizontal' });
        this._tabs.id = 'nbtools-tabs';
        this._tabs.title.caption = 'Tool Origins';

        // FIXME: This is test code
        this.add_tab('All Tools');
        this.add_tab('GenePattern');
        this.add_tab('Notebook');
        this.add_tab('+');

        this.node.appendChild(this._tabs.node);
    }

    add_tab(label:string) {
        const tab_title = new Title(<Title.IOptions<any>>{
            label: label,
            caption: label
        });
        this._tabs.addTab(tab_title);
    }
}

export class SearchBox extends Widget {
    _value:string;
    _template:string;

    constructor() {
        super();
        this._value = '';
        this._template = `
            <div class="nbtools-wrapper">
                <div class="nbtools-outline">
                    <input type="search" class="nbtools-search" spellcheck="false" placeholder="SEARCH" />
                </div>
            </div>
        `;

        this.node.innerHTML = this._template;
    }
}