variable "cloudflare_zone_id" {
  description = "Cloudflare zone ID for team5103.com. Zone settings affect the entire zone."
  type        = string

  validation {
    condition     = can(regex("^[0-9a-fA-F]{32}$", var.cloudflare_zone_id))
    error_message = "cloudflare_zone_id must be a 32-character hexadecimal Cloudflare zone ID."
  }
}

variable "site_hostname" {
  description = "Hostname that receives the documentation-specific response headers."
  type        = string
  default     = "docs.team5103.com"

  validation {
    condition     = can(regex("^[A-Za-z0-9.-]+$", var.site_hostname))
    error_message = "site_hostname must be a DNS hostname without a scheme or path."
  }
}

variable "enable_security_headers" {
  description = "Enable the documentation-host response header transform rules."
  type        = bool
  default     = true
}

variable "csp_report_uri" {
  description = "Optional HTTPS endpoint for Content-Security-Policy-Report-Only violation reports. Leave empty to use browser developer tooling only."
  type        = string
  default     = ""

  validation {
    condition     = var.csp_report_uri == "" || startswith(var.csp_report_uri, "https://")
    error_message = "csp_report_uri must be empty or an HTTPS URL."
  }
}

variable "enable_hsts" {
  description = "Manage and enable Cloudflare HSTS for the entire zone. Leave false until every required hostname is HTTPS-only."
  type        = bool
  default     = false
}

variable "hsts_max_age" {
  description = "HSTS max-age in seconds. Start at 300 and raise it only after a successful observation period."
  type        = number
  default     = 300

  validation {
    condition     = var.hsts_max_age >= 300 && var.hsts_max_age <= 63072000
    error_message = "hsts_max_age must be between 300 seconds and two years."
  }
}

variable "hsts_include_subdomains" {
  description = "Apply HSTS to all subdomains. Do not enable until every subdomain has been audited."
  type        = bool
  default     = false
}

variable "hsts_preload" {
  description = "Advertise HSTS preload eligibility. Keep false until the separate preload requirements and rollback consequences are accepted."
  type        = bool
  default     = false
}
