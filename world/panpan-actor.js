const PanpanActor = (() => {
    // The keyboard taps and the rooftop game use the same jump cues.
    const gameDuration=8.6;
    const gameJumps=[[1.32,.72],[3.2,.86],[5.35,.96]];
    const gameTimeline=[[0,0,0]];
    for(const [press,duration] of gameJumps){
        gameTimeline.push([press-.21,0,0],[press,2,0],[press+.11,4,0],[press+duration*.62,2,0],[press+duration,0,0]);
    }
    gameTimeline.push([7.07,0,0],[7.31,2,0],[7.7,0,0],[gameDuration,0,0]);
    // Each atlas has 24 frames in six columns, with three key poses eight frames apart.
    // Each cue gives elapsed seconds, atlas frame (24 wraps to 0), and body lean in degrees.
    const cues = {
        'seated-ledger': [[0,0,0],[.8,0,0],[1.3,8,0],[1.7,7,0],[2.1,8,0],[2.5,7,0],[3.0,8,0],[4.0,8,0],[4.5,16,0],[5.6,16,0]],
        'seated-window': [[0,0,0],[1.4,0,0],[2.1,8,0],[3.9,8,0],[4.6,16,0],[6.4,16,0]],
        'seated-tea': [[0,0,0],[.83,0,0],[1.59,8,0],[2.72,8,0],[3.47,16,0],[6.4,16,0]],
        'seated-read': [[0,0,0],[2.1,0,0],[2.8,8,0],[3.22,8,0],[3.85,16,0],[6.6,16,0]],
        parcel: [[0,0,0],[.68,0,0],[1.45,8,-1.5],[1.88,8,-1.5],[2.62,0,0],
            [3.08,24,0],[3.65,16,1.15],[4.05,16,1.15],[4.62,24,0],[5.48,24,0]],
        'seated-noodle': [[0,0,0],[.95,0,0],[1.68,8,0],[2.56,8,0],[3.42,16,0],[5.4,16,0]],
        gaming: gameTimeline,
        cable: [[0,0,0],[.67,0,0],[1.23,8,-1.25],[1.63,8,-1.25],[2.3,16,1.4],
            [2.63,16,1.4],[3.08,8,-.7],[3.62,16,1.05],[4.07,16,1.05],[4.79,24,0],[5.55,24,0]],
        idle: [[0,0,0],[1.52,0,0],[1.64,8,0],[1.81,0,0],[3.05,24,0],[3.66,16,-.7],
            [4.71,16,-.7],[5.32,24,0],[6.2,24,0]],
        tidy:[[0,0,0],[.54,0,0],[.95,1,1.15],[1.5,0,0],[2.1,1,1.15],[2.68,0,0],[3.16,1,.7],[3.78,0,0],[5.6,0,0]],
        exercise:[[0,0,0],[.45,0,0],[1.36,12,0],[1.67,12,0],[2.52,0,0],[2.83,0,0],
            [3.63,12,0],[4.03,12,0],[4.83,18,0],[5.77,18,0],[6.22,24,0],[6.8,24,0]],
    };

    const actions = ['parcel','cable','tidy'];
    // Intermediate cells with torn outlines, doubled limbs, or broken props are excluded.
    const reviewed = {
        'seated-ledger':[0,1,2,5,6,7,8,9,10,13,14,15,16,18,21,22,23],
        'seated-window':[0,1,2,3,6,7,8,9,10,11,14,15,16,17,20,22,23],
        'seated-tea':[0,1,2,3,6,7,8,9,10,11,14,15,16],
        'seated-read':[0,1,2,5,6,7,8,9,10,11,14,15,16],
        parcel:[0,1,2,5,6,7,8,9,10,11,14,15,16,17,18,21,22,23],
        'seated-noodle':[0,1,2,4,5,6,7,8,9,10,11,14,15,16],
        cable:[0,7,8,9,15,16,17,18,19,23],
        idle:[0,1,6,7,8,9,10,14,16,17,18,19,20,21,22,23],
        exercise:[0,1,2,3,4,5,6,7,8,9,10,11,12,13,17,18,19,23],
    };
    const playbackFrames=Object.fromEntries(Object.entries(reviewed).map(([name,cells])=>[
        name,Array.from({length:24},(_,frame)=>{
            const distance=cell=>Math.min(Math.abs(cell-frame),24-Math.abs(cell-frame));
            return cells.reduce((best,cell)=>distance(cell)<distance(best)?cell:best);
        }),
    ]));
    const widthRatio = 1672/941;
    const mix = (a,b,t) => a+(b-a)*t;
    const smooth = t => t*t*(3-2*t);
    const walkRamp=.12;
    const bathroomDoorSwingTime=.48;
    const bathroomDoorStops=PanpanGame.scenes.bathroom.approach;

    function travelAt(time){
        const ramp=walkRamp;
        return time<ramp?time*time/(2*ramp*(1-ramp)):
            time>1-ramp?1-(1-time)**2/(2*ramp*(1-ramp)):(time-ramp/2)/(1-ramp);
    }

    function timeAtTravel(distance){
        const ramp=walkRamp;
        const rampDistance=ramp/(2*(1-ramp));
        if(distance<rampDistance) return Math.sqrt(distance*2*ramp*(1-ramp));
        if(distance>1-rampDistance) return 1-Math.sqrt((1-distance)*2*ramp*(1-ramp));
        return distance*(1-ramp)+ramp/2;
    }

    function bathroomDoorTiming(path,duration,waypoints,exiting){
        const insideStop=Math.max(0,waypoints.indexOf(bathroomDoorStops.at(-1)));
        const insideTime=timeAtTravel(path.waypointProgress(insideStop))*duration;
        return exiting?{openAt:insideTime,closeAt:duration+bathroomDoorSwingTime,closedPause:.1}:
            {openAt:0,closeAt:insideTime+bathroomDoorSwingTime};
    }

    function bathroomDoorFrame(time,{openAt,closeAt,closedPause=0}){
        const opening=Math.max(0,Math.min(1,(time-openAt)/bathroomDoorSwingTime));
        const closing=Math.max(0,Math.min(1,(time-closeAt)/bathroomDoorSwingTime));
        return {
            walkingTime:time-bathroomDoorSwingTime*(opening+closing),
            opening:smooth(opening)-smooth(closing),
            phase:time>=openAt&&time<openAt+bathroomDoorSwingTime?'door-open':
                time>=closeAt&&time<closeAt+bathroomDoorSwingTime+closedPause?'door-close':undefined,
        };
    }

    function route(waypoints, anchor, onStreet=false) {
        const points = [...waypoints,anchor];
        const ratio=onStreet?PanpanStreet.width/PanpanStreet.height:widthRatio;
        const samplesPerLeg=onStreet?1:16;
        const distances = [{point:onStreet?points[0]:points[0].slice(0,2),at:0}];
        for(let i=0;i<points.length-1;i++){
            const [a,b,c,d] = [points[Math.max(0,i-1)],points[i],points[i+1],points[Math.min(points.length-1,i+2)]];
            if(onStreet){
                distances.push({point:c,at:distances.at(-1).at+Math.hypot((c[0]-b[0])*ratio,c[1]-b[1])});
                continue;
            }
            for(let j=1;j<=samplesPerLeg;j++){
                const t=j/samplesPerLeg;
                const point=b.slice(0,2).map((value,k)=>{
                    const from=(c[k]-a[k])*.42;
                    const to=(d[k]-b[k])*.42;
                    return mix(value,c[k],smooth(t))+t*(1-t)*((1-t)*from-t*to);
                });
                const previous=distances.at(-1);
                distances.push({point,at:previous.at+Math.hypot((point[0]-previous.point[0])*ratio,point[1]-previous.point[1])});
            }
        }
        const length=distances.at(-1).at;
        return {
            length,
            flip:points[0][0]>anchor[0],
            waypointProgress(index){
                return length?distances[index*samplesPerLeg].at/length:0;
            },
            sample(progress){
                const distance=length*progress;
                const index=distances.findIndex(({at})=>at>=distance);
                const finish=distances[index];
                if(index<=0) return (finish??distances.at(-1)).point;
                const start=distances[index-1];
                const t=(distance-start.at)/(finish.at-start.at);
                return start.point.map((value,k)=>mix(value,finish.point[k],t));
            },
        };
    }

    const bits=Object.fromEntries(Object.values(PanpanGame.sceneBits).flat().map(bit=>[bit.pose,bit]));
    const fortuneBits=new Set(['fortune-think','fortune-shrug']);
    const photoBits=new Set(['photo-pose','photo-wave']);
    const stationaryGestures={stall:new Set(['sales-bow','comic-hero']),fortune:fortuneBits,secondhand:photoBits};
    const bitDuration=6.2;
    const bitLeans={'rag-crown':-2,wobble:6,'stuck-tape':-3,'parcel-check':2.5,'hot-noodles':3,'long-noodle':-2,'cable-call':-4,'sales-bow':7,
        'leaf-salute':-3,'wrong-turn':5,'shower-cap':-3,'soap-moustache':-2,'receipt-shock':-6,'spoon-concert':4,
        'alarm-hush':-5,'dumbbell-brag':4,'backward-stamp':-4,'parcel-pile':7,'uneven-chopsticks':2,'chili-flinch':-6,
        'flashlight-glare':-5,'fan-flourish':4,'umbrella-flip':7,'guard-groceries':-5,'toothbrush-guitar':2,
        'radio-surprise':-6,'remote-mystery':3,'photo-pose':0,'comic-hero':0};
    const startled=new Set(['chili-flinch','flashlight-glare','guard-groceries','radio-surprise']);
    const unsteady=new Set(['dumbbell-brag','parcel-pile','umbrella-flip']);
    const swaying=new Set(['spoon-concert','fan-flourish','toothbrush-guitar']);
    const pulse=(time,at,span)=>{
        const progress=Math.min(1,Math.max(0,(time-at)/span));
        return Math.sin(progress*Math.PI)**2;
    };

    function create(actor, reducedMotion, onPosition, onGameFrame, onThought, onBitEnd, onBedFrame, onTableProp) {
        const {bed}=PanpanGame;
        const spoonTable=[58,62,40];
        const noodleStand=[53,86.2,41];
        const tableProps={'seated-tea':{name:'tea',sheet:'tea-transfer'},'seated-read':{name:'book',sheet:'read-transfer'},
            'seated-ledger':{name:'ledger',sheet:'ledger-transfer'},
            'seated-noodle':{name:'bowl',sheet:'noodle-transfer',shopSheet:'noodle-shop-transfer',transient:true}};
        const foodBits=new Set(['hot-noodles','long-noodle','chili-flinch']);
        const singleParcel=new Set(['parcel','stuck-tape','parcel-check','backward-stamp']);
        const propFor=(activity,place)=>{
            const prop=tableProps[activity];
            return prop?.shopSheet&&place==='noodle'?{...prop,sheet:prop.shopSheet}:prop;
        };
        const files=[...Object.keys(cues).filter(name=>name!=='tidy'&&name!=='gaming').map(name=>[name,`${name}-motion`,4]),
            ['gaming','gaming-keyboard-v3',2],
            ['tidy','tidy-clean',2],['tidy-release','tidy-release',2],['walk','walk-clean',2],['turn','turn-clean',2],
            ['noodle-sit','noodle-sit-transition',2],
            ['window-sit','window-sit-transition',2],
            ['tea-transfer','tea-transfer',2],
            ['read-transfer','read-transfer',2],
            ['ledger-transfer','ledger-transfer-v2',2],
            ['noodle-transfer','noodle-transfer',2],['noodle-shop-transfer','noodle-shop-transfer',2],
            ['noodle-standing-transfer','noodle-standing-transfer-v2',2],
            ['noodle-lower-arms','noodle-lower-arms-v1',2],
            ['noodle-carry','noodle-carry',2],['noodle-rise-carry','noodle-rise-carry',2],['noodle-turn','noodle-turn-v1',2],
            ['parcel-stack','parcel-stack-high',2],
            ['parcel-place','parcel-place',2],
            ['parcel-lower-arm','parcel-lower-arm-v1',2],
            ['stamp-transfer','stamp-transfer-high',2],
            ['tape-cleanup','tape-cleanup',2],
            ['rag-crown-transfer','rag-crown-transfer-v2',2],
            ['rag-lower-arm','rag-lower-arm-v1',2],
            ['receipt-lower-arm','receipt-lower-arm-v1',2],
            ['chopsticks-transfer','chopsticks-transfer',2],
            ['dumbbell-sequence','dumbbell-sequence-v2',2],
            ['alarm-pickup','alarm-pickup',2],
            ['alarm-lower-arm','alarm-lower-arm-v1',2],
            ['shower-cap-transfer','shower-cap-transfer-v2',2],
            ['bathcap-lower-arm','bathcap-lower-arm-v1',2],
            ['toothbrush-transfer','toothbrush-transfer',2],
            ['bathbrush-lower-arm','bathbrush-lower-arm-v1',2],
            ['spoon-transfer','spoon-transfer',2],['spoon-turn','spoon-turn',2],['spoon-walk','spoon-walk',2],
            ['umbrella-pickup','umbrella-pickup-v2',2],
            ['grocery-transfer','grocery-transfer-v2',2],
            ['grocery-lower-arm','grocery-lower-arm-v1',2],
            ['receipt-transfer','receipt-reach-v2',2],
            ['parcel-arrival','parcel-arrival',3],['cable-arrival','cable-arrival',3],
            ...Object.keys(bits).map(name=>[name,fortuneBits.has(name)?'fortune-gestures':photoBits.has(name)?`${name}-aligned`:name==='sales-bow'?'sales-bow-v2':name==='shower-cap'?'shower-cap-activity-v2':name==='backward-stamp'?'backward-stamp-v3':name==='parcel-check'?'parcel-check-v3':name==='rag-crown'?'rag-salute-v1':name==='alarm-hush'?'alarm-hush-v2':name==='dumbbell-brag'?'dumbbell-brag-v2':name==='spoon-concert'?'spoon-concert-v2':name==='toothbrush-guitar'?'toothbrush-guitar-v2':name==='parcel-pile'?'parcel-pile-v2':name==='stuck-tape'?'stuck-tape-v2':name==='uneven-chopsticks'?'uneven-chopsticks-v2':foodBits.has(name)||['umbrella-flip','soap-moustache','wobble','leaf-salute'].includes(name)?`${name}-v2`:`${name}-bit`,2])];
        const sheets = Object.fromEntries(files.map(([name,file,rows]) => {
            const image = new Image();
            image.src = `../assets/panpan-2d/${file}.webp`;
            return [name,{image,rows}];
        }));
        let pose;
        let anchor;
        let scene;
        let currentPosition;
        let currentPhase;
        let seat;
        let entrance;
        let enabled = true;
        let start;
        let pausedAt;
        let request = 0;
        let lastFrame;
        let lastLean;
        let lastLift;
        let thought;
        let bitFinished;
        let bit;
        let ragHeld=false;
        let chopsticksHeld=false;
        let dumbbellHeld=false;
        let alarmHeld=false;
        let bathCapHeld=false;
        let bathBrushHeld=false;
        let spoonHeld=false;
        let umbrellaHeld=false;
        let groceriesHeld=false;
        let receiptHeld=false;
        let bowlOnStool=false;
        let parcelMarked=false;

        function speak(next){
            if(next===thought) return;
            thought=next;
            onThought?.(next);
        }

        let sheet;
        function paint(name, frame, lean, flip=false, gameTime=0, lift=0) {
            const changed=name!==sheet;
            if(changed){
                const {image,rows}=sheets[name];
                actor.style.backgroundImage=`url("${image.src}")`;
                actor.style.backgroundSize=`600% ${rows*100}%`;
                sheet=name;
            }
            if(changed||frame!==lastFrame){
                actor.style.backgroundPosition = `${frame%6*20}% ${Math.floor(frame/6)*100/(sheets[name].rows-1)}%`;
                lastFrame = frame;
            }
            const angle = lean.toFixed(3);
            if(angle!==lastLean){
                actor.style.setProperty('--lean',`${angle}deg`);
                lastLean = angle;
            }
            if(lift!==lastLift){
                actor.style.setProperty('--lift',`${lift}%`);
                lastLift=lift;
            }
            actor.toggleAttribute('data-flip',flip);
            actor.toggleAttribute('data-at-keyboard',name==='gaming'||name==='gaming-sit');
            actor.toggleAttribute('data-gaming-sit',name==='gaming-sit');
            if(name==='gaming-sit') actor.style.setProperty('--sit-scale',String([1.24,1.16,1.08,1][frame]));
            if(name!=='noodle-turn') actor.removeAttribute('data-noodle-arrival');
            actor.toggleAttribute('data-bed-tucked',name==='bed-transition'&&frame===3);
            actor.toggleAttribute('data-key-press',name==='gaming'&&frame>=3);
            actor.toggleAttribute('data-wide-cel',name==='tidy'||name==='tidy-release'||name==='tea-transfer');
            actor.toggleAttribute('data-book-handoff',foodBits.has(name)||fortuneBits.has(name)||photoBits.has(name)||['read-transfer','ledger-transfer','noodle-transfer','noodle-shop-transfer','noodle-standing-transfer','noodle-lower-arms','parcel-stack','parcel-place','parcel-lower-arm','stamp-transfer','tape-cleanup','stuck-tape','rag-crown-transfer','rag-lower-arm','receipt-lower-arm','uneven-chopsticks','chopsticks-transfer','dumbbell-sequence','alarm-pickup','alarm-lower-arm','shower-cap-transfer','shower-cap','bathcap-lower-arm','toothbrush-transfer','bathbrush-lower-arm','spoon-transfer','spoon-turn','spoon-walk','umbrella-flip','umbrella-pickup','grocery-transfer','grocery-lower-arm','receipt-transfer','sales-bow','comic-hero','wobble','soap-moustache','parcel-check','backward-stamp','rag-crown','alarm-hush','dumbbell-brag','spoon-concert','toothbrush-guitar','parcel-pile'].includes(name));
            // Keep the mistaken mark attached to this parcel through handoffs and other packing skits.
            if(name==='backward-stamp'&&frame===3) parcelMarked=true;
            actor.closest('.stage')?.toggleAttribute('data-parcel-marked',parcelMarked);
            let mark;
            if(parcelMarked){
                if(name==='backward-stamp'&&(frame<2||frame===3)) mark=[50,74,9,0];
                else if(name==='stamp-transfer') mark=frame===3?[45,76,7,0]:[47,73,7,0];
                else if(name==='parcel-place') mark=[[43,73,7,0],[53,59,7,0],[70,44,7,0],null][frame];
                else if(name==='parcel-stack') mark=[49,74,7,0];
                else if(name==='parcel-check') mark=[50,72,7,0];
                else if(name==='tape-cleanup') mark=[50,75,7,0];
                else if(name==='stuck-tape') mark=[50,75,7,0];
                else if(name==='parcel-pile') mark=[51,75,7,0];
                else if(name==='parcel') mark=[43,74,9,0];
            }
            actor.toggleAttribute('data-parcel-mark',Boolean(mark));
            if(mark){
                const [x,y,w,angle]=mark;
                actor.style.setProperty('--parcel-mark-x',`${x}%`);
                actor.style.setProperty('--parcel-mark-y',`${y}%`);
                actor.style.setProperty('--parcel-mark-w',`${w}%`);
                actor.style.setProperty('--parcel-mark-angle',`${angle}deg`);
            }
            actor.toggleAttribute('data-chopsticks-transfer',name==='chopsticks-transfer'&&frame<2);
            actor.parentNode.toggleAttribute('data-alarm-reaching',name==='alarm-lower-arm');
            actor.parentNode.toggleAttribute('data-bathcap-reaching',name==='bathcap-lower-arm');
            if(name==='chopsticks-transfer') actor.parentNode.style.setProperty('--chopsticks-frame',`${frame*20}% 0%`);
            if(name==='tidy') onTableProp?.('rag',false);
            onGameFrame?.(name==='gaming'?gameTime:null);
        }

        function paintTurn(step,flip){
            const front=5;
            paint('turn',step>front?2*front-step:step,0,step>front?!flip:flip);
        }

        function planTurnBeforeWalk(targetFlip){
            const flip=actor.hasAttribute('data-flip');
            if(currentPhase==='activity'&&(sheet==='idle'||sheet==='noodle-lower-arms'||sheet==='leaf-salute'&&lastFrame===0))
                return {flip:targetFlip,frame:5,towardSame:true,duration:.3};
            if(currentPhase==='activity'&&sheet==='rag-lower-arm')
                return {flip:false,frame:3,towardSame:!targetFlip,duration:targetFlip ? .39 : .18};
            if(currentPhase==='turn'&&sheet==='turn'){
                const frame=Math.max(0,Math.min(5,lastFrame));
                const towardSame=flip===targetFlip;
                return {flip,frame,towardSame,duration:Math.max(.09,.055*(towardSame?frame:10-frame))};
            }
            return (currentPhase==='walk'||currentPhase==='exit')&&flip!==targetFlip?
                {flip,frame:0,towardSame:false,duration:.55}:undefined;
        }

        function position(x,y,height,phase,doorOpening) {
            if(!Number.isFinite(x)||!Number.isFinite(y)||!Number.isFinite(height)) return;
            currentPosition=[x,y,height];
            currentPhase=phase;
            actor.dataset.phase=phase;
            onPosition(x,y,height,phase,doorOpening);
        }

        function arrive(expressive=false) {
            const pending=entrance?.pending;
            const leafFinished=entrance?.leafFinish;
            const tidyReleased=entrance?.tidyRelease;
            const ragReturning=entrance?.ragReturning;
            const chopsticksReturning=entrance?.chopsticksReturning;
            const dumbbellReturning=entrance?.dumbbellReturning;
            const alarmReturning=entrance?.alarmReturning;
            const bathCapReturning=entrance?.bathCapReturning;
            const bathBrushReturning=entrance?.bathBrushReturning;
            const spoonReturning=entrance?.spoonReturning;
            const umbrellaReturning=entrance?.umbrellaReturning;
            const groceriesReturning=entrance?.groceriesReturning;
            const receiptReturning=entrance?.receiptReturning;
            if(entrance?.releaseProp) onTableProp?.(entrance.releaseProp.prop.name,true);
            if(entrance?.releaseMain) onTableProp?.('mainparcel',true);
            entrance=undefined;
            start=undefined;
            if(pose==='rag-crown') ragHeld=!ragReturning;
            onTableProp?.('rag',!ragHeld&&(pose!=='tidy'||Boolean(tidyReleased&&pending)));
            if(pose==='uneven-chopsticks') chopsticksHeld=!chopsticksReturning;
            onTableProp?.('chopsticks',!chopsticksHeld);
            if(pose==='dumbbell-brag') dumbbellHeld=!dumbbellReturning;
            onTableProp?.('dumbbell',!dumbbellHeld);
            if(pose==='alarm-hush') alarmHeld=!alarmReturning;
            onTableProp?.('alarm',!alarmHeld);
            if(pose==='shower-cap') bathCapHeld=!bathCapReturning;
            onTableProp?.('bathcap',!bathCapHeld);
            if(pose==='toothbrush-guitar') bathBrushHeld=!bathBrushReturning;
            onTableProp?.('bathbrush',!bathBrushHeld);
            if(pose==='spoon-concert') spoonHeld=!spoonReturning;
            onTableProp?.('spoon',!spoonHeld);
            if(pose==='umbrella-flip') umbrellaHeld=!umbrellaReturning;
            onTableProp?.('umbrella',!umbrellaHeld);
            if(pose==='guard-groceries') groceriesHeld=!groceriesReturning;
            onTableProp?.('groceries',!groceriesHeld);
            if(pose==='receipt-shock') receiptHeld=!receiptReturning;
            onTableProp?.('receipt',!receiptHeld);
            if(pose==='noodle-pickup'||pose==='noodle-putdown'){
                bowlOnStool=pose==='noodle-putdown';
                onTableProp?.('bowlstand',true);
                onTableProp?.('bowl',bowlOnStool);
            }
            if(scene==='noodle'&&foodBits.has(pose)){
                bowlOnStool=false;
                onTableProp?.('bowl',false);
            }
            for(const [activity,prop] of Object.entries(tableProps))
                if(!prop.transient||pose===activity) onTableProp?.(prop.name,pose!==activity);
            onTableProp?.('stackbox',pose!=='parcel-pile');
            onTableProp?.('mainparcel',!singleParcel.has(pose)&&pose!=='parcel-pile');
            onTableProp?.('stamp',pose!=='backward-stamp');
            if(pose==='sleep'){
                actor.hidden=true;
                onGameFrame?.(null);
                onBedFrame(true);
                position(...bed.pillow,'sleep');
            }else if(pose){
                onBedFrame(false);
                const at=spoonReturning?spoonTable:anchor;
                if(pose==='sales-bow'||pose==='comic-hero'||photoBits.has(pose)||pose==='wobble'||fortuneBits.has(pose)) position(at[0],at[1],at[2]*1.1,'activity');
                else if(pose==='receipt-shock'&&!receiptReturning) position(at[0],at[1],at[2]*1.1,'activity');
                else if(pose==='dumbbell-brag') position(at[0],at[1],at[2]*1.13,'activity');
                else if(pose==='alarm-hush'&&!alarmReturning) position(at[0],at[1],at[2]*1.1,'activity');
                else if(pose==='guard-groceries'&&!groceriesReturning) position(at[0],at[1],at[2]*1.08,'activity');
                else if(pose==='shower-cap'&&!bathCapReturning) position(at[0],at[1],at[2]*1.2,'activity');
                else if((pose==='umbrella-flip'&&!umbrellaReturning)||(pose==='toothbrush-guitar'&&!bathBrushReturning)) position(at[0],at[1],at[2]*1.13,'activity');
                else position(...at,'activity');
                if(leafFinished) paint('idle',0,0);
                else if(tidyReleased&&pending) paint('tidy-release',3,0);
                else if(pose==='noodle-pickup') paint('noodle-standing-transfer',3,0);
                else if(pose==='noodle-putdown') paint('noodle-lower-arms',3,0);
                else if(ragReturning) paint('rag-lower-arm',3,0);
                else if(chopsticksReturning||dumbbellReturning||alarmReturning||bathCapReturning||bathBrushReturning||spoonReturning||umbrellaReturning||groceriesReturning||receiptReturning) paint('idle',0,0);
                else if(pose==='toothbrush-guitar') paint('toothbrush-guitar',expressive?3:0,0);
                else if(pose==='parcel-pile') paint('parcel-pile',expressive?3:0,0);
                else if(pose==='stuck-tape') paint('stuck-tape',expressive?3:0,0);
                else if(pose==='guard-groceries') paint('grocery-transfer',expressive?4:3,0);
                else if(pose==='receipt-shock') paint('receipt-transfer',expressive?3:1,0);
                else if(pose==='shower-cap') paint('shower-cap',expressive?3:0,0);
                else if(pose==='sales-bow') paint('sales-bow',expressive?2:0,0);
                else if(pose==='backward-stamp') paint('backward-stamp',expressive?3:0,0);
                else if(pose==='rag-crown') paint('rag-crown',expressive?3:0,0);
                else if(pose==='alarm-hush') paint('alarm-hush',expressive?3:0,0);
                else if(pose==='dumbbell-brag') paint('dumbbell-brag',expressive?2:0,0);
                else if(pose==='spoon-concert') paint('spoon-concert',expressive?3:0,0);
                else if(pose==='comic-hero') paint('comic-hero',expressive?3:0,0);
                else if(pose==='parcel-check') paint('parcel-check',expressive?3:0,0);
                else if(photoBits.has(pose)) paint(pose,expressive?3:0,0);
                else if(fortuneBits.has(pose)) paint(pose,expressive?(pose==='fortune-think'?2:3):0,0);
                else if(pose==='wobble') paint('wobble',expressive?3:0,0);
                else if(pose==='wrong-turn') paint(expressive?'wrong-turn':'idle',expressive?1:0,0);
                else paint(pose,expressive&&bits[pose]?(pose==='hot-noodles'?2:['uneven-chopsticks','chili-flinch','long-noodle','umbrella-flip','soap-moustache','leaf-salute'].includes(pose)?3:1):0,0,pose==='backward-stamp');
            }
            if(pending) queueMicrotask(pending);
        }

        function makeSpoonTrip(from,to){
            const via=[(from[0]+to[0])/2,Math.max(80,from[1],to[1])];
            const path=route([from,via],to);
            const cycles=Math.max(1,Math.round(path.length/(to[2]*.65)));
            return {from,to,path,cycles,duration:cycles*.79+.2};
        }

        function stepSpoonTrip(elapsed,returning){
            const trip=entrance.spoonTrip;
            const transfer=1.2,turn=.52;
            if(returning){
                const finishTime=(entrance.spoonFinishFrame+1)*.25;
                if(elapsed<finishTime){
                    position(...trip.from,'prepare');
                    onTableProp?.('spoon',false);
                    paint('spoon-concert',Math.max(0,entrance.spoonFinishFrame-Math.floor(elapsed/.25)),0);
                    return true;
                }
                elapsed-=finishTime;
            }
            if(!returning){
                if(elapsed<transfer){
                    position(...spoonTable,'prepare');
                    onTableProp?.('spoon',false);
                    paint('spoon-transfer',Math.min(3,Math.floor(elapsed/transfer*4)),0);
                    return true;
                }
                elapsed-=transfer;
            }
            if(elapsed<turn){
                position(...trip.from,'turn');
                paint('spoon-turn',Math.min(3,Math.floor(elapsed/turn*4)),0,trip.path.flip);
                return true;
            }
            elapsed-=turn;
            if(elapsed<trip.duration){
                const progress=smooth(elapsed/trip.duration);
                const [x,y]=trip.path.sample(progress);
                const phase=progress*trip.cycles;
                position(x,y,mix(trip.from[2],trip.to[2],progress),'walk');
                paint('spoon-walk',Math.round(phase*4)%4,0,trip.path.flip);
                return true;
            }
            elapsed-=trip.duration;
            if(elapsed<turn){
                position(...trip.to,'turn');
                paint('spoon-turn',3-Math.min(3,Math.floor(elapsed/turn*4)),0,trip.path.flip);
                return true;
            }
            elapsed-=turn;
            if(returning&&elapsed<transfer){
                position(...spoonTable,'prepare');
                onTableProp?.('spoon',false);
                paint('spoon-transfer',3-Math.min(3,Math.floor(elapsed/transfer*4)),0);
                return true;
            }
            arrive();
            return false;
        }

        function stepIn(elapsed) {
            const transferTime=1.2;
            if(entrance.bowlOnly) return playStandingBowlTransfer(elapsed);
            if(entrance.wrongTurnFinish){
                const {wrongFrom,wrongFlip,wrongStart,wrongDistance}=entrance;
                const turning=.55,walking=wrongDistance>.005?.9:0,settle=.5;
                if(elapsed<turning){
                    position(...wrongFrom,'prepare');
                    paintTurn(Math.round(mix(wrongStart,10,smooth(elapsed/turning))),!wrongFlip);
                    return true;
                }
                if(elapsed<turning+walking){
                    const u=smooth((elapsed-turning)/walking);
                    position(...wrongFrom.map((value,index)=>mix(value,anchor[index],u)),'walk');
                    paint('walk',Math.round(u*8)%8,0,wrongFlip);
                    return true;
                }
                if(elapsed<turning+walking+settle){
                    position(...anchor,'prepare');
                    paintTurn(Math.round(smooth((elapsed-turning-walking)/settle)*5),wrongFlip);
                    return true;
                }
                arrive();
                // Let the queued next action run before this skit can start another trip.
                return true;
            }
            if(entrance.tidyRelease){
                if(elapsed<1.2){
                    position(...anchor,'prepare');
                    onTableProp?.('rag',false);
                    paint('tidy-release',Math.min(3,Math.floor(elapsed/1.2*4)),0);
                    return true;
                }
                arrive();
                return true;
            }
            if(entrance.exerciseFinish){
                const frames=entrance.exerciseFrames;
                if(elapsed<frames.length*.09){
                    position(...anchor,'prepare');
                    paint('exercise',frames[Math.min(frames.length-1,Math.floor(elapsed/.09))],0);
                    return true;
                }
                arrive();
                return false;
            }
            if(entrance.homePropFinish){
                const {homePropPose,homePropFrame}=entrance;
                const duration=(homePropFrame+1)*.08;
                if(elapsed<duration){
                    const index=Math.max(0,homePropFrame-Math.floor(elapsed/.08));
                    position(...anchor,'prepare');
                    paint(homePropPose,playbackFrames[homePropPose][index],0);
                    return true;
                }
                arrive();
                return false;
            }
            if(entrance.wobbleFinish){
                const {wobbleFrame}=entrance;
                if(elapsed<(wobbleFrame+1)*.3){
                    position(anchor[0],anchor[1],anchor[2]*1.1,'prepare');
                    paint('wobble',Math.max(0,wobbleFrame-Math.floor(elapsed/.3)),0);
                    return true;
                }
                arrive();
                return false;
            }
            if(entrance.pileFinish){
                const {pileFrame}=entrance;
                if(elapsed<(pileFrame+1)*.25){
                    position(...anchor,'prepare');
                    paint('parcel-pile',Math.max(0,pileFrame-Math.floor(elapsed/.25)),0);
                    return true;
                }
                arrive();
                return false;
            }
            if(entrance.parcelCheckFinish){
                const {parcelCheckFrame}=entrance;
                if(elapsed<(parcelCheckFrame+1)*.25){
                    position(...anchor,'prepare');
                    paint('parcel-check',Math.max(0,parcelCheckFrame-Math.floor(elapsed/.25)),0);
                    return true;
                }
                arrive();
                return false;
            }
            if(entrance.leafFinish){
                const {leafFrame}=entrance;
                if(elapsed<(leafFrame+1)*.25){
                    position(...anchor,'prepare');
                    paint('leaf-salute',Math.max(0,leafFrame-Math.floor(elapsed/.25)),0);
                    return true;
                }
                arrive();
                return false;
            }
            if(entrance.photoFinish){
                const {photoFrame}=entrance;
                if(elapsed<(photoFrame+1)*.3){
                    position(anchor[0],anchor[1],anchor[2]*1.1,'prepare');
                    paint(pose,Math.max(0,photoFrame-Math.floor(elapsed/.3)),0);
                    return true;
                }
                arrive();
                return false;
            }
            if(entrance.fortuneFinish){
                const frames=entrance.fortuneFrame>1?[entrance.fortuneFrame,1,0]:[1,0];
                if(elapsed<frames.length*.3){
                    position(anchor[0],anchor[1],anchor[2]*1.1,'prepare');
                    paint(pose,frames[Math.min(frames.length-1,Math.floor(elapsed/.3))],0);
                    return true;
                }
                arrive();
                return false;
            }
            if(entrance.salesFinish){
                const frames=entrance.salesFrame>1?[entrance.salesFrame,1,0]:[1,0];
                if(elapsed<frames.length*.3){
                    position(anchor[0],anchor[1],anchor[2]*1.1,'prepare');
                    paint('sales-bow',frames[Math.min(frames.length-1,Math.floor(elapsed/.3))],0);
                    return true;
                }
                arrive();
                return false;
            }
            if(entrance.heroFinish){
                const {heroFrame}=entrance;
                if(elapsed<(heroFrame+1)*.3){
                    position(anchor[0],anchor[1],anchor[2]*1.1,'prepare');
                    paint('comic-hero',Math.max(0,heroFrame-Math.floor(elapsed/.3)),0);
                    return true;
                }
                arrive();
                return false;
            }
            if(entrance.receiptReturning||entrance.receiptOnly){
                if(entrance.receiptOnly&&elapsed<.8){
                    position(anchor[0],anchor[1],anchor[2]*1.1,'prepare');
                    onTableProp?.('receipt',true);
                    paint('receipt-lower-arm',3-Math.min(3,Math.floor(elapsed/.2)),0);
                    return true;
                }
                if(entrance.receiptOnly) elapsed-=.8;
                const initial=entrance.receiptReturning?entrance.receiptFrame:0;
                const duration=entrance.receiptReturning?(initial+1)*.3:.8;
                if(elapsed<duration){
                    const frame=entrance.receiptReturning?Math.max(0,initial-Math.floor(elapsed/.3)):Math.min(1,Math.floor(elapsed/.4));
                    position(anchor[0],anchor[1],anchor[2]*1.1,'prepare');
                    onTableProp?.('receipt',false);
                    paint('receipt-transfer',frame,0);
                    return true;
                }
                if(entrance.receiptReturning&&elapsed<duration+.8){
                    position(anchor[0],anchor[1],anchor[2]*1.1,'prepare');
                    onTableProp?.('receipt',true);
                    paint('receipt-lower-arm',Math.min(3,Math.floor((elapsed-duration)/.2)),0);
                    return true;
                }
                arrive();
                return false;
            }
            if(entrance.groceriesReturning||entrance.groceriesOnly){
                if(entrance.groceriesReturning){
                    const settleTime=.3;
                    if(elapsed<settleTime){
                        const remaining=1-smooth(elapsed/settleTime);
                        position(anchor[0],anchor[1],anchor[2]*1.08,'prepare');
                        onTableProp?.('groceries',false);
                        paint('grocery-transfer',entrance.groceriesFrame,entrance.groceriesLean*remaining,false,0,entrance.groceriesLift*remaining);
                        return true;
                    }
                    elapsed-=settleTime;
                }
                if(entrance.groceriesOnly&&elapsed<.8){
                    position(anchor[0],anchor[1],anchor[2]*1.08,'prepare');
                    onTableProp?.('groceries',true);
                    paint('grocery-lower-arm',3-Math.min(3,Math.floor(elapsed/.2)),0);
                    return true;
                }
                if(entrance.groceriesOnly) elapsed-=.8;
                const groceryTransferTime=entrance.groceriesReturning?(entrance.groceriesFrame+1)*.3:transferTime;
                if(elapsed<groceryTransferTime){
                    const n=entrance.groceriesReturning?Math.floor(elapsed/.3):Math.min(3,Math.floor(elapsed/transferTime*4));
                    position(anchor[0],anchor[1],anchor[2]*1.08,'prepare');
                    onTableProp?.('groceries',false);
                    paint('grocery-transfer',entrance.groceriesReturning?Math.max(0,entrance.groceriesFrame-n):n,0);
                    return true;
                }
                if(entrance.groceriesReturning&&elapsed<groceryTransferTime+.8){
                    position(anchor[0],anchor[1],anchor[2]*1.08,'prepare');
                    onTableProp?.('groceries',true);
                    paint('grocery-lower-arm',Math.min(3,Math.floor((elapsed-groceryTransferTime)/.2)),0);
                    return true;
                }
                arrive();
                return false;
            }
            if(entrance.bathBrushReturning||entrance.bathBrushOnly){
                if(entrance.bathBrushReturning){
                    const finishTime=(entrance.brushFinishFrame+1)*.25;
                    if(elapsed<finishTime){
                        position(anchor[0],anchor[1],anchor[2]*1.13,'prepare');
                        onTableProp?.('bathbrush',false);
                        paint('toothbrush-guitar',Math.max(0,entrance.brushFinishFrame-Math.floor(elapsed/.25)),0);
                        return true;
                    }
                    elapsed-=finishTime;
                }
                if(entrance.bathBrushOnly&&elapsed<.8){
                    position(anchor[0],anchor[1],anchor[2]*1.13,'prepare');
                    onTableProp?.('bathbrush',true);
                    paint('bathbrush-lower-arm',3-Math.min(3,Math.floor(elapsed/.2)),0);
                    return true;
                }
                if(entrance.bathBrushOnly) elapsed-=.8;
                if(elapsed<transferTime){
                    const n=Math.min(3,Math.floor(elapsed/transferTime*4));
                    position(anchor[0],anchor[1],anchor[2]*1.13,'prepare');
                    onTableProp?.('bathbrush',false);
                    paint('toothbrush-transfer',entrance.bathBrushReturning?3-n:n,0);
                    return true;
                }
                if(entrance.bathBrushReturning&&elapsed<transferTime+.8){
                    position(anchor[0],anchor[1],anchor[2]*1.13,'prepare');
                    onTableProp?.('bathbrush',true);
                    paint('bathbrush-lower-arm',Math.min(3,Math.floor((elapsed-transferTime)/.2)),0);
                    return true;
                }
                arrive();
                return false;
            }
            if(entrance.bathCapReturning||entrance.bathCapOnly){
                if(entrance.bathCapOnly&&elapsed<.8){
                    position(anchor[0],anchor[1],anchor[2]*1.2,'prepare');
                    onTableProp?.('bathcap',true);
                    paint('bathcap-lower-arm',3-Math.min(3,Math.floor(elapsed/.2)),0);
                    return true;
                }
                if(entrance.bathCapOnly) elapsed-=.8;
                if(entrance.bathCapReturning){
                    const resetTime=(entrance.bathCapFrame+1)*.24;
                    if(elapsed<resetTime){
                        position(anchor[0],anchor[1],anchor[2]*1.2,'prepare');
                        onTableProp?.('bathcap',false);
                        paint('shower-cap',Math.max(0,entrance.bathCapFrame-Math.floor(elapsed/.24)),0);
                        return true;
                    }
                    elapsed-=resetTime;
                }
                if(elapsed<transferTime){
                    const n=Math.min(3,Math.floor(elapsed/transferTime*4));
                    position(anchor[0],anchor[1],anchor[2]*1.2,'prepare');
                    onTableProp?.('bathcap',false);
                    paint('shower-cap-transfer',entrance.bathCapReturning?3-n:n,0);
                    return true;
                }
                if(entrance.bathCapReturning&&elapsed<transferTime+.8){
                    position(anchor[0],anchor[1],anchor[2]*1.2,'prepare');
                    onTableProp?.('bathcap',true);
                    paint('bathcap-lower-arm',Math.min(3,Math.floor((elapsed-transferTime)/.2)),0);
                    return true;
                }
                arrive();
                return false;
            }
            if(entrance.alarmReturning||entrance.alarmOnly){
                if(entrance.alarmReturning){
                    const finishTime=(entrance.alarmFinishFrame+1)*.25;
                    if(elapsed<finishTime){
                        position(anchor[0],anchor[1],anchor[2]*1.1,'prepare');
                        onTableProp?.('alarm',false);
                        paint('alarm-hush',Math.max(0,entrance.alarmFinishFrame-Math.floor(elapsed/.25)),0);
                        return true;
                    }
                    elapsed-=finishTime;
                }
                if(entrance.alarmOnly&&elapsed<.8){
                    position(anchor[0],anchor[1],anchor[2]*1.1,'prepare');
                    onTableProp?.('alarm',true);
                    paint('alarm-lower-arm',3-Math.min(3,Math.floor(elapsed/.2)),0);
                    return true;
                }
                if(entrance.alarmOnly) elapsed-=.8;
                if(elapsed<transferTime){
                    const n=Math.min(3,Math.floor(elapsed/transferTime*4));
                    position(anchor[0],anchor[1],anchor[2]*1.1,'prepare');
                    onTableProp?.('alarm',false);
                    paint('alarm-pickup',entrance.alarmReturning?3-n:n,0);
                    return true;
                }
                if(entrance.alarmReturning&&elapsed<transferTime+.8){
                    position(anchor[0],anchor[1],anchor[2]*1.1,'prepare');
                    onTableProp?.('alarm',true);
                    paint('alarm-lower-arm',Math.min(3,Math.floor((elapsed-transferTime)/.2)),0);
                    return true;
                }
                arrive();
                return false;
            }
            if(entrance.soapCleanup){
                const {soapFrame}=entrance;
                if(elapsed<(soapFrame+1)*.28){
                    position(...anchor,'prepare');
                    paint('soap-moustache',Math.max(0,soapFrame-Math.floor(elapsed/.28)),0);
                    return true;
                }
                arrive();
                return false;
            }
            if(entrance.umbrellaClose){
                const {umbrellaFrame}=entrance;
                const settleTime=.3;
                if(elapsed<settleTime){
                    const remaining=1-smooth(elapsed/settleTime);
                    position(anchor[0],anchor[1],anchor[2]*1.13,'prepare');
                    paint('umbrella-flip',umbrellaFrame,entrance.umbrellaLean*remaining);
                    return true;
                }
                const rewind=elapsed-settleTime;
                if(rewind<(umbrellaFrame+1)*.3){
                    const frame=Math.max(0,umbrellaFrame-Math.floor(rewind/.3));
                    position(anchor[0],anchor[1],anchor[2]*1.13,'prepare');
                    paint('umbrella-flip',frame,0);
                    return true;
                }
                arrive();
                return false;
            }
            if(entrance.umbrellaReturning||entrance.umbrellaOnly){
                const umbrellaTransferTime=1.5;
                if(elapsed<umbrellaTransferTime){
                    const n=Math.min(4,Math.floor(elapsed/umbrellaTransferTime*5));
                    position(anchor[0],anchor[1],anchor[2]*1.13,'prepare');
                    onTableProp?.('umbrella',false);
                    paint('umbrella-pickup',entrance.umbrellaReturning?4-n:n,0);
                    return true;
                }
                arrive();
                return false;
            }
            if(entrance.spoonReturning||entrance.spoonOutbound)
                return stepSpoonTrip(elapsed,Boolean(entrance.spoonReturning));
            if(entrance.foodFinish){
                const {foodFrame,foodPose,foodLean,foodLift}=entrance;
                const settleTime=.3;
                if(elapsed<settleTime){
                    const remaining=1-smooth(elapsed/settleTime);
                    position(...anchor,'prepare');
                    paint(foodPose,foodFrame,foodLean*remaining,false,0,foodLift*remaining);
                    return true;
                }
                const rewind=elapsed-settleTime;
                if(rewind<(foodFrame+1)*.28){
                    const frame=Math.max(0,foodFrame-Math.floor(rewind/.28));
                    position(...anchor,'prepare');
                    paint(foodPose,frame,0);
                    return true;
                }
                arrive();
                return false;
            }
            if(entrance.dumbbellReturning||entrance.dumbbellOnly){
                if(entrance.dumbbellReturning){
                    const finishTime=(entrance.dumbbellFinishFrame+1)*.25;
                    if(elapsed<finishTime){
                        position(anchor[0],anchor[1],anchor[2]*1.13,'prepare');
                        onTableProp?.('dumbbell',false);
                        paint('dumbbell-brag',Math.max(0,entrance.dumbbellFinishFrame-Math.floor(elapsed/.25)),0);
                        return true;
                    }
                    elapsed-=finishTime;
                }
                const duration=1.8;
                if(elapsed<duration){
                    const n=Math.min(5,Math.floor(elapsed/duration*6));
                    const frame=entrance.dumbbellReturning?5-n:n;
                    position(anchor[0],anchor[1],anchor[2]*1.13,'prepare');
                    onTableProp?.('dumbbell',false);
                    paint('dumbbell-sequence',frame,0);
                    return true;
                }
                arrive();
                return false;
            }
            if(entrance.chopsticksReturning||entrance.chopsticksOnly){
                if(elapsed<transferTime){
                    const n=Math.min(3,Math.floor(elapsed/transferTime*4));
                    const frame=entrance.chopsticksReturning?3-n:n;
                    position(...anchor,'prepare');
                    onTableProp?.('chopsticks',false);
                    paint('chopsticks-transfer',frame,0);
                    return true;
                }
                arrive();
                return false;
            }
            if(entrance.ragReturning){
                const finishTime=(entrance.ragFinishFrame+1)*.25;
                if(elapsed<finishTime){
                    position(...anchor,'prepare');
                    onTableProp?.('rag',false);
                    paint('rag-crown',Math.max(0,entrance.ragFinishFrame-Math.floor(elapsed/.25)),0);
                    return true;
                }
                elapsed-=finishTime;
                if(elapsed<transferTime){
                    const frame=3-Math.min(3,Math.floor(elapsed/transferTime*4));
                    position(...anchor,'prepare');
                    paint('rag-crown-transfer',frame,0);
                    onTableProp?.('rag',false);
                    return true;
                }
                if(elapsed<transferTime+.8){
                    position(...anchor,'prepare');
                    onTableProp?.('rag',true);
                    paint('rag-lower-arm',Math.min(3,Math.floor((elapsed-transferTime)/.2)),0);
                    return true;
                }
                arrive();
                return false;
            }
            if(entrance.ragOnly){
                return playRagPickup(elapsed);
            }
            if(entrance.tapeCleanup){
                const lead=entrance.tapeStartFrame==null?0:(3-entrance.tapeStartFrame+1)*.25;
                if(elapsed<lead){
                    position(...anchor,'stack');
                    paint('stuck-tape',Math.min(3,entrance.tapeStartFrame+Math.floor(elapsed/.25)),0);
                    return true;
                }
                const time=elapsed-lead+entrance.tapeOffset;
                if(time<2.1){
                    position(...anchor,'stack');
                    paint('tape-cleanup',Math.min(3,Math.floor(time/2.1*4)),0);
                    return true;
                }
                arrive();
                return false;
            }
            if(entrance.stampFinish){
                const frame=Math.min(3,entrance.stampFrame+Math.floor(elapsed/.28));
                if(elapsed<(4-entrance.stampFrame)*.28){
                    position(...anchor,'stack');
                    paint('backward-stamp',frame,0);
                    return true;
                }
                arrive();
                return false;
            }
            if(entrance.releaseMain){
                if(elapsed<transferTime){
                    const frame=Math.min(3,Math.floor(elapsed/transferTime*4));
                    position(...entrance.releaseMain,'stack');
                    paint('parcel-place',frame,0);
                    onTableProp?.('mainparcel',frame===3);
                    return true;
                }
                onTableProp?.('mainparcel',true);
                if(elapsed<transferTime+.8){
                    position(...entrance.releaseMain,'stack');
                    paint('parcel-lower-arm',Math.min(3,Math.floor((elapsed-transferTime)/.2)),0);
                    return true;
                }
                elapsed-=transferTime+.8;
            }
            if(entrance.releaseProp){
                const {at,prop}=entrance.releaseProp;
                if(elapsed<transferTime){
                    const frame=Math.min(3,Math.floor(elapsed/transferTime*4));
                    position(...at,'handoff');
                    paint(prop.sheet,frame,0,Boolean(prop.turn&&frame));
                    onTableProp?.(prop.name,frame===3);
                    return true;
                }
                onTableProp?.(prop.name,true);
                elapsed-=transferTime;
            }
            if(entrance.handoffOnly){
                if(entrance.takeProp&&elapsed<transferTime){
                    const frame=3-Math.min(3,Math.floor(elapsed/transferTime*4));
                    position(...anchor,'handoff');
                    paint(entrance.takeProp.sheet,frame,0,Boolean(entrance.takeProp.turn&&frame));
                    onTableProp?.(entrance.takeProp.name,frame===3);
                    return true;
                }
                arrive();
                return false;
            }
            if(entrance.stackOnly){
                if(elapsed<transferTime){
                    const n=Math.min(3,Math.floor(elapsed/transferTime*4));
                    const frame=entrance.stackReverse?3-n:n;
                    position(...anchor,'stack');
                    paint('parcel-stack',frame,0);
                    onTableProp?.('stackbox',frame<2);
                    return true;
                }
                arrive();
                return false;
            }
            if(entrance.toolOnly){
                if(elapsed<transferTime){
                    const n=Math.min(3,Math.floor(elapsed/transferTime*4));
                    const frame=entrance.toolReverse?3-n:n;
                    position(...anchor,'stack');
                    paint('stamp-transfer',frame,0);
                    onTableProp?.('stamp',frame<2);
                    return true;
                }
                arrive();
                return false;
            }
            const {path,cycles,duration,turnSteps,turnTime,fromHeight,onStreet,carryBowl}=entrance;
            const startTurn=entrance.turnBeforeWalk;
            if(startTurn&&elapsed<startTurn.duration){
                const [x,y,h]=path.sample(0);
                position(x,y,h??fromHeight,'turn');
                const progress=smooth(elapsed/startTurn.duration);
                if(startTurn.towardSame) paint('turn',Math.round(mix(startTurn.frame,0,progress)),0,startTurn.flip);
                else paintTurn(Math.round(mix(startTurn.frame,10,progress)),startTurn.flip);
                return true;
            }
            const afterRise=elapsed-(startTurn?.duration??0);
            const riseTurn=carryBowl ? .8 : 0;
            if(riseTurn&&afterRise<riseTurn){
                if(carryBowl){
                    const [x,y,h]=path.sample(0);
                    position(x,y,h??fromHeight,'turn');
                    const progress=smooth(afterRise/riseTurn);
                    const n=Math.min(3,Math.floor(progress*4));
                    const frame=entrance.carryFromSeat?n:Math.max(1,n);
                    actor.toggleAttribute('data-noodle-arrival',!entrance.carryFromSeat);
                    if(!entrance.carryFromSeat){
                        actor.style.setProperty('--noodle-arrival-scale',String(mix(1.08,1,progress)));
                        actor.style.setProperty('--noodle-arrival-lower',`${5*(1-progress)}%`);
                    }
                    paint('noodle-turn',path.flip&&frame>1?Math.max(2,frame):frame,0,path.flip&&frame>1);
                }
                return true;
            }
            const elapsedWalk=afterRise-riseTurn-(entrance.streetPause??0);
            const door=entrance.bathroomDoor&&bathroomDoorFrame(elapsedWalk,entrance.bathroomDoor);
            const walkingTime=door?.walkingTime??elapsedWalk;
            if(onStreet&&entrance.streetTurn){
                const turn=entrance.streetTurn;
                const progress=Math.min(1,(elapsed-turn.started)/turn.duration);
                position(...turn.at,'turn');
                paintTurn(Math.round(smooth(progress)*10),turn.from);
                if(progress>=1){
                    entrance.streetFacing=turn.to;
                    entrance.streetPause=(entrance.streetPause??0)+turn.duration;
                    entrance.streetTurn=undefined;
                }
                return true;
            }
            if(walkingTime<duration||door?.phase){
                // The walking clock pauses while the door swings at each stop.
                const u=Math.min(1,walkingTime/duration);
                const travel=travelAt(u);
                const [x,y,streetHeight]=path.sample(travel);
                let facing=path.flip;
                if(onStreet){
                    const ahead=path.sample(Math.min(1,travel+.002));
                    const behind=path.sample(Math.max(0,travel-.002));
                    const dx=(ahead[0]-behind[0])*PanpanStreet.width;
                    const dy=(ahead[1]-behind[1])*PanpanStreet.height;
                    // Tiny sideways bends on an almost vertical lane do not require a full turn.
                    facing=Math.abs(dx)<Math.abs(dy)*.6&&entrance.streetFacing!==undefined?entrance.streetFacing:dx<0;
                }
                if(onStreet&&entrance.streetFacing!==undefined&&facing!==entrance.streetFacing){
                    const height=streetHeight??mix(fromHeight,seat?.at[2]??anchor[2],travel);
                    entrance.streetTurn={started:elapsed,duration:.48,from:entrance.streetFacing,to:facing,at:[x,y,height]};
                    position(x,y,height,'turn');
                    paintTurn(0,entrance.streetFacing);
                    return true;
                }
                if(onStreet) entrance.streetFacing=facing;
                const phase=travel*cycles;
                const lean=(facing?-1:1)*(1.1+Math.sin(phase*2*Math.PI)*.65)*Math.min(1,u*10,(1-u)*10);
                const height=pose==='spoon-concert'?spoonTable[2]:seat?.at[2]??anchor[2];
                const motion=door?.phase??(entrance.onExit&&!onStreet?'exit':'walk');
                position(x,y,streetHeight??mix(fromHeight,height,travel),motion,door?.opening);
                if(door?.phase) paint('turn',0,0,facing);
                else if(carryBowl) paint('noodle-carry',Math.round(phase*4)%4,lean,facing);
                else paint('walk',Math.round(phase*8)%8,lean,facing);
                return true;
            }
            if(entrance.onExit){
                if(onStreet) position(...anchor,'walk');
                else if(entrance.linkedDoor) position(...anchor,'exit');
                completeExit();
                return false;
            }
            if(pose==='sleep'){
                arrive();
                return false;
            }
            const after=walkingTime-duration;
            if(after<turnTime){
                position(...(pose==='spoon-concert'?spoonTable:seat?.at??anchor),'turn');
                if(carryBowl){
                    const progress=smooth(after/turnTime);
                    const n=Math.min(3,Math.floor(progress*4));
                    const frame=foodBits.has(pose)||pose==='noodle-putdown'?Math.max(1,3-n):3-n;
                    actor.toggleAttribute('data-noodle-arrival',foodBits.has(pose));
                    if(foodBits.has(pose)){
                        actor.style.setProperty('--noodle-arrival-scale',String(mix(1,1.08,progress)));
                        actor.style.setProperty('--noodle-arrival-lower',`${5*progress}%`);
                    }
                    paint('noodle-turn',frame,0,path.flip&&frame>1);
                }
                else paintTurn(Math.round(smooth(after/turnTime)*turnSteps),path.flip);
                return true;
            }
            let actionTime=after-turnTime;
            if(pose==='noodle-pickup'||pose==='noodle-putdown'){
                return playStandingBowlTransfer(actionTime);
            }
            if(pose==='receipt-shock'){
                if(actionTime<.8){
                    position(anchor[0],anchor[1],anchor[2]*1.1,'prepare');
                    onTableProp?.('receipt',true);
                    paint('receipt-lower-arm',3-Math.min(3,Math.floor(actionTime/.2)),0);
                    return true;
                }
                actionTime-=.8;
                if(actionTime<.8){
                    position(anchor[0],anchor[1],anchor[2]*1.1,'prepare');
                    onTableProp?.('receipt',false);
                    paint('receipt-transfer',Math.min(1,Math.floor(actionTime/.4)),0);
                    return true;
                }
                arrive();
                return false;
            }
            if(pose==='guard-groceries'){
                if(actionTime<.8){
                    position(anchor[0],anchor[1],anchor[2]*1.08,'prepare');
                    onTableProp?.('groceries',true);
                    paint('grocery-lower-arm',3-Math.min(3,Math.floor(actionTime/.2)),0);
                    return true;
                }
                actionTime-=.8;
                if(actionTime<transferTime){
                    const frame=Math.min(3,Math.floor(actionTime/transferTime*4));
                    position(anchor[0],anchor[1],anchor[2]*1.08,'prepare');
                    onTableProp?.('groceries',false);
                    paint('grocery-transfer',frame,0);
                    return true;
                }
                arrive();
                return false;
            }
            if(pose==='toothbrush-guitar'){
                if(actionTime<.8){
                    position(anchor[0],anchor[1],anchor[2]*1.13,'prepare');
                    onTableProp?.('bathbrush',true);
                    paint('bathbrush-lower-arm',3-Math.min(3,Math.floor(actionTime/.2)),0);
                    return true;
                }
                actionTime-=.8;
                if(actionTime<transferTime){
                    const frame=Math.min(3,Math.floor(actionTime/transferTime*4));
                    position(anchor[0],anchor[1],anchor[2]*1.13,'prepare');
                    onTableProp?.('bathbrush',false);
                    paint('toothbrush-transfer',frame,0);
                    return true;
                }
                arrive();
                return false;
            }
            if(pose==='shower-cap'){
                if(actionTime<.8){
                    position(anchor[0],anchor[1],anchor[2]*1.2,'prepare');
                    onTableProp?.('bathcap',true);
                    paint('bathcap-lower-arm',3-Math.min(3,Math.floor(actionTime/.2)),0);
                    return true;
                }
                actionTime-=.8;
                if(actionTime<transferTime){
                    const frame=Math.min(3,Math.floor(actionTime/transferTime*4));
                    position(anchor[0],anchor[1],anchor[2]*1.2,'prepare');
                    onTableProp?.('bathcap',false);
                    paint('shower-cap-transfer',frame,0);
                    return true;
                }
                arrive();
                return false;
            }
            if(pose==='alarm-hush'){
                if(actionTime<.8){
                    position(anchor[0],anchor[1],anchor[2]*1.1,'prepare');
                    onTableProp?.('alarm',true);
                    paint('alarm-lower-arm',3-Math.min(3,Math.floor(actionTime/.2)),0);
                    return true;
                }
                actionTime-=.8;
                if(actionTime<transferTime){
                    const frame=Math.min(3,Math.floor(actionTime/transferTime*4));
                    position(anchor[0],anchor[1],anchor[2]*1.1,'prepare');
                    onTableProp?.('alarm',false);
                    paint('alarm-pickup',frame,0);
                    return true;
                }
                arrive();
                return false;
            }
            if(pose==='umbrella-flip'){
                const umbrellaTransferTime=1.5;
                if(actionTime<umbrellaTransferTime){
                    const frame=Math.min(4,Math.floor(actionTime/umbrellaTransferTime*5));
                    position(anchor[0],anchor[1],anchor[2]*1.13,'prepare');
                    onTableProp?.('umbrella',false);
                    paint('umbrella-pickup',frame,0);
                    return true;
                }
                arrive();
                return false;
            }
            if(pose==='spoon-concert') return stepSpoonTrip(actionTime,false);
            if(pose==='dumbbell-brag'){
                const duration=1.8;
                if(actionTime<duration){
                    const frame=Math.min(5,Math.floor(actionTime/duration*6));
                    position(anchor[0],anchor[1],anchor[2]*1.13,'prepare');
                    onTableProp?.('dumbbell',false);
                    paint('dumbbell-sequence',frame,0);
                    return true;
                }
                arrive();
                return false;
            }
            if(pose==='uneven-chopsticks'){
                if(actionTime<transferTime){
                    const frame=Math.min(3,Math.floor(actionTime/transferTime*4));
                    position(...anchor,'prepare');
                    onTableProp?.('chopsticks',false);
                    paint('chopsticks-transfer',frame,0);
                    return true;
                }
                arrive();
                return false;
            }
            if(pose==='rag-crown'){
                return playRagPickup(actionTime);
            }
            if(entrance.needParcel){
                if(actionTime<.8){
                    position(...anchor,'stack');
                    paint('parcel-lower-arm',3-Math.min(3,Math.floor(actionTime/.2)),0);
                    onTableProp?.('mainparcel',true);
                    return true;
                }
                actionTime-=.8;
                if(actionTime<transferTime){
                    const frame=3-Math.min(3,Math.floor(actionTime/transferTime*4));
                    position(...anchor,'stack');
                    paint('parcel-place',frame,0);
                    onTableProp?.('mainparcel',frame===3);
                    return true;
                }
                actionTime-=transferTime;
                onTableProp?.('mainparcel',false);
                if(singleParcel.has(pose)&&pose!=='backward-stamp'){
                    arrive();
                    return false;
                }
            }
            if(pose==='parcel-pile'){
                position(...anchor,'stack');
                if(actionTime<transferTime){
                    const frame=Math.min(3,Math.floor(actionTime/transferTime*4));
                    paint('parcel-stack',frame,0);
                    onTableProp?.('stackbox',frame<2);
                    return true;
                }
                arrive();
                return false;
            }
            if(pose==='backward-stamp'&&entrance.needParcel){
                position(...anchor,'stack');
                if(actionTime<transferTime){
                    const frame=Math.min(3,Math.floor(actionTime/transferTime*4));
                    paint('stamp-transfer',frame,0);
                    onTableProp?.('stamp',frame<2);
                    return true;
                }
                arrive();
                return false;
            }
            const prep=actionTime/.76;
            if(tableProps[pose]&&seat&&!carryBowl){
                const prop=propFor(pose,scene);
                const takeTime=actionTime;
                if(takeTime<transferTime){
                    const frame=3-Math.min(3,Math.floor(takeTime/transferTime*4));
                    position(...anchor,'handoff');
                    paint(prop.sheet,frame,0,Boolean(prop.turn&&frame));
                    onTableProp?.(prop.name,frame===3);
                    return true;
                }
            }
            if(prep<1&&actions.includes(pose)){
                position(...anchor,'prepare');
                if(pose==='tidy'){
                    if(prep<.42) paintTurn(turnSteps,path.flip);
                    else paint('tidy',0,0);
                }else paint(`${pose}-arrival`,Math.round(smooth(prep)*2)*8,0);
                return true;
            }
            arrive();
            return false;
        }

        function animate(now) {
            start ??= now;
            const exiting=Boolean(entrance?.onExit);
            const continuing=Boolean(entrance?.pending);
            if(entrance&&stepIn((now-start)/1000)){
                request = requestAnimationFrame(animate);
                return;
            }
            if(exiting) return;
            // A queued action starts after this frame; do not repaint the finished pose in between.
            if(continuing&&!entrance){
                request=0;
                return;
            }
            if(pose==='noodle-pickup'||pose==='noodle-putdown'){
                request=0;
                return;
            }
            if(pose==='sleep'){
                request=0;
                return;
            }
            start ??= now;
            const elapsed=(now-start)/1000;
            if(bits[pose]){
                const {beat}=bits[pose];
                const time=Math.min(elapsed,bitDuration);
                const progress=Math.min(1,Math.max(0,(time-beat+.45)/.52));
                const ending=Math.min(1,Math.max(0,(time-4.4)/.64));
                const active=smooth(progress)*(1-smooth(ending));
                const firstBlow=pose==='hot-noodles'?pulse(time,.53,.51):0;
                const frame=active>.56||firstBlow>.43?1:0;
                let lean=bitLeans[pose]*(active-.35*pulse(time,beat-.87,.48)+firstBlow);
                let lift=0;
                if(pose==='wobble'||pose==='wrong-turn'){
                    lean+=Math.sin((time-beat)*13)*7*pulse(time,beat-.3,2.1);
                }
                if(pose==='stuck-tape') lean+=Math.sin((time-beat)*21)*3.5*pulse(time,beat-.27,.95);
                if(pose==='parcel-check'||pose==='sales-bow') lean+=4*pulse(time,beat+.24,.73);
                if(startled.has(pose)) lift=-5*pulse(time,beat-.17,.5);
                if(unsteady.has(pose)) lean+=5*Math.sin((time-beat)*15)*pulse(time,beat-.15,1.45);
                if(swaying.has(pose)) lean+=5*Math.sin((time-beat)*8)*active;
                if(pose==='stuck-tape'&&time>=4.1)
                    paint('tape-cleanup',Math.min(3,Math.floor((time-4.1)/2.1*4)),0);
                else if(pose==='stuck-tape'){
                    const reveal=Math.min(1,Math.max(0,(time-.35)/1.3));
                    paint(pose,Math.round(3*smooth(reveal)),lean);
                }
                else if(pose==='uneven-chopsticks'){
                    const reveal=Math.min(1,Math.max(0,(time-.35)/1.35));
                    paint(pose,Math.round(3*smooth(reveal)*(1-smooth(ending))),lean);
                }
                else if(pose==='chili-flinch'){
                    const reveal=Math.min(1,Math.max(0,(time-.35)/1.2));
                    paint(pose,Math.round(3*smooth(reveal)*(1-smooth(ending))),lean,false,0,lift);
                }
                else if(pose==='long-noodle'){
                    const reveal=Math.min(1,Math.max(0,(time-.35)/1.5));
                    paint(pose,Math.round(3*smooth(reveal)*(1-smooth(ending))),lean);
                }
                else if(pose==='umbrella-flip'){
                    const reveal=Math.min(1,Math.max(0,(time-.3)/1.3));
                    paint(pose,Math.round(3*smooth(reveal)*(1-smooth(ending))),lean);
                }
                else if(pose==='spoon-concert'){
                    const reveal=Math.min(1,Math.max(0,(time-.35)/1.3));
                    paint(pose,Math.round(3*smooth(reveal)*(1-smooth(ending))),lean);
                }
                else if(pose==='dumbbell-brag'){
                    const reveal=Math.min(1,Math.max(0,(time-.35)/1.3));
                    paint(pose,Math.round(2*smooth(reveal)*(1-smooth(ending))),lean);
                }
                else if(pose==='alarm-hush'){
                    const reveal=Math.min(1,Math.max(0,(time-.35)/1.3));
                    paint(pose,Math.round(3*smooth(reveal)*(1-smooth(ending))),lean,false,0,lift);
                }
                else if(pose==='rag-crown'){
                    const reveal=Math.min(1,Math.max(0,(time-.35)/1.3));
                    paint(pose,Math.round(3*smooth(reveal)*(1-smooth(ending))),0);
                }
                else if(pose==='leaf-salute'){
                    const reveal=Math.min(1,Math.max(0,(time-.35)/1.3));
                    paint(pose,Math.round(3*smooth(reveal)*(1-smooth(ending))),lean);
                }
                else if(pose==='soap-moustache'){
                    const reveal=Math.min(1,Math.max(0,(time-.35)/1.3));
                    paint(pose,Math.round(3*smooth(reveal)*(1-smooth(ending))),lean);
                }
                else if(pose==='parcel-pile'){
                    const reveal=Math.min(1,Math.max(0,(time-.35)/1.3));
                    paint(pose,Math.round(3*smooth(reveal)*(1-smooth(ending))),lean);
                }
                else if(pose==='toothbrush-guitar'){
                    const reveal=Math.min(1,Math.max(0,(time-.35)/1.3));
                    paint(pose,Math.round(3*smooth(reveal)*(1-smooth(ending))),lean);
                }
                else if(pose==='guard-groceries') paint('grocery-transfer',frame?4:3,lean,false,0,lift);
                else if(pose==='receipt-shock'){
                    const reveal=Math.min(1,Math.max(0,(time-.35)/1.4));
                    paint('receipt-transfer',1+Math.round(2*smooth(reveal)*(1-smooth(ending))),lean);
                }
                else if(pose==='backward-stamp'){
                    const keys=[[0,0],[.7,0],[1.2,1],[1.65,2],[2.2,3],[4.4,3],[4.41,0],[bitDuration,0]];
                    const index=keys.findIndex(([at])=>at>time);
                    const [before,from]=keys[Math.max(0,index-1)];
                    const [after,to]=keys[index<0?keys.length-1:Math.max(1,index)];
                    paint(pose,Math.round(mix(from,to,smooth(after===before?1:(time-before)/(after-before)))),0);
                }
                else if(pose==='parcel-check'){
                    const keys=[[0,0],[.45,0],[1.2,1],[1.85,2],[2.5,3],[3.2,3],[3.8,2],[4.4,1],[5,0],[bitDuration,0]];
                    const index=keys.findIndex(([at])=>at>time);
                    const [before,from]=keys[Math.max(0,index-1)];
                    const [after,to]=keys[index<0?keys.length-1:Math.max(1,index)];
                    paint('parcel-check',Math.round(mix(from,to,smooth(after===before?1:(time-before)/(after-before)))),0);
                }
                else if(pose==='sales-bow'){
                    const keys=[[0,0],[.6,0],[1.25,1],[1.9,2],[2.6,2],[3.35,3],[4.5,3],[5.3,1],[6.2,0]];
                    const index=keys.findIndex(([at])=>at>time);
                    const [before,from]=keys[Math.max(0,index-1)];
                    const [after,to]=keys[index<0?keys.length-1:Math.max(1,index)];
                    paint('sales-bow',Math.round(mix(from,to,smooth(after===before?1:(time-before)/(after-before)))),0);
                }
                else if(pose==='comic-hero'){
                    const reveal=Math.min(1,Math.max(0,(time-.35)/1.4));
                    paint('comic-hero',Math.round(3*smooth(reveal)*(1-smooth(ending))),0);
                }
                else if(pose==='shower-cap'){
                    const reveal=Math.min(1,Math.max(0,(time-.25)/1.2));
                    paint('shower-cap',Math.round(3*smooth(reveal)*(1-smooth(ending))),0);
                }
                else if(fortuneBits.has(pose)){
                    const reveal=Math.min(1,Math.max(0,(time-.35)/1.3));
                    const progress=smooth(reveal)*(1-smooth(ending));
                    const frame=pose==='fortune-think'?Math.round(2*progress):progress<.3?0:progress<.7?1:3;
                    paint(pose,frame,0);
                }
                else if(photoBits.has(pose)){
                    const reveal=Math.min(1,Math.max(0,(time-.35)/1.4));
                    paint(pose,Math.round(3*smooth(reveal)*(1-smooth(ending))),0);
                }
                else if(pose==='wobble'){
                    const reveal=Math.min(1,Math.max(0,(time-.35)/1.4));
                    paint('wobble',Math.round(3*smooth(reveal)*(1-smooth(ending))),Math.sin((time-beat)*6)*3*active);
                }
                else if(pose==='wrong-turn'){
                    const away=[anchor[0]-1.25,anchor[1]-1.85,anchor[2]-.15];
                    if(time<1.1){
                        const u=smooth(time/1.1);
                        position(...anchor.map((value,index)=>mix(value,away[index],u)),'walk');
                        paint('walk',Math.round(u*8)%8,0,true);
                    }else if(time<1.6){
                        position(...away,'turn');
                        paintTurn(Math.round(smooth((time-1.1)/.5)*5),true);
                    }else if(time<3.65){
                        position(...away,'activity');
                        paint('wrong-turn',time<2.05?0:1,Math.sin((time-1.6)*5)*2);
                    }else if(time<4.15){
                        position(...away,'turn');
                        paintTurn(5-Math.round(smooth((time-3.65)/.5)*5),false);
                    }else if(time<5.3){
                        const u=smooth((time-4.15)/1.15);
                        position(...away.map((value,index)=>mix(value,anchor[index],u)),'walk');
                        paint('walk',Math.round(u*8)%8,0,false);
                    }else if(time<5.8){
                        position(...anchor,'turn');
                        paintTurn(Math.round(smooth((time-5.3)/.5)*5),false);
                    }else{
                        position(...anchor,'activity');
                        paint('idle',0,0);
                    }
                }
                else if(pose==='hot-noodles'){
                    const keys=[[0,0],[.45,0],[.85,1],[1.2,2],[1.75,3],[2.25,1],[2.65,2],[3.25,3],[3.8,1],[4.65,0],[bitDuration,0]];
                    const index=keys.findIndex(([at])=>at>time);
                    const [before,from]=keys[Math.max(0,index-1)];
                    const [after,to]=keys[index<0?keys.length-1:Math.max(1,index)];
                    const progress=after===before?1:(time-before)/(after-before);
                    paint(pose,Math.round(mix(from,to,smooth(progress))),lean);
                }
                else paint(pose,frame,lean,pose==='backward-stamp',0,lift);
                speak(time>=beat&&time<4.65?bit?.thought:undefined);
                if(elapsed>=bitDuration){
                    bitFinished=true;
                    request=0;
                    onBitEnd?.();
                    return;
                }
                request=requestAnimationFrame(animate);
                return;
            }
            const sequence = cues[pose];
            const time = elapsed % sequence.at(-1)[0];
            const i = sequence.findIndex(([at]) => at>time);
            const [before,from,fromLean] = sequence[i-1];
            const [after,to,toLean] = sequence[i];
            const linear = (time-before)/(after-before);
            const ease = linear*linear*(3-2*linear);
            const frame=Math.round(mix(from,to,ease))%24;
            paint(pose,playbackFrames[pose]?.[frame]??frame,mix(fromLean,toLean,ease),false,time);
            if(pose==='gaming') speak(time>=6.45&&time<8.15?'到楼顶了。先存档。':undefined);
            request=requestAnimationFrame(animate);
        }

        function sync() {
            if(bitFinished) return;
            if(pose&&enabled&&!reducedMotion.matches&&!document.hidden){
                if(pose==='sleep'&&currentPhase==='sleep') return;
                if(start!==undefined&&pausedAt!==undefined) start+=performance.now()-pausedAt;
                pausedAt=undefined;
                if(!request) request = requestAnimationFrame(animate);
            }else{
                cancelAnimationFrame(request);
                request = 0;
                if(pose&&enabled&&!reducedMotion.matches) pausedAt??=performance.now();
                else if(entrance?.onExit) completeExit();
                else{
                    pausedAt=undefined;
                    arrive(true);
                    speak(bit?.thought);
                }
            }
        }

        function completeExit(){
            if(entrance.releaseProp) onTableProp?.(entrance.releaseProp.prop.name,true);
            if(entrance.releaseMain) onTableProp?.('mainparcel',true);
            const done=entrance.onExit;
            entrance=undefined;
            request=0;
            actor.hidden=true;
            done();
        }

        function playStandingBowlTransfer(elapsed){
            const returning=pose==='noodle-putdown';
            if(!returning&&elapsed<.8){
                position(...anchor,'prepare');
                paint('noodle-lower-arms',3-Math.min(3,Math.floor(elapsed/.2)),0);
                onTableProp?.('bowl',true);
                return true;
            }
            const transferTime=elapsed-(returning?0:.8);
            if(transferTime<1.2){
                const n=Math.min(3,Math.floor(transferTime/.3));
                const frame=returning?3-n:n;
                position(...anchor,'prepare');
                paint('noodle-standing-transfer',frame,0);
                onTableProp?.('bowl',frame===0);
                return true;
            }
            if(returning&&transferTime<2){
                position(...anchor,'prepare');
                paint('noodle-lower-arms',Math.min(3,Math.floor((transferTime-1.2)/.2)),0);
                onTableProp?.('bowl',true);
                return true;
            }
            bowlOnStool=returning;
            onTableProp?.('bowl',returning);
            arrive();
            return true;
        }

        function transferBowl(returning,done){
            onTableProp?.('bowlstand',true);
            if(!returning){
                bowlOnStool=true;
                onTableProp?.('bowl',true);
            }
            api.show({scene:'noodle',pose:returning?'noodle-putdown':'noodle-pickup',anchor:noodleStand,
                approach:PanpanGame.scenes.noodle.approach});
            if(entrance) entrance.pending=done;
            else queueMicrotask(done);
        }

        function returningBowl(done){transferBowl(true,done)}

        function returningParcel(done){
            const parcel=PanpanGame.actionGroups.flatMap(group=>group.activities)
                .find(activity=>activity.place==='pack'&&activity.pose==='parcel');
            if(!parcel){done();return;}
            api.show({...parcel,scene:'pack',approach:PanpanGame.scenes.pack.approach});
            if(entrance) entrance.pending=done;
            else queueMicrotask(done);
        }

        function finishingMotion(){
            return entrance&&(entrance.bathroomDoor||['handoff','sit','rise','bed','stack','prepare'].includes(currentPhase)||
                (entrance.carryBowl||entrance.spoonJourney||entrance.wrongTurnFinish)&&['walk','turn'].includes(currentPhase));
        }

        function needsPileFinish(){
            return scene==='pack'&&pose==='parcel-pile'&&currentPhase==='activity'&&sheet==='parcel-pile'&&lastFrame>0;
        }

        function needsParcelCheckFinish(){
            return scene==='pack'&&pose==='parcel-check'&&currentPhase==='activity'&&sheet==='parcel-check'&&lastFrame>0;
        }

        function finishParcelCheck(done){
            entrance={parcelCheckFinish:true,parcelCheckFrame:lastFrame,pending:done};
            start=pausedAt=undefined;
            bitFinished=false;
            speak(undefined);
            stepIn(0);
            sync();
        }

        function needsStampFinish(){
            return scene==='pack'&&pose==='backward-stamp'&&currentPhase==='activity'&&sheet==='backward-stamp'&&lastFrame>0;
        }

        function finishStamp(done){
            entrance={stampFinish:true,stampFrame:lastFrame,pending:done};
            start=pausedAt=undefined;
            speak(undefined);
            stepIn(0);
            sync();
        }

        function finishPile(done){
            entrance={pileFinish:true,pileFrame:lastFrame,pending:done};
            start=pausedAt=undefined;
            bitFinished=false;
            speak(undefined);
            stepIn(0);
            sync();
        }

        function needsLeafFinish(){
            return scene==='alley'&&pose==='leaf-salute'&&currentPhase==='activity'&&sheet==='leaf-salute'&&lastFrame>0;
        }

        function finishLeaf(done){
            entrance={leafFinish:true,leafFrame:lastFrame,pending:done};
            start=pausedAt=undefined;
            bitFinished=false;
            speak(undefined);
            stepIn(0);
            sync();
        }

        function needsWrongTurnFinish(){
            return scene==='alley'&&pose==='wrong-turn'&&['activity','walk','turn'].includes(currentPhase)&&
                (sheet!=='idle'||Math.hypot(currentPosition[0]-anchor[0],currentPosition[1]-anchor[1])>.005);
        }

        function finishWrongTurn(done){
            const wrongFrom=currentPosition.slice();
            const wrongDistance=Math.hypot(wrongFrom[0]-anchor[0],wrongFrom[1]-anchor[1]);
            const wrongFlip=wrongFrom[0]>anchor[0];
            const wrongStart=sheet==='walk'?(actor.hasAttribute('data-flip')===wrongFlip?10:0):5;
            entrance={wrongTurnFinish:true,wrongFrom,wrongDistance,wrongFlip,wrongStart,pending:done};
            start=pausedAt=undefined;
            bitFinished=false;
            speak(undefined);
            stepIn(0);
            sync();
        }

        function needsTapeCleanup(){
            return scene==='pack'&&pose==='stuck-tape'&&currentPhase==='activity'&&!bitFinished&&
                (sheet==='stuck-tape'&&lastFrame>0||sheet==='tape-cleanup');
        }

        function finishTape(done){
            const tapeOffset=sheet==='tape-cleanup'?lastFrame/4*2.1:0;
            const tapeStartFrame=sheet==='stuck-tape'?lastFrame:null;
            entrance={tapeCleanup:true,tapeOffset,tapeStartFrame,pending:done};
            start=pausedAt=undefined;
            speak(undefined);
            stepIn(0);
            sync();
        }

        function playRagPickup(elapsed){
            if(elapsed<.8){
                position(...anchor,'prepare');
                onTableProp?.('rag',true);
                paint('rag-lower-arm',3-Math.min(3,Math.floor(elapsed/.2)),0);
                return true;
            }
            if(elapsed<2){
                position(...anchor,'prepare');
                onTableProp?.('rag',false);
                paint('rag-crown-transfer',Math.min(3,Math.floor((elapsed-.8)/.3)),0);
                return true;
            }
            arrive();
            return false;
        }

        function returnRag(done){
            entrance={ragReturning:true,ragFinishFrame:sheet==='rag-crown'?lastFrame:0,pending:done};
            start=pausedAt=undefined;
            bitFinished=false;
            speak(undefined);
            stepIn(0);
            sync();
        }

        function returnChopsticks(done){
            entrance={chopsticksReturning:true,pending:done};
            start=pausedAt=undefined;
            bitFinished=false;
            speak(undefined);
            stepIn(0);
            sync();
        }

        function returnDumbbell(done){
            entrance={dumbbellReturning:true,dumbbellFinishFrame:sheet==='dumbbell-brag'?lastFrame:0,pending:done};
            start=pausedAt=undefined;
            bitFinished=false;
            speak(undefined);
            stepIn(0);
            sync();
        }

        function returnAlarm(done){
            entrance={alarmReturning:true,alarmFinishFrame:sheet==='alarm-hush'?lastFrame:0,pending:done};
            start=pausedAt=undefined;
            bitFinished=false;
            speak(undefined);
            stepIn(0);
            sync();
        }

        function returnBathCap(done){
            entrance={bathCapReturning:true,bathCapFrame:sheet==='shower-cap'?lastFrame:0,pending:done};
            start=pausedAt=undefined;
            bitFinished=false;
            speak(undefined);
            stepIn(0);
            sync();
        }

        function returnBathBrush(done){
            entrance={bathBrushReturning:true,brushFinishFrame:sheet==='toothbrush-guitar'?lastFrame:0,pending:done};
            start=pausedAt=undefined;
            bitFinished=false;
            speak(undefined);
            stepIn(0);
            sync();
        }

        function returnSpoon(done){
            entrance={spoonReturning:true,spoonJourney:true,spoonFinishFrame:sheet==='spoon-concert'?lastFrame:0,spoonTrip:makeSpoonTrip(currentPosition,spoonTable),pending:done};
            start=pausedAt=undefined;
            bitFinished=false;
            speak(undefined);
            stepIn(0);
            sync();
        }

        function needsUmbrellaClose(){
            return scene==='alley'&&pose==='umbrella-flip'&&currentPhase==='activity'&&sheet==='umbrella-flip'&&
                (lastFrame>0||Math.abs(Number(lastLean)||0)>.01);
        }

        function closeUmbrella(done){
            entrance={umbrellaClose:true,umbrellaFrame:lastFrame,umbrellaLean:Number(lastLean)||0,pending:done};
            start=pausedAt=undefined;
            bitFinished=false;
            speak(undefined);
            stepIn(0);
            sync();
        }

        function returnUmbrella(done){
            entrance={umbrellaReturning:true,pending:done};
            start=pausedAt=undefined;
            bitFinished=false;
            speak(undefined);
            stepIn(0);
            sync();
        }

        function returnGroceries(done){
            entrance={groceriesReturning:true,groceriesFrame:sheet==='grocery-transfer'?lastFrame:3,
                groceriesLean:Number(lastLean)||0,groceriesLift:lastLift||0,pending:done};
            start=pausedAt=undefined;
            bitFinished=false;
            speak(undefined);
            stepIn(0);
            sync();
        }

        function returnReceipt(done){
            entrance={receiptReturning:true,receiptFrame:sheet==='receipt-transfer'?lastFrame:1,pending:done};
            start=pausedAt=undefined;
            bitFinished=false;
            speak(undefined);
            stepIn(0);
            sync();
        }

        function needsTidyRelease(){
            return scene==='home'&&pose==='tidy'&&currentPhase==='activity'&&sheet==='tidy';
        }

        function releaseTidy(done){
            entrance={tidyRelease:true,pending:done};
            start=pausedAt=undefined;
            speak(undefined);
            stepIn(0);
            sync();
        }

        function needsSoapCleanup(){
            return scene==='bathroom'&&pose==='soap-moustache'&&currentPhase==='activity'&&sheet===pose&&lastFrame>0;
        }

        function needsSalesFinish(){
            return scene==='stall'&&pose==='sales-bow'&&currentPhase==='activity'&&sheet===pose&&lastFrame>0;
        }

        function needsHeroFinish(){
            return scene==='stall'&&pose==='comic-hero'&&currentPhase==='activity'&&sheet===pose&&lastFrame>0;
        }

        function finishHero(done){
            entrance={heroFinish:true,heroFrame:lastFrame,pending:done};
            start=pausedAt=undefined;
            bitFinished=false;
            speak(undefined);
            stepIn(0);
            sync();
        }

        function needsPhotoFinish(){
            return scene==='secondhand'&&photoBits.has(pose)&&currentPhase==='activity'&&sheet===pose&&lastFrame>0;
        }

        function needsFortuneFinish(){
            return scene==='fortune'&&fortuneBits.has(pose)&&currentPhase==='activity'&&sheet===pose&&lastFrame>0;
        }

        function finishFortune(done){
            entrance={fortuneFinish:true,fortuneFrame:lastFrame,pending:done};
            start=pausedAt=undefined;
            bitFinished=false;
            speak(undefined);
            stepIn(0);
            sync();
        }

        function needsWobbleFinish(){
            return scene==='home'&&pose==='wobble'&&currentPhase==='activity'&&sheet===pose&&lastFrame>0;
        }

        function needsExerciseFinish(){
            return scene==='home'&&pose==='exercise'&&currentPhase==='activity'&&sheet==='exercise'&&lastFrame>0&&lastFrame<=13;
        }

        function finishExercise(done){
            const exerciseFrames=reviewed.exercise.filter(frame=>frame<=lastFrame).reverse();
            entrance={exerciseFinish:true,exerciseFrames,pending:done};
            start=pausedAt=undefined;
            speak(undefined);
            stepIn(0);
            sync();
        }

        function finishWobble(done){
            entrance={wobbleFinish:true,wobbleFrame:lastFrame,pending:done};
            start=pausedAt=undefined;
            bitFinished=false;
            speak(undefined);
            stepIn(0);
            sync();
        }

        function finishPhoto(done){
            entrance={photoFinish:true,photoFrame:lastFrame,pending:done};
            start=pausedAt=undefined;
            bitFinished=false;
            speak(undefined);
            stepIn(0);
            sync();
        }

        function finishSales(done){
            entrance={salesFinish:true,salesFrame:lastFrame,pending:done};
            start=pausedAt=undefined;
            bitFinished=false;
            speak(undefined);
            stepIn(0);
            sync();
        }

        function cleanupSoap(done){
            entrance={soapCleanup:true,soapFrame:lastFrame,pending:done};
            start=pausedAt=undefined;
            bitFinished=false;
            speak(undefined);
            stepIn(0);
            sync();
        }

        function needsFoodFinish(){
            return scene==='noodle'&&foodBits.has(pose)&&currentPhase==='activity'&&sheet===pose&&
                (lastFrame>0||Math.abs(Number(lastLean)||0)>.01||Math.abs(lastLift||0)>.01);
        }

        function needsHomePropFinish(){
            return (scene==='home'&&['seated-tea','seated-read','seated-ledger','seated-noodle'].includes(pose)||
                scene==='noodle'&&pose==='seated-noodle')&&
                currentPhase==='activity'&&sheet===pose&&lastFrame>0;
        }

        function finishHomeProp(done){
            entrance={homePropFinish:true,homePropPose:pose,homePropFrame:lastFrame,pending:done};
            start=pausedAt=undefined;
            speak(undefined);
            stepIn(0);
            sync();
        }

        function finishFood(done){
            entrance={foodFinish:true,foodFrame:lastFrame,foodPose:pose,foodLean:Number(lastLean)||0,foodLift:lastLift||0,pending:done};
            start=pausedAt=undefined;
            bitFinished=false;
            speak(undefined);
            stepIn(0);
            sync();
        }

        function walkOut(fromScene,approach,done,fallback){
            if(finishingMotion()&&enabled&&!reducedMotion.matches&&!document.hidden){
                entrance.pending=()=>walkOut(fromScene,approach,done,fallback);
                return;
            }
            if(needsHomePropFinish()&&enabled&&!reducedMotion.matches&&!document.hidden){
                finishHomeProp(()=>walkOut(fromScene,approach,done,fallback));
                return;
            }
            if(needsTidyRelease()&&enabled&&!reducedMotion.matches&&!document.hidden){
                releaseTidy(()=>walkOut(fromScene,approach,done,fallback));
                return;
            }
            if(needsPileFinish()&&enabled&&!reducedMotion.matches&&!document.hidden){
                finishPile(()=>walkOut(fromScene,approach,done,fallback));
                return;
            }
            if(needsParcelCheckFinish()&&enabled&&!reducedMotion.matches&&!document.hidden){
                finishParcelCheck(()=>walkOut(fromScene,approach,done,fallback));
                return;
            }
            if(needsStampFinish()&&enabled&&!reducedMotion.matches&&!document.hidden){
                finishStamp(()=>walkOut(fromScene,approach,done,fallback));
                return;
            }
            if(needsLeafFinish()&&enabled&&!reducedMotion.matches&&!document.hidden){
                finishLeaf(()=>walkOut(fromScene,approach,done,fallback));
                return;
            }
            if(needsWrongTurnFinish()&&enabled&&!reducedMotion.matches&&!document.hidden){
                finishWrongTurn(()=>walkOut(fromScene,approach,done,fallback));
                return;
            }
            if(needsTapeCleanup()&&enabled&&!reducedMotion.matches&&!document.hidden){
                finishTape(()=>walkOut(fromScene,approach,done,fallback));
                return;
            }
            if(needsSoapCleanup()&&enabled&&!reducedMotion.matches&&!document.hidden){
                cleanupSoap(()=>walkOut(fromScene,approach,done,fallback));
                return;
            }
            if(needsSalesFinish()&&enabled&&!reducedMotion.matches&&!document.hidden){
                finishSales(()=>walkOut(fromScene,approach,done,fallback));
                return;
            }
            if(needsHeroFinish()&&enabled&&!reducedMotion.matches&&!document.hidden){
                finishHero(()=>walkOut(fromScene,approach,done,fallback));
                return;
            }
            if(needsPhotoFinish()&&enabled&&!reducedMotion.matches&&!document.hidden){
                finishPhoto(()=>walkOut(fromScene,approach,done,fallback));
                return;
            }
            if(needsFortuneFinish()&&enabled&&!reducedMotion.matches&&!document.hidden){
                finishFortune(()=>walkOut(fromScene,approach,done,fallback));
                return;
            }
            if(needsWobbleFinish()&&enabled&&!reducedMotion.matches&&!document.hidden){
                finishWobble(()=>walkOut(fromScene,approach,done,fallback));
                return;
            }
            if(needsExerciseFinish()&&enabled&&!reducedMotion.matches&&!document.hidden){
                finishExercise(()=>walkOut(fromScene,approach,done,fallback));
                return;
            }
            if(fromScene==='bathroom'&&pose==='shower-cap'&&bathCapHeld&&currentPhase==='activity'&&enabled&&!reducedMotion.matches&&!document.hidden){
                returnBathCap(()=>walkOut(fromScene,approach,done,fallback));
                return;
            }
            if(fromScene==='bathroom'&&pose==='toothbrush-guitar'&&bathBrushHeld&&currentPhase==='activity'&&enabled&&!reducedMotion.matches&&!document.hidden){
                returnBathBrush(()=>walkOut(fromScene,approach,done,fallback));
                return;
            }
            if(needsFoodFinish()&&enabled&&!reducedMotion.matches&&!document.hidden){
                finishFood(()=>walkOut(fromScene,approach,done,fallback));
                return;
            }
            if(needsUmbrellaClose()&&enabled&&!reducedMotion.matches&&!document.hidden){
                closeUmbrella(()=>walkOut(fromScene,approach,done,fallback));
                return;
            }
            if(fromScene==='alley'&&pose==='umbrella-flip'&&umbrellaHeld&&currentPhase==='activity'&&enabled&&!reducedMotion.matches&&!document.hidden){
                returnUmbrella(()=>walkOut(fromScene,approach,done,fallback));
                return;
            }
            if(fromScene==='alley'&&pose==='guard-groceries'&&groceriesHeld&&currentPhase==='activity'&&enabled&&!reducedMotion.matches&&!document.hidden){
                returnGroceries(()=>walkOut(fromScene,approach,done,fallback));
                return;
            }
            if(fromScene==='home'&&pose==='rag-crown'&&ragHeld&&currentPhase==='activity'&&enabled&&!reducedMotion.matches&&!document.hidden){
                returnRag(()=>walkOut(fromScene,approach,done,fallback));
                return;
            }
            if(fromScene==='noodle'&&pose==='uneven-chopsticks'&&chopsticksHeld&&currentPhase==='activity'&&enabled&&!reducedMotion.matches&&!document.hidden){
                returnChopsticks(()=>walkOut(fromScene,approach,done,fallback));
                return;
            }
            if(fromScene==='home'&&pose==='dumbbell-brag'&&dumbbellHeld&&currentPhase==='activity'&&enabled&&!reducedMotion.matches&&!document.hidden){
                returnDumbbell(()=>walkOut(fromScene,approach,done,fallback));
                return;
            }
            if(fromScene==='home'&&pose==='alarm-hush'&&alarmHeld&&currentPhase==='activity'&&enabled&&!reducedMotion.matches&&!document.hidden){
                returnAlarm(()=>walkOut(fromScene,approach,done,fallback));
                return;
            }
            if(fromScene==='home'&&pose==='receipt-shock'&&receiptHeld&&currentPhase==='activity'&&enabled&&!reducedMotion.matches&&!document.hidden){
                returnReceipt(()=>walkOut(fromScene,approach,done,fallback));
                return;
            }
            if(fromScene==='home'&&pose==='spoon-concert'&&spoonHeld&&currentPhase==='activity'&&enabled&&!reducedMotion.matches&&!document.hidden){
                returnSpoon(()=>walkOut(fromScene,approach,done,fallback));
                return;
            }
            if(fromScene==='noodle'&&foodBits.has(pose)&&currentPhase==='activity'){
                returningBowl(()=>walkOut(fromScene,approach,done,fallback));
                return;
            }
            if(fromScene==='noodle'&&pose==='noodle-pickup'&&currentPhase==='activity'){
                returningBowl(()=>walkOut(fromScene,approach,done,fallback));
                return;
            }
            if(fromScene==='noodle'&&pose==='seated-noodle'&&currentPhase==='activity'&&enabled&&!reducedMotion.matches&&!document.hidden){
                returningBowl(()=>walkOut(fromScene,approach,done,fallback));
                return;
            }
            if(fromScene==='pack'&&['parcel-pile','backward-stamp'].includes(pose)&&currentPhase==='activity'){
                returningParcel(()=>walkOut(fromScene,approach,done,fallback));
                return;
            }
            const wasAsleep=pose==='sleep'&&currentPhase==='sleep';
            const startAt=wasAsleep?bed.floor:currentPosition??fallback;
            if(!startAt){done();return;}
            const releaseProp=tableProps[pose]&&currentPhase==='activity'?{at:startAt,prop:propFor(pose,scene)}:undefined;
            const releaseMain=fromScene==='pack'&&singleParcel.has(pose)&&currentPhase==='activity'?startAt:undefined;
            if(fromScene==='home'&&pose==='tidy') onTableProp?.('rag',true);
            const from=seat&&currentPhase==='activity'?seat.at:startAt;
            const linkedDoor=typeof approach==='function';
            let target,corridor;
            if(linkedDoor){
                const pathToDoor=approach(from);
                target=pathToDoor.at(-1);
                corridor=pathToDoor.slice(0,-1);
            }else{
                const [door,...floor]=(seat?.approach??approach);
                corridor=floor.reverse().filter(([x])=>door[0]<from[0]?x<from[0]:x>from[0]);
                if(fromScene==='home'&&from[0]>38) corridor.unshift([from[0],Math.max(81,from[1])]);
                if(fromScene==='bathroom'&&from[0]>54) corridor.unshift([from[0],97],[27,97]);
                target=[...door,from[2]*.9];
            }
            const waypoints=[from,...corridor];
            const path=route(waypoints,target);
            const cycles=Math.max(1,Math.round(path.length/(from[2]*.65)));
            const duration=cycles*.73+.17;
            const bathroomDoor=fromScene==='bathroom'?bathroomDoorTiming(path,duration,waypoints,true):undefined;
            const turnBeforeWalk=releaseMain?{flip:path.flip,frame:3,towardSame:true,duration:.22}:
                planTurnBeforeWalk(path.flip);
            if(wasAsleep) onBedFrame(false);
            pose='walk';
            scene=fromScene;
            anchor=target;
            seat=undefined;
            bit=undefined;
            bitFinished=false;
            speak(undefined);
            start=pausedAt=undefined;
            actor.hidden=false;
            actor.dataset.pose=pose;
            entrance={path,cycles,duration,releaseProp,releaseMain,fromHeight:from[2],onExit:done,turnBeforeWalk,linkedDoor,bathroomDoor};
            stepIn(0);
            sync();
        }

        function walkStreet(points,done){
            if(finishingMotion()&&enabled&&!reducedMotion.matches&&!document.hidden){
                entrance.pending=()=>walkStreet(points,done);
                return;
            }
            if(needsLeafFinish()&&enabled&&!reducedMotion.matches&&!document.hidden){
                finishLeaf(()=>walkStreet(points,done));
                return;
            }
            if(needsWrongTurnFinish()&&enabled&&!reducedMotion.matches&&!document.hidden){
                finishWrongTurn(()=>walkStreet([currentPosition,...points.slice(1)],done));
                return;
            }
            if(needsUmbrellaClose()&&enabled&&!reducedMotion.matches&&!document.hidden){
                closeUmbrella(()=>walkStreet(points,done));
                return;
            }
            if(scene==='alley'&&pose==='umbrella-flip'&&umbrellaHeld&&currentPhase==='activity'&&enabled&&!reducedMotion.matches&&!document.hidden){
                returnUmbrella(()=>walkStreet(points,done));
                return;
            }
            if(scene==='alley'&&pose==='guard-groceries'&&groceriesHeld&&currentPhase==='activity'&&enabled&&!reducedMotion.matches&&!document.hidden){
                returnGroceries(()=>walkStreet(points,done));
                return;
            }
            const target=points.at(-1);
            const path=route(points.slice(0,-1),target,true);
            const cycles=Math.max(1,Math.round(path.length/6.2));
            const first=path.sample(0),ahead=path.sample(.002);
            const dx=(ahead[0]-first[0])*PanpanStreet.width;
            const dy=(ahead[1]-first[1])*PanpanStreet.height;
            const firstFlip=Math.abs(dx)<Math.abs(dy)*.6?path.flip:dx<0;
            const turnBeforeWalk=planTurnBeforeWalk(firstFlip);
            pose='walk';
            scene='alley';
            anchor=target;
            seat=bit=undefined;
            bitFinished=false;
            speak(undefined);
            start=pausedAt=undefined;
            actor.hidden=false;
            actor.dataset.pose=pose;
            entrance={path,cycles,duration:Math.min(9,Math.max(.75,path.length*.088)),onStreet:true,onExit:done,
                turnBeforeWalk,streetFacing:firstFlip};
            stepIn(0);
            sync();
        }

        reducedMotion.addEventListener('change',sync);
        document.addEventListener('visibilitychange',sync);
        const api={
            walkOut,
            walkStreet,
            setEnabled(value){
                enabled = value;
                sync();
            },
            show(next,{restart=false}={}){
                const samePose=next?.pose===pose&&next?.scene===scene&&next?.anchor===anchor&&next?.bit===bit;
                if(samePose&&(!restart||pose==='sleep')){
                    if(entrance?.ragReturning||entrance?.chopsticksReturning||entrance?.dumbbellReturning||entrance?.alarmReturning||entrance?.bathCapReturning||entrance?.bathBrushReturning||entrance?.spoonReturning||entrance?.umbrellaReturning||entrance?.groceriesReturning||entrance?.receiptReturning){
                        entrance.pending=()=>api.show(next,{restart:true});
                        return;
                    }
                    if(finishingMotion()) delete entrance.pending;
                    return;
                }
                if(next?.scene===scene&&finishingMotion()&&enabled&&!reducedMotion.matches&&!document.hidden){
                    entrance.pending=()=>api.show(next,{restart});
                    return;
                }
                if(next?.scene===scene&&needsHomePropFinish()&&enabled&&!reducedMotion.matches&&!document.hidden){
                    finishHomeProp(()=>api.show(next,{restart}));
                    return;
                }
                if(next?.scene===scene&&needsTidyRelease()&&enabled&&!reducedMotion.matches&&!document.hidden){
                    releaseTidy(()=>api.show(next,{restart}));
                    return;
                }
                if(next?.scene===scene&&needsPileFinish()&&enabled&&!reducedMotion.matches&&!document.hidden){
                    finishPile(()=>api.show(next,{restart}));
                    return;
                }
                if(next?.scene===scene&&needsParcelCheckFinish()&&enabled&&!reducedMotion.matches&&!document.hidden){
                    finishParcelCheck(()=>api.show(next,{restart}));
                    return;
                }
                if(next?.scene===scene&&needsStampFinish()&&enabled&&!reducedMotion.matches&&!document.hidden){
                    finishStamp(()=>api.show(next,{restart}));
                    return;
                }
                if(next?.scene===scene&&needsLeafFinish()&&enabled&&!reducedMotion.matches&&!document.hidden){
                    finishLeaf(()=>api.show(next,{restart}));
                    return;
                }
                if(next?.scene===scene&&needsWrongTurnFinish()&&enabled&&!reducedMotion.matches&&!document.hidden){
                    finishWrongTurn(()=>api.show(next,{restart}));
                    return;
                }
                if(next?.scene===scene&&needsTapeCleanup()&&enabled&&!reducedMotion.matches&&!document.hidden){
                    finishTape(()=>api.show(next,{restart}));
                    return;
                }
                if(next?.scene===scene&&needsSoapCleanup()&&enabled&&!reducedMotion.matches&&!document.hidden){
                    cleanupSoap(()=>api.show(next,{restart}));
                    return;
                }
                if(next?.scene===scene&&needsSalesFinish()&&enabled&&!reducedMotion.matches&&!document.hidden){
                    finishSales(()=>api.show(next,{restart}));
                    return;
                }
                if(next?.scene===scene&&needsHeroFinish()&&enabled&&!reducedMotion.matches&&!document.hidden){
                    finishHero(()=>api.show(next,{restart}));
                    return;
                }
                if(next?.scene===scene&&needsPhotoFinish()&&enabled&&!reducedMotion.matches&&!document.hidden){
                    finishPhoto(()=>api.show(next,{restart}));
                    return;
                }
                if(next?.scene===scene&&needsFortuneFinish()&&enabled&&!reducedMotion.matches&&!document.hidden){
                    finishFortune(()=>api.show(next,{restart}));
                    return;
                }
                if(next?.scene===scene&&needsWobbleFinish()&&enabled&&!reducedMotion.matches&&!document.hidden){
                    finishWobble(()=>api.show(next,{restart}));
                    return;
                }
                if(next?.scene===scene&&needsExerciseFinish()&&enabled&&!reducedMotion.matches&&!document.hidden){
                    finishExercise(()=>api.show(next,{restart}));
                    return;
                }
                if(next?.scene===scene&&scene==='bathroom'&&pose==='shower-cap'&&bathCapHeld&&currentPhase==='activity'&&enabled&&!reducedMotion.matches&&!document.hidden){
                    returnBathCap(()=>api.show(next,{restart}));
                    return;
                }
                if(next?.scene===scene&&scene==='bathroom'&&pose==='toothbrush-guitar'&&bathBrushHeld&&currentPhase==='activity'&&enabled&&!reducedMotion.matches&&!document.hidden){
                    returnBathBrush(()=>api.show(next,{restart}));
                    return;
                }
                if(next?.scene===scene&&needsFoodFinish()&&enabled&&!reducedMotion.matches&&!document.hidden){
                    finishFood(()=>api.show(next,{restart}));
                    return;
                }
                if(next?.scene===scene&&needsUmbrellaClose()&&enabled&&!reducedMotion.matches&&!document.hidden){
                    closeUmbrella(()=>api.show(next,{restart}));
                    return;
                }
                if(next?.scene===scene&&scene==='alley'&&pose==='umbrella-flip'&&umbrellaHeld&&currentPhase==='activity'&&enabled&&!reducedMotion.matches&&!document.hidden){
                    returnUmbrella(()=>api.show(next,{restart}));
                    return;
                }
                if(next?.scene===scene&&scene==='alley'&&pose==='guard-groceries'&&groceriesHeld&&currentPhase==='activity'&&enabled&&!reducedMotion.matches&&!document.hidden){
                    returnGroceries(()=>api.show(next,{restart}));
                    return;
                }
                if(next?.scene===scene&&scene==='home'&&pose==='rag-crown'&&ragHeld&&currentPhase==='activity'&&enabled&&!reducedMotion.matches&&!document.hidden){
                    returnRag(()=>api.show(next,{restart}));
                    return;
                }
                if(next?.scene===scene&&scene==='noodle'&&pose==='uneven-chopsticks'&&chopsticksHeld&&currentPhase==='activity'&&enabled&&!reducedMotion.matches&&!document.hidden){
                    returnChopsticks(()=>api.show(next,{restart}));
                    return;
                }
                if(next?.scene===scene&&scene==='home'&&pose==='dumbbell-brag'&&dumbbellHeld&&currentPhase==='activity'&&enabled&&!reducedMotion.matches&&!document.hidden){
                    returnDumbbell(()=>api.show(next,{restart}));
                    return;
                }
                if(next?.scene===scene&&scene==='home'&&pose==='alarm-hush'&&alarmHeld&&currentPhase==='activity'&&enabled&&!reducedMotion.matches&&!document.hidden){
                    returnAlarm(()=>api.show(next,{restart}));
                    return;
                }
                if(next?.scene===scene&&scene==='home'&&pose==='receipt-shock'&&receiptHeld&&currentPhase==='activity'&&enabled&&!reducedMotion.matches&&!document.hidden){
                    returnReceipt(()=>api.show(next,{restart}));
                    return;
                }
                if(next?.scene===scene&&scene==='home'&&pose==='spoon-concert'&&spoonHeld&&currentPhase==='activity'&&enabled&&!reducedMotion.matches&&!document.hidden){
                    returnSpoon(()=>api.show(next,{restart}));
                    return;
                }
                if(scene==='noodle'&&(pose==='noodle-pickup'||pose==='noodle-putdown')&&entrance&&
                    next?.scene==='noodle'&&next.pose!==pose){
                    entrance.pending=()=>api.show(next,{restart});
                    return;
                }
                if(next?.scene==='noodle'&&foodBits.has(next.pose)&&enabled&&!reducedMotion.matches&&!document.hidden){
                    if(scene==='noodle'&&pose==='seated-noodle'&&entrance&&currentPhase!=='activity'){
                        entrance.pending=()=>api.show(next,{restart});
                        return;
                    }
                    if(scene!=='noodle'||pose!=='seated-noodle'&&pose!=='noodle-pickup'&&!foodBits.has(pose)){
                        transferBowl(false,()=>api.show(next,{restart}));
                        return;
                    }
                }
                if(next?.scene==='noodle'&&next.pose==='seated-noodle'&&bowlOnStool&&
                    scene==='noodle'&&pose!=='noodle-pickup'&&enabled&&!reducedMotion.matches&&!document.hidden){
                    transferBowl(false,()=>api.show(next,{restart}));
                    return;
                }
                if(next?.scene===scene&&scene==='noodle'&&pose==='noodle-pickup'&&currentPhase==='activity'&&
                    next.pose!=='noodle-putdown'&&next.pose!=='seated-noodle'&&!foodBits.has(next.pose)){
                    returningBowl(()=>api.show(next,{restart}));
                    return;
                }
                if(next?.scene===scene&&scene==='noodle'&&foodBits.has(pose)&&currentPhase==='activity'&&
                    next.pose!=='seated-noodle'&&next.pose!=='noodle-putdown'&&!foodBits.has(next.pose)){
                    returningBowl(()=>api.show(next,{restart}));
                    return;
                }
                if(next?.scene===scene&&scene==='noodle'&&pose==='seated-noodle'&&currentPhase==='activity'&&
                    next.pose!=='seated-noodle'&&next.pose!=='noodle-putdown'&&!foodBits.has(next.pose)&&
                    enabled&&!reducedMotion.matches&&!document.hidden){
                    returningBowl(()=>api.show(next,{restart}));
                    return;
                }
                if(next?.scene===scene&&scene==='pack'&&['parcel-pile','backward-stamp'].includes(pose)&&currentPhase==='activity'&&next.pose!=='parcel'){
                    returningParcel(()=>api.show(next,{restart}));
                    return;
                }
                const wasAsleep=pose==='sleep'&&currentPhase==='sleep';
                const previousStationaryGesture=stationaryGestures[scene]?.has(pose)&&currentPhase==='activity';
                if(scene==='home'&&pose==='tidy'&&next?.pose!=='tidy') onTableProp?.('rag',true);
                if(pose==='rag-crown'&&next?.pose!=='rag-crown') ragHeld=false;
                if(pose==='uneven-chopsticks'&&next?.pose!=='uneven-chopsticks') chopsticksHeld=false;
                if(pose==='dumbbell-brag'&&next?.pose!=='dumbbell-brag') dumbbellHeld=false;
                if(pose==='alarm-hush'&&next?.pose!=='alarm-hush') alarmHeld=false;
                if(pose==='shower-cap'&&next?.pose!=='shower-cap') bathCapHeld=false;
                if(pose==='toothbrush-guitar'&&next?.pose!=='toothbrush-guitar') bathBrushHeld=false;
                if(pose==='spoon-concert'&&next?.pose!=='spoon-concert') spoonHeld=false;
                if(pose==='umbrella-flip'&&next?.pose!=='umbrella-flip') umbrellaHeld=false;
                if(pose==='guard-groceries'&&next?.pose!=='guard-groceries') groceriesHeld=false;
                if(pose==='receipt-shock'&&next?.pose!=='receipt-shock') receiptHeld=false;
                const leavingBed=wasAsleep&&next?.scene==='home'&&next.pose!=='sleep';
                const movingWithinScene=!leavingBed&&pose&&next?.scene===scene&&currentPosition;
                const hadParcel=Boolean(movingWithinScene&&scene==='pack'&&currentPhase==='activity'&&
                    (singleParcel.has(pose)||pose==='parcel-pile'));
                const needParcel=Boolean(next?.scene==='pack'&&(singleParcel.has(next.pose)||next.pose==='parcel-pile')&&!hadParcel);
                const stacking=movingWithinScene&&scene==='pack'&&currentPhase==='activity'&&
                    (singleParcel.has(pose)&&next.pose==='parcel-pile'||pose==='parcel-pile'&&next.pose==='parcel');
                const stackReverse=pose==='parcel-pile';
                const tooling=movingWithinScene&&scene==='pack'&&currentPhase==='activity'&&
                    (singleParcel.has(pose)&&pose!=='backward-stamp'&&next.pose==='backward-stamp'||
                        pose==='backward-stamp'&&next.pose==='parcel');
                const toolReverse=pose==='backward-stamp';
                const wasSeated=seat&&(currentPhase==='sit'||currentPhase==='activity');
                const staySeated=movingWithinScene&&wasSeated&&next.seat===seat&&currentPhase==='activity'&&pose!=='gaming'&&next.pose!=='gaming';
                const carryBowl=Boolean(movingWithinScene&&scene==='noodle'&&
                    (pose==='noodle-pickup'&&(foodBits.has(next.pose)||next.pose==='seated-noodle'||next.pose==='noodle-putdown')||
                        pose==='seated-noodle'&&(foodBits.has(next.pose)||next.pose==='noodle-putdown')||foodBits.has(pose)&&
                        (next.pose==='seated-noodle'||next.pose==='noodle-putdown'||foodBits.has(next.pose))));
                const releaseProp=movingWithinScene&&wasSeated&&tableProps[pose]&&currentPhase==='activity'&&!carryBowl?{at:currentPosition,prop:propFor(pose,scene)}:undefined;
                const from=leavingBed?bed.floor:movingWithinScene?(wasSeated&&!staySeated?seat.at:currentPosition):undefined;
                if(wasAsleep) onBedFrame(false);
                pose=next?.pose;
                if(pose!=='sleep') onBedFrame(false);
                scene=next?.scene;
                anchor=next?.anchor;
                seat=next?.seat;
                bit=next?.bit;
                bitFinished=false;
                speak(undefined);
                start = undefined;
                pausedAt = undefined;
                actor.hidden = !pose;
                if(!pose){
                    entrance=undefined;
                    for(const prop of Object.values(tableProps)) onTableProp?.(prop.name,!prop.transient);
                    onTableProp?.('stackbox',true);
                    onTableProp?.('mainparcel',true);
                    onTableProp?.('stamp',true);
                    onTableProp?.('rag',true);
                    onTableProp?.('chopsticks',true);
                    onTableProp?.('dumbbell',true);
                    onTableProp?.('alarm',true);
                    onTableProp?.('bathcap',true);
                    onTableProp?.('bathbrush',true);
                    onTableProp?.('spoon',true);
                    onTableProp?.('umbrella',true);
                    onTableProp?.('groceries',true);
                    onTableProp?.('receipt',true);
                    ragHeld=false;
                    chopsticksHeld=false;
                    dumbbellHeld=false;
                    alarmHeld=false;
                    bathCapHeld=false;
                    bathBrushHeld=false;
                    spoonHeld=false;
                    umbrellaHeld=false;
                    groceriesHeld=false;
                    receiptHeld=false;
                    delete actor.dataset.pose;
                    delete actor.dataset.phase;
                    currentPosition=undefined;
                    onGameFrame?.(null);
                    sync();
                    return;
                }
                actor.dataset.pose = pose;
                if(next.still){
                    entrance=undefined;
                    arrive();
                    sync();
                    return;
                }
                if(pose==='seated-noodle'){
                    if(!carryBowl) onTableProp?.('bowl',true);
                    onTableProp?.('bowlstand',false);
                }
                if(pose==='sleep'&&!movingWithinScene&&!next.walkToBed){
                    cancelAnimationFrame(request);
                    request=0;
                    arrive();
                    return;
                }
                const target=pose==='spoon-concert'?spoonTable:seat?.at??anchor;
                const spoonTrip=pose==='spoon-concert'?makeSpoonTrip(spoonTable,anchor):undefined;
                if(stacking){
                    entrance={stackOnly:true,stackReverse};
                    if(enabled&&!reducedMotion.matches) stepIn(0);
                    sync();
                    return;
                }
                if(tooling){
                    entrance={toolOnly:true,toolReverse};
                    if(enabled&&!reducedMotion.matches) stepIn(0);
                    sync();
                    return;
                }
                if((pose==='noodle-pickup'||pose==='noodle-putdown')&&from?.every((value,index)=>value===target[index])){
                    entrance={bowlOnly:true};
                    if(enabled&&!reducedMotion.matches) stepIn(0);
                    sync();
                    return;
                }
                if(pose==='rag-crown'&&from?.every((value,index)=>value===target[index])){
                    entrance={ragOnly:true};
                    if(enabled&&!reducedMotion.matches) stepIn(0);
                    sync();
                    return;
                }
                if(pose==='uneven-chopsticks'&&from?.every((value,index)=>value===target[index])){
                    entrance={chopsticksOnly:true};
                    if(enabled&&!reducedMotion.matches) stepIn(0);
                    sync();
                    return;
                }
                if(pose==='dumbbell-brag'&&from?.every((value,index)=>value===target[index])){
                    entrance={dumbbellOnly:true};
                    if(enabled&&!reducedMotion.matches) stepIn(0);
                    sync();
                    return;
                }
                if(pose==='alarm-hush'&&from?.every((value,index)=>value===target[index])){
                    entrance={alarmOnly:true};
                    if(enabled&&!reducedMotion.matches) stepIn(0);
                    sync();
                    return;
                }
                if(pose==='shower-cap'&&from?.every((value,index)=>value===target[index])){
                    entrance={bathCapOnly:true};
                    if(enabled&&!reducedMotion.matches) stepIn(0);
                    sync();
                    return;
                }
                if(pose==='toothbrush-guitar'&&from?.every((value,index)=>value===target[index])){
                    entrance={bathBrushOnly:true};
                    if(enabled&&!reducedMotion.matches) stepIn(0);
                    sync();
                    return;
                }
                if(pose==='spoon-concert'&&from?.every((value,index)=>value===target[index])){
                    entrance={spoonOutbound:true,spoonJourney:true,spoonTrip};
                    if(enabled&&!reducedMotion.matches) stepIn(0);
                    sync();
                    return;
                }
                if(pose==='umbrella-flip'&&from?.every((value,index)=>value===target[index])){
                    entrance={umbrellaOnly:true};
                    if(enabled&&!reducedMotion.matches) stepIn(0);
                    sync();
                    return;
                }
                if(pose==='guard-groceries'&&from?.every((value,index)=>value===target[index])){
                    entrance={groceriesOnly:true};
                    if(enabled&&!reducedMotion.matches) stepIn(0);
                    sync();
                    return;
                }
                if(pose==='receipt-shock'&&from?.every((value,index)=>value===target[index])){
                    entrance={receiptOnly:true};
                    if(enabled&&!reducedMotion.matches) stepIn(0);
                    sync();
                    return;
                }
                if(staySeated&&(releaseProp||tableProps[pose])){
                    entrance={handoffOnly:true,releaseProp,takeProp:propFor(pose,scene)};
                    if(enabled&&!reducedMotion.matches) stepIn(0);
                    sync();
                    return;
                }
                const sameGestureSpot=previousStationaryGesture&&stationaryGestures[scene]&&
                    (pose==='idle'||stationaryGestures[scene].has(pose))&&
                    from&&Math.abs(from[0]-target[0])<.01&&Math.abs(from[1]-target[1])<.01;
                if(staySeated||sameGestureSpot||(!seat&&from?.every((value,index)=>value===target[index]))){
                    arrive();
                    sync();
                    return;
                }
                // The strip in front of the bed keeps both feet clear of the bed and stool.
                const throughRoom=scene==='home'&&(pose!=='sleep'||Math.abs(from?.[0]-target[0])>6);
                const aroundToilet=scene==='bathroom'&&(target[0]>54||from?.[0]>54);
                const onStreet=scene==='alley';
                const approach=next.entry??seat?.approach??next.approach;
                const corridorX=from?.[0]??approach?.at(-1)?.[0]??27;
                // An interrupted entrance still follows the floor edge around the slippers.
                const doorRemainder=scene==='home'&&from&&from[0]<27.5&&target[0]>27.5?
                    PanpanGame.scenes.home.approach.filter(([x])=>x>from[0]&&x<=27.5):[];
                const roomStart=doorRemainder.at(-1)??from;
                const waypoints=onStreet&&from?PanpanStreet.route(from,pose==='guard-groceries'?'home':'alley').slice(0,-1):
                    onStreet&&pose==='guard-groceries'?[...(next.approach??[]),...PanpanStreet.route('alley','home').slice(0,-1)]:
                    aroundToilet?[...(from?[from]:approach),[corridorX,97],[target[0],97]]:
                    from?(throughRoom?[from,...doorRemainder,[(roomStart[0]+target[0])/2,Math.max(77,roomStart[1],target[1])]]:[from]):approach;
                const path=route(waypoints,target,onStreet);
                const cycles=Math.max(1,Math.round(path.length/((seat?.at[2]??anchor[2])*.65)));
                const facesRight=pose==='tidy'||(pose.startsWith('seated-')&&pose!=='seated-noodle');
                const facing=bits[pose]||['idle','exercise','sleep'].includes(pose)?'front':facesRight?'right':'left';
                const turnSteps=pose==='gaming'?(path.flip?0:10):facing==='front'?5:(facing==='left')===path.flip?3:7;
                const turnTime=pose==='gaming'?(turnSteps ? .65 : 0):turnSteps===7?.64:turnSteps===5?.51:.38;
                const turnBeforeWalk=from?planTurnBeforeWalk(path.flip):undefined;
                const duration=cycles*.79+.20;
                const bathroomDoor=scene==='bathroom'&&!from&&waypoints[0]===bathroomDoorStops[0]?
                    bathroomDoorTiming(path,duration,waypoints,false):undefined;
                entrance={path,cycles,duration,turnSteps,turnTime,releaseProp,carryBowl,carryFromSeat:Boolean(carryBowl&&wasSeated),needParcel,onStreet,fromHeight:from?.[2]??target[2]*.92,
                    spoonJourney:pose==='spoon-concert',spoonTrip,turnBeforeWalk,bathroomDoor};
                if(enabled&&!reducedMotion.matches) stepIn(0);
                sync();
            },
        };
        return api;
    }

    return {create,gameJumps};
})();
