#!/usr/bin/env bash

function fgstartmsg {
    if [ "$PRGRUNMODE" == "true" ] ; then
        echo -e "If you do not see a 'Server startup' message within 3 minutes, please see the troubleshooting guide at:\n\nhttps://confluence.atlassian.com/display/STASHKB/Troubleshooting+Installation\n\n"
    fi
}

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

PRGRUNMODE=false
if [ "$1" = "-fg" ] || [ "$1" = "run" ]  ; then
	shift
	PRGRUNMODE=true
else
	echo "To run Stash in the foreground, start the server with start-stash.sh -fg"
fi

. `dirname $0`/user.sh #readin the username

if [ -z "$STASH_USER" ] || [ $(id -un) == "$STASH_USER" ]; then
    echo -e "Starting Atlassian Stash as current user\n"
    fgstartmsg
    if [ "$PRGRUNMODE" == "true" ] ; then
        $PRGDIR/catalina.sh run $@
        if [ $? -ne 0 ]; then
		exit 1
	fi
    else
        $PRGDIR/startup.sh $@
        if [ $? -ne 0 ]; then
		exit 1
	fi
    fi
elif [ $UID -ne 0 ]; then
    echo Atlassian STASH has been installed to run as $STASH_USER. Use "sudo -u $STASH_USER $0" to enable
    echo starting the server as that user.
    exit 1
else
    echo -e "Starting Atlassian Stash as dedicated user $STASH_USER \n"
    fgstartmsg

    if [ -x "/sbin/runuser" ]; then
        sucmd="/sbin/runuser"
    else
        sucmd="su"
    fi

    if [ "$PRGRUNMODE" == "true" ] ; then
        $sucmd -m $STASH_USER -c "$PRGDIR/catalina.sh run $@"
    else
        $sucmd -m $STASH_USER -c "$PRGDIR/startup.sh $@"
    fi
fi

source $PRGDIR/../conf/scripts.cfg
echo -e "\nSuccess! You can now use Stash at the following address:\n\nhttp://localhost:${stash_httpport}/${stash_context}\n"
echo -e "If you cannot access Stash at the above location within 3 minutes, or encounter any other issues starting or stopping Atlassian Stash, please see the troubleshooting guide at:\n\nhttps://confluence.atlassian.com/display/STASHKB/Troubleshooting+Installation\n"
