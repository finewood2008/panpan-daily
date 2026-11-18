const PanpanFortuneStall=(()=>{
    const signBoxKey='panpan.fortune-sign-box-v1';
    let deckRequest;
    let hostArt;

    function prepare(){
        hostArt??=['fortune-master','fortune-arrival'].map(name=>{
            const image=new Image();
            image.src='../assets/panpan-2d/'+name+'.webp';
            return image;
        });
        return Promise.all(hostArt.map(image=>image.decode()));
    }

    function getDeck(){
        deckRequest??=fetch('../assets/stall-signs.json').then(response=>{
            if(!response.ok) throw new Error('Fortune slips unavailable');
            return response.json();
        }).catch(error=>{
            deckRequest=undefined;
            throw error;
        });
        return deckRequest;
    }

    function savedSigns(){
        try{
            const list=JSON.parse(localStorage.getItem(signBoxKey));
            if(Array.isArray(list)) return list.filter(card=>card&&
                ['key','title','verse','reply','today'].every(key=>typeof card[key]==='string'));
        }catch{}
        return [];
    }

    function fillSign(card,{id,title,verse}){
        const number=card.querySelector('.fortune-sign-number');
        number.hidden=!Number.isInteger(id);
        if(!number.hidden) number.textContent='第 '+String(id).padStart(2,'0')+' 签';
        card.querySelector('.fortune-card-title').textContent=title;
        card.querySelector('.fortune-verse').textContent=verse;
    }

    function fillReading(card,{quote,meaning,reply,today}){
        const signMeaning=card.querySelector('.fortune-meaning');
        signMeaning.hidden=!meaning;
        if(meaning){
            const words=signMeaning.querySelector('q');
            words.hidden=!quote;
            words.textContent=quote??'';
            signMeaning.querySelector('.fortune-meaning-text').textContent=meaning;
        }
        card.querySelector('.fortune-reply').textContent=reply;
        card.querySelector('.fortune-today-text').textContent=today;
    }

    const signMarkup=`
        <header><p class="fortune-sign-meta"><span>签文</span><span class="fortune-sign-number" hidden></span></p>
        <h4 class="fortune-card-title"></h4></header>
        <blockquote class="fortune-verse"></blockquote>`;

    const readingMarkup=`
        <h4>潘潘解签</h4>
        <div class="fortune-meaning" hidden><strong>签里的意思</strong><p><q></q><span class="fortune-meaning-text"></span></p></div>
        <div class="fortune-for-you"><strong>说回你这件事</strong><p class="fortune-reply"></p></div>
        <p class="fortune-today"><strong>今日宜</strong><span class="fortune-today-text"></span></p>`;

    function dialogueLines(label,line){
        const characters=Array.from(line);
        const pages=[];
        const limit=46;
        for(let start=0;start<characters.length;){
            let end=Math.min(start+limit,characters.length);
            if(end<characters.length){
                for(let split=end;split>start+22;split--){
                    if('。！？；，、,.!?; '.includes(characters[split-1])){
                        end=split;
                        break;
                    }
                }
            }
            pages.push({label,line:characters.slice(start,end).join('').trim()});
            start=end;
        }
        return pages;
    }

    const readings=[
        ['心急的时候，留一点赶路的余地。','先分清哪一步真的有截止时间。','把眼前最急的一件事写下来。'],
        ['吃饱一点，再回头想难想的事。','人饿着的时候，什么都像大事。','喝杯水，或者找点东西吃。'],
        ['先腾点地方，才接得住新东西。','看看这件事里，有哪一样能先放下。','收拾桌角，或者划掉一件今天能缓的事。'],
        ['难事先从能动手的一小步做起。','第一步只要做得出来，就算数。','写下五分钟里能做的一个动作。'],
        ['把话想清楚，再决定怎么开口。','可以先写下来，看看哪一句最想让对方听懂。','写一句草稿，暂时留在手边。'],
        ['有一点可以走的路，就先走一点。','等全都准备好，可能要等很久。','找出一件现在就能确认的小事。'],
    ];

    function show(desk,{speech,pose,animate,close}){
        speech.innerHTML=`
            <p class="fortune-speech-speaker">潘潘<span></span></p>
            <p class="fortune-speech-line" aria-live="polite" aria-atomic="true"></p>
            <div class="fortune-speech-controls" hidden>
                <button type="button" class="fortune-speech-prev" aria-label="上一句">←</button>
                <button type="button" class="fortune-speech-next">继续</button>
            </div>`;
        desk.innerHTML=`
            <header class="fortune-desk-head">
                <h3 id="fortune-desk-title" tabindex="-1">问潘半仙</h3>
                <div class="fortune-desk-tools">
                    <button class="fortune-link" type="button" id="fortune-box-toggle" aria-expanded="false" aria-controls="fortune-box">签盒</button>
                    <button class="fortune-link" type="button" id="fortune-close">收起</button>
                </div>
            </header>
            <div id="fortune-visit">
                <form class="fortune-form">
                    <label for="fortune-message">哪件事，你想了两遍？</label>
                    <p class="fortune-notice">抽签后可以听潘潘读这支签的预写解读。你写下的话只留在此页。</p>
                    <div class="fortune-controls">
                        <input id="fortune-message" name="message" type="text" maxlength="120" placeholder="比如，有句话不知道怎么开口" required>
                        <button class="fortune-primary" type="submit">请潘潘摇一支</button>
                    </div>
                </form>
                <section class="fortune-drawn" hidden>
                    <div class="fortune-paper fortune-sign" id="fortune-sign" role="group" aria-label="抽到的签" tabindex="-1">${signMarkup}</div>
                    <p class="fortune-question"><strong>你问的是</strong><span class="fortune-question-copy"></span></p>
                    <div class="fortune-read-controls">
                        <button class="fortune-primary" id="fortune-read" type="button">请潘潘解签</button>
                        <button class="fortune-link" id="fortune-reset" type="button">换个问题</button>
                    </div>
                </section>
                <p class="fortune-notice" role="status"></p>
                <section class="fortune-result" aria-label="潘潘解签" tabindex="-1" hidden>
                    <div class="fortune-result-controls">
                        <button class="fortune-primary" id="fortune-save" type="button">夹进签盒</button>
                        <button class="fortune-link" id="fortune-replay" type="button">重看解签</button>
                        <button class="fortune-link" id="fortune-again" type="button">再问一件</button>
                    </div>
                    <p class="fortune-save-note" role="status"></p>
                </section>
            </div>
            <section id="fortune-box" class="fortune-box" aria-label="存下的签" hidden></section>`;

        const find=selector=>desk.querySelector(selector);
        const heading=find('h3');
        const visit=find('#fortune-visit');
        const form=find('form');
        const prompt=form.elements.message;
        const draw=form.querySelector('button');
        const notice=find('.fortune-notice[role="status"]');
        const drawn=find('.fortune-drawn');
        const signCard=find('#fortune-sign');
        const question=find('.fortune-question-copy');
        const readControls=find('.fortune-read-controls');
        const read=find('#fortune-read');
        const reset=find('#fortune-reset');
        const result=find('.fortune-result');
        const save=find('#fortune-save');
        const saveNote=find('.fortune-save-note');
        const boxToggle=find('#fortune-box-toggle');
        const box=find('#fortune-box');
        const scene=speech.closest('.stage');
        const sprite=scene.querySelector('.fortune-host-costume');
        const location=scene.querySelector('.location');
        const speechLabel=speech.querySelector('.fortune-speech-speaker span');
        const speechLine=speech.querySelector('.fortune-speech-line');
        const speechControls=speech.querySelector('.fortune-speech-controls');
        const previous=speech.querySelector('.fortune-speech-prev');
        const next=speech.querySelector('.fortune-speech-next');
        const controller=new AbortController();
        let deck;
        let sign;
        let card;
        let pending=false;
        let pages=[];
        let page=0;
        let speaking=false;

        function layout(){
            if(speech.hidden) return;
            const stageRect=scene.getBoundingClientRect();
            const actorRect=sprite.getBoundingClientRect();
            const headerBottom=location.getBoundingClientRect().bottom-stageRect.top;
            const faceLeft=actorRect.left-stageRect.left+actorRect.width*.17;
            const faceRight=actorRect.right-stageRect.left-actorRect.width*.14;
            const mouth=actorRect.top-stageRect.top+actorRect.height*.58;
            const leftRoom=faceLeft-20;
            const rightRoom=stageRect.width-faceRight-20;
            const onRight=rightRoom>=260||rightRoom>leftRoom;
            const width=Math.min(326,onRight?rightRoom:leftRoom);
            speech.dataset.side=onRight?'right':'left';
            speech.style.width=width+'px';
            speech.style.left=(onRight?faceRight+12:faceLeft-12-width)+'px';
            const height=speech.offsetHeight;
            const minimum=Math.min(headerBottom+7,stageRect.height-height-10);
            const top=Math.max(8,minimum,Math.min(stageRect.height-height-10,mouth-height*.44));
            speech.style.top=top+'px';
            speech.style.setProperty('--fortune-speech-tail',Math.max(12,Math.min(height-12,mouth-top))+'px');
        }

        function syncSpeech(){
            speech.hidden=!speaking||!box.hidden;
            layout();
        }

        function revealSpeech(focus){
            speaking=true;
            syncSpeech();
            if(speech.hidden||!focus) return;
            speech.focus({preventScroll:true});
            speech.scrollIntoView({block:'nearest'});
        }

        function sayPage(focus=false){
            const {label,line}=pages[page];
            speechLabel.textContent=label;
            speechLine.textContent=line;
            speechControls.hidden=false;
            previous.disabled=page===0;
            next.textContent=page===pages.length-1?'收起对白':'继续';
            pose(label==='今日宜'?'offer':'read');
            revealSpeech(focus);
            if(!speech.hidden&&animate()) speechLine.animate([
                {opacity:.45,transform:'translateY(3px)'},
                {opacity:1,transform:'translateY(0)'},
            ],{duration:190,easing:'ease-out'});
        }

        function hideSpeech(){
            speaking=false;
            syncSpeech();
        }

        previous.onclick=()=>{
            if(page===0) return;
            page--;
            sayPage(page===0);
        };
        next.onclick=()=>{
            if(page<pages.length-1){
                page++;
                sayPage();
            }else{
                hideSpeech();
                result.focus({preventScroll:true});
                result.scrollIntoView({block:'nearest'});
            }
        };

        function wait(ms){
            if(!animate()) return Promise.resolve();
            return new Promise(resolve=>setTimeout(resolve,ms));
        }

        function updateBox(){
            const list=savedSigns();
            box.replaceChildren();
            if(!list.length){
                const line=document.createElement('p');
                line.textContent='等潘潘递签过来，喜欢就夹在这里。';
                box.append(line);
                return;
            }
            for(const saved of list){
                const entry=document.createElement('details');
                const title=document.createElement('summary');
                title.textContent=saved.title;
                const savedCard=document.createElement('div');
                savedCard.className='fortune-paper';
                savedCard.innerHTML='<div class="fortune-saved-sign">'+signMarkup+'</div>'+readingMarkup;
                fillSign(savedCard,saved);
                fillReading(savedCard,saved);
                entry.append(title,savedCard);
                box.append(entry);
            }
        }

        boxToggle.onclick=()=>{
            const opening=box.hidden;
            if(opening) updateBox();
            box.hidden=!opening;
            visit.hidden=opening;
            boxToggle.textContent=opening?'回桌前':'签盒';
            boxToggle.setAttribute('aria-expanded',String(opening));
            syncSpeech();
        };
        find('#fortune-close').onclick=close;

        function restart(){
            sign=undefined;
            card=undefined;
            hideSpeech();
            form.hidden=false;
            result.hidden=true;
            drawn.hidden=true;
            readControls.hidden=false;
            prompt.value='';
            prompt.readOnly=false;
            draw.disabled=!deck;
            notice.textContent='';
            saveNote.textContent='';
            pose('idle');
            prompt.focus({preventScroll:true});
        }

        draw.disabled=true;
        pose('idle');
        getDeck().then(items=>{
            if(controller.signal.aborted) return;
            deck=items;
            draw.disabled=false;
        }).catch(()=>{
            if(!controller.signal.aborted) notice.textContent='签筒还没准备好，收起来再试一次。';
        });

        form.onsubmit=async event=>{
            event.preventDefault();
            const message=prompt.value.trim();
            if(!message||!deck?.length||pending||sign) return;
            pending=true;
            draw.disabled=true;
            prompt.readOnly=true;
            sign={...deck[Math.floor(Math.random()*deck.length)],message};
            pose('shake');
            notice.textContent='潘潘摇了摇签筒。';
            await wait(900);
            if(controller.signal.aborted) return;
            pending=false;
            pose('read');
            fillSign(signCard,sign);
            question.textContent=message;
            read.textContent='请潘潘解签';
            read.disabled=false;
            reset.disabled=false;
            notice.textContent='';
            form.hidden=true;
            drawn.hidden=false;
            if(box.hidden){
                signCard.focus({preventScroll:true});
                readControls.scrollIntoView({block:'nearest'});
            }
        };

        read.onclick=async()=>{
            if(!sign||pending||card) return;
            pending=true;
            read.disabled=true;
            reset.disabled=true;
            notice.textContent='';
            speechLabel.textContent='';
            speechLine.textContent='天机稍等，字有点小。';
            speechControls.hidden=true;
            revealSpeech(true);

            const {id,title,verse}=sign;
            await wait(720);
            if(controller.signal.aborted) return;
            pending=false;
            const [meaning,reply,today]=readings[id-1]??readings[0];
            const quote=verse;
            card={key:crypto.randomUUID(),id,title,verse,quote,meaning,reply,today};
            save.disabled=false;
            save.textContent='夹进签盒';
            saveNote.textContent='';
            readControls.hidden=true;
            notice.textContent='';
            result.hidden=false;
            pages=[
                ...dialogueLines('签里的意思',quote?'「'+quote+'」 '+meaning:meaning),
                ...dialogueLines('潘潘想了想',reply),
                ...dialogueLines('今日宜',today),
            ];
            page=0;
            sayPage(true);
        };

        save.onclick=()=>{
            if(!card) return;
            const list=savedSigns();
            try{
                if(!list.some(saved=>saved.key===card.key))
                    localStorage.setItem(signBoxKey,JSON.stringify([card,...list]));
                save.disabled=true;
                save.textContent='已夹进签盒';
                saveNote.textContent='下次来摊前，可以再翻这张。';
            }catch{
                saveNote.textContent='这次没存进去，可以再点一次。';
            }
        };

        find('#fortune-again').onclick=restart;
        find('#fortune-replay').onclick=()=>{
            page=0;
            sayPage(true);
        };
        reset.onclick=restart;
        return {close:()=>{
            controller.abort();
            hideSpeech();
        },focus:()=>heading.focus({preventScroll:true}),layout};
    }

    return {prepare,show};
})();
