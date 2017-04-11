import time
from IPython import get_ipython

ip = get_ipython()


class SimplePromise(object):
    """Simple Promise implementation.
    Only capable of resolving."""

    def __init__(self):
        """Constructor"""
        self._cached = None
        self._callback = None

    def __call__(self, callback):
        """Calling the promise is an alias for `then`"""
        self.then(callback)

    def then(self, callback):
        """Register a callback to execute when the promise is resolved."""
        self._callback = callback
        self._try_then()

    def resolve(self, *pargs, **kwargs):
        """Resolve the promise."""
        self._cached = (pargs, kwargs)
        self._try_then()

    def _try_then(self):
        """Check to see if self has been resolved yet, if so invoke then."""
        if self._cached is not None and self._callback is not None:
            self._callback(*self._cached[0], **self._cached[1])

    def wait_for(self, timeout=3000):
        """Hault execution until self resolves."""
        results = [None]
        results_called = [False]

        def results_callback(val):
            results[0] = val
            results_called[0] = True

        self.then(results_callback)

        start = time.time()
        while not results_called[0]:
            if time.time() - start > timeout / 1000.:
                raise Exception('Timeout of %d ms reached' % timeout)
            ip.kernel.do_one_iteration()
        return results[0]