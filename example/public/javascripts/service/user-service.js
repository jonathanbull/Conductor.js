/**
 * user-service.js
 *
 * Absracts the fetching of Users' downloadable data.
 *
 * Usage:
 *
 * var userService = new namespace.userService();
 *
 * userService.downloadArticles().then(function (data) {
 *    var userData = data;
 * });
 *
 * Dependencies:
 *  - jQuery
 */
(function ($, context) {

    "use strict";

    /**
     * Constructor for the User Service.
     *
     * @public
     * @constructor
     * @return {
     *      {
     *          downloadArticles:function()
     *      }
     *  }
     */
    context.userService = function () {
        return {
            /**
             * Initiates a jQuery ajax request to the user data endpoint and
             * wraps it within a promise.
             *
             * @return {promise}
             */
            downloadArticles : function () {
                var jQueryPromise = $.ajax('/javascripts/data.json');
                return Promise.resolve(jQueryPromise);
            }
        };
    };
}(jQuery, conductorContext));
