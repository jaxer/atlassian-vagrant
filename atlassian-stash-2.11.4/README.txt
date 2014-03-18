Atlassian Stash
======================

About
----------------------

Git Repository Management for Enterprise Teams

Behind the firewall Git management for your source. Create and manage
repositories, set up fine-grained permissions, and collaborate
on code - secure, fast and enterprise-grade.


Quick Installation
----------------------

Requirements:
* Git 1.7.6+
* Oracle JDK 1.6+ (Java)

If your system does not meet the above requirements, please read the
installation documentation: http://confluence.atlassian.com/display/STASH


### Linux and Mac

1. Edit `<Stash installation directory>/bin/setenv.sh`

2. Set `STASH_HOME` by uncommenting the `STASH_HOME` line and adding the
   absolute path to the directory where you want Stash to store your data.
   This path MUST NOT be in the Stash application directory.

3. In a terminal, run:
    `<Stash installation directory>/bin/start-stash.sh`

4. In your browser go to:
    `http://localhost:7990`


### Windows

1. Edit `<Stash installation directory>\bin\setenv.bat`

2. Set `STASH_HOME` by uncommenting the `STASH_HOME` line and adding the
   absolute path to the directory where you want Stash to store your data.
   This path MUST NOT be in the Stash application directory.

3. In a terminal, run:
    `<Stash installation directory>\bin\start-stash.bat`

4. In your browser go to:
    `http://localhost:7990`


Upgrade
----------------------

See the documentation at: https://confluence.atlassian.com/display/STASH/Stash+upgrade+guide

Briefly:
1. Stop Stash using the old version's installation directory

2. Backup your Stash Data in the `STASH_HOME` directory.
   If you are using an external database, back up this database. Follow the
   directions provided by the database vendor to do this.

3. In the new installation directory, configure and start Stash as per the
   `Quick Installation` above.


Documentation
----------------------

Get started with Stash in 3 minutes:
http://quickstart.atlassian.com/download/stash/get-started/get-started-w-stash-video/

Install and use Stash:
http://confluence.atlassian.com/display/STASH

Upgrade Stash:
https://confluence.atlassian.com/display/STASH/Stash+upgrade+guide

Supported Platforms:
http://confluence.atlassian.com/display/STASH/Supported+platforms


Licensing
----------------------

See http://www.atlassian.com/licensing/license
