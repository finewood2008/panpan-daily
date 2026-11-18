const PanpanMapView = (() => {
    const width=2432;
    const height=941;
    const margin=380;

    function create(viewport,art,controls){
        const buttons=[...controls.querySelectorAll('button')];
        const reduced=matchMedia('(prefers-reduced-motion: reduce)');
        const stops={west:0,center:.5,east:1};
        let position=.5;
        let active=true;
        let focus;
        let zoom;
        let drag;
        let selected;
        let edgeSpeed=0;
        let edgePosition=0;
        let frame=0;
        let lastTime=0;

        const scrollable=()=>Math.max(0,viewport.scrollWidth-viewport.clientWidth);
        const baseScrollable=()=>Math.max(0,art.offsetWidth-viewport.clientWidth);
        const fit=value=>Math.max(0,Math.min(value,1));

        function refresh(){
            const available=scrollable();
            if(!active||viewport.classList.contains('close-view')||available===0) return;
            position=fit(viewport.scrollLeft/available);
            const view=position<.14?'west':position>.86?'east':'center';
            if(view===selected) return;
            selected=view;
            for(const button of buttons) button.setAttribute('aria-pressed',String(button.dataset.view===view));
        }

        function scrollTo(value,animate=false){
            position=fit(value);
            viewport.scrollTo({left:position*scrollable(),behavior:animate&&!reduced.matches?'smooth':'instant'});
            if(!animate||reduced.matches) refresh();
        }

        function stopEdge(){
            edgeSpeed=0;
            if(frame) cancelAnimationFrame(frame);
            frame=0;
            lastTime=0;
        }

        function edgeTick(now){
            const max=scrollable();
            const speed=Math.max(110,viewport.clientWidth*.24);
            edgePosition=Math.min(max,Math.max(0,edgePosition+edgeSpeed*speed*Math.min(45,now-lastTime)/1000));
            lastTime=now;
            viewport.scrollLeft=edgePosition;
            if((edgePosition===0&&edgeSpeed<0)||(edgePosition===max&&edgeSpeed>0)) stopEdge();
            else frame=requestAnimationFrame(edgeTick);
        }

        function setActive(next){
            if(next===active) return;
            stopEdge();
            active=next;
            viewport.hidden=!active;
            controls.hidden=!active||Boolean(focus);
            if(active) scrollTo(position);
        }

        function viewTransform([x,y,w,h]){
            const vw=viewport.clientWidth, vh=viewport.clientHeight;
            const aw=art.offsetWidth, ah=art.offsetHeight;
            const scale=Math.max(1,Math.min(vw/(w*aw/width),vh/(h*ah/height)));
            const left=Math.min(aw*scale-vw,Math.max(0,(x+margin)*aw/width*scale-vw/2));
            const top=Math.min(ah*scale-vh,Math.max(0,y*ah/height*scale-vh/2));
            return 'translate('+(viewport.scrollLeft-left)+'px,'+(-top)+'px) scale('+scale+')';
        }

        function setFocus(view,animate=false){
            const previous=getComputedStyle(art).transform;
            zoom?.cancel();
            zoom=null;
            focus=view;
            stopEdge();
            release();
            controls.hidden=!active||Boolean(focus);
            if(focus||previous!=='none') viewport.classList.add('close-view');
            if(active) viewport.scrollTo({left:position*baseScrollable(),top:0,behavior:'instant'});
            const target=focus&&active?viewTransform(focus):'none';
            art.style.transform=target;
            const finish=()=>{
                if(!focus){
                    viewport.classList.remove('close-view');
                    if(active) scrollTo(position);
                }
            };
            if(!animate||!active||reduced.matches||previous===target){
                finish();
                return;
            }
            const motion=art.animate([{transform:previous},{transform:target}],{duration:460,easing:'cubic-bezier(.25,.7,.3,1)'});
            zoom=motion;
            return motion.finished.then(()=>{
                zoom=null;
                finish();
            },()=>{});
        }

        for(const button of buttons){
            button.onclick=()=>{
                stopEdge();
                scrollTo(stops[button.dataset.view],true);
            };
        }
        viewport.addEventListener('scroll',refresh,{passive:true});
        viewport.addEventListener('keydown',event=>{
            if(event.target!==viewport||viewport.classList.contains('close-view')) return;
            const delta=.37*viewport.clientWidth/Math.max(1,scrollable());
            const target={ArrowLeft:position-delta,ArrowRight:position+delta,Home:0,End:1}[event.key];
            if(target===undefined) return;
            event.preventDefault();
            stopEdge();
            scrollTo(target,true);
        });
        viewport.addEventListener('pointerdown',event=>{
            if(event.pointerType!=='mouse'||event.button!==0||viewport.classList.contains('close-view')) return;
            stopEdge();
            drag={id:event.pointerId,x:event.clientX,scroll:viewport.scrollLeft,moving:false};
        });
        viewport.addEventListener('pointermove',event=>{
            if(drag?.id===event.pointerId){
                const distance=drag.x-event.clientX;
                if(!drag.moving){
                    if(Math.abs(distance)<6) return;
                    drag.moving=true;
                    viewport.setPointerCapture(event.pointerId);
                    viewport.classList.add('dragging');
                }
                viewport.scrollLeft=drag.scroll+distance;
                return;
            }
            if(viewport.classList.contains('close-view')||event.pointerType!=='mouse'||reduced.matches||event.target.closest('button')||document.querySelector('dialog[open]')){
                stopEdge();
                return;
            }
            const rect=viewport.getBoundingClientRect();
            const distance=event.clientX-rect.left;
            const band=Math.min(75,rect.width*.11);
            edgeSpeed=distance<band?-fit(1-distance/band):distance>rect.width-band?fit(1-(rect.width-distance)/band):0;
            if(!edgeSpeed) stopEdge();
            else if(!frame){
                edgePosition=viewport.scrollLeft;
                lastTime=performance.now();
                frame=requestAnimationFrame(edgeTick);
            }
        });
        function release(){
            drag=null;
            viewport.classList.remove('dragging');
        }
        for(const event of ['pointerup','pointercancel','lostpointercapture']){
            viewport.addEventListener(event,release);
        }
        viewport.addEventListener('pointerleave',()=>{
            stopEdge();
            if(!drag?.moving) release();
        });
        window.addEventListener('blur',()=>{
            stopEdge();
            release();
        });
        reduced.addEventListener('change',()=>{
            stopEdge();
            if(reduced.matches&&zoom) zoom.finish();
        });
        new ResizeObserver(()=>{
            if(!active) return;
            viewport.style.setProperty('--view-width',viewport.clientWidth+'px');
            viewport.style.setProperty('--view-height',viewport.clientHeight+'px');
            if(focus){
                viewport.scrollTo({left:position*baseScrollable(),top:0,behavior:'instant'});
                art.style.transform=viewTransform(focus);
            }
            else if(!zoom) scrollTo(position);
        }).observe(viewport);

        return {setActive,setFocus,stopEdge};
    }
    return {create,width,height,margin};
})();
