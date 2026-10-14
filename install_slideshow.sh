#!/bin/sh
# Name: Install Slideshow
# Author: kindle-slideshow
# Icon:

# Installs the Slideshow webapp into the Mesquite store, registers it in
# appreg.db, then launches it. Safe to re-run (overwrites the installed copy).
#
# Expected layout on the Kindle:
#   /mnt/us/documents/slideshow/          <- app/ folder from this repo
#   /mnt/us/documents/install_slideshow.sh <- this file

SOURCE_DIR="/mnt/us/documents/slideshow"
TARGET_DIR="/var/local/mesquite/slideshow"
DB="/var/local/appreg.db"
APP_ID="org.slideshow.kindle"

if [ ! -f "$SOURCE_DIR/config.xml" ]; then
    eips 2 3 "ERROR: $SOURCE_DIR/config.xml not found"
    exit 1
fi

if [ ! -x "$(command -v sqlite3)" ]; then
    eips 2 3 "ERROR: sqlite3 not available"
    exit 1
fi

# Install (replace previous copy)
rm -rf "$TARGET_DIR"
cp -r "$SOURCE_DIR" "$TARGET_DIR" || {
    eips 2 3 "ERROR: copy to $TARGET_DIR failed"
    exit 1
}

# Register as a launchable application
sqlite3 "$DB" <<EOF
INSERT OR IGNORE INTO interfaces(interface) VALUES('application');
INSERT OR IGNORE INTO handlerIds(handlerId) VALUES('$APP_ID');
INSERT OR REPLACE INTO properties(handlerId,name,value)
  VALUES('$APP_ID','lipcId','$APP_ID');
INSERT OR REPLACE INTO properties(handlerId,name,value)
  VALUES('$APP_ID','command','/usr/bin/mesquite -l $APP_ID -c file://$TARGET_DIR/');
INSERT OR REPLACE INTO properties(handlerId,name,value)
  VALUES('$APP_ID','supportedOrientation','U');
EOF

if [ $? -ne 0 ]; then
    eips 2 3 "ERROR: appreg.db update failed"
    exit 1
fi

eips 2 3 "Slideshow installed. Launching..."

sleep 1

# Launch via LIPC
nohup lipc-set-prop com.lab126.appmgrd start "app://$APP_ID" >/dev/null 2>&1 &

exit 0
