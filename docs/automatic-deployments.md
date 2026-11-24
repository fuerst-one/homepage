# Automatic deployments

Enabled on 17 November 2026 for the `fuerst-one/homepage` repository.

- Vercel project `fuerst-one-homepage` builds `apps/web` from `main` and assigns
  successful production deployments to `https://fuerst.one`. Both repository
  `vercel.json` files allow Git deployments. The project's ignored-build command
  is unset; restoring `exit 0` would hold builds again.
- Coolify application `homepage-knowledge-sync` follows `main` with commit `HEAD`
  and auto-deploy enabled. Its Dockerfile is `/ops/knowledge/Dockerfile`, using
  the repository root as its build context.
- A push-only repository webhook sends GitHub events to Coolify's manual GitHub
  endpoint. Its signing secret matches the application configuration and stays
  in the two hosting services. Preview deployment remains disabled for the worker.

After pushing, check the Vercel production deployment's source SHA and READY
state, then the Coolify deployment's source SHA, finished state and container
health. A configured toggle alone does not prove that webhook delivery works.

AI eligibility, provider budgets and consent controls are independent of these
settings. Deployment changes do not enable AI or modify its rollout percentage.
The database remains a separate persistent Coolify resource and is not rebuilt
by repository pushes. Schema migrations require their own release preparation.

A Coolify deployment can hang. On 2026-11-24 deployment 1239 (`4a06e58`) stayed
"in progress" after its container had started, later deployments queued behind
it, and at 11:59 UTC the application went `exited:unhealthy` with no container
left, so the worker was down until 12:22. The removed container took its logs
with it, and the cause is unknown; the health check's own conditions were met
just before. If a deployment stays in progress well past the 300-second health
start period, save `docker logs` of the worker container first, then cancel the
deployment and start the queue: on the server,
`docker exec coolify php artisan tinker` with
`ApplicationDeploymentQueue::find(<id>)->update(['status' => 'cancelled-by-user'])`
followed by `queue_next_deployment(Application::find(24))`. Coolify's UI
"Cancel" and "Redeploy" buttons do the same.

To hold releases again, disable Vercel Git deployments and the worker's
auto-deploy setting before pushing further commits. Application rollback should
preserve the database and any enquiries received since the release.
