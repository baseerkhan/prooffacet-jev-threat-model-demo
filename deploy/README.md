# Deployment shape

The experiment runs as an isolated, resource-bounded systemd service on `127.0.0.1:8790`. Nginx strips `/experiments/jev-threat-triage/` before proxying to that internal port.

Persistent evaluations live in `/var/lib/prooffacet-jev/evaluations`. The credential is supplied only through the root-readable `/etc/prooffacet-jev/prooffacet-jev.env` environment file and is never copied into a release.

The application serializes Jev calls, permits five waiting requests, rate-limits each client to three evaluations per ten minutes, and retains at most 250 evaluation records.

Releases are immutable directories below `/opt/prooffacet-jev/releases`. `/opt/prooffacet-jev/current` is the active symlink.

Rollback consists of repointing `current` to the preceding release, restoring the backed-up service and Nginx files if either changed, then running:

```sh
sudo systemctl daemon-reload
sudo systemctl restart prooffacet-jev.service
sudo nginx -t
sudo systemctl reload nginx
```
