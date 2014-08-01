KISSY.add(function (S, Node,Demo) {
    var $ = Node.all;
    describe('zhaoest', function () {
        it('Instantiation of components',function(){
            var demo = new Demo();
            expect(S.isObject(demo)).toBe(true);
        })
    });

},{requires:['node','gallery/zhaoest/1.0/']});