#!/bin/bash
case "$1" in
	stop|restart)
		forever $1 server.js
		;;
	*)
		forever -al /mnt/backup/logs/node/awsAPI/server.log $1 server.js awsAPI
	exit 1
esac
