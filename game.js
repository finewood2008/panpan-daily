(() => {
    const $ = id => document.getElementById(id);
    const {scenes,bed,snapshot,journal}=PanpanGame;
    const {minuteNow,clockText,dateText}=PanpanTime;
    let sceneMotion=true;
    let place='alley';
    let openSheet='';
    let currentBackground;
    let currentItems='';
    let focusFrom;
    let state;
    let motionSheet;
    let destination;
    let roomView;
    let roomDrag;
    let liveBit;
    let finishedBit;
    let actorAnchor;
    let actorPhase;
    let camera;
    const stage=$('stage');
    const streetCharacter=$('street-character');
    const scenery=stage.querySelector('.scenery');
    const actorElement=$('actor');
    const shadow=$('shadow');
    const sleepFrame=$('sleep-frame');
    const bedActorContext=sleepFrame.getContext('2d');
    const sleepingPose=new Image();
    sleepingPose.addEventListener('load',()=>showBedFrame(actorPhase==='sleep'));
    sleepingPose.src='/panpan-daily/assets/panpan-2d/sleeping-on-pillow.webp';
    const {width:mapWidth,height:mapHeight,margin}=PanpanMapView;
    const ambience=PanpanAmbience.create($('alley-ambience'),$('city-picture'),$('interior-ambience'),$('setting'));
    const paintWindow=InteriorEffects.windowView($('window-view'));
    const mapView=PanpanMapView.create($('panorama'),$('city-art'),$('map-camera'));
    const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
    const actor=PanpanActor.create(actorElement,reducedMotion,positionActor,ambience.setGameFrame,showThought,finishBit,showBedFrame);
    function setSceneMotion(enabled){
        stage.dataset.motion=enabled?'on':'off';
        ambience.setEnabled(enabled);
        actor.setEnabled(enabled);
    }
    setSceneMotion(sceneMotion);
    const sheet=$('sheet');
    const body=$('sheet-body');
    const setting=$('setting');
    const note=$('note');
    const foreground=$('foreground');
    const locationIds=['home','pack','noodle','stall'];
    const interiors=Object.fromEntries([...locationIds,'bathroom'].map(id=>{
        const image=new Image();
        image.src='/panpan-daily/assets/'+scenes[id].image+'.webp';
        return [id,image];
    }));
    const showerCurtain=$('shower-curtain');

    function setText(id,value){
        if($(id).textContent!==value) $(id).textContent=value;
    }

    function updateLayout(){
        const width=stage.clientWidth;
        const height=stage.clientHeight;
        scenery.style.setProperty('--stage-height',height+'px');
        camera={width,height,pictureWidth:Math.max(width,height*1672/941)};
        followActor();
        positionThought();
    }

    function followActor(){
        if(!camera) return;
        const {width:w,height:h,pictureWidth}=camera;
        const crop=(pictureWidth-w)/2;
        const actorHere=Boolean(actorAnchor);
        const center=actorPhase==='sleep'?bed.pillow[0]:actorHere?actorAnchor[0]:place===state?.place?41:scenes[place].center;
        const offset=(50-(center??47))/100*pictureWidth;
        const margin=actorHere?h*actorAnchor[2]*.00375+18:0;
        const visibleRadius=Math.max(0,w/2-margin);
        const desired=w<640?offset-(place==='bathroom'&&actorHere?32:0):Math.sign(offset)*Math.max(0,Math.abs(offset)-visibleRadius);
        const shift=place==='home'?(roomView??desired):desired;
        scenery.style.setProperty('--view-shift',Math.max(-crop,Math.min(crop,shift))+'px');
    }

    stage.addEventListener('pointerdown',event=>{
        roomDrag=undefined;
        if(place!=='home'||!event.isPrimary||event.button!==0||!camera||camera.pictureWidth<=camera.width) return;
        if(event.target.closest('.location button,.note')) return;
        roomDrag={id:event.pointerId,x:event.clientX,y:event.clientY,
            start:parseFloat(scenery.style.getPropertyValue('--view-shift'))||0,moved:false};
    });
    stage.addEventListener('pointermove',event=>{
        if(!roomDrag||roomDrag.id!==event.pointerId) return;
        const dx=event.clientX-roomDrag.x;
        const dy=event.clientY-roomDrag.y;
        if(!roomDrag.moved){
            if(Math.abs(dy)>8&&Math.abs(dy)>=Math.abs(dx)){roomDrag=undefined;return;}
            if(Math.abs(dx)<8) return;
            roomDrag.moved=true;
            stage.setPointerCapture(event.pointerId);
        }
        const crop=(camera.pictureWidth-camera.width)/2;
        roomView=Math.max(-crop,Math.min(crop,roomDrag.start+dx));
        followActor();
        positionThought();
    });
    stage.addEventListener('pointerup',event=>{
        if(event.pointerId===roomDrag?.id) roomDrag.id=undefined;
    });
    stage.addEventListener('pointercancel',()=>{roomDrag=undefined;});
    function positionActor(x,y,height,phase){
        actorAnchor=[x,y,height];
        const surface=place==='alley'?streetCharacter:scenery;
        surface.style.setProperty('--x',`${x}%`);
        surface.style.setProperty('--y',`${y}%`);
        surface.style.setProperty('--actor-height',`${height}%`);
        const shift=currentActivity();
        const seated=phase==='sleep'||phase==='rise'||
            Boolean(shift?.seat)&&(phase==='sit'||phase==='activity');
        shadow.hidden=seated;
        if(actorPhase!==phase){
            actorPhase=phase;
            stage.dataset.actorPhase=phase;
            foreground.hidden=phase!=='walk'||place==='pack';
            note.hidden=place!=='home'||!['activity','sleep'].includes(phase);
            if(shift?.place===place) showPresence(shift);
        }
        followActor();
    }

    function showBedFrame(asleep){
        sleepFrame.hidden=!(asleep&&sleepingPose.complete&&sleepingPose.naturalWidth);
        if(sleepFrame.hidden) return;
        bedActorContext.clearRect(0,0,1672,941);
        bedActorContext.drawImage(sleepingPose,543,212);
    }

    function showThought(line){
        const bubble=$('thought-bubble');
        bubble.hidden=!line;
        if(line){
            bubble.textContent=line;
            positionThought();
        }
    }

    function positionThought(){
        const bubble=$('thought-bubble');
        if(bubble.hidden||!camera) return;
        const actorBox=actorElement.getBoundingClientRect();
        const bounds=stage.getBoundingClientRect();
        if(actorBox.right<bounds.left||actorBox.left>bounds.right){
            bubble.style.visibility='hidden';
            return;
        }
        bubble.style.visibility='';
        const center=actorBox.left+actorBox.width/2-bounds.left;
        const half=bubble.offsetWidth/2+10;
        const x=Math.max(half,Math.min(camera.width-half,center));
        const above=actorBox.top-bounds.top-15;
        let y=above;
        let belowActor=false;
        const headerBottom=Math.max(0,...Array.from($('place').closest('.location').children,element=>{
            const box=element.getBoundingClientRect();
            return box.width&&box.height&&x-half<box.right-bounds.left&&x+half>box.left-bounds.left&&above>box.top-bounds.top-6
                ?box.bottom-bounds.top:0;
        }));
        if(headerBottom&&above-bubble.offsetHeight<headerBottom+6){
            const right=actorBox.right-bounds.left+bubble.offsetWidth+22;
            if(right<camera.width){
                bubble.classList.remove('below');
                bubble.style.left=`${right-half}px`;
                bubble.style.top=`${Math.max(54,y+46)}px`;
                bubble.style.setProperty('--tail',`${Math.min(15,bubble.offsetWidth/2)}px`);
                return;
            }
            const below=actorBox.bottom-bounds.top+bubble.offsetHeight+13;
            const floor=note.hidden?camera.height:note.getBoundingClientRect().top-bounds.top;
            belowActor=below+9<floor;
            y=belowActor?below:Math.min(headerBottom+8+bubble.offsetHeight,actorBox.top-bounds.top+actorBox.height*.28);
        }
        bubble.classList.toggle('below',belowActor);
        bubble.style.left=`${x}px`;
        bubble.style.top=`${Math.max(bubble.offsetHeight+9,y)}px`;
        bubble.style.setProperty('--tail',`${Math.max(13,Math.min(bubble.offsetWidth-13,half-10+center-x))}px`);
    }

    function describe(shift){
        if(shift.place==='away') return '潘潘'+shift.label+'，大约 '+clockText(shift.returnAt)+' 回来。';
        const location=scenes[shift.place].short||scenes[shift.place].name;
        if(shift.pose==='sleep') return '潘潘已经睡了，06:30 起床。';
        if(shift.place==='alley') return '潘潘在巷子里转悠。';
        return '潘潘在'+location+'，'+shift.label.replace(/^在/,'')+'。';
    }

    function showPresence(shift){
        const walking=shift.pose==='sleep'?'走到床边':shift.pose==='gaming'?'走到电脑旁':'走过来';
        const movement={walk:walking,sit:'坐下来',rise:'从凳子上站起来',turn:'停下脚步',prepare:'停下脚步'};
        setText('presence','潘潘'+(movement[actorPhase]||shift.label));
    }

    function currentActivity(){
        return liveBit?.activity??state;
    }

    function finishBit(){
        if(!liveBit) return;
        finishedBit=liveBit.at;
        liveBit=undefined;
        render();
    }

    function updateBit(){
        if(state.place!==place||state.bitAt!==liveBit?.at) liveBit=undefined;
        if(!liveBit&&state.bit&&state.place===place&&state.bitAt!==finishedBit){
            liveBit={at:state.bitAt,activity:{...state.bit,line:state.line}};
        }
    }

    function render(){
        const now=minuteNow();
        state=snapshot(now);
        updateBit();
        const shift=currentActivity();
        const location=scenes[place];
        const isAlley=place==='alley';
        const atHome=place==='home';
        const inBathroom=place==='bathroom';
        const bathroomAction=inBathroom?state.bathroomAction:undefined;
        const present=place===shift.place&&!bathroomAction;
        const {period,weather,rain}=state;
        const background=location.image;
        if(!isAlley&&currentBackground!==background){
            currentBackground=background;
            setting.src='/panpan-daily/assets/'+background+'.webp';
        }
        stage.dataset.scene=place;
        stage.toggleAttribute('data-bathroom-action',Boolean(bathroomAction));
        streetCharacter.toggleAttribute('data-leaf',isAlley&&shift.pose==='leaf-salute');
        mapView.setActive(isAlley);
        const actorLayer=isAlley?streetCharacter:scenery;
        if(actorElement.parentNode!==actorLayer){
            if(isAlley) actorLayer.append(shadow,actorElement);
            else sleepFrame.before(shadow,actorElement);
        }
        stage.dataset.period=period;
        stage.dataset.weather=weather;
        stage.dataset.rain=rain>.65?'heavy':'light';
        $('window-view').hidden=!atHome;
        if(atHome) paintWindow(period,weather);
        if(!present){
            actorAnchor=undefined;
            actorPhase=undefined;
            shadow.hidden=true;
            delete stage.dataset.actorPhase;
            foreground.hidden=true;
        }
        const approach=shift.approach??location.approach;
        actor.show(present?{scene:place,pose:shift.pose,anchor:shift.anchor,approach,seat:shift.seat,
            bit:shift.thought?shift:undefined}:null);
        const asleep=present&&actorPhase==='sleep';
        ambience.setScene({place,asleep,period,weather,rain,pose:present?shift.pose:undefined,bathroomAction});
        setText('address',location.detail);
        setText('place',location.name);
        setText('clock',clockText(now)+' · '+state.weatherName);
        $('clock-button').title=state.periodName+' · '+state.weatherName;
        $('presence').hidden=false;
        if(present) showPresence(shift);
        else setText('presence',describe(state));
        note.hidden=!atHome||(present&&!asleep&&actorPhase!=='activity');
        if(atHome){
            setText('note-tag',present?'潘潘说':'潘潘的桌边便笺');
            setText('note-line','「'+(state.place==='home'||state.place==='away'?state.line:'门留着。忙完就回来。')+'」');
        }
        $('bathroom-door').hidden=!atHome;
        $('bathroom-back').hidden=!inBathroom;
        showerCurtain.hidden=bathroomAction!=='shower';
        $('home').setAttribute('aria-pressed',String(atHome||inBathroom));
        $('map').setAttribute('aria-pressed',String(isAlley));

        if(openSheet==='journal') showJournal(now);
        if(openSheet==='weather') updateWeatherSheet(now);
        if(openSheet==='visit') updateVisitSheet();
        updateLayout();
    }

    function showPlace(id){
        liveBit=undefined;
        roomView=undefined;
        roomDrag=undefined;
        place=id;
        render();
        $('place').setAttribute('tabindex','-1');
        $('place').focus({preventScroll:true});
    }

    async function go(id){
        if(place===id&&destination?.id===id) return;
        const request={id};
        destination=request;
        const fromMap=place==='alley';
        $('hotspots').hidden=id!=='alley';
        ambience.setEntry(null);
        const animate=sceneMotion&&!reducedMotion.matches;
        if(id==='alley'){
            showPlace(id);
            mapView.setFocus(undefined,animate);
            return;
        }
        const camera=fromMap&&scenes[id].entry?mapView.setFocus(scenes[id].entry.view,animate):undefined;
        try{
            await Promise.all([camera,interiors[id].decode(),id==='bathroom'?showerCurtain.decode():undefined]);
        }catch{
            if(destination!==request||!fromMap) return;
            $('hotspots').hidden=false;
            mapView.setFocus(undefined,animate);
            setText('place','场景暂时无法打开');
            return;
        }
        if(destination!==request) return;
        showPlace(id);
    }

    for(const id of locationIds){
        const {name,entry}=scenes[id];
        const [x,y,w,h]=entry.bounds;
        const button=document.createElement('button');
        button.type='button';
        button.className='map-entry';
        button.dataset.entry=id;
        button.setAttribute('aria-label','进入'+name);
        button.style.left=((x+margin)/mapWidth*100)+'%';
        button.style.top=(y/mapHeight*100)+'%';
        button.style.width=(w/mapWidth*100)+'%';
        button.style.height=(h/mapHeight*100)+'%';
        button.style.clipPath='polygon('+entry.outline+')';
        button.onpointerenter=event=>{
            if(event.pointerType==='mouse'&&!$('panorama').classList.contains('close-view')) ambience.setEntry(id);
        };
        button.onpointerleave=()=>ambience.setEntry(null);
        button.onfocus=()=>{
            if(button.matches(':focus-visible')) ambience.setEntry(id);
        };
        button.onblur=()=>ambience.setEntry(null);
        button.onclick=()=>go(id);
        $('hotspots').append(button);
    }

    function open(kind,title,from){
        mapView.stopEdge();
        focusFrom=from;
        openSheet=kind;
        setText('sheet-title',title);
        sheet.showModal();
        $('close').focus();
        sheet.scrollTop=0;
    }

    function showJournal(now){
        const entries=journal(now);
        const key=entries.map(item=>item.at).join('|');
        if(key===currentItems) return;
        currentItems=key;
        const scroll=sheet.scrollTop;
        const prelude=document.createElement('p');
        prelude.className='sheet-copy';
        prelude.textContent='潘潘顺手记下的几件小事。';
        const cards=entries.map(item=>{
            const card=document.createElement('article');
            card.className='post';
            const photo=document.createElement('img');
            photo.src='/panpan-daily/assets/'+item.image+'.webp';
            photo.alt='';
            photo.loading='lazy';
            photo.decoding='async';
            const copy=document.createElement('div');
            const meta=document.createElement('small');
            meta.textContent=dateText(item.at)+' · '+clockText(item.at)+(item.walk?' · 散步回来':'');
            const title=document.createElement('h3');
            title.textContent=item.title;
            const line=document.createElement('p');
            line.textContent=item.line;
            copy.append(meta,title,line);
            card.append(photo,copy);
            return card;
        });
        body.replaceChildren(prelude,...cards);
        sheet.scrollTop=scroll;
    }

    function updateVisitSheet(){
        setText('visit-location',describe(state));
        const button=$('find-panpan');
        button.hidden=state.place===place;
        const label=state.place==='away'?'去小屋看看':'去找他';
        if(button.textContent!==label) button.textContent=label;
    }

    $('visit').onclick=()=>{
        body.innerHTML=`
            <div class="visit-intro">
                <img src="/panpan-daily/assets/panpan-2d/portrait.webp" alt="">
                <div><h3>潘潘</h3><p>住在二楼靠窗那间。平常在巷尾帮人打包，收了摊，就回家坐会儿。</p></div>
            </div>
            <p id="visit-location" class="visit-location"></p>
            <button type="button" class="text-button" id="find-panpan"></button>`;
        $('find-panpan').onclick=()=>{
            const shift=snapshot(minuteNow());
            focusFrom=undefined;
            sheet.close();
            go(shift.place==='away'?'home':shift.place);
        };
        updateVisitSheet();
        open('visit','来看看潘潘',$('visit'));
    };

    $('home').onclick=()=>go('home');
    $('map').onclick=()=>go('alley');
    $('bathroom-door').onclick=()=>go('bathroom');
    $('bathroom-back').onclick=()=>go('home');
    $('journal').onclick=()=>{
        currentItems=undefined;
        showJournal(minuteNow());
        open('journal','潘潘的生活手记',$('journal'));
    };

    function updateWeatherSheet(now){
        setText('weather-now','深圳 · '+dateText(now)+' '+clockText(now)+' · '+state.weatherName);
        setText('weather-routine',describe(state));
        const next=state.forecast;
        setText('weather-next',next?'下一次天气变化 · '+dateText(next.minute)+' '+clockText(next.minute)+' · '+next.label:'这两天的天气比较稳定。');
    }

    $('clock-button').onclick=()=>{
        body.innerHTML='<div class="weather-sheet"><p id="weather-now"></p><p id="weather-routine"></p><p id="weather-next"></p></div>';
        $('clock-button').setAttribute('aria-expanded','true');
        open('weather','时间和天气',$('clock-button'));
        render();
    };

    $('about').onclick=()=>{
        body.innerHTML='<p>潘潘按深圳时间过日子。早上吃完饭出门，午饭在面馆吃，下午在杂货摊，晚上回小屋。碰上下雨，他会提早收摊。</p><p>点「看潘潘」，看看他这会儿在哪儿。扑了个空，可以逛逛巷子，或翻一翻他写的生活手记。过一阵再来，也许他已经回来了。</p>';
        const motion=document.createElement('label');
        motion.className='motion-setting';
        const check=document.createElement('input');
        check.type='checkbox';
        const motionText=document.createElement('span');
        const syncMotionSetting=()=>{
            check.checked=sceneMotion&&!reducedMotion.matches;
            check.disabled=reducedMotion.matches;
            motion.setAttribute('aria-disabled',String(check.disabled));
            motionText.textContent=check.disabled?'场景动画已按系统设置暂停':'场景动画';
        };
        syncMotionSetting();
        check.onchange=()=>{
            sceneMotion=check.checked;
            setSceneMotion(sceneMotion);
            render();
        };
        motionSheet=new AbortController();
        reducedMotion.addEventListener('change',syncMotionSetting,{signal:motionSheet.signal});
        motion.append(check,motionText);
        body.append(motion);
        open('about','怎么逛',$('about'));
    };
    $('close').onclick=()=>sheet.close();
    sheet.addEventListener('click',event=>{
        if(event.target===sheet){
            const r=sheet.getBoundingClientRect();
            if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom) sheet.close();
        }
    });
    sheet.addEventListener('close',()=>{
        if(openSheet==='weather') $('clock-button').setAttribute('aria-expanded','false');
        motionSheet?.abort();
        motionSheet=null;
        openSheet='';
        focusFrom?.focus();
    });

    render();
    const requestedScene=new URLSearchParams(location.search).get('scene');
    if(locationIds.includes(requestedScene)) go(requestedScene);
    new ResizeObserver(updateLayout).observe(stage);
    setInterval(()=>{
        if(!document.hidden) render();
    },1000);
    document.addEventListener('visibilitychange',()=>{
        document.body.toggleAttribute('data-background',document.hidden);
        if(!document.hidden) render();
    });
    window.addEventListener('pageshow',render);
    reducedMotion.addEventListener('change',()=>render());
})();
