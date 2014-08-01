/**
 * @fileoverview 
 * @author tao21<zhaoest@126.com>
 * @module zhaoest
 **/
KISSY.add(function (S, Node, Lang) {
    var $ = Node.all,
        EventTarget = S.Event.Target;
    /**
     *
     * @class Zhaoest
     * @constructor
     */
    function Zhaoest(config) {

    }

    S.augment(Zhaoest, EventTarget, /** @lends Zhaoest.prototype*/{

    });

    return Zhaoest;

}, {requires:['node', 'lang']});



