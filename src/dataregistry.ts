import { Widget } from "@lumino/widgets";
import { ContextManager } from "./context";
import { Token } from "@lumino/coreutils";
import {extract_file_name, extract_file_type} from "./utils";

export const IDataRegistry = new Token<IDataRegistry>("nbtools:IDataRegistry")

export interface IDataRegistry {}

export class DataRegistry implements IDataRegistry {
    public current:Widget|null = null;              // Reference to the currently selected notebook or other widget
    update_callbacks:Array<Function> = [];          // Callbacks to execute when the cache is updated
    kernel_data_cache:any = {};                     // Keep a cache of kernels to registered data
                                                    // { 'kernel_id': { 'origin': { 'identifier': data } } }

    /**
     * Initialize the DataRegistry and connect event handlers
     */
    constructor() {
        // Lazily assign the data registry to the context
        if (!ContextManager.data_registry) ContextManager.data_registry = this;

        ContextManager.context().notebook_focus((current_widget:any) => {
            // Current notebook hasn't changed, no need to do anything, return
            if (this.current === current_widget) return;

            // Otherwise, update the current notebook reference
            this.current = current_widget;
        });
    }

    /**
     * Register all data objects in the provided list
     *
     * @param data_list
     */
    register_all(data_list:Array<any>): boolean {
        let all_good = true;
        for (const data of data_list) {
            data.skip_callbacks = true;
            all_good = this.register(data) && all_good;
        }
        this.execute_callbacks();
        return all_good;
    }

    /**
     * Register data for the sent to/come from menus
     * Return whether registration was successful or not
     *
     * @param origin
     * @param uri
     * @param label
     * @param kind
     * @param group
     * @param icon
     * @param data
     * @param widget
     * @param skip_callbacks
     */
    register({origin=null, uri=null, label=null, kind=null, group=null, icon=null, data=null, widget=false, skip_callbacks=false}:
                 {origin?:string|null, uri?: string|null, label?: string|null, kind?: string|null, group?: string|null, icon?: string|null, data?:Data|null, widget?:boolean, skip_callbacks: boolean}): boolean {
        // Use origin, identifier, label and kind to initialize data, if needed
        if (!data) data = new Data(origin, uri, label, kind, group, widget, icon);

        const kernel_id = this.current_kernel_id();
        if (!kernel_id) return false; // If no kernel, do nothing

        // Lazily initialize dict for kernel cache
        let cache = this.kernel_data_cache[kernel_id];
        if (!cache) cache = this.kernel_data_cache[kernel_id] = {};

        // Lazily initialize dict for origin
        let origin_data = cache[data.origin];
        if (!origin_data) origin_data = cache[data.origin] = {};

        // Add to cache, execute callbacks and return
        if (!origin_data[data.uri]) origin_data[data.uri] = [];
        origin_data[data.uri].unshift(data);
        if (!skip_callbacks) this.execute_callbacks();
        return true
    }

    /**
     * Unregister data with the given origin and identifier
     * Return the unregistered data object
     * Return null if un-registration was unsuccessful
     *
     * @param origin
     * @param identifier
     * @param data
     */
    unregister({origin=null, uri=null, data=null}:
                 {origin?:string|null, uri?: string|null, data?:Data|null}): Data|null {
        // Use origin, identifier and kind to initialize data, if needed
        if (!data) data = new Data(origin, uri);

        const kernel_id = this.current_kernel_id();
        if (!kernel_id) return null; // If no kernel, do nothing

        // If unable to retrieve cache, return null
        const cache = this.kernel_data_cache[kernel_id];
        if (!cache) return null;

        // If unable to retrieve origin, return null
        const origin_data = cache[data.origin];
        if (!origin_data) return null;

        // If unable to find identifier, return null;
        let found = origin_data[data.uri];
        if (!found || !found.length) return null;

        // Remove from the registry, execute callbacks and return
        found = origin_data[data.uri].shift();
        if (!origin_data[data.uri].length) delete origin_data[data.uri];
        this.execute_callbacks();
        return found;
    }

    /**
     * Execute all registered update callbacks
     */
    execute_callbacks() {
        for (const c of this.update_callbacks) c();
    }

    /**
     * Attach a callback that gets executed every time the data in the registry is updated
     *
     * @param callback
     */
    on_update(callback:Function) {
        this.update_callbacks.push(callback);
    }

    /**
     * Update the data cache for the current kernel
     *
     * @param message
     */
    update_data(message:any) {
        const kernel_id = this.current_kernel_id();
        if (!kernel_id) return; // Do nothing if no kernel

        // Parse the message
        const data_list = message['data'];

        // Update the cache
        this.kernel_data_cache[kernel_id] = {};
        this.register_all(data_list);
    }

    /**
     * List all data currently in the registry
     */
    list() {
        // If no kernel, return empty map
        const kernel_id = this.current_kernel_id();
        if (!kernel_id) return {};

        // If unable to retrieve cache, return empty map
        const cache = this.kernel_data_cache[kernel_id];
        if (!cache) return {};

        // FORMAT: { 'origin': { 'identifier': [data] } }
        return cache;
    }


    /**
     * Get all data that matches one of the specified kinds or origins
     * If kinds or origins is null or empty, accept all kinds or origins, respectively
     *
     * @param kinds
     * @param origins
     */
    get_data({kinds=null, origins=null}: { kinds:string[]|null, origins:string[]|null }) {
        const kernel_id = this.current_kernel_id();
        if (!kernel_id) return {}; // If no kernel, return empty

        // If unable to retrieve cache, return empty
        const cache = this.kernel_data_cache[kernel_id];
        if (!cache) return {};

        // Compile map of data with a matching origin and kind
        const matching:any = {};
        for (let origin of Object.keys(cache)) {
            if (origins === null || origins.length === 0 || origins.includes(origin)) {
                const hits:any = {};
                for (let data of Object.values(cache[origin]) as any) {
                    if (data[0].kind === 'error') continue;
                    if (kinds === null || kinds.length === 0 || kinds.includes(data[0].kind))
                    hits[data[0].label] = data[0].uri;
                }
                if (Object.keys(hits).length > 0) matching[origin] = hits
            }
        }

        return matching;
    }

    /**
     * Retrieve the kernel ID from the currently selected notebook
     * Return null if no kernel or no notebook selected
     */
    current_kernel_id() {
        return ContextManager.context().kernel_id(this.current);
    }
}

export class Data {
    public origin: string;
    public uri: string;
    public label: string;
    public kind: string;
    public group: string;
    public widget: boolean;
    public icon: string;

    constructor(origin:string, uri:string, label:string|null=null, kind:string|null=null, group:string|null=null,
                widget:boolean=false, icon:string|null=null) {
        this.origin = origin;
        this.uri = uri;
        this.label = !!label ? label : extract_file_name(uri);
        this.kind = !!kind ? kind : extract_file_type(uri);
        this.group = group;
        this.widget = widget;
        this.icon = icon;
    }
}