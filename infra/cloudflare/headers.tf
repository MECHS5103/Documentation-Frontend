locals {
  csp_report_only = join(" ", concat(
    [
      "default-src 'self';",
      "base-uri 'self';",
      "object-src 'none';",
      "frame-ancestors 'none';",
      "form-action 'self' https://accounts.google.com;",
      "script-src 'self' 'unsafe-inline' https://apis.google.com https://www.gstatic.com https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/;",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;",
      "font-src 'self' data: https://fonts.gstatic.com;",
      "img-src 'self' data: blob: https://*.googleusercontent.com https://www.gstatic.com;",
      "media-src 'self' blob: https://drive.google.com https://*.googleapis.com https://*.googleusercontent.com;",
      "connect-src 'self' https://script.google.com https://script.googleusercontent.com https://*.googleapis.com https://*.firebaseio.com https://*.firebaseapp.com;",
      "frame-src https://accounts.google.com https://*.firebaseapp.com https://*.google.com;",
      "worker-src 'self' blob:;",
      "manifest-src 'self';",
    ],
    var.csp_report_uri == "" ? [] : ["report-uri ${var.csp_report_uri};"]
  ))
}

resource "cloudflare_ruleset" "security_headers" {
  zone_id     = var.cloudflare_zone_id
  name        = "Team 5103 documentation response security headers"
  description = "Browser security headers scoped to the public documentation hostname"
  kind        = "zone"
  phase       = "http_response_headers_transform"

  rules = [
    {
      ref         = "team5103_documentation_security_headers"
      description = "Set baseline browser security headers"
      expression  = "(http.host eq \"${var.site_hostname}\")"
      action      = "rewrite"
      enabled     = var.enable_security_headers
      action_parameters = {
        headers = {
          "Cross-Origin-Opener-Policy" = {
            operation = "set"
            value     = "same-origin-allow-popups"
          }
          "Cross-Origin-Resource-Policy" = {
            operation = "set"
            value     = "same-origin"
          }
          "Permissions-Policy" = {
            operation = "set"
            value     = "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()"
          }
          "Referrer-Policy" = {
            operation = "set"
            value     = "strict-origin-when-cross-origin"
          }
          "X-Content-Type-Options" = {
            operation = "set"
            value     = "nosniff"
          }
          "X-Frame-Options" = {
            operation = "set"
            value     = "DENY"
          }
        }
      }
    },
    {
      ref         = "team5103_documentation_csp_report_only"
      description = "Observe Content Security Policy violations before enforcement"
      expression  = "(http.host eq \"${var.site_hostname}\")"
      action      = "rewrite"
      enabled     = var.enable_security_headers
      action_parameters = {
        headers = {
          "Content-Security-Policy-Report-Only" = {
            operation = "set"
            value     = local.csp_report_only
          }
        }
      }
    }
  ]
}
