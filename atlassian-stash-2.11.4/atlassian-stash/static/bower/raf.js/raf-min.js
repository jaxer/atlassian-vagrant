(function(B){var C=0,F=["webkit","moz"],E=B.requestAnimationFrame,D=B.cancelAnimationFrame,A=F.length;while(--A>=0&&!E){E=B[F[A]+"RequestAnimationFrame"];D=B[F[A]+"CancelAnimationFrame"]}if(!E||!D){E=function(I){var H=Date.now(),G=Math.max(C+16,H);return setTimeout(function(){I(C=G)},G-H)};D=clearTimeout}B.requestAnimationFrame=E;B.cancelAnimationFrame=D}(window));