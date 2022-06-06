import builtins
import re
import urllib
import requests
import threading


def open(path_or_url):
    """
    Wrapper for opening an IO object to a local file or URL

    :param path_or_url:
    :return:
    """
    is_url = re.compile(
        r'^(?:http|ftp)s?://'  # http:// or https://
        r'(?:(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+(?:[A-Z]{2,6}\.?|[A-Z0-9-]{2,}\.?)|'  # domain...
        r'localhost|'  # localhost...
        r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})'  # ...or ip
        r'(?::\d+)?'  # optional port
        r'(?:/?|[/?]\S+)$', re.IGNORECASE)

    if re.match(is_url, path_or_url):
        return urllib.request.urlopen(path_or_url)
    else:
        return builtins.open(path_or_url)


def python_safe(raw_name):
    """Make a string safe to use in a Python namespace"""
    return re.sub('[^0-9a-zA-Z]', '_', raw_name)


def usage_tracker(event_token, description='', endpoint='https://workspace.g2nb.org/services/usage/'):
    """We maintain a basic counter of how many times our tools are used; this helps us secure funding.
       No identifying information is sent."""

    # Call the usage tracker endpoint, don't break aything if there is any kind of error at all
    def make_request_async():
        try: requests.get(f'{endpoint}{event_token}/', data=description)
        except: pass

    # Ping the usage tracker in its own thread, so as not to make the user wait
    usage_thread = threading.Thread(target=make_request_async)
    usage_thread.start()
