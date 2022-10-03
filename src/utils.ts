/**
 * Send a browser notification
 *
 * @param message
 * @param sender
 * @param icon
 */
export function send_notification(message:string, sender:string = 'nbtools', icon:string = '') {
    // Internal function to display the notification
    function notification() {
        new Notification(sender, {
            body: message,
            badge: icon,
            icon: icon,
            silent: true
        });
    }

    // Browser supports notifications and permission is granted
    if ("Notification" in window && Notification.permission === "granted") {
        notification()
    }

    // Otherwise, we need to ask the user for permission
    else if ("Notification" in window && Notification.permission !== "denied") {
        Notification.requestPermission(function (permission) {
            // If the user accepts, let's create a notification
            if (permission === "granted") {
                notification()
            }
        });
    }
}

/**
 * Determines ia a given string is an absolute file path
 *
 * @param path_or_url
 * @returns {boolean}
 */
export function is_absolute_path(path_or_url:string) {
    let path_exp = new RegExp('^/');
    return path_exp.test(path_or_url);
}

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

export function get_absolute_url(url:string) {
    try { return new URL(url).href; }
    catch (e) { return new URL(url, document.baseURI).href; }
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
    return path.split('.').pop().trim();
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
 * @param elem
 * @param min_height
 */
export function hide(elem:HTMLElement, min_height='0') {
    elem.classList.add('nbtools-toggle');

	// Give the element a height to change from
	elem.style.height = elem.scrollHeight + 'px';

	// Set the height back to 0
	setTimeout(function () {
		elem.style.height = min_height;
	}, 10);

	// When the transition is complete, hide it
	setTimeout(function () {
		elem.classList.add('nbtools-hidden');
	}, 350);

}

/**
 * Toggle element visibility
 *
 * @param elem
 * @param min_height
 */
export function toggle(elem:HTMLElement, min_height='0') {
	// If the element is visible, hide it
	if (!elem.classList.contains('nbtools-hidden')) {
		hide(elem, min_height);
		return;
	}

	// Otherwise, show it
	show(elem);
}

export function process_template(template:string, template_vars:any) {
	Object.keys(template_vars).forEach((key_var) => {
		template = template.replace(new RegExp(`{{${key_var}}}`, 'g'), template_vars[key_var]);
	});

	return template;
}

export function pulse_red(element:HTMLElement, count:number=0, count_up:boolean=true) {
    setTimeout(() => {
        element.style.border = `rgba(255, 0, 0, ${count / 10}) solid ${Math.ceil(count / 2)}px`;
        if (count_up && count < 10) pulse_red(element, count+1, count_up);
        else if (count_up) pulse_red(element, count, false);
        else if (count > 0) pulse_red(element, count-1, count_up);
        else element.style.border = `none`;
    }, 25);
}