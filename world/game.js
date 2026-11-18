(() => {
    const $ = id => document.getElementById(id);
    const {scenes,bed,actionGroups,snapshot,journal,fortuneVisit,photoVisit,toiletVisit,bathroomThreshold,bathroomHall}=PanpanGame;
    const {minuteNow,speedNow,setSpeed,speeds,clockText,dayText,dayMinutes}=PanpanTime;
    let sceneMotion=true;
    let place='alley';
    let openSheet='';
    let stallPanel;
    let fortuneSession;
    let currentBackground;
    let currentItems='';
    let focusFrom;
    let state;
    let motionSheet;
    let destination;
    let preview;
    let propAction;
    let following=false;
    let departure;
    let streetTrip;
    let showerEntry;
    let showerMotion;
    let lastMinute;
    let roomView;
    let roomDrag;
    let liveBit;
    let finishedBit;
    let hostBitNext=0;
    let hostBitLast=-1;
    let hostThoughtCounts=[];
    let actorAnchor;
    let actorPhase;
    let camera;
    const sleepMessage='潘潘正在睡觉，别打扰他';
    let sleepNoticeTimer;
    const stage=$('stage');
    const streetCharacter=$('street-character');
    streetCharacter.style.setProperty('--leaf-x',`${PanpanStreet.rest[0]-1.1}%`);
    streetCharacter.style.setProperty('--leaf-y',`${PanpanStreet.rest[1]}%`);
    const umbrellaSpot=PanpanGame.sceneBits.alley.find(bit=>bit.pose==='umbrella-flip').anchor;
    streetCharacter.style.setProperty('--umbrella-x',`${umbrellaSpot[0]+.19}%`);
    streetCharacter.style.setProperty('--umbrella-y',`${umbrellaSpot[1]-1.14}%`);
    const streetForeground=$('street-foreground');
    const scenery=stage.querySelector('.scenery');
    const actorElement=$('actor');
    const actionProps=[];
    const shadow=$('shadow');
    const sleepFrame=$('sleep-frame');
    const bedActorContext=sleepFrame.getContext('2d');
    const sleepingPose=new Image();
    let bedFrameMode=false;
    sleepingPose.addEventListener('load',()=>showBedFrame(bedFrameMode));
    sleepingPose.src='../assets/panpan-2d/sleeping-on-pillow.webp';
    const {width:mapWidth,height:mapHeight,margin}=PanpanMapView;
    const streetCovers=PanpanStreet.foregrounds.map(({bounds,outline})=>{
        const element=document.createElement('div');
        element.style.clipPath='polygon('+outline.map(([x,y])=>x/mapWidth*100+'% '+y/mapHeight*100+'%').join(',')+')';
        element.hidden=true;
        streetForeground.append(element);
        return {element,bounds};
    });
    const ambience=PanpanAmbience.create($('alley-ambience'),$('city-picture'),$('interior-ambience'),$('setting'));
    const paintWindow=InteriorEffects.windowView($('window-view'));
    const mapView=PanpanMapView.create($('panorama'),$('city-art'),$('map-camera'));
    const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
    stage.toggleAttribute('data-tea-on-table',true);
    stage.toggleAttribute('data-book-on-table',true);
    stage.toggleAttribute('data-ledger-on-table',true);
    stage.toggleAttribute('data-stackbox-on-table',true);
    stage.toggleAttribute('data-stamp-on-table',true);
    stage.toggleAttribute('data-mainparcel-on-table',true);
    stage.toggleAttribute('data-rag-on-table',true);
    stage.toggleAttribute('data-chopsticks-on-table',true);
    stage.toggleAttribute('data-dumbbell-on-table',true);
    stage.toggleAttribute('data-alarm-on-table',true);
    stage.toggleAttribute('data-bathcap-on-table',true);
    stage.toggleAttribute('data-bathbrush-on-table',true);
    stage.toggleAttribute('data-spoon-on-table',true);
    stage.toggleAttribute('data-receipt-on-table',true);
    stage.toggleAttribute('data-umbrella-on-table',true);
    stage.toggleAttribute('data-groceries-on-table',true);
    const actor=PanpanActor.create(actorElement,reducedMotion,positionActor,ambience.setGameFrame,showThought,finishBit,showBedFrame,
        (prop,visible)=>{
            stage.toggleAttribute(`data-${prop}-on-table`,visible);
            updateActionProps();
        });
    function setSceneMotion(enabled){
        stage.dataset.motion=enabled?'on':'off';
        ambience.setEnabled(enabled);
        actor.setEnabled(enabled);
        if(!enabled&&showerMotion) showerMotion.animation.finish();
    }
    setSceneMotion(sceneMotion);
    const sheet=$('sheet');
    const body=$('sheet-body');
    const setting=$('setting');
    const note=$('note');
    const foreground=$('foreground');
    const bathroomDoorLeaf=$('bathroom-door-leaf');
    const locationIds=Object.keys(scenes).filter(id=>scenes[id].entry);
    const interiors=Object.fromEntries([...locationIds,'bathroom'].map(id=>{
        const image=new Image();
        image.src='../assets/'+scenes[id].image+'.webp';
        return [id,image];
    }));
    const sceneProps=new Map([...scenery.querySelectorAll('.scene-prop')].map(button=>[button.dataset.place,button]));
    const fortuneDesk=$('fortune-desk');
    const fortuneHost=$('fortune-host');
    const fortuneCup=sceneProps.get('fortune');
    const fortuneArrival=fortuneHost.querySelector('.fortune-arrival-sprite');
    function finishFortuneArrival(){
        stage.removeAttribute('data-fortune-arrival');
        fortuneCup.disabled=false;
    }
    fortuneArrival.addEventListener('animationend',()=>{
        finishFortuneArrival();
        if(place!=='fortune'||isSleeping()||!canAnimate()) return;
        fortuneHost.querySelector('.fortune-host-costume').animate([
            {transform:'translateX(-50%) rotate(-2deg)'},
            {transform:'translateX(-50%) rotate(1deg)',offset:.5},
            {transform:'translateX(-50%) rotate(0)'},
        ],{duration:240,easing:'ease-out'});
    });
    fortuneArrival.addEventListener('animationcancel',finishFortuneArrival);
    const booths={
        pack:{title:'巷尾杂货铺',interaction:PanpanShop},
        stall:{title:'二手漫画摊',interaction:PanpanComicStall},
        secondhand:{title:'拍大头贴',interaction:PanpanStallPhoto},
    };
    let activeProp;
    const propObserver=new IntersectionObserver(entries=>{
        for(const entry of entries){
            const button=entry.target;
            if(button!==activeProp) continue;
            const visible=entry.intersectionRatio>=.5;
            button.tabIndex=visible?0:-1;
            button.toggleAttribute('data-in-view',visible);
        }
    },{root:stage,threshold:.5});
    const hosts={fortune:fortuneVisit,secondhand:photoVisit};
    const showerCurtain=$('shower-curtain');
    // Stop on top of the shower threshold, rather than halfway through its vertical face.
    const showerDoor=[70,84.5,34];
    const showerApproach=[...scenes.bathroom.approach,[42,96],[55,94]];
    const enterShower={place:'bathroom',pose:'idle',label:'去洗澡',anchor:showerDoor,approach:showerApproach};
    const returnFromBathroom=[bathroomThreshold,...bathroomHall.toReversed()];

    function pathToBathroom(from){
        const hallway=scenes.home.approach.filter(([x])=>x>from[0]&&x<=27.5);
        if(!hallway.length&&from[1]<81) hallway.push([from[0],81]);
        return [...hallway,...bathroomHall.filter(([x])=>x>from[0]),bathroomThreshold];
    }

    function cancelShowerMotion(){
        if(!showerMotion) return;
        const {animation}=showerMotion;
        showerMotion=undefined;
        stage.removeAttribute('data-shower-transition');
        animation.cancel();
    }

    function moveShowerCurtain(direction,done){
        cancelShowerMotion();
        stage.dataset.showerTransition=direction;
        showerCurtain.hidden=false;
        const open='inset(10% 8% 11% 92%)';
        const closed='inset(10% 8% 11% 59%)';
        const animation=showerCurtain.animate([
            {clipPath:direction==='close'?open:closed},
            {clipPath:direction==='close'?closed:open},
        ],{duration:850,easing:'ease-in-out',fill:'both'});
        showerMotion={animation,direction};
        animation.finished.then(()=>{
            if(showerMotion?.animation!==animation) return;
            showerMotion=undefined;
            stage.removeAttribute('data-shower-transition');
            done();
        },()=>{});
    }

    function setText(id,value){
        if($(id).textContent!==value) $(id).textContent=value;
    }

    function updateLayout(){
        const width=stage.clientWidth;
        const height=stage.clientHeight;
        scenery.style.setProperty('--stage-height',height+'px');
        const pictureWidth=Math.max(width,height*1672/941);
        if(place==='stall'){
            const display=$('stall-covers');
            display.style.setProperty('--stall-width-scale',pictureWidth/1672);
            display.style.setProperty('--stall-height-scale',height/941);
        }
        const propX=place!=='home'&&activeProp ? activeProp.offsetLeft+activeProp.offsetWidth/2 : undefined;
        camera={width,height,pictureWidth,propX};
        followActor();
        positionThought();
        fortuneSession?.layout();
    }

    function followActor(){
        if(!camera) return;
        const {width:w,height:h,pictureWidth,propX}=camera;
        const crop=(pictureWidth-w)/2;
        const actorHere=Boolean(actorAnchor);
        const showerView=place==='bathroom'&&Boolean(state?.bathroomAction);
        const center=place==='fortune'?51.5:actorPhase==='sleep'?bed.pillow[0]:actorHere?actorAnchor[0]:showerView?showerDoor[0]:place===state?.place?41:scenes[place].center;
        const offset=(50-(center??47))/100*pictureWidth;
        const margin=actorHere?h*actorAnchor[2]*.00375+36:0;
        const visibleRadius=Math.max(0,w/2-margin);
        let desired=w<640?offset-(place==='bathroom'&&(actorHere||showerView)?32:0):Math.sign(offset)*Math.max(0,Math.abs(offset)-visibleRadius);
        if(w<640&&place==='bathroom'&&actorHere&&!showerView){
            // Keep the inside door handle in view when Panpan walks over to the toilet.
            const doorOffset=(.5-.169)*pictureWidth-w/2+28;
            desired=Math.max(desired,doorOffset);
        }
        let shift=place==='home'?(roomView??desired):desired;
        if(propX!==undefined){
            const propOffset=pictureWidth/2-propX;
            const propRadius=w/2-Math.min(52,w*.15);
            shift=Math.max(propOffset-propRadius,Math.min(propOffset+propRadius,shift));
        }
        if(actorHere&&w<640&&(place!=='home'||roomView===undefined)){
            const actorOffset=(actorAnchor[0]/100-.5)*pictureWidth;
            shift=Math.max(-actorOffset-visibleRadius,Math.min(-actorOffset+visibleRadius,shift));
        }
        scenery.style.setProperty('--view-shift',Math.max(-crop,Math.min(crop,shift))+'px');
    }

    stage.addEventListener('pointerdown',event=>{
        roomDrag=undefined;
        if(place!=='home'||!event.isPrimary||event.button!==0||!camera||camera.pictureWidth<=camera.width) return;
        if(event.target.closest('.location button,.note,.scene-prop,.action-prop,.home-bathroom-entry')) return;
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
    function positionActor(x,y,height,phase,doorOpening){
        actorAnchor=[x,y,height];
        if(phase==='activity'&&propAction&&preview===propAction.action&&actorElement.dataset.pose===propAction.action.pose&&
            !propAction.timer&&(!propAction.action.thought||!canAnimate())){
            const active=propAction;
            active.timer=setTimeout(()=>finishPropAction(active),canAnimate()?7000:4500);
        }
        const surface=place==='alley'?streetCharacter:scenery;
        surface.style.setProperty('--x',`${x}%`);
        surface.style.setProperty('--y',`${y}%`);
        surface.style.setProperty('--actor-height',`${height}%`);
        if(place==='alley'){
            const px=x*mapWidth/100,py=y*mapHeight/100;
            for(const {element,bounds:[left,right,bottom]} of streetCovers){
                element.hidden=px<left||px>right||py>bottom;
            }
            if(following&&!preview) mapView.track(mapTarget(actorAnchor));
        }
        const shift=currentActivity();
        const hasSeatContact=phase==='activity'&&(
            (place==='home'&&shift?.pose==='gaming')||(place==='noodle'&&shift?.seat));
        const seated=phase==='sleep'||phase==='rise'||phase==='bed'||phase==='handoff'||phase==='sit'||
            Boolean(shift?.seat)&&phase==='activity';
        shadow.toggleAttribute('data-seat-contact',Boolean(hasSeatContact));
        shadow.hidden=seated&&!hasSeatContact;
        const walking=phase==='walk'||phase==='exit';
        const passingHomeDoor=walking||phase==='turn';
        $('home-shoes-foreground').hidden=place!=='home'||!passingHomeDoor||x<12||x>28||y>85.5;
        if(place==='home'){
            // The near jamb masks the part of Panpan still outside the threshold.
            foreground.hidden=!passingHomeDoor||x>12||y>78.2;
        }else if(place==='bathroom'){
            const behindDoor=doorOpening!==undefined&&x<=18;
            stage.style.setProperty('--bathroom-door-open',(doorOpening??0).toFixed(3));
            bathroomDoorLeaf.toggleAttribute('data-in-front',behindDoor);
            foreground.hidden=!behindDoor;
        }else{
            foreground.hidden=place==='pack'||(!walking&&phase!=='turn'&&!(place==='noodle'&&actorElement.dataset.pose==='uneven-chopsticks'));
        }
        if(actorPhase!==phase){
            actorPhase=phase;
            stage.dataset.actorPhase=phase;
            note.hidden=place!=='home'||!['activity','sleep'].includes(phase);
            if(shift?.place===place) showPresence(shift);
        }
        followActor();
        if(phase==='activity'&&showerEntry&&!showerMotion){
            moveShowerCurtain('close',()=>{
                if(!showerEntry||place!=='bathroom'||!state.bathroomAction) return;
                showerEntry=false;
                render();
            });
        }
    }

    function showBedFrame(asleep){
        if(asleep&&bedFrameMode===asleep&&!sleepFrame.hidden) return;
        bedFrameMode=asleep;
        sleepFrame.toggleAttribute('data-bed-cover',asleep==='cover');
        sleepFrame.hidden=!(asleep&&sleepingPose.complete&&sleepingPose.naturalWidth);
        if(asleep==='cover'&&(!$('setting').complete||!$('setting').naturalWidth)) sleepFrame.hidden=true;
        if(sleepFrame.hidden) return;
        bedActorContext.clearRect(0,0,1672,941);
        if(asleep==='cover'&&$('setting').complete&&$('setting').naturalWidth){
            bedActorContext.drawImage($('setting'),0,0,1672,941);
            bedActorContext.drawImage(sleepingPose,543,212);
        }else bedActorContext.drawImage(sleepingPose,543,212);
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
        if(actorPhase==='door-open'||actorPhase==='door-close'){
            setText('presence',actorPhase==='door-open'?'潘潘打开卫生间门':'潘潘关上卫生间门');
            return;
        }
        if(departure){
            const movement={handoff:'潘潘放好手里的东西',sit:'潘潘坐稳放好东西',rise:'潘潘站起来了',
                exit:departure.nextRoom==='bathroom'?'潘潘走向卫生间':'潘潘走向出口'};
            setText('presence',movement[actorPhase]??'潘潘整理东西准备出门');
            return;
        }
        const walking=shift.pose==='sleep'?'走到床边':shift.pose==='gaming'?'走到电脑旁':'走过来';
        const movement={walk:walking,sit:'坐下来',rise:'站起来',bed:'爬上床准备睡觉',turn:'停下脚步',prepare:'停下脚步',handoff:'整理桌上的东西',stack:'整理打包工具'};
        setText('presence',(preview&&preview!==propAction?.action?'预览 · ':'')+'潘潘'+(movement[actorPhase]||shift.label));
    }

    function isSleeping(shift=snapshot(minuteNow())){
        return shift.pose==='sleep'||preview?.pose==='sleep';
    }

    function showSleepNotice(){
        setText('sleep-notice',sleepMessage);
        clearTimeout(sleepNoticeTimer);
        sleepNoticeTimer=setTimeout(()=>setText('sleep-notice',''),3200);
    }

    function warnIfSleeping(){
        if(!isSleeping()) return false;
        showSleepNotice();
        return true;
    }

    function currentActivity(){
        const host=!isSleeping(state)&&!following&&state.place!==place?(hosts[place]??state):state;
        return preview??departure?.activity??streetTrip??(showerEntry?enterShower:liveBit?.activity??host);
    }

    function canAnimate(){
        return sceneMotion&&!reducedMotion.matches&&!document.hidden;
    }

    function keepFollowing(){
        if(!following||preview||departure||streetTrip||sheet.open||destination&&destination.id!==place) return;
        const next=state.place==='away'?'alley':state.place;
        if(next!==place) go(next,{follow:true,arrival:true});
    }

    function playStreetCrossing(crossing){
        actor.walkStreet(crossing.points,()=>{
            if(streetTrip!==crossing) return;
            const target=state.place==='bathroom'?'home':state.place;
            if(target!==crossing.to&&canAnimate()){
                const points=PanpanStreet.route(crossing.points.at(-1),target);
                if(points.length>1){
                    streetTrip={...crossing,to:target,points};
                    playStreetCrossing(streetTrip);
                    return;
                }
            }
            streetTrip=undefined;
            if(state.place!=='alley') actor.show(null);
            if(state.place==='away') mapView.setFocus(undefined,canAnimate());
            render();
            keepFollowing();
        });
    }

    function startDeparture(previous,now){
        if(preview||departure||streetTrip||!canAnimate()||now-lastMinute>30||previous?.place!==place||state.place===place||
            hosts[place]&&!following||
            destination&&destination.id!==place||!actorAnchor&&!previous.bathroomAction) return;
        const activity=showerEntry?enterShower:liveBit?.activity??previous;
        const nextRoom=place==='home'&&state.place==='bathroom'?'bathroom':
            place==='bathroom'&&state.place==='home'?'home':undefined;
        const trip={activity,nextRoom};
        departure=trip;
        if(nextRoom==='bathroom') roomView=undefined;
        cancelShowerMotion();
        showerEntry=false;
        const inShower=Boolean(previous.bathroomAction);
        const finish=()=>{
            if(departure!==trip) return;
            departure=undefined;
            actor.show(null);
            if(nextRoom&&state.place===nextRoom&&!sheet.open){
                go(nextRoom,{follow:following,arrival:true,roomEntry:nextRoom==='home'?returnFromBathroom:undefined});
                return;
            }
            if(following&&!sheet.open&&place!=='alley'){
                const points=PanpanStreet.route(place,state.place);
                if(points.length>1){
                    go('alley',{follow:true,arrival:true,crossing:{
                        place:'alley',pose:'walk',label:'沿巷子走',to:state.place,points,
                    }});
                    return;
                }
            }
            render();
            keepFollowing();
        };
        if(place==='alley'){
            const to=state.place==='bathroom'?'home':state.place;
            const points=PanpanStreet.route(actorAnchor,to);
            if(points.length<2) finish();
            else if(following){
                departure=undefined;
                streetTrip={place:'alley',pose:'walk',label:'沿巷子走',to,points};
                playStreetCrossing(streetTrip);
            }else actor.walkStreet(points,finish);
        }else if(inShower){
            actor.show({scene:'bathroom',pose:'idle',anchor:showerDoor,approach:[showerDoor],still:true});
            moveShowerCurtain('open',()=>{
                if(departure!==trip) return;
                showerCurtain.hidden=true;
                actor.walkOut(place,showerApproach,finish,showerDoor);
            });
        }else actor.walkOut(place,nextRoom==='bathroom'?pathToBathroom:activity.approach??scenes[place].approach,finish);
    }

    function finishBit(){
        if(propAction&&preview===propAction.action){
            finishPropAction(propAction);
            return;
        }
        if(!liveBit) return;
        if(liveBit.host) hostBitNext=performance.now()+12000+Math.random()*9000;
        else finishedBit=liveBit.at;
        liveBit=undefined;
        render();
    }

    function updateBit(){
        if(preview||departure||streetTrip||showerEntry||place==='fortune') return;
        const visitingHost=Boolean(hosts[place]&&!following&&state.place!==place&&PanpanGame.sceneBits[place]?.length);
        if(liveBit&&(liveBit.host?(!visitingHost||liveBit.hostPlace!==place):state.place!==place||state.pose!==liveBit.basePose||state.bathroomAction)) liveBit=undefined;
        if(!liveBit&&visitingHost&&canAnimate()&&!sheet.open&&actorPhase==='activity'&&performance.now()>=hostBitNext){
            const choices=PanpanGame.sceneBits[place];
            let index=Math.floor(Math.random()*choices.length);
            if(choices.length>1&&index===hostBitLast) index=(index+1)%choices.length;
            hostBitLast=index;
            const bit=choices[index];
            const count=hostThoughtCounts[index]??0;
            hostThoughtCounts[index]=count+1;
            const thought=bit.thoughts[count%bit.thoughts.length];
            liveBit={host:true,hostPlace:place,activity:{...bit,thought}};
        }
        if(!liveBit&&state.bit&&state.place===place&&state.bitAt!==finishedBit){
            liveBit={at:state.bitAt,basePose:state.pose,activity:{...state.bit,line:state.line}};
        }
    }

    function render(restart=false){
        const now=minuteNow();
        const previous=state;
        state=snapshot(now);
        startDeparture(previous,now);
        lastMinute=now;
        if(state.pose==='sleep'){
            if(propAction) clearTimeout(propAction.timer);
            preview=propAction=liveBit=undefined;
            if(departure?.manual){
                departure=undefined;
                actor.show(null);
            }
            if(fortuneSession){
                closeFortune(true);
                showSleepNotice();
            }
            stage.removeAttribute('data-fortune-arrival');
            if(sheet.open&&(openSheet==='photo'||openSheet==='preview')){
                sheet.close();
                showSleepNotice();
            }
        }
        const sleeping=isSleeping(state);
        stage.toggleAttribute('data-panpan-asleep',sleeping);
        if(!sleeping) setText('sleep-notice','');
        if(showerEntry&&(place!==state.place||!state.bathroomAction)) showerEntry=false;
        if(!sleeping) updateBit();
        const shift=currentActivity();
        const location=scenes[place];
        const isAlley=place==='alley';
        const atHome=place==='home';
        const inBathroom=place==='bathroom';
        const atFortune=place==='fortune';
        const bathroomAction=inBathroom?shift.bathroomAction:undefined;
        const present=place===shift.place&&(!bathroomAction||Boolean(departure));
        const {period,weather,rain,streetlight,darkness,sunrise,sunset}=state;
        const background=location.image;
        if(!isAlley&&currentBackground!==background){
            currentBackground=background;
            setting.src='../assets/'+background+'.webp';
        }
        stage.dataset.scene=place;
        fortuneHost.hidden=!atFortune||sleeping;
        if(atFortune&&!fortuneSession)
            stage.dataset.fortunePose=preview?.pose==='fortune-think'?'read':preview?.pose==='fortune-shrug'?'offer':'idle';
        updateActionProps();
        stage.toggleAttribute('data-departing',Boolean(departure));
        stage.toggleAttribute('data-bathroom-action',Boolean(bathroomAction));
        mapView.setActive(isAlley);
        const actorLayer=isAlley?streetCharacter:scenery;
        if(actorElement.parentNode!==actorLayer){
            if(isAlley) actorLayer.append(shadow,actorElement);
            else sleepFrame.before(shadow,actorElement);
        }
        stage.dataset.period=period;
        stage.dataset.weather=weather;
        stage.style.setProperty('--streetlight',streetlight.toFixed(3));
        stage.style.setProperty('--darkness',darkness.toFixed(3));
        stage.style.setProperty('--sunrise',sunrise.toFixed(3));
        stage.style.setProperty('--sunset',sunset.toFixed(3));
        stage.dataset.rain=rain>.65?'heavy':'light';
        $('window-view').hidden=!atHome;
        if(atHome) paintWindow(darkness,sunrise,sunset,weather);
        if(!present){
            actorAnchor=undefined;
            actorPhase=undefined;
            shadow.hidden=true;
            delete stage.dataset.actorPhase;
            foreground.hidden=true;
            $('home-shoes-foreground').hidden=true;
            if(isAlley) for(const {element} of streetCovers) element.hidden=true;
            if(inBathroom){
                stage.style.removeProperty('--bathroom-door-open');
                bathroomDoorLeaf.removeAttribute('data-in-front');
            }
        }
        const approach=shift.approach??location.approach;
        if(!departure&&!streetTrip) actor.show(present&&!atFortune?{scene:place,pose:shift.pose,anchor:shift.anchor,approach,seat:shift.seat,
            entry:destination?.id===place?destination.roomEntry:undefined,
            bit:shift.thought?shift:undefined,walkToBed:Boolean(preview||destination?.arrival)}:null,{restart});
        const asleep=present&&actorPhase==='sleep';
        ambience.setScene({place,asleep,quiet:state.pose==='sleep',period,weather,rain,streetlight,
            pose:present?shift.pose:undefined,bathroomAction});
        setText('address',location.detail);
        setText('place',location.name);
        setText('clock',clockText(now)+' · '+state.periodName+' · '+state.weatherName);
        const speed=speedNow();
        $('clock-speed').hidden=speed===1;
        setText('clock-speed',speed+'×');
        $('clock-button').title=state.periodName+' · '+state.weatherName;
        $('end-preview').hidden=!preview;
        stage.toggleAttribute('data-preview',Boolean(preview));
        $('alley-update').hidden=!isAlley||Boolean(preview)||Boolean(destination&&destination.id!=='alley');
        if(!$('alley-update').hidden){
            const walkingTo=streetTrip&&scenes[streetTrip.to];
            const line=streetTrip?(walkingTo?'潘潘正沿着巷子去'+walkingTo.name+'。':'潘潘走到巷口散步。'):describe(state);
            setText('alley-update',line);
        }
        $('presence').hidden=false;
        if(atFortune&&!sleeping) setText('presence','潘半仙在摊上');
        else if(present) showPresence(shift);
        else setText('presence',describe(state));
        note.hidden=!atHome||(present&&!asleep&&actorPhase!=='activity');
        if(atHome){
            setText('note-tag',present?'潘潘说':'潘潘的桌边便笺');
            const line=preview?(shift.line??shift.thought):state.place==='home'||state.place==='away'?state.line:'门留着。忙完就回来。';
            setText('note-line','「'+line+'」');
        }
        $('bathroom-door').hidden=!atHome;
        $('home-bathroom-entry').hidden=!atHome;
        $('bathroom-back').hidden=!inBathroom;
        $('bathroom-room-entry').hidden=!inBathroom;
        updateSceneProp();
        showerCurtain.hidden=!showerMotion&&(bathroomAction!=='shower'||Boolean(departure?.activity?.bathroomAction));
        $('home').setAttribute('aria-pressed',String(atHome||inBathroom));
        $('map').setAttribute('aria-pressed',String(isAlley));

        if(openSheet==='journal') showJournal(now);
        if(openSheet==='weather') updateWeatherSheet(now);
        if(openSheet==='visit') updateVisitSheet();
        if(openSheet==='stall') stallPanel?.update?.();
        updateLayout();
        if(following&&!departure) queueMicrotask(keepFollowing);
    }

    function showPlace(id,action,arrival){
        if(action&&warnIfSleeping()) action=undefined;
        const restart=Boolean(action&&action===preview);
        if(id!==place){
            const arriving=id==='fortune'&&!isSleeping()&&canAnimate();
            stage.toggleAttribute('data-fortune-arrival',arriving);
        }
        if(id!=='fortune') closeFortune(false);
        if(id!==place&&hosts[id]){
            hostBitNext=performance.now()+7000+Math.random()*4000;
            hostBitLast=-1;
            hostThoughtCounts=[];
        }
        liveBit=undefined;
        roomView=undefined;
        roomDrag=undefined;
        preview=action;
        place=id;
        showerEntry=Boolean(arrival&&id==='bathroom'&&snapshot(minuteNow()).bathroomAction&&canAnimate());
        render(restart);
        if(arrival&&canAnimate()) stage.animate([{opacity:.60},{opacity:1}],{duration:280,easing:'ease-out'});
        $('place').setAttribute('tabindex','-1');
        if(!arrival) $('place').focus({preventScroll:true});
    }

    function mapTarget(anchor,close=false){
        return [anchor[0]*mapWidth/100-margin,anchor[1]*mapHeight/100,close?520:mapWidth,close?515:mapHeight];
    }

    async function go(id,{action,follow=false,arrival=false,crossing,roomEntry}={}){
        if(action&&warnIfSleeping()) action=undefined;
        if(propAction&&action!==propAction.action){
            clearTimeout(propAction.timer);
            propAction=undefined;
        }
        if(showerMotion&&(id!==place||action)){
            cancelShowerMotion();
            showerEntry=false;
        }
        const stopFollowing=following&&!follow;
        following=follow;
        if(!action&&!preview&&!streetTrip&&!crossing&&place===id&&destination?.id===id){
            if(stopFollowing&&id==='alley') mapView.setFocus(undefined,canAnimate());
            return;
        }
        if(departure||streetTrip){
            departure=undefined;
            streetTrip=undefined;
            actor.show(null);
        }
        const request={id,arrival,roomEntry};
        destination=request;
        const fromMap=place==='alley';
        if(fromMap&&id!=='alley') $('alley-update').hidden=true;
        $('hotspots').hidden=id!=='alley';
        ambience.setEntry(null);
        const animate=sceneMotion&&!reducedMotion.matches;
        if(id==='alley'){
            streetTrip=crossing;
            showPlace(id,action,arrival);
            const anchor=crossing?.points[0]??action?.anchor??(follow&&state.place==='alley'?state.anchor:undefined);
            mapView.setFocus(anchor?mapTarget(anchor,Boolean(action)):undefined,animate&&!crossing);
            if(crossing) playStreetCrossing(crossing);
            return;
        }
        const camera=fromMap&&scenes[id].entry?mapView.setFocus(scenes[id].entry.view,animate):undefined;
        try{
            await Promise.all([
                camera,interiors[id].decode(),
                id==='bathroom'?showerCurtain.decode():undefined,
                id==='stall'?PanpanComicStall.loadDisplay($('stall-covers')):undefined,
                id==='fortune'?PanpanFortuneStall.prepare():undefined,
            ]);
        }catch{
            if(destination!==request) return;
            destination=undefined;
            following=false;
            if(fromMap){
                $('hotspots').hidden=false;
                $('alley-update').hidden=Boolean(preview);
                mapView.setFocus(undefined,animate);
            }
            setText('place','场景暂时无法打开');
            return;
        }
        if(destination!==request) return;
        showPlace(id,action,arrival);
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
        $('comic-back').hidden=true;
        setText('sheet-title',title);
        sheet.showModal();
        $('close').focus();
        sheet.scrollTop=0;
    }

    function showJournal(now){
        const entries=journal(now);
        const today=Math.floor(now/dayMinutes);
        const key=today+'|'+entries.map(item=>item.at).join('|');
        if(key===currentItems) return;
        currentItems=key;
        const scroll=sheet.scrollTop;
        const groups=[];
        let group;
        let currentDay;
        for(const item of entries){
            const day=Math.floor(item.at/dayMinutes);
            if(day!==currentDay){
                currentDay=day;
                group=document.createElement('section');
                group.className='journal-day';
                const heading=document.createElement('h3');
                heading.textContent=day===today?'今天':day===today-1?'昨天':dayText(item.at);
                group.append(heading);
                groups.push(group);
            }
            const card=document.createElement('article');
            card.className='post';
            const photo=document.createElement('img');
            photo.src='../assets/'+item.image+'.webp';
            photo.alt='';
            photo.loading='lazy';
            photo.decoding='async';
            const copy=document.createElement('div');
            const meta=document.createElement('small');
            meta.textContent=clockText(item.at)+(item.walk?' · 散步回来':'');
            const title=document.createElement('h4');
            title.textContent=item.title;
            const line=document.createElement('p');
            line.textContent=item.line;
            copy.append(meta,title,line);
            card.append(photo,copy);
            group.append(card);
        }
        if(entries.length&&Math.floor(entries[0].at/dayMinutes)<today){
            const message=document.createElement('p');
            message.className='sheet-copy';
            message.textContent='今天还没写。翻到昨天，看看睡前记下来的事。';
            body.replaceChildren(message,...groups);
        }else body.replaceChildren(...groups);
        sheet.scrollTop=scroll;
    }

    function updateVisitSheet(){
        setText('visit-location',describe(state));
        const button=$('find-panpan');
        button.hidden=following&&state.place===place&&!preview;
        const label=state.place===place?'跟着潘潘':state.place==='away'?'去巷子等他':'去找他';
        if(button.textContent!==label) button.textContent=label;
    }

    function followSchedule(){
        const shift=snapshot(minuteNow());
        go(shift.place==='away'?'alley':shift.place,{follow:true});
    }

    $('visit').onclick=()=>{
        body.innerHTML=`
            <div class="visit-intro">
                <img src="../assets/panpan-2d/portrait.webp" alt="">
                <div><h3>潘潘</h3><p>住在二楼靠窗那间。平常在巷尾的杂货铺打包寄件，收了摊，就回家坐会儿。</p></div>
            </div>
            <p id="visit-location" class="visit-location"></p>
            <button type="button" class="text-button" id="find-panpan"></button>`;
        $('find-panpan').onclick=()=>{
            focusFrom=undefined;
            sheet.close();
            followSchedule();
        };
        updateVisitSheet();
        open('visit','来看看潘潘',$('visit'));
    };

    $('home').onclick=()=>go('home');
    $('map').onclick=()=>go('alley');
    function visitAdjacentRoom(id){
        if(isSleeping()){
            go(id);
            return;
        }
        if(departure) return;
        if(!actorAnchor||!canAnimate()){
            go(id);
            return;
        }
        const activity=currentActivity();
        const trip={activity,nextRoom:id,manual:true};
        departure=trip;
        preview=undefined;
        roomView=undefined;
        actor.walkOut(place,id==='bathroom'?pathToBathroom:scenes.bathroom.approach,()=>{
            if(departure!==trip) return;
            departure=undefined;
            actor.show(null);
            go(id,{arrival:true,roomEntry:id==='home'?returnFromBathroom:undefined,
                action:id==='bathroom'&&state.place!=='bathroom'?toiletVisit:undefined});
        });
        render();
    }
    $('bathroom-door').onclick=()=>visitAdjacentRoom('bathroom');
    $('home-bathroom-entry').onclick=$('bathroom-door').onclick;
    $('bathroom-back').onclick=()=>visitAdjacentRoom('home');
    $('bathroom-room-entry').onclick=$('bathroom-back').onclick;
    function updateSceneProp(){
        const button=sceneProps.get(place);
        if(place==='fortune') button.disabled=stage.hasAttribute('data-fortune-arrival');
        if(activeProp===button) return;
        if(activeProp){
            propObserver.disconnect();
            activeProp.removeAttribute('data-in-view');
            activeProp.hidden=true;
        }
        activeProp=button;
        if(!button) return;
        button.hidden=false;
        button.tabIndex=0;
        propObserver.observe(button);
    }

    function useSceneProp(from){
        if(from.disabled||from.hasAttribute('data-needs-panpan')&&warnIfSleeping()) return;
        if(place==='home') openJournal(from);
        else if(place==='fortune') openFortune();
        else if(place==='noodle'){
            stallPanel=PanpanComicStall.showStory(body,'yi-gen-mian');
            open('stall','面馆的故事',from);
        }else openBooth(from);
    }

    function openFortune(){
        if(!fortuneSession){
            following=false;
            fortuneDesk.hidden=false;
            stage.setAttribute('data-fortune-open','');
            fortuneCup.setAttribute('aria-expanded','true');
            fortuneSession=PanpanFortuneStall.show(fortuneDesk,{
                speech:$('fortune-speech'),
                pose:pose=>{
                    if(pose!=='idle') stage.removeAttribute('data-fortune-arrival');
                    stage.dataset.fortunePose=pose;
                },
                animate:canAnimate,
                close:()=>closeFortune(true),
            });
            updateLayout();
        }
        fortuneSession.focus();
    }

    function closeFortune(restoreFocus){
        if(!fortuneSession) return;
        fortuneSession.close();
        fortuneSession=undefined;
        fortuneDesk.hidden=true;
        stage.removeAttribute('data-fortune-open');
        stage.dataset.fortunePose='idle';
        fortuneCup.setAttribute('aria-expanded','false');
        if(restoreFocus) fortuneCup.focus({preventScroll:true});
    }

    function openBooth(from){
        const id=place;
        const booth=booths[id];
        stallPanel=booth.interaction.show(body,()=>{
            if(isSleeping()||place!==id||id==='stall'&&(departure||!preview&&state.place!=='stall')) return null;
            return {clock:clockText(minuteNow()),weather:state.weatherName,preview:Boolean(preview)};
        },()=>isSleeping()?sleepMessage:'');
        open(id==='secondhand'?'photo':'stall',booth.title,from);
    }
    for(const button of sceneProps.values()) button.onclick=()=>useSceneProp(button);
    // Each hit area sits beside its artwork so only that object lights up.
    const propActions=[
        ['home','tea','seated-tea','茶杯',75.3,47.4],['home','book','seated-read','书',78,49],
        ['home','ledger','seated-ledger','账本',61.4,48.2],['home','rag','rag-crown','抹布',64,47.1],
        ['home','spoon','spoon-concert','木勺',66.5,49.2],['home','receipt','receipt-shock','小票',69.7,46.8],
        ['home','dumbbell','dumbbell-brag','哑铃',81.4,80],['home','alarm','alarm-hush','闹钟',39.3,73],
        ['home','bowl','seated-noodle','早餐',23.5,49.5],
        ['pack','mainparcel','parcel-check','纸箱',50.2,53.6],['pack','stackbox','parcel-pile','小纸箱',52,55.1],
        ['pack','stamp','backward-stamp','印章',54.1,51.8],
        ['noodle','chopsticks','uneven-chopsticks','筷子',70.1,76.6],['noodle','bowl','hot-noodles','面碗',45.7,64],
        ['bathroom','bathcap','shower-cap','浴帽',34.8,72],
        ['bathroom','bathbrush','toothbrush-guitar','牙刷',31.7,56.5],
        ['alley','umbrella','umbrella-flip','雨伞',35.3,73.4],['alley','groceries','guard-groceries','橘子袋',50.1,64],
    ];
    const allActions=actionGroups.flatMap(group=>group.activities);
    const propArt={
        tea:'.tea-cup-table',book:'.book-table',ledger:'.ledger-table',rag:'.rag-table',spoon:'.spoon-table',
        receipt:'.receipt-table',dumbbell:'.dumbbell-floor',alarm:'.alarm-floor',bowl:'.bowl-table',
        mainparcel:'.main-parcel-table',stackbox:'.extra-parcel-table',stamp:'.stamp-table',
        chopsticks:'.chopsticks-table',bathcap:'.bath-cap-rest',
        bathbrush:'.bath-brush-rest',umbrella:'.street-umbrella',groceries:'.street-groceries',
    };
    for(const [scene,prop,pose,label,x,y] of propActions){
        const action=allActions.find(item=>item.place===scene&&item.pose===pose);
        const art=(scene==='alley'?streetCharacter:scenery).querySelector(propArt[prop]);
        if(!action||!art) continue;
        const button=document.createElement('button');
        button.type='button';
        button.className='action-prop';
        button.dataset.prop=prop;
        button.setAttribute('aria-label',`让潘潘使用${label}`);
        button.style.setProperty('--prop-x',`${x}%`);
        button.style.setProperty('--prop-y',`${y}%`);
        button.hidden=true;
        button.addEventListener('pointerdown',event=>event.stopPropagation());
        button.addEventListener('click',()=>{
            if(warnIfSleeping()) return;
            const origin=propAction?propAction.origin:preview;
            if(propAction) clearTimeout(propAction.timer);
            propAction={action,origin};
            go(scene,{action});
        });
        art.classList.add('action-prop-art');
        art.after(button);
        actionProps.push({button,scene,prop});
    }
    function updateActionProps(){
        for(const {button,scene,prop} of actionProps)
            button.hidden=place!==scene||!stage.hasAttribute(`data-${prop}-on-table`);
    }
    function finishPropAction(active){
        if(propAction!==active||preview!==active.action) return;
        clearTimeout(active.timer);
        propAction=undefined;
        preview=active.origin;
        if(!preview&&state.place!==place&&actorAnchor&&canAnimate()){
            const trip={activity:active.action,manual:true};
            departure=trip;
            const done=()=>{
                if(departure!==trip) return;
                departure=undefined;
                actor.show(null);
                render();
            };
            if(place==='alley') actor.walkStreet(PanpanStreet.route(actorAnchor,'away'),done);
            else actor.walkOut(place,active.action.approach??scenes[place].approach,done);
        }else render();
    }
    $('preview').onclick=()=>{
        if(warnIfSleeping()) return;
        body.replaceChildren(...actionGroups.map(({title,activities})=>{
            const group=document.createElement('section');
            group.className='preview-group';
            const heading=document.createElement('h3');
            heading.textContent=title;
            const choices=document.createElement('div');
            choices.className='preview-choices';
            for(const activity of activities){
                const button=document.createElement('button');
                button.type='button';
                button.className='text-button';
                button.textContent=activity.pose==='sleep'?'走到床边睡觉':activity.label;
                button.setAttribute('aria-pressed',String(activity===preview));
                button.onclick=()=>{
                    if(warnIfSleeping()){
                        sheet.close();
                        return;
                    }
                    focusFrom=undefined;
                    sheet.close();
                    go(activity.place,{action:activity});
                };
                choices.append(button);
            }
            group.append(heading,choices);
            return group;
        }));
        open('preview','预览潘潘',$('preview'));
    };
    $('end-preview').onclick=followSchedule;
    function openJournal(from){
        currentItems=undefined;
        showJournal(minuteNow());
        open('journal','潘潘的生活手记',from);
    }
    $('journal').onclick=()=>openJournal($('journal'));

    function updateWeatherSheet(now){
        setText('weather-now',dayText(now)+' · '+clockText(now)+' · '+state.periodName+' · '+state.weatherName);
        setText('weather-routine',describe(state));
        const next=state.forecast;
        setText('weather-next',next?'天气将转为'+next.label+' · '+dayText(next.minute)+' '+clockText(next.minute):'天气比较稳定。');
        const speed=speedNow();
        body.querySelector('input[name="world-speed"][value="'+speed+'"]').checked=true;
        setText('speed-detail','现实 1 秒 · 游戏 '+speed+' 分钟');
    }

    $('clock-button').onclick=()=>{
        const options=speeds.map(speed=>'<label><input type="radio" name="world-speed" value="'+speed+'"><span>'+speed+'×</span></label>').join('');
        body.innerHTML='<div class="weather-sheet"><p id="weather-now"></p><p id="weather-routine"></p><p id="weather-next"></p></div>'+
            '<fieldset class="time-speed"><legend>时间速度</legend><div class="time-speed-options">'+options+'</div><p id="speed-detail"></p></fieldset>';
        body.querySelector('.time-speed').onchange=event=>{
            setSpeed(Number(event.target.value));
            render();
        };
        $('clock-button').setAttribute('aria-expanded','true');
        open('weather','时间和天气',$('clock-button'));
        render();
    };

    $('about').onclick=()=>{
        body.innerHTML='<p>默认现实 1 秒是巷子里的 1 分钟。点右上角时间可以切换倍速。潘潘会按巷子里的时间吃三餐、工作和睡觉。下雨时，他会提早收摊。</p><p>点「看潘潘」，看看他这会儿在哪儿。点「预览潘潘」可以选动作，点「回到日程」会回到他当前的活动。潘潘睡着时可以照常看漫画、逛货架，抽签、合影和其他需要他的互动要等他醒来。</p>';
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
    for(const panel of [sheet,fortuneDesk,$('fortune-speech')]){
        const guard=event=>{
            if(panel===sheet&&openSheet!=='photo') return;
            if(!warnIfSleeping()) return;
            event.preventDefault();
            event.stopImmediatePropagation();
            render();
        };
        panel.addEventListener('click',guard,true);
        panel.addEventListener('submit',guard,true);
    }
    sheet.addEventListener('click',event=>{
        if(event.target===sheet){
            const r=sheet.getBoundingClientRect();
            if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom) sheet.close();
        }
    });
    sheet.addEventListener('close',()=>{
        if(openSheet==='weather') $('clock-button').setAttribute('aria-expanded','false');
        stallPanel?.close();
        stallPanel=undefined;
        $('comic-back').onclick=null;
        motionSheet?.abort();
        motionSheet=null;
        openSheet='';
        focusFrom?.focus();
    });

    render();
    const query=new URLSearchParams(location.search);
    const initialPose=query.get('preview');
    const initialActivity=actionGroups.flatMap(group=>group.activities).find(action=>
        action.pose===initialPose||action.stallMode&&action.stallMode+'-stall'===initialPose);
    if(query.get('visit')==='fortune-stall') go('fortune');
    else if(query.get('visit')==='photo-studio') go('secondhand');
    else if(query.get('visit')==='variety-shop') go('pack');
    else if(initialActivity) go(initialActivity.place,{action:initialActivity});
    new ResizeObserver(updateLayout).observe(stage);
    setInterval(()=>{
        if(!document.hidden) render();
    },250);
    document.addEventListener('visibilitychange',()=>{
        document.body.toggleAttribute('data-background',document.hidden);
        if(document.hidden&&showerMotion) showerMotion.animation.finish();
        if(!document.hidden) render();
    });
    window.addEventListener('pageshow',()=>render());
    reducedMotion.addEventListener('change',()=>{
        if(reducedMotion.matches&&showerMotion) showerMotion.animation.finish();
        render();
    });
})();
