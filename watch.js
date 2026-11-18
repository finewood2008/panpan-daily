document.addEventListener('play', event => {
    if (event.target instanceof HTMLVideoElement) {
        for (const video of document.querySelectorAll('.watch-entry video')) {
            if (video !== event.target && !video.paused) video.pause();
        }
    }
}, true);
