(function (context) {

    'use strict';

    /**
     * Constructor for the Image Model.
     *
     * @public
     * @constructor
     * @param {int} id : The id of the Image
     * @param {int|null} articleId : The id of the parent article
     * @param {int|null} publicationId : The id of the parent publication
     * @param {string} base64 : The image, encoded in base64
     * @return {object) The Image Model.
     */
    context.models.image = function (id, articleId, publicationId, base64) {
        return {
            id: id,
            articleId: articleId,
            publicationId: publicationId,
            base64: base64,
            asImageTag: function () {
                return '<img alt class="img-rounded" width="100%" src="data:image/png;base64,' + this.base64 + '" />';
            }
        };
    };
}(conductorContext));
