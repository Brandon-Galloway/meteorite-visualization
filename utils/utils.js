// https://medium.com/@bs903944/debounce-and-throttling-what-they-are-and-when-to-use-them-eadd272fe0be
function debounce(func, delay) {
    let timer;
    return function(...args) {
        clearTimeout(timer);
        timer = setTimeout(() => func.apply(this, args), delay);
    };
}

// https://medium.com/@bs903944/debounce-and-throttling-what-they-are-and-when-to-use-them-eadd272fe0be
function throttle(func, interval) {
    let isRunning = false;
    return function(...args) {
        if (!isRunning) {
            isRunning = true;
            func.apply(this, args);
            setTimeout(() => {
                isRunning = false;
            }, interval);
        }
    };
}

export { debounce, throttle };