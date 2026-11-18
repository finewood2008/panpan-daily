const PanpanComicStall=(()=>{
    const library='../assets/stall-comics/';
    const featuredSlug='rang-lu';
    // Corners follow the printed faces in the 1672 × 941 stall illustration.
    const uprightBooks=[
        ['rang-lu', [[439,267],[582,266],[598,430],[449,439]], 43],
        ['ju-zi', [[608,263],[735,262],[754,420],[620,428]], 50],
        ['zaima', [[758,261],[882,259],[901,411],[772,418]], 24],
        ['yi-gen-mian', [[908,259],[1018,257],[1037,402],[920,409]], 38],
        ['yu-san', [[1044,256],[1152,254],[1167,395],[1056,400]], 40],
    ];
    const tableBooks=[
        ['chao-shang', [[755,480],[864,468],[883,484],[771,495]]],
        ['jiao-dai', [[382,517],[507,500],[584,568],[450,579]]],
        ['tuo-xie', [[599,490],[719,484],[775,546],[646,557]]],
        ['zhi-jin', [[799,497],[916,489],[964,548],[840,563]]],
        ['nao-zhong', [[946,464],[1061,458],[1125,520],[1000,531]]],
        ['bei-yong-xian', [[1110,450],[1221,442],[1292,499],[1172,509]]],
    ];
    let catalogRequest;
    let displayRequest;

    function readCatalog(){
        catalogRequest??=fetch(library+'catalog.json').then(r=>{
            if(!r.ok) throw new Error('Comic catalog unavailable');
            return r.json();
        }).catch(error=>{
            catalogRequest=undefined;
            throw error;
        });
        return catalogRequest;
    }

    function coverPerspective([[left,top],[right,topRight],[bottomRight,bottom],[bottomLeft,leftBottom]],width,height){
        const rightX=right-bottomRight;
        const rightY=topRight-bottom;
        const leftX=bottomLeft-bottomRight;
        const leftY=leftBottom-bottom;
        const deltaX=left-right+bottomRight-bottomLeft;
        const deltaY=top-topRight+bottom-leftBottom;
        const determinant=rightX*leftY-leftX*rightY;
        const horizontal=(deltaX*leftY-leftX*deltaY)/determinant;
        const vertical=(rightX*deltaY-deltaX*rightY)/determinant;
        return 'matrix3d('+[
            (right-left+horizontal*right)/width,(topRight-top+horizontal*topRight)/width,0,horizontal/width,
            (bottomLeft-left+vertical*bottomLeft)/height,(leftBottom-top+vertical*leftBottom)/height,0,vertical/height,
            0,0,1,0,left,top,0,1,
        ].join(',')+')';
    }

    function loadDisplay(plane){
        if(displayRequest) return displayRequest;
        const entries=[...uprightBooks,...tableBooks].map(([slug,corners,portraitPosition])=>{
            const upright=portraitPosition!==undefined;
            const [width,height]=upright?[140,174]:[154,104];
            const face=document.createElement('div');
            face.className='stall-cover';
            face.style.width=width+'px';
            face.style.height=height+'px';
            face.style.transform=coverPerspective(corners,width,height);
            const art=new Image();
            art.alt='';
            art.src=library+slug+'/cover.webp';
            if(upright) art.style.objectPosition=portraitPosition+'% center';
            face.append(art);
            return {slug,upright,face,ready:art.decode().then(()=>true,()=>false)};
        });
        displayRequest=Promise.all([
            readCatalog().catch(()=>[]),
            Promise.all(entries.map(entry=>entry.ready)),
        ]).then(([catalog,ready])=>{
            const titles=new Map(catalog.map(book=>[book.slug,book.title]));
            for(const [index,{slug,upright,face}] of entries.entries()){
                if(!ready[index]) continue;
                if(upright&&titles.has(slug)){
                    const title=document.createElement('span');
                    title.className='stall-cover-title';
                    title.textContent=titles.get(slug);
                    face.append(title);
                }
                plane.append(face);
            }
        });
        return displayRequest;
    }

    const readerMarkup='<section class="stall-reader" aria-label="条漫" tabindex="-1" hidden></section>';

    function showStrip(reader,book){
        const dialog=reader.closest('dialog');
        const intro=document.createElement('p');
        intro.className='stall-story-intro';
        intro.textContent=book.intro;
        const panels=document.createDocumentFragment();
        for(const [index,{alt,caption,label,position}] of book.panels.entries()){
            const frame=document.createElement('figure');
            frame.className='stall-frame';
            const image=new Image(768,512);
            image.alt=alt;
            image.decoding='async';
            if(index===0) image.fetchPriority='high';
            image.src=library+book.slug+'/panel-'+(index+1)+'.webp';
            frame.append(image);
            if(caption){
                const speech=document.createElement('figcaption');
                speech.className='stall-speech';
                speech.dataset.position=position;
                if(label){
                    const speaker=document.createElement('small');
                    speaker.textContent=label;
                    speech.append(speaker);
                }
                const words=document.createElement('span');
                words.textContent=caption;
                speech.append(words);
                frame.append(speech);
            }
            panels.append(frame);
        }
        reader.replaceChildren(intro,panels);
        dialog.querySelector('#sheet-title').textContent=book.title;
        reader.hidden=false;
        reader.focus({preventScroll:true});
        dialog.scrollTop=0;
    }

    function showStory(body,slug){
        body.innerHTML='<p class="stall-status" role="status">正在翻开漫画……</p>'+readerMarkup;
        const status=body.querySelector('.stall-status');
        const reader=body.querySelector('.stall-reader');
        const controller=new AbortController();
        readCatalog().then(data=>{
            if(controller.signal.aborted) return;
            const book=data.find(item=>item.slug===slug);
            if(!book) throw new Error('Comic unavailable');
            status.hidden=true;
            showStrip(reader,book);
        }).catch(()=>{
            if(!controller.signal.aborted) status.textContent='漫画暂时没打开，关上再试一次。';
        });
        return {close:()=>controller.abort()};
    }

    function show(body,context,sleepNotice){
        body.innerHTML=`
            <section class="stall-counter">
                <p class="stall-catalog-status stall-status" role="status">正在摆出漫画……</p>
                <div class="stall-feature"></div>
                <details class="stall-ask" hidden>
                    <summary>请潘潘推荐</summary>
                    <form class="stall-question">
                        <label for="stall-message">想看什么？按主题推荐</label>
                        <div><input id="stall-message" name="message" type="text" maxlength="120" placeholder="比如，想看个巷子里的趣事" required>
                        <button type="submit" class="text-button">请他推荐</button></div>
                    </form>
                    <p class="stall-status stall-recommendation-status" role="status"></p>
                    <section class="stall-answer" aria-label="潘潘的推荐" aria-live="polite" hidden>
                        <small>潘潘说</small>
                        <p class="stall-reply"></p>
                        <button type="button" class="text-button stall-open-book"></button>
                    </section>
                </details>
                <section class="stall-catalog-list" aria-labelledby="stall-shelf-title" hidden>
                    <h3 id="stall-shelf-title">更多漫画</h3>
                    <div class="stall-shelf"></div>
                </section>
            </section>
            ${readerMarkup}`;
        const find=selector=>body.querySelector(selector);
        const dialog=body.closest('dialog');
        const heading=dialog.querySelector('#sheet-title');
        const returnButton=dialog.querySelector('#comic-back');
        const counter=find('.stall-counter');
        const catalogStatus=find('.stall-catalog-status');
        const feature=find('.stall-feature');
        const shelf=find('.stall-shelf');
        const ask=find('.stall-ask');
        const form=find('.stall-question');
        const prompt=form.elements.message;
        const send=form.querySelector('button');
        const status=find('.stall-recommendation-status');
        const answer=find('.stall-answer');
        const reply=find('.stall-reply');
        const readRecommendation=find('.stall-open-book');
        const reader=find('.stall-reader');
        const controller=new AbortController();
        let catalog;
        let opener;
        let catalogScroll;
        let catalogTitle;

        function update(){
            const asleep=sleepNotice();
            const here=Boolean(context());
            form.hidden=Boolean(asleep);
            const unavailable=!catalog||!here;
            prompt.disabled=send.disabled=unavailable;
            const line=asleep||(!catalog?'正在把摊上的漫画摆出来。':
                here?'':'潘潘这会儿不在摊前，可以先挑一本翻。');
            if(status.textContent!==line) status.textContent=line;
        }

        function readBook(selected,from){
            opener=from;
            catalogScroll=dialog.scrollTop;
            catalogTitle=heading.textContent;
            counter.hidden=true;
            returnButton.hidden=false;
            showStrip(reader,selected);
        }

        returnButton.onclick=()=>{
            reader.hidden=true;
            returnButton.hidden=true;
            counter.hidden=false;
            heading.textContent=catalogTitle;
            dialog.scrollTop=catalogScroll;
            opener.focus({preventScroll:true});
        };

        function bookButton(book,isFeatured=false){
            const button=document.createElement('button');
            button.type='button';
            button.className=isFeatured?'stall-book stall-book-featured':'stall-book';
            button.setAttribute('aria-label',book.title);
            const cover=new Image(420,280);
            cover.src=library+book.slug+'/cover.webp';
            cover.alt='';
            cover.decoding='async';
            if(!isFeatured) cover.loading='lazy';
            const copy=document.createElement('span');
            copy.className='stall-book-copy';
            const place=document.createElement('small');
            place.textContent=book.place;
            const title=document.createElement('strong');
            title.textContent=book.title;
            const intro=document.createElement('span');
            intro.className='stall-book-intro';
            intro.textContent=book.intro;
            intro.id='stall-intro-'+book.slug;
            button.setAttribute('aria-describedby',intro.id);
            copy.append(place,title,intro);
            if(isFeatured){
                const action=document.createElement('span');
                action.className='stall-feature-action';
                action.textContent='开始阅读 →';
                copy.append(action);
            }
            button.append(cover,copy);
            button.onclick=()=>readBook(book,button);
            return button;
        }

        readCatalog().then(data=>{
            if(controller.signal.aborted) return;
            catalog=new Map(data.map(item=>[item.slug,item]));
            const highlighted=catalog.get(featuredSlug);
            if(highlighted) feature.append(bookButton(highlighted,true));
            const remaining=data.filter(book=>book!==highlighted);
            shelf.append(...remaining.map(book=>bookButton(book)));
            find('.stall-catalog-list').hidden=remaining.length===0;
            ask.hidden=false;
            catalogStatus.hidden=true;
            update();
        }).catch(()=>{
            if(controller.signal.aborted) return;
            catalogStatus.textContent='摊上的漫画暂时没打开，关上再试一次。';
            update();
        });

        form.onsubmit=event=>{
            event.preventDefault();
            const message=prompt.value.trim();
            if(!message||!context()||!catalog) return;
            const topics=[
                [/老板|请假|加班|消息|手机/, 'zaima'],
                [/猫|让路|巷子/, 'rang-lu'],
                [/雨|借伞/, 'yu-san'],
                [/早起|闹钟|赖床/, 'nao-zhong'],
                [/橘子|水果/, 'ju-zi'],
                [/吃|饿|面馆|汤/, 'yi-gen-mian'],
                [/打包|纸箱|快递|下班/, 'jiao-dai'],
                [/拖鞋|家里|买东西/, 'tuo-xie'],
            ];
            const named=[...catalog.values()].find(book=>message.includes(book.title));
            const topic=topics.find(([pattern])=>pattern.test(message));
            const selected=named??catalog.get(topic?.[1])??catalog.get(featuredSlug)??catalog.values().next().value;
            if(!selected) return;
            reply.textContent=(named||topic?'「你提到的事，跟这本有点像。」':'「先翻这本吧，四格，一会儿就读完。」')+' '+selected.intro;
            readRecommendation.textContent='读《'+selected.title+'》';
            readRecommendation.onclick=()=>readBook(selected,readRecommendation);
            answer.hidden=false;
            update();
        };
        update();
        return {update,close:()=>controller.abort()};
    }

    return {show,showStory,loadDisplay};
})();
