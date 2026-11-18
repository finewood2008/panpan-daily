const AlleyAmbience = (() => {
    // Effects use the original street's coordinates, with negative x at the left extension.
    const {width:WIDTH,height:HEIGHT,margin:MARGIN}=PanpanMapView;
    const {glow,createPatch,clip,fan,ripples,runoff}=SceneEffects;
    const steam = [
        [1400,638,6.2,.16,-15], [1426,644,5.1,.67,14], [1463,653,6.6,.24,-9],
        [1486,662,5.9,.52,18], [1454,651,7.7,.78,15], [1413,642,7.1,.42,9],
    ];
    const fans = [[130,537,19,23,0],[179,523,20,23,.3]];
    const leaves = [
        [508,456,78,202,11.7,.06,7], [547,480,-20,153,14.3,.39,6],
        [578,508,52,155,13.1,.84,5], [463,484,-57,136,12.6,.26,7],
        [324,412,-116,188,18.4,.77,5], [1580,629,47,125,19.6,.73,5],
        [45,582,95,146,22.9,.42,4], [1559,725,92,104,17.3,.18,5],
    ];
    const reflections = [[1018,848,8,4],[1019,851,11,2],[1026,841,6,2],[1013,857,7,2]];
    const officeWindows = [
        [51,51,6,10,.9],[141,33,7,9,2.1],[228,105,7,10,1.1],
        [1510,69,4,5,3.3],[1527,63,4,6,1.9],[1534,97,4,5,4.8],
        [-354,77,4,5,4.8],[-226,96,4,5,2.7],[1836,93,4,5,2.4],[1922,158,5,5,4.1],
    ];
    const exposedPuddles = [[353,689,3.4,.32,14],[1020,852,4.1,.73,15],[-155,563,5.2,.42,8]];
    const eaves = [
        [649,689,623,834,.02],[955,672,968,834,.79],
        [1090,168,1083,363,.42],
        [1166,548,1139,740,.62],[1486,606,1522,838,.37],
    ];
    // Projected roofs plus the area they shelter, including the dry floor and furniture.
    const rainShelters=[
        [[635,677],[723,645],[895,620],[954,662],[956,828],[875,851],[795,882],[651,840],[625,830]],
        [[1088,155],[1150,131],[1404,144],[1506,161],[1499,351],[1437,404],[1289,406],[1088,357]],
        [[1167,521],[1227,494],[1514,551],[1512,796],[1482,834],[1389,849],[1150,775],[1167,709]],
    ];
    // The roof, hanging rail and the rack stay in the background painting.
    const cables = [
        {pivot:[789,735], bounds:[777,733,799,767],
            outer:'M 788,734 C 794,733 797,738 797,743 L 798,754 C 799,763 790,768 784,766 C 778,764 780,758 780,749 C 780,742 782,735 788,734 Z',
            hole:'M 789,742 C 786,743 786,749 786,755 Q 787,759 789,756 C 790,752 791,745 789,742 Z'},
        {pivot:[809,731], bounds:[798,728,819,764],
            outer:'M 807,730 C 812,728 817,731 817,739 L 817,751 C 818,757 813,763 807,763 C 801,763 798,757 800,750 L 801,740 C 801,735 803,731 807,730 Z',
            hole:'M 808,738 C 805,739 806,745 806,751 Q 807,755 809,752 C 810,746 811,741 808,738 Z'},
        {pivot:[828,725], bounds:[817,721,840,758],
            outer:'M 827,725 C 832,722 837,726 837,732 L 838,741 C 839,750 836,755 829,756 C 821,757 818,753 819,747 L 820,734 C 820,729 822,725 827,725 Z',
            hole:'M 829,730 C 826,732 825,741 826,747 Q 827,751 829,748 C 832,742 831,734 829,730 Z'},
    ];

    function drawSteam(ctx,seconds,emphasis){
        for(const [x,y,period,delay,drift] of steam){
            const phase=(seconds/period+delay)%1;
            const envelope=Math.sin(Math.PI*phase)**1.65*emphasis;
            const curl=Math.sin(phase*5.8+delay*8)*phase*6;
            const cloudX=x+phase*drift+curl;
            const cloudY=y-phase*69;
            glow(ctx,cloudX,cloudY,7+phase*19,8+phase*20,'255,249,226',envelope*.32);
            glow(ctx,cloudX-3,cloudY+7,5+phase*11,8+phase*14,'255,247,222',envelope*.19);
            glow(ctx,cloudX+1,cloudY+14,4+phase*5,7+phase*9,'255,246,224',envelope*.11);
        }
    }

    function drawLeaves(ctx,seconds){
        for(const [x,y,dx,dy,period,delay,size] of leaves){
            const phase=(seconds/period+delay)%1;
            if(phase>=.76) continue;
            const progress=phase/.76;
            ctx.save();
            ctx.globalAlpha=Math.min(.83,progress*8,(1-progress)*8);
            ctx.translate(x+dx*progress+12*Math.sin(progress*9+delay),y+dy*progress);
            ctx.rotate(progress*9+delay*5);
            ctx.scale(size*(.56+.44*Math.abs(Math.sin(progress*10+delay))),size);
            ctx.fillStyle='#c9a94f';
            ctx.beginPath();
            ctx.moveTo(-.88,.14);
            ctx.quadraticCurveTo(0,-.63,.99,-.04);
            ctx.quadraticCurveTo(.28,.63,-.88,.14);
            ctx.fill();
            ctx.restore();
        }
    }

    function drawLight(ctx,seconds,night,wet){
        const contrast=night?1.65:1;
        const flicker=.34+.08*Math.sin(seconds*1.7)+.045*Math.sin(seconds*3.14+.6);
        glow(ctx,750,715,50,48,'255,191,86',flicker*contrast);
        glow(ctx,1246,226,92,30,'255,194,113',contrast*(.16+.051*Math.sin(seconds*1.28+.8)));
        glow(ctx,799,329,64,58,'255,189,103',contrast*(.12+.056*Math.sin(seconds*.94+.7)));
        if(night) glow(ctx,1390,624,136,49,'255,196,108',.24);
        glow(ctx,-98,467,33,42,'255,187,92',.07+.028*Math.sin(seconds*1.31+.7));
        glow(ctx,1972,530,32,46,'255,188,102',.12+.036*Math.sin(seconds*.85));
        if(wet) for(const [x,y,rx,ry] of reflections){
            glow(ctx,x+Math.sin(seconds*1.2)*1.2,y,rx,ry,'255,202,118',.16+.09*Math.sin(seconds*2.6+x));
        }
    }

    function drawWindows(ctx,seconds,night){
        for(const [x,y,w,h,delay] of officeWindows){
            const phase=(seconds+delay*4)%(13+delay);
            const fade=Math.min(1,Math.max(0,(phase-3)/1.5),Math.max(0,(10+delay-phase)/1.9));
            if(!fade) continue;
            ctx.fillStyle='rgba(249,201,126,'+fade*(night?.32:.21)+')';
            ctx.fillRect(x-1,y-1,w,h);
            glow(ctx,x+w/2,y+h/2,w*1.2,h*.93,'255,207,148',fade*(night?.15:.095));
        }
    }

    function drawBirds(ctx,time){
        const phase=(time+5)%27/27;
        if(phase>.60) return;
        const step=phase/.60;
        const alpha=Math.min(.84,step*9,(1-step)*8);
        ctx.save();
        ctx.globalAlpha=alpha;
        ctx.strokeStyle='#333656';
        ctx.lineCap='round';
        ctx.lineWidth=1.25;
        for(let i=0;i<4;i++){
            const x=340+step*840+i*16;
            const y=101-step*42+Math.sin(step*8+i)*7+i*4;
            const wing=2.4+Math.sin(time*7.6+i*.87)*2.6;
            ctx.beginPath();
            ctx.moveTo(x-5,y-wing);
            ctx.quadraticCurveTo(x-2,y-wing*.8,x,y);
            ctx.quadraticCurveTo(x+3,y-wing*.9,x+6,y-wing);
            ctx.stroke();
        }
        ctx.restore();
    }

    function drawTelevision(ctx,seconds){
        const flicker=.23+.12*Math.sin(seconds*4)+.05*Math.sin(seconds*9);
        ctx.save();
        clip(ctx,[[269,521],[298,518],[302,548],[273,554]]);
        glow(ctx,285,536,22,22,'155,185,210',flicker);
        ctx.fillStyle='rgba(214,225,217,.09)';
        ctx.fillRect(265,523+(seconds*14)%28,41,2);
        ctx.restore();
    }

    function drawWetStreet(ctx,time,raining){
        for(const [x,y,,,size] of exposedPuddles){
            glow(ctx,x,y,size*2.6,size*.67,'159,188,217',.31);
            glow(ctx,x+6,y-1,size*1.2,size*.26,'242,191,119',.23);
        }
        ripples(ctx,time*(raining?1.8:.65),exposedPuddles);
    }

    function drawParcelTag(ctx,time,amount){
        const lift=Math.sin(time*9)*amount;
        ctx.save();
        ctx.translate(1397,352);
        ctx.rotate(-.21);
        ctx.globalAlpha=amount;
        ctx.fillStyle='#713b25';
        ctx.fillRect(1,2,22,10);
        ctx.fillStyle='#e9d2aa';
        ctx.beginPath();
        ctx.moveTo(0,0);
        ctx.lineTo(22,-1);
        ctx.quadraticCurveTo(20,5,22,10-lift*5);
        ctx.lineTo(0,10);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle='#8c6c54';
        ctx.lineWidth=.9;
        ctx.beginPath();
        ctx.moveTo(4,4);
        ctx.lineTo(16,3);
        ctx.moveTo(4,6.5);
        ctx.lineTo(11,6);
        ctx.stroke();
        ctx.restore();
    }

    function create(){
        const exposedStreet=new Path2D();
        exposedStreet.rect(-MARGIN,0,WIDTH,HEIGHT);
        for(const [first,...points] of rainShelters){
            exposedStreet.moveTo(...first);
            for(const point of points) exposedStreet.lineTo(...point);
            exposedStreet.closePath();
        }
        const cloth=createPatch(655,135,118,73,
            'M 674,158 L 694,151 L 700,191 Q 686,197 671,195 Z M 713,149 L 727,147 L 728,169 L 714,172 Z M 746,145 L 765,142 L 767,177 Q 755,184 741,183 Z',MARGIN);
        const ivy=createPatch(718,395,66,88,
            'M 729,400 Q 741,405 737,421 Q 729,419 727,426 L 723,423 Q 725,408 729,400 Z M 732,436 Q 750,435 748,444 Q 744,449 739,444 L 731,447 Q 727,445 732,436 Z M 736,460 Q 741,453 746,462 Q 753,463 748,468 L 741,466 L 736,472 Z M 763,413 Q 775,415 778,423 L 773,429 L 767,425 L 763,433 Q 757,429 763,413 Z M 762,446 Q 768,442 771,450 L 776,453 L 774,459 L 769,456 L 761,458 Z',MARGIN);
        let hangingCables;

        return function draw(ctx,image,time,{period,weather,rain=1},hover,hoverTime){
            const night=period==='night';
            const raining=weather==='rain';
            const wet=raining||weather==='wet';
            const amount=hover?Math.min(1,hoverTime*5):0;
            ctx.save();
            ctx.translate(MARGIN,0);
            const wind=(raining?.85+rain*.50:.85)+.27*Math.sin(time*.55+.2);
            cloth(ctx,image,row=>row*row*wind*1.25*Math.sin(time*1.6-row*2.8));
            const ivyMotion=.65+(hover==='home'?amount*1.75:0);
            ivy(ctx,image,row=>(.65+row*.35)*Math.sin(time*3-row*3)*ivyMotion);
            if(hover==='stall'){
                hangingCables??=cables.map(cable=>SceneEffects.hangingObject(image,cable,MARGIN));
                const strength=amount*(.45+.55*Math.exp(-hoverTime*.6));
                for(const [index,drawCable] of hangingCables.entries()){
                    const angle=Math.sin(hoverTime*(2.55+index*.17)+index*.62)*strength*.062;
                    drawCable(ctx,angle);
                }
            }
            if(hover==='pack') drawParcelTag(ctx,time,amount);
            for(const [x,y,rx,ry,delay] of fans) fan(ctx,time+delay,x,y,rx,ry,.25);
            drawLight(ctx,time,night,wet);
            drawWindows(ctx,time,night);
            if(!night&&!raining) drawBirds(ctx,time);
            drawTelevision(ctx,time);
            drawSteam(ctx,time,.65+(hover==='noodle'?amount*1.95:0));
            if(!raining) drawLeaves(ctx,time);
            if(wet){
                ctx.save();
                ctx.clip(exposedStreet,'evenodd');
                drawWetStreet(ctx,time,raining);
                if(raining) SceneEffects.rain(ctx,time,-MARGIN,0,WIDTH,HEIGHT,Math.round(14+58*rain));
                ctx.restore();
                runoff(ctx,time,eaves,raining);
            }
            ctx.restore();
        };
    }

    return {create,width:WIDTH,height:HEIGHT};
})();
