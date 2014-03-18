atlassian-vagrant
=================

This is a vagrant machine with Atlassian JIRA and Stash preinstalled.
Also installs postgres with default usernames for both of them.

Inteneded usage:

- Locallly as vagrant machine
- Remotely on staging server


### Local usage

Install **VirtualBox, vagrant, librarian-puppet**.

    librarian-puppet install
    vagrant up

Open *http://localhost:8080* for JIRA and *http://localhost:7990* to access Stash.


### Remote usage

Install **puppet, librarian-puppet, git**.

    git clone git://github.com/jaxer/atlassian-vagrant.git
    cd atlassian-vagrant
    librarian-puppet install
    ./manual-apply.sh

Now you should have both servers running on same default ports.


### Maintenance

Restart both with

    sudo /etc/init.d/jira restart
    sudo /etc/init.d/stash restart

Logs:

    /opt/jira/atlassian-jira-*-standalone/logs/
    /opt/stash/atlassian-stash-*/logs/

Home folders:

    /opt/jira-home
    /opt/stash-home

Regards,
Alex.
