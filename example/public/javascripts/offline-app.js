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
            var offlineController = new conductorContext.offlineController(app);

            app.on('#/{publicationId}/{articleId}', function(parameters) {
                offlineController.publicationsArticleAction(parameters);
            });

            app.on('#/{publicationId}', function(parameters) {
                offlineController.publicationsIndexAction(parameters);
            });

            app.on('#/', function() {
                offlineController.indexAction();
            });

            app.start();

            if (!window.location.hash) {
                window.location.hash = '#/';
            }
        },
        function () {
            alert('Could not create local database');
        }
    );
});
