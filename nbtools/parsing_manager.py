from IPython import get_ipython


class ParsingManager:
    """Parse parameter inputs for supported syntax"""

    @staticmethod
    def parse_value(value):
        """Test each form of supported syntax and return value"""
        if ParsingManager._is_pass_by_value(value):
            return ParsingManager._extract_pass_by_value(value)
        elif ParsingManager._is_force_string(value):
            return ParsingManager._extract_force_string(value)
        elif ParsingManager._is_var_ref(value):
            return ParsingManager._extract_var_ref(value)
        else:
            return value

    @staticmethod
    def _is_pass_by_value(value):
        """Is this a pass by value reference?"""
        if not type(value) == str:  # Not a string, not pass by value
            return False

        trimmed_value = value.strip()  # Ignore leading or trailing whitespace
        return trimmed_value.startswith("{{") and trimmed_value.endswith("}}")  # Test moustache syntax

    @staticmethod
    def _is_force_string(value):
        """Is this a forced string literal?"""
        if not type(value) == str:  # Not a string, not a forced string
            return False

        trimmed_value = value.strip()  # Ignore leading or trailing whitespace
        if trimmed_value.startswith("'") and trimmed_value.endswith("'"):  # Test single quotes
            return True
        elif trimmed_value.startswith('"') and trimmed_value.endswith('"'):  # Test double quotes
            return True
        else:
            return False

    @staticmethod
    def _is_var_ref(value):
        """Is the value the name of a global variable?"""
        if not type(value) == str: return False  # Not a string, not a variable ref
        trimmed_value = value.strip()  # Ignore leading or trailing whitespace

        return trimmed_value in get_ipython().user_global_ns

    @staticmethod
    def _extract_pass_by_value(value):
        """Return the value of a pass by value string"""

        # Remove leading and trailing whitespace, then remove the moustaches and inner whitespace
        trimmed_value = value.strip()[2:-2].strip()

        try:  # Attempt to retrieve variable reference
            var_ref = ParsingManager._extract_var_ref(trimmed_value)
            # Return the variable cast as a string
            return str(var_ref)
        except KeyError:  # If an error was encountered, just return the trimmed value
            return trimmed_value

    @staticmethod
    def _extract_force_string(value):
        """Return the string of a forced string literal"""
        # Remove leading and trailing whitespace, then remove enclosing quotes
        return value.strip()[1:-1]

    @staticmethod
    def _extract_var_ref(value):
        """Look up variable by name and return a reference"""
        trimmed_value = value.strip()  # Ignore leading or trailing whitespace
        if trimmed_value in get_ipython().user_global_ns:
            return get_ipython().user_global_ns[trimmed_value]
        else:
            raise KeyError('Unknown global variable')
