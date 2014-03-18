define('feature/file-content/determine-language', [
    'underscore',
    'exports'
],
/**
 * Determines what language a file is written in from extension
 * or #! declaration.
 * *
 * @exports feature/file-content/determine-language
 */
function(
    _,
    exports
) {
    'use strict';

    var languageToMimeType = {
        bash: 'text/x-sh',
        c: 'text/x-csrc',
        coffeescript: 'text/x-coffeescript',
        cpp: 'text/x-c++src',
        cs: 'text/x-csharp',
        css: 'text/css',
        d: 'text/x-d',
        diff: 'text/x-diff',
        erlang: 'text/x-erlang',
        go: 'text/x-go',
        haskell: 'text/x-haskell',
        html: 'text/html',
        ini: 'text/x-toml',
        java: 'text/x-java',
        javascript: 'text/javascript',
        json: 'application/json',
        less: 'text/x-less',
        lisp: 'text/x-common-lisp',
        lua: 'text/x-lua',
        markdown: 'text/x-markdown',
        objectivec: 'text/x-csrc',
        perl: 'text/x-perl',
        php: 'application/x-httpd-php',
        python: 'text/x-python',
        ruby: 'text/x-ruby',
        sass: 'text/x-sass',
        scala: 'text/x-scala',
        sql: 'text/x-sql',
        tex: 'text/x-stex',
        vbscript: 'text/vbscript',
        xml: 'application/xml',
        yaml: 'text/x-yaml'
    };

    var knownLanguages = WRM.data('com.atlassian.stash.stash-web-plugin:source-view.syntax-highlighters') || {};
    var knownExtensions = {
        txt: 'text',
        log: 'text'
    };
    var knownExecutables = {};

    _.forEach(knownLanguages, function (config, lang) {
        _.forEach(config.e, function (ext) {
            knownExtensions[ext] = lang;
        });
        _.forEach(config.x, function (exe) {
            knownExecutables[exe] = lang;
        });
    });

    /**
     * Returns the language that corresponds to
     * a particular extension.
     *
     * @param {string} extension
     * @return {string} language
     */
    function fromExtension(extension) {
        return _.has(knownExtensions, extension) ? knownExtensions[extension] : 'text';
    }

    /**
     * Returns the language that corresponds to
     * a particular executable.
     *
     * @param {string} executable
     * @return {string} language
     */
    function fromExecutable(executable) {
        return _.has(knownExecutables, executable) ? knownExecutables[executable] : 'text';
    }

    /**
     * Returns the language that corresponds to
     * an executable declared by a #! in the first
     * line of a file.
     *
     * @param {string} line The first line of the file
     * @return {string} language
     */
    function fromFirstLine(line) {
        var pattern = /^#!(?:\/(?:usr\/)?(?:local\/)?bin\/([^\s]+))(?:\s+([^\s]+))?/;

        var match = pattern.exec(line);
        if (match) {
            var exe = match[1];
            if (exe === 'env') {
                exe = match[2];
            }
            return fromExecutable(exe);
        }

        return null;
    }

    /**
     * Returns either a MIME type or a language that corresponds
     * to a particular language depending on fileInfo.legacy.
     *
     * @param {Object} fileInfo Object with information about the file
     * @param {Object} fileInfo.firstLine The first line of the file
     * @param {string} fileInfo.path The path to the file
     * @param {boolean} fileInfo.legacy  Whether or not this uses legacy highlighter.js mappings
     * @return {string} MIME type
     */
    function fromFileInfo(fileInfo) {
        var filename = fileInfo.path;
        var extensionLocation = filename.lastIndexOf('.');

        var extension = extensionLocation === -1 ?
            filename : // file without an extension. May be Makefile or something similar
            filename.substring(extensionLocation + 1);

        var lang = fromExtension(extension) || (fileInfo.firstLine.length > 1 ? fromFirstLine(fileInfo.firstLine) : null);

        if (fileInfo.legacy) {
            return lang;
        }

        return languageToMimeType[lang] || 'text/plain';
    }

    exports.fromFileInfo = fromFileInfo;
});
