from nbtools import NBTool


class TaskTool(NBTool):
    """Tool wrapper for the authentication widget"""
    origin = 'GenePattern'
    id = 'LSID'
    name = 'GenePattern Task'
    description = 'Login to the GenePattern server'
    load = lambda x: 'Task widget placeholder'

    def __init__(self, server_name='GenePattern', task=None):
        NBTool.__init__(self)
        self.origin = server_name
        self.id = task.lsid
        self.name = task.name
        self.description = task.description
