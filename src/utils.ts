/**
 * Decides if a string represents a valid URL or not
 *
 * @param path_or_url
 * @returns {boolean}
 */
export function is_url(path_or_url:string) {
    const url_exp = new RegExp('^(?:http|ftp)s?://');
    return url_exp.test(path_or_url);
}

/**
 * Extracts a file name from a URL
 *
 * @param path
 * @returns {*}
 */
export function extract_file_name(path:string) {
    if (is_url(path)) return path.split('/').pop();
    else return path;
}

/**
 * Extracts a file type from a path or URL
 *
 * @param {string} path
 * @returns {any}
 */
export function extract_file_type(path:string) {
    return path.split('.').pop();
}

/**
 * Wait until the specified element is found in the DOM and then execute a promise
 *
 * @param {HTMLElement} el
 */
export function element_rendered(el:HTMLElement) {
    return new Promise((resolve, reject) => {
        (function element_in_dom() {
            if (document.body.contains(el)) return resolve(el);
            else setTimeout(element_in_dom, 200);
        })();
    });
}

/**
 * Show an element
 *
 * @param {HTMLElement} elem
 */
export function show(elem:HTMLElement) {
	// Get the natural height of the element
	const getHeight = function () {
		elem.style.display = 'block'; // Make it visible
		const height = elem.scrollHeight + 'px'; // Get it's height
		elem.style.display = ''; //  Hide it again
		return height;
	};

	const height = getHeight(); // Get the natural height
	elem.classList.remove('nbtools-hidden'); // Make the element visible
	elem.style.height = height; // Update the height

	// Once the transition is complete, remove the inline height so the content can scale responsively
	setTimeout(function () {
		elem.style.height = '';
		elem.classList.remove('nbtools-toggle');
	}, 350);
}

/**
 * Hide an element
 *
 * @param {HTMLElement} elem
 */
export function hide(elem:HTMLElement) {
    elem.classList.add('nbtools-toggle');

	// Give the element a height to change from
	elem.style.height = elem.scrollHeight + 'px';

	// Set the height back to 0
	setTimeout(function () {
		elem.style.height = '0';
	}, 10);

	// When the transition is complete, hide it
	setTimeout(function () {
		elem.classList.add('nbtools-hidden');
	}, 350);

}

/**
 * Toggle element visibility
 *
 * @param {HTMLElement} elem
 */
export function toggle(elem:HTMLElement) {
	// If the element is visible, hide it
	if (!elem.classList.contains('nbtools-hidden')) {
		hide(elem);
		return;
	}

	// Otherwise, show it
	show(elem);
}
