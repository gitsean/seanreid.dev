# Self-Hosting Migration Plan

Moving `seanreid.dev` off the EC2 instance and onto a mini computer on the
home network, behind pfSense (Protectli Vault).

Context discovered while planning this:

- DNS for `seanreid.dev` is already on Cloudflare (`everton.ns.cloudflare.com`
  / `melissa.ns.cloudflare.com`), and the records are proxied (orange-cloud)
  rather than pointing straight at the EC2 IP.
- Mini computer runs Ubuntu/Debian.
- Home ISP IP is dynamic.
- A scoped Cloudflare API token can be created for DNS updates.
- The switch on hand (TP-Link TL-SF1005P) is **unmanaged** — no VLAN/802.1Q
  support. The Protectli Vault has a spare physical NIC, though, so
  isolation is done with a dedicated physical interface instead of a VLAN.
  Since only the mini computer sits on this segment, it's cabled directly
  to the spare NIC — the unmanaged switch isn't needed unless a second
  device joins the segment later.

## Phase 1 — Wire it in and segment it

1. Run an ethernet cable directly from the mini computer to the Protectli
   Vault's spare NIC. Wi-Fi is fine for browsing but not for something
   serving traffic from the internet. (If you later add a second device to
   this segment, put the unmanaged switch between them and the spare NIC.)
2. On pfSense: **Interfaces → Assignments** → the spare NIC should appear in
   the "available network ports" dropdown → select it, click **Add**. This
   creates a new OPT interface — no VLAN tagging involved, it's a distinct
   physical port.
3. Click into the new interface: enable it, rename it `DMZ`, set IPv4
   Configuration Type to **Static**, give it an IP (e.g. `10.0.20.1/24`).
   Save, then **Apply Changes**.
4. Give the mini computer a fixed address in that subnet — either a DHCP
   static mapping (**Services → DHCP Server → DMZ tab**) keyed to its MAC,
   or a static IP set directly on the host via netplan.
5. Firewall rules. pfSense evaluates rules on the interface where traffic
   *enters*, top-down, first match wins. A new interface has no rules, so
   everything from it is blocked until you add some. (pfSense 2.7+ labels
   aliases `DMZ subnets` / `LAN subnets`; older versions say `DMZ net` /
   `LAN net`.)

   **DMZ tab** (**Firewall → Rules → DMZ**) — add these in this order:

   | # | Action | Protocol | Source | Destination | Port | Description |
   |---|---|---|---|---|---|---|
   | 1 | Pass | TCP/UDP | DMZ subnets | DMZ address | DNS (53) | DNS to pfSense |
   | 2 | Pass | UDP | DMZ subnets | DMZ address | NTP (123) | NTP (optional) |
   | 3 | Block | Any | DMZ subnets | This Firewall (self) | any | Block DMZ to firewall |
   | 4 | Pass | Any | DMZ subnets | !LAN subnets | any | DMZ to anything except LAN |

   - Rule 4 lets the box reach the internet but never start a connection
     into the home LAN. For `!`, tick **Invert match** on the destination.
     Set Protocol to **Any**; the default (TCP) breaks DNS and ping.
   - Rule 3 closes a gap in rule 4: pfSense's own DMZ address (`10.0.20.1`)
     isn't in `LAN subnets`, so without it a compromised box could reach the
     pfSense web GUI/SSH. Rules 1–2 sit above it so DNS/NTP still work.
   - Do **not** add a `DMZ → LAN` pass rule. The default deny is what keeps
     a compromised box from pivoting to the rest of the network. Replies to
     LAN-initiated connections still get through, because pfSense tracks
     connection state.
   - If there are other internal networks (guest/IoT on another OPT port),
     `!LAN` doesn't cover them. Create **Firewall → Aliases → IP** →
     `PRIVATE_NETS` (type Network(s): `10.0.0.0/8`, `172.16.0.0/12`,
     `192.168.0.0/16`) and use Invert match + `PRIVATE_NETS` as rule 4's
     destination instead.
   - **Save**, then **Apply Changes**. If you reorder rules by dragging,
     the new order isn't kept until you click the **Save** button at the
     bottom of the rules list, then **Apply Changes**. Reload the page to
     confirm the order stuck.

   **LAN tab** (**Firewall → Rules → LAN**) — for SSH/management from home
   devices. If the stock **Default allow LAN to any rule** is still there,
   nothing to do. Otherwise add (above any block rules) a Pass rule: TCP,
   source `LAN subnets`, destination `DMZ subnets`, port `SSH (22)`.

   **Verify:** from the mini computer, `ping 1.1.1.1` works, pinging a LAN
   device fails, and `curl -k https://10.0.20.1` fails. From a LAN machine,
   `ssh you@10.0.20.x` works. If something is blocked unexpectedly, check
   **Status → System Logs → Firewall**.

## Phase 2 — Web server on the mini computer

```bash
sudo apt update && sudo apt install -y nginx
sudo mkdir -p /var/www/seanreid.dev/html
sudo chown -R $USER:$USER /var/www/seanreid.dev/html
```

nginx server block (`/etc/nginx/sites-available/seanreid.dev`), symlinked
into `sites-enabled` — same shape as the old EC2 config, root pointed at
`/var/www/seanreid.dev/html`.

## Phase 3 — TLS via Cloudflare Origin Certificate

Since Cloudflare already proxies `seanreid.dev`, there's no need for
Let's Encrypt/certbot renewal automation:

1. Cloudflare dashboard → **SSL/TLS → Origin Server → Create Certificate**.
   Generates a cert+key valid up to 15 years (trusted by Cloudflare, not
   public browsers — fine, since only Cloudflare talks to the origin
   directly).
2. Install both files on the box (e.g.
   `/etc/ssl/cloudflare/seanreid.dev.pem` / `.key`), reference them in the
   nginx `443 ssl` server block.
3. Cloudflare → **SSL/TLS → Overview** → set mode to **Full (strict)**. This
   makes Cloudflare validate the origin cert and encrypts the
   Cloudflare↔home hop.
4. Cloudflare → **SSL/TLS → Edge Certificates** → turn on **Always Use
   HTTPS**.

## Phase 4 — Port forward, locked to Cloudflare's IPs only

Because the record stays proxied (orange cloud), the only thing that should
ever be allowed to reach the home IP on 80/443 is Cloudflare's edge — not
the whole internet.

1. pfSense → **Firewall → Aliases** → add a URL Table alias pulling
   `https://www.cloudflare.com/ips-v4` (and one for `ips-v6` if IPv6 is in
   use), auto-refreshing.
2. **Firewall → NAT → Port Forward**: WAN, TCP/80 → DMZ box:80, and
   TCP/443 → DMZ box:443.
3. Edit the auto-created WAN filter rules for both to restrict **Source** to
   the Cloudflare alias instead of "any."

Result: port scanners hitting the home IP directly get dropped; only
genuine Cloudflare-proxied requests get through.

## Phase 5 — Dynamic DNS (dynamic ISP IP)

1. Cloudflare dashboard → **My Profile → API Tokens → Create Token** → use
   the "Edit zone DNS" template, scoped to just the `seanreid.dev` zone.
2. pfSense → **Services → Dynamic DNS** → add a client, Service Type
   **Cloudflare**, paste the token, point it at the `seanreid.dev` A
   record. pfSense updates the IP behind the record on change while
   Cloudflare keeps it proxied — visitors never see the home IP.

## Phase 6 — CI/CD: self-hosted runner instead of exposing SSH

Rather than forwarding SSH to the internet (or standing up a VPN) just so
GitHub Actions can deploy, put a self-hosted runner **on the mini computer
itself**. It only makes outbound connections to GitHub to poll for jobs —
nothing new to expose.

1. GitHub repo → **Settings → Actions → Runners → New self-hosted runner**,
   follow the generated download/config commands on the mini computer.
2. Install it as a service so it survives reboots:
   `sudo ./svc.sh install && sudo ./svc.sh start`.
3. Update `.github/workflows/deploy.yml`: swap `runs-on: ubuntu-latest` →
   `runs-on: self-hosted`, delete the **Set up SSH agent** and **Add server
   to known_hosts** steps, and replace the SSH/rsync deploy step's `run:`
   with a plain local copy:

   ```bash
   rsync -a --delete html/ /var/www/seanreid.dev/html/
   ```

   No SSH key, no `DEPLOY_HOST`/`DEPLOY_SSH_KEY` secrets needed anymore.

## Phase 7 — Hardening checklist

- `ufw`: allow 80/443, restrict 22 to the LAN/DMZ subnet only.
- `fail2ban` for nginx and sshd.
- `unattended-upgrades` for OS patches.
- SSH: key-only auth, disable password auth (`PasswordAuthentication no`).

## Status

- [ ] Mini computer wired to its own isolated pfSense interface
- [ ] nginx installed and serving locally on the DMZ IP
- [ ] Cloudflare Origin Certificate installed, SSL mode set to Full (strict)
- [ ] Port forwards added, restricted to Cloudflare IP alias
- [ ] pfSense Dynamic DNS client configured and updating the origin record
- [ ] Self-hosted GitHub Actions runner registered and running as a service
- [ ] `.github/workflows/deploy.yml` updated to use the self-hosted runner
- [ ] `ufw` / `fail2ban` / `unattended-upgrades` configured
