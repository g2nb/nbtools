# WYSIWYG Editing

The WYSIWYG Editor allows a user to format notes and documentation in a notebook in much the same way that one might use Microsoft Word or Libre Office —
without the need to write a single HTML tag or line of markdown.

## Installation

NBTools' accompanying HTML/markdown WYSIWYG editor is distributed in its own package: [jupyter-wysiwyg](https://github.com/genepattern/jupyter-wysiwyg). It can
be installed through either PIP or conda.

> pip install jupyter-wysiwyg

> conda install -c genepattern jupyter-wysiwyg

To enable the nbextension in Jupyter Notebook 5.2 and earlier you will need to run the following command lines. In Jupyter Notebook 5.3 and later, this is
automatic and will not be necessary.

> jupyter nbextension install --py jupyter_wysiwyg

> jupyter nbextension enable --py jupyter_wysiwyg


## Getting Started

To use the WYSIWYG Editor, first insert a markdown cell. Once a cell has been changed to the markdown type, two buttons should appear to the left of the cell.
The `</>` button opens the WYSIWYG Editor and the `>|` button finalizes the cell and renders the text.

Click the `</>` button and the editor will appear. A toolbar will show above the cell, allowing the user to format text, insert headers or add links. Style the
text as desired, and when finished, click the button to finish editing.