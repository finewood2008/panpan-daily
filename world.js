const PanpanGame = (() => {
    const scenes = {
        alley: {name:'城中村的巷子', short:'巷子', image:'alley', detail:'深圳 · 城中村', approach:[[30,85],[33,83.5],[35.5,81.5]]},
        home: {name:'潘潘的小屋', short:'小屋', image:'room-raised-computer-stool', detail:'城中村 · 二楼靠窗', approach:[[28,85],[34,83],[42,81]], entry:{
            bounds:[648,222,300,375], outline:'0 15%,75% 0,95% 7%,100% 83%,75% 96%,17% 100%,5% 69%', view:[791,325,325,245],
        }},
        pack: {name:'巷尾打包点', image:'inside-pack', center:46, detail:'城中村 · 巷尾', approach:[[9,82],[24,84],[38,83],[43,81]], entry:{
            bounds:[1100,132,363,272], outline:'0 20%,41% 0,100% 18%,100% 98%,62% 100%,0 87%', view:[1284,274,420,315],
        }},
        noodle: {name:'小面馆', image:'inside-noodle', center:64, detail:'城中村 · 红棚下面', approach:[[10,86],[18,92],[30,94],[43,91],[52,86]], entry:{
            bounds:[1166,501,391,333], outline:'0 2%,48% 0,94% 17%,100% 88%,76% 100%,24% 88%,7% 70%', view:[1360,665,440,374],
        }},
        stall: {name:'路口杂货摊', image:'inside-stall-no-stool', center:48, detail:'城中村 · 路口', approach:[[94,66],[93,79],[89,91],[82,94],[75,92]], entry:{
            bounds:[631,627,330,247], outline:'0 23%,77% 0,98% 16%,100% 88%,27% 100%,0 88%', view:[796,750,365,285],
        }},
    };
    scenes.bathroom={name:'卫生间',image:'inside-bathroom',center:51,detail:'潘潘的小屋',approach:[[17,91],[22,92],[26,91]]};
    const computerSeat={approach:[[28,85],[32,81]],at:[29,74,34]};
    const windowSeat={approach:[scenes.home.approach[0],[49,84],[61,82],[69,76]],at:[70,73,36]};
    const bed={floor:[46.6,69.8,35],pillow:[41,48.5,21]};
    const windowAnchor=[69.4,64.5,34];
    const noodleSeat={approach:[[10,86],[18,92],[30,94],[38,90],[44,88]],at:[45.2,85,39]};
    const homeActivities={
        sleep:{pose:'sleep',label:'睡着了',line:'灯留一盏。今天到这里。',anchor:bed.floor},
        breakfast:{pose:'seated-noodle',label:'坐着吃早饭',line:'先吃口东西，今天再试一次。',anchor:[29,65,29],seat:computerSeat},
        tidy:{pose:'tidy',label:'在擦桌子',line:'桌面腾出来一点。够放明天的账了。',anchor:[60.5,61.5,35]},
        exercise:{pose:'exercise',label:'在做深蹲',line:'再做两个。刚才也这么说的。',anchor:[49,80,38]},
        tea:{pose:'seated-tea',label:'坐在窗前喝茶',line:'等它凉一凉。今天还有一点时间。',anchor:windowAnchor,seat:windowSeat},
        ledger:{pose:'seated-ledger',label:'坐在窗前记账',line:'先把今天的账记完。明天的账，明天再怕。',anchor:windowAnchor,seat:windowSeat},
        gaming:{pose:'gaming',label:'坐在电脑前玩游戏',line:'再跳过这栋楼就存档。',anchor:[477/1672*100,621.4/941*100,295.68/941*100],seat:computerSeat},
        read:{pose:'seated-read',label:'坐在窗前翻书',line:'再看一页。上一页也是这么说的。',anchor:windowAnchor,seat:windowSeat},
        window:{pose:'seated-window',label:'坐在窗边发呆',line:'没在想什么。或者想得太多。',anchor:windowAnchor,seat:windowSeat},
    };
    for(const activity of Object.values(homeActivities)) activity.place='home';
    // Anchor coordinates are foot X, foot Y and character height, as percentages of the scene art.
    const shifts = [
        {from:0,...homeActivities.sleep,line:'睡着了。账还在，人先下班。'},
        {from:6.5,...homeActivities.breakfast},
        {from:8.2,...homeActivities.tidy},
        {from:9, place:'pack', pose:'parcel', label:'在打包', line:'贴好这一箱，再想下一箱。', anchor:[46,78,40]},
        {from:12, place:'noodle', pose:'seated-noodle', label:'坐着吃面', line:'先吃饭。发财可以再等十五分钟。', anchor:[45.3,79.5,37], seat:noodleSeat},
        {from:13.5, place:'stall', pose:'cable', label:'在整理杂货', line:'两根一模一样的数据线。总有一根是坏的。', anchor:[70,88,45]},
        {from:16.5,...homeActivities.tidy},
        {from:17.15,...homeActivities.tea},
        {from:18,...homeActivities.ledger},
        {from:19.25,...homeActivities.tea},
        {from:20,...homeActivities.gaming},
        {from:21.45,...homeActivities.read},
        {from:22.4,...homeActivities.window},
        {from:23,...homeActivities.sleep},
    ];

    const sceneBits={
        home:[
            {pose:'rag-crown',label:'抹布加冕',anchor:[57,74,37],thoughts:['朕的江山，就这一张桌。','免礼。等我擦完这边。'],beat:1.5},
            {pose:'wobble',label:'单脚站不稳',anchor:[49,78,38],thoughts:['差一点。差的是平衡。','今天练的是紧急落地。'],beat:1.55},
            {pose:'receipt-shock',label:'被小票吓一跳',anchor:[58,74,37],thoughts:['这张小票怎么比我还高？','合上，金额就看不见了。'],beat:1.5},
            {pose:'spoon-concert',label:'拿木勺开演唱会',anchor:[51,78,38],thoughts:['今晚巡演，就这一间。','下一首献给我的电饭锅。'],beat:1.65},
        ],
        pack:[
            {pose:'stuck-tape',label:'胶带黏手',anchor:[46,78,40],thoughts:['这箱还没封，我先封上了。','给我剪一刀。剪胶带。'],beat:1.45},
            {pose:'parcel-check',label:'给纸箱做质检',anchor:[46,78,40],thoughts:['听着挺结实。通过。','喂？里面的货说它准备好了。'],beat:2.05},
        ],
        noodle:[
            {pose:'hot-noodles',label:'吹面吹累了',anchor:[56.5,81,41],thoughts:['先晾凉。它比我有脾气。','这碗吃之前还得热身。'],beat:1.55},
            {pose:'long-noodle',label:'面条怎么这么长',anchor:[56.5,81,41],thoughts:['这根面是按米卖的？','碗里还有半根在排队。'],beat:1.6},
        ],
        stall:[
            {pose:'cable-call',label:'把插头当电话',anchor:[70,88,45],thoughts:['喂？有电就吱一声。','别挂，我换个插座。'],beat:1.6},
            {pose:'sales-bow',label:'过度热情的推销',anchor:[70,88,45],thoughts:['老板不在。我就是老板。','买不买都行，我先鞠一个。'],beat:1.65},
        ],
        alley:[
            {pose:'leaf-salute',label:'给落叶敬礼',anchor:[37,81,12],thoughts:['报告，今天掉下来一个秋天。','辛苦了，今天就落到这儿。'],beat:1.6},
            {pose:'wrong-turn',label:'走错了也要有气势',anchor:[37,81,12],thoughts:['就当我是在巡逻。','抄近路。就是稍微远了一点。'],beat:1.6},
        ],
        bathroom:[
            {pose:'shower-cap',label:'浴帽宇航员',anchor:[30.5,88.5,37],thoughts:['浴室一号，准备发射。','收到。着陆点是洗手池。'],beat:1.6},
            {pose:'soap-moustache',label:'泡沫假胡子',anchor:[30.5,88.5,37],thoughts:['这样看上去成熟多了吧？','留了三秒的胡子，白了。'],beat:1.6},
        ],
    };
    for(const [place,bits] of Object.entries(sceneBits)) for(const bit of bits){
        bit.place=place;
        bit.thought=bit.thoughts[0];
    }
    const alleyIdle={place:'alley',pose:'idle',label:'在巷子里转悠',line:'绕个弯再过去。',anchor:sceneBits.alley[0].anchor};
    // Each pair is the earliest and latest game minute a skit can start.
    const bitWindows={
        home:[[434,451],[501,510],[929,956],[1042,1062],[1099,1130],[1170,1186],[1310,1330]],
        pack:[[569,605],[647,691]],
        noodle:[[735,755],[779,794]],
        stall:[[826,840],[905,947]],
        alley:[[524,528],[986,992]],
    };
    const alleyVisits=[[521,540],[980,1011]];
    const walks=[
        {name:'河边',title:'河边的风',line:'看见一只白鹭站在桥下。我站了一会儿，它比我更有耐心。',image:'home-window-view'},
        {name:'老街',title:'巷口的烤红薯',line:'走到老街，闻见烤红薯。带回来一个，到家时还暖着。',image:'alley'},
        {name:'街角小公园',title:'公园里的凳子',line:'长凳晒得暖暖的。我坐到树影挪过了鞋尖才回来。',image:'neighborhood-no-stool'},
    ];
    const bathroomVisits=[
        {from:467,to:474,action:'shower',label:'在洗澡'},
        {from:1370,to:1378,action:'wash',label:'在洗漱'},
    ];
    const bitWindow=1.5;
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
            [16.25,'第一根数据线','从抽屉里翻出一根还能用的数据线，给它绕整齐了。'],
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
        const to=from+22+Math.floor(random(worldSeed,day,290)*33);
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
        else if(usual.place==='stall'&&outside.stallRained) shift=rainyAfternoon;

        const walk=plannedWalk(day);
        if(walk&&today>=walk.from&&today<walk.to){
            return {...outside,place:'away',pose:'away',label:'去'+walk.name+'走走',returnAt:day*dayMinutes+walk.to,
                line:'我出去走走。回来再跟你说看到了什么。'};
        }
        const bathroom=bathroomVisits.find(({from,to})=>today>=from&&today<to);
        if(bathroom){
            const bitAt=day*dayMinutes+bathroom.from+3;
            const bit=bathroom.action==='wash'&&minute>=bitAt&&minute<bitAt+bitWindow?
                chooseBit('bathroom',day,worldSeed):undefined;
            return {...outside,place:'bathroom',pose:bathroom.action==='wash'?'idle':'shower',
                bathroomAction:bathroom.action==='shower'?'shower':undefined,label:bathroom.label,
                anchor:sceneBits.bathroom[0].anchor,line:'一会儿就出来。',bit,bitAt};
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
            if(closedEarly&&start+990<=minute) entries.push({at:start+990,title:'提前收工',line:'下雨了，把杂货收好就回了小屋。桌上的茶还热着。',image:'inside-stall-no-stool'});
            const walk=plannedWalk(d);
            if(walk&&start+walk.to<=minute) entries.push({at:start+walk.to,title:walk.title,line:walk.line,image:walk.image,walk:true});
        }
        return entries.sort((a,b)=>b.at-a.at);
    }

    return {scenes,bed,sceneBits,snapshot,journal};
})();
