import { Application, IPlugin } from '@phosphor/application';
import { Widget } from '@phosphor/widgets';
import { IJupyterWidgetRegistry } from '@jupyter-widgets/base';
import { MODULE_NAME, MODULE_VERSION } from './version';
import * as base_exports from './basewidget';
import * as uioutput_exports from './uioutput';
import * as uibuilder_exports from './uibuilder';
import { IMainMenu } from '@jupyterlab/mainmenu';
import { ToolBrowser } from "./toolbox";
import { IToolRegistry, ToolRegistry } from "./registry";
import { ILabShell, ILayoutRestorer, JupyterFrontEnd } from "@jupyterlab/application";


const documentation = 'nbtools:documentation';
const all_exports = {...base_exports, ...uioutput_exports, ...uibuilder_exports, documentation } as any;
const EXTENSION_ID = '@genepattern/nbtools:plugin';
const NAMESPACE = 'nbtools';


/**
 * The nbtools plugin.
 */
const nbtools_plugin: IPlugin<Application<Widget>, IToolRegistry> = {
    id: EXTENSION_ID,
    // provides: IToolRegistry,
    requires: [IJupyterWidgetRegistry],
    optional: [IMainMenu, ILayoutRestorer, ILabShell],
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
                                   shell: ILabShell): IToolRegistry {
    add_documentation_link(app as JupyterFrontEnd, mainmenu);
    add_tool_browser(app as JupyterFrontEnd, restorer);

    widget_registry.registerWidget({
        name: MODULE_NAME,
        version: MODULE_VERSION,
        exports: all_exports,
    });

    // Create the tool registry
    const tool_registry = new ToolRegistry();

    // Update the ToC when the active widget changes:
    shell.currentChanged.connect(on_connect);

    return tool_registry;

    /**
     * Callback invoked when the active widget changes.
     */
    function on_connect() {
        let widget = shell.currentWidget;
        if (!widget) return;

        if (tool_registry.current && tool_registry.current.isDisposed) {
            tool_registry.current = null;
            return;
        }
        else tool_registry.current = widget;
    }
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
