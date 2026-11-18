(() => {
    const byId=id=>document.getElementById(id);
    const story=byId('comic');
    if(!story){
        const edition=byId('note-edition');
        if(edition&&Date.now()<Zaima.noteAt) edition.textContent='次日手记 · 预览';
        return;
    }
    const views=['comic','replay','scene'];
    const video=document.querySelector('video');
    const frame=byId('scene-frame');
    const art=byId('scene-art');
    const reply=byId('reply');
    const message=byId('phone-message');
    const actions=[...document.querySelectorAll('[data-answer]')];
    let view;
    let enteredLive=false;
    let answerTimer;
    let answered=false;
    const choices=byId('scene-choices');
    const retry=byId('scene-retry');
    const ending=byId('scene-ending');
    function resetScene(){
        clearTimeout(answerTimer);
        answered=false;
        choices.hidden=false;
        retry.hidden=true;
        ending.hidden=true;
        delete frame.dataset.response;
        art.src='/panpan-daily/assets/zaima/panel-3.webp';
        art.alt='潘潘坐在格子被子上，刚收到老板的回复。';
        message.textContent='？';
        message.hidden=false;
        reply.replaceChildren('潘潘'+Zaima.opening);
        actions.forEach(button=>button.setAttribute('aria-pressed','false'));
    }
    function updateMode(){
        if(view!=='scene') return;
        byId('scene-status').textContent=enteredLive?'现场 · 22:40 的小屋':'回放 · 场景体验';
        document.querySelector('.tabs [data-view="scene"]').textContent=enteredLive?'现场互动':'体验这一幕';
    }
    function show(){
        const params=new URLSearchParams(location.search);
        const target=params.get('view');
        const next=views.includes(target)?target:'comic';
        if(view==='replay'&&next!=='replay') video.pause();
        if(view==='scene'&&next!=='scene') clearTimeout(answerTimer);
        if(next==='scene'&&view!=='scene'){
            resetScene();
            const minute=PanpanTime.minuteNow();
            enteredLive=params.get('mode')==='live'&&Zaima.isLive(minute,PanpanGame.snapshot(minute));
        }
        view=next;
        for(const name of views) byId(name).hidden=name!==view;
        for(const tab of document.querySelectorAll('.tabs [data-view]')){
            if(tab.dataset.view===view) tab.setAttribute('aria-current','page');
            else tab.removeAttribute('aria-current');
        }
        if(view==='replay'&&!video.getAttribute('src')) video.src=video.dataset.src;
        updateMode();
    }
    document.addEventListener('click',event=>{
        const link=event.target.closest('a[data-view]');
        if(!link||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||event.button!==0) return;
        event.preventDefault();
        history.pushState(null,'',link.href);
        show();
        window.scrollTo(0,0);
        document.querySelector('.tabs [aria-current]')?.focus({preventScroll:true});
    });
    window.addEventListener('popstate',show);
    video.addEventListener('error',()=>{
        video.hidden=true;
        document.querySelector('.media-fallback').hidden=false;
    });
    for(const button of actions){
        button.onclick=()=>{
            if(view!=='scene'||answered) return;
            answered=true;
            choices.hidden=true;
            retry.hidden=false;
            ending.hidden=false;
            const response=Zaima.responses[button.dataset.answer];
            frame.dataset.response=button.dataset.answer;
            art.src='/panpan-daily/assets/zaima/panel-'+response.panel+'.webp';
            art.alt=response.direction;
            message.textContent=response.message;
            message.hidden=!response.message;
            const line=document.createElement('b');
            line.textContent='「'+response.line+'」';
            reply.replaceChildren(line,document.createElement('br'),response.direction);
            actions.forEach(choice=>choice.setAttribute('aria-pressed',String(choice===button)));
            reply.tabIndex=-1;
            reply.focus({preventScroll:true});
            if(button.dataset.answer==='ask'&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
                answerTimer=setTimeout(()=>{
                    if(view!=='scene') return;
                    art.src='/panpan-daily/assets/zaima/panel-4.webp';
                    delete frame.dataset.response;
                    message.hidden=true;
                },1450);
            }
        };
    }
    document.addEventListener('visibilitychange',()=>{
        if(document.hidden) video.pause();
        else updateMode();
    });
    retry.onclick=()=>{resetScene();actions[0].focus({preventScroll:true});};
    show();
})();
