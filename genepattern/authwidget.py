import gp
from nbtools import UIBuilder, ToolManager, NBTool
from.sessions import session


GENEPATTERN_SERVERS = {
    'GenePattern Cloud': 'https://cloud.genepattern.org/gp/',
    'Indiana University': 'https://cloud.genepattern.org/gp/',
    'Broad Internal': 'https://cloud.genepattern.org/gp/',
    'Custom Server': 'https://cloud.genepattern.org/gp/'
}


class GPAuthWidget(UIBuilder):
    """A widget for authenticating with a GenePattern server"""
    def __init__(self, session=None, **kwargs):
        # Assign the session object, lazily creating one if needed
        if session is None: self.session = gp.GPServer('', '', '')
        else: self.session = session

        # Check to see if the provided session has valid credentials
        if self.has_credentials() and self.validate_credentials():
            self.register_session()
            self.display_system_message()

        # If not, prompt the user to login
        else:
            # Apply the display spec
            for key, value in self.display_spec.items(): kwargs[key] = value

            # Call the superclass constructor with the spec
            UIBuilder.__init__(self, self.login, **kwargs)

    # The display values for building the login UI
    display_spec = {
        'name': 'Login',
        'parameters': {
            'server': {
                'name': 'GenePattern Server',
                'type': 'choice',
                'default': GENEPATTERN_SERVERS['GenePattern Cloud'],
                'choices': GENEPATTERN_SERVERS
            },
            'username': {
                'name': 'Username'
            },
            'password': {
                'name': 'Password',
                'type': 'password'
            }
        }
    }

    def login(self, server, username, password):
        """Login to the GenePattern server"""
        # Assign login values to session
        self.session.url = server
        self.session.username = username
        self.session.password = password

        # Validate the provided credentials
        if self.validate_credentials():
            self.register_session()
            self.display_system_message()

        # If not valid, continue to prompt user
        else:
            self.login_error()

    def has_credentials(self):
        """Test whether the session object is instantiated and whether a username and password have been provided"""
        if type(self.session) is not gp.GPServer: return False  # Test type
        if not self.session.url: return False                   # Test server url
        if not self.session.username: return False              # Test username
        if not self.session.password: return False              # Test password
        return True

    def validate_credentials(self, cache_tasks=True):
        self.session.get_task_list()

        # TODO: Implement
        return False

    def register_session(self):
        # TODO: Implement
        pass

    def display_system_message(self):
        # TODO: Implement
        pass

    def login_error(self):
        # TODO: Implement
        pass


class AuthenticationTool(NBTool):
    """Tool wrapper for the authentication widget"""
    origin = '+'
    id = 'authentication'
    name = 'GenePattern Login'
    description = 'Login to the GenePattern server'
    load = lambda x: GPAuthWidget()


# Register the authentication widget
ToolManager.instance().register(AuthenticationTool())


# TODO: - Handle custom servers
#       - GenePattern color scheme
#       - Display URL of server in status bar
#       - Rename "run" to Login to GenePattern
#       - Add Registration button
#       - Hide description & first Run button
#       - Automatically load the auth tool when a notebook is opened
#       - Detect whether nbtools & genepattern have been imported in the notebook
# TODO:
#       - OAuth2 login
#       - Cache task list
#       - Register tasks as widgets
#       - Get & display system message
#       - Handle login errors
