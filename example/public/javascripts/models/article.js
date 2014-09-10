(function (context) {

    'use strict';

    /**
     * Constructor for the Article Model.
     *
     * @public
     * @constructor
     * @param {int} id : The id of the Article
     * @param {string} title : The title of the Article
     * @param {string} standfirst : The Articles standfirst
     * @param {int} publication : The id of the Articles parent Publication
     * @param {int} articleSortOrder : The display order of the Article within
     * the Publication
     * @param {string} status : The status of the Article
     * @param {string} link : A link to the Article online
     * @param {string} text : The main body text of the Article
     * @return {object) The Article Model.
     */
    context.models.article = function (
        id,
        title,
        standfirst,
        publication,
        articleSortOrder,
        status,
        link,
        text) {
        return {
            id: id,
            title: title,
            standfirst: standfirst,
            publication: publication,
            articleSortOrder: articleSortOrder,
            status: status,
            link: link,
            text: text
        };
    };

    /**
     * The attributes of articles we wish to be indexed.
     *
     * @type {array}
     */
    context.indexes.article = [
        'id',
        'publication',
        ['publication', 'id']
    ];

}(conductorContext));
