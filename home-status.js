(() => {
    const status = document.getElementById('neighborhood-status');
    function update() {
        const minute = PanpanTime.minuteNow();
        const current = PanpanGame.snapshot(minute);
        const place = PanpanGame.scenes[current.place];
        const activity = current.pose === 'sleep' ? '潘潘已经睡了' : current.place === 'away'
            ? '潘潘' + current.label
            : (place?.short ?? place?.name ?? '巷子') + ' · ' + current.label;
        status.textContent = PanpanTime.clockText(minute) + ' · ' + activity;
    }
    update();
    setInterval(update, 30000);
    window.addEventListener('pageshow', update);
})();
