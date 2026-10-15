#!/bin/sh
# Name: Slideshow
# Author: kindle-slideshow
# Icon:

# Launch the installed Slideshow app (no reinstall).
# Use "Install Slideshow" for the first install or to update.

APP_ID="org.slideshow.kindle"
TARGET_DIR="/var/local/mesquite/slideshow"

if [ ! -f "$TARGET_DIR/config.xml" ]; then
    eips -d l=fff,w=1072,h=120
    eips 2 2 "Slideshow is not installed yet."
    eips 2 3 "Run Install Slideshow first."
    exit 1
fi

nohup lipc-set-prop com.lab126.appmgrd start "app://$APP_ID" >/dev/null 2>&1 &

exit 0
