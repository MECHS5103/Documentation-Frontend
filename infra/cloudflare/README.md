# Cloudflare security configuration

This Terraform root manages the Cloudflare edge controls for the Team 5103 documentation site. It enables HTTP-to-HTTPS redirects, automatic HTTPS rewrites, TLS 1.2 or newer, TLS 1.3, and strict origin certificate validation. HSTS is present as a staged control and is disabled by default.

## Scope and prerequisites

The zone settings in `https.tf` affect the entire Cloudflare zone, not only `docs.team5103.com`. Review every proxied hostname in the zone before applying strict origin TLS or raising the minimum TLS version. GitHub Pages presents a publicly trusted origin certificate for the documentation hostname, but other origins in the zone must be checked independently.

Use Terraform 1.7 or newer. Create a scoped Cloudflare API token with:

- Zone Settings Read and Write
- Zone Transform Rules Write
- Account Rulesets Read

Set credentials through the environment rather than a checked-in file:

```sh
export CLOUDFLARE_API_TOKEN='replace-with-a-scoped-token'
export CLOUDFLARE_ZONE_ID='replace-with-the-zone-id'
cp terraform.tfvars.example terraform.tfvars
```

Replace the example zone ID in `terraform.tfvars`. Use a remote state backend with encryption and access control before the first production apply; local state is ignored only to prevent accidental commits.

## Adopt existing settings

Cloudflare zone settings already exist before Terraform manages them. Import each one before the first plan so Terraform updates the existing values instead of attempting to create replacements:

```sh
terraform init
terraform import cloudflare_zone_setting.always_use_https "$CLOUDFLARE_ZONE_ID/always_use_https"
terraform import cloudflare_zone_setting.automatic_https_rewrites "$CLOUDFLARE_ZONE_ID/automatic_https_rewrites"
terraform import cloudflare_zone_setting.minimum_tls_version "$CLOUDFLARE_ZONE_ID/min_tls_version"
terraform import cloudflare_zone_setting.tls_1_3 "$CLOUDFLARE_ZONE_ID/tls_1_3"
terraform import cloudflare_zone_setting.strict_origin_tls "$CLOUDFLARE_ZONE_ID/ssl"
```

Import the existing security-header setting as well. The checked-in default then keeps HSTS disabled until the staged rollout begins:

```sh
terraform import cloudflare_zone_setting.hsts "$CLOUDFLARE_ZONE_ID/security_header"
```

Cloudflare permits only one zone entry-point ruleset for the response-header transform phase. Before applying `headers.tf`, list the zone rulesets and check for an existing `http_response_headers_transform` ruleset. If one exists, import it and merge every existing rule into `cloudflare_ruleset.security_headers`; otherwise Terraform would take ownership of the phase and could replace rules that are not represented in this configuration.

```sh
curl --fail --silent --show-error \
  --header "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/rulesets"

terraform import cloudflare_ruleset.security_headers \
  "zone/$CLOUDFLARE_ZONE_ID/replace-with-response-header-ruleset-id"
```

## Plan and apply

Run formatting and validation before reviewing a plan:

```sh
terraform fmt -check -recursive
terraform validate
terraform plan -out=tfplan
terraform show tfplan
terraform apply tfplan
```

After applying, verify both protocols explicitly:

```sh
curl -I http://docs.team5103.com/
curl -I https://docs.team5103.com/
```

The HTTP response should be a redirect to the equivalent HTTPS URL. The HTTPS response should succeed with a valid certificate and negotiate TLS 1.2 or TLS 1.3.

## Browser security headers

The response transform is restricted to `site_hostname` and adds:

- `Content-Security-Policy-Report-Only`
- `Cross-Origin-Opener-Policy: same-origin-allow-popups`
- `Cross-Origin-Resource-Policy: same-origin`
- `Permissions-Policy`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`

The report-only CSP accounts for the current Google Fonts, Firebase Authentication, Firebase App Check, Firebase Storage, Google sign-in popup, Apps Script, and blob-media flows. It intentionally retains inline script and style allowances required by the current static redirect and React Native Web output. Configure an HTTPS `csp_report_uri` to collect violations, or leave it empty and inspect the browser console and Cloudflare logs during the observation period.

Do not replace the report-only header with an enforcing `Content-Security-Policy` until normal navigation, Google sign-in, save, video upload, and video playback have completed without unexplained violations. Tighten source allowances before enforcement where the application permits it.

Verify the applied headers on the custom hostname:

```sh
curl --fail --silent --show-error --head https://docs.team5103.com/ | \
  grep -Ei 'content-security-policy|cross-origin|permissions-policy|referrer-policy|x-content-type-options|x-frame-options'
```

Use Cloudflare Trace to confirm the response transform rule matched the expected hostname. Test Google sign-in specifically: `same-origin-allow-popups` is selected instead of the stricter `same-origin` so the Firebase sign-in popup can retain its opener relationship.

## HSTS rollout

HSTS makes browsers refuse HTTP and can make a hostname unreachable if HTTPS later fails. Keep `enable_hsts = false` for the first deployment.

1. Apply the HTTPS and TLS settings and observe every required hostname for at least one normal release cycle.
2. Set `enable_hsts = true`, keep `hsts_max_age = 300`, and keep both subdomains and preload disabled.
3. If no HTTPS failures occur, raise max-age in stages such as 86,400, 604,800, 2,592,000, and finally 31,536,000 seconds.
4. Enable `hsts_include_subdomains` only after every current and delegated subdomain is permanently HTTPS-capable.
5. Consider `hsts_preload` only after the zone satisfies the browser preload requirements and the team accepts that removal from preload lists is slow.

## Rollback

Before the first apply, save the reviewed plan and record the current Cloudflare values. To roll back HTTPS/TLS changes, restore those captured values in Terraform and apply a new reviewed plan. Do not delete state or destroy the resources as a rollback method because that can reset Cloudflare settings to provider defaults.

For an HSTS incident, set `enable_hsts = false` and apply the reviewed change to disable the header. Browsers that cached HSTS will retain it until the previously advertised max-age expires, which is why the rollout begins at 300 seconds.

To roll back the documentation response transform without deleting its ruleset, set `enable_security_headers = false`, review the plan, and apply it. Re-enable individual headers only after identifying the incompatible policy. Because the CSP is report-only, CSP violations alone do not block application behavior.
