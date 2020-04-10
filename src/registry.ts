import { Widget } from "@phosphor/widgets";
import { ILabShell } from "@jupyterlab/application";
import { NotebookPanel } from "@jupyterlab/notebook";

export interface IToolRegistry extends ToolRegistry {}

export class ToolRegistry {
    // List of registered tools
    private _tools:any = [];
    // The next ID value to return
    private _next_id:number = 1;
    // Whether the Jupyter kernel has been loaded yet
    private _kernel_loaded:boolean = false;
    // Timestamp of when the tool list was last modified
    private _modified:Date = new Date();
    // Reference to the currently selected notebook or other widget
    public current:Widget|null = null;
    // Functions to call when an update happens
    private _update_callbacks:Array<Function> = [];
    // Keep a map of kernels to registered comms
    kernel_comm_map:any = {};

    /**
     * Initialize the ToolRegistry and connect event handlers
     *
     * @param shell
     */
    constructor(shell:ILabShell|null) {
        // Update the tool registry when the active widget changes:
        shell && shell.currentChanged.connect(() => {
            let widget = shell ? shell.currentWidget : null;
            if (!widget) return; // Ensure shell and currentWidget are defined

            // If the current widget has been closed, set no current widget
            if (this.current && this.current.isDisposed) this.current = null;

            // Otherwise, set the current widget
            else this.set_current(widget);
        });
    }

    /**
     * Set the current widget and connect the comm
     * @param widget
     */
    set_current(widget:Widget) {
        this.current = widget;
        this.init_comm(widget);
    }

    /**
     * Initialize the comm between the notebook widget kernel and the ToolManager
     *
     * @param current
     */
    init_comm(current:Widget|NotebookPanel) {
        // If the current selected widget isn't a notebook, no comm is needed
        if (!(current instanceof NotebookPanel)) return;

        // Register the comm when the kernel starts up or changes
        current.context.session.kernelChanged.connect(() => {
            current.context.session.ready.then(() => {
                // If the kernel is null, don't establish a comm
                const kernel = current.context.session.kernel;
                if (!kernel) return;

                console.log('nbtools comm registered with kernel');
                kernel.registerCommTarget('nbtools_comm', (comm:any) => {
                    this.kernel_comm_map[kernel.clientId] = comm;

                    comm.onMsg = (msg:any) => {
                        // const session_id = msg.header.session;
                        const data = msg.content.data;

                        if (data.func === 'update') this.update_tools(data.payload);
                        else console.error('ToolRegistry received unknown message: ' + data);
                    };
                  });
            });
        });

        // Rebuild the toolbox when the active notebook switches
        current.context.session.ready.then(() => {
            // If the kernel is null, don't establish a comm
            const kernel = current.context.session.kernel as any;
            if (!kernel) return;

            const comm = this.kernel_comm_map[kernel.clientId];
            // const comm = kernel.connectToComm('nbtools_comm', 'nbtools_comm');
            if (!!comm) this.request_update(comm);
            else this.update_tools([]);
        });
    }

    request_update(comm:any) {
        comm.send({'func': 'request_update'});
    }

    on_update(callback:Function) {
        this._update_callbacks.push(callback);
    }

    update_tools(tool_list:any) {
        this._tools = tool_list;
        this._update_callbacks.forEach((callback) => {
            callback(tool_list);
        });
    }

    /**
     * Register a notebook tool with the manager
     * Return null if the provided tool is not valid
     *
     * @param tool - Object implementing the Notebook Tool interface
     * @returns {number|null} - Returns the tool ID or null if invalid
     */
    register(tool:any) {
        const id = this._generate_id();
        this._tools[id] = tool;
        this._modified = new Date();

        // If the kernel has already been loaded, immediately call load() for the tool
        if (this._kernel_loaded) {
            const success = tool.load();

            // Log error to console if tool had trouble loading
            if (!success) console.log("Problem loading tool: " + tool.name);
        }

        return id;
    }

    /**
     * Unregister a notebook tool from the manager
     *
     * @param id - Unique tool ID returned when registering the tool
     * @returns {boolean} - Returns whether the tool was successfully registered
     */
    unregister(id:string|number) {
        if (id in this._tools) {
            delete this._tools[id];
            this._modified = new Date();
            return true;
        }
        else {
            return false;
        }
    }

    /**
     * Returns a list of all currently registered tools
     *
     * @returns {Array} - A list of registered tools
     */
    list():Array<any> {
        const tools = this._tools;
        return Object.keys(this._tools).map(function(key) {
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

    /**
     * Returns a Date() object representing when the tool
     * list was last modified. Useful when caching.
     *
     * @returns {*}
     */
    modified() {
        return this._modified;
    }

    /**
     * Increment and return the next tool id number
     *
     * @returns {number} - The generated ID
     * @private
     */
    _generate_id() {
        return this._next_id++;
    }
}