# Bower

Stash now uses [Bower](http://bower.io/) to manage JS dependencies.
Please do _not_ modify _any_ file in this directory manually - you have been warned.

## Install/upgrading libraries

1. Make sure you have Bower installed:

    npm install -g bower

2. Modify `webapp/default/bower.json`

3. Copy `.bowerrc.template` to `.bowerrc` and add username/password to the Stash URL

4. Install libaries from bower:

   bower install

5. Add the new libraries files to Git

   git add webapp/default/src/main/webapp/static/bower/libaryX/src/something.js

   Please just add the necessary files required at runtime, ignoring tests and everything else.

6. Git will show (many) files that aren't being tracked in `bower` - clean them up

   rm -r webapp/default/src/main/webapp/static/bower
   git checkout webapp/default/src/main/webapp/static/bower

   (The alternative is we ignore this directory and get people to run `git add -f` instead.)
