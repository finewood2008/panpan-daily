const PanpanAmbience = (() => {
    function create(alleyCanvas,alleyImage,roomCanvas,roomImage){
        const alley={
            ctx:alleyCanvas.getContext('2d'), image:alleyImage,
            width:AlleyAmbience.width,height:AlleyAmbience.height,
        };
        const room={
            ctx:roomCanvas.getContext('2d'),image:roomImage,
            width:InteriorEffects.width,height:InteriorEffects.height,
        };
        Object.assign(alleyCanvas,{width:alley.width,height:alley.height});
        Object.assign(roomCanvas,{width:room.width,height:room.height});
        const drawAlley=alley.ctx&&AlleyAmbience.create();
        const drawInterior=room.ctx&&InteriorEffects.create();
        const reduced=matchMedia('(prefers-reduced-motion: reduce)');
        let layer;
        let scene;
        let enabled=true;
        let frame=0;
        let lastTime=-Infinity;
        let time=0;
        let entry;
        let entryTime=0;
        let gameTime=null;

        const clear=surface=>surface?.ctx.clearRect(0,0,surface.width,surface.height);

        function draw(now){
            frame=requestAnimationFrame(draw);
            if(now-lastTime<30) return;
            if(Number.isFinite(lastTime)) time+=Math.min(now-lastTime,100)/1000;
            lastTime=now;
            const {ctx,image,width,height}=layer;
            clear(layer);
            if(!image.complete||image.naturalWidth!==width||image.naturalHeight!==height) return;
            const paint=scene.place==='alley'?drawAlley:drawInterior;
            paint(ctx,image,time,scene.place==='home'?{...scene,gameTime}:scene,entry,(time-entryTime));
        }

        function updatePlayback(){
            const running=layer&&enabled&&!reduced.matches&&!document.hidden;
            if(running&&!frame) frame=requestAnimationFrame(draw);
            if(!running&&frame){
                cancelAnimationFrame(frame);
                frame=0;
                lastTime=-Infinity;
                clear(layer);
            }
        }

        reduced.addEventListener('change',updatePlayback);
        document.addEventListener('visibilitychange',updatePlayback);
        return {
            setScene(next){
                const surface=next.place==='alley' ? (drawAlley?alley:null) : (drawInterior?room:null);
                if(scene?.place!==next.place||scene?.asleep!==next.asleep){
                    clear(layer);
                    time=0;
                    lastTime=-Infinity;
                }
                scene=next;
                layer=surface;
                updatePlayback();
            },
            setEnabled(value){
                enabled=value;
                updatePlayback();
            },
            setEntry(next){
                if(next===entry) return;
                entry=next;
                entryTime=time;
            },
            setGameFrame(next){
                gameTime=next;
            },
        };
    }

    return {create};
})();
