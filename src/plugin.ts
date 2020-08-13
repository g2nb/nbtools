import { Application, IPlugin } from '@lumino/application';
import { Widget } from '@lumino/widgets';
import { IJupyterWidgetRegistry } from '@jupyter-widgets/base';
import { MODULE_NAME, MODULE_VERSION } from './version';
import * as base_exports from './basewidget';
import * as uioutput_exports from './uioutput';
import * as uibuilder_exports from './uibuilder';
import * as toolbox_exports from './toolbox';
import { IMainMenu } from '@jupyterlab/mainmenu';
import { ToolBrowser } from "./toolbox";
import { IToolRegistry, ToolRegistry } from "./registry";
import { ILabShell, ILayoutRestorer, JupyterFrontEnd } from "@jupyterlab/application";
import { INotebookTracker, NotebookTracker } from '@jupyterlab/notebook';
import { ContextManager } from "./context";


const documentation = 'nbtools:documentation';
const all_exports = {...base_exports, ...uioutput_exports, ...uibuilder_exports, ...toolbox_exports, documentation } as any;
const EXTENSION_ID = '@genepattern/nbtools:plugin';
const NAMESPACE = 'nbtools';


/**
 * The nbtools plugin.
 */
const nbtools_plugin: IPlugin<Application<Widget>, IToolRegistry> = {
    id: EXTENSION_ID,
    // provides: IToolRegistry,
    requires: [IJupyterWidgetRegistry],
    optional: [IMainMenu, ILayoutRestorer, ILabShell, INotebookTracker],
    activate: activate_widget_extension,
    autoStart: true
};
export default nbtools_plugin;


/**
 * Activate the widget extension.
 */
function activate_widget_extension(app: Application<Widget>,
                                   widget_registry: IJupyterWidgetRegistry,
                                   mainmenu:IMainMenu|null,
                                   restorer: ILayoutRestorer|null,
                                   shell: ILabShell|null,
                                   notebook_tracker: INotebookTracker|null): IToolRegistry {

    // Create the tool registry
    const tool_registry = new ToolRegistry(notebook_tracker as NotebookTracker);

    // Initialize the ContextManager
    init_context(app as JupyterFrontEnd, notebook_tracker, tool_registry);

    // Add items to the help menu
    add_documentation_link(app as JupyterFrontEnd, mainmenu);

    // Add the toolbox
    add_tool_browser(app as JupyterFrontEnd, restorer);

    // Register the nbtools widgets with the widget registry
    widget_registry.registerWidget({
        name: MODULE_NAME,
        version: MODULE_VERSION,
        exports: all_exports,
    });

    // Return the tool registry so that it is provided to other extensions
    return tool_registry;
}

function init_context(app:JupyterFrontEnd, notebook_tracker: INotebookTracker|null, tool_registry:ToolRegistry) {
    ContextManager.jupyter_app = app;
    ContextManager.notebook_tracker = notebook_tracker;
    ContextManager.tool_registry = tool_registry;
    //(window as any).ContextManager = ContextManager;  // Left in for development purposes
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
 * Add the nbtools documentation link to the help menu
 *
 * @param {Application<Widget>} app
 * @param {IMainMenu} mainmenu
 */
function add_documentation_link(app:JupyterFrontEnd, mainmenu:IMainMenu|null) {
    // Add documentation command to the command palette
    app.commands.addCommand(documentation, {
        label: 'nbtools Documentation',
        caption: 'Open documentation for nbtools',
        isEnabled: () => !!app.shell,
        execute: () => {
            const url = 'https://github.com/genepattern/nbtools';
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
    if (mainmenu) mainmenu.helpMenu.addGroup([{command: documentation}], 2);
}
