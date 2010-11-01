#!/bin/sh

if which xulrunner; then
  xulrunner --app application.ini -jsconsole
else
  if which firefox; then
    firefox --app application.ini -jsconsole
  else
    echo "Ups... I don't find a xulrunner. :-("
    zenity --error --title="Sticker Canary" \
           --text="Ups...  :-(\n\nI don't find a xulrunner to run Sticker Canary."
  fi
fi
