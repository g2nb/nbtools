define("nbtools/toolbox", ["base/js/namespace",
        "nbextensions/jupyter-js-widgets/extension",
        "jquery"], function (Jupyter, widgets, $) {

    /**
     * Initialize the Notebook Toolbox
     */
    function init() {
        // Add the toolbar button
        const action = {
            icon: 'fa-th',
            help    : 'Tools',
            help_index : 'zz',
            handler : function() {
                tool_dialog();
            }
        };
        const prefix = 'nbtools';
        const action_name = 'toolbox';

        const full_action_name = Jupyter.actions.register(action, action_name, prefix);
        Jupyter.toolbar.add_buttons_group([{
            'action': full_action_name,
            'id': 'nbtools-toolbar',
            'label': 'Tools'
        }]);

        // Add the label, if necessary (in Jupyter <= 5.0)
        const tool_button = $("#nbtools-toolbar");
        if (tool_button.text().indexOf("Tools") < 0) {
            tool_button.append(" Tools");
        }
    }

    function tool_button(id, name, origin, anno, desc, tags) {
        const tagString = tags.join(", ");
        return $("<div></div>")
            .addClass("well well-sm nbtools-tool")
            .attr("name", id)
            .attr("data-id", id)
            .attr("data-name", name)
            .attr("data-origin", origin)
            .append(
                $("<h4></h4>")
                    .addClass("nbtools-name")
                    .append(name)
            )
            .append(
                $("<h5></h5>")
                    .addClass("nbtools-anno")
                    .append(origin + (anno ? ", " + anno : anno))
            )
            .append(
                $("<span></span>")
                    .addClass("nbtools-desc")
                    .append(desc)
            )
            .append(
                $("<span></span>")
                    .addClass("nbtools-tags")
                    .append(tagString)
            );
    }

    function tab_exists(origin, toolbox) {
        return get_tab(origin, toolbox).length > 0;
    }

    function dom_encode(str) {
        return str.replace(/\W+/g, "_");
    }

    function add_tab(origin, toolbox) {
        // Check to see if the tab already exists
        const tab_id = "nbtools-" + dom_encode(origin);
        if (tab_exists(origin)) {
            console.log("WARNING: Attempting to add slider tab that already exists");
            return;
        }

        // Add the tab in the correct order
        const tabs = toolbox.find(".nav-tabs > li");
        let after_this = null;
        tabs.each(function(i, e) {
            const tab_name = $(e).find("a").attr("name");
            if (tab_name === "All") {
                after_this = $(e);
            }
            else if (tab_name < origin && tab_name !== "+") {
                after_this = $(e);
            }
            else if (origin === "+") {
                after_this = $(e);
            }
        });

        const new_tab = $("<li></li>").append(
            $("<a></a>")
                .attr("data-toggle", "tab")
                .attr("href", "#" + tab_id)
                .attr("name", origin)
                .text(origin)
        );
        if (origin === "All") tabs.parent().append(new_tab);
        else new_tab.insertAfter(after_this);

        // Add the content pane
        const contents = toolbox.find(".tab-content");
        contents.append(
            $("<div></div>")
                .attr("id", tab_id)
                .addClass("tab-pane")
        );
    }

    function get_tab(origin, toolbox) {
        const tab_id = "nbtools-" + dom_encode(origin);
        return toolbox ? toolbox.find("#" + tab_id) : $("#" + tab_id);
    }

    function sort_tools(tools) {
        tools.sort(function(a, b) {
            if (a.name.toLowerCase() > b.name.toLowerCase()) return 1;
            else if (a.name.toLowerCase() < b.name.toLowerCase()) return -1;
            else return 0;
        });
    }

    function update_toolbox(toolbox) {
        // Get the correct list divs
        const nbtools_div = toolbox.find("#nbtools-tabs");

        // Do we need to refresh the cache?
        const refresh = true;

        // Refresh the cache, if necessary
        if (refresh) {
            // Empty the list divs
            nbtools_div.find(".tab-content").children().empty();

            // Get the updated list of tools
            const tools = NBToolManager.list();

            // Sort the tools
            sort_tools(tools);

            // Add the tools to the lists
            tools.forEach(function(tool) {
                const t_button = tool_button(
                    tool.id,
                    tool.name,
                    tool.origin,
                    tool.version ? tool.version : "",
                    tool.description ? tool.description : "",
                    tool.tags ? tool.tags : []);

                // Render the tool
                const click_event = function() {
                    let cell = Jupyter.notebook.get_selected_cell();
                    const contents = cell.get_text().trim();

                    // Insert a new cell if the current one has contents
                    if (contents !== "") {
                        cell = Jupyter.notebook.insert_cell_below();
                        Jupyter.notebook.select_next();
                    }

                    // Check to see if nbtools needs to be imported
                    const import_line = NBToolManager.needs_import() ? 'import nbtools\n\n' : '';
                    const code = import_line + `nbtools.tool(id='${tool.id}', origin='${tool.origin}')`;

                    cell.set_text(code);
                    cell.execute();

                    // Scroll to the cell, if applicable
                    if (cell) {
                        $('#site').animate({
                            scrollTop: $(cell.element).position().top
                        }, 500);
                    }

                    // Close the toolbox dialog
                    $(".modal-dialog button.close").trigger("click");
                };

                // Attach the click
                t_button.click(click_event);

                // Does the origin div exist?
                const existing_tab = tab_exists(tool.origin, toolbox);

                // If it doesn't exist, create it
                if (!existing_tab) add_tab(tool.origin, toolbox);

                // Get the tab and add the tool
                get_tab(tool.origin, toolbox).append(t_button);

                // Add to the All Tools tab, if necessary
                if (tool.origin !== "All") {
                    const t_button_all = t_button.clone();
                    t_button_all.click(click_event);
                    get_tab("All", toolbox).append(t_button_all);
                }
            });
        }
    }

    function build_toolbox() {
        const toolbox = $("<div></div>")
            .attr("id", "nbtools")
            .css("height", $(window).height() - 200)

            // Append the filter box
            .append(
                $("<div></div>")
                    .attr("id", "nbtools-filter-box")
                    .append(
                        $("<input/>")
                            .attr("id", "nbtools-filter")
                            .attr("type", "search")
                            .attr("placeholder", "Type to Filter")
                            .keydown(function(event) {
                                event.stopPropagation();
                            })
                            .keyup(function() {
                                const search = $("#nbtools-filter").val().toLowerCase();
                                $.each($("#nbtools-tabs").find(".nbtools-tool"), function(index, element) {
                                    const raw = $(element).text().toLowerCase();
                                    if (raw.indexOf(search) === -1) {
                                        $(element).hide();
                                    }
                                    else {
                                        $(element).show();
                                    }
                                })
                            })
                    )
            )

            // Append the internal tabs
            .append(
                $("<div></div>")
                    .attr("id", "nbtools-tabs")
                    .addClass("tabbable")
                    .append(
                        $("<ul></ul>")
                            .addClass("nav nav-tabs")
                            .append(
                                $("<li></li>")
                                    .addClass("active")
                                    .append(
                                        $("<a></a>")
                                            .attr("data-toggle", "tab")
                                            .attr("href", "#nbtools-All")
                                            .attr("name", "All")
                                            .text("All Tools")
                                    )
                            )
                    )
                    .append(
                        $("<div></div>")
                            .addClass("tab-content")
                            .css("height", $(window).height() - 250)
                            .append(
                                $("<div></div>")
                                    .attr("id", "nbtools-All")
                                    .addClass("tab-pane active")
                            )
                    )
            );

        update_toolbox(toolbox);
        return toolbox;
    }

    function tool_dialog() {
        const dialog = require('base/js/dialog');
        dialog.modal({
            notebook: Jupyter.notebook,
            keyboard_manager: this.keyboard_manager,
            title : "Select Notebook Tool",
            body : build_toolbox(),
            buttons : {}
        });

        // Give focus to the search box
        setTimeout(function() {
            $("#nbtools-filter").focus();
        }, 200);
    }

    /**
     * Return the toolbox's public methods
     */
    return {
        init: init
    }
});