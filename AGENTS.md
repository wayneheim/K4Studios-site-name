# Wrangler deployment instructions

For the K4 analytics worker, use the existing Wrangler OAuth login. The inherited
`CLOUDFLARE_API_TOKEN` failed with Cloudflare authentication error 10000; do not
use it for this deployment or ask Wayne to replace it before trying the saved login.

Run from `C:\Users\Wayne\Documents\GitHub\K4-Studios\cloudflare-worker` in PowerShell:

```powershell
$env:CLOUDFLARE_API_TOKEN = $null
..\node_modules\.bin\wrangler.cmd deploy --config wrangler.analytics.toml
```

Clearing the variable applies only to the command's process environment. Do not
delete or edit saved credentials, user/system environment variables, or `.env`
files. Never print tokens or OAuth credentials.

Use `wrangler.analytics.toml` explicitly: the default `wrangler.toml` deploys the
image proxy, which is a different worker. Analytics-worker deployment is separate
from Netlify deployment and requires authorization for that worker.

Confirm success from Wrangler's uploaded/deployed messages and current version ID.
PowerShell may report a nonzero command status when redirected warning output is
present even though deployment succeeded; inspect the result before retrying.
