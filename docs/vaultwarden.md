# Vaultwarden on the Raspberry Pi

A self-hosted password manager on the Raspberry Pi 3B+ that works with the
normal Bitwarden apps and browser extensions. Reachable from home on the
LAN, and from outside over WireGuard on pfSense. It is **never** exposed
directly to the internet.

Decisions and why:

- **Vaultwarden, not official Bitwarden.** Official self-hosted Bitwarden is
  a stack of .NET containers + MSSQL wanting 2GB+ RAM. Vaultwarden is a
  single Rust binary on SQLite, idling around 10–50MB. The 3B+ (1GB RAM)
  handles it comfortably.
- **On the LAN, not the DMZ.** The DMZ segment exists because the website
  is internet-facing. The vault shouldn't share that exposure, and the
  existing `DMZ → !LAN` rule already stops the web box from reaching it.
- **No port forward, no Cloudflare proxy.** Remote access is via WireGuard
  only. WireGuard doesn't answer unauthenticated packets, so the open UDP
  port looks closed to a scanner.
- **Clients work offline.** Every app keeps an encrypted copy of the vault.
  If the Pi is down you can still read and autofill; you just can't sync
  changes until it's back. Backups are the real risk, not uptime.

Placeholders used below — substitute real values:

| Thing | Placeholder |
|---|---|
| LAN subnet | `192.168.1.0/24` |
| Pi's LAN IP | `192.168.1.50` |
| WireGuard tunnel subnet | `10.0.30.0/24` (pfSense end `10.0.30.1`) |
| Vault hostname | `vault.seanreid.dev` |
| VPN endpoint hostname | `vpn.seanreid.dev` |

## Phase 1 — Pi base setup

1. **Boot from a USB SSD, not the SD card.** SD cards wear out and corrupt
   under constant small database writes. The 3B+ can USB-boot out of the
   box — flash straight to the SSD. (USB 2.0 only on this model; that's
   fine for this workload.)
2. Flash **Raspberry Pi OS Lite (64-bit)** with Raspberry Pi Imager. In
   Imager's settings: set hostname (`vault`), create your user, enable SSH
   with **public-key auth only**, paste your public key.
3. Plug it into the LAN over ethernet (not Wi-Fi).
4. pfSense → **Services → DHCP Server → LAN** → add a static mapping for
   the Pi's MAC → `192.168.1.50`.
5. Update and install the basics:

   ```bash
   sudo apt update && sudo apt full-upgrade -y
   sudo apt install -y ufw sqlite3 unattended-upgrades
   curl -fsSL https://get.docker.com | sudo sh
   sudo usermod -aG docker $USER   # log out and back in afterwards
   ```

6. Firewall on the Pi — SSH from LAN only, HTTPS from LAN and the VPN:

   ```bash
   sudo ufw default deny incoming
   sudo ufw allow from 192.168.1.0/24 to any port 22 proto tcp
   sudo ufw allow from 192.168.1.0/24 to any port 443 proto tcp
   sudo ufw allow from 10.0.30.0/24 to any port 443 proto tcp
   sudo ufw enable
   ```

   Note: Docker bypasses ufw for published ports. That's why Vaultwarden is
   bound to `127.0.0.1` in Phase 2 — only nginx is reachable from outside
   the Pi.

7. `sudo dpkg-reconfigure -plow unattended-upgrades` → Yes.

## Phase 2 — Vaultwarden container

`/opt/vaultwarden/compose.yaml`:

```yaml
services:
  vaultwarden:
    image: vaultwarden/server:latest
    container_name: vaultwarden
    restart: unless-stopped
    environment:
      DOMAIN: "https://vault.seanreid.dev"
      SIGNUPS_ALLOWED: "true"   # set to "false" once accounts are created
    volumes:
      - ./data:/data
    ports:
      - "127.0.0.1:8080:80"
```

```bash
sudo mkdir -p /opt/vaultwarden && sudo chown $USER:$USER /opt/vaultwarden
cd /opt/vaultwarden && docker compose up -d
```

- No `ADMIN_TOKEN` is set, which **disables the `/admin` panel** entirely.
  For a personal instance everything needed is in env vars, so there's no
  reason to have an admin login to protect.
- Once your account (and anyone else's) exists, flip `SIGNUPS_ALLOWED` to
  `"false"` and `docker compose up -d` again.
- Updating: `docker compose pull && docker compose up -d`, monthly or when
  a Vaultwarden security release comes out.

## Phase 3 — HTTPS (Let's Encrypt via Cloudflare DNS-01)

The Bitwarden web vault uses browser crypto APIs that only work over HTTPS,
and the mobile apps expect a publicly trusted cert. The Cloudflare Origin
Certificate used for the website won't do: browsers don't trust it.
A DNS-01 challenge gets a real cert **without** the Pi being reachable from
the internet and without a public DNS record pointing at it.

1. Cloudflare → **My Profile → API Tokens → Create Token** → template
   *Edit zone DNS*, zone `seanreid.dev` only. Make it separate from the
   pfSense DDNS token, so either can be revoked on its own.
2. On the Pi:

   ```bash
   sudo apt install -y nginx certbot python3-certbot-dns-cloudflare
   sudo install -d -m 700 /root/.secrets
   echo 'dns_cloudflare_api_token = <TOKEN>' | sudo tee /root/.secrets/cloudflare.ini
   sudo chmod 600 /root/.secrets/cloudflare.ini

   sudo certbot certonly \
     --dns-cloudflare \
     --dns-cloudflare-credentials /root/.secrets/cloudflare.ini \
     -d vault.seanreid.dev \
     --deploy-hook "systemctl reload nginx"
   ```

   Renewal runs automatically from `certbot.timer`; the deploy hook reloads
   nginx when the cert changes. Check with `sudo certbot renew --dry-run`.

3. `/etc/nginx/sites-available/vaultwarden`:

   ```nginx
   map $http_upgrade $connection_upgrade {
       default upgrade;
       ''      "";
   }

   server {
       listen 80;
       server_name vault.seanreid.dev;
       return 301 https://$host$request_uri;
   }

   server {
       listen 443 ssl;
       server_name vault.seanreid.dev;

       ssl_certificate     /etc/letsencrypt/live/vault.seanreid.dev/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/vault.seanreid.dev/privkey.pem;

       client_max_body_size 525M;   # attachments

       location / {
           proxy_pass http://127.0.0.1:8080;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;       # live sync (websockets)
           proxy_set_header Connection $connection_upgrade;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```

   ```bash
   sudo ln -s /etc/nginx/sites-available/vaultwarden /etc/nginx/sites-enabled/
   sudo rm /etc/nginx/sites-enabled/default
   sudo nginx -t && sudo systemctl reload nginx
   ```

## Phase 4 — Local DNS (no public record)

`vault.seanreid.dev` only needs to resolve on your own network, so it lives
in pfSense rather than Cloudflare.

1. pfSense → **Services → DNS Resolver → Host Overrides → Add**: host
   `vault`, domain `seanreid.dev`, IP `192.168.1.50`. Save, Apply.
2. **Don't** create a `vault` record in Cloudflare. The DNS-01 challenge
   only writes temporary TXT records; no A record is needed.

**Verify:** from a LAN machine, `nslookup vault.seanreid.dev` returns
`192.168.1.50`, and `https://vault.seanreid.dev` loads the web vault with
a valid padlock. Create your account now, then disable signups (Phase 2).

## Phase 5 — WireGuard on pfSense (access from outside)

1. **System → Package Manager → Available Packages** → install
   `WireGuard`.
2. **VPN → WireGuard → Tunnels → Add Tunnel**: enable, listen port
   `51820`, **Generate** keys, interface address `10.0.30.1/24`. Save.
3. **Interfaces → Assignments** → add `tun_wg0` → enable it, rename `WG`,
   IPv4 Configuration Type **None** (the tunnel config supplies the
   address). Save, Apply. Assigning it gives you a `WG subnets` alias
   and a rules tab. Restart the DNS Resolver afterwards so it listens on
   the new interface.
4. **Endpoint hostname.** The existing DDNS record is Cloudflare-proxied
   (orange cloud), and Cloudflare doesn't proxy WireGuard's UDP. Add a
   second entry in **Services → Dynamic DNS**: Cloudflare, hostname
   `vpn.seanreid.dev`, **Cloudflare Proxy unchecked**, same API token as the
   existing entry.
   Trade-off: this publishes the home IP, which the website setup otherwise
   hides behind Cloudflare. It's low risk, since WireGuard is silent to
   anyone without a key. If that's not acceptable, see *Alternative:
   Tailscale* below.
5. Firewall rules:

   **WAN tab**: Pass, UDP, source any, destination `WAN address`, port
   `51820`, description `WireGuard`.

   **WG tab**, in this order:

   | # | Action | Protocol | Source | Destination | Port | Description |
   |---|---|---|---|---|---|---|
   | 1 | Pass | TCP/UDP | WG subnets | WG address | DNS (53) | DNS to pfSense |
   | 2 | Pass | TCP | WG subnets | `192.168.1.50` | HTTPS (443) | Vault only |

   Nothing else. A lost or stolen phone's tunnel key can reach the vault
   (which still needs the master password), and nothing else on the LAN.
6. **Peers.** For each device: **VPN → WireGuard → Peers → Add Peer**,
   tunnel `tun_wg0`, paste the device's public key, Allowed IPs
   `10.0.30.2/32` (next device `.3`, etc.). Save, Apply.
7. **Client config** (WireGuard app on the phone/laptop):

   ```ini
   [Interface]
   PrivateKey = <device private key>
   Address    = 10.0.30.2/32
   DNS        = 10.0.30.1

   [Peer]
   PublicKey  = <pfSense tunnel public key>
   Endpoint   = vpn.seanreid.dev:51820
   AllowedIPs = 10.0.30.1/32, 192.168.1.50/32
   PersistentKeepalive = 25
   ```

   `AllowedIPs` is a split tunnel: only vault and DNS traffic goes through
   home, so everything else uses the phone's normal connection. That makes
   it cheap to leave on permanently. On iOS, **On-Demand** can bring it up
   automatically everywhere except home Wi-Fi.
   Note that `DNS = 10.0.30.1` sends all the device's DNS lookups home
   while the tunnel is up. That's normal for WireGuard clients; it's what
   makes `vault.seanreid.dev` resolve to the private IP.

**Verify:** on the phone, turn Wi-Fi off (mobile data only), bring the
tunnel up, and open `https://vault.seanreid.dev`. Then in the Bitwarden app
→ **Self-hosted** → server URL `https://vault.seanreid.dev` → log in.

### Alternative: Tailscale

If publishing the home IP is a dealbreaker: install Tailscale on the Pi and
the devices instead of steps 1–7. It needs no port forward and no public
DNS record, and NAT traversal keeps the home IP private. The trade-off is
that it depends on Tailscale's coordination server (which can't see the
traffic). Point `vault.seanreid.dev` at the Pi's Tailscale IP via Tailscale's
DNS settings instead of the pfSense host override.

## Phase 6 — Backups

If the Pi dies, the clients keep working, but the server-side data is the
only full copy of attachments and the source of truth for syncing. Losing
it without a backup means rebuilding from a client export.

`/usr/local/bin/vw-backup`:

```sh
#!/bin/sh
set -eu
SRC=/opt/vaultwarden/data
DST=/var/backups/vaultwarden
STAMP=$(date +%F)

mkdir -p "$DST"
# .backup gives a consistent snapshot even while Vaultwarden is writing
sqlite3 "$SRC/db.sqlite3" ".backup '$DST/db-$STAMP.sqlite3'"
tar --ignore-failed-read -czf "$DST/files-$STAMP.tar.gz" -C "$SRC" \
    attachments sends rsa_key.pem config.json
find "$DST" -type f -mtime +30 -delete
```

```bash
sudo chmod 755 /usr/local/bin/vw-backup
echo '15 3 * * * root /usr/local/bin/vw-backup' | sudo tee /etc/cron.d/vaultwarden-backup
```

- **Get it off the Pi.** A backup on the same SSD doesn't survive the SSD.
  Push `/var/backups/vaultwarden` to another machine or a cloud bucket
  with `restic` (encrypted, deduplicated) on a second cron entry. Don't
  push it to the DMZ box.
- Vault contents are encrypted with keys derived from each user's master
  password, so the backup is useless without them. `rsa_key.pem` signs
  login tokens, though, so keep the backup itself encrypted too.
- Every few months, also do **Export vault → .json (Encrypted)** from a
  client and store it somewhere separate. This backup doesn't depend on
  the server at all.
- **Test a restore once**: stop the container, move `data/` aside, restore
  the DB and files into a fresh `data/`, start it, and log in.

## Status

- [ ] Pi booting Raspberry Pi OS Lite 64-bit from USB SSD
- [ ] DHCP static mapping on LAN (`192.168.1.50`)
- [ ] Docker installed, `ufw` enabled (22 LAN-only, 443 LAN + WG)
- [ ] `unattended-upgrades` enabled
- [ ] Vaultwarden running, bound to `127.0.0.1:8080`
- [ ] Let's Encrypt cert via Cloudflare DNS-01, `renew --dry-run` passes
- [ ] nginx reverse proxy serving `https://vault.seanreid.dev`
- [ ] pfSense host override for `vault.seanreid.dev`
- [ ] Account(s) created, `SIGNUPS_ALLOWED=false`
- [ ] WireGuard tunnel + `WG` interface + rules on pfSense
- [ ] `vpn.seanreid.dev` DDNS entry (unproxied)
- [ ] Peers added for phone / laptop, verified on mobile data
- [ ] Nightly backup cron running, copied off the Pi
- [ ] Restore tested
