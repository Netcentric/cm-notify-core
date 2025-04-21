function convertUTCToTimezone(utcTimestamp, timezoneCode = 'cet') {
  const timezones = {
    cet: { timeZone: 'Europe/Berlin', locale: 'de-DE' },
    ist: { timeZone: 'Asia/Kolkata', locale: 'en-IN' },
    est: { timeZone: 'America/New_York', locale: 'en-US' },
  };
  
  const tz = timezoneCode.toLowerCase();
  const config = timezones[tz];
  if (!config) throw new Error('Unsupported timezone. Use cet, ist, or est.');
  
  const date = new Date(utcTimestamp);
  
  const formatted = new Intl.DateTimeFormat(config.locale, {
    timeZone: config.timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);
  
  return `${formatted} ${tz.toUpperCase()}`;
}

module.exports = { convertUTCToTimezone }
