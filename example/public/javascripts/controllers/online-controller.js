/**
 * online-controller.js
 *
 * The controller used for the application when it is in online mode.
 *
 * The controller has the following actions:
 *      onlineController : Downloads all of the users offline data, updating a
 *          status indicator as it does so.
 *
 * Usage:
 *
 * var app = new namespace.Kernel();
 *
 * var onlineController = new namespace.onlineController(app)
 *     .setUserDataService(new namespace.userService());
 *
 * onlineController.onlineAction();
 *
 * Dependencies:
 *  - jQuery
 */
(function ($, context) {

    "use strict";

    /**
     * Constructor for the Online Controller.
     *
     * @public
     * @constructor
     * @param {object} kernel : The Main App Kernel
     * @return {
     *      {
     *          onlineAction:function(array),
     *          setUserDataService:function(object)
     *      }
     *  } The Online Controller.
     */
    context.onlineController = function(kernel) {

        /**
         * A reference to 'this' that can be used in other functions.
         *
         * @type {object}
         */
        var base = this;

        /**
         * A reference to the content database
         *
         * @type {object}
         */
        base.contentDb = kernel.getDb('royal_opera_house_content');

        /**
         * A reference to the images database
         *
         * @type {object}
         */
        base.imagesDb = kernel.getDb('royal_opera_house_images');

        /**
         * A reference to the user data service
         *
         * @type {object}
         */
        base.userDataService = null;

        /**
         * Downloads all of the users offline data, updating a
         * status indicator as it does so.
         */
        base.onlineAction = function() {
            $('#update-notice').html($('#updating').html()).show();

            var downloadedUserData;

            var showErrorNotice = function () {
                $('#update-notice').html($('#updating-error').html());
            };

            base.userDataService.downloadArticles().then(
                function (userData) {
                    downloadedUserData = userData;

                    return base.contentDb.insert(
                        'publication',
                        userData.publications
                    );
                },
                showErrorNotice
            ).then(
                function () {
                    return base.contentDb.insert(
                        'article',
                        downloadedUserData.articles
                    );
                },
                showErrorNotice
            ).then(
                function () {
                    return base.imagesDb.insert('image', downloadedUserData.images);
                },
                showErrorNotice
            ).then(
                function () {
                    $('#update-notice').html($('#updating-complete').html());
                },
                showErrorNotice
            );
        };

        return {
            onlineAction : base.onlineAction,
            setUserDataService: function(userDataService) {
                base.userDataService = userDataService;
                return this;
            }
        };
    };

}(jQuery, conductorContext));
