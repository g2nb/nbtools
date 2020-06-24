class EventManager(object):
    _instance = None                             # EventManager singleton

    @staticmethod
    def instance():
        if EventManager._instance is None:
            EventManager._instance = EventManager()
        return EventManager._instance

    def __init__(self):
        self.events = {}                         # A map of event names -> list of registered callbacks

    def register(self, event, callback):
        """Register an event callback with the event manager"""
        # Lazily create empty list of callbacks
        if event not in self.events:  self.events[event] = []

        self.events[event].append(callback)      # Add callback to the list

    def dispatch(self, event, data=None):
        """Dispatch an event to trigger registered callbacks"""
        if event in self.events:                 # If callbacks are registered for this event
            for callback in self.events[event]:  # Loop over each registered callback
                callback(data=data)              # Run the callback, passing in the provided data
