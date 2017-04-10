import json
import os
import uuid

from IPython.display import display, Javascript
from ipykernel.comm import Comm

from .utils import SimplePromise

callback_registry = {}  # Maps GUIDs to callbacks
object_registry = {}  # Maps GUIDs to instances


class JSObject(object):
    """Represents a front-end Javascript object."""

    def __init__(self, context=None, jsid=''):
        """Constructor"""
        if context is None:
            context = BrowserContext()
        self.__dict__['_context'] = context
        self.__dict__['_jsid'] = jsid
        self.__dict__['_last_jsid'] = ''

    def __getattr__(self, name):
        """Get attribute"""
        results = self._context.deserialize(self._context.getattr(self._jsid, name).wait_for())
        if isinstance(results, JSObject):
            results.__dict__['_last_jsid'] = self._jsid
        return results

    def __setattr__(self, name, value):
        """Set attribute"""
        results = self._context.setattr(self._jsid, name, self._context.serialize(value)).wait_for()
        if not results['value']:
            raise Exception('Set attribute failed.')

    def __call__(self, *pargs):
        """Call"""
        args = [self._context.serialize(p) for p in pargs]
        return self._context.deserialize(self._context.apply(self._last_jsid, self._jsid, *args).wait_for())


class BrowserContext(object):
    """Represents an in-browser context."""

    def __init__(self):
        """Constructor"""
        self._calls = 0
        self._callbacks = {}

        # Push the Javascript to the front-end.
        with open(os.path.join(os.path.split(__file__)[0], 'backend_context.js'), 'r') as f:
            display(Javascript(data=f.read()))

        # Open communication with the front-end.
        self._comm = Comm(target_name='BrowserContext')
        self._comm.on_msg(self._on_msg)

    def _on_msg(self, msg):
        """Handle messages from the front-end"""
        data = msg['content']['data']

        # If the message is a call invoke, run the function and send
        # the results.
        if 'callback' in data:
            guid = data['callback']
            callback = callback_registry[guid]
            args = data['arguments']
            args = [self.deserialize(a) for a in args]
            index = data['index']

            results = callback(*args)
            return self.serialize(self._send('return', index=index, results=results))

        # The message is not a call invoke, it must be an object
        # that is a response to a Python request.
        else:
            index = data['index']
            immutable = data['immutable']
            value = data['value']
            if index in self._callbacks:
                self._callbacks[index].resolve({
                    'immutable': immutable,
                    'value': value
                })
                del self._callbacks[index]

    def serialize(self, obj):
        """Serialize an object for sending to the front-end."""
        if hasattr(obj, '_jsid'):
            return {'immutable': False, 'value': obj._jsid}
        else:
            obj_json = {'immutable': True}
            try:
                json.dumps(obj)
                obj_json['value'] = obj
            except:
                pass
            if callable(obj):
                guid = str(uuid.uuid4())
                callback_registry[guid] = obj
                obj_json['callback'] = guid
            return obj_json

    def deserialize(self, obj):
        """Deserialize an object from the front-end."""
        if obj['immutable']:
            return obj['value']
        else:
            guid = obj['value']
            if not guid in object_registry:
                instance = JSObject(self, guid)
                object_registry[guid] = instance
            return object_registry[guid]

    # Message types
    def getattr(self, parent, child):
        return self._send('getattr', parent=parent, child=child)

    def setattr(self, parent, child, value):
        return self._send('setattr', parent=parent, child=child, value=value)

    def apply(self, parent, function, *pargs):
        return self._send('apply', parent=parent, function=function, args=pargs)

    def _send(self, method, **parameters):
        """Sends a message to the front-end and returns a promise."""
        msg = {
            'index': self._calls,
            'method': method,
        }
        msg.update(parameters)

        promise = SimplePromise()
        self._callbacks[self._calls] = promise

        self._calls += 1
        self._comm.send(msg)

        return promise