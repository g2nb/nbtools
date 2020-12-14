import { hide, show, toggle } from "./utils";
import { INotebookTracker } from "@jupyterlab/notebook";
import { CodeCell } from "@jupyterlab/cells";
import { JupyterFrontEnd } from "@jupyterlab/application";
import { ToolRegistry } from "./registry";

export class ContextManager {
    static _context:Context;
    static jupyter_app:JupyterFrontEnd;
    static notebook_tracker:INotebookTracker|null;
    static tool_registry:ToolRegistry;

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
     * Toggle hiding or or showing the code for the specified cell
     *
     * @param {HTMLElement} element
     * @param {boolean} display
     */
    abstract toggle_code(element: HTMLElement, display?: boolean): void;

    /**
     * Execute the indicated cell in the notebook
     *
     * @param cell
     */
    abstract run_cell(cell?: any): void;

    /**
     * Execute all cells with nbtools widgets in the current notebook
     */
    abstract run_tool_cells(): void;

    /**
     * Returns a path to the active notebook, relative to the top directory
     */
    abstract notebook_path(): string

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
            else if (display === false) hide(input_block);
            else toggle(input_block);
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
        const cell_element = element.closest(".cell");
        if (!cell_element) return; // Widget has not yet been added to the DOM

        const code = (cell_element as any).querySelector(".input");

        // Set display to toggle if not specified
        if (!!display) show(code);
        else if (display === false) hide(code);
        else toggle(code);
    }

    /**
     * Execute the indicated cell in the notebook
     *
     * @param cell
     */
    run_cell(cell:any) {
        (window as any).Jupyter.notebook.execute(cell);
    }

    /**
     * Execute all cells with nbtools widgets in the current notebook
     */
    run_tool_cells() {
        (window as any).Jupyter.notebook.get_cells().forEach((cell:any) => {
            if (this.is_tool_cell(cell)) this.run_cell(cell);
        });
    }

    notebook_path():string {
        return (window as any).Jupyter.notebook.path;
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
}