define("widget/aui/dropdown",["aui","jquery","exports"],function(B,C,A){A.onReady=function(){var D={};D.dropDown=".aui-dropdown-left:not(.aui-dropdown-ajax)";D.alignment="left";B.dropDown.Standard(C.extend({},D));D.dropDown=".aui-dropdown-right:not(.aui-dropdown-ajax)";D.alignment="right";B.dropDown.Standard(C.extend({},D))}});