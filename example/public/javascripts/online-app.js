$(function () {
    /**
     * @type {object}
     * The Application object.
     */
    var app = new conductorContext.Kernel();

    app.createDatabase(contentDbConfig).then(
        function () {
            return app.createDatabase(imagesDbConfig);
        },
        function () {
            alert('Could not create local database');
        }
    ).then(
        function () {
            var onlineController = new conductorContext.onlineController(app)
                .setUserDataService(new conductorContext.userService());

            onlineController.onlineAction();
        },
        function () {
            alert('Could not create local database');
        }
    );
});
