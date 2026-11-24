#!/bin/sh
# Concatenates the modules in src/ into the single-file app qasr_forge.html
set -e
cd "$(dirname "$0")/src"
cat p2_core.js p3_wfc.js p4_tex.js p5_build.js p5b_asia.js p5c_furn.js p5d_world.js p5e_ruin.js p5f_cull.js p6_arch.js p7_app.js > ../all.js
node --check ../all.js
{ cat p1_head.html; cat ../all.js; printf '\n</script>\n'; } > ../qasr_forge.html
rm ../all.js
wc -c ../qasr_forge.html
