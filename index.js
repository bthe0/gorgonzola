(function() {
    'use strict';

    var g = {};

    g.map = function map(arr, cb) {
        if (!Array.isArray(arr)
            && !(arr instanceof NodeList)) {
            return cb(arr);
        }

        var result = [];

        for(var i = 0, len = arr.length ; i < len; i++) {
            result.push(cb(arr[i]));
        }

        return result;
    };

    g.el = function el(sel) {
        var els = document.querySelectorAll(sel);
        return els.length === 1 ? els[0] : els;
    };

    g.classes = function classes(sel, classes) {
        if (!classes) {
            return g.el(sel).className;
        }

        g.el(sel).className = classes;
    };

    g.remove = function remove(sel) {
        return g.map(g.el(sel), function(el) {
            el.parentNode.removeChild(el);
        });
    };

    g.html = function html(sel, html) {
        var el = g.el(sel);

        if (!html) {
            return el.innerHTML;
        }

        el.innerHTML = html;
    };

    g.text = function text(sel, text) {
        var el = g.el(sel);

        if (!text) {
            return el.innerText;
        }

        el.innerText = text;
    };

    g.append = function append(sel, html) {
        g.html(sel, g.html(sel) + html);
    };

    g.prepend = function prepend(sel, html) {
        g.html(sel, html + g.html(sel));
    };

    g.setup = function setup(options) {
        if (!g.settings) {
            g.settings = {};
        }

        g.settings = Object.assign(g.settings, options);
    };

    g.req = function req(method, url, data, cb) {
        var req = new XMLHttpRequest();
        var baseUrl = g.get('baseUrl', g.settings, '');
        var timeout = g.get('timeout', g.settings, false);
        var headers = g.get('headers', g.settings, {});

        url = baseUrl ? baseUrl + '/' + url : url;

        if (method === 'get' && data) {
            var qs = Object.keys(data).map(function(key) {
                return key + "=" + encodeURIComponent(data[key])
            }).join("&");
            url = [url, '?', qs].join('');
        }

        req.open(method.toUpperCase(), url, true);
        req.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8');

        for (var key in headers) {
            req.setRequestHeader(key, headers[key]);
        }

        if (method !== 'get' && data) {
            req.send(data);
        }

        req.onload = function() {
            var result = req.responseText;

            try {
                result = JSON.parse(result);
            } catch (e) {

            }

            if (req.status >= 200 && req.status < 400) {
                return cb(true, result);
            }

            cb(false, result);
        };

        req.onerror = function() {
            cb(false);
        };

        if (timeout) {
            req.timeout = timeout;

            req.ontimeout = function() {
                cb(false);
            };
        }

        req.send();
        return req;
    };

    g.set = function set(key, value, where, options) {
        var split = key.split('.');
        var source = {};

        if (g.is(where, 'object')) {
            source = where;

            for (var i = 0, len = split.length; i < len - 1; i++) {
                var current = split[i];

                if (source[current] === undefined || source[current] === null) {
                    source[current] = {};
                }

                source = source[current];
            }

            source[split[i]] = value;
            return source;
        }

        if (where === 'cookie') {
            var expires = "";
            options = options || {};
            var days = options.days;

            if (days) {
                var date = new Date();
                date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
                expires = "; expires=" + date.toUTCString();
            }

            document.cookie = name + "=" + (value || "") + expires + "; path=/";
        }

        if (where === 'localStorage') {
            localStorage.setItem(key, value);
        }
    };

    g.get = function get(key, where, defaultValue) {
        var source = {};

        if (g.is(where, 'object')) {
            source = where;

            var split = key.split('.');
            var tmp = source;

            for (var i = 0, len = split.length; i < len; i++) {
                var current = split[i];

                if (!tmp[current]) {
                    return defaultValue || false;
                }

                tmp = tmp[current];
            }

            return tmp;
        }

        if (where === 'localStorage') {
            return localStorage.getItem(key) || defaultValue;
        }

        if (where === 'cookie') {
            var nameEQ = key + "=";
            var ca = document.cookie.split(';');

            for (var i = 0, len = ca.length; i < len; i++) {
                var c = ca[i];

                while (c.charAt(0) === ' ') {
                    c = c.substring(1, c.length);
                }

                if (c.indexOf(nameEQ) === 0) {
                    return c.substring(nameEQ.length, c.length);
                }
            }

            return defaultValue;
        }
    };

    g.is = function is(what, type) {
        return typeof what === type;
    };

    g.watch = function watch(obj, key, cb) {
        var value = obj[key];
        Object.defineProperty(obj, key, {
            get: function() {
                return value;
            },
            set: function(val) {
                var old = value;
                value = val;
                cb(old, val);
            }
        });
    };

    g.bind = function bind(sel, event, cb) {
        return document.addEventListener(event, function(e) {
            if (!e.target.matches(sel)) {
                return;
            }

            cb(e);
        });
    };

    g.attr = function attr(sel, attr, value) {
        var el = g.el(sel);

        if (value) {
            el.setAttribute(attr, value);
        }

        return el.getAttribute(attr);
    };

    g.value = function value(sel, value) {
        if (value) {
            g.el(sel).value = value;
            return;
        }

        return g.el(sel).value;
    };

    g.values = function values(sel, formData) {
        var data = formData ? new FormData() : {};
        var els =  g.el(sel).querySelectorAll('input, textarea, select');

        for (var i = 0, len = els.length; i < len; i++) {
            var el = els[i];
            var key = el.getAttribute('name');

            if (formData) {
                data.append(key, el.value);
                continue;
            }

            data[key] = el.value;
        }

        return data;
    };

    g.clean = function clean(str) {
        var c = ['&', '<', '>', '"', '\'', '/'];
        var r = ['&amp;', '&lt;', '&gt;', '&quot;', '&#x27', '&#x2F'];

        if (!str) {
            return '';
        }

        for (var i = 0, len = c.length; i < len; i++) {
            str = str.toString().replace(new RegExp(c[i], 'g'), r[i]);
        }

        return str;
    };

    g.d = function d() {
        return console.log.apply(this, arguments);
    };

    g.tpl = function tpl(name, data) {
        function parse() {
            var html = g.html(['#', name].join(''));

            return function parsed(data) {
                return html.replace(/{{\s*([^}]*)\s*}}/g, function(match, $1) {
                    return g.clean(g.get($1.trim(), data));
                });
            }
        }

        var r = g.map(data, parse(name));
        return Array.isArray(r) ? r.join('') : r;
    };

    window.g8a = g;
})();



