const InteriorEffects = (() => {
    const width=1672;
    const height=941;
    const {glow,createPatch,clip,steam,fan}=SceneEffects;
    const shelterEdges={
        pack:{
            open:[[[0,0],[80,0],[164,36],[204,131],[201,706],[230,722],[102,788],[0,821]]],
            runoff:[[173,68,157,761,.33],[202,76,198,735,.83]],
        },
        noodle:{
            open:[[[0,0],[181,0],[180,193],[108,234],[97,528],[134,559],[118,643],[136,748],[177,847],[206,941],[0,941]]],
            runoff:[[183,195,145,844,.28],[210,193,197,928,.78]],
        },
        stall:{
            open:[
                [[0,98],[53,92],[51,947],[0,947]],
                [[92,115],[301,148],[312,397],[152,542],[151,695],[91,741]],
                [[1261,188],[1346,153],[1433,113],[1567,68],[1566,536],[1413,570],[1353,451],[1266,432]],
                [[1606,64],[1672,36],[1672,898],[1608,923]],
            ],
            runoff:[[54,91,40,880,.13],[1398,136,1421,517,.49],[1607,83,1630,886,.82]],
        },
    };
    // Trace the inside edges of the actual panes. All panes share one exterior plate.
    const windowX=935;
    const glass=new Path2D(
        'M 48,0 L 142,0 L 142,39 L 45,30 Z '+
        'M 42,47 L 142,54 L 141,274 L 27,250 L 27,179 L 32,132 L 36,90 Z '+
        'M 158,0 L 249,0 L 248,295 L 155,276 Z '+
        'M 266,1 L 328,12 L 325,313 L 265,300 Z '+
        'M 344,15 L 489,41 L 486,350 L 340,320 Z '+
        'M 504,45 L 660,75 L 641,98 L 638,387 L 500,354 Z'
    );
    const fanOutline=new Path2D(
        'M 336,339 C 336,294 358,262 390,260 C 431,256 468,286 475,326 C 482,367 461,405 426,408 C 383,413 345,388 336,339 Z'
    );
    fanOutline.rect(0,0,width,height);

    function clipWindow(ctx){
        ctx.translate(windowX,0);
        ctx.clip(glass);
        ctx.clip(fanOutline,'evenodd');
        ctx.translate(-windowX,0);
    }

    function windowView(canvas){
        const ctx=canvas.getContext('2d');
        const exterior=new Image();
        let view;
        function paint(){
            if(!ctx||!view||!exterior.complete||!exterior.naturalWidth) return;
            const {darkness,sunrise,sunset,weather}=view;
            ctx.clearRect(0,0,width,height);
            ctx.save();
            clipWindow(ctx);
            const daylight=1.04-.58*darkness-.10*sunset;
            const weatherLight={clear:1,cloudy:.88,rain:.77,wet:.94}[weather];
            ctx.filter='brightness('+daylight*weatherLight+') saturate('+(.9-.17*darkness)+')';
            const viewWidth=660, viewHeight=390;
            const scale=Math.max(viewWidth/exterior.naturalWidth,viewHeight/exterior.naturalHeight);
            const w=exterior.naturalWidth*scale, h=exterior.naturalHeight*scale;
            ctx.drawImage(exterior,windowX+18-(w-viewWidth)/2,h>viewHeight?-(h-viewHeight)/2:0,w,h);
            ctx.filter='none';
            ctx.fillStyle='rgba(37,60,115,'+(darkness*.22)+')';
            ctx.fillRect(windowX,0,672,390);
            ctx.fillStyle='rgba(244,168,124,'+(.13*sunset+.06*sunrise)+')';
            ctx.fillRect(windowX,0,672,390);
            ctx.restore();
        }
        exterior.addEventListener('load',paint);
        exterior.src='../assets/home-window-view.webp';
        return (darkness,sunrise,sunset,weather)=>{
            const key=[darkness.toFixed(2),sunrise.toFixed(2),sunset.toFixed(2),weather].join('/');
            if(view?.key===key) return;
            view={key,darkness,sunrise,sunset,weather};
            paint();
        };
    }

    function rainOnWindow(ctx,time,rain){
        ctx.save();
        clipWindow(ctx);
        for(let i=0;i<14+24*rain;i++){
            const phase=(time*(.48+i%4*.062)+i*.386)%1;
            const px=windowX+((i*.618034)%1)*672-phase*16;
            const py=phase*390;
            ctx.beginPath();
            ctx.moveTo(px,py);
            ctx.lineTo(px-2.3,py+8+i%6*2.8);
            ctx.strokeStyle='rgba(165,203,229,'+(.08+i%5*.037)+')';
            ctx.lineWidth=i%5===0?1.4:.82;
            ctx.stroke();
        }
        ctx.restore();
    }

    function lamp(ctx,time,x,y,rx,ry,seed){
        const pulse=.13+.046*Math.sin(time*.91+seed)+.031*Math.sin(time*2.49+seed*2);
        glow(ctx,x,y,rx,ry,'255,201,119',pulse);
        glow(ctx,x,y+21,rx*1.18,ry*1.28,'255,177,94',pulse*.58);
    }

    const rooftops=[[-15,41,54],[38,24,49],[71,24,44],[106,37,39]];
    const skyline=[[2,7,13],[20,14,32],[35,8,17],[57,17,23],[78,14,20],[99,4,12]];
    function rooftopGame(ctx,time){
        const sky=ctx.createLinearGradient(0,0,0,63);
        sky.addColorStop(0,'#243351');
        sky.addColorStop(1,'#6d586d');
        ctx.fillStyle=sky;
        ctx.fillRect(-3,-3,105,86);
        ctx.fillStyle='#e9c884';
        ctx.fillRect(76,7,9,8);
        for(const [x,y] of [[12,7],[21,13],[33,11],[64,5],[91,13]]) ctx.fillRect(x,y,1.5,1.5);
        ctx.fillStyle='#3f4262';
        for(const [x,w,y] of skyline) ctx.fillRect(x,y,w,77);
        const travel=Math.min(1,Math.max(0,(time-.38)/6.07));
        const worldX=5+114*travel;
        const scroll=Math.max(0,worldX-67);
        ctx.save();
        ctx.translate(-Math.floor(scroll),0);
        for(const [x,w,y] of rooftops){
            ctx.fillStyle='#26373f';
            ctx.fillRect(x,y,w,58);
            ctx.fillStyle='#8ca69a';
            ctx.fillRect(x,y,w,3);
            for(let column=x+4;column<x+w-3;column+=8){
                ctx.fillStyle=column%3?'#b17a53':'#52666d';
                ctx.fillRect(column,y+9,4,5);
                ctx.fillRect(column,y+21,4,5);
            }
        }
        ctx.fillStyle='#506e75';
        ctx.fillRect(124,25,2,14);
        ctx.fillRect(124,25,11,6);
        ctx.fillStyle='#eed087';
        ctx.fillRect(127,26,5,3);
        const jumps=PanpanActor.gameJumps;
        const last=jumps.findLastIndex(([at])=>time>=at);
        let feet=rooftops[last+1][2];
        if(last>=0){
            const [at,duration]=jumps[last];
            const u=Math.min(1,(time-at)/duration);
            feet+=(rooftops[last][2]-feet)*(1-u)-14*4*u*(1-u);
        }
        const x=Math.floor(worldX);
        const y=Math.floor(feet)-10;
        const stride=travel>0&&travel<1&&Math.floor(time*11)%2;
        ctx.fillStyle='#31323d';
        ctx.fillRect(x,y,3,3);
        ctx.fillRect(x+6,y,3,3);
        ctx.fillRect(x+1+(stride?1:0),y+7,2,3);
        ctx.fillRect(x+5+(stride?0:1),y+7,2,3);
        ctx.fillStyle='#f4deaf';
        ctx.fillRect(x+1,y+2,7,5);
        ctx.fillRect(x+2,y+6,5,3);
        ctx.fillStyle='#35303c';
        ctx.fillRect(x+5,y+3,2,2);
        ctx.restore();
        if(time>=6.45){
            ctx.fillStyle='#242935';
            ctx.fillRect(28,12,42,10);
            ctx.fillStyle='#f5dfb0';
            ctx.font='6px sans-serif';
            ctx.fillText('✓  存档',37,19);
        }
    }

    function monitor(ctx,time,gameTime){
        ctx.save();
        clip(ctx,[[388,314],[486,290],[488,368],[389,394]]);
        if(gameTime!==null){
            ctx.transform(1,-.245,0,1,390,316);
            rooftopGame(ctx,gameTime);
            ctx.restore();
            return;
        }
        glow(ctx,423+Math.sin(time*.92)*26,354,75,50,'139,200,247',.20);
        const sweep=(time*.18)%1;
        glow(ctx,428,309+sweep*95,78,10,'147,205,246',.11);
        ctx.restore();
    }

    function makeShelteredWeather({open,runoff}){
        const exposed=new Path2D();
        for(const [first,...points] of open){
            exposed.moveTo(...first);
            for(const point of points) exposed.lineTo(...point);
            exposed.closePath();
        }
        return (ctx,time,weather,rain)=>{
            const raining=weather==='rain';
            if(!raining&&weather!=='wet') return;
            ctx.save();
            if(raining){
                ctx.save();
                ctx.clip(exposed);
                SceneEffects.rain(ctx,time,0,0,width,height,Math.round(30+98*rain));
                ctx.restore();
            }
            for(const [,,x,y] of runoff) glow(ctx,x,y+2,15,4,'188,216,227',.18);
            SceneEffects.runoff(ctx,time,runoff,raining);
            ctx.restore();
        };
    }

    function create(){
        const curtains=createPatch(836,126,125,178,
            'M 857,135 Q 903,119 951,132 L 939,170 Q 933,183 934,219 L 947,290 Q 926,301 918,295 L 913,278 Q 900,290 890,284 L 891,268 Q 871,283 861,273 L 863,255 Q 849,270 842,266 Z');

        function drawHome(ctx,image,time,{asleep,weather,pose,gameTime,rain=1,streetlight}){
            curtains(ctx,image,row=>Math.sin(time*1.32-row*2.6)*1.9*row**1.8);
            if(weather==='rain') rainOnWindow(ctx,time,rain);
            fan(ctx,time,1322,332,54,59,.22);
            if(streetlight){
                ctx.save();
                ctx.globalAlpha=streetlight;
                lamp(ctx,time,782,96,100,49,.6);
                lamp(ctx,time,1148,370,70,41,2.2);
                ctx.restore();
            }
            if(!asleep) monitor(ctx,time,pose==='gaming'?gameTime:null);
        }

        const weatherByPlace=Object.fromEntries(Object.entries(shelterEdges).map(([id,edges])=>[id,makeShelteredWeather(edges)]));
        weatherByPlace.fortune=weatherByPlace.stall;
        return function draw(ctx,image,time,scene){
            const {place,weather,rain=1}=scene;
            if(place==='home'){
                drawHome(ctx,image,time,scene);
                return;
            }
            if(place==='bathroom'){
                if(scene.bathroomAction==='shower'){
                    steam(ctx,time,[
                        [1112,765,3.5,.03,-15,80,.17],
                        [1244,763,3.1,.34,8,72,.17],
                        [1415,772,3.72,.64,16,63,.14],
                    ]);
                }
                if(scene.bathroomAction==='toilet'){
                    glow(ctx,762,503,25,12,'252,231,182',.24+.1*Math.sin(time*5));
                }
                return;
            }
            weatherByPlace[place]?.(ctx,time,weather,rain);
            const light=scene.streetlight;
            if(place==='secondhand'){
                if(light) glow(ctx,1154,115,225,39,'255,206,133',.42*light);
            }
            if(place==='pack'){
                if(light) glow(ctx,1030,178,205,52,'255,208,134',.24*light);
                glow(ctx,1010+Math.sin(time*.85)*12,509,34,13,'255,226,171',.14);
            }
            if(place==='noodle'){
                steam(ctx,time,[
                    [969,400,3.9,.14,-12,109,.29],[1081,400,4.2,.63,15,119,.22],
                    [1189,402,3.7,.28,12,100,.28],[1300,407,4.5,.79,20,121,.26],
                ]);
                if(light) glow(ctx,1120,428,285,78,'255,201,123',.18*light);
            }
            if((place==='stall'||place==='fortune')&&light) glow(ctx,485,205,116,87,'255,201,105',.24*light);
        };
    }

    return {create,windowView,width,height};
})();
