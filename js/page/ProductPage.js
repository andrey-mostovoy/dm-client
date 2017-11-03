/**
 * Страница товара.
 * @constructor
 */
const ProductPage = function () {
    /**
     * Инициализация.
     */
    this.init = function() {
        // const Info = new DeliveryInfo();
        // Info.init();
    };
};

$(document).ready(function() {
    const Page = new ProductPage();
    Page.init();
});

/**
 * перенесено из шаблона.
 * @param indx
 * @private
 */
function _bldCont(indx) {
    var bck = indx - 1;
    var nxt = indx + 1;
    if (bck < 0) {
        bck = allEntImgs$ID$.length - 1;
    }
    if (nxt >= allEntImgs$ID$.length) {
        nxt = 0;
    }
    var imgs = '';
    if (allEntImgs$ID$.length > 1) {
        for (var i = 0; i < allEntImgs$ID$.length; i++) {
            var img = i + 1;
            if (allEntImgs$ID$[i][0].length < 1) {
                continue;
            }
            if (i == indx) {
                imgs += '<b class="pgSwchA">' + img + '</b> ';
            }
            else {
                imgs += '<a class="pgSwch" href="javascript://" rel="nofollow" onclick="_bldCont(' + i + ');return false;">' + img + '</a> ';
            }
        }
        imgs = '<div align="center" style="padding:8px 0 5px 0;white-space:nowrap;overflow:auto;overflow-x:auto;overflow-y:hidden;"><a class="pgSwch" href="javascript://" rel="nofollow" onclick="_bldCont(' + bck + ');return false;">&laquo; Back</a> ' + imgs + '<a class="pgSwch" href="javascript://" rel="nofollow" onclick="_bldCont(' + nxt + ');return false;">Next &raquo;</a> </div> ';
    }
    var hght = parseInt(allEntImgs$ID$[indx][2]);
    if ($.browser.msie) {
        hght += 28;
    }
    ;
    _picsCont = '<div id="_prCont" style="position:relative;"><img alt="" border="0" src="' + allEntImgs$ID$[indx][0] + '"/>' + imgs + '</div>';
    new _uWnd('wnd_prv', "Изображения товара", 10, 10, {
        waitimages: 300000,
        autosizewidth: 1,
        hideonresize: 1,
        autosize: 1,
        fadetype: 1,
        closeonesc: 1,
        align: 'center',
        min: 0,
        max: 0,
        resize: 1
    }, _picsCont);
}
