const originalConsoleLog = console.log;

console.log = function (...args) {
  const message = args.join(' ');
  const timeStamped = `[${new Date().toISOString()}] ${message}`;
  window.api.logMessage(timeStamped);
  originalConsoleLog.apply(console, args);
};
