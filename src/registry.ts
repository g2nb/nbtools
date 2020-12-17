import { Widget } from "@lumino/widgets";
import { NotebookPanel } from "@jupyterlab/notebook";
import { send_notification } from "./utils";
import { ContextManager } from "./context";

export interface IToolRegistry extends ToolRegistry {}

export class ToolRegistry {
    public current:Widget|null = null;              // Reference to the currently selected notebook or other widget
    private _update_callbacks:Array<Function> = []; // Functions to call when an update happens
    kernel_tool_cache:any = {};                     // Keep a cache of kernels to registered tools
    kernel_import_cache:any = {};                   // Keep a cache of whether nbtools has been imported

    /**
     * Initialize the ToolRegistry and connect event handlers
     */
    constructor() {
        // Lazily assign the tool registry to the context
        if (!ContextManager.tool_registry) ContextManager.tool_registry = this;

        ContextManager.context().notebook_focus((current_widget:any) => {
            // Current notebook hasn't changed, no need to do anything, return
            if (this.current === current_widget) return;

            // Otherwise, update the current notebook reference
            this.current = current_widget;

            // If the current selected widget isn't a notebook, no comm is needed
            if (!(this.current instanceof NotebookPanel) && ContextManager.is_lab()) return;

            // Initialize the comm
            this.init_comm();

            // Load the default tools
            this.import_default_tools();
        });
    }

    import_default_tools() {
        ContextManager.context().execute_code(this.current, 'from nbtools import import_defaults\nimport_defaults()');
    }

    /**
     * Initialize the comm between the notebook widget kernel and the ToolManager
     */
    init_comm() {
        ContextManager.context().kernel_ready(this.current, () => {
            const current:any = this.current;

            // Create a new comm that connects to the nbtools_comm target
            const connect_comm = () => {
                const comm = ContextManager.context().create_comm(current, 'nbtools_comm', (msg:any) => {
                    // Handle message sent by the kernel
                    const data = msg.content.data;

                    if (data.func === 'update') this.update_tools(data.payload);
                    else if (data.func === 'notification') send_notification(data.payload.message, data.payload.sender,
                        ContextManager.context().default_logo());
                    else console.error('ToolRegistry received unknown message: ' + data);
                });

                (window as any).comm = comm;

                // Request the current tool list
                comm.send({
                    'func': 'request_update'
                });
            };

            // When the kernel restarts or is changed, reconnect the comm
            ContextManager.context().kernel_changed(current, () => connect_comm());

            // Connect to the comm upon initial startup
            connect_comm();

            // Update tools from the cache
            this.update_from_cache();
        });
    }

    /**
     * Get tools from the cache and make registered callbacks
     */
    update_from_cache() {
        // Get the kernel ID
        const kernel_id = this.current_kernel_id();
        if (!kernel_id) return; // Do nothing if null

        // Get tools from the cache
        const tool_list = this.kernel_tool_cache[kernel_id];

        // Make registered callbacks for when tools are updated
        this._update_callbacks.forEach((callback) => {
            callback(tool_list);
        });
    }

    /**
     * Message the kernel, requesting an update to the tools cache
     *
     * @param comm
     */
    request_update(comm:any) {
        comm.send({'func': 'request_update'});
    }

    /**
     * Register an update callback with the ToolRegistry
     *
     * @param callback
     */
    on_update(callback:Function) {
        this._update_callbacks.push(callback);
    }

    /**
     * Retrieve the kernel ID from the currently selected notebook
     * Return null if no kernel or no notebook selected
     */
    current_kernel_id() {
        return ContextManager.context().kernel_id(this.current);
    }

    /**
     * Update the tools cache for the current kernel
     *
     * @param message
     */
    update_tools(message:any) {
        const kernel_id = this.current_kernel_id();
        if (!kernel_id) return; // Do nothing if no kernel

        // Parse the message
        const tool_list = message['tools'];
        const needs_import = !!message['import'];

        // Update the cache
        this.kernel_tool_cache[kernel_id] = tool_list;
        this.kernel_import_cache[kernel_id] = needs_import;

        // Make registered callbacks when tools are updated
        this._update_callbacks.forEach((callback) => {
            callback(tool_list);
        });
    }

    /**
     * Query whether nbtools has been imported in this kernel
     */
    needs_import():Boolean {
        const kernel_id = this.current_kernel_id();
        if (!kernel_id) return true; // Assume true if no kernel

        // Get import status from the cache and protect against undefined
        return !this.kernel_import_cache[kernel_id];
    }

    /**
     * Returns a list of all currently registered tools
     *
     * @returns {Array} - A list of registered tools
     */
    list():Array<any> {
        const kernel_id = this.current_kernel_id();
        if (!kernel_id) return []; // Empty list if no kernel

        // Get tools from the cache and protect against undefined
        const tools = this.kernel_tool_cache[kernel_id];
        if (!tools) return [];

        return Object.keys(tools).map(function(key) {
            return tools[key];
        });
    }

    /**
     * Has this tool already been registered?
     *
     * @param origin
     * @param id
     * @returns {boolean}
     */
    has_tool(origin:string, id:string|number) {
        let found_tool = false;

        this.list().forEach(tool => {
            if (tool.id === id && tool.origin === origin) found_tool = true;
        });

        return found_tool;
    }
}