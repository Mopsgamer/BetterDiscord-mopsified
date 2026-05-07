#!/bin/sh

# reload apparmor so it sees our new profile
systemctl reload apparmor

# os.tmpdir from node.js
for OS_TMPDIR in "$TMPDIR" "$TMP" "$TEMP" /tmp
do
  test -n "$OS_TMPDIR" && break
done

# kill any currently running Discord
if pgrep DiscordCanary ; then
  pkill DiscordCanary
  sleep 1
  pkill -9 DiscordCanary
fi

# This is probably just paranoia, but some people claim that clearing out
# cache and/or the sock file fixes bugs for them, so here we go
for DIR in /home/* ; do
  rm -rf "$DIR/.config/discordcanary/Cache"
  rm -rf "$DIR/.config/discordcanary/GPUCache"

  # A previous bug made some files in this folder owned by root
  # and discord will hang if those files are present
  SETTINGS_FILE="$DIR/.config/discordcanary/Crashpad/settings.dat"
  if [ -f "$SETTINGS_FILE" ]; then
    OWNER=$(stat -c "%U" "$SETTINGS_FILE")
    if [ "$OWNER" = "root" ]; then
      rm -rf "$DIR/.config/discordcanary/Crashpad"
    fi
  fi
done
rm -f "$OS_TMPDIR/discordcanary.sock"
