from IPython import get_ipython
from IPython.display import display
from ipywidgets import Output
from threading import Timer, Thread
from time import time
from .event_manager import EventManager
from .uioutput import UIOutput


class ToolManager(object):
    COMM_NAME = 'nbtools_comm'  # The name of the kernel <-> client comm
    _instance = None            # ToolManager singleton

    @staticmethod
    def instance():
        if ToolManager._instance is None:
            ToolManager._instance = ToolManager()
        return ToolManager._instance

    def __init__(self):
        self.tools = {}             # Initialize the tools map
        self.comm = None            # The comm to communicate with the client
        self.last_update = 0        # The last time the client was updated
        self.update_queued = False  # Waiting for an update?

        # Create the nbtools comm target
        def comm_target(comm, open_msg):
            # Handle messages sent to the comm target
            @comm.on_msg
            def receive(msg):
                data = msg['content']['data']
                if data['func'] == 'request_update':
                    self.send_update()
                else:
                    print('ToolManager received unknown message')

            # Keep a reference to the comm
            self.comm = comm

        # Register the comm target
        get_ipython().kernel.comm_manager.register_target(ToolManager.COMM_NAME, comm_target)

    def send_update(self):
        self.last_update = time()
        self.send('update', {
            'import': 'nbtools' in get_ipython().user_global_ns,
            'tools': list(map(lambda t: t.json_safe(), self._list())),
            'data': list(map(lambda d: d.json_safe(), DataManager.list())),
        })

    def send(self, message_type, payload):
        """
        Send a message to the comm on the client

        :param message_type:
        :param payload:
        :return:
        """
        # Protect against uninitialized comms
        if self.comm is None: return

        # Make a call to the comm in its own thread so that it doesn't block cell execution
        Thread(target=lambda: self.comm.send({ "func": message_type, "payload": payload })).start()

    def _list(self):
        """
        Get the list of registered tools

        :return: list of tools
        """
        tools = self.tools
        to_return = []
        for o in tools.values():
            for t in o.values():
                to_return.append(t)
        return to_return

    def update_stale(self):
        return self.last_update + 3 < time()

    def queue_update(self):
        def postponed_update():
            """Function to call once after a 3-second cool-off period"""
            self.send_update()
            self.update_queued = False

        # If no update is waiting, queue an update
        if not self.update_queued:
            wait = abs(self.last_update - time())
            timeout = Timer(3, postponed_update)
            self.update_queued = True
            timeout.start()

    @classmethod
    def list(cls):
        """
        Get the list of registered tools

        :return: list of tools
        """
        # return [t for t in o.values() for o in cls.instance().tools.values()]
        return cls.instance()._list()

    @classmethod
    def register_all(cls, tool_list, **kwargs):
        for tool in tool_list: cls.register(tool, skip_update=True, **kwargs)
        cls.instance().send_update()  # Notify the client of the registration

    @classmethod
    def register(cls, tool_or_widget, skip_update=False, **kwargs):
        """Register a NBTool or UIBuilder object"""
        if isinstance(tool_or_widget, NBTool):
            tools = cls.instance().tools
            if tool_or_widget.origin and tool_or_widget.id:
                # Lazily create the origin
                if tool_or_widget.origin not in tools:
                    tools[tool_or_widget.origin] = {}

                # Register the tool
                cls.instance().tools[tool_or_widget.origin][tool_or_widget.id] = tool_or_widget

                # Notify the client of the registration
                if not skip_update: cls.instance().send_update()

                # Dispatch the register event
                EventManager.instance().dispatch('nbtools.register', {
                    'origin': tool_or_widget.origin,
                    'id': tool_or_widget.id,
                    **kwargs
                })
            else:
                raise ValueError("register() must be passed a tool with an instantiated origin and id")
        else:
            raise ValueError("register() must be passed an NBTool or UIBuilder object")

    @classmethod
    def unregister(cls, origin, id):
        """Unregister the tool with the associated id"""
        if cls.exists(id, origin):
            del cls.instance().tools[origin][id]

            # Notify the client of the un-registration
            cls.instance().send_update()
        else:
            print(f'Cannot find tool to unregister: {origin} | {id}')

    @classmethod
    def tool(cls, id, origin='Notebook'):
        """
        Return reference to tool widget given the id and origin
        """
        if cls.exists(id, origin):
            return cls.instance().tools[origin][id]
        else:
            display(cls.create_placeholder_widget(origin, id))

    @classmethod
    def create_placeholder_widget(cls, origin, id):
        output = Output()                                                                            # Output widget
        placeholder = UIOutput(name='Tool not loaded', error=f'Tool not loaded: {origin} | {id}')  # Placeholder widget
        output.append_display_data(placeholder)

        # Callback to see if the placeholder needs replaced after a new widget is registered
        def check_registration_callback(data):
            if 'origin' in data and 'id' in data and data['origin'] == origin and data['id'] == id:
                placeholder.close()
                with output: display(tool(**data))

        # Register the callback with the event manager
        EventManager.instance().register("nbtools.register", check_registration_callback)
        return output

    @classmethod
    def exists(cls, id, origin):
        """Check if a tool for the provided id and origin exists"""
        tools = cls.instance().tools
        if origin in tools:
            if id in tools[origin]:
                return True
            else: return False
        else: return False


class NBTool:
    """
    Tool class, used to register new tools with the manager
    """
    origin = None
    id = None
    name = None
    description = None
    tags = None
    version = None
    load = lambda self, **kwargs: self.__class__(**kwargs)

    def __init__(self, **kwargs):
        for key, value in kwargs.items():
            setattr(self, key, value)

    def json_safe(self):
        return {
            'origin': self.origin,
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'tags': self.tags,
            'version': self.version
        }


def tool(id, origin, **kwargs):
    nbtool = ToolManager.tool(id=id, origin=origin)
    if nbtool:  # Call load() passing kwargs only if kwargs are accepted
        try: return nbtool.load(**kwargs)
        except TypeError: return nbtool.load()


class DataManager(object):
    _instance = None                # DataManager singleton

    def __init__(self):
        self.data_registry = {}     # Initialize the data map
        self.group_widgets = {}     # Initialize widgets for groups
        self.data_widgets = {}      # Initialize widgets for data

    @staticmethod
    def instance():
        if DataManager._instance is None:
            DataManager._instance = DataManager()
        return DataManager._instance

    @classmethod
    def list(cls):
        """
        Get the list of registered data

        :return: list of data
        """
        # return [t for t in o.values() for o in cls.instance().data_registry.values()]
        return cls.instance()._list()

    def _list(self):
        """
        Get the list of registered data

        :return: list of data
        """
        data = self.data_registry
        to_return = []
        for o in data.values():
            for t in o.values():
                to_return.append(t)
        return to_return

    @classmethod
    def filter(cls, **kwargs):
        """
        Get a filtered list of registered data

        :return: filtered list of data
        """
        return cls.instance()._filter(**kwargs)

    def _filter(self, **kwargs):
        """
        Get a filtered list of registered data

        :return: filtered list of data
        """
        def has_attributes(tool, kwargs):
            for kw in kwargs:
                # Special case for kinds list
                if kw == 'kinds':
                    if tool.kind not in kwargs['kinds']: return False
                    else: continue

                if not hasattr(tool, kw): return False
                if getattr(tool, kw) != kwargs[kw]: return False
            return True

        return [t for t in self._list() if has_attributes(t, kwargs)]

    def get(self, origin, uri):
        """Return data object matching origin and uri, return None if not found"""
        for d in self.list():
            if d.origin == origin and d.uri == uri:
                return d
        return None

    @classmethod
    def register_all(cls, data_list):
        for data in data_list: cls.register(data, skip_update=True)
        ToolManager.instance().send_update()  # Notify the client of the registration

    @classmethod
    def register(cls, data, skip_update=False):
        """Register Data object"""
        if isinstance(data, Data):
            data_registry = cls.instance().data_registry
            if data.origin and data.uri:
                # Lazily create the origin
                if data.origin not in data_registry:
                    data_registry[data.origin] = {}

                # Register the tool
                cls.instance().data_registry[data.origin][data.uri] = data

                # Notify the client of the registration
                if not skip_update: ToolManager.instance().send_update()

                # Dispatch the register event
                EventManager.instance().dispatch('nbtools.data_register', {
                    'origin': data.origin,
                    'group': data.group,
                    'id': data.uri
                })
            else:
                raise ValueError(f"register() must be passed a data object with an instantiated origin ({data.origin}) and uri ({data.uri})")
        else:
            raise ValueError("register() must be passed a Data object")

    @classmethod
    def unregister(cls, origin, uri):
        """Unregister the data with the associated id"""
        if cls.exists(uri, origin):
            del cls.instance().data_registry[origin][uri]

            # Notify the client of the un-registration
            ToolManager.instance().send_update()
        else:
            print(f'Cannot find data to unregister: {origin} | {uri}')

    @classmethod
    def exists(cls, uri, origin):
        """Check if a data object for the provided uri and origin exists"""
        data_registry = cls.instance().data_registry
        if origin in data_registry:
            if uri in data_registry[origin]:
                return True
            else: return False
        else: return False

    @classmethod
    def group_widget(cls, origin, group, widget=None):
        # Lazily add origin
        if origin not in cls.instance().group_widgets: cls.instance().group_widgets[origin] = {}

        # Set widget if present
        if widget:
            cls.instance().group_widgets[origin][group] = widget
            return

        # Return the widget
        if group not in cls.instance().group_widgets[origin]: return None
        else: return cls.instance().group_widgets[origin][group]() \
            if callable(cls.instance().group_widgets[origin][group]) else cls.instance().group_widgets[origin][group]

    @classmethod
    def data_widget(cls, origin, uri, widget=None):
        # Lazily add origin
        if origin not in cls.instance().data_widgets: cls.instance().data_widgets[origin] = {}

        # Set widget if present
        if widget:
            cls.instance().data_widgets[origin][uri] = widget
            return

        # Return the widget
        if uri not in cls.instance().data_widgets[origin]: return None
        else: return cls.instance().data_widgets[origin][uri]() \
            if callable(cls.instance().data_widgets[origin][uri]) else cls.instance().data_widgets[origin][uri]

    @classmethod
    def data(cls, origin='Notebook', group=None, uris=None, uri=None):
        """
        Return reference to data or group widget given the uri, group and origin
        """
        # Retrieve or create a group widget
        if group:
            group_widget = cls.instance().group_widget(origin=origin, group=group)
            if group_widget: return group_widget
            else:  # Otherwise, create a new UIOutput widget and return it
                if uris: return DataManager.create_placeholder_widget(origin=origin, name=group, files=uris)
                elif uri: return DataManager.create_placeholder_widget(origin=origin, name=group, files=[uri])
                else: return DataManager.create_placeholder_widget(origin=origin, name=group)

        # Does a registered data widget exist?
        data_widget = cls.instance().data_widget(origin=origin, uri=uri)
        if data_widget: return data_widget
        else:
            # If no group or data widget, wrap data in UIOutput for display
            if uris: return DataManager.create_placeholder_widget(origin=origin, name=f'Notebook Data | {origin}', files=uris)
            elif uri: return DataManager.create_placeholder_widget(origin=origin, name=f'Notebook Data | {origin}', files=[uri])

    @classmethod
    def create_placeholder_widget(cls, **kwargs):
        output = Output()                   # Output widget
        placeholder = UIOutput(**kwargs)    # Placeholder widget
        output.append_display_data(placeholder)

        # Callback to see if the placeholder needs replaced after a new widget is registered
        def check_refresh_callback(data):
            if 'group' in kwargs:
                group_widget = cls.instance().group_widget(origin=kwargs['origin'], group=kwargs['group'])
                if group_widget:
                    placeholder.close()
                    with output: display(group_widget)
            else:
                data_widget = cls.instance().data_widget(origin=kwargs['origin'], uri=kwargs['files'][0])
                if data_widget:
                    placeholder.close()
                    with output: display(data_widget)

        # Register the callback with the event manager
        EventManager.instance().register("nbtools.refresh_data", check_refresh_callback)
        return output


class Data:
    """
    Data class, used to register new data with the manager
    """
    origin = None
    group = None
    uri = None
    label = None
    kind = None
    icon = None
    load = lambda self, **kwargs: self.__class__(**kwargs)

    def __init__(self, **kwargs):
        for key, value in kwargs.items():
            setattr(self, key, value)

    def json_safe(self):
        return {
            'origin': self.origin,
            'group': self.group,
            'uri': self.uri,
            'label': self.label,
            'kind': self.kind,
            'icon': self.icon,
            'widget': self.origin in DataManager.instance().data_widgets and
                      self.uri in DataManager.instance().data_widgets[self.origin]
        }


def data(origin=None, group=None, uris=None, uri=None, **kwargs):
    return DataManager.data(origin=origin, group=group, uris=uris, uri=uri)
