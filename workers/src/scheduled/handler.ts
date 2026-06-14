import { runScheduledReportRefresh } from '../reports/service';

const CRON_GMAIL_SYNC = '0 */6 * * *';
const CRON_DAILY_MAINTENANCE = '0 2 * * *';

export async function handleScheduled(
  controller: ScheduledController,
  env: Env,
): Promise<void> {
  const cron = controller.cron;

  console.log(
    JSON.stringify({
      event: 'scheduled_trigger',
      cron,
      environment: env.ENVIRONMENT ?? 'local',
    }),
  );

  if (cron === CRON_GMAIL_SYNC) {
    await env.EMAIL_INGESTION_QUEUE.send({
      type: 'sync_all',
      mode: 'incremental',
    });
    return;
  }

  if (cron === CRON_DAILY_MAINTENANCE) {
    await env.EMAIL_INGESTION_QUEUE.send({
      type: 'renew_watches',
    });
    await env.INSIGHT_GENERATION_QUEUE.send({
      type: 'generate_daily_insights',
      scheduledAt: new Date().toISOString(),
    });
    await env.AUTOMATION_EXECUTION_QUEUE.send({
      type: 'run_scheduled_automations',
      schedule: 'daily',
      scheduledAt: new Date().toISOString(),
    });

    const refreshedReports = await runScheduledReportRefresh(env);
    console.log(
      JSON.stringify({
        event: 'scheduled_reports_refreshed',
        count: refreshedReports,
      }),
    );
  }
}
