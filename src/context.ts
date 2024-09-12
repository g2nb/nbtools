import { hide, show, toggle } from "./utils";
import { INotebookTracker, NotebookPanel } from "@jupyterlab/notebook";
import { CodeCell } from "@jupyterlab/cells";
import { JupyterFrontEnd } from "@jupyterlab/application";
import { ToolRegistry } from "./registry";
import { DataRegistry } from "./dataregistry";

export class ContextManager {
    static _context:Context;
    static jupyter_app:JupyterFrontEnd;
    static notebook_tracker:INotebookTracker|null;
    static tool_registry:ToolRegistry;
    static data_registry:DataRegistry;

    static context():Context {
        if (!ContextManager._context) {
            if (ContextManager.is_lab()) ContextManager._context = new LabContext();
            else if (ContextManager.is_notebook()) ContextManager._context = new NotebookContext();
            else ContextManager._context = new EmbedContext();
        }
        return ContextManager._context;
    }

    /**
     * Determine is this is running in JupyterLab
     *
      * @returns {boolean}
     */
    static is_lab(): boolean {
        // The assumption is that only JupyterLab will provide an initialized NotebookTracker object
        // If a better way to detect the environment becomes available, use that instead
        return !!ContextManager.notebook_tracker;

        // A previous implementation replied on checking the DOM
        // return !!document.querySelector("#main.jp-LabShell")
    }

    /**
     * Determine if this is running in the classic Jupyter Notebook
     *
     * @returns {boolean}
     */
    static is_notebook(): boolean {
        // Check if the Jupyter global variable has been defined
        return !!((window as any)['Jupyter']);
    }
}

/**
 * Abstract base class representing the context in which the widgets are running.
 * Contexts include: JupyterLab, Jupyter Notebook and Embedded.
 */
abstract class Context {
    /**
     * Toggle hiding or showing the code for the specified cell
     *
     * @param {HTMLElement} element
     * @param {boolean} display
     */
    abstract toggle_code(element: HTMLElement, display?: boolean):void;

    /**
     * Execute the indicated cell in the notebook
     *
     * @param cell
     */
    abstract run_cell(cell?: any):void;

    /**
     * Execute all cells with nbtools widgets in the current notebook
     */
    abstract run_tool_cells():void;

    /**
     * Sets whether this is a nbtools widget cell
     *
     * @param cell
     * @param is_widget_cell
     */
    abstract make_tool_cell(cell: any, is_widget_cell?:boolean):void

    /**
     * Returns a path to the active notebook, relative to the top directory
     */
    abstract notebook_path():string

    /**
     * Determines if the given cell contains a notebook tool widget
     *
     * @param cell
     * @returns boolean
     */
    abstract is_tool_cell(cell:any):boolean

    /**
     * Path to the default GenePattern logo
     */
    abstract default_logo():string

    /**
     * Path to the default GenePattern icon
     */
    abstract default_icon():string

    /**
     * Return the id of the current notebook's kernel
     *
     * @param notebook
     */
    abstract kernel_id(notebook:any):string|null

    /**
     * Function to execute when the notebook is opened and selected
     *
     * @param callback
     */
    abstract notebook_focus(callback:Function):void

    /**
     * Execute the callback when the current kernel is ready
     *
     * @param current
     * @param callback
     */
    abstract kernel_ready(current:any, callback:Function):void

    /**
     * Execute the callback every time the kernel is changed or restarts
     *
     * @param current
     * @param callback
     */
    abstract kernel_changed(current:any, callback:Function):void

    /**
     * Send the provided code to the kernel
     *
     * @param notebook
     * @param code
     */
    abstract execute_code(notebook:any, code:string):void

    /**
     * Create a new comm
     *
     * @param current
     * @param name
     * @param callback
     */
    abstract create_comm(current:any, name:string, callback:Function):any
}


/**
 * Context handler for JupyterLab
 */
class LabContext extends Context {
    /**
     * Toggle hiding or or showing the code for the specified cell
     *
     * @param {HTMLElement} element
     * @param {boolean} display
     */
    toggle_code(element:HTMLElement, display?:boolean) {
        setTimeout(() => {
            let input_block = element.closest('.jp-Cell') as HTMLElement;
            if (input_block) input_block = input_block.querySelector('.jp-Cell-inputWrapper') as HTMLElement;

            // Set display to toggle if not specified
            if (!!display) show(input_block);
            else if (display === false) hide(input_block,'30px');
            else toggle(input_block,'30px');
        }, 100);
    }

    /**
     * Execute the indicated cell in the notebook
     *
     * @param cell
     */
    run_cell(cell:any=null) {
        if (!ContextManager.notebook_tracker) return; // If no notebook_tracker, do nothing

        // If cell is falsy, default to the active cell
        if (!cell) cell = ContextManager.notebook_tracker.activeCell;

        // If this is a code cell
        if (cell instanceof CodeCell) {
            const current = ContextManager.notebook_tracker.currentWidget;
            if (current) {
                CodeCell.execute(cell, current.context.sessionContext);
            }
        }

        // If this is a markdown cell
        // if (ContextManager.notebook_tracker.activeCell instanceof MarkdownCell)
        //     MarkdownCell.renderInput(ContextManager.notebook_tracker.activeCell)
    }

    /**
     * Execute all cells with nbtools widgets in the current notebook
     */
    run_tool_cells() {
        if (!ContextManager.notebook_tracker) return;               // If no notebook_tracker, do nothing
        if (!ContextManager.notebook_tracker.currentWidget) return; // If no notebook selected, do nothing

        const cell_widgets = ContextManager.notebook_tracker.currentWidget.content.widgets;
        cell_widgets.forEach((widget) => {
            if (this.is_tool_cell(widget)) this.run_cell(widget);
        });
    }

    /**
     * Get the relative path to the current notebook
     */
    notebook_path():string {
        if (!ContextManager.notebook_tracker) return '';                        // If no notebook_tracker, do nothing
        if (!ContextManager.notebook_tracker.currentWidget) return '';          // If no active notebook, do nothing
        if (!ContextManager.notebook_tracker.currentWidget.context) return '';  // If no context, do nothing

        const notebook_context = ContextManager.notebook_tracker.currentWidget.context;
        const notebook_path = notebook_context.path;
        const directory_path = notebook_path.substring(0, notebook_path.lastIndexOf("/") + 1);
        return directory_path;
    }

    /**
     * Determines if the given cell contains a notebook tool widget
     *
     * @param cell
     * @returns boolean
     */
    is_tool_cell(cell:any):boolean {
        // Check for nbtools metadata
        if (cell.model.metadata.get('nbtools')) return true;

        // For backwards compatibility with GPNB, check for genepattern metadata
        if (cell.model.metadata.get('genepattern')) return true;

        // Check for an existing disconnected nbtools widget
        const dom_node = cell.node || cell.element;
        if (!!dom_node) return !!dom_node.querySelector('.nbtools');
        else return false;
    }

    /**
     * Path to the default GenePattern logo
     */
    default_logo():string {
        return  require("../style/g2nb_logo.png").default;
    }

    /**
     * Path to the default GenePattern icon
     */
    default_icon():string {
        return  require("../style/icon.svg").default;
    }

    /**
     * Return the id of the current notebook's kernel
     *
     * @param notebook
     */
    kernel_id(notebook:any):string|null {
        // If the current widget isn't a notebook, there is no kernel
        if (!(notebook instanceof NotebookPanel)) return null;

        // Protect against null
        if (!notebook ||
            !notebook.context ||
            !notebook.context.sessionContext ||
            !notebook.context.sessionContext.session ||
            !notebook.context.sessionContext.session.kernel) return null;

        return notebook.context.sessionContext.session.kernel.id;
    }

    /**
     * Function to execute when the notebook is opened and selected
     *
     * @param callback
     */
    notebook_focus(callback:Function):void {
        const notebook_tracker:INotebookTracker|null = ContextManager.notebook_tracker;
        notebook_tracker && notebook_tracker.activeCellChanged.connect(() => {
            const current_widget = notebook_tracker.currentWidget;
            callback(current_widget);
        })
    }

    /**
     * Execute the callback when the current kernel is ready
     *
     * @param current
     * @param callback
     */
    kernel_ready(current:any, callback:Function):void {
        // If the current widget isn't a notebook, there is no kernel
        if (!(current instanceof NotebookPanel)) return;

        current.context.sessionContext.ready.then(() => callback());
    }

    /**
     * Execute the callback every time the kernel is changed or restarts
     *
     * @param current
     * @param callback
     */
    kernel_changed(current:any, callback:Function):void {
        current.context.sessionContext.kernelChanged.connect(() => callback());
    }

    /**
     * Send the provided code to the kernel
     *
     * @param notebook
     * @param code
     */
    execute_code(notebook:any, code:string):void {
        const current = notebook as NotebookPanel;
        if (!current.context.sessionContext.session ||
            !current.context.sessionContext.session.kernel) return;  // Protect against null kernels

        // Import the default tools
        current.context.sessionContext.session.kernel.requestExecute({code: code});
    }

    /**
     * Create a new comm
     *
     * @param current
     * @param name
     * @param callback
     */
    create_comm(current:any, name:string, callback:Function):any {
        const kernel = current.context.sessionContext.session.kernel;
        const comm = kernel.createComm(name);
        comm.onMsg = callback;
        comm.open({});  // Open the comm
        return comm
    }

    /**
     * Sets whether this is a nbtools widget cell
     *
     * @param cell
     * @param is_widget_cell
     */
    make_tool_cell(cell: any, is_widget_cell=true): void {
        if (is_widget_cell) cell.model.metadata.set('nbtools', {'force_display': true});
        else cell.model.metadata.clear();
    }
}

/**
 * Context handler for the classic Jupyter Notebook
 */
class NotebookContext extends Context {
    /**
     * Toggle hiding or or showing the code for the specified cell
     *
     * @param {HTMLElement} element
     * @param {boolean} display
     */
    toggle_code(element:HTMLElement, display?:boolean) {
        setTimeout(() => {
            const cell_element = element.closest(".cell");
            if (!cell_element) return; // Widget has not yet been added to the DOM

            const code = (cell_element as any).querySelector(".input");

            // Set display to toggle if not specified
            if (!!display) show(code);
            else if (display === false) hide(code);
            else toggle(code);
        }, 10);
    }

    /**
     * Execute the indicated cell in the notebook
     *
     * @param cell
     */
    run_cell(cell:any) {
        (window as any).Jupyter.notebook.execute_cell(cell);
    }

    /**
     * Execute all cells with nbtools widgets in the current notebook
     */
    run_tool_cells() {
        const cells_to_run:number[] = [];
        (window as any).Jupyter.notebook.get_cells().forEach((cell:any, index:number) => {
            if (this.is_tool_cell(cell)) cells_to_run.push(index);
        });
        (window as any).Jupyter.notebook.execute_cells(cells_to_run);
    }

    notebook_path():string {
        return (window as any).Jupyter.notebook.path;
    }

    base_path():string {
        const body = document.querySelector('body');
        if (!body) return ''; // If there is no body, unable to get path
        return body.getAttribute('data-base-url') + 'nbextensions/nbtools/';
    }

    /**
     * Determines if the given cell contains a notebook tool widget
     *
     * @param cell
     * @returns boolean
     */
    is_tool_cell(cell:any):boolean {
        const dom_node = cell.node || cell.element;
        if (!!dom_node) return !!dom_node.find('.nbtools').length;
        else return false;
    }

    /**
     * Sets whether this is a nbtools widget cell
     *
     * @param cell
     * @param is_widget_cell
     */
    make_tool_cell(cell: any, is_widget_cell=true): void {
        // TODO: Test in Jupyter Notebook
        if (is_widget_cell) cell.metadata.set('nbtools', {'force_display': true});
        else cell.metadata.clear();
    }

    /**
     * Path to the default GenePattern logo
     */
    default_logo():string {
        return  this.base_path() + require("../style/g2nb_logo.png").default;
    }

    /**
     * Path to the default GenePattern icon
     */
    default_icon():string {
        return  this.base_path() + require("../style/icon.svg").default;
    }

    /**
     * Return the id of the current notebook's kernel
     *
     * @param notebook
     */
    kernel_id(notebook:any):string|null {
        return (window as any).Jupyter.notebook.kernel.id
    }

    /**
     * Function to execute when the notebook is opened and selected
     *
     * @param callback
     */
    notebook_focus(callback:Function):void {
        (window as any).Jupyter.notebook.events.ready(() => {
            callback((window as any).Jupyter.notebook);
        });
    }

    /**
     * Execute the callback when the current kernel is ready
     *
     * @param current
     * @param callback
     */
    kernel_ready(current:any, callback:Function):void {
        setTimeout(() => {
            if ((window as any).Jupyter.notebook.kernel.is_connected()) callback((window as any).Jupyter.notebook);
            else (window as any).Jupyter.notebook.events.one('kernel_ready.Kernel', () => {
                callback((window as any).Jupyter.notebook);
            });
        }, 100);
    }

    /**
     * Execute the callback every time the kernel is changed or restarts
     *
     * @param current
     * @param callback
     */
    kernel_changed(current:any, callback:Function):void {
        (window as any).Jupyter.notebook.events.on('kernel_ready.Kernel', () => {
            callback((window as any).Jupyter.notebook);
        });
    }

    /**
     * Send the provided code to the kernel
     *
     * @param notebook
     * @param code
     */
    execute_code(notebook:any, code:string):void {
        (window as any).Jupyter.notebook.kernel.execute(code)
    }

    /**
     * Create a new comm
     *
     * @param current
     * @param name
     * @param callback
     */
    create_comm(current:any, name:string, callback:Function):any {
        let comm = (window as any).Jupyter.notebook.kernel.comm_manager.new_comm(name);
        comm.on_msg(callback);
        return comm;
    }
}

/**
 * Context handler for embedded widgets
 */
class EmbedContext extends Context {
    /**
     * No cells in this context, so do nothing
     *
     * @param {HTMLElement} element
     * @param {boolean} display
     */
    toggle_code(element:HTMLElement, display?:boolean) {}

    /**
     * No cells in this context, so do nothing
     * @param cell
     */
    run_cell(cell:any) {}

    /**
     * No cells in this context, so do nothing
     */
    run_tool_cells() {}

    /**
     * No notebook in this context
     */
    notebook_path() { return ''; }

    base_path():string {
        const body = document.querySelector('body');
        if (!body) return ''; // If there is no body, unable to get path
        return body.getAttribute('data-base-url') + 'nbextensions/nbtools/';
    }

    /**
     * Sets whether this is a nbtools widget cell
     *
     * @param cell
     * @param is_widget_cell
     */
    make_tool_cell(cell: any, is_widget_cell=true): void {
        // TODO: Test in embedded context
        if (is_widget_cell) cell.metadata.set('nbtools', {'force_display': true});
        else cell.metadata.clear();
    }

    /**
     * Determines if the given cell contains a notebook tool widget
     *
     * @param cell
     * @returns boolean
     */
    is_tool_cell(cell:any):boolean {
        const dom_node = cell.node || cell.element;
        if (!!dom_node) return !!dom_node.querySelector('.nbtools');
        else return false;
    }

    /**
     * Path to the default GenePattern logo
     */
    default_logo():string {
        return  this.base_path() + require("../style/g2nb_logo.png").default;
    }

    /**
     * Path to the default GenePattern icon
     */
    default_icon():string {
        return  require("../style/icon.svg").default;
    }

    /**
     * Return the id of the current notebook's kernel
     *
     * @param notebook
     */
    kernel_id(notebook:any):string|null {
        return null;
    }

    /**
     * Function to execute when the notebook is opened and selected
     *
     * @param callback
     */
    notebook_focus(callback:Function):void {}

    /**
     * Execute the callback when the current kernel is ready
     *
     * @param current
     * @param callback
     */
    kernel_ready(current:any, callback:Function):void {}

    /**
     * Execute the callback every time the kernel is changed or restarts
     *
     * @param current
     * @param callback
     */
    kernel_changed(current:any, callback:Function):void {
        // FIXME: Global Jupyter variable may not be accessible in newer version of voila
        (window as any).Jupyter.notebook.events.on('kernel_ready.Kernel', () => {
            callback((window as any).Jupyter.notebook);
        });
    }

    /**
     * Send the provided code to the kernel
     *
     * @param notebook
     * @param code
     */
    execute_code(notebook:any, code:string):void {
        // FIXME: Global Jupyter variable may not be accessible in newer version of voila
        (window as any).Jupyter.notebook.kernel.execute(code)
    }

    /**
     * Create a new comm
     *
     * @param current
     * @param name
     * @param callback
     */
    create_comm(current:any, name:string, callback:Function):any {
        // FIXME: Global Jupyter variable may not be accessible in newer version of voila
        let comm = (window as any).Jupyter.notebook.kernel.comm_manager.new_comm(name);
        comm.on_msg(callback);
        return comm;
    }
}