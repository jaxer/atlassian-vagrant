#!/usr/bin/env bash

# resolve links - $0 may be a softlink - stolen from catalina.sh
PRG="$0"
while [ -h "$PRG" ]; do
    ls=`ls -ld "$PRG"`
    link=`expr "$ls" : '.*-> \(.*\)$'`
    if expr "$link" : '/.*' > /dev/null; then
        PRG="$link"
    else
        PRG=`dirname "$PRG"`/"$link"
    fi
done
PRGDIR=`dirname "$PRG"`

# When stopping Stash, it doesn't actually matter where the home directory is; any value will work. So
# if the home directory hasn't been set, use the working directory as a placeholder and print a warning.
if [ -z "$STASH_HOME" ]; then
    export STASH_HOME=`pwd`
fi

. `dirname $0`/user.sh #readin the username
if [ -z "$STASH_USER" ] || [ $(id -un) == "$STASH_USER" ]; then
    echo -e "Stopping Atlassian Stash as the current user \n\n"
    $PRGDIR/shutdown.sh 20 -force $@
    if [ $? -ne 0 ]; then
        exit 1
    fi
elif [ $UID -ne 0 ]; then
    echo Atlassian Stash has been installed to run as $STASH_USER. Use "sudo -u $STASH_USER $0" to enable
    echo stopping the server as that user.
    exit 1
else
    echo -e "Stopping Atlassian Stash as dedicated user $STASH_USER\n\n"
    if [ -x "/sbin/runuser" ]; then
        sucmd="/sbin/runuser"
    else
        sucmd="su"
    fi
    $sucmd -m $STASH_USER -c "$PRGDIR/shutdown.sh 20 -force $@"
fi
    

source $PRGDIR/../conf/scripts.cfg
echo Stopped Atlassian Stash at http://localhost:${stash_httpport}/${stash_context} 
