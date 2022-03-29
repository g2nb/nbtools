// Entry point for the notebook bundle containing custom model definitions.
//
define(function () {
    "use strict";

    const base_path = document.querySelector('body').getAttribute('data-base-url') +
        'nbextensions/nbtools/';

    function load_css(url) {
        const link = document.createElement("link");
        link.type = "text/css";
        link.rel = "stylesheet";
        link.href = url;
        document.getElementsByTagName("head")[0].appendChild(link);
    }
    load_css(base_path + 'notebook.css');

    window['requirejs'].config({
        map: {
            '*': {
                '@g2nb/nbtools': 'nbextensions/nbtools/index',
            },
        }
    });

    // Load the toolbox
    require(['nbextensions/nbtools/toolbox'], function() {
        require(['nbtools/toolbox'], function(toolbox) {
            toolbox.init();
        })
    });

    // Export the required load_ipython_extension function
    return {
        load_ipython_extension: function () {
        }
    };
});
