class java {
  include apt

  apt::ppa { "ppa:webupd8team/java": }

  exec { 'apt-get update 2':
    command => '/usr/bin/apt-get update',
    require => [ Apt::Ppa["ppa:webupd8team/java"], Package["git-core"] ],
  }

  package { ["oracle-java7-installer"]:
    ensure => present,
    require => Exec["apt-get update 2"],
  }

  exec {
    "accept_license":
    command => "echo debconf shared/accepted-oracle-license-v1-1 select true | sudo debconf-set-selections && echo debconf shared/accepted-oracle-license-v1-1 seen true | sudo debconf-set-selections",
    path    => "/usr/bin/:/bin/",
    require => Package["curl"],
    before => Package["oracle-java7-installer"],
    logoutput => true,
  }
}


class postgres {
  class { 'postgresql::server': }

  postgresql::server::db { 'stash':
    user     => 'stash',
    password => 'password',
  }

  postgresql::server::db { 'jira':
    user     => 'jiraadm',
    password => 'mypassword',
  }
}

class atlassian {
  Exec { path => "/usr/bin:/usr/sbin/:/bin:/sbin" }

  class { 'deploy':
    tempdir => '/opt/deploy'
  }

  file { "stash-install-dir":
    path => "/opt/stash",
    mode => 0755,
    ensure => directory
  }

  class { 'stash':
    version        => '2.11.4',
    installdir     => '/opt/stash',
    homedir        => '/opt/stash-home',
    javahome       => '/usr/lib/jvm/java-7-oracle',
    require        => [ File["stash-install-dir"], Class["java"], Class["postgres"] ]
  }

  file { "jira-install-dir":
    path => "/opt/jira",
    mode => 0755,
    ensure => directory
  }

  class { 'jira':
    version     => '6.2.1',
    installdir  => '/opt/jira',
    homedir     => '/opt/jira-home',
    javahome    => '/usr/lib/jvm/java-7-oracle',
    require        => [ File["jira-install-dir"], Class["java"], Class["postgres"] ]
  }
}

class must-have {
  exec { "apt-update":
      command => "/usr/bin/apt-get update"
  }

  Exec["apt-update"] -> Package <| |>

  package { ["vim",
             "curl",
             "git-core",
             "bash"]:
    ensure => present,
  }  
}

include must-have
include java
include postgres
include atlassian
