import inspect
from .tool_manager import ToolManager

# try:
#     path = os.path.join(os.path.expanduser('~'), "capsules.py")      # Specify path relative to home directory
#     spec = importlib.util.spec_from_file_location("capsules", path)  # Create module spec from path
#     capsules = importlib.util.module_from_spec(spec)                 # Create a new module based on spec
#     spec.loader.exec_module(capsules)                                # Executes the module in its own namespace
# except: pass                                                         # Ignore if capsules.py is not found


def write_capsules_file(filename='capsules.py'):
    # Assume nbtools import
    capsule_text = 'import nbtools\nfrom nbtools import build_ui\n\n'

    # Find capsules, add source to text
    for tool in ToolManager.instance().list():
        if tool.origin == 'capsules':
            tool_source = inspect.getsource(tool.function_or_method)
            capsule_text += 'try:\n    ' + tool_source.strip().replace('\n', '\n    ') + '\nexcept: pass\n\n'

    # Write to file
    with open(filename, 'w') as f:
        f.write(capsule_text)
