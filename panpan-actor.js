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

    function route(waypoints, anchor) {
        const points = [...waypoints,anchor];
        const distances = [{point:points[0],at:0}];
        for(let i=0;i<points.length-1;i++){
            const [a,b,c,d] = [points[Math.max(0,i-1)],points[i],points[i+1],points[Math.min(points.length-1,i+2)]];
            for(let j=1;j<=16;j++){
                const t=j/16;
                const point=b.slice(0,2).map((value,k)=>{
                    const from=(c[k]-a[k])*.42;
                    const to=(d[k]-b[k])*.42;
                    return mix(value,c[k],smooth(t))+t*(1-t)*((1-t)*from-t*to);
                });
                const previous=distances.at(-1);
                distances.push({point,at:previous.at+Math.hypot((point[0]-previous.point[0])*widthRatio,point[1]-previous.point[1])});
            }
        }
        const length=distances.at(-1).at;
        return {
            length,
            flip:points[0][0]>anchor[0],
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
    const bitDuration=6.2;
    const bitLeans={'rag-crown':-2,wobble:6,'stuck-tape':-3,'parcel-check':2.5,'hot-noodles':3,'long-noodle':-2,'cable-call':-4,'sales-bow':7,
        'leaf-salute':-3,'wrong-turn':5,'shower-cap':-3,'soap-moustache':-2,'receipt-shock':-6,'spoon-concert':4};
    const pulse=(time,at,span)=>{
        const progress=Math.min(1,Math.max(0,(time-at)/span));
        return Math.sin(progress*Math.PI)**2;
    };

    function create(actor, reducedMotion, onPosition, onGameFrame, onThought, onBitEnd, onBedFrame) {
        const {bed}=PanpanGame;
        const files=[...Object.keys(cues).filter(name=>name!=='tidy'&&name!=='gaming').map(name=>[name,`${name}-motion`,4]),
            ['gaming','gaming-desk-contact',2],
            ['tidy','tidy-clean',2],['walk','walk-clean',2],['turn','turn-clean',2],
            ['parcel-arrival','parcel-arrival',3],['cable-arrival','cable-arrival',3],
            ...Object.keys(bits).map(name=>[name,`${name}-bit`,2])];
        const sheets = Object.fromEntries(files.map(([name,file,rows]) => {
            const image = new Image();
            image.src = `/panpan-daily/assets/panpan-2d/${file}.webp`;
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
            actor.toggleAttribute('data-at-keyboard',name==='gaming');
            actor.toggleAttribute('data-key-press',name==='gaming'&&frame>=3);
            actor.toggleAttribute('data-wide-cel',name==='tidy');
            onGameFrame?.(name==='gaming'?gameTime:null);
        }

        function paintTurn(step,flip){
            const front=5;
            paint('turn',step>front?2*front-step:step,0,step>front?!flip:flip);
        }

        function position(x,y,height,phase) {
            currentPosition=[x,y,height];
            currentPhase=phase;
            actor.dataset.phase=phase;
            onPosition(x,y,height,phase);
        }

        function arrive(expressive=false) {
            entrance=undefined;
            start=undefined;
            if(pose==='sleep'){
                actor.hidden=true;
                onGameFrame?.(null);
                onBedFrame(true);
                position(...bed.pillow,'sleep');
            }else if(pose){
                position(...anchor,'activity');
                paint(pose,expressive&&bits[pose]?1:0,0);
            }
        }

        function stepIn(elapsed) {
            const {path,cycles,duration,turnSteps,turnTime,rise,fromHeight}=entrance;
            const walkingTime=elapsed-(rise?.duration??0);
            if(walkingTime<0){
                const t=smooth(elapsed/rise.duration);
                const at=rise.from.map((value,index)=>mix(value,rise.to[index],t));
                position(...at,'rise');
                if(t<.46) paint(rise.pose,0,0);
                else paintTurn(Math.round((1-t)*3),path.flip);
                return true;
            }
            if(walkingTime<duration){
                const u=walkingTime/duration;
                // Accelerate into the first step, then shorten the last few steps.
                const ramp=.12;
                const travel=u<ramp?u*u/(2*ramp*(1-ramp)) : u>1-ramp?1-(1-u)**2/(2*ramp*(1-ramp)) : (u-ramp/2)/(1-ramp);
                const [x,y]=path.sample(travel);
                const phase=travel*cycles;
                const lean=(path.flip?-1:1)*(1.1+Math.sin(phase*2*Math.PI)*.65)*Math.min(1,u*10,(1-u)*10);
                const height=seat?.at[2]??anchor[2];
                position(x,y,mix(fromHeight,height,travel),'walk');
                paint('walk',Math.round(phase*8)%8,lean,path.flip);
                return true;
            }
            if(pose==='sleep'||pose==='gaming'){
                arrive();
                return false;
            }
            const after=walkingTime-duration;
            if(after<turnTime){
                position(...(seat?.at??anchor),'turn');
                paintTurn(Math.round(smooth(after/turnTime)*turnSteps),path.flip);
                return true;
            }
            const prep=(after-turnTime)/.76;
            if(prep<1&&seat){
                const u=smooth(prep);
                const [x,y,height]=seat.at;
                const size=mix(height,anchor[2],u);
                const hipY=mix(y-height*.15,anchor[1]-anchor[2]*.15,u);
                position(mix(x,anchor[0],u),hipY+size*.15,size,'sit');
                if(prep<.43) paintTurn(turnSteps,path.flip);
                else paint(pose,0,0);
                return true;
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
            if(entrance&&stepIn((now-start)/1000)){
                request = requestAnimationFrame(animate);
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
                    lift=-3.7*pulse(time,beat-.1,.42)-2.2*pulse(time,beat+.55,.35);
                }
                if(pose==='stuck-tape') lean+=Math.sin((time-beat)*21)*3.5*pulse(time,beat-.27,.95);
                if(pose==='parcel-check'||pose==='sales-bow') lean+=4*pulse(time,beat+.24,.73);
                if(pose==='receipt-shock') lift=-5*pulse(time,beat-.17,.5);
                if(pose==='spoon-concert') lean+=5*Math.sin((time-beat)*8)*active;
                paint(pose,frame,lean,false,0,lift);
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
                else{
                    pausedAt=undefined;
                    arrive(true);
                    speak(bit?.thought);
                }
            }
        }

        reducedMotion.addEventListener('change',sync);
        document.addEventListener('visibilitychange',sync);
        return {
            setEnabled(value){
                enabled = value;
                sync();
            },
            show(next,{replay=false,fromBed=false}={}){
                const samePose=next?.pose===pose&&next?.scene===scene&&next?.anchor===anchor&&next?.bit===bit;
                if(samePose&&(!replay||pose==='sleep')) return;
                const wasAsleep=pose==='sleep'&&currentPhase==='sleep';
                const leavingBed=next?.scene==='home'&&next.pose!=='sleep'&&(wasAsleep||fromBed);
                const movingWithinScene=!replay&&!leavingBed&&pose&&next?.scene===scene&&currentPosition;
                const wasSeated=seat&&(currentPhase==='sit'||currentPhase==='activity');
                const staySeated=movingWithinScene&&wasSeated&&next.seat===seat&&currentPhase==='activity';
                const rise=movingWithinScene&&wasSeated&&!staySeated
                    ? {pose,from:currentPosition,to:seat.at,duration:.64} : undefined;
                const from=leavingBed?bed.floor:movingWithinScene?(rise?.to??currentPosition):undefined;
                if(wasAsleep) onBedFrame(false);
                pose=next?.pose;
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
                    delete actor.dataset.pose;
                    delete actor.dataset.phase;
                    currentPosition=undefined;
                    onGameFrame?.(null);
                    sync();
                    return;
                }
                actor.dataset.pose = pose;
                if(pose==='sleep'&&!movingWithinScene&&!next.walkToBed){
                    cancelAnimationFrame(request);
                    request=0;
                    arrive();
                    return;
                }
                const target=seat?.at??anchor;
                if(staySeated||(!rise&&!seat&&from?.every((value,index)=>value===target[index]))){
                    arrive();
                    sync();
                    return;
                }
                // The strip in front of the bed keeps both feet clear of the bed and stool.
                const throughRoom=scene==='home'&&(pose!=='sleep'||Math.abs(from?.[0]-target[0])>6);
                const waypoints=from?(throughRoom?[from,[(from[0]+target[0])/2,Math.max(77,from[1],target[1])]]:[from]):(seat?.approach??next.approach);
                const path=route(waypoints,target);
                const cycles=Math.max(1,Math.round(path.length/((seat?.at[2]??anchor[2])*.65)));
                const facesRight=pose==='tidy'||(pose.startsWith('seated-')&&pose!=='seated-noodle');
                const facing=bits[pose]||['idle','exercise','sleep'].includes(pose)?'front':facesRight?'right':'left';
                const turnSteps=facing==='front'?5:(facing==='left')===path.flip?3:7;
                entrance={path,cycles,duration:cycles*.79+.20,turnSteps,turnTime:turnSteps===7?.64:turnSteps===5?.51:.38,rise,fromHeight:from?.[2]??target[2]*.92};
                if(enabled&&!reducedMotion.matches) stepIn(0);
                sync();
            },
        };
    }

    return {create,gameJumps};
})();
