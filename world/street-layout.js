const PanpanStreet=(()=>{
    const width=2432,height=941;
    // Foot positions on the existing map image. Branches share named junctions.
    const points={
        west:[563,686],secondhand:[630,653],shopCorner:[682,660],westLane:[739,686],
        treeLane:[819,705],square:[901,718],alley:[943,744],
        curb:[978,696],backOfStall:[1058,668],backLane:[1147,643],
        homeCorner:[1238,626],home:[1254,605],crossing:[1347,606],
        leftOfRoof:[1370,547],northLane:[1384,484],bend:[1374,423],
        loadingLane:[1404,376],loadingStep:[1504,385],pack:[1597,389],
        bikeCorner:[1368,653],drain:[1396,708],noodleCorner:[1455,765],
        noodle:[1561,799],stallCorner:[1364,809],marketFront:[1310,874],
        marketWalk:[1190,892],stall:[1100,889],marketWest:[1006,895],westStallLane:[979,790],fortune:[1252,868],
    };
    const lanes=[
        ['west','shopCorner','westLane','treeLane','square','alley'],
        ['secondhand','shopCorner'],
        ['square','curb','backOfStall','backLane','homeCorner','crossing'],
        ['homeCorner','home'],
        ['crossing','leftOfRoof','northLane','bend','loadingLane','loadingStep','pack'],
        ['crossing','bikeCorner','drain','noodleCorner','noodle'],
        ['drain','stallCorner','marketFront','marketWalk','stall'],
        ['noodleCorner','stallCorner'],
        ['stall','marketWest','westStallLane','alley'],
        ['marketFront','fortune'],
    ];
    const gates={home:'home',pack:'pack',noodle:'noodle',stall:'stall',secondhand:'secondhand',fortune:'fortune',alley:'alley',away:'west'};
    const neighbors=Object.fromEntries(Object.keys(points).map(id=>[id,[]]));
    for(const lane of lanes){
        for(let i=1;i<lane.length;i++){
            neighbors[lane[i-1]].push(lane[i]);
            neighbors[lane[i]].push(lane[i-1]);
        }
    }
    const anchors=Object.fromEntries(Object.entries(points).map(([id,[x,y]])=>[
        id,[x/width*100,y/height*100,7.3+(y-350)*.009],
    ]));

    function routeBetween(start,end){
        const parent=new Map([[start,null]]);
        const queue=[start];
        for(const id of queue){
            if(id===end) break;
            for(const next of neighbors[id]){
                if(parent.has(next)) continue;
                parent.set(next,id);
                queue.push(next);
            }
        }
        const path=[];
        for(let id=end;id;id=parent.get(id)) path.unshift(anchors[id]);
        return path;
    }

    function route(from,to){
        const end=gates[to];
        if(!end) return [];
        if(!Array.isArray(from)) return gates[from]?routeBetween(gates[from],end):[];
        const x=from[0]*width/100,y=from[1]*height/100;
        let nearest;
        for(const lane of lanes){
            for(let i=1;i<lane.length;i++){
                const a=points[lane[i-1]],b=points[lane[i]];
                const dx=b[0]-a[0],dy=b[1]-a[1];
                const t=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy)));
                const px=a[0]+dx*t,py=a[1]+dy*t;
                const distance=Math.hypot(x-px,y-py);
                if(!nearest||distance<nearest.distance){
                    nearest={distance,foot:[px/width*100,py/height*100,from[2]],ends:[lane[i-1],lane[i]]};
                }
            }
        }
        const distance=path=>path.slice(1).reduce((total,point,i)=>total+
            Math.hypot((point[0]-path[i][0])*width,(point[1]-path[i][1])*height),0);
        const [a,b]=nearest.ends.map(id=>[nearest.foot,...routeBetween(id,end)]);
        const path=distance(a)<=distance(b)?a:b;
        return [from,...path];
    }

    const foregrounds=[
        // Only the side of a prop facing the viewer can hide a walker.
        {bounds:[610,910,860],outline:[[613,784],[672,780],[677,751],[693,739],[753,733],[780,742],[789,755],
            [782,826],[800,825],[908,845],[893,868],[668,900],[625,872]]},
        {bounds:[1014,1188,745],outline:[[1028,707],[1041,686],[1147,667],[1183,703],[1186,713],
            [1179,719],[1148,725],[1113,731],[1099,735],[1058,727],[1028,719]]},
        {bounds:[1177,1335,728],outline:[[1179,684],[1193,665],[1293,644],[1331,682],[1331,695],
            [1304,703],[1277,704],[1230,714],[1192,713],[1179,693]]},
        {bounds:[1350,1505,527],outline:[[1395,423],[1452,413],[1527,421],[1622,416],[1634,439],[1539,474],
            [1480,487],[1427,479],[1412,490],[1398,485]]},
    ];

    return {width,height,route,foregrounds,rest:anchors.alley};
})();
