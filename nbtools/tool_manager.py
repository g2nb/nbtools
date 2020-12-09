from IPython import get_ipython
from IPython.display import display
from ipykernel.comm import Comm
from ipywidgets import Output
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
        self.tools = {}   # Initialize the tools map
        self.comm = None  # The comm to communicate with the client

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
        self.send('update', {
            'import': 'nbtools' in get_ipython().user_global_ns,
            'tools': list(map(lambda t: t.json_safe(), self._list()))
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

        self.comm.send({
            "func": message_type,
            "payload": payload
        })

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

    @classmethod
    def list(cls):
        """
        Get the list of registered tools

        :return: list of tools
        """
        # return [t for t in o.values() for o in cls.instance().tools.values()]
        return cls.instance()._list()

    @classmethod
    def register(cls, tool_or_widget):
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
                cls.instance().send_update()

                # Dispatch the register event
                EventManager.instance().dispatch('nbtools.register', {
                    'origin': tool_or_widget.origin,
                    'id': tool_or_widget.id
                })
            else:
                raise ValueError("register() must be passed a tool with an instantiated origin and id")
        else:
            raise ValueError("register() must be passed an NBTool or UIBuilder object")

    @classmethod
    def unregister(cls, origin, id):
        """Unregister the tool with the associated id"""
        if cls.exists(id, origin):
            del cls.instance().tools['origin']['id']

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
        placeholder = UIOutput(name='Cannot find tool', error=f'Cannot find tool: {origin} | {id}')  # Placeholder widget
        output.append_display_data(placeholder)

        # Callback to see if the placeholder needs replaced after a new widget is registered
        def check_registration_callback(data):
            if 'origin' in data and 'id' in data and data['origin'] == origin and data['id'] == id:
                placeholder.close()
                with output: display(tool(id=id, origin=origin))

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
    load = lambda self: self

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


def tool(id, origin):
    nbtool = ToolManager.tool(id=id, origin=origin)
    if nbtool: return nbtool.load()
