(function(){var B=CodeMirror.getMode({indentUnit:2},"text/x-less");function A(C){test.mode(C,B,Array.prototype.slice.call(arguments,1),"less")}A("variable","[variable-2 @base]: [atom #f04615];","[qualifier .class] {","  [property width]: [variable percentage]([number 0.5]); [comment // returns `50%`]","  [property color]: [variable saturate]([variable-2 @base], [number 5%]);","}");A("amp","[qualifier .child], [qualifier .sibling] {","  [qualifier .parent] [atom &] {","    [property color]: [keyword black];","  }","  [atom &] + [atom &] {","    [property color]: [keyword red];","  }","}");A("mixin","[qualifier .mixin] ([variable dark]; [variable-2 @color]) {","  [property color]: [variable darken]([variable-2 @color], [number 10%]);","}","[qualifier .mixin] ([variable light]; [variable-2 @color]) {","  [property color]: [variable lighten]([variable-2 @color], [number 10%]);","}","[qualifier .mixin] ([variable-2 @_]; [variable-2 @color]) {","  [property display]: [atom block];","}","[variable-2 @switch]: [variable light];","[qualifier .class] {","  [qualifier .mixin]([variable-2 @switch]; [atom #888]);","}");A("nest","[qualifier .one] {","  [def @media] ([property width]: [number 400px]) {","    [property font-size]: [number 1.2em];","    [def @media] [attribute print] [keyword and] [property color] {","      [property color]: [keyword blue];","    }","  }","}")})();