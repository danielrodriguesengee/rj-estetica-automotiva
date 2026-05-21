#!/bin/bash

while true; do
    agora=$(date +%H:%M)

    if [ "$agora" = "10:30" ]; then
        for i in {1..3}; do
            xdotool key F5
            sleep 60
        done
        exit
    fi

    sleep 1
done
