import { Widget } from "@lumino/widgets";
import { ContextManager } from "./context";
import { Token } from "@lumino/coreutils";
import {extract_file_name, extract_file_type} from "./utils";

export const IDataRegistry = new Token<IDataRegistry>("nbtools.data");

export interface IDataRegistry {}

export class DataRegistry implements IDataRegistry {
    public current:Widget|null = null;              // Reference to the currently selected notebook or other widget
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
     * Register data for the sent to/come from menus
     * Return whether registration was successful or not
     *
     * @param origin
     * @param identifier
     * @param kind
     * @param data
     */
    register({origin=null, uri=null, kind=null, data=null}:
                 {origin?:string|null, uri?: string|null, kind?: string|null, data?:Data|null}): boolean {
        // Use origin, identifier and kind to initialize data, if needed
        if (!data) data = new Data(origin, uri, kind);

        const kernel_id = this.current_kernel_id();
        if (!kernel_id) return false; // If no kernel, do nothing

        // Lazily initialize dict for kernel cache
        let cache = this.kernel_data_cache[kernel_id];
        if (!cache) cache = this.kernel_data_cache[kernel_id] = {};

        // Lazily initialize dict for origin
        let origin_data = cache[data.origin];
        if (!origin_data) origin_data = cache[data.origin] = {};

        // Add to cache and return
        origin_data[data.uri] = data;
        return true
    }

    /**
     * Unregister data with the given origin and identifier
     * Return the unregistered data object
     * Return null if un-registration was unsuccessful
     *
     * @param origin
     * @param identifier
     * @param kind
     * @param data
     */
    unregister({origin=null, uri=null, kind=null, data=null}:
                 {origin?:string|null, uri?: string|null, kind?: string|null, data?:Data|null}): Data|null {
        // Use origin, identifier and kind to initialize data, if needed
        if (!data) data = new Data(origin, uri, kind);

        const kernel_id = this.current_kernel_id();
        if (!kernel_id) return null; // If no kernel, do nothing

        // If unable to retrieve cache, return null
        const cache = this.kernel_data_cache[kernel_id];
        if (!cache) return null;

        // If unable to retrieve origin, return null
        const origin_data = cache[data.origin];
        if (!origin_data) return null;

        // If unable to find identifier, return null;
        const found = origin_data[data.uri];
        if (!found) return null;

        // Remove from the registry and return
        delete origin_data[data.uri];
        return found;
    }

    /**
     * Get all data that matches one of the specified kinds or origins
     * If kinds or origins is null, accept all kinds or origins, respectively
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
            if (origins === null || origins.includes(origin)) {
                const hits:any = {};
                for (let data of Object.values(cache[origin]) as any) {
                    if (kinds === null || kinds.includes(data.kind))
                    hits[data.label] = data.uri;
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

    constructor(origin:string, uri:string, label:string|null=null, kind:string|null=null) {
        this.origin = origin;
        this.uri = uri;
        this.label = !!label ? label : extract_file_name(uri);
        this.kind = !!kind ? kind : extract_file_type(uri);
    }
}