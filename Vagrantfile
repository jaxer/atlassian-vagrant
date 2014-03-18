# -*- mode: ruby -*-
# vi: set ft=ruby :

Vagrant::Config.run do |config|
  config.vm.box = "precise32"
  config.vm.forward_port 7990, 7990
  config.vm.forward_port 8080, 8080
  config.vm.provision :puppet, :module_path => "modules" do |puppet|
    puppet.manifests_path = "manifests"
    puppet.manifest_file  = "default.pp"
  end
end
