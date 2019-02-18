pm2 stop 13
rm /tmp/dectalk.sock
pm2 start 13
chown www-data /tmp/dectalk.sock
