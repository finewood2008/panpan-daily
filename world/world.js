const PanpanGame = (() => {
    // Follow the floor edge past the slippers and the front of the plant, then turn into the room.
    const homeDoor=[[7.2,72],[7.7,75.7],[8.8,79],[11.7,80.6],[13.9,82.15],[15.6,84.9],
        [16.8,86.25],[18.3,87.4],[20.5,88.45],[22.6,88.65],[25.3,87.2],[27.5,84.7]];
    const bathroomThreshold=[80.4,90.4,34];
    const bathroomHall=[[69,83],[74,87]];
    const scenes = {
        alley: {name:'城中村的巷子', short:'巷子', image:'alley', detail:'深圳 · 城中村', approach:PanpanStreet.route('away','alley').slice(0,-1)},
        home: {name:'潘潘的小屋', short:'小屋', image:'room-bathroom-passage', detail:'城中村 · 二楼靠窗', approach:[...homeDoor,[34,84],[42,81]], entry:{
            bounds:[648,222,300,375], outline:'0 15%,75% 0,95% 7%,100% 83%,75% 96%,17% 100%,5% 69%', view:[791,325,325,245],
        }},
        pack: {name:'巷尾杂货铺', image:'inside-variety-shop', center:46, detail:'城中村 · 巷尾', approach:[[9,82],[19,91],[31,92],[39,87],[43,81]], entry:{
            bounds:[1100,132,363,272], outline:'0 20%,41% 0,100% 18%,100% 98%,62% 100%,0 87%', view:[1284,274,420,315],
        }},
        noodle: {name:'小面馆', image:'inside-noodle', center:64, detail:'城中村 · 红棚下面', approach:[[10,86],[18,92],[30,94],[43,91],[52,86]], entry:{
            bounds:[1166,501,391,333], outline:'0 2%,48% 0,94% 17%,100% 88%,76% 100%,24% 88%,7% 70%', view:[1360,665,440,374],
        }},
        stall: {name:'路口二手漫画摊', image:'inside-comic-stall', center:48, detail:'城中村 · 路口', approach:[[94,66],[93,79],[89,91],[82,94],[75,92]], entry:{
            bounds:[642,650,165,240], outline:'0 23%,77% 0,98% 16%,100% 88%,27% 100%,0 88%', view:[725,770,260,310],
        }},
        secondhand: {name:'榕树旁大头贴', image:'inside-photo-studio', center:58, detail:'城中村 · 榕树旁的青棚', approach:[[5,92],[17,87],[35,86],[48,86]], entry:{
            bounds:[75,405,264,246], outline:'0 16%,84% 0,98% 33%,99% 82%,34% 100%,2% 83%', view:[203,531,360,295],
        }},
        fortune: {name:'路口算命摊', image:'inside-road-fortune-stall', center:56, detail:'城中村 · 漫画摊旁', approach:[[94,66],[93,79],[88,89],[77,91]], entry:{
            bounds:[808,640,150,224], outline:'1% 19%,75% 0,100% 17%,100% 82%,28% 100%,1% 82%', view:[882,752,260,300],
        }},
    };
    scenes.bathroom={name:'卫生间',image:'inside-bathroom',center:24,detail:'潘潘的小屋',approach:[[11.55,92.25],[18.8,93.8],[24.8,94]]};
    const computerSeat={approach:[...homeDoor,[32,81]],at:[29.7,78,34]};
    const windowSeat={approach:[...homeDoor,[41,85],[49,84],[61,82],[69,76]],at:[70,73,36]};
    const bed={floor:[46.6,69.8,35],pillow:[41,48.5,21]};
    const windowAnchor=[69.4,64.5,34];
    const noodleSeat={approach:[[10,86],[18,93],[31,95],[40,91]],at:[47,88.4,39]};
    const homeActivities={
        breakfast:{pose:'seated-noodle',label:'坐着吃早饭',line:'先吃口东西，今天再试一次。',anchor:[29,65,29],seat:computerSeat},
        tidy:{pose:'tidy',label:'在擦桌子',line:'桌面腾出来一点。够放明天的账了。',anchor:[60.5,61.5,35]},
        exercise:{pose:'exercise',label:'在做深蹲',line:'再做两个。刚才也这么说的。',anchor:[49,80,38]},
        tea:{pose:'seated-tea',label:'坐在窗前喝茶',line:'等它凉一凉。今天还有一点时间。',anchor:windowAnchor,seat:windowSeat},
        ledger:{pose:'seated-ledger',label:'坐在窗前记账',line:'先把今天的账记完。明天的账，明天再怕。',anchor:windowAnchor,seat:windowSeat},
        read:{pose:'seated-read',label:'坐在窗前翻书',line:'再看一页。上一页也是这么说的。',anchor:windowAnchor,seat:windowSeat},
        window:{pose:'seated-window',label:'坐在窗边发呆',line:'没在想什么。或者想得太多。',anchor:windowAnchor,seat:windowSeat},
        sleep:{pose:'sleep',label:'睡着了',line:'灯留一盏。今天到这里。',anchor:bed.floor},
    };
    for(const activity of Object.values(homeActivities)) activity.place='home';
    const noodleMeal={place:'noodle',pose:'seated-noodle',anchor:[46.8,71.1,37],seat:noodleSeat};
    const fortuneVisit={place:'fortune',pose:'idle',stallMode:'fortune',label:'在等人抽签',
        line:'说句近况。签筒就在这儿。',anchor:[70,88,45]};
    const photoVisit={place:'secondhand',pose:'idle',label:'在大头贴机旁',
        line:'站近一点。镜头在屏幕上头。',anchor:[60,86,38]};
    const toiletVisit={place:'bathroom',pose:'idle',label:'在上厕所',anchor:[35.5,94,37],line:'一会儿就出来。'};
    // Anchor coordinates are foot X, foot Y and character height, as percentages of the scene art.
    const shifts = [
        {from:0,...homeActivities.sleep,line:'睡着了。账还在，人先下班。'},
        {from:6.5,...homeActivities.breakfast},
        {from:8.2,...homeActivities.tidy},
        {from:9, place:'pack', pose:'parcel', label:'在给杂货铺的订单打包', line:'这箱是杯子，贴个朝上的箭头。', anchor:[46,78,40]},
        {from:12,...noodleMeal,label:'坐着吃面',line:'先吃饭。发财可以再等十五分钟。'},
        {from:13.5, place:'stall', stallMode:'comic', pose:'idle', label:'在看摊', line:'这本封面卷了点。里面还能看。', anchor:[70,88,45]},
        {from:16.5,...homeActivities.tidy},
        {from:17.15,...homeActivities.tea},
        {from:18,...noodleMeal,label:'在吃晚饭',line:'晚饭也吃面。老板给我多舀了一勺汤。'},
        {from:19.25,...homeActivities.ledger},
        {from:20,...homeActivities.exercise},
        {from:21.45,...homeActivities.read},
        {from:22.4,...homeActivities.window},
        {from:23,...homeActivities.sleep},
    ];

    const sceneBits={
        home:[
            {pose:'rag-crown',label:'抹布加冕',anchor:[59,60,40],thoughts:['朕的江山，就这一张桌。','免礼。等我擦完这边。'],beat:1.5},
            {pose:'wobble',label:'单脚站不稳',anchor:[49,78,38],thoughts:['差一点。差的是平衡。','今天练的是紧急落地。'],beat:1.55},
            {pose:'receipt-shock',label:'被小票吓一跳',anchor:[59.7,63,40],thoughts:['这张小票怎么比我还高？','合上，金额就看不见了。'],beat:1.5},
            {pose:'spoon-concert',label:'拿木勺开演唱会',anchor:[51,78,38],thoughts:['今晚巡演，就这一间。','下一首献给我的电饭锅。'],beat:1.65},
            {pose:'alarm-hush',label:'捂住闹钟',anchor:[38,79,38],thoughts:['小点声，我已经起来了。','这次算我先醒。'],beat:1.42},
            {pose:'dumbbell-brag',label:'举哑铃举到发抖',anchor:[76.3,83,38],thoughts:['看着不重。看走眼了。','这回就练到它放过我。'],beat:1.7},
        ],
        pack:[
            {pose:'stuck-tape',label:'胶带黏手',anchor:[46,78,40],thoughts:['这箱还没封，我先封上了。','给我剪一刀。剪胶带。'],beat:1.45},
            {pose:'parcel-check',label:'给纸箱做质检',anchor:[46,78,40],thoughts:['听着挺结实。通过。','喂？里面的货说它准备好了。'],beat:2.05},
            {pose:'backward-stamp',label:'把朝上的箭头盖反',anchor:[46,78,40],thoughts:['箱子转过去，箭头就对了。','得了，再盖一个向上的。'],beat:1.55},
            {pose:'parcel-pile',label:'接住快歪的纸箱',anchor:[46,78,40],thoughts:['差点发到地板那一单。','上面的，排好队。'],beat:1.5},
        ],
        noodle:[
            {pose:'hot-noodles',label:'吹面吹累了',anchor:[56.5,81,41],thoughts:['先晾凉。它比我有脾气。','这碗吃之前还得热身。'],beat:1.55},
            {pose:'long-noodle',label:'面条怎么这么长',anchor:[56.5,81,41],thoughts:['这根面是按米卖的？','碗里还有半根在排队。'],beat:1.6},
            {pose:'uneven-chopsticks',label:'发现筷子一长一短',anchor:[63,91,41],thoughts:['一根夹面，一根负责加油。','短的这根已经吃饱了。'],beat:1.5},
            {pose:'chili-flinch',label:'被一粒辣椒辣到',anchor:[56.5,81,41],thoughts:['老板，这颗辣椒有点意见。','我先缓一下。嘴巴在开会。'],beat:1.52},
        ],
        stall:[
            {pose:'sales-bow',label:'给来翻漫画的人鞠躬',anchor:[70,88,45],thoughts:['随便翻，书角原来就是卷的。','我先鞠一个。你慢慢挑。'],beat:1.65},
            {pose:'comic-hero',label:'偷偷摆漫画英雄姿势',anchor:[70,88,45],thoughts:['变身！先等客人翻完这本。','这招叫认真看摊。'],beat:1.65},
        ],
        alley:[
            {pose:'leaf-salute',label:'给落叶敬礼',anchor:PanpanStreet.rest,thoughts:['报告，今天掉下来一个秋天。','辛苦了，今天就落到这儿。'],beat:1.6},
            {pose:'wrong-turn',label:'走错了也要有气势',anchor:PanpanStreet.rest,thoughts:['就当我是在巡逻。','抄近路。就是稍微远了一点。'],beat:1.6},
            {pose:'umbrella-flip',label:'伞被风吹翻',anchor:[34.5,74,10.4],thoughts:['风说这把伞要反着用。','捡起一把伞，试出了个碗。'],beat:1.52},
            {pose:'guard-groceries',label:'紧紧护住买来的橘子',anchor:[50.8,65.9,10.1],thoughts:['别盯着看，就这一个。','到家了，先放门口。'],beat:1.55},
        ],
        bathroom:[
            {pose:'shower-cap',label:'浴帽宇航员',anchor:[30.5,88.5,37],thoughts:['浴室一号，准备发射。','收到。着陆点是洗手池。'],beat:1.6},
            {pose:'soap-moustache',label:'泡沫假胡子',anchor:[25,88.5,37],thoughts:['这样看上去成熟多了吧？','留了三秒的胡子，白了。'],beat:1.6},
            {pose:'toothbrush-guitar',label:'拿牙刷弹空气吉他',anchor:[25,88.5,37],thoughts:['今晚返场，只刷一首。','这段还有个漱口的独奏。'],beat:1.55},
        ],
        secondhand:[
            {pose:'photo-pose',label:'拍照前练习表情',anchor:[60,86,38],thoughts:['再笑一点。再……算了，这样吧。','倒计时还没开始，我已经笑累了。'],beat:1.6},
            {pose:'photo-wave',label:'对镜头害羞打招呼',anchor:[60,86,38],thoughts:['镜头，你先别拍。','打招呼也算准备好了吧。'],beat:1.6},
        ],
        fortune:[
            {pose:'fortune-think',label:'认真想一想',anchor:[70,88,45],thoughts:['天机稍等，我也想想。','这签不错。先让我看懂。'],beat:1.6},
            {pose:'fortune-shrug',label:'假装看透一切',anchor:[70,88,45],thoughts:['掐指一算，今天适合吃饭。','答案都有了，就是字有点小。'],beat:1.6},
        ],
    };
    for(const [place,bits] of Object.entries(sceneBits)) for(const bit of bits){
        bit.place=place;
        bit.thought=bit.thoughts[0];
    }
    const activitiesByScene={
        home:Object.values(homeActivities),
        pack:[shifts.find(shift=>shift.place==='pack')],
        noodle:[shifts.find(shift=>shift.place==='noodle')],
        stall:[shifts.find(shift=>shift.place==='stall')],
        secondhand:[photoVisit],
        fortune:[fortuneVisit],
    };
    const actionGroups=Object.entries(sceneBits).map(([id,bits])=>({
        title:scenes[id].name,
        activities:[...(activitiesByScene[id]??[]),...bits],
    }));
    const alleyIdle={place:'alley',pose:'idle',label:'在巷子里转悠',line:'绕个弯再过去。',anchor:sceneBits.alley[0].anchor};
    const preparing={...photoVisit,label:'在看大头贴机'};
    const shopVisit={from:1036,to:1072};
    // Each pair is the earliest and latest game minute a skit can start.
    const bitWindows={
        home:[[412,424],[495,498],[929,956],[1042,1052],[1160,1168],[1230,1260],[1310,1328]],
        pack:[[569,605],[647,691]],
        noodle:[[735,755],[779,794]],
        stall:[[826,840],[905,947]],
        alley:[[524,528],[988,992]],
        secondhand:[[1042,1050]],
    };
    const alleyVisits=[[521,540],[980,1010]];
    const walks=[
        {name:'河边',title:'河边的风',line:'看见一只白鹭站在桥下。我站了一会儿，它比我更有耐心。',image:'home-window-view'},
        {name:'老街',title:'巷口的烤红薯',line:'走到老街，闻见烤红薯。带回来一个，到家时还暖着。',image:'alley'},
        {name:'街角小公园',title:'公园里的凳子',line:'长凳晒得暖暖的。我坐到树影挪过了鞋尖才回来。',image:'neighborhood-no-stool'},
    ];
    const bathroomVisits=[
        {from:447,to:477,action:'shower',label:'在洗澡'},
        {from:1184,to:1200,action:'toilet',label:toiletVisit.label},
        {from:1348,to:1380,action:'wash',label:'在洗漱'},
    ];
    const bitWindow=12;
    const sceneSlots=Object.keys(sceneBits);
    function chooseBit(place,count,seed){
        const bits=sceneBits[place];
        const slot=sceneSlots.indexOf(place)*16+192;
        const round=Math.floor(count/bits.length);
        const shuffle=cycle=>bits.slice().sort((a,b)=>random(seed,cycle,slot+bits.indexOf(a))-random(seed,cycle,slot+bits.indexOf(b)));
        const order=shuffle(bits.length>2?round:0);
        if(bits.length>2&&round&&order[0]===shuffle(round-1).at(-1)) [order[0],order[1]]=[order[1],order[0]];
        const bit=order[count%bits.length];
        const offset=Math.floor(random(seed,0,slot+8+bits.indexOf(bit))*bit.thoughts.length);
        return {...bit,thought:bit.thoughts[(round+offset)%bit.thoughts.length]};
    }
    const messages = [
        [
            [10.5,'手背上的胶带','找了半天胶带，原来一直粘在手背上。'],
            [12.5,'中午的面','吃到碗底才想起来，今天还没和人说过几句话。'],
            [19.25,'杯子下面','把收据压在杯子下面。明天醒了再看。'],
        ],
        [
            [10.5,'贴歪的标签','这箱贴歪了。地址认得出来，人也可以走点弯路。'],
            [12.5,'多煮了一颗蛋','面里加了一颗蛋。今天的运气先吃掉了。'],
            [19.25,'湿鞋子','洗过的鞋晾在门口。希望明早就干了。'],
        ],
        [
            [10.5,'靠墙的大箱子','最重的箱子没急着搬。放了一会儿，也没有自己走。'],
            [16.25,'提前收工','下雨了。把桌子擦干净，今天早点收工。'],
            [19.25,'窗上的雨','雨点把窗户打得挺热闹。屋里倒是很安静。'],
        ],
        [
            [10.5,'今天慢一点','胶带拉长一点，一次就够。今天就学会这件事。'],
            [16.25,'书里的一页','整理旧漫画时翻到张书签。放回原来那一页了。'],
            [19.25,'零钱','抽屉里那点零钱，刚好够明天加个蛋。'],
        ],
        [
            [10.5,'一张旧报纸','箱底垫了张旧报纸。标题已经过期，纸还可以用。'],
            [12.5,'一把香菜','面里加了一把香菜。第一口有点多，最后一口刚刚好。'],
            [19.25,'桌灯','灯的开关有点松。拍了一下，它倒是又亮了。'],
        ],
        [
            [10.5,'今天没那么多件','件少一点，就慢一点。到点还是要吃饭。'],
            [16.25,'路过的人','坐在窗边听见楼下有人问路。过了一会儿，那个人又走了回来。'],
            [19.25,'把窗开一点','屋里有湿纸箱味。开了半扇窗，进来一点饭香。'],
        ],
    ];
    const mod=(n,m)=>((n%m)+m)%m;
    const {conditions,dayMinutes,random,worldSeed}=PanpanTime;

    function plannedWalk(day){
        if(mod(day,3)===2) return undefined;
        const from=mod(day,4)<2?1010:1040;
        const to=Math.min(1080,from+22+Math.floor(random(worldSeed,day,290)*33));
        if(conditions(day*dayMinutes+from,worldSeed).weather==='rain') return undefined;
        return {...walks[mod(day,walks.length)],from,to};
    }

    function snapshot(minute){
        const outside=conditions(minute,worldSeed);
        const {day,hour}=outside;
        const today=minute-day*dayMinutes;
        const usual=shifts.findLast(item=>item.from<=hour);
        let shift=usual.from===17.15&&mod(day,3)===1?homeActivities.exercise:usual;
        if(alleyVisits.some(([from,to])=>today>=from&&today<to)&&!outside.stallRained&&outside.weather!=='rain') shift=alleyIdle;
        else if(usual.stallMode==='comic'&&outside.stallRained) shift=rainyAfternoon;

        const shopping=mod(day,3)===2&&today>=shopVisit.from&&today<shopVisit.to;
        if(shopping) shift=preparing;
        const walk=plannedWalk(day);
        if(walk&&today>=walk.from&&today<walk.to){
            return {...outside,place:'away',pose:'away',label:'去'+walk.name+'走走',returnAt:day*dayMinutes+walk.to,
                line:'我出去走走。回来再跟你说看到了什么。'};
        }
        const bathroom=bathroomVisits.find(({from,to})=>today>=from&&today<to);
        if(bathroom){
            if(bathroom.action==='toilet') return {...outside,...toiletVisit};
            const bitAt=day*dayMinutes+bathroom.from+10;
            const bit=bathroom.action==='wash'&&minute>=bitAt&&minute<bitAt+bitWindow?
                chooseBit('bathroom',day,worldSeed):undefined;
            return {...outside,place:'bathroom',pose:bathroom.action==='wash'?'idle':'shower',
                bathroomAction:bathroom.action==='shower'?'shower':undefined,label:bathroom.label,
                anchor:sceneBits.bathroom[1].anchor,line:'一会儿就出来。',bit,bitAt};
        }

        const windows=bitWindows[shift.place];
        const slot=sceneSlots.indexOf(shift.place)*16+32;
        const starts=windows?.map(([from,to],i)=>from+(to-from)*random(worldSeed,day,slot+i));
        const index=starts?.findIndex(at=>today>=at&&today<at+bitWindow)??-1;
        if(index<0) return {...shift,...outside};
        const bit=chooseBit(shift.place,day*windows.length+index,worldSeed);
        return {...shift,...outside,bit,bitAt:day*dayMinutes+starts[index]};
    }
    const rainyAfternoon={...homeActivities.tea,label:'收摊回家，在喝茶',line:'下雨了，今天早点收摊。'};

    function journal(minute){
        const day=Math.floor(minute/dayMinutes);
        const entries=[];
        for(let d=Math.max(0,day-4);d<=day;d++){
            const start=d*dayMinutes;
            const closedEarly=conditions(start+990,worldSeed).stallRained;
            for(const [hour,title,line] of messages[mod(d,messages.length)]){
                const at=start+hour*60;
                if(at>minute||title==='提前收工') continue;
                if(title==='窗上的雨'&&!closedEarly){
                    entries.push({at,title:'窗边坐了会儿',line:'楼下有人喊收衣服。我把茶喝完才起来。',image:scenes.home.image});
                }else{
                    const location=hour<12?'pack':hour<14?'noodle':'home';
                    entries.push({at,title,line,image:scenes[location].image});
                }
            }
            if(closedEarly&&start+990<=minute&&d!==0) entries.push({at:start+990,title:'提前收工',line:'下雨了，把漫画收好就回了小屋。桌上的茶还热着。',image:scenes.stall.image});
            const walk=plannedWalk(d);
            if(walk&&start+walk.to<=minute) entries.push({at:start+walk.to,title:walk.title,line:walk.line,image:walk.image,walk:true});
            if(mod(d,3)===2&&start+shopVisit.to<=minute) entries.push({at:start+shopVisit.to,title:'贴一张在镜子边',line:'屏幕说还有三秒。我刚站好，才发现它已经拍了。',image:scenes.secondhand.image});
        }
        return entries.sort((a,b)=>b.at-a.at);
    }

    return {scenes,bed,sceneBits,actionGroups,snapshot,journal,fortuneVisit,photoVisit,toiletVisit,bathroomThreshold,bathroomHall};
})();
