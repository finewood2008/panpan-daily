const PanpanTime=(()=>{
    const dayMinutes=1440;
    const speeds=[1,2,4];
    const firstMinute=390;
    const firstRainAt=855;
    const worldSeed=0x50414e32;
    const periods=[
        [0,'night','深夜'],[330,'dawn','日出'],[450,'day','白天'],
        [1050,'dusk','日落'],[1170,'night','入夜'],
    ];

    const clockKey='panpan.world-clock-start';
    const startedAt=Date.now();
    let clock={at:startedAt,minute:firstMinute,speed:1};

    function readClock(value,now){
        try{
            const saved=JSON.parse(value);
            // Existing saves are a timestamp from when the clock always ran at 2×.
            if(Number.isFinite(saved)&&saved>0&&saved<=now){
                return {at:now,minute:firstMinute+(now-saved)/500,speed:1};
            }
            if(Number.isFinite(saved?.at)&&saved.at>0&&Number.isFinite(saved.minute)&&
                saved.minute>=firstMinute&&speeds.includes(saved.speed)) return saved;
        }catch{}
    }

    function saveClock(){
        try{localStorage.setItem(clockKey,JSON.stringify(clock));}catch{}
    }

    try{
        const value=localStorage.getItem(clockKey);
        clock=readClock(value,startedAt)??clock;
        if(value!==JSON.stringify(clock)) saveClock();
    }catch{}

    globalThis.addEventListener?.('storage',event=>{
        if(event.key!==clockKey) return;
        clock=readClock(event.newValue,Date.now())??clock;
    });

    const minuteNow=(now=Date.now())=>clock.minute+Math.max(0,now-clock.at)*clock.speed/1000;
    const speedNow=()=>clock.speed;

    function setSpeed(speed){
        if(!speeds.includes(speed)||speed===clock.speed) return;
        const now=Date.now();
        clock={at:now,minute:minuteNow(now),speed};
        saveClock();
    }
    const dayText=minute=>'第 '+(Math.floor(minute/dayMinutes)+1)+' 天';

    function random(seed,day,slot){
        let value=(seed+Math.imul(day+1,0x9e3779b9)+Math.imul(slot+1,0x85ebca6b))|0;
        value=Math.imul(value^(value>>>16),0x7feb352d);
        value=Math.imul(value^(value>>>15),0x846ca68b);
        return ((value^(value>>>16))>>>0)/4294967296;
    }

    function weatherPlan(day,seed){
        const roll=slot=>random(seed,day,slot);
        const morning=number=>number===0||random(seed,number,0)>.46?'clear':'cloudy';
        const plan=[];
        function add(from,kind,strength=0){
            const last=plan.at(-1);
            if(last?.kind===kind&&last.strength===strength) return;
            plan.push({from,kind,strength});
        }
        add(0,morning(day));
        if(day===0||roll(1)<.59){
            const rainAt=day===0?firstRainAt:Math.round((540+roll(2)*525)/5)*5;
            const end=rainAt+90+Math.round(roll(3)*50);
            add(rainAt-65,'cloudy');
            add(rainAt,'rain',.48);
            if(day===0||roll(4)>.4) add(rainAt+35,'rain',1);
            add(end,'wet');
            add(end+60+Math.round(roll(5)*30),roll(6)>.38?'clear':'cloudy');
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
        const fade=(from,to)=>{
            const t=Math.max(0,Math.min(1,(current-from)/(to-from)));
            return t*t*(3-2*t);
        };
        const darkness=1-fade(320,450)+fade(1045,1185);
        const sunrise=fade(320,365)*(1-fade(365,450));
        const sunset=fade(1035,1090)*(1-fade(1090,1185));
        const streetlight=1-fade(330,410)+fade(1080,1165);
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
            rain,darkness,sunrise,sunset,streetlight,forecast:forecast&&{minute:forecast.minute,label:weatherLabel(forecast)},stallRained};
    }

    function clockText(minute){
        const total=Math.floor(minute+1e-7);
        const today=total%dayMinutes;
        return String(Math.floor(today/60)).padStart(2,'0')+':'+String(today%60).padStart(2,'0');
    }

    return {minuteNow,speedNow,setSpeed,speeds,conditions,clockText,dayText,dayMinutes,firstRainAt,random,worldSeed};
})();
