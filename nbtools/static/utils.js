/**
 * Module for managing the cell matadata used by nbtools
 *
 */
define("nbtools/utils", ["base/js/namespace",
                         "nbextensions/jupyter-js-widgets/extension",
                         "jquery",
                         "nbextensions/nbtools/nbtools"], function (Jupyter, widgets, $) {

    /**
     * Double-check to make sure the cell renders and re-execute if it did not
     *
     * @param cell
     */
    function ensure_rendering(cell) {
        setTimeout(function() {
            if (cell.element.find(".nbtools-widget").length === 0) cell.execute();
        }, 1000);
    }

    /**
     * Get the index of the specified cell
     *
     * @param cell
     * @returns {*}
     */
    function cell_index(cell) {
        return Jupyter.notebook.get_cell_elements().index(cell.element);
    }

    /**
     * Converts a raw parameter name to a displayable format
     * @param name
     */
    function display_name(name) {
        let display_name = name;
        display_name = display_name.replace(/\./g,' ');
        display_name = display_name.replace(/_/g,' ');
        return display_name;
    }

    /**
     * Get all files linked from markdown cells with the nbtools-file class on the <a> tag
     *
     * Returns a dict of files with the file linked text as the key and the URL as the value.
     */
    function markdown_files() {
        const file_dict = {};

        const markdown_cells = $(".cell.text_cell");
        markdown_cells.each(function(i, cell) {
            const file_links = $(cell).find("a.nbtools-markdown-file");
            file_links.each(function(j, link) {
                file_dict[$(link).text()] = $(link).attr("href");
            });
        });

        return file_dict;
    }

    /**
     * Return a list of output files that match the indicated kind
     *
     * @param kinds
     * @returns {Array}
     */
    function output_files_by_kind(kinds) {
        const matches = [];
        let kind_list = kinds;

        // Handle the special case of * (match all)
        const match_all = kinds === "*";

        // If passing in a single kind as a string, wrap it in a list
        if (typeof kinds === 'string') {
            kind_list = [kinds];
        }

        // For each out file, see if it is the right kind
        $(".nbtools-widget-job-output-file").each(function(index, output) {
            const kind = $(output).data("kind");
            if (match_all || kind_list.indexOf(kind) >= 0) {
                const job_desc = $(output).closest(".nbtools-widget").find(".nbtools-widget-job-task").text().trim();
                matches.push({
                    name: $(output).text().trim(),
                    url: $(output).attr("href"),
                    job: job_desc
                });
            }
        });

        return matches;
    }

    function is_url(path_or_url) {
        const url_exp = new RegExp('^(?:http|ftp)s?://');
        return url_exp.test(path_or_url);
    }

    /**
     * Return references to the Metadata Manager functions
     */
    return {
        ensure_rendering: ensure_rendering,
        cell_index: cell_index,
        display_name: display_name,
        markdown_files: markdown_files,
        output_files_by_kind: output_files_by_kind,
        is_url: is_url
    };
});