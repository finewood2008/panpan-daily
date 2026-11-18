const PanpanShop=(()=>{
    const products=[
        {id:'sleepy-charm', name:'潘潘捏捏挂件', group:'panpan', price:19,
            summary:'有点困，也得陪你出门。软软一捏，挂包上正合适。',col:0,row:0},
        {id:'panpan-mug', name:'半眯眼马克杯', group:'panpan', price:29,
            summary:'一只粉色杯耳，印着潘潘那张还没睡醒的脸。',col:1,row:0},
        {id:'panpan-stickers', name:'潘潘的一周贴纸', group:'panpan', price:9,
            summary:'把捧杯、发呆和想下班的潘潘贴进手账。',col:2,row:0},
        {id:'panpan-pouch', name:'潘潘拉链小布包', group:'panpan', price:25,
            summary:'奶油色布面，角上绣了一只潘潘，装零钱和钥匙刚刚好。',col:0,row:1},
        {id:'folding-crate', name:'雾绿折叠收纳筐', group:'daily', price:16,
            summary:'桌上的线和小零碎，都先收进这个轻便的小盒子。',col:1,row:1},
        {id:'pocket-mirror', name:'蜜桃随身小镜', group:'daily', price:12,
            summary:'蜜桃色翻盖印着潘潘，出门往包里一塞就走。',col:2,row:1},
        {id:'alley-tote', name:'潘潘出门帆布袋', group:'panpan', price:39,
            summary:'奶油底配砖红提手，正面是一张刚睡醒的潘潘脸。',sheet:'commute',col:0,row:0},
        {id:'commute-card', name:'上班刷一刷卡套', group:'panpan', price:22,
            summary:'青蓝卡套配挂绳，公交卡和工牌都能装。',sheet:'commute',col:1,row:0},
        {id:'thermos', name:'路上喝一口保温杯', group:'panpan', price:59,
            summary:'砖红杯盖，白色杯身，潘潘陪你带杯热水出门。',sheet:'commute',col:2,row:0},
        {id:'mouse-pad', name:'歇只手腕鼠标垫', group:'panpan', price:36,
            summary:'灰蓝软垫搭奶油色潘潘腕托，给办公桌留个歇手的位置。',sheet:'commute',col:0,row:1},
        {id:'packing-tape', name:'潘潘打包纸胶带', group:'panpan', price:12,
            summary:'一串半眯眼的小潘潘，手账、纸袋和小包裹都能贴。',sheet:'commute',col:1,row:1},
        {id:'packing-standee', name:'这一箱封好了摆件', group:'panpan', price:28,
            summary:'透明亚克力小立牌，潘潘趴在纸箱上歇一口气。',sheet:'commute',col:2,row:1},
        {id:'plush', name:'困困潘潘毛绒公仔', group:'panpan', price:69,
            summary:'大头、短手、半眯眼，适合坐在桌边或枕边。',sheet:'home',col:0,row:0},
        {id:'night-light', name:'潘潘留盏灯小夜灯', group:'panpan', price:79,
            summary:'暖色的圆脸灯放在床边，留一盏和小屋一样的光。',sheet:'home',col:1,row:0},
        {id:'sleep-mask', name:'先睡一会儿眼罩', group:'panpan', price:25,
            summary:'奶油色布面印着半垂眼皮，戴上就像潘潘关灯了。',sheet:'home',col:2,row:0},
        {id:'red-stool-coaster', name:'小红凳杯垫', group:'panpan', price:18,
            summary:'把面馆那张红凳搬上桌，图案是坐着等面凉的潘潘。',sheet:'home',col:0,row:1},
        {id:'window-magnet', name:'二楼亮灯冰箱贴', group:'panpan', price:32,
            summary:'青棚、暖窗和趴在窗边的潘潘做成一块小窗景。',sheet:'home',col:1,row:1},
        {id:'fan-tag', name:'旧台扇行李牌', group:'panpan', price:19,
            summary:'复古台扇造型的行李牌，扇心印着潘潘的脸。',sheet:'home',col:2,row:1},
    ];
    const names={panpan:'潘潘周边',daily:'生活小物'};
    const goods=new Map(products.map(item=>[item.id,item]));
    const bagKey='panpan.variety-bag-v1';
    const price=amount=>'¥'+amount;
    const shopHref=id=>'shop.html?item='+id;

    function art(item){
        const sheet=item.sheet?'--product-sheet:url(../assets/variety-'+item.sheet+'.webp);':'';
        return '<span class="goods-art" aria-hidden="true" style="--product-x:'+
            item.col*50+'%;--product-y:'+item.row*100+'%;'+sheet+'"></span>';
    }

    function cards(items,inGame){
        return items.map(item=>{
            const control=inGame?
                'a class="goods-card" href="'+shopHref(item.id)+'"':
                'button class="goods-card" type="button" data-item="'+item.id+'"';
            return '<'+control+'>'+art(item)+'<span class="goods-copy"><strong>'+item.name+
                '</strong><span>'+names[item.group]+'<b>'+price(item.price)+'</b></span></span></'+
                (inGame?'a':'button')+'>';
        }).join('');
    }

    function show(body){
        body.innerHTML='<div class="variety-shelf-head"><span>示例售价</span>'+
            '<a class="text-button" href="shop.html">逛潘潘网店 ↗</a></div>'+
            '<div class="goods-grid goods-grid--shelf">'+cards(products.slice(0,6),true)+'</div>';
    }

    function readBag(){
        let saved;
        try{saved=JSON.parse(localStorage.getItem(bagKey));}catch{}
        return Object.fromEntries(products.flatMap(item=>{
            const count=saved?.[item.id];
            return Number.isInteger(count)&&count>0&&count<=99?[[item.id,count]]:[];
        }));
    }

    function storePage(){
        const grid=document.getElementById('goods-grid');
        const filters=document.getElementById('goods-filters');
        const openBag=document.getElementById('shop-open-bag');
        const sheet=document.getElementById('shop-sheet');
        const body=document.getElementById('shop-sheet-body');
        const title=document.getElementById('shop-sheet-title');
        const close=document.getElementById('shop-close');
        let view='';
        let opener;

        function itemsInBag(){
            return Object.entries(readBag()).map(([id,count])=>({item:goods.get(id),count}));
        }
        function refreshCount(){
            openBag.textContent='购物袋 · '+itemsInBag().reduce((total,{count})=>total+count,0);
        }
        function changeQuantity(id,step){
            const bag=readBag();
            const next=Math.min(99,Math.max(0,(bag[id]??0)+step));
            if(next) bag[id]=next;
            else delete bag[id];
            localStorage.setItem(bagKey,JSON.stringify(bag));
            refreshCount();
        }
        function open(kind,heading,from){
            if(!sheet.open){
                opener=from;
                sheet.showModal();
            }
            title.textContent=heading;
            view=kind;
            sheet.scrollTop=0;
            close.focus();
        }
        function showProduct(item,from){
            body.innerHTML='<div class="shop-product">'+art(item)+'<div><p>'+names[item.group]+
                '</p><h3>'+item.name+'</h3><p>'+item.summary+'</p><strong>'+price(item.price)+
                '</strong><div class="shop-product-actions"><button type="button" class="text-button" data-add="'+
                item.id+'">加入购物袋</button><button type="button" class="text-button" data-bag>看购物袋</button></div>'+
                '<p class="shop-message" role="status"></p></div></div>';
            open('product','商品详情',from);
        }
        function showBag(from){
            const lines=itemsInBag();
            const sum=lines.reduce((total,{item,count})=>total+item.price*count,0);
            body.innerHTML=lines.length?
                '<ul class="shop-bag-list">'+lines.map(({item,count})=>
                    '<li><span><strong>'+item.name+'</strong><small>'+price(item.price)+' / 件</small></span>'+
                    '<span class="bag-stepper"><button type="button" class="text-button" data-change="-1" data-id="'+item.id+
                    '" aria-label="减少'+item.name+'">−</button><span>'+count+'</span>'+
                    '<button type="button" class="text-button" data-change="1" data-id="'+item.id+
                    '" aria-label="增加'+item.name+'">＋</button></span></li>'
                ).join('')+'</ul><div class="shop-bag-total"><span>示例合计 <strong>'+price(sum)+
                '</strong></span><button type="button" class="text-button" data-checkout>生成试玩小票</button></div>':
                '<p class="shop-empty">购物袋还是空的。</p>';
            if(view!=='bag') open('bag','购物袋',from);
        }
        function showReceipt(){
            const lines=itemsInBag();
            if(!lines.length) return showBag();
            const sum=lines.reduce((total,{item,count})=>total+item.price*count,0);
            localStorage.removeItem(bagKey);
            refreshCount();
            body.innerHTML='<div class="shop-receipt"><p>试玩小票已生成</p><ul>'+lines.map(({item,count})=>
                '<li><span>'+item.name+' × '+count+'</span><span>'+price(item.price*count)+'</span></li>'
            ).join('')+'</ul><strong>合计 '+price(sum)+'</strong></div>';
            open('receipt','试玩小票');
        }
        function showGroup(group){
            grid.innerHTML=cards(products.filter(item=>group==='all'||item.group===group),false);
            for(const button of filters.querySelectorAll('button')){
                button.setAttribute('aria-pressed',String(button.dataset.group===group));
            }
        }

        filters.onclick=event=>{
            const button=event.target.closest('[data-group]');
            if(button) showGroup(button.dataset.group);
        };
        grid.onclick=event=>{
            const button=event.target.closest('[data-item]');
            if(button) showProduct(goods.get(button.dataset.item),button);
        };
        openBag.onclick=()=>showBag(openBag);
        close.onclick=()=>sheet.close();
        sheet.addEventListener('close',()=>{
            view='';
            opener?.focus();
        });
        body.onclick=event=>{
            const button=event.target.closest('button');
            if(!button) return;
            try{
                if(button.dataset.add){
                    changeQuantity(button.dataset.add,1);
                    body.querySelector('.shop-message').textContent='已加入购物袋。';
                }else if(button.hasAttribute('data-bag')) showBag(openBag);
                else if(button.dataset.change){
                    changeQuantity(button.dataset.id,Number(button.dataset.change));
                    const {change,id}=button.dataset;
                    showBag();
                    (body.querySelector('[data-change="'+change+'"][data-id="'+id+'"]')??close).focus();
                }else if(button.hasAttribute('data-checkout')) showReceipt();
            }catch{
                let notice=body.querySelector('.shop-message');
                if(!notice){
                    notice=document.createElement('p');
                    notice.className='shop-message';
                    notice.setAttribute('role','status');
                    body.append(notice);
                }
                notice.textContent='购物袋暂时无法保存，再试一次。';
            }
        };
        window.addEventListener('storage',event=>{
            if(event.key!==bagKey) return;
            refreshCount();
            if(view==='bag') showBag();
        });
        showGroup('all');
        refreshCount();
        const initial=goods.get(new URLSearchParams(location.search).get('item'));
        if(initial) showProduct(initial);
    }

    return {show,storePage};
})();
