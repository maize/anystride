-- Supabase production only. Requires pg_cron, pg_net and Vault.
-- The operator stores the worker credential in Vault, never in cron commands.
BEGIN;
CREATE TABLE IF NOT EXISTS public.strava_scheduler (
  id integer PRIMARY KEY CHECK(id=1),
  last_tick timestamptz,
  last_request bigint,
  last_dispatch timestamptz,
  last_status integer,
  last_response_at timestamptz
);
INSERT INTO public.strava_scheduler(id) VALUES(1) ON CONFLICT DO NOTHING;
ALTER TABLE public.strava_scheduler ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.strava_scheduler FROM PUBLIC, anon, authenticated;
CREATE OR REPLACE FUNCTION public.strava_maintenance() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE worker_secret text; request_id bigint;
BEGIN
  -- Cleanup runs in the database even if the application is unavailable.
  DELETE FROM public.strava_activity_cache WHERE expires_at<=now() OR started_at<=now()-interval '365 days';
  DELETE FROM public.strava_activity_jobs WHERE expires_at<=now();
  DELETE FROM public.strava_deleted_activities WHERE expires_at<=now();
  DELETE FROM public.strava_oauth_states WHERE expires_at<=now();
  DELETE FROM public.strava_sync_jobs WHERE expires_at<=now();
  DELETE FROM public.strava_revocations WHERE expires_at<=now();
  UPDATE public.strava_runtime SET last_cleanup=now() WHERE id=1;
  UPDATE public.strava_scheduler SET last_tick=now() WHERE id=1;
  UPDATE public.strava_scheduler s SET last_status=r.status_code,last_response_at=r.created
    FROM net._http_response r WHERE s.id=1 AND r.id=s.last_request;
  -- Refresh the temporary cache before its six-day expiry; no polling of activities.
  INSERT INTO public.strava_sync_jobs(user_id)
    SELECT user_id FROM public.strava_connections WHERE status='connected'
      AND (last_full_sync IS NULL OR last_full_sync<=now()-interval '5 days')
    ON CONFLICT(user_id) DO NOTHING;
  IF EXISTS(SELECT 1 FROM public.strava_runtime WHERE id=1 AND leased_until<=now() AND blocked_until<=now())
    AND (EXISTS(SELECT 1 FROM public.strava_sync_jobs WHERE available_at<=now())
      OR EXISTS(SELECT 1 FROM public.strava_activity_jobs WHERE available_at<=now())
      OR EXISTS(SELECT 1 FROM public.strava_revocations)) THEN
    SELECT decrypted_secret INTO worker_secret FROM vault.decrypted_secrets WHERE name='anystride_strava_worker';
    IF worker_secret IS NULL OR length(worker_secret)<32 THEN RAISE EXCEPTION 'Strava scheduler credential missing'; END IF;
    SELECT net.http_get(url:='https://anystride.com/api/strava/worker',
      headers:=jsonb_build_object('Authorization','Bearer '||worker_secret), timeout_milliseconds:=55000) INTO request_id;
    UPDATE public.strava_scheduler SET last_request=request_id,last_dispatch=now() WHERE id=1;
  END IF;
  DELETE FROM cron.job_run_details WHERE jobid IN(SELECT jobid FROM cron.job WHERE jobname='anystride-strava-maintenance') AND start_time<now()-interval '7 days';
END $$;
REVOKE ALL ON FUNCTION public.strava_maintenance() FROM PUBLIC, anon, authenticated;
COMMIT;
