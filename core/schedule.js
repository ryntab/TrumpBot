let burstTimeout = null;

export let nextPollTime = null;

export function scheduleNextCheck(callback, delay = getAdjustedPollingDelay()) {
  clearTimeout(burstTimeout);
  nextPollTime = Date.now() + delay;
  burstTimeout = setTimeout(callback, delay);
}

export function getAdjustedPollingDelay() {
  const hourUTC = new Date().getUTCHours();
  return (hourUTC >= 5 && hourUTC < 8) ? 30 * 60 * 1000 : 1 * 60 * 1000;
}