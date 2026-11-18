const PanpanTime=(()=>{
    const dayMinutes=1440;
    const epoch=Date.UTC(2026,0,1)-8*60*60*1000;
    const worldSeed=0x50414e32;
    const periods=[
        [0,'night','夜里'],[330,'dawn','清晨'],[480,'day','白天'],
        [990,'dusk','傍晚'],[1170,'night','夜里'],
    ];

    const minuteNow=(now=Date.now())=>Math.max(0,(now-epoch)/60000);

    function random(seed,day,slot){
        let value=(seed+Math.imul(day+1,0x9e3779b9)+Math.imul(slot+1,0x85ebca6b))|0;
        value=Math.imul(value^(value>>>16),0x7feb352d);
        value=Math.imul(value^(value>>>15),0x846ca68b);
        return ((value^(value>>>16))>>>0)/4294967296;
    }

    function weatherPlan(day,seed){
        const roll=slot=>random(seed,day,slot);
        const morning=number=>number===0||random(seed,number,0)>.47?'clear':'cloudy';
        const plan=[];
        function add(from,kind,strength=0){
            const last=plan.at(-1);
            if(last?.kind===kind&&last.strength===strength) return;
            plan.push({from,kind,strength});
        }
        add(0,morning(day));
        if(day===0||roll(1)<.73){
            const rainAt=day===0?855:Math.round((510+roll(2)*600)/5)*5;
            const end=rainAt+55+Math.round(roll(3)*55);
            add(rainAt-55,'cloudy');
            add(rainAt,'rain',.48);
            if(day===0||roll(4)>.4) add(rainAt+25,'rain',1);
            add(end,'wet');
            add(end+45+Math.round(roll(5)*30),roll(6)>.38?'clear':'cloudy');
        }else{
            add(645,morning(day)==='clear'?'cloudy':'clear');
            if(roll(2)<.55) add(1000,'clear');
        }
        add(1350,morning(day+1));
        return plan;
    }

    function weatherLabel({kind,strength}){
        if(kind==='rain') return strength>.65?'阵雨':'小雨';
        return {clear:'晴',cloudy:'阴',wet:'雨后'}[kind];
    }

    function conditions(minute,seed){
        const day=Math.floor(minute/dayMinutes);
        const current=minute-day*dayMinutes;
        const [,period,periodName]=periods.findLast(([from])=>from<=current);
        const plan=weatherPlan(day,seed);
        const index=plan.findLastIndex(entry=>entry.from<=current);
        const entry=plan[index];
        const upcoming=plan[index+1];
        const previous=plan[index-1];
        let rain=entry.strength;
        if(entry.kind==='rain'){
            const enter=Math.min(1,(current-entry.from)/10);
            const exit=upcoming?.kind==='wet'?Math.min(1,(upcoming.from-current)/12):1;
            rain=Math.max(.1,(entry.strength*enter+(previous?.strength??0)*(1-enter))*exit);
        }
        let forecast=upcoming&&{...upcoming,minute:day*dayMinutes+upcoming.from};
        for(let i=1;!forecast&&i<=2;i++){
            const next=weatherPlan(day+i,seed).find(candidate=>weatherLabel(candidate)!==weatherLabel(entry));
            if(next) forecast={...next,minute:(day+i)*dayMinutes+next.from};
        }
        const stallRained=plan.some((part,i)=>part.kind==='rain'&&part.from<=current&&part.from<990&&
            (plan[i+1]?.from??dayMinutes)>810);
        return {day,hour:current/60,period,periodName,weather:entry.kind,weatherName:weatherLabel(entry),
            rain,forecast:forecast&&{minute:forecast.minute,label:weatherLabel(forecast)},stallRained};
    }

    function clockText(minute){
        const total=Math.floor(minute+1e-7);
        const today=total%dayMinutes;
        return String(Math.floor(today/60)).padStart(2,'0')+':'+String(today%60).padStart(2,'0');
    }

    const dateFormat=new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',month:'long',day:'numeric'});
    const dateText=minute=>dateFormat.format(epoch+minute*60000);

    return {minuteNow,conditions,clockText,dateText,dayMinutes,random,worldSeed};
})();
