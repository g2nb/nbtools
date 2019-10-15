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