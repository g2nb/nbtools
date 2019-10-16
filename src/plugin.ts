import { Application, IPlugin } from '@phosphor/application';
import { Widget } from '@phosphor/widgets';
import { IJupyterWidgetRegistry } from '@jupyter-widgets/base';
import { MODULE_NAME, MODULE_VERSION } from './version';
import * as base_exports from './widgetbase';
import * as uioutput_exports from './uioutput';
import * as uibuilder_exports from './uibuilder';


const all_exports = {...base_exports, ...uioutput_exports, ...uibuilder_exports };
const EXTENSION_ID = '@genepattern/nbtools:plugin';

/**
 * The example plugin.
 */
const nbtools_plugin: IPlugin<Application<Widget>, void> = {
  id: EXTENSION_ID,
  requires: [IJupyterWidgetRegistry],
  activate: activate_widget_extension,
  autoStart: true
};

export default nbtools_plugin;


/**
 * Activate the widget extension.
 */
function activate_widget_extension(app: Application<Widget>, registry: IJupyterWidgetRegistry): void {
  registry.registerWidget({
    name: MODULE_NAME,
    version: MODULE_VERSION,
    exports: all_exports,
  });
}
