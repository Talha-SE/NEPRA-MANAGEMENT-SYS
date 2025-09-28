declare module 'node-cron' {
  export type ScheduledTask = {
    start: () => void;
    stop: () => void;
    destroy: () => void;
    getStatus?: () => 'scheduled' | 'running' | 'stopped';
    now?: () => void;
  };

  export interface ScheduleOptions {
    scheduled?: boolean;
    timezone?: string;
    recoverMissedExecutions?: boolean;
  }

  const cron: {
    schedule: (
      cronExpression: string,
      task: () => void | Promise<void>,
      options?: ScheduleOptions
    ) => ScheduledTask;
    validate: (cronExpression: string) => boolean;
  };

  export default cron;
}
