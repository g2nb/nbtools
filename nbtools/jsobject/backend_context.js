//define("jsobject", [], function(require) {
    var utils = require('base/js/utils');
    var IPython = require('base/js/namespace');
    
    // Utils
    var make_guid = utils.uuid;
    var get_msg_cell = IPython.notebook.get_msg_cell;
    var is_immutable = function(x) { return !(x instanceof Object); };
    var proxy = function(f, c) { return function() { f.apply(c, arguments); }; };

    /**
     * Class that represents a Python runtime context.
     *
     * @constructor
     * @param {Comm} comm - communication object
     */
    var BackendContext = function(comm) {
        this.call_count = 0;
        this.results_cache = {};
        this.last_cell = null;
        this.comm = comm;
        this.instance_register = {}; // Maps GUIDs to instances

        this.comm.on_msg(proxy(this._handle_comm_msg, this));
    };

    /**
     * Sends a message to the back-end.
     *
     * @param {dictionary} original_msg - Back-end message that this message is 
     *      in response to
     * @param {dictionary} content - Content of the message
     */
    BackendContext.prototype._send = function(original_msg, content) {
        // Use the original message to map the message to the correct cell.
        var cell = get_msg_cell(original_msg.parent_header.msg_id) || this.last_cell;
        this.last_cell = cell;

        // Create callbacks for the cell if it exists and is a code cell (has output).
        var handle_output = null;
        var handle_clear_output = null;
        if (cell && cell.output_area) {
            handle_output = proxy(cell.output_area.handle_output, cell.output_area);
            handle_clear_output = proxy(cell.output_area.handle_clear_output, cell.output_area);
        }

        // Create a callbacks dictionary with the correct cell information.
        var callbacks = {
            iopub : {
                output : handle_output,
                clear_output : handle_clear_output,
            },
        };

        // Send the message.
        this.comm.send(content, callbacks);
    };

    /**
     * Sends a response to a message.
     *
     * @param {dictionary} original_msg - Back-end message that this message is 
     *      in response to
     * @param {integer} index - Index of the back-end message
     * @param {Object} results - Optional, object to be serialized
     */
    BackendContext.prototype._send_response = function(original_msg, index, results) {
        if (results === undefined) {
            results = null;
        }
        this._send(original_msg, this.serialize(index, results));
    };

    /**
     * Handle a comm message
     *
     * @param {dictionary} msg - Back-end message
     */
    BackendContext.prototype._handle_comm_msg = function(msg) {
        var data = msg.content.data;

        switch(data.method) {
            // Get an attribute
            case 'getattr':
                if (data.parent === '') {
                    this._send_response(msg, data.index, window[data.child]);
                } else {
                    this._send_response(msg, data.index, this.instance_register[data.parent][data.child]);
                }
                break;

            // Set an attribute
            case 'setattr':
                if (data.parent === '') {
                    window[data.child] = this._deserialize(msg, data.value);
                } else {
                    this.instance_register[data.parent][data.child] = this._deserialize(msg, data.value);
                }
                this._send_response(msg, data.index, true);
                break;

            // Return results from a call
            case 'return':
                var index = data.index;
                var results = data.results;
                this.results_cache[index] = results;
                break;

            // Invoke a call
            case 'apply':
                var parent = window;

                if (data.parent !== '') {
                    parent = this.instance_register[data.parent];
                }
                var instance = this.instance_register[data.function];
                this._send_response(msg, data.index, instance.apply(parent, this._deserialize_array(msg, data.args)));
                break;
        }
    };

    /**
     * Serializes an object in response to an indexed message from the
     * back-end.
     *
     * @param {integer} index - Index of the back-end message
     * @param {Object} results - Object to be serialized
     */
    BackendContext.prototype.serialize = function(index, results) {
        var response = null;
        if (is_immutable(results)) {
            response = {
                index: index,
                immutable: true,
                value: results
            };
        } else {
            response = {
                index: index,
                immutable: false,
                value: this._get_guid(results)
            };
        }
        return response;
    };

    /**
     * Deserializes an object from the back-end.
     *
     * If the value is immutable, a copy of it is made which is the same
     * as the copy on the Python side.  If a copy is mutable, a proxy
     * object is created to represent that object.
     *
     * @param {dictionary} original_msg - Back-end message that this message is 
     *      in response to
     * @param {dictionary} x - Serialized object from the back-end.
     */
    BackendContext.prototype._deserialize = function(original_msg, x) {
        var obj;
        if (x.immutable) {
            obj = x.value;
        } else {
            obj = this.instance_register[x.value];
        }

        // If the object is callable, make the Javascript representation
        // of it callable.  Create a callback that sends a message back 
        // to Python to invoke the call.
        if (x.callback) {
            var that = this;
            var callback = function() {

                // Serialize each argument in the call.
                var serialized = [];
                for (var i = 0; i < arguments.length; i++) {
                    serialized.push(that.serialize(that.call_count, arguments[i])); 
                }
                
                // Send call message.
                that._send(original_msg, {
                    'callback': x.callback,
                    'index': that.call_count++,
                    'arguments': serialized});

                // TODO: Synchronous wait, return the value here.
                return null; 
            };

            // If there is nothing to deserialize other than the function,
            // just return the function.
            if (obj === null || obj === undefined) {
                return callback;
            } else {

                // Make the object callable!
                Object.setPrototypeOf(obj, Object.getPrototypeOf(callback));
                Object.setPrototypeOf(callback, obj);
                return callback;
            }

        }
        return obj;
    };

    /**
     * Deserializes an array of objects from the back-end.
     *
     * @param {dictionary} original_msg - Back-end message that this message is 
     *      in response to
     * @param {dictionary} x - Serialized object array from the back-end.
     */
    BackendContext.prototype._deserialize_array = function(original_msg, x) {
        var values = [];
        for (var i = 0; i < x.length; i++) {
            values.push(this._deserialize(original_msg, x[i]));
        }
        return values;
    };

    /**
     * Get a GUID that represents a Javascript object. 
     *
     * @param {Object} instance - Object instance to get a GUID for
     */
    BackendContext.prototype._get_guid = function(instance) {
        if (instance._guid === undefined || this.instance_register[instance._guid] !== instance) {
            var guid = make_guid();
            instance._guid = guid;
            this.instance_register[guid] = instance;
        }
        return instance._guid;
    };

    // Register a comm handler for the browser context.
    console.log('ran!');
    if (IPython && 
        IPython.notebook && 
        IPython.notebook.kernel && 
        IPython.notebook.kernel.comm_manager) {
        IPython.notebook.kernel.comm_manager.register_target('BrowserContext', function (comm, msg) {
            var backend_context = new BackendContext(comm);
        });    
    } 
// });