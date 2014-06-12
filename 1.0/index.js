/**
 * @fileoverview 
 * @author tao21<zhaoest@126.com>
 * @module zhaoest
 **/
KISSY.add(function (S, Node,Base) {
    var EMPTY = '';
    var $ = Node.all;
    /**
     * 
     * @class Zhaoest
     * @constructor
     * @extends Base
     */
    function Zhaoest(comConfig) {
        var self = this;
        //调用父类构造函数
        Zhaoest.superclass.constructor.call(self, comConfig);
    }
    S.extend(Zhaoest, Base, /** @lends Zhaoest.prototype*/{

    }, {ATTRS : /** @lends Zhaoest*/{

    }});
    return Zhaoest;
}, {requires:['node', 'base']});



