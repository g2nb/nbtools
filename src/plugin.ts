import { Application, IPlugin } from '@phosphor/application';
import { Widget } from '@phosphor/widgets';
import { IJupyterWidgetRegistry } from '@jupyter-widgets/base';
import { MODULE_NAME, MODULE_VERSION } from './version';
import * as base_exports from './basewidget';
import * as uioutput_exports from './uioutput';
import * as uibuilder_exports from './uibuilder';
import { IMainMenu } from '@jupyterlab/mainmenu';


const documentation = 'nbtools:documentation';
const all_exports = {...base_exports, ...uioutput_exports, ...uibuilder_exports, documentation } as any;
const EXTENSION_ID = '@genepattern/nbtools:plugin';


/**
 * The nbtools plugin.
 */
const nbtools_plugin: IPlugin<Application<Widget>, void> = {
    id: EXTENSION_ID,
    requires: [IJupyterWidgetRegistry],
    optional: [IMainMenu],
    activate: activate_widget_extension,
    autoStart: true
};
export default nbtools_plugin;


/**
 * Activate the widget extension.
 */
function activate_widget_extension(app: Application<Widget>, registry: IJupyterWidgetRegistry, mainmenu:IMainMenu|null): void {
    add_documentation_link(app, mainmenu);

    registry.registerWidget({
        name: MODULE_NAME,
        version: MODULE_VERSION,
        exports: all_exports,
    });
}

/**
 * Add the nbtools documentation link to the help menu
 *
 * @param {Application<Widget>} app
 * @param {IMainMenu} mainmenu
 */
function add_documentation_link(app:Application<Widget>, mainmenu:IMainMenu|null) {
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