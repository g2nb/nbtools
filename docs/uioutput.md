# UI Output

UI Output is a widget that can be displayed to present a function's output in an interactive interface, similar to the UI Builder.

To use this widget a function's developer just needs to instantiate and display or return a `UIOutput` object. A code example is given below.

```
import nbtools
nbtools.UIOutput(name='Example Output', text='stdout or your choice of message can go here.')
```

## Parameters

The UI Output widget supports several parameters which can be used to provide content. They are:

* **Name:** Specifies the name of the UI Output widget.
* **Description:** Used to set the description that is displayed at the top of the widget.
* **Files:** An array of URLs or file paths. Used to integrate file outputs with the file input parameters found in the UI Builder.
* **Text:** Display the contents of this parameter as output text.
