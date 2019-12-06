export class ContextManager {
    static _context:Context|null = null;

    static context() {
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
        // TODO: Find a better way to determine this
        return !!document.querySelector("#main.jp-LabShell")
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
    abstract toggle_code(element:HTMLElement, display?:boolean): void;
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
        // TODO: Implement better event handling for this
        setTimeout(() => {
            let input_block = element.closest('.jp-Cell') as HTMLElement;
            if (input_block) input_block = input_block.querySelector('.jp-Cell-inputWrapper') as HTMLElement;

            // Set display to toggle if not specified
            if (display === undefined) display = input_block.style.display === "none";

            if (input_block) input_block.style.display = display ? "block" : "none";
        }, 100);
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
        const code = (element.closest(".cell") as any).querySelector(".input");
        const is_hidden = code.style.display === "none";

        // Show the code block
        if (is_hidden) code.style.display = "none";

        // Hide the code block
        else code.style.display = "block";
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
    toggle_code(element:HTMLElement, display?:boolean) { return; }
}