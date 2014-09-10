(function (context) {

    'use strict';

    /**
     * Constructor for the Publication Model.
     *
     * @public
     * @constructor
     * @param {int} id : The id of the Publication
     * @param {string} title : The title of the Publication
     * @param {string} shortDescription : A short summary of the Publication
     * @param {string} longDescription : A longer summary of the Publication
     * @return {object) The Publication Model.
     */
    context.models.publication = function (id, title, shortDescription, longDescription) {
        return {
            id: id,
            title: title,
            shortDescription: shortDescription,
            longDescription: longDescription
        };
    };
}(conductorContext));
