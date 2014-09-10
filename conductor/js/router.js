/**
 * router.js
 *
 * Provides hashbang routing functionality.
 *
 * Accepts an associative array of functions that are mapped to a route
 * (which may be parameterised). Returns a function that may be applied to the
 * 'window.onhashchange' object.
 *
 * When the hash URL matches the route, the function is executed and any
 * paramters are passed to the function in an associative array.
 *
 * Usage:
 *      var routes = [];
 *      routes['#/hello/{name}'] = function(parameters) {
 *          alert('Hello ' + paramters['name']);
 *      };
 *      var router = new context.router(base.routes);
 *      window.onhashchange = router;
 *
 * Dependencies:
 *  - namespace: The namespace to apply the router object to, e.g window.myapp;
 *
 */
(function (context) {

    "use strict";

    /**
     * Constructor for the router function.
     *
     * @public
     * @constructor
     * @param {array} routes The associative array of routes and functions.
     * @return {function} The router function.
     */
    context.router = function (routes) {

        /**
         * A reference to 'this' that can be used in other functions.
         *
         * @type {object}
         */
        var base = this;

        /**
         * The associative array of routes and functions.
         *
         * @type {array}
         */
        base.routes = routes;

        /**
         * A regex that is used to convert parameter names into regular expressions
         * to capture the paramters.
         *
         * @type {RegExp}
         */
        base.paramToRegex = /\{[a-zA-Z0-9\-]+\}/g;

        /**
         * A regex that is used to capture the parameter names.
         *
         * @type {RegExp}
         */
        base.captureParamNames = /\{([a-zA-Z0-9\-]+)\}/g;

        /**
         * Test if a route has parameters that should be captured.
         *
         * @param {string} route : The route to test
         * @return {boolean} : true if the route is parameterised.
         */
        base.isParameterisedRoute = function (route) {
            return route.indexOf('{') > -1 && route.indexOf('}') > -1;
        };


        /**
         * Get the parameters defined in the route from the current hashbang
         * URL.
         *
         * @param {string} route : The route to test
         * @param {string} location : The the current hashbang URL
         * @return {array|null} : If the route matches the current URL, return
         * an array with the matched parameters, if there was no match, return
         * null.
         */
        base.getParametersFromRoute = function (route, location) {
            var routeRegexString = route.replace(base.paramToRegex, "([a-zA-Z0-9\\-]+)")
                .replace(/\//g, "\\/");
            var routeRegex = new RegExp(routeRegexString, 'g');
            var params = routeRegex.exec(location);

            return params;
        };

        /**
         * Creates an associative array mapping the paramter name to the
         * captured value, to be passed to a controller or function mapped to
         * the route.
         *
         * @param {string} route : The route that matched the current location.
         * @param {array} params : The captured parameters.
         * @return {array} : An associative array that maps the paramter names
         * to the captured values
         */
        base.createParamtersArray = function (route, params) {
            var matchedRouteParams = route.match(base.captureParamNames);
            var routeParams = [];
            params = params.slice(1, params.length);

            for (var i = 0, l = matchedRouteParams.length; i < l; i++) {
                routeParams[matchedRouteParams[i].replace(/{|}/g, '')] = params[i];
            }

            return routeParams;
        };

        /**
         * Test current hash location against the previously defined routes. If
         * a route matches the current location, execute the function mapped to
         * it, passing the routes parameters (if any). This function is intended
         * to be applied to the 'window.onhashchange' object.
         */
        var router = function () {
            var location = window.location.hash;
            if (!location) {
                return;
            }

            for (var route in base.routes) {
                if (base.isParameterisedRoute(route)) {
                    var params = base.getParametersFromRoute(route, location);
                    if (!!params) {
                        base.routes[route](base.createParamtersArray(route, params));
                        break;
                    }
                } else if (route === location) {
                    base.routes[route](location);
                    break;
                }
            }
        };

        return router;
    };

}(conductorContext));
