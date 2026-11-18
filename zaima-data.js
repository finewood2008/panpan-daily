const Zaima = (() => {
    // Shenzhen dates for the pilot. Rehearsals are independent from this window.
    const start = Date.parse('2026-11-15T22:40:00+08:00');
    const end = Date.parse('2026-11-15T23:00:00+08:00');
    const noteAt = Date.parse('2026-11-16T12:35:00+08:00');
    const opening = '刚发完「在吗」，老板就回了个「？」。';
    const responses = {
        water:{line:'谢谢。你别看手机。',direction:'他把杯子往里挪了挪，手机仍扣着。',panel:'4',message:''},
        ask:{line:'有道理。你等我先把这句删了。',direction:'他打出半句请假的话，拇指又挪回删除键。',panel:'2',message:'我明天想请——'},
    };
    function isLive(minute, shift) {
        return minute >= PanpanTime.minuteNow(start)
            && minute < PanpanTime.minuteNow(end)
            && shift.place === 'home' && shift.pose !== 'sleep';
    }

    return {isLive, noteAt, opening, responses};
})();
