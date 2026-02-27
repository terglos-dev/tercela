type LogData = Record<string, unknown>;

function formatMsg(tag: string, msg: string, data?: LogData): string {
  const base = `[${tag}] ${msg}`;
  if (!data || Object.keys(data).length === 0) return base;
  return `${base} ${JSON.stringify(data)}`;
}

export const logger = {
  info(tag: string, msg: string, data?: LogData) {
    console.log(formatMsg(tag, msg, data));
  },
  warn(tag: string, msg: string, data?: LogData) {
    console.warn(formatMsg(tag, msg, data));
  },
  error(tag: string, msg: string, data?: LogData) {
    console.error(formatMsg(tag, msg, data));
  },
};
