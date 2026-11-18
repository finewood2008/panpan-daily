const SceneEffects = (() => {
    const TAU=Math.PI*2;

    function glow(ctx,x,y,rx,ry,color,strength){
        ctx.save();
        ctx.translate(x,y);
        ctx.scale(rx,ry);
        const gradient=ctx.createRadialGradient(0,0,0,0,0,1);
        gradient.addColorStop(0,'rgba('+color+','+strength+')');
        gradient.addColorStop(.48,'rgba('+color+','+strength*.47+')');
        gradient.addColorStop(1,'rgba('+color+',0)');
        ctx.fillStyle=gradient;
        ctx.fillRect(-1,-1,2,2);
        ctx.restore();
    }

    function createPatch(x,y,width,height,outline,sourceOffset=0){
        const work=document.createElement('canvas');
        const mask=document.createElement('canvas');
        work.width=mask.width=width;
        work.height=mask.height=height;
        const ctx=work.getContext('2d');
        const maskCtx=mask.getContext('2d');
        // These paths sit inside the painted objects, clear of the wall or sky behind them.
        maskCtx.translate(-x,-y);
        maskCtx.filter='blur(1px)';
        maskCtx.fill(new Path2D(outline));
        return (destination,image,offset)=>{
            ctx.clearRect(0,0,width,height);
            for(let row=0;row<height;row+=4){
                const strip=Math.min(height-row,4);
                ctx.drawImage(image,x+sourceOffset-offset(row/height),y+row,width,strip,0,row,width,strip);
            }
            ctx.globalCompositeOperation='destination-in';
            ctx.drawImage(mask,0,0);
            ctx.globalCompositeOperation='source-over';
            destination.drawImage(work,x,y);
        };
    }

    function clip(ctx,points){
        ctx.beginPath();
        points.forEach(([x,y],index)=>index?ctx.lineTo(x,y):ctx.moveTo(x,y));
        ctx.closePath();
        ctx.clip();
    }

    function steam(ctx,time,sources){
        for(const [x,y,period,delay,drift,rise,opacity] of sources){
            const phase=(time/period+delay)%1;
            const fade=Math.sin(Math.PI*phase)**1.45*opacity;
            const curl=Math.sin(phase*7+delay*9)*phase*9;
            const px=x+drift*phase+curl;
            const py=y-rise*phase;
            glow(ctx,px,py,7+phase*26,9+phase*27,'255,246,218',fade);
            glow(ctx,px-4,py+9,5+phase*15,10+phase*17,'255,242,215',fade*.68);
            glow(ctx,px+1,py+17,4+phase*10,7+phase*11,'255,243,219',fade*.41);
        }
    }

    function fan(ctx,time,x,y,rx,ry,opacity){
        ctx.save();
        ctx.translate(x,y);
        ctx.scale(rx,ry);
        ctx.rotate(time*10.5);
        ctx.fillStyle='rgba(220,202,164,'+opacity+')';
        for(let blade=0;blade<3;blade++){
            ctx.rotate(TAU/3);
            ctx.beginPath();
            ctx.moveTo(.24,-.12);
            ctx.bezierCurveTo(.57,-.38,.92,-.44,.92,-.08);
            ctx.bezierCurveTo(.9,.26,.49,.35,.22,.09);
            ctx.fill();
        }
        ctx.restore();
    }

    function ripples(ctx,time,spots){
        for(const [x,y,period,delay,size] of spots){
            const phase=(time/period+delay)%1;
            if(phase>.62) continue;
            const grow=phase/.62;
            ctx.beginPath();
            ctx.ellipse(x,y,2+size*grow,1+size*grow*.34,-.08,0,TAU);
            ctx.strokeStyle='rgba(197,219,227,'+(.42*Math.sin(Math.PI*grow)) +')';
            ctx.lineWidth=1.4;
            ctx.stroke();
        }
    }

    function runoff(ctx,time,edges,raining){
        for(const [x,y,landX,landY,delay] of edges){
            const phase=(time+(delay*3.3))%(raining?3.3:5.7);
            if(phase<.75){
                const fall=(phase/.75)**2;
                const px=x+(landX-x)*fall;
                const py=y+(landY-y)*fall;
                const length=2.5+fall*4.5;
                ctx.strokeStyle='rgba(224,233,234,.62)';
                ctx.lineWidth=1.45;
                ctx.beginPath();
                ctx.moveTo(px,py);
                ctx.lineTo(px+.45,py+length);
                ctx.stroke();
            }else if(phase<1.32){
                const age=(phase-.75)/.57;
                ctx.strokeStyle='rgba(208,227,230,'+(.56*(1-age)*(raining?1:.67))+')';
                ctx.lineWidth=1;
                ctx.beginPath();
                ctx.ellipse(landX,landY+2,1.4+age*8,.6+age*2.7,-.13,0,TAU);
                ctx.stroke();
            }
        }
    }

    function rain(ctx,time,x,y,width,height,density){
        ctx.save();
        ctx.lineCap='round';
        for(let depth=0;depth<3;depth++){
            const count=density+Math.round(density*depth*.2);
            const length=12+depth*9;
            ctx.strokeStyle=['#bcd2ea28','#bfd6ee46','#cfdef563'][depth];
            ctx.lineWidth=.7+depth*.33;
            ctx.beginPath();
            for(let i=0;i<count;i++){
                const phase=(time*(.64+depth*.2+i%4*.042)+i*.387+depth*.19)%1;
                const px=x+((i*.61803399+depth*.248)%1)*(width+92)-phase*76;
                const py=y+phase*(height+length)-length;
                ctx.moveTo(px,py);
                ctx.lineTo(px-length*.23,py+length);
            }
            ctx.stroke();
        }
        ctx.restore();
    }

    function hangingObject(image,{pivot,bounds:[left,top,right,bottom],outer,hole},sourceOffset=0){
        const w=right-left, h=bottom-top;
        const sprite=document.createElement('canvas');
        sprite.width=w;
        sprite.height=h;
        const cutout=sprite.getContext('2d');
        cutout.translate(-left,-top);
        cutout.clip(new Path2D(outer+' '+hole),'evenodd');
        cutout.drawImage(image,left+sourceOffset,top,w,h,left,top,w,h);

        // Rebuild the board only underneath the original cable, from adjacent colors.
        const board=document.createElement('canvas');
        board.width=w;
        board.height=h;
        const clean=board.getContext('2d');
        const blend=document.createElement('canvas');
        blend.width=w;
        blend.height=h;
        const side=blend.getContext('2d');
        side.drawImage(image,right+sourceOffset,top,1,h,0,0,w,h);
        const gradient=side.createLinearGradient(0,0,w,0);
        gradient.addColorStop(0,'transparent');
        gradient.addColorStop(1,'black');
        side.globalCompositeOperation='destination-in';
        side.fillStyle=gradient;
        side.fillRect(0,0,w,h);
        clean.translate(-left,-top);
        clean.clip(new Path2D(outer+' '+hole),'evenodd');
        clean.drawImage(image,left+sourceOffset,top,1,h,left,top,w,h);
        clean.drawImage(blend,left,top);

        return (ctx,angle)=>{
            ctx.drawImage(board,left,top);
            ctx.save();
            ctx.translate(...pivot);
            ctx.rotate(angle);
            ctx.drawImage(sprite,left-pivot[0],top-pivot[1]);
            ctx.restore();
        };
    }

    return {glow,createPatch,clip,steam,fan,ripples,runoff,rain,hangingObject};
})();
