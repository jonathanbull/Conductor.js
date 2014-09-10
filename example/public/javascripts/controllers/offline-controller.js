/**
 * offline-controller.js
 *
 * The controller used for the application when it is in offline mode.
 *
 * The controller has the following actions:
 *      indexAction : Displays a list of all the downloaded publications
 *      publicationsIndexAction : Displays a list of all the articles within
 *          a downloaded publication.
 *      publicationsArticleAction : Displays an individual article.
 *
 * Usage:
 *
 * var app = new namespace.Kernel();
 *
 * var publicationsController = new namespace.publicationsController(app);
 *
 * app.on('#/{publicationId}/{articleId}', function(parameters) {
 *    publicationsController.publicationsArticleAction(parameters);
 * });
 *
 * app.on('#/{publicationId}', function(parameters) {
 *    publicationsController.publicationsIndexAction(parameters);
 * });
 *
 * app.on('#/', function() {
 *    publicationsController.indexAction();
 * });
 *
 * Dependencies:
 *  - jQuery
 */
(function ($, context) {

    "use strict";

    /**
     * Constructor for the Offline Controller.
     *
     * @public
     * @constructor
     * @param {object} kernel : The Main App Kernel
     * @return {
     *      {
     *          indexAction:function(array),
     *          publicationsIndexAction:function(array),
     *          publicationsArticleAction:function(object)
     *      }
     *  } The Offline Controller.
     */
    context.offlineController = function (kernel) {

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
         * The compiled Handlebars template for the initial index
         *
         * @type {object}
         */
        base.indexTemplate = Handlebars.compile($('#index-template').html());

        /**
         * The compiled Handlebars template for the publication index
         *
         * @type {object}
         */
        base.publicationIndexTemplate = Handlebars.compile(
            $('#publication-index-template').html()
        );

        /**
         * The compiled Handlebars template for the publication
         *
         * @type {object}
         */
        base.publicationTemplate = Handlebars.compile(
            $('#publication-template').html()
        );

        /**
         * The compiled Handlebars template for the breadcrumbs
         *
         * @type {object}
         */
        base.breadcrumbsTemplate = Handlebars.compile(
            $('#breadcrumbs-template').html()
        );

        /**
         * Items that should always be present in the breadcrumb navigation
         *
         * @type {array}
         */
        base.breadcrumbs = [
            {
                link: "#/",
                title: "Your library"
            }
        ];

        Handlebars.registerHelper('call', function(object, func) {
            return func.apply(object);
        });

        /**
         * Clears the main rendering element
         */
        base.clear = function () {
            $('#publication-content').empty();
        };

        /**
         * Updates the text content of the page title and optionally the standfirst.
         *
         * @param {string} title : The title
         * @param {string|null} standfirst : The standfirst
         */
        base.updateTitle = function (title, standfirst) {
            $('section h2').text(title);

            if (typeof standfirst === 'string') {
                $('section').find('.lead').remove();
                $('section h2').after($.parseHTML(
                    '<p class="lead">' + standfirst + '</p>')
                );
            } else {
                $('section').find('.lead').remove();
            }
        };

        /**
         * Updates the document title
         *
         * @param {string} title : The title
         */
        base.updateDocumentTitle = function (title) {
            document.title = title;
        };

        /**
         * Given an individual model or collection, will find the images belonging
         * to the items and apply them as the 'image' attribute of each item.
         *
         * @param {object|array} collection : The collection of Models to apply
         *  the images to.
         * @param {string} property : The name of the propery of the image that
         * matches the items id, for example 'publicationId' or 'articleId'
         *
         * @return {promise} A promise, when fulfilled passes the same collection
         * back, but with the images applied.
         */
        base.applyImages = function (collection, property) {
            if ($.isArray(collection)) {
                return new Promise(function (fulfill, reject) {
                    Promise.all(collection.map(function (item) {
                        return new Promise(function (fulfill, reject) {
                            var query = {};
                            query[property] = parseInt(item.id, 10);
                            base.imagesDb.findOneBy('image', query).then(
                                function (image) {
                                    item.image = image;
                                    fulfill(item);
                                }
                            );
                        });
                    })).then(function (items) {
                        var mergedItems = [];
                        mergedItems = mergedItems.concat.apply(mergedItems, items);
                        fulfill(mergedItems);
                    });
                });
            } else {
                return new Promise(function (fulfill, reject) {
                    var query = {};
                    query[property] = parseInt(collection.id, 10);
                    base.imagesDb.findOneBy('image', query).then(
                        function (image) {
                            collection.image = image;
                            fulfill(collection);
                        }
                    );
                });
            }
        };

        /**
         * The index controller for the offline application. Will render a list
         * of all publication available offline.
         */
        base.indexAction = function () {
            base.clear();
            base.updateTitle('Your Library');
            base.updateDocumentTitle('Your Library');

            base.contentDb.findBy('publication').then(
                function (publications) {
                    return base.applyImages(publications, 'publicationId');
                }
            ).then(
                function (publications) {
                    $('#publication-content').html(base.indexTemplate({
                        publications: publications
                    }));
                }
            );

            $('#mhBc section').html(base.breadcrumbsTemplate({
                items: base.breadcrumbs
            }));
        };

        /**
         * The controller for the index of a publication. Will render a list of
         * all the articles within a publication.
         *
         * @param {object} paramters : The paramters of the route. Must have
         *  'publicationId' as an attribute.
         */
        base.publicationsIndexAction = function (paramters) {
            base.clear();

            var articleQuery = {
                publication : parseInt(paramters.publicationId, 10)
            };

            var articleOrderBy = {
                articleSortOrder : 'asc'
            };

            var publicationQuery = {
                id : parseInt(paramters.publicationId, 10)
            };

            base.contentDb.findBy('article', articleQuery, articleOrderBy).then(
                function (articles) {
                    return base.applyImages(articles, 'articleId');
                }
            ).then(
                function (articles) {
                    $('#publication-content').html(base.publicationIndexTemplate({
                        articles: articles
                    }));
                }
            );

            base.contentDb.findOneBy('publication', publicationQuery).then(
                function (publication) {
                    base.updateTitle(publication.title);
                    base.updateDocumentTitle(publication.title + ' — Your Library');

                    var breadcrumbs = JSON.parse(JSON.stringify(base.breadcrumbs));
                    breadcrumbs.push({
                        title: publication.title
                    });

                    $('#mhBc section').html(base.breadcrumbsTemplate({
                        items: breadcrumbs
                    }));
                }
            );
        };

        /**
         * The controller for an individual article. Will render the body of an
         * Article.
         *
         * @param {object} paramters : The paramters of the route. Must have
         *  'publicationId' and 'articleId' as attributes
         */
        base.publicationsArticleAction = function (paramters) {
            base.clear();

            var article, previousArticle, nextArticle, publication;

            var publicationQuery = {
                id : parseInt(paramters.publicationId, 10)
            };

            base.contentDb.findOneBy('publication', publicationQuery).then(
                function (returnedPublication) {
                    publication = returnedPublication;

                    var breadcrumbs = JSON.parse(JSON.stringify(base.breadcrumbs));

                    breadcrumbs.push({
                        title: publication.title,
                        link: '#/' + publication.id
                    });

                    $('#mhBc section').html(base.breadcrumbsTemplate({
                        items: breadcrumbs
                    }));

                    var articleQuery = {
                        publication : parseInt(paramters.publicationId, 10),
                        id: parseInt(paramters.articleId, 10)
                    };

                    return base.contentDb.findOneBy(
                        'article',
                        articleQuery
                    );
                }
            ).then(
                function (article) {
                    return base.applyImages(article, 'articleId');
                }
            ).then(
                function (returnedArticle) {
                    article = returnedArticle;

                    var previousArticleQuery = {
                        publication : parseInt(paramters.publicationId, 10),
                        articleSortOrder: parseInt(article.articleSortOrder, 10) - 1
                    };

                    return base.contentDb.findOneBy(
                        'article',
                        previousArticleQuery
                    );
                }
            ).then(
                function (returnedArticle) {
                    previousArticle = returnedArticle;

                    var nextArticleQuery = {
                        publication : parseInt(paramters.publicationId, 10),
                        articleSortOrder: parseInt(article.articleSortOrder, 10) + 1
                    };

                    return base.contentDb.findOneBy(
                        'article',
                        nextArticleQuery
                    );
                }
            ).then(
                function (returnedArticle) {
                    nextArticle = returnedArticle;

                    $('#publication-content').html(base.publicationTemplate({
                        article: article,
                        previousArticle: previousArticle,
                        nextArticle: nextArticle
                    }));

                    base.updateTitle(startArticle.title, article.standfirst);
                    base.updateDocumentTitle(
                        article.title + ' — ' + publication.title +
                        ' — Your Library'
                    );
                }
            );
        };

        return {
            indexAction : base.indexAction,
            publicationsIndexAction : base.publicationsIndexAction,
            publicationsArticleAction : base.publicationsArticleAction
        };
    };

}(jQuery, conductorContext));
