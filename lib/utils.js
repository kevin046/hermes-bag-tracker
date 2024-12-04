function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function getRandomDelay(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

async function randomDelay(min, max) {
    const delay = getRandomDelay(min, max);
    await sleep(delay);
    return delay;
}

module.exports = {
    sleep,
    randomDelay,
    getRandomDelay
}; 