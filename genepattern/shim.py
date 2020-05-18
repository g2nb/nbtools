from io import StringIO
from html.parser import HTMLParser

import requests
import urllib.parse


def login(session):
    safe_url = ensure_safe_url(session.url)
    safe_username = urllib.parse.quote(session.username)
    safe_password = urllib.parse.quote(session.password)

    url = f"{safe_url}/rest/v1/oauth2/token?grant_type=password&username={safe_username}&password={safe_password}&client_id=GenePatternNotebook-{safe_username}"
    response = requests.post(url)

    try:
        response.raise_for_status()
        return response.json()['access_token']
    except requests.exceptions.Timeout:
        raise TimeoutError('Connection timed out attempting to contact GenePattern server')
    except requests.exceptions.TooManyRedirects:
        raise TimeoutError('Bad GenePattern server URL')
    except requests.exceptions.RequestException as e:
        raise TimeoutError('Invalid username or password')


def system_message(session):
    safe_url = ensure_safe_url(session.url)
    url = f"{safe_url}/rest/v1/config/system-message"
    response = requests.get(url)
    return strip_html(response.text)


class HTMLStripper(HTMLParser):
    """Parse HTML blob and strip out all tags"""
    def __init__(self):
        super().__init__()
        self.reset()
        self.strict = False
        self.convert_charrefs = True
        self.text = StringIO()

    def error(self, message):
        pass

    def handle_data(self, d):
        self.text.write(d)

    def get_data(self):
        return self.text.getvalue()


def strip_html(html):
    """Strip potentially unsafe HTML from the system message string"""
    s = HTMLStripper()
    s.feed(html)
    return s.get_data()


def ensure_safe_url(url):
    """Ensure the GenePattern URL ends with /gp"""
    if url.endswith('/'):
        url = url[:-1]
    if not url.endswith('/gp'):
        url += '/gp'
    return url
