#!/bin/sh

runner_found=false

for runner in xulrunner       \
              xulrunner-1.9.1 \
              xulrunner-1.9.2 \
              xulrunner-1.9.3 \
              firefox; do
  if ( ! $runner_found && which $runner >/dev/null ); then
    runner_found=true
    echo "Running with $runner"
    if ! $runner --app application.ini -jsconsole; then
      echo "Ups... $runner exit with error. :-("
      zenity --error --title="Sticker Canary" \
             --text="Ups...  :-(\n\n$runner exit with error."
    fi
  fi
done
