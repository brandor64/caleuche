import { pino } from "pino";
import { isObject } from "./utils";

class LoggerImpl {
  constructor(
    private readonly logger = pino({
      level: "info",
      transport: {
        target: "pino-pretty",
      },
    }),
  ) {}

  setLevel(level: "silent" | "info" | "debug") {
    this.logger.level = level;
  }

  info(message: string) {
    this.logger.info(message);
  }

  debug(message: string) {
    this.logger.debug(message);
  }

  error(message: string) {
    this.logger.error(message);
  }
}

export interface Logger {
  info(message: string): void;
  debug(message: string): void;
  error(message: string): void;
}

const instance = new LoggerImpl();

export const logger: Logger = instance;

export function initLogger(handler: (...args: any[]) => void) {
  return (...args: any[]) => {
    const logLevelArg = args.find((arg) => isObject(arg) && arg.logLevel);
    if (logLevelArg?.logLevel) {
      instance.setLevel(logLevelArg.logLevel);
    }
    handler(...args);
  };
}
