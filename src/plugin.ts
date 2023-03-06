import { Application, IPlugin } from '@lumino/application';
import { Widget } from '@lumino/widgets';
import { IJupyterWidgetRegistry } from '@jupyter-widgets/base';
import { MODULE_NAME, MODULE_VERSION } from './version';
import * as base_exports from './basewidget';
import * as uioutput_exports from './uioutput';
import * as uibuilder_exports from './uibuilder';
import { IMainMenu } from '@jupyterlab/mainmenu';
import { ToolBrowser, Toolbox } from "./toolbox";
import { IToolRegistry, ToolRegistry } from "./registry";
import { pulse_red, usage_tracker } from "./utils";
import { ILabShell, ILayoutRestorer, JupyterFrontEnd } from "@jupyterlab/application";
import { INotebookTracker } from '@jupyterlab/notebook';
import { ContextManager } from "./context";
import { DataRegistry, IDataRegistry } from "./dataregistry";

const module_exports = { ...base_exports, ...uioutput_exports, ...uibuilder_exports };
const EXTENSION_ID = '@g2nb/nbtools:plugin';
const NAMESPACE = 'nbtools';


/**
 * The nbtools plugin.
 */
const nbtools_plugin: IPlugin<Application<Widget>, [IToolRegistry, IDataRegistry]> = ({
    id: EXTENSION_ID,
    provides: [IToolRegistry, IDataRegistry],
    requires: [IJupyterWidgetRegistry],
    optional: [IMainMenu, ILayoutRestorer, ILabShell, INotebookTracker],
    activate: activate_widget_extension,
    autoStart: true
} as unknown) as IPlugin<Application<Widget>, [IToolRegistry, IDataRegistry]>;

export default nbtools_plugin;


/**
 * Activate the widget extension.
 */
function activate_widget_extension(app: Application<Widget>,
                                   widget_registry: IJupyterWidgetRegistry,
                                   mainmenu: IMainMenu|null,
                                   restorer: ILayoutRestorer|null,
                                   shell: ILabShell|null,
                                   notebook_tracker: INotebookTracker|null): [IToolRegistry, IDataRegistry] {

    // Initialize the ContextManager
    init_context(app as JupyterFrontEnd, notebook_tracker);

    // Create the tool and data registries
    const tool_registry = new ToolRegistry();
    const data_registry = new DataRegistry();

    // Add items to the help menu
    add_help_links(app as JupyterFrontEnd, mainmenu);

    // Add keyboard shortcuts
    add_keyboard_shortcuts(app as JupyterFrontEnd, tool_registry);

    // Add the toolbox
    add_tool_browser(app as JupyterFrontEnd, restorer);

    // Register the nbtools widgets with the widget registry
    widget_registry.registerWidget({
        name: MODULE_NAME,
        version: MODULE_VERSION,
        exports: module_exports,
    });

    // Register the plugin as loaded
    usage_tracker('labextension_load', location.protocol + '//' + location.host + location.pathname);

    // Return the tool registry so that it is provided to other extensions
    return [tool_registry, data_registry];
}

function init_context(app:JupyterFrontEnd, notebook_tracker: INotebookTracker|null) {
    ContextManager.jupyter_app = app;
    ContextManager.notebook_tracker = notebook_tracker;
    ContextManager.context();
    (window as any).ContextManager = ContextManager;  // Left in for development purposes
}

function add_keyboard_shortcuts(app:JupyterFrontEnd, tool_registry:ToolRegistry) {
    app.commands.addCommand("nbtools:insert-tool", {
        label: 'Insert Notebook Tool',
        execute: () => {
            // Open the tool manager, if necessary
            app.shell.activateById('nbtools-browser');
            pulse_red(document.getElementById('nbtools-browser'));

            // If only one tool is available, add it
            const tools = tool_registry.list();
            if (tools.length === 1) Toolbox.add_tool_cell(tools[0]);

            // Otherwise give the search box focus
            else (document.querySelector('.nbtools-search') as HTMLElement).focus()
        },
    });
}

function add_tool_browser(app:JupyterFrontEnd, restorer:ILayoutRestorer|null) {
    const tool_browser = new ToolBrowser();
    tool_browser.title.iconClass = 'nbtools-icon fa fa-th jp-SideBar-tabIcon';
    tool_browser.title.caption = 'Toolbox';
    tool_browser.id = 'nbtools-browser';

    // Add the tool browser widget to the application restorer
    if (restorer) restorer.add(tool_browser, NAMESPACE);
    app.shell.add(tool_browser, 'left', { rank: 102 });
}

/**
 * Add the nbtools documentation and feedback links to the help menu
 *
 * @param {Application<Widget>} app
 * @param {IMainMenu} mainmenu
 */
function add_help_links(app:JupyterFrontEnd, mainmenu:IMainMenu|null) {
    const feedback = 'nbtools:feedback';
    const documentation = 'nbtools:documentation';

    // Add feedback command to the command palette
    app.commands.addCommand(feedback, {
        label: 'g2nb Help Forum',
        caption: 'Open the g2nb help forum',
        isEnabled: () => !!app.shell,
        execute: () => {
            const url = 'https://community.mesirovlab.org/c/g2nb/';
            let element = document.createElement('a');
            element.href = url;
            element.target = '_blank';
            document.body.appendChild(element);
            element.click();
            document.body.removeChild(element);
            return void 0;
        }
    });

    // Add documentation command to the command palette
    app.commands.addCommand(documentation, {
        label: 'nbtools Documentation',
        caption: 'Open documentation for nbtools',
        isEnabled: () => !!app.shell,
        execute: () => {
            const url = 'https://github.com/g2nb/nbtools#nbtools';
            let element = document.createElement('a');
            element.href = url;
            element.target = '_blank';
            document.body.appendChild(element);
            element.click();
            document.body.removeChild(element);
            return void 0;
        }
    });

    // Add documentation link to the help menu
    if (mainmenu) mainmenu.helpMenu.addGroup([{command: feedback}, {command: documentation}], 2);
}
